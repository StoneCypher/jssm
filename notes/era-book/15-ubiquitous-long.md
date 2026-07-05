# v15 — The Ubiquitous Machine (long form)

**Host ABI finalized + the org migration.** *Manager:* The boundary every runtime implements
— now including v13's effect/persistence surface — gets frozen; and the repos reorganize under
the `fsl` GitHub org secured back in 2026. *CS:* ABI: hook/sensor/channel call shapes, time +
random sources, error representation, cancellation, rollback notification, replay injection,
recording format; versioned; adapters declare ABI level; org migration = repo moves + redirect
hygiene + satellite creation (SAT twins finally close).

**Per-host runtimes via the bringup kit.** *Manager:* Adding host N stops being a research
project: port a ~200-line harness, run the corpus, declare your tier. Python and C follow
Rust; demand picks the rest. *CS:* kit = corpus runner, trace comparator, canonical-value
serialization tests, IR loader tests, ABI mocks, negative diagnostics, replay tests,
manifest validator; each runtime = IR consumer + C2 stepper (T1 first); tier growth by
passing more vectors, never by assertion.

**T2/T3 certification + differential fleet.** *Manager:* "Certified" becomes a measured word:
T1 finite-exact everywhere, T2 rich-portable, T3 pinned-unicode — and the whole fleet runs
pairwise differential so any divergence names its host within a night. *CS:* tier suites per
§26; `codegen --certify <target>` runs them; pairwise trace diffing localizes; capability
manifests are data (declared tier + feature set + negative reports with reasons/workarounds).

**Codegen targets + adapters.** *Manager:* Native emitters where hosts deserve them, adapters
into the ecosystem's existing FSM libraries (xstate and friends) — with golden traces, so
"export to xstate" means behaviorally certified on the declared subset, not "looks similar."
*CS:* targets = plugins vs the S3 architecture (surface/emit-utils/TARGET_META total);
adapter set fsl#563–#577 + Amazon States (#496) + taskflow/circle per demand; refusal-by-
default on unsupported semantics (`--allow-loss` explicit); golden traces through the
adapter's actual runtime; FeatureComparison becomes tested contract.

**typegen fleet-wide + manifests + WASM product.** *Manager:* Every host gets the machine's
type surface in its own idiom, every package manager gets a proper manifest, and the
toolchain itself ships as WASM — running where agents actually run, no install. *CS:*
typegen: C headers/Rust enums/Python hints via target plugins (no cert gate); package_name +
per-manager overrides (npm/cargo/pip/nuget/composer/gem…) → emitted manifests (4th artifact);
docs extraction (5th); WASM = the Rust core + verb surface behind stdio/JS bindings, powers
playground + editor; #815 unicode/number pinning verified fleet-wide; `publish` (fsl#407)
ships the bundle (module + README + renders + certificate) with confirmation gates.
