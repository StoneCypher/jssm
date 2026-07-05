# v10 — The Portable Machine (long form)

**IR freeze.** *Manager:* The compiled machine becomes a versioned, hashable artifact other
runtimes consume — frozen only now, after v9's semantics settled, so we freeze truth instead
of a draft. *CS:* IR = normalized post-compile record (states as interned IDs + name bimap,
edges w/ kind/action/guard-exprs, val slots/types/defaults, contracts, config), canonically
serialized (RFC 8785), schema-versioned, extension-pointed (irreversibles #2/#14);
`semantic/graph hash` layers defined over it; codegen/diff/verify consume the same object.

**Rust runtime (C5) + differential CI.** *Manager:* The second implementation — deliberately
boring, reference-grade — replays the ENTIRE accumulated vector corpus byte-for-byte against
JS. Any disagreement anywhere fails CI. This is the timebomb insurance, cashed. *CS:* T1
scope: IR loader + C2-conformant stepper + canonical trace emitter (no parser, no rich tier);
Rust sha256/JCS match C1/vectors; lanes: PR smoke slice + nightly full corpus, byte-compare;
disagree ⇒ localize by vector ID; the WASM build of this core = toolchain distribution seed.

**C4 corpus public.** *Manager:* Vectors graduate from test files to normative artifacts —
reviewed in with the spec, governance metadata, the executable definition of FSL. *CS:*
`fsl.vector.v1` (doc, seed, stimuli → canonical trace + digest); IDs/edition/feature-tags/
expected-envelope; thin-harness contract doc (~200 lines/host); promotion flow from
fuzz/incident finds; corpus splits (train/eval/canary) per governance.

**Byte-level reversibility (#134) + format.** *Manager:* parse∘unparse = identity, comments
and whitespace included; `format` becomes law-backed (`parse→format→parse` idempotent, in
the corpus as an executable law), and the editor Format button ships behind its round-trip
interlock. *CS:* lossless CST beside AST (trivia attached to anchors); `format` emits
canonical layout; idempotence + semantic-equality (AST compare) vectors; button = one CM6
transaction via text-diff, guard: format→reparse→AST-eq else refuse+report.

**typegen + grammar exports + located AST.** *Manager:* The machine's type surface for its
callers (TS first), the machine-readable grammar for constrained decoding, and the AST as a
supported public artifact — the tooling seam trio. *CS:* typegen: states/actions/val-record/
channel types as .d.ts (no behavior ⇒ no cert gate); `export --target gbnf/lark/ebnf` from
the peggy-typed grammar w/ edition+hash stamps; `parse --json` locations stable; minifier
family rides format's canonical layout inverse.

**Cross-host pinning (#815 close-out).** *Manager:* The last divergence doors — number
formatting and key collation — get normative rules in the canonical-serialization spec, so
"byte-identical" survives host number printers. *CS:* ECMAScript Number-to-String algorithm
specified for Rust (ryu-compatible shortest round-trip); UTF-16 code-unit collation
restated; astral/surrogate vectors; `fsl_canonical` doc becomes the cross-host reference.
