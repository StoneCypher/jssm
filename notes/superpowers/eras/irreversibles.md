# The Irreversibles Register

> **Status:** stable · **Author:** Claude Fable 5 · **Date:** 2026-07-04
> **Purpose:** Everything hash-shaped, ABI-shaped, or serialization-shaped — the decisions that
> cannot be retrofitted once anything downstream hashes, signs, replays, or implements them.
> Standing rule (era map): each of these gets specced **at contract quality the first time any
> work touches it**, regardless of which era that work belongs to. Seeded from registry-close's
> twelve IRREVERSIBLE rows, the megaspec's pinning principle, and `fable_sum_omissions.md`.
> **Legend:** status = `specced` (normative text exists) · `decided` (choice made, no spec) ·
> `open` (no decision). "First touch" = the event that forces the spec to exist.
> **Open questions:** rows 4 and 17 have live design forks noted inline.

| # | Item | Why irreversible | Status | First touch |
|---|------|------------------|--------|-------------|
| 1 | **Canonical `source_hash`** — normalization (LF + Unicode NFC policy per omissions D1), which hash layer is the certificate subject (raw / formatted / AST / graph), algorithm, tag format | Every certificate, receipt, lockfile, and memoization key binds to it forever; a change orphans every signed artifact | **open** — M3 shipped `provisional:` FNV-1a with a named swap seam | M1 (the certificate record) — write the spec BEFORE M1 starts |
| 2 | Canonical serialization (RFC 8785 JCS; key order by UTF-16 code unit; ECMAScript number formatting) | Trace equality, tape identity, replay bit-identity across hosts | **specced** for JS (M3, `fsl_canonical`); cross-host number/collation pinning deferred to #815 | C5 second implementation — #815 rules land in `fsl_canonical`'s spec |
| 3 | Stimulus-tape format + version gating (`fsl_tape: 1`) | Tapes are the retained source of truth; old tapes must replay forever or refuse loudly | **specced** (M3 §7) — extension discipline: additive fields only within a version | any new op kind (e.g. `receive`) |
| 4 | **Hook-return recording slot** (where recorded external returns live: tape op vs parallel ledger) | Durable execution and receipts-over-hooked-machines depend on it; retrofitting re-versions the tape format | **open** — omissions D10; codex's "determinism ledger" is one candidate shape; FORK: in-tape vs sidecar | next tape-format version bump, or era-4 start, whichever first |
| 5 | Operational semantics of the macrostep (§12 small-step: selection order, queue drain, invariant/commit/rollback/observer timing) | The conformance trace schema encodes it; two implementations diverge silently without it | **decided** (§12 prose + §28) — needs the committed §29 appendix | C4 vector format — cannot be written first |
| 6 | Conformance trace/vector format (`(document, seed, stimuli) → canonical trace`) | Vectors are reviewed in as normative artifacts, versioned with the spec, forever | **decided** (§26 shape) — no schema, zero vectors | C4 — seed from M3's determinism tests |
| 7 | Host ABI (hooks, sensors, channels, time, randomness, errors, cancellation, rollback notification, replay injection) | Every fleet runtime implements it; era 4 extends it with the effect/persistence surface | **open** — registry-close row; era-4-then-fleet ordering exists precisely to finish it before N implementations | C5 (minimal slice), era 4 (durability surface) |
| 8 | Effect/capability model (the `disallow` family, `pure` profile, effect classes on hooks) | Security claims, `run --require-profile`, MCP guardrails all lean on it; weakening later breaks published safety claims | **decided** (§3/§11) — the §29 security/effects appendix is its spec | first `pure`-profile enforcement or first guardrail feature |
| 9 | Typed boundaries (event payloads #1348, channel element types, hook signatures) | Interface cards, contracts, codegen exports, registry search all read them | **decided** (§14) — grammar unpinned (fsl#818 slice) | C3 grammar appendix / F3 |
| 10 | Bounded/total arithmetic semantics (overflow=error, opt-in saturating, no wrap; `div`/`mod`/`rem`; NaN policy) | Gemini's formal finding: partial arithmetic forces per-op SMT branching → contracts uncheckable; also cross-host numeric identity | **decided** (§4.1) — cross-host matrix unwritten (codex ask) | P2 implementation |
| 11 | Seed tree + `derive()` function (FNV-1a64 + splitmix64 candidate) + **label-stability-under-edit policy** (omissions D2) | Factory coordinates are replay identities; changing derive() or label semantics reshuffles every recorded coordinate | **decided** (§21.2, algorithm "working candidate") — derive() must be pinned with conformance vectors at F1; edit-stability policy is **open** | F1 |
| 12 | Defunctionalized lambda tag (content-hash of *normalized* lambda AST) | Function-valued state in snapshots rehydrates cross-host by tag; the normalization IS the identity | **decided** (§4.4/§16) — normalization rules unspecced | P2 lambdas |
| 13 | Pinned infra: `hash` builtin algorithm, zstd/lz4 canonical encoders, Unicode version floor (16.0) + `unicode:` attribute | The pinning principle (§28): anything not uniquely determined by input must be pinned or replay breaks | **decided** (§7/§8) — exact algorithm identities to pin in conformance vectors | P2 stdlib |
| 14 | Semantic-hash layers (formatted-source / AST / graph / interface / effects / proof-input) | Behavioral semver, refinement certificates, and registry identity are computed over them; can't be introduced after proofs exist (registry-close: proof-dependency identity is design-now) | **open** — codex's layer list is the candidate taxonomy; minimum viable = proof-input hash at M1 | M1 (proof-input), era-3 (behavioral) |
| 15 | Certificate record + receipt record canonical forms | Signed artifacts live in transparency logs forever; schema mistakes are permanent | receipt **specced** (receipts design §5); certificate **decided-not-specced** (§25 field list) | M1 |
| 16 | Stable diagnostic/error-code namespace (`E####`-style, per `explain`) | Codes are public API the moment one ships in CI output or an agent recipe | **open** — ad-hoc string kinds multiplying now (`ReplayError`, `ConfigError`, `CodegenError`) | first `explain` implementation or first `--json` diagnostic contract — reserve the namespace NOW, cheaply |
| 17 | Editions semantics + feature-gate declaration form | Every edition is a parse-rule set and conformance multiplier forever; the declaration syntax appears in every document | **decided** (§15) — grammar form unpinned; FORK: `edition: 2026;` literal shape vs attribute family | first gated feature ships |
| 18 | `fsl.lock` schema | Reproducible builds pin to it; supply-chain tooling parses it forever | **open** — one sentence in §25 | first registry-consuming verb (`verify` sweep) |
| 19 | Assume/guarantee minimal contract surface + adapter guarantee-weakening declaration | Registry-close: cannot retrofit onto emitted proofs; adapters that can't declare weakening break the composition algebra | **open** — the "how minimal can v6's subset be" question, explicitly unresolved in registry-close | F6 / era-3 composed checking |
| 20 | Composition semantics that permit property-preserving connectors (the P/R/X side-conditions) | If v6's machine semantics forecloses compositional proof, the registry thesis dies (the "avoid making the registry impossible" rule) | **decided-in-draft** (registry-close matrix, post-Gemini corrections; non-normative) | F4 wiring semantics |

## Working discipline

- When an era brief schedules work that touches a row marked `open` or `decided`, the spec for
  that row becomes part of that work's definition of done — no "we'll formalize it later."
- Additions to this register are cheap; removals require showing the item is either fully
  specced (link it) or genuinely reversible (say why).
- Rows 1, 5, 6 are the program's cheapest highest-leverage writing, in that order (see `dag.md`,
  critical-path reading).
