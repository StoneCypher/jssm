# v11 — The Composable Machine (one page)

**Mission:** machines get I/O and each other. Breakage batch: `property`/`var` alias removal
+ strict mode (#712, last of its cluster).

**Contents (~80):** §14 whole — typed channels + `emit`-in-transaction, `on chan(payload)`
heads (payloads #1348, alphabet #1358), Mealy+Moore, sensors live, **time-as-sensor** with
the abstract time model (+`time_between` #1389/#1391), named hooks (declare/require/call;
recording slot reserved for v13), tape wiring (input ring retained; output/log/error
regenerate), first-class tapes, `tokenized_by`; **§21 factories** — the `factory` block,
identity targets, `seq()`/`rand()`, `at()`/`make()`/`with()`, and the **seed tree with
`derive()` pinned by conformance vectors + the edit-stability policy** (irreversibles #11);
**§22 systems** — `machine{}`/`wire`/import+registry (#1352), the `fss`/`fslf`/`fssf` tags,
deterministic queued dispatch + depth bound, routes/selectors/`sender`, populations with
`max`, `spawn`/`retire`, `on_undeliverable` + dead-letter tape, **supervision** with restart
intensity, fairness/quotas, acyclic containment hierarchy, recursive serialization;
machine-vals (HAS-A embedding); machine status halted/complete + termination promise (#458);
error-recovery transitions; units §4.5 + SI prelude; windowed aggregates; weighted start
states (#414); spread (#453/#72/#142); statechart set per its decisions (#1340–#1347,
#1351); §24 system viz (clusters, badges, route edges); `make`/`repl` verbs; §16
doc-extraction artifact.

**Exit:** the RCT park compiles, runs, renders, and replays deterministically — the manual's
spine becomes writable; same seed + same stimuli = bit-identical system run.

**Hazards:** parallel regions stay OPEN (#1353) — composition is the answer until proven
otherwise; dispatch determinism needs C2-grade small-step text BEFORE code; seed-tree labels
are replay identities — the edit-stability policy is not optional.

**Milestone:** fsl #54. **Sources:** eras-2-to-7 brief (era 2); W7.1–.37; megaspec §14/§21/§22/§24.
