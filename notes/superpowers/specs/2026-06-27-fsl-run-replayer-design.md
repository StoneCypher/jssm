# M3 — `fsl run` / deterministic tape replayer — design

> **Status:** DRAFT — approved in brainstorm 2026-06-27. This is **milestone M3** of the
> signed-run-receipts roadmap (`notes/superpowers/plans/2026-06-26-signed-run-receipts-roadmap.md`).
> Targets the `v6` integration branch. It is the foundation the rest of the trust stack
> (M5 `verify`, M6 receipts) replays on, and it owns the **determinism guarantee** everything
> downstream depends on.

---

## 1. Goal & frame

Give v6 a **deterministic stimulus-tape replayer**: load an FSL machine, feed it a recorded
sequence of stimuli, and reproduce the run **bit-identically** — plus the thin `fsl run` verb
over it. Scope is deliberately the **minimal replay core** (brainstorm Q1-A); the broader §15
durable-execution posture is explicitly out (tracked as #813).

The replayer is **library-first**: M5/M6 and a future web shell (#819) consume the engine
directly, so the engine carries **zero Node-only dependencies** and the CLI is a thin shell.

## 2. Decisions locked in brainstorm (2026-06-27)

| # | Question | Decision |
|---|---|---|
| Q1 | Scope | **A — minimal replay core**: tape format + deterministic replayer + canonical-serialization fix + `fsl run` verb + determinism conformance test. (Deferred: #813 full §15 durable-execution; snapshot/restore + version-gating-on-deserialize.) |
| Q2 | Determinism guarantee | **A — cross-run, byte-identical canonical serialization on the JS runtime**; format *specified* host-neutrally so future hosts conform (#815), only JS *tested/promised* now. |
| Q3 | Tape format | **A — JSONL**: one header line + one stimulus per line; stimulus ops `action` / `transition` / `timer`. |
| Q4 | Machine binding | **A — reference + provisional swappable hash** (`source_hash` via `fsl_hash`, the M1 seam); plus **`--bundle`** opt-in inline source. |

**Binding constraint (from review):** engine modules are **host-agnostic / zero Node-only deps**;
the canonical key sort is **portable and locale-independent** (RFC 8785, see §6).

## 3. The discovered bug this milestone fixes (#816)

The constructor accepts an injectable `time_source` but **drops it**: `jssm.ts:619` destructures
`time_source`, then `:625` hardcodes `this._time_source = () => new Date().getTime();` — while the
timer sources two lines below (`:752`/`:753`) are wired correctly with `?? default`. `serialize()`
(`:1808`) also calls `new Date().getTime()` directly, bypassing `_time_source`. Same shape on
`main` (`:723`/`:729`). Latent for years (the injectable clock never worked), so **fixing it cannot
regress** existing behavior. M3 fixes it (per repo policy: fix the source + assert correct
behavior, never pin the bug); a v5 backport is optional and tracked in #816.

This bug is *why* M3's determinism mechanism is "inject a deterministic clock" rather than
"carve the timestamp out of the hash."

## 4. Architecture & file structure

The engine and format are **runtime modules** (`src/ts/`), reusable as a library; the verb is a
thin CLI shell.

| File | Responsibility | Node-only deps? |
|---|---|---|
| `src/ts/fsl_stimulus_tape.ts` | Format: `TapeHeader` + `Stimulus` types, JSONL `parse_tape`/`serialize_tape`, format-version gating. | none |
| `src/ts/fsl_replay.ts` | Engine: `replay(source, tape, opts?) → ReplayResult`. | none |
| `src/ts/fsl_canonical.ts` | Canonical (RFC 8785) serialization; the core/envelope split. | none |
| `src/ts/fsl_hash.ts` | Swappable provisional `source_hash(fslText)` (M1 seam); isomorphic hash (pure-JS or Web Crypto). | none |
| `src/ts/cli/subcommands/run/run.ts` (+ `plugin.ts`) | The `fsl run` verb; file I/O lives **here only**. | yes (fs) |

**Edits to existing code — `jssm.ts` only, three small changes:**
1. `:625` honor the injected clock: `this._time_source = time_source ?? (() => new Date().getTime());` (#816 fix).
2. `:1808` `serialize()` uses `this._time_source()` not a raw `new Date().getTime()` (#816 fix).
3. Route `serialize()`'s body through `fsl_canonical` for the core/envelope split (§6).

Explicitly **not** added: restore-from-snapshot, version-gating-on-deserialize, output/log/error
channel wiring (see §5 boundary).

## 5. The replayer engine (`fsl_replay.ts`)

Signature: `replay(source: string, tape: StimulusTape, opts?: ReplayOptions): ReplayResult`.

Steps:
1. **Construct** the machine from `source`, injecting a **deterministic `time_source`** (a logical
   monotonic counter) and a **controlled timer queue** replacing real `setTimeout`/`clearTimeout`
   (the existing injectable `timeout_source`/`clear_timeout_source` make this clean).
2. **Check binding:** if header `source_hash` present, recompute via `fsl_hash` and error
   (`source_hash_mismatch`) on mismatch; if absent, stamp it.
3. **Start from the machine's initial config** (replay-from-start; restore deferred).
4. **Dispatch each stimulus** in order: `action → machine.action(name, data?)`,
   `transition → machine.transition(state, data?)`, `timer → fire the single pending timeout`.
5. Produce `ReplayResult`.

**Behavioral rules:**
- **Rejection is normal, recorded, not fatal.** `action`/`transition` return `false` for an
  illegal/guard-failed step; the input tape records *events fed* (including no-ops), so a rejected
  stimulus is recorded in `steps`, not an error.
- **`timer` with no pending timeout** → `no_pending_timer` error (a divergence).
- **No host hooks fire.** Replay constructs from source alone and registers no app hooks — only
  intrinsic machine behavior runs (deterministic, side-effect-free, matching the `pure`-profile
  philosophy). Re-executing hook *effects* (durable-execution/resume) is #813.

`ReplayResult`:
```ts
{
  final_state,
  final_data,
  steps: [{ index, op, name, accepted }],
  source_hash,
  canonical: string   // canonical serialization of the final config (§6)
}
```

**Scope boundary — channel output reserved.** `fsl_tape.ts` (output/log/error channels) is *not yet
wired to the runtime* ("Phase 2/3" per its own header), so a plain v6 machine emits nothing today.
M3 guarantees deterministic **state + data + step-trace**; output/log/error **tape regeneration is
reserved** until the transducer wiring lands. M6's `replayed`-tier properties operate on
state/data, so this does not block the roadmap.

**The guarantee:** same `(source, tape)` → byte-identical `ReplayResult.canonical`, *by
construction* (no wall-clock, no real timers, no hooks can leak nondeterminism).

## 6. Canonical serialization (`fsl_canonical.ts`)

Used in three places: `ReplayResult.canonical`, `serialize_tape` per-line key order, and the
`jssm.serialize()` core.

```ts
const CANONICAL_FORMAT_VERSION = 1;
canonicalize(value: unknown): string       // RFC 8785 canonical JSON
canonical_config(state, data): string      // the {v, state, data} identity string
```

**Canonicalization = RFC 8785 (JSON Canonicalization Scheme / JCS)** — adopted rather than
invented, because it is precisely defined, locale-independent, and has cross-language
implementations the future hosts (#815) can match:
- **Object keys sorted by UTF-16 code unit** via an explicit comparator — **never** `localeCompare`,
  **never** `Intl`, **never** default-locale coercion. (RFC 8785's choice of code units over
  code points is deliberate; an astral/surrogate-key test pins it.)
- **Number serialization** via the ECMAScript Number-to-String algorithm (JS-native; free here,
  precise spec for other hosts).
- **Arrays keep order** (only object-key order is normalized); **`undefined` keys omitted**; no
  insignificant whitespace; a `v` format-version tag inside the output.
- **Lint/grep guard** on this module forbidding `localeCompare`/`Intl`/locale-aware APIs, so a later
  edit cannot reintroduce locale dependence.

**Core / envelope split for `jssm.serialize()`:** canonical **core** = `{v, state, data}` (the
replay-derivable config identity). `timestamp`, `comment`, `history` remain in the serialization as
**envelope** (back-compat / human / debug) but live *outside* the canonical core, so they never
affect a hash. (`history` is redundant for identity — the tape records the path.)

**Cross-host caveat (named):** float formatting and Unicode key collation are the classic
divergence points; within JS (the only v6 runtime) they are deterministic, so M3 is sound. Pinning
them for other hosts is #815; `fsl_canonical` is where those rules will land. The expression
language has not introduced floats yet, so today's `data` is integers/strings/bool/null/arrays/objects.

**`fsl_hash` is separate:** `source_hash(fslText)` hashes the FSL *source bytes* (provisional; M1
swaps in the canonical normalized hash), not canonical JSON.

## 7. The stimulus-tape format (`fsl_stimulus_tape.ts`)

JSONL: header line, then one stimulus per line.

**Header (line 1):**
```jsonc
{"fsl_tape": 1, "machine": {"ref": "turnstile.fsl", "source_hash": "sha256:…"},
 "seed": null, "created": 0, "comment": "optional"}
```
- `fsl_tape` — format version (gating key); unknown/newer → refused (`unsupported_format_version`).
- `machine` — `ref` + optional `source_hash` (Q4).
- `seed` — reserved (null today; RNG stream-state slot for the expression language).
- `created`, `comment` — **envelope only**, outside tape identity.

**Stimulus lines — three ops:**
```jsonc
{"op": "action",     "name": "coin",   "data": {…}?}
{"op": "transition", "name": "Locked", "data": {…}?}
{"op": "timer"}
```
`timer` is first-class (the runtime holds one pending timeout; a `timer` stimulus fires its stored
callback). Reserved-future: `{"op":"receive","channel":…,"value":…}` once channels wire to the runtime.

**Functions:** `parse_tape(text) → {header, stimuli[]}` (typed `ReplayError` on malformed line /
unknown op / bad version); `serialize_tape({header, stimuli}) → string` (stable key order via
`fsl_canonical`).

**Tape identity** (what M6's `tape_hash` will cover): the canonical core — `fsl_tape`, `machine`,
`seed`, and the stimulus lines — **excluding** the `created`/`comment` envelope. M3 only guarantees
the canonical, stable serialization that makes such a hash well-defined; computing `tape_hash` is M6.

## 8. The `fsl run` verb (`src/ts/cli/subcommands/run/`)

Thin shell (mirrors `subcommands/render/`: `run.ts` + `plugin.ts` on the config loader). Invocation:
```
fsl run <doc> <tape>      # doc + separate tape
fsl run <tape>            # bundled tape (Q4 --bundle): source inlined, <doc> omitted
```
Five steps: read files → `parse_tape` → `replay` → format → exit.

**Options:** `--json` (structured `ReplayResult`, agent contract — carries `canonical`,
`source_hash`, `steps`); `--trace` (per-step list, human mode); `--out <file>`. **Not in minimal:**
`--snapshot`/`--restore`, `--amend`, `--require-profile` (recorded so the boundary is explicit).

**Output:** human = final state/data + `N stimuli (M accepted, K rejected)` (+ trace under
`--trace`); `--json` = full `ReplayResult`.

**Exit codes:** `0` = replay ran to completion (recorded rejections are still success). Distinct
nonzero codes for: FSL parse error, malformed tape, unsupported format version, `source_hash`
mismatch, `no_pending_timer`. A rejected stimulus is **not** an error exit by default (a future
`--strict` could change that — YAGNI now).

**Tape production is out of scope for `run`** (it consumes tapes). Tapes are authored by hand
(JSONL is human-writable), via `serialize_tape` (library/tests), or — later — recorded by `repl`.

## 9. Error taxonomy

A typed `ReplayError` with a `kind` discriminant (following `fsl_errors.ts`):
`malformed_tape` · `unsupported_format_version` · `unknown_op` · `source_hash_mismatch` ·
`no_pending_timer` · `parse_error` (wraps the FSL parser error). Each carries the offending
**line/step index** + message; in `--json`, a structured `{code, step, suggested_fix?}`. Each maps
to a distinct CLI exit code (§8).

## 10. Testing

Per repo conventions: spec/stoch split, **no golden/snapshot**, **no fake tests**, fix-don't-pin,
`@example` doctests.

**Spec (`src/ts/tests/`):**
- `fsl_stimulus_tape.spec` — parse↔serialize round-trip; each op; rejects
  malformed/missing-header/unknown-op/unsupported-version; envelope-vs-core separation.
- `fsl_canonical.spec` — shuffled-key object → identical output; **RFC 8785 conformance vectors**
  (non-ASCII + astral/surrogate keys; number formatting); `undefined` omission; array order
  preserved; guard test that `localeCompare`/`Intl` are absent on the path.
- `fsl_replay.spec` — **determinism: replay same `(source,tape)` twice → byte-identical
  `canonical`** (headline); **#816 asserted as correct behavior** (injected `time_source` honored;
  `serialize()` routes through it); action/transition dispatch; rejected-stimulus
  recorded-not-fatal; timer fires pending `after`; `no_pending_timer` errors; `source_hash`
  match/mismatch; bundled-tape replay.
- `cli/run.spec` — verb end-to-end (doc+tape and bundled); `--json` shape; `--trace`; exit codes
  per error class.

**Stochastic (`*.stoch.ts`, seeded):**
- **Anti-fake cross-check:** random machine + random stimulus sequence →
  `replay(source, tape).canonical` **must equal driving the same machine directly via the live API**
  with the same sequence — proving the replayer faithfully reproduces the runtime rather than a
  parallel reimplementation that could agree with a hand-written expectation.
- **Determinism under fuzzing:** same random `(source,tape)` replayed twice → byte-identical.
- **Robustness:** random malformed tapes → always a typed `ReplayError`, never a crash/hang.

**Gating:** new `src/ts/**` modules hit the spec suite's 100% coverage; IDE diagnostics checked
post-implementation; public entry points (`replay`, `parse_tape`, `serialize_tape`, `canonicalize`)
carry `@example` DocBlocks (the doctest layer).

## 11. Related issues

- Roadmap: M3 of `notes/superpowers/plans/2026-06-26-signed-run-receipts-roadmap.md`.
- #816 — the dropped `time_source` bug fixed here (+ optional v5 backport).
- #813 — deferred full §15 durable-execution posture (builds on this).
- #815 — deferred cross-host byte-identical determinism conformance (this specifies the format
  host-neutrally; that adds the cross-host test matrix).
- #819 — web replay shell (a thin consumer of this engine; counterexample playback).
- #817 / #818 — proof-by-example corpus + its grammar (downstream consumers of the trust stack).
