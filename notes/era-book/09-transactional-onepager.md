# v9 — The Transactional Machine (one page)

**Mission:** writes become safe. The semantically deepest major: everything that makes
mutation, failure, and time-inside-a-reaction coherent, as one unit — because it is one unit.

**Opens with a real breakage batch:** the **mDT→val-record hook re-target** (§28 `.data()`
row) — hooks stop seeing the opaque blob and see the typed val-record; `.data()` remains a
deprecated escape hatch. (Plus bare-functions if v6 took the fallback.)

**Contents (~85):** `assign` (whole+slot, sequential, `old`) over the **undo-log journal**
(#756 columnar vals + O(#writes) journal, perf-envelope-policed); atomic rollback; the
contract quartet — `where`/`require`/`ensure`/`invariant` — with the violation model
(obligation + debug-assert + compile-out under sealed); the error model (last_error/
error_count, error tape, rollback event, error states); **RTC implemented exactly per the C2
appendix** (selection order, FIFO drain, microstep bound, macrostep hook points); named
handlers; source lifecycle hooks (#1357); the uniform observational registry + introspection
(has_hook/hooks_on — closes the fsl on_* grammar cluster and #1220); `hooks: closed`
enforcement (#617); **safety checking** (native reachability + invariants); **M1** `check` +
the unsigned certificate record bound to the C1 hash; M4-subset run predicates; budgets/
`undecided`/`--estimate`; M2 attempts here, slips to v14 freely.

**Exit:** a contract violation rolls back atomically and replays identically on two
implementations' traces; `check` emits certificates; the 5.x hook suite passes against the
re-target via compat shims documented in the manifest.

**Hazards:** THE keystone era — every C2 "divergence killer" becomes live code here; perf
envelope is the tripwire (the 5.142 −20% lesson); no contract inheritance, ever (§10).

**Milestone:** fsl #52. **Sources:** era-1 WP-1.6/1.8 + waves 6.4/6.5/6.8; W6.60–.79,
.93–.98; C2 appendix.
