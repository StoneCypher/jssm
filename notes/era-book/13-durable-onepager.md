# v13 — The Durable Machine (one page)

**Mission:** machines that outlive processes, versions, and their authors. The
Temporal/Restate category, claimed with the one property incumbents lack: the workflows are
*certified* and every incident is a replayable counterexample.

**Gate:** full blind-thinkthrough PROCESS run before its spec — this is the era the corpus
priced at one paragraph, and it is cursed-corner territory (post-commit failure, at-least-once
vs exactly-once, crash mid-macrostep).

**Contents (~17 inherited; the spec run births the rest):** the **persistence contract**
(#813 twin): where tapes/snapshots durably live; resume-after-crash = rehydrate snapshot +
replay tail + continue; **recorded hook returns** — the §11 effect boundary made real,
filling irreversibles #4's slot (determinism ledger shape), which is also what makes receipts
over hooked machines possible; **`migrates from`** typed snapshot lifting, verifier-checked;
hot member upgrade (supervision × migrates-from); canary factories; the **OTel flight
recorder** (transitions as spans; one-call repro-bundle export from a trace window);
**behavioral drift detection** (live tape statistics vs model prediction — incident before
outage, zero instrumentation); **`calibrate`** (production tapes correct guessed weights, as
a reviewable diff → re-prove); forensics: `run --amend` counterfactuals, `diff` over runs,
`inspect --redact` with the provable redaction map, `bug` self-proving reports, `doctor`;
the **5.x snapshot-lift policy decision** (omissions D9 — even "permanently refused" must be
written); the §29 security/effects appendix (with v14's review input).

**Exit:** kill -9 mid-macrostep, restart, and the machine resumes to the identical state on
two hosts; a v2 deploy lifts a live v1 snapshot under verifier checks; drift alerts fire from
tape statistics alone. **Sequencing law:** this era finalizes the host ABI's
effect/persistence surface BEFORE the v15 fleet implements it.

**Milestone:** fsl #56. **Sources:** eras-2-to-7 brief (era 4); W9.1–.14; megaspec §15 rings.
