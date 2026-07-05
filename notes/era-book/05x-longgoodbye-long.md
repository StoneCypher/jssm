# 5.x — The Long Goodbye (long form)

**June-audit re-verification.** *Manager:* The last implementation audit found packaging and
fidelity problems against a tree that has moved since; re-check each finding so 6.0 fixes
facts, not memories. *CS:* reproduce/refute the seven findings (pack-shape via `npm pack
--dry-run --json` + tarball assertions; advertised-verb/bin drift; interchange envelope
validation + start-states loss; forced-transition erasure in codegen; config-schema drift;
test type-import drift) on both main and the assembly line; verdict table into the era-0
brief's Corrections; cheap fixes land as patches, the rest feed WP-2.

**Bug/QoL residue.** *Manager:* The genuinely-still-broken short list from the triage — small,
real, and cheaper to fix now than to carry across a major. *CS:* the ledgers' `e0`/`KEEP`
rows are the authoritative feed (e.g. fsl#1264 `.data` undefined-set gap, #1299 hook_after
implication, #1185 cosmetic CSS, #935 data-change value validation, #710/#653/#659 missing
tests); TDD each, batch into content-bearing patch releases.

**Lint & tooling refresh.** *Manager:* The eslint constellation went stale during the perf
push; refresh it so 6.x code lands against modern rules instead of 2021's. *CS:* fsl#726–#732
cluster — update the personal plugin, re-evaluate unicorn/fp/promise/react/new-with-error,
new plugin survey; land as config-only patches; strict-mode itself stays in the v11 batch.

**Coverage chores.** *Manager:* Close the known stochastic-coverage gaps so the 6.0 suites
start from a clean 100% story on both paths. *CS:* fsl#651/#652 (stoch 100% on jssm.ts and
jssm-util), #556 umbrella; charset/naughty-strings prep (#505, #1194–#1199 tails feeding the
#1379 V6 umbrella); module-attribute test (#389).

**Dragon phase A.** *Manager:* Wake the sleeping kitchen-sink dragon locally — bit-rot fixes
and seed-printing — so the 6.0 CI lanes have something green to host. *CS:* revive
`kitchen_sink_dragon.maximal.ts` under `vitest-dragon` (pre-vitest idioms → current fc/vitest
API); failures must print splitmix + fast-check seed pairs; keep thresholds 0 (ungated) until
the 6.0 lane decision activates the decided three-tier budget.

**Housekeeping.** *Manager:* Small operational debts that make the 6.0 assembly cleaner:
issue-template modernization, CI report chores, and the kitchen-sink example upkeep the
dragon depends on. *CS:* fsl#1100 (YAML issue forms), #986 (CLOC in Actions output), #611
(trace tests for obscure builds), #65 (kitchen-sink upkeep), #365 (favicon, 5 minutes of
dignity); nothing breaking, everything batched.
