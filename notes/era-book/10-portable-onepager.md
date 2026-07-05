# v10 — The Portable Machine (one page)

**Mission:** the portability contract, cashed. "One machine, two runtimes, byte-identical —
and here's the kit to add yours."

**Contents (~70):** the **IR freeze** (the compiled-machine artifact C5 consumes — decided:
no second FSL parser); the **Rust second implementation** at T1 scope (IR consumer + stepper
+ canonical trace emitter) with **differential CI replaying the ENTIRE accumulated vector
corpus** byte-for-byte, nightly full + PR smoke; C4 matured into the public vectors-as-
normative-artifacts format with governance metadata; **byte-level reversibility** (#134):
the lossless CST/trivia layer, `format`, and the executable `parse→format→parse` idempotence
law; the editor Format button behind its semantic-round-trip interlock; `typegen` (TS-first);
grammar exports (gbnf/lark/ebnf) productized for constrained decoding; the minifier family;
`parse --json` located-AST as a public artifact; the SVG/theme backlog closes; #815 rules
(cross-host number formatting/collation) land in `fsl_canonical`'s spec.

**Exit:** a disagreement anywhere between JS and Rust on any vector fails CI; format is
idempotent by conformance test; the WASM build of the Rust core exists as the toolchain
distribution seed (productized in v15).

**Hazards:** the IR freeze is the era's irreversible — freeze AFTER v9's semantics, never
before (this ordering is the whole reason v10 follows v9); Rust runtime stays deliberately
boring (reference-quality, not clever).

**Milestone:** fsl #53. **Sources:** era-1 WP-1.4/1.5/1.10 + waves 6.7/6.9; W6.99–.111;
C1 spec; irreversibles #2/#6/#14.
