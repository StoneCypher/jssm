# 5.x — The Long Goodbye (one page)

**Mission:** end the 5-line gracefully while the 6.0 assembly happens on a branch beside it.
Nothing breaking ships here; everything here makes 6.0 cheaper or safer.

**Contents (~25 topics; ledger code e0):** the June implementation-audit re-verification
(package shape, interchange envelope, forced-transition erasure — fix or refile); the genuine
bug/QoL residue from the triage ledgers; lint-plugin refresh (eslint cluster fsl#726–#732);
coverage chores (stoch 100% on util/jssm); charset/naughty-strings test prep; kitchen-sink
dragon revival groundwork (WP-6 phase A: file green locally, seeds printed); CLOC/CI report
chores; issue-template YAML upgrade.

**Exit:** last 5.158.x published; assembly branch ready; dragon smoke lane runnable; jssm
tracker drained to zero (migrate-or-close executed); nothing left on 5.x that 6.0 would
rather inherit fixed.

**Hazards:** don't let cleanup scope-creep into features; anything breaking waits for the
batch; main keeps releasing on every push, so batch trivia into real-content releases.

**Milestone:** fsl #48. **Sources:** era-0 brief WP-1/WP-2/WP-6 phase A; ledgers' e0/KEEP rows.
