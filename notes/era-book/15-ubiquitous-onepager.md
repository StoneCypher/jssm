# v15 — The Ubiquitous Machine (one page)

**Mission:** the fleet. One machine, forty hosts, provably the same — certified against the
v10 contract and the v13 ABI, which is exactly why this era comes last of the engineering
majors: it certifies a stable language instead of chasing a moving one. **The `fsl` org era**
(transfer secured 2026; everything migrates under it; satellite repos live there).

**Contents (~28 inherited + per-host packets):** the **host ABI finalized** (hooks, sensors,
channels, time, randomness, errors, cancellation, rollback notification, replay injection —
including v13's effect/persistence surface); per-host **runtimes** beyond the v6-era Rust
(Python, C, C# … per demand), each shipped via the **bringup kit** — port the ~200-line
harness, not the suite; run the vector corpus; declare a tier; **T2 rich-portable / T3
pinned-unicode certification** with the differential fleet CI (pairwise disagreement
localizes instantly); **codegen targets**: native emitters + **adapters** (xstate, boost::msm,
state-machine-cat, Amazon States Language …) with golden-trace conformance on their declared
subsets — the FeatureComparison matrix becomes a tested contract; capability negotiation
(#1172/#1173) + negative-capability reports; typegen fleet-wide; package-name attributes +
per-manager manifests; the **WASM toolchain productized** (zero-install everywhere agents
run); cross-host unicode/number pinning (#815) closed; `publish` + `codegen --certify`
(fsl#407 — the beloved one).

**Exit:** a machine certified at T2 runs bit-identically on ≥3 hosts; an adapter's claims are
backed by executed golden traces; `npm install`-less environments run the full toolchain via
WASM; capability manifests are data, not prose.

**Hazards:** silent semantic erosion is the era's death mode — refuse-by-default beats lossy
generation everywhere; hosts lag tiers honestly via manifests, never quietly.

**Milestone:** fsl #58. **Sources:** eras-2-to-7 brief (era 6); W11.1–.10; megaspec §16/§26.
