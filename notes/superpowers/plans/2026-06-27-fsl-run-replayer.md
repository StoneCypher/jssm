# M3 — `fsl run` / Deterministic Tape Replayer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic stimulus-tape replayer for v6 FSL machines, plus the thin `fsl run` verb over it, so the same `(source, tape)` always replays to a byte-identical result.

**Architecture:** Library-first runtime modules in `src/ts/` (zero Node-only deps) — canonical serialization, a provisional swappable hash, the JSONL tape format, and the replay engine — composed by a thin CLI shell. Determinism comes from *injecting* a deterministic clock + a controlled timer queue at machine construction (riding a one-line constructor bug fix), not from post-hoc field surgery.

**Tech Stack:** TypeScript, vitest (`*.spec.ts`), fast-check + vitest (`*.stoch.ts`), the existing `jssm.ts` runtime (`Machine`, `make`) and `jssm_compiler`.

**Spec:** `notes/superpowers/specs/2026-06-27-fsl-run-replayer-design.md`.

## Global Constraints

- **Engine modules carry zero Node-only deps** (`fsl_canonical`, `fsl_hash`, `fsl_stimulus_tape`, `fsl_replay`): no `fs`, no `node:*`. File I/O lives only in `cli/subcommands/run/`.
- **Canonical serialization = RFC 8785 (JCS):** object keys sorted by **UTF-16 code unit** via an explicit comparator; ECMAScript number formatting; arrays keep order; `undefined` keys omitted; a `v` version tag inside the output. **Never** `localeCompare`, `Intl`, or locale-aware APIs on the canonicalization path.
- **No golden-file / snapshot tests.** Assert on structured fields / substrings.
- **No fake tests.** The stochastic cross-check must compare replay against the live runtime, never against a hand-written expected value.
- **Fix bugs, never pin them.** The #816 `time_source` fix asserts *correct* behavior.
- **Test suites split:** `*.spec.ts` (deterministic) vs `*.stoch.ts` (fast-check). New `src/ts/**` modules must reach the spec suite's 100% coverage.
- **Public entry points carry `@example` DocBlocks** (`replay`, `parse_tape`, `serialize_tape`, `canonicalize`) — the doctest layer.
- **Commits:** Conventional Commits; commit by **pathspec** (`git commit -- <paths>`), never `git add -A` (shared tree). Branch is `v6` (already checked out in this worktree).
- **After each task's code:** check IDE diagnostics (`mcp__ide__getDiagnostics`) before marking done.
- **Iterating a single test file:** add `--coverage.enabled=false` (a lone spec file otherwise trips the 100% global coverage gate); run the full `vitest-spec` suite at the end.

---

### Task 1: `fsl_canonical.ts` — RFC 8785 canonical serialization

**Files:**
- Create: `src/ts/fsl_canonical.ts`
- Test: `src/ts/tests/fsl_canonical.spec.ts`

**Interfaces:**
- Produces: `CANONICAL_FORMAT_VERSION: number`; `canonicalize(value: unknown): string`; `canonical_config(state: unknown, data: unknown): string`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/ts/tests/fsl_canonical.spec.ts
import { describe, it, expect } from 'vitest';
import { canonicalize, canonical_config, CANONICAL_FORMAT_VERSION } from '../fsl_canonical';

describe('canonicalize (RFC 8785)', () => {
  it('sorts object keys by UTF-16 code unit, regardless of insertion order', () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe(canonicalize({ a: 2, b: 1 }));
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it('orders non-ASCII and astral keys by code unit (RFC 8785 vector)', () => {
    // U+007A 'z', U+00E4 'ä', U+10140 (astral, surrogate D800 DD40)
    const s = canonicalize({ 'z': 1, 'ä': 2, '\u{10140}': 3 });
    // code-unit order: 'z'(007A) < 'ä'(00E4) < astral(D800…)
    expect(s).toBe('{"z":1,"ä":2,"\u{10140}":3}');
  });

  it('preserves array order and omits undefined keys', () => {
    expect(canonicalize([3, 1, 2])).toBe('[3,1,2]');
    expect(canonicalize({ a: 1, b: undefined, c: 3 })).toBe('{"a":1,"c":3}');
  });

  it('canonical_config tags a version and carries state+data', () => {
    const s = canonical_config('Locked', { n: 1 });
    expect(s).toBe(`{"data":{"n":1},"state":"Locked","v":${CANONICAL_FORMAT_VERSION}}`);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ts/tests/fsl_canonical.spec.ts --coverage.enabled=false`
Expected: FAIL — `canonicalize` not found.

- [ ] **Step 3: Implement**

```ts
// src/ts/fsl_canonical.ts
/**
 * Canonical (RFC 8785 / JCS) serialization — the byte-stable string that makes
 * hashing a config or tape well-defined. Locale-independent by construction:
 * object keys are sorted by UTF-16 code unit, never via locale-aware APIs.
 *
 * @see https://www.rfc-editor.org/rfc/rfc8785
 */

const CANONICAL_FORMAT_VERSION = 1;

// Code-unit comparator. Plain `<`/`>` on JS strings already compares by UTF-16
// code unit (NOT locale) — that is exactly RFC 8785's rule. localeCompare/Intl
// are deliberately avoided so output never depends on the host locale.
function code_unit_less(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Serialize `value` to RFC 8785 canonical JSON.
 *
 * @param value - Any JSON-serializable value (object keys are sorted; arrays
 *   keep order; `undefined` object values are omitted).
 * @returns The canonical JSON string (no insignificant whitespace).
 *
 * @example
 *   canonicalize({ b: 1, a: 2 });   // '{"a":2,"b":1}'
 */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);   // RFC 8785 number/string/bool/null formatting = JSON.stringify in ES
  }
  if (Array.isArray(value)) {
    return '[' + value.map(v => canonicalize(v === undefined ? null : v)).join(',') + ']';
  }
  const obj  = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter(k => obj[k] !== undefined).sort(code_unit_less);
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

/**
 * The canonical config-identity string of a run's final configuration: the
 * version tag, state, and data. Replay-derivable; the unit M6 will hash.
 *
 * @param state - The machine's final state.
 * @param data - The machine's final extended data.
 * @returns The canonical `{v, state, data}` string.
 *
 * @example
 *   canonical_config('Locked', { n: 1 }); // '{"data":{"n":1},"state":"Locked","v":1}'
 */
function canonical_config(state: unknown, data: unknown): string {
  return canonicalize({ v: CANONICAL_FORMAT_VERSION, state, data });
}

export { CANONICAL_FORMAT_VERSION, canonicalize, canonical_config };
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ts/tests/fsl_canonical.spec.ts --coverage.enabled=false`
Expected: PASS (4 tests).

- [ ] **Step 5: Check diagnostics, then commit**

Check `mcp__ide__getDiagnostics` on both files. Then:
```bash
git commit -- src/ts/fsl_canonical.ts src/ts/tests/fsl_canonical.spec.ts -m "feat(v6): RFC 8785 canonical serialization for replay (M3)"
```

---

### Task 2: `fsl_hash.ts` — provisional swappable source hash (M1 seam)

**Files:**
- Create: `src/ts/fsl_hash.ts`
- Test: `src/ts/tests/fsl_hash.spec.ts`

**Interfaces:**
- Produces: `source_hash(text: string): string` — returns `"provisional:<hex>"`.

**Note:** M3 has no security claims, so the hash need only be deterministic and stable. It uses a dependency-free, synchronous FNV-1a (64-bit) digest tagged `provisional:` — the single seam M1 later swaps for a canonical SHA-256 (and a `sha256:` tag). Keeping it sync + dep-free keeps the engine isomorphic and `replay()` synchronous.

- [ ] **Step 1: Write the failing tests**

```ts
// src/ts/tests/fsl_hash.spec.ts
import { describe, it, expect } from 'vitest';
import { source_hash } from '../fsl_hash';

describe('source_hash (provisional)', () => {
  it('is deterministic and tagged', () => {
    expect(source_hash('a -> b;')).toBe(source_hash('a -> b;'));
    expect(source_hash('a -> b;')).toMatch(/^provisional:[0-9a-f]{16}$/);
  });
  it('differs for different sources', () => {
    expect(source_hash('a -> b;')).not.toBe(source_hash('a -> c;'));
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ts/tests/fsl_hash.spec.ts --coverage.enabled=false`
Expected: FAIL — `source_hash` not found.

- [ ] **Step 3: Implement**

```ts
// src/ts/fsl_hash.ts
/**
 * Provisional content hash of FSL source — the binding between a tape and its
 * machine (M3, brainstorm Q4). Deterministic, synchronous, dependency-free
 * (FNV-1a 64-bit over UTF-16 code units), tagged `provisional:`.
 *
 * THE M1 SEAM: M1 replaces this single function with the canonical pinned
 * SHA-256 over normalized source (and a `sha256:` tag). M3 makes no security
 * claim — this only answers "does this tape's machine match the doc given".
 */

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME  = 0x00000100000001b3n;
const MASK64     = 0xffffffffffffffffn;

/**
 * @param text - FSL source.
 * @returns `"provisional:" + 16-hex-digit FNV-1a-64 digest`.
 *
 * @example
 *   source_hash('a -> b;'); // e.g. 'provisional:af63dc4c8601ec8c'
 */
function source_hash(text: string): string {
  let h = FNV_OFFSET;
  for (let i = 0; i < text.length; i++) {
    h ^= BigInt(text.charCodeAt(i));
    h = (h * FNV_PRIME) & MASK64;
  }
  return 'provisional:' + h.toString(16).padStart(16, '0');
}

export { source_hash };
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ts/tests/fsl_hash.spec.ts --coverage.enabled=false`
Expected: PASS (2 tests).

- [ ] **Step 5: Check diagnostics, then commit**

```bash
git commit -- src/ts/fsl_hash.ts src/ts/tests/fsl_hash.spec.ts -m "feat(v6): provisional swappable source hash, the M1 seam (M3)"
```

---

### Task 3: `fsl_stimulus_tape.ts` — JSONL tape format + typed errors

**Files:**
- Create: `src/ts/fsl_stimulus_tape.ts`
- Test: `src/ts/tests/fsl_stimulus_tape.spec.ts`

**Interfaces:**
- Consumes: `canonicalize` (Task 1).
- Produces:
  - `type Stimulus = { op: 'action'|'transition', name: string, data?: unknown } | { op: 'timer' }`
  - `type TapeHeader = { fsl_tape: number, machine: { ref?: string, source_hash?: string, source?: string }, seed?: unknown, created?: number, comment?: string }`
  - `type StimulusTape = { header: TapeHeader, stimuli: Stimulus[] }`
  - `class ReplayError extends Error { kind: ReplayErrorKind; step?: number }`
  - `type ReplayErrorKind = 'malformed_tape'|'unsupported_format_version'|'unknown_op'|'source_hash_mismatch'|'no_pending_timer'|'parse_error'`
  - `parse_tape(text: string): StimulusTape`
  - `serialize_tape(tape: StimulusTape): string`
  - `const SUPPORTED_TAPE_VERSION = 1`

- [ ] **Step 1: Write the failing tests**

```ts
// src/ts/tests/fsl_stimulus_tape.spec.ts
import { describe, it, expect } from 'vitest';
import { parse_tape, serialize_tape, ReplayError } from '../fsl_stimulus_tape';

const ok = [
  '{"fsl_tape":1,"machine":{"ref":"m.fsl"}}',
  '{"op":"action","name":"coin"}',
  '{"op":"transition","name":"Locked","data":{"n":1}}',
  '{"op":"timer"}',
].join('\n');

describe('parse_tape / serialize_tape', () => {
  it('parses header + three op kinds', () => {
    const t = parse_tape(ok);
    expect(t.header.fsl_tape).toBe(1);
    expect(t.header.machine.ref).toBe('m.fsl');
    expect(t.stimuli).toHaveLength(3);
    expect(t.stimuli[0]).toEqual({ op: 'action', name: 'coin' });
    expect(t.stimuli[2]).toEqual({ op: 'timer' });
  });

  it('round-trips through serialize_tape (canonical, stable)', () => {
    const t = parse_tape(ok);
    expect(parse_tape(serialize_tape(t))).toEqual(t);
  });

  it('rejects a missing header', () => {
    expect(() => parse_tape('')).toThrow(ReplayError);
  });

  it('rejects an unsupported format version', () => {
    try { parse_tape('{"fsl_tape":999,"machine":{}}'); expect.unreachable(); }
    catch (e) { expect((e as ReplayError).kind).toBe('unsupported_format_version'); }
  });

  it('rejects an unknown op with the offending step index', () => {
    const txt = '{"fsl_tape":1,"machine":{}}\n{"op":"frob","name":"x"}';
    try { parse_tape(txt); expect.unreachable(); }
    catch (e) { expect((e as ReplayError).kind).toBe('unknown_op'); expect((e as ReplayError).step).toBe(0); }
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ts/tests/fsl_stimulus_tape.spec.ts --coverage.enabled=false`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/ts/fsl_stimulus_tape.ts
/**
 * The JSONL stimulus-tape format for the M3 replayer: one header line, then one
 * stimulus per line. Pure data + (de)serialization, zero Node deps.
 */
import { canonicalize } from './fsl_canonical';

const SUPPORTED_TAPE_VERSION = 1;

type ReplayErrorKind =
  | 'malformed_tape' | 'unsupported_format_version' | 'unknown_op'
  | 'source_hash_mismatch' | 'no_pending_timer' | 'parse_error';

/** Typed error for the tape/replay layer (kind-discriminated, like FslError). */
class ReplayError extends Error {
  kind : ReplayErrorKind;
  step? : number;
  constructor(kind: ReplayErrorKind, message: string, step?: number) {
    super(message);
    this.name = 'ReplayError';
    this.kind = kind;
    this.step = step;
    Object.setPrototypeOf(this, ReplayError.prototype);
  }
}

type Stimulus =
  | { op: 'action';     name: string; data?: unknown }
  | { op: 'transition'; name: string; data?: unknown }
  | { op: 'timer' };

type TapeHeader = {
  fsl_tape : number;
  machine  : { ref?: string; source_hash?: string; source?: string };
  seed?    : unknown;
  created? : number;
  comment? : string;
};

type StimulusTape = { header: TapeHeader; stimuli: Stimulus[] };

/**
 * Parse JSONL tape text into a {@link StimulusTape}.
 *
 * @param text - JSONL: a header object line, then stimulus lines.
 * @returns The parsed header + stimuli.
 * @throws ReplayError kind `malformed_tape` / `unsupported_format_version` / `unknown_op`.
 *
 * @example
 *   parse_tape('{"fsl_tape":1,"machine":{}}\n{"op":"timer"}');
 */
function parse_tape(text: string): StimulusTape {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) throw new ReplayError('malformed_tape', 'empty tape (no header)');

  let header: TapeHeader;
  try { header = JSON.parse(lines[0]); }
  catch { throw new ReplayError('malformed_tape', 'header line is not valid JSON'); }
  if (typeof header.fsl_tape !== 'number' || typeof header.machine !== 'object' || header.machine === null) {
    throw new ReplayError('malformed_tape', 'header missing fsl_tape/machine');
  }
  if (header.fsl_tape > SUPPORTED_TAPE_VERSION) {
    throw new ReplayError('unsupported_format_version',
      `tape format ${header.fsl_tape} > supported ${SUPPORTED_TAPE_VERSION}`);
  }

  const stimuli: Stimulus[] = [];
  for (let i = 1; i < lines.length; i++) {
    const step = i - 1;
    let s: any;
    try { s = JSON.parse(lines[i]); }
    catch { throw new ReplayError('malformed_tape', `stimulus line is not valid JSON`, step); }
    if (s.op === 'action' || s.op === 'transition') {
      if (typeof s.name !== 'string') throw new ReplayError('malformed_tape', `${s.op} missing name`, step);
      stimuli.push('data' in s ? { op: s.op, name: s.name, data: s.data } : { op: s.op, name: s.name });
    } else if (s.op === 'timer') {
      stimuli.push({ op: 'timer' });
    } else {
      throw new ReplayError('unknown_op', `unknown stimulus op ${JSON.stringify(s.op)}`, step);
    }
  }
  return { header, stimuli };
}

/**
 * Serialize a {@link StimulusTape} back to canonical JSONL (stable key order
 * per line, so the bytes are deterministic).
 *
 * @param tape - The tape to serialize.
 * @returns JSONL text.
 *
 * @example
 *   serialize_tape({ header: { fsl_tape: 1, machine: {} }, stimuli: [{ op: 'timer' }] });
 */
function serialize_tape(tape: StimulusTape): string {
  return [canonicalize(tape.header), ...tape.stimuli.map(s => canonicalize(s))].join('\n');
}

export { parse_tape, serialize_tape, ReplayError, SUPPORTED_TAPE_VERSION };
export type { Stimulus, TapeHeader, StimulusTape, ReplayErrorKind };
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ts/tests/fsl_stimulus_tape.spec.ts --coverage.enabled=false`
Expected: PASS (5 tests).

- [ ] **Step 5: Check diagnostics, then commit**

```bash
git commit -- src/ts/fsl_stimulus_tape.ts src/ts/tests/fsl_stimulus_tape.spec.ts -m "feat(v6): JSONL stimulus-tape format + typed ReplayError (M3)"
```

---

### Task 4: Fix #816 — honor injected `time_source`; route `serialize()` core through canonical

**Files:**
- Modify: `src/ts/jssm.ts` (constructor `~:625`; `serialize()` `~:1798-1812`)
- Test: `src/ts/tests/fsl_time_source.spec.ts`

**Interfaces:**
- Consumes: `canonical_config` (Task 1), the existing `Machine` constructor config field `time_source: () => number`.
- Produces: a `Machine` that honors an injected `time_source`; `serialize()` whose timestamp comes from `_time_source()`.

**Note:** Line numbers are approximate (the file evolves) — locate by content. The injected `time_source` is currently destructured then discarded; the timer sources two lines below show the correct `?? default` pattern to match.

- [ ] **Step 1: Write the failing test**

```ts
// src/ts/tests/fsl_time_source.spec.ts
import { describe, it, expect } from 'vitest';
import { Machine, make } from '../jssm';

function build(src: string, time_source: () => number) {
  return new Machine<unknown>({ ...make<string, unknown>(src), time_source });
}

describe('#816 injected time_source is honored', () => {
  it('uses the injected clock for serialize timestamps', () => {
    const m = build('a -> b;', () => 42);
    expect(m.serialize().timestamp).toBe(42);
  });
  it('two machines with a frozen clock serialize identical timestamps', () => {
    const a = build('a -> b;', () => 0).serialize().timestamp;
    const b = build('a -> b;', () => 0).serialize().timestamp;
    expect(a).toBe(b);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ts/tests/fsl_time_source.spec.ts --coverage.enabled=false`
Expected: FAIL — `serialize().timestamp` is a wall-clock value, not 42.

- [ ] **Step 3: Implement the fixes**

In the constructor, replace the hardcoded line:
```ts
// BEFORE: this._time_source = () => new Date().getTime();
this._time_source = time_source ?? (() => new Date().getTime());
```

In `serialize()`, replace the raw clock call:
```ts
// BEFORE: timestamp        : new Date().getTime(),
timestamp        : this._time_source(),
```

Also route the canonical core (no behavior change to the returned shape, but make the deterministic core available). Add an import at the top of `jssm.ts`:
```ts
import { canonical_config } from './fsl_canonical';
```
and add a method on `Machine` (near `serialize()`):
```ts
/**
 * The RFC 8785 canonical-config identity of the current configuration
 * (`{v, state, data}`) — the byte-stable, replay-derivable core used for
 * hashing. Excludes envelope fields (timestamp/comment/history).
 *
 * @returns The canonical config string.
 * @example
 *   sm`a -> b;`.canonical(); // '{"data":...,"state":"a","v":1}'
 */
canonical(): string {
  return canonical_config(this._state, this._data);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ts/tests/fsl_time_source.spec.ts --coverage.enabled=false`
Expected: PASS (2 tests).

- [ ] **Step 5: Guard against regressions in the broader suite, check diagnostics, commit**

Run: `npx vitest run src/ts/tests/general.spec.ts --coverage.enabled=false` (sanity — serialize() shape unchanged).
Check diagnostics. Then:
```bash
git commit -- src/ts/jssm.ts src/ts/tests/fsl_time_source.spec.ts -m "fix(v6): honor injected time_source; canonical() identity; serialize() uses _time_source (#816, M3)"
```

---

### Task 5: `fsl_replay.ts` — the deterministic replay engine

**Files:**
- Create: `src/ts/fsl_replay.ts`
- Test: `src/ts/tests/fsl_replay.spec.ts`

**Interfaces:**
- Consumes: `Machine`, `make` (`./jssm`); `parse_tape` types + `ReplayError` (Task 3); `canonical_config` (Task 1); `source_hash` (Task 2).
- Produces:
  - `type ReplayStep = { index: number; op: string; name?: string; accepted: boolean }`
  - `type ReplayResult = { final_state: unknown; final_data: unknown; steps: ReplayStep[]; source_hash: string; canonical: string }`
  - `replay(source: string, tape: StimulusTape): ReplayResult`

- [ ] **Step 1: Write the failing tests**

```ts
// src/ts/tests/fsl_replay.spec.ts
import { describe, it, expect } from 'vitest';
import { replay } from '../fsl_replay';
import { parse_tape, ReplayError } from '../fsl_stimulus_tape';
import { source_hash } from '../fsl_hash';

const SRC = "Locked 'coin' -> Unlocked; Unlocked 'push' -> Locked;";

function tape(...lines: string[]) {
  return parse_tape(['{"fsl_tape":1,"machine":{}}', ...lines].join('\n'));
}

describe('replay', () => {
  it('drives actions and reports the final state', () => {
    const r = replay(SRC, tape('{"op":"action","name":"coin"}'));
    expect(r.final_state).toBe('Unlocked');
    expect(r.steps[0]).toEqual({ index: 0, op: 'action', name: 'coin', accepted: true });
  });

  it('records a rejected stimulus without throwing', () => {
    const r = replay(SRC, tape('{"op":"action","name":"push"}')); // illegal from Locked
    expect(r.steps[0].accepted).toBe(false);
    expect(r.final_state).toBe('Locked');
  });

  it('is deterministic: same (source, tape) -> identical canonical', () => {
    const t = tape('{"op":"action","name":"coin"}');
    expect(replay(SRC, t).canonical).toBe(replay(SRC, t).canonical);
  });

  it('errors on source_hash mismatch', () => {
    const t = parse_tape(['{"fsl_tape":1,"machine":{"source_hash":"provisional:dead"}}',
                          '{"op":"action","name":"coin"}'].join('\n'));
    try { replay(SRC, t); expect.unreachable(); }
    catch (e) { expect((e as ReplayError).kind).toBe('source_hash_mismatch'); }
  });

  it('stamps source_hash when absent', () => {
    expect(replay(SRC, tape()).source_hash).toBe(source_hash(SRC));
  });

  it('errors on a timer with no pending timeout', () => {
    try { replay(SRC, tape('{"op":"timer"}')); expect.unreachable(); }
    catch (e) { expect((e as ReplayError).kind).toBe('no_pending_timer'); }
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ts/tests/fsl_replay.spec.ts --coverage.enabled=false`
Expected: FAIL — `replay` not found.

- [ ] **Step 3: Implement**

```ts
// src/ts/fsl_replay.ts
/**
 * Deterministic stimulus-tape replayer (M3). Given FSL source and a tape,
 * reconstructs the run bit-identically by feeding stimuli through the runtime
 * with an injected logical clock and a controlled timer queue (no wall-clock,
 * no real setTimeout, no host hooks). Zero Node deps.
 */
import { Machine, make }                from './jssm';
import { source_hash }                  from './fsl_hash';
import { canonical_config }             from './fsl_canonical';
import { ReplayError }                  from './fsl_stimulus_tape';
import type { StimulusTape }            from './fsl_stimulus_tape';

type ReplayStep   = { index: number; op: string; name?: string; accepted: boolean };
type ReplayResult = {
  final_state : unknown;
  final_data  : unknown;
  steps       : ReplayStep[];
  source_hash : string;
  canonical   : string;
};

/**
 * Replay `tape` against the machine compiled from `source`.
 *
 * @param source - FSL source text.
 * @param tape - The parsed stimulus tape.
 * @returns The deterministic {@link ReplayResult}.
 * @throws ReplayError `source_hash_mismatch` / `no_pending_timer`.
 *
 * @example
 *   replay("a 'go' -> b;", parse_tape('{"fsl_tape":1,"machine":{}}\n{"op":"action","name":"go"}'));
 */
function replay(source: string, tape: StimulusTape): ReplayResult {
  const computed = source_hash(source);
  const declared = tape.header.machine.source_hash;
  if (declared !== undefined && declared !== computed) {
    throw new ReplayError('source_hash_mismatch',
      `tape source_hash ${declared} != source ${computed}`);
  }

  // Controlled, deterministic time + timers: one pending callback at a time.
  let pending: (() => void) | null = null;
  const machine = new Machine<unknown>({
    ...make<string, unknown>(source),
    time_source         : () => 0,                       // frozen logical clock
    timeout_source      : (f: () => void, _ms: number) => { pending = f; return 1; },
    clear_timeout_source: (_h: number) => { pending = null; },
  });

  const steps: ReplayStep[] = [];
  tape.stimuli.forEach((s, index) => {
    let accepted: boolean;
    if (s.op === 'action') {
      accepted = machine.action(s.name, s.data);
    } else if (s.op === 'transition') {
      accepted = machine.transition(s.name, s.data);
    } else { // timer
      if (pending === null) throw new ReplayError('no_pending_timer', 'timer with no pending timeout', index);
      const cb = pending; pending = null; cb();
      accepted = true;
    }
    steps.push(s.op === 'timer'
      ? { index, op: 'timer', accepted }
      : { index, op: s.op, name: s.name, accepted });
  });

  const final_state = machine.state();
  const final_data  = machine.data();
  return {
    final_state, final_data, steps,
    source_hash : computed,
    canonical   : canonical_config(final_state, final_data),
  };
}

export { replay };
export type { ReplayResult, ReplayStep };
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ts/tests/fsl_replay.spec.ts --coverage.enabled=false`
Expected: PASS (6 tests). If `action`/`transition`/`data` signatures differ from `(name, data?)` / `()`, adjust the calls to match `jssm.ts` (they return `boolean`).

- [ ] **Step 5: Check diagnostics, then commit**

```bash
git commit -- src/ts/fsl_replay.ts src/ts/tests/fsl_replay.spec.ts -m "feat(v6): deterministic tape replay engine (M3)"
```

---

### Task 6: `fsl run` verb — `cli/subcommands/run/` + dispatcher registration

**Files:**
- Create: `src/ts/cli/subcommands/run/run.ts` (the lib step), `src/ts/cli/subcommands/run/plugin.ts` (the CLI shell)
- Modify: `src/ts/cli/dispatcher.ts` (register `run`)
- Test: `src/ts/tests/cli/run.spec.ts`

**Interfaces:**
- Consumes: `replay` (Task 5), `parse_tape` (Task 3).
- Produces: `run.ts` `runReplay(source: string, tape: StimulusTape): ReplayResult` (thin pass-through, the lib seam M5/M6/#819 import); `plugin.ts` `cli(argv: string[]): Promise<number>`.

- [ ] **Step 1: Write the failing test** (library-level, avoids spawning a process)

```ts
// src/ts/tests/cli/run.spec.ts
import { describe, it, expect } from 'vitest';
import { runReplay } from '../../cli/subcommands/run/run';
import { parse_tape } from '../../fsl_stimulus_tape';

describe('runReplay (lib)', () => {
  it('replays a doc + tape and returns the result with canonical + steps', () => {
    const tape = parse_tape(['{"fsl_tape":1,"machine":{}}', '{"op":"action","name":"go"}'].join('\n'));
    const r = runReplay("a 'go' -> b;", tape);
    expect(r.final_state).toBe('b');
    expect(r.canonical).toContain('"state":"b"');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ts/tests/cli/run.spec.ts --coverage.enabled=false`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the lib step and the plugin shell**

```ts
// src/ts/cli/subcommands/run/run.ts
import { replay }            from '../../../fsl_replay';
import type { ReplayResult } from '../../../fsl_replay';
import type { StimulusTape } from '../../../fsl_stimulus_tape';

/**
 * Replay a tape against FSL source — the library seam over the engine, reused
 * by the CLI shell, M5/M6, and the web replay shell (#819).
 *
 * @param source - FSL source text.
 * @param tape - The parsed stimulus tape.
 * @returns The {@link ReplayResult}.
 * @example
 *   runReplay("a 'go' -> b;", parse_tape(tapeText));
 */
function runReplay(source: string, tape: StimulusTape): ReplayResult {
  return replay(source, tape);
}

export { runReplay };
```

```ts
// src/ts/cli/subcommands/run/plugin.ts
import { promises as fs } from 'fs';
import { parseFslArgs }   from '../../cli-utils';
import { parse_tape, ReplayError } from '../../../fsl_stimulus_tape';
import { runReplay }      from './run';

const SPEC = {
  flags: {
    json:  { boolean: true as const },
    trace: { boolean: true as const },
    out:   { short: 'o' as const },
    help:  { short: 'h' as const, boolean: true as const },
  },
  usage: 'fsl-run [options] [<doc.fsl>] <tape.jsonl>',
};

const EXIT: Record<string, number> = {
  parse_error: 3, malformed_tape: 4, unsupported_format_version: 5,
  unknown_op: 4, source_hash_mismatch: 6, no_pending_timer: 7,
};

/**
 * `fsl run` entry point. `fsl run <doc> <tape>`, or `fsl run <tape>` when the
 * tape bundles its source (`machine.source`).
 *
 * @param argv - Args after the subcommand name.
 * @returns Exit code: 0 success; distinct codes per error class; 1 user error.
 * @example
 *   await cli(['m.fsl', 'run.jsonl', '--json']);
 */
export async function cli(argv: string[]): Promise<number> {
  let parsed;
  try { parsed = parseFslArgs(argv, SPEC); }
  catch (e) { process.stderr.write(`fsl-run: ${(e as Error).message}\n`); return 1; }

  if (parsed.flags.help) { process.stdout.write(parsed.helpText() + '\n'); return 0; }

  const pos = parsed.positional;
  if (pos.length === 0) { process.stderr.write('fsl-run: need a tape (and a doc unless bundled)\n'); return 1; }

  const tapePath = pos[pos.length - 1];
  const docPath  = pos.length >= 2 ? pos[0] : undefined;

  let tapeText: string, tape;
  try { tapeText = await fs.readFile(tapePath, 'utf8'); }
  catch (e) { process.stderr.write(`fsl-run: cannot read ${tapePath}: ${(e as Error).message}\n`); return 1; }
  try { tape = parse_tape(tapeText); }
  catch (e) {
    const re = e as ReplayError;
    process.stderr.write(`fsl-run: ${re.message}\n`);
    return EXIT[re.kind] ?? 2;
  }

  let source: string | undefined = tape.header.machine.source;
  if (source === undefined) {
    if (docPath === undefined) { process.stderr.write('fsl-run: no <doc> and tape is not bundled\n'); return 1; }
    try { source = await fs.readFile(docPath, 'utf8'); }
    catch (e) { process.stderr.write(`fsl-run: cannot read ${docPath}: ${(e as Error).message}\n`); return 1; }
  }

  let result;
  try { result = runReplay(source, tape); }
  catch (e) {
    const re = e as ReplayError;
    process.stderr.write(`fsl-run: ${re.message}\n`);
    return EXIT[re.kind] ?? 2;
  }

  const out = (s: string) =>
    parsed.flags.out ? fs.writeFile(parsed.flags.out as string, s) : Promise.resolve(void process.stdout.write(s));

  if (parsed.flags.json) {
    await out(JSON.stringify(result) + '\n');
  } else {
    const acc = result.steps.filter(s => s.accepted).length;
    const rej = result.steps.length - acc;
    let human = `state: ${String(result.final_state)}\n`
              + `data:  ${JSON.stringify(result.final_data)}\n`
              + `${result.steps.length} stimuli (${acc} accepted, ${rej} rejected)\n`;
    if (parsed.flags.trace) human += result.steps.map(s =>
      `  [${s.index}] ${s.op}${s.name ? ' ' + s.name : ''} -> ${s.accepted ? 'accepted' : 'rejected'}`).join('\n') + '\n';
    await out(human);
  }
  return 0;
}
```

Register in `dispatcher.ts`: locate the subcommand registry (where `render`/`codegen` map to their `plugin.cli`) and add a `run` entry following the exact same pattern used there (import `cli as runCli` from `./subcommands/run/plugin` and map `'run'` to it).

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ts/tests/cli/run.spec.ts --coverage.enabled=false`
Expected: PASS (1 test).

- [ ] **Step 5: Check diagnostics, then commit**

```bash
git commit -- src/ts/cli/subcommands/run/run.ts src/ts/cli/subcommands/run/plugin.ts src/ts/cli/dispatcher.ts src/ts/tests/cli/run.spec.ts -m "feat(v6): fsl run verb over the replay engine (M3)"
```

---

### Task 7: Stochastic cross-check — the anti-fake determinism proof

**Files:**
- Create: `src/ts/tests/fsl_replay.stoch.ts`

**Interfaces:**
- Consumes: `replay` (Task 5), `Machine`, `make` (`./jssm`), `serialize_tape`/`parse_tape` (Task 3).

**Note:** The key test compares replay against the **live runtime** driven directly with the same stimuli (no tape), proving the replayer reproduces the runtime rather than agreeing with a hand-written value. Follow the `*.stoch.ts` style (fast-check `fc`, `RUNS` constant, `void`-wrap predicates as in `fsl_containers.stoch.ts`). Build random stimulus sequences over a fixed small machine's known alphabet.

- [ ] **Step 1: Write the test**

```ts
// src/ts/tests/fsl_replay.stoch.ts
import * as fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { Machine, make } from '../jssm';
import { replay } from '../fsl_replay';
import { parse_tape, serialize_tape } from '../fsl_stimulus_tape';
import type { Stimulus } from '../fsl_stimulus_tape';

const RUNS = 200;
const SRC  = "Locked 'coin' -> Unlocked; Unlocked 'push' -> Locked;";
const acts = fc.constantFrom('coin', 'push');

function liveDrive(seq: string[]) {
  const m = new Machine<unknown>({ ...make<string, unknown>(SRC), time_source: () => 0 });
  for (const a of seq) m.action(a);
  return m.state();
}

describe('replay (stochastic)', () => {
  it('replay agrees with the live runtime driven directly (anti-fake cross-check)', () => {
    fc.assert(fc.property(fc.array(acts, { maxLength: 40 }), seq => {
      const tape = { header: { fsl_tape: 1, machine: {} }, stimuli: seq.map(name => ({ op: 'action', name } as Stimulus)) };
      void expect(replay(SRC, tape).final_state).toBe(liveDrive(seq));
    }), { numRuns: RUNS });
  });

  it('is deterministic: replaying the same tape twice is byte-identical', () => {
    fc.assert(fc.property(fc.array(acts, { maxLength: 40 }), seq => {
      const tape = parse_tape(serialize_tape({ header: { fsl_tape: 1, machine: {} }, stimuli: seq.map(name => ({ op: 'action', name } as Stimulus)) }));
      void expect(replay(SRC, tape).canonical).toBe(replay(SRC, tape).canonical);
    }), { numRuns: RUNS });
  });
});
```

- [ ] **Step 2: Run to verify pass**

Run: `npx vitest run src/ts/tests/fsl_replay.stoch.ts --coverage.enabled=false`
Expected: PASS (2 properties, `RUNS` each). If the stoch suite has a separate runner config, run it the same way other `*.stoch.ts` files are run.

- [ ] **Step 3: Full suite + coverage gate, check diagnostics, commit**

Run the full spec suite to confirm the 100% coverage gate over the new modules:
Run: `npm test` (or the project's `vitest-spec` script).
Expected: PASS, coverage satisfied.

```bash
git commit -- src/ts/tests/fsl_replay.stoch.ts -m "test(v6): stochastic replay cross-check vs live runtime + determinism (M3)"
```

---

## Self-review

**Spec coverage:** §4 file structure → Tasks 1–6 (every module + the `jssm.ts` edits). §5 engine (construct-with-injection, 3 behavioral rules, ReplayResult, channel-output reserved) → Task 5. §6 canonical/RFC 8785/core-split → Tasks 1 + 4. §7 tape format/3 ops/identity → Task 3. §8 run verb (doc+tape / bundled, flags, exit codes) → Task 6. §9 error taxonomy → Task 3 (`ReplayError` kinds) + Task 6 (exit-code map). §10 testing (spec + the anti-fake stoch cross-check + robustness) → Tasks 1–7. §3 #816 → Task 4. **Gap check:** `--bundle` *reading* is covered (Task 6 reads `machine.source`); *writing* bundled tapes is out of scope for `run` (spec §8: production is not `run`'s job) — no task needed.

**Placeholder scan:** no TBD/TODO; every code step is complete; line numbers in Task 4 flagged as locate-by-content, not placeholders.

**Type consistency:** `replay(source, tape) → ReplayResult` consistent across Tasks 5/6/7; `ReplayError`/kinds consistent Tasks 3/5/6; `canonical_config`/`canonicalize` consistent Tasks 1/4/5; `parse_tape`/`serialize_tape`/`Stimulus` consistent Tasks 3/5/6/7; `source_hash` consistent Tasks 2/5.

**One integration risk to verify during Task 5:** the exact `action`/`transition`/`data` signatures and return types in `jssm.ts` (assumed `action(name, data?) → boolean`, `transition(state, data?) → boolean`, `data() → mDT`). Confirm and adjust calls if they differ.
