# Signed run-receipts — dependency roadmap

> **This is a sequencing document, not a TDD implementation plan.** The signed-run-receipts
> `replayed` slice (spec: `notes/superpowers/specs/2026-06-24-signed-run-receipts-design.md`)
> reuses trust infrastructure that **does not yet exist in v6**. A bite-sized "make the test
> pass" plan is impossible until that foundation lands. This document orders the prerequisite
> subsystems so each can enter its own brainstorm → spec → plan → implement cycle, with
> signed-run-receipts as the capstone.

## Why a roadmap instead of a plan (current v6 state, verified 2026-06-26)

| Prerequisite | State in v6 | Evidence |
|---|---|---|
| `run` verb / CLI replayer | **absent** | `src/ts/cli/dispatcher.ts` exposes only the `fsl-<name>` PATH plugin seam; no `run` subcommand under `src/ts/cli/subcommands/` |
| `check` verb + verification certificates | **absent** | no `check` subcommand; grep for `certificate`/`emit-certificate`/`source_hash` over `src/ts` finds only `colors.stoch.ts` (unrelated) |
| `verify` verb | **absent** | not in dispatcher |
| keyless signing / sigstore | **absent** | no signing module anywhere in `src/ts` |
| transparency log + revocation/advisory feed | **absent** | none |
| property language φ + run-evaluator | **partial / off-branch** | container/stdlib/ADT primitives exist (`fsl_containers.ts`, `fsl_stdlib.ts`, `fsl_adts.ts`); the full expression language lives on `feat_26-06-09_fsl-expression-language`, not merged to v6 |
| tape primitives | **present** | `src/ts/fsl_tape.ts` |
| runtime stepping (replay engine) | **present** | `transition()` / step API in `src/ts/jssm.ts` |

So 2 of 8 building blocks exist; the receipt logic is the **capstone of a tall stack**.

## The dependency graph

```
            (exists) fsl_tape.ts + jssm.ts runtime
                          │
        ┌─────────────────┼─────────────────────────┐
        ▼                 ▼                          ▼
   M3 run verb /      M1 check verb +          M4 property φ
   tape replayer      cert record             evaluator (subset
   (CLI over          (the thing signed)      now; full lang when
    existing prims)         │                  the branch merges)
        │                   ▼                          │
        │            M2 keyless signing +              │
        │            transparency log +                │
        │            revocation/advisory               │
        │            (signs the thing)                 │
        └───────────┬───────┴──────────────────────────┘
                    ▼
              M5 verify verb
              (sig + cert + replay + advisory chain)
                    │
                    ▼
              M6 signed run-receipts — replayed slice  ← capstone
              (record + issuance gate + tier model +
               layer-B identity + time fields)
```

Build order is **M1+M3+M4 (parallelizable) → M2 → M5 → M6**. M3 and M4 don't depend on M1/M2 and can proceed independently; M2 needs M1's record to have something to sign; M5 needs M1+M2+M3; M6 needs everything.

---

## Milestones (each = its own brainstorm → spec → plan → implement)

### M1 — `check` verb + verification certificate record
- **Megaspec anchor:** §25 (`check`, `--emit-certificate`), §26 (tiers T1/T2/T3), §28 (pinned `hash`).
- **Delivers:** the `fsl check` verb; deterministic **document `source_hash`** (pinned algorithm, cross-host identical — §28); the certificate record `{ source_hash, properties, checker_version, tier, result }` as an **unsigned** artifact first.
- **Depends on:** the check engine / `finite` validation (scope its own depth; full model-checking is huge — start with structural/finite checks, stage §23 model-checking separately).
- **Provides to:** M2 (something to sign), M6 (`machine_certificate_ref`, the source_hash hinge).
- **Key decisions for its brainstorm:** how much of §23 model-checking is in-scope vs. a later milestone; the canonical serialization that the hash covers (must be format-stable — leans on the 5.143 parser source locations).
- **Risk:** "what counts as a verified property" can balloon; keep M1 to certificate *plumbing* + a minimal property set, defer the verifier zoo.

### M2 — keyless signing + transparency log + revocation/advisory feed
- **Megaspec anchor:** §25.1 ("certificates are signed — sigstore-style keyless, OIDC-bound; append-only transparency log; revocation & advisories").
- **Delivers:** sign any record (cert or, later, receipt) via sigstore-style keyless/OIDC; transparency-log append + inclusion proof; the RustSec/GHSA-shaped advisory feed + revocation lookup.
- **Depends on:** M1 (a record to sign). Mostly **integration, not invention** (sigstore exists) — but it's the milestone with the most external moving parts (OIDC identity, a log service, an advisory feed format/host).
- **Provides to:** M5, M6 (the entire signature/identity/transparency/revocation layer they inherit).
- **Key decisions for its brainstorm:** which transparency log (Rekor vs. self-hosted); how `fsl login` / CI-OIDC identity resolution works locally vs. in CI; advisory-feed hosting (ties to the deferred "hosting the verified-component registry," §29).
- **Risk:** the offline-verification story (inclusion proof self-contained; revocation degrades to a staleness caveat) must be designed in from the start, not retrofitted.

### M3 — `run` verb / deterministic tape replayer
- **Megaspec anchor:** §25 (`run`: JSONL stimuli → channel records; `--snapshot`/`--restore`; "the replayer"), §15 (tape classes).
- **Delivers:** `fsl run <doc> <tape>` replaying a stimulus tape against a machine, bit-identically; final config + channel output; the replay primitive M5/M6 call.
- **Depends on:** existing `fsl_tape.ts` + `jssm.ts` stepping — **mostly a CLI surface over present primitives**, the cheapest milestone. Independent of M1/M2.
- **Provides to:** M5 (verify re-replay), M6 (issuance replay).
- **Key decisions for its brainstorm:** exact tape on-disk format + the determinism contract (must guarantee bit-identical replay cross-host — the property the whole trust story rests on); how seeds/factory bindings serialize.
- **Risk:** any nondeterminism leak (iteration order, float, locale, time) silently breaks every downstream receipt; this milestone owns the determinism guarantee and its conformance tests.

### M4 — property φ evaluation over a run (built-in subset first)
- **Megaspec anchor:** §17 (temporal/Dwyer patterns), §10/§11 (contracts), expression language on `feat_26-06-09_fsl-expression-language`.
- **Delivers (subset):** evaluate a small set of **built-in predicates over a completed run** that need no full expression language — `reached_state(S)`, `in_config(C)`, `is_legal_run`, `never_entered(error)`. Enough for the M6 `replayed` slice.
- **Delivers (full, later):** the complete property language once the expression-language branch merges to v6.
- **Depends on:** M3 (a run to evaluate); the expression-language merge for the full form.
- **Provides to:** M6 (the φ the issuance gate checks).
- **Key decisions for its brainstorm:** the built-in predicate set that ships first; the φ value/result type M6's record stores; how this bridges to the full language without a format break.
- **Risk:** scope creep into the full expression language — hold the line at the built-in subset for the v6 receipt slice.

### M5 — `verify` verb (the trust chain)
- **Megaspec anchor:** §25 (`verify` supply-chain sweep), spec §7 (the chain).
- **Delivers:** `fsl verify <cert|receipt|dir|lockfile>` walking signature → cert validity → (full) replay → advisory/revocation → validity window; `--json`, `--cheap`/`--full`, `--offline` with staleness caveat; `fsl.lock` participation.
- **Depends on:** M1 (cert), M2 (signing/log/advisory), M3 (replay). Initially verifies **certificates**; M6 extends it to receipts.
- **Provides to:** M6 (receipt verification is the same verb, extended).
- **Risk:** the two verification strengths (cheap = trust issuer's replay; full = recompute) and offline degradation must both be first-class from day one.

### M6 — signed run-receipts, `replayed` slice (capstone)
- **Spec:** `notes/superpowers/specs/2026-06-24-signed-run-receipts-design.md` — build §11's "ships in v6" column.
- **Delivers:** the receipt record + canonical serialization; `run --emit-receipt` minting **`replayed` only** (replay via M3 + φ-gate via M4 + sign via M2 + log via M2); `verify` extended to the receipt chain (M5); **layer-B** identity; `issued_at` + `not_before`/`expires_at`; `inspect <receipt>`; redaction composition.
- **Depends on:** M1+M2+M3+M4(subset)+M5 — everything.
- **Staged beyond v6 (spec §11 right column):** `witnessed` tier + per-stimulus `provenance` tape extension; `hosted` tier; layer-C holder-of-key; layer-A in-tape identity; trusted event-time; ZK predicate disclosure.
- **Key invariants to carry from the spec:** issuance is *check-then-sign* (no receipt for a false claim); **tiers are evidence-determined and uninflatable**; *the proof is timeless, the attestation is timestamped* (time never enters replay).

---

## Sequencing summary

1. **M3** (cheapest, unblocks replay) and **M1** (the record) in parallel; **M4-subset** alongside.
2. **M2** once M1 has a record to sign.
3. **M5** once M1+M2+M3 land.
4. **M6** capstone.

Each milestone is large enough to warrant its own `superpowers:brainstorming` pass before its plan — none should be planned blind off this roadmap. The receipt spec is already done; M1–M5 are not yet specced and should be brainstormed in the order above.

## Immediate next action

Pick the first milestone to brainstorm. Recommended: **M3 (`run`/replayer)** — it's the cheapest (CLI over existing primitives), it owns the determinism guarantee everything else depends on, and it's independent of the crypto stack, so it de-risks the foundation fastest.
