# Item register — authoring progress

One line per slice. Ordered by execution value: v5.x → v6 → v7 → v8 → v9 → v10 → v11 → v12 → v13 → v14 → v15 → v16.

- 2026-07-04 · **v5.x** · The Long Goodbye · 31 files (Tfsl-486,480 audit; Tfsl-1299,1264,1185,935,710,659,653 bug/QoL; Tfsl-1317,1073,732,731,730,729,728,727,726,545,112 lint; Tfsl-652,651,556,389 coverage; Tfsl-65 + Tjssm-922 dragon-A; Tfsl-1307,1100,986,611,365 housekeeping) — all `e0` cleanup rows, no W-items; `npm run era_book` green.
- 2026-07-04 · **v6** · The Ground · 10 files (W6.99 C1 hash, W6.100 seeded-walk repro; Tjssm-754 atom-charset breakage; Tjssm-755,757,758,759 val-bug-tail; Tjssm-756 perf-keystone; Tjssm-827 M3 via One Merge; Tjssm-921 deno drop) — the addressable rows that map to v6; `npm run era_book` green.
- 2026-07-04 · **v12** · Proven · 23 files (ladder-decision W8.1; temporal-language W8.2,6,7; backends-bridges W8.3–5; testing-toolkit W8.8–12; composed-checking W8.13–16; evolution-tooling W8.17–23) — verification era: temporal DSL, three-backend agreement, F6 composed checking, MBT, M2 signing. issue-twins W8.1=492, W8.2=1360, W8.8=485, W8.11=622. `npm run era_book` green (224 files). **Era 3 (v12) W-spine COMPLETE.**
- 2026-07-04 · **v11** · Composable/Society · 38 files (sensors-time W7.1,7; channels-emit W7.2–5; named-hooks W7.6; tapes W7.8–10; systems-dispatch W7.11–19,21,23,28; factories W7.24–26; supervision-hierarchy W7.20,22,27; status-recovery-rest W7.29–37; breakage WP11.1 alias-removal+strict) — 37 W7.* + 1 WP. issue-twins from =fsl# tags. `npm run era_book` green (201 files). **Era 2 (v11) W-spine COMPLETE.**
- 2026-07-04 · **v10** · Portable · 16 files (editions W6.93,94; cli-tooling W6.101–111; portability-contract WP10.1 C3, WP10.2 C4, WP10.3 C5) — completes ALL W6.* (v6–v10) + the contract packets. issue-twins W6.93=1057, W6.102=134, W6.109=190, W6.110=315. deps: C2→C4→C5 conformance chain from dag.md. `npm run era_book` green (163 files). **Era 1 (v7–v10) W-item spine COMPLETE.**
- 2026-07-04 · **v9** · Transactional · 23 files (mutation W6.60; contracts W6.62–64; violation W6.65; error-model W6.66–70; rtc W6.71–73; hooks W6.74–79; safety W6.95; m-track W6.96–98) — DbC quartet, undo-journal rollback, RTC-per-C2, unified hook registry, native safety checker + M1/M4-subset. issue-twins W6.64=1355, W6.71=1345, W6.76=1357, W6.78=1251, W6.79=617. deps: contract→violation→checker + rollback↔#756 + M1↔C1 from dag.md. `npm run era_book` green (147 files).
- 2026-07-04 · **v8** · Structured · 31 files (containers W6.13–18; data-types W6.19–25; fn-slots W6.26–30; streams W6.31; groups W6.80–85; graph W6.87–92) — W6.86 exemplar already present. issue-twins set where tagged (W6.84=114, W6.88=1356, W6.90=1350, W6.91=618, W6.92=1256). deps: ADT/fn/group spines from dag.md. `npm run era_book` green (124 files).
- 2026-07-04 · **v7** · Computing · 40 files (numeric-tower W6.1–4,6–8; scalar-values W6.11,12; byte-model W6.10; strings W6.9,57–59; expressions W6.32–42; totality W6.43–45; stdlib W6.46–56; guards W6.61) — the P2 expression-language spine; W6.5 exemplar already present. deps encode the P2 slice spine from dag.md. `npm run era_book` green (93 files total).
- 2026-07-04 · **era-0 WP topics** · 10 files (WP6.1 bare-functions, WP6.2 One Merge, WP6.3 synonym removal, WP6.4 probabilistic split, WP6.5 dragon-live, WP6.6 C2 semantics, WP6.7 perf-envelope, WP6.8 error-codes, WP6.9 tracker-drain; WP5x.1 audit re-verify) — the ID-less program topics, now first-class items per John's call (`WP<version>.<n>` scheme). deps/blocks encoded from `dag.md`. Era 0 register is now COMPLETE (every 05x + 06 long-form entry has an item).

## Derived W6.* → version mapping (proceeding on this unless corrected)

The spec-workitems header + era-1 wave→major table pin W6.* items across five majors.
My reading (exemplars confirm: W6.5 decimal=v7, W6.86 groups=v8):

- **v6 "Ground" (foundations, wave 6.1):** W6.99 (C1 canonical hash), W6.100 (seeded-walk reproducibility). The rest of v6 (bare-functions API §27, breakage batch, One Merge val/M3/codegen, P1 val bug tail #755/#757/#758/#759) comes from the **era-0 brief**, not the W-list — those are the next slice.
- **v7 "Computing" (scalars/expr/strings/where + stdlib, wave 6.2):** W6.1–.12, W6.32–.59, W6.61.
- **v8 "Structured" (containers/data/streams/fn-slots + groups/graph, waves 6.3+6.6):** W6.13–.31, W6.80–.92.
- **v9 "Transactional" (mutation/contracts/error/RTC/hooks/safety/M-track, waves 6.4+6.5+6.8):** W6.60, W6.62–.79, W6.95–.98.
- **v10 "Portable" (conformance/format/tooling, waves 6.7+6.9):** W6.93, W6.94, W6.101–.111.

### Boundary calls flagged for John (cheap to correct before the v6–v10 authoring)

1. **W6.61 `where` guards → v7**, not v9 — honoring the header note's explicit "where→v7" even though the issue sits in the §9 mutation block with the contract quartet (W6.62–.64, which stay v9).
2. **Stdlib §7 (W6.46–.56) → v7** — ships with the P2 expression-language slices (WP-1.7 lists "stdlib (§7)" as an expr slice); not called out separately in the header categories.
3. **Fn-slots W6.29/.30 → v8** — kept with their declared §4 range (W6.13–.31 → v8) even though wave 6.4 (v9) mentions "function-typed slots"; the numeric range is the cleaner signal.
4. **W6.99/W6.100 → v6** — C1 hash + seeded-walk repro read as wave-6.1 "foundations," not wave-6.7 "conformance" (which is C3/C4/N=2 → v10). WP-1.1 marks the hash "DO FIRST," reinforcing foundational placement.
5. **W6.104 (explain + error-code registry) → v10** — filed under §25 tooling; the "error-code namespace" half is arguably wave-6.1/v6, but the item as written is the explain verb.

None of these change item content, only the `version` tag. Proceeding on the mapping above.

## Cluster-tier vs item-tier (v6 exposed this; applies throughout)

The README's three tiers are **book cluster → items/*.json (W-IDs/issues) → tracker issues**.
Several v6 "Ground" topics in `06-ground-long.md` are pure program work with **no W-ID and no
tracker row** — the One Merge, the dragon go-live, the perf envelope, the error-code namespace
reservation, `jssm-*` synonym removal, the probabilistic list-target split, the C2 semantics
appendix, tracker execution, audit re-verification. Under the strict ID rules (an item is a
W-ID or a `T<repo>-<number>` tracker row) these have no conformant item ID, so they stay at
the **cluster tier** — captured in the long-form markdown, not duplicated as item JSON. Only
the addressable rows became items.

**RESOLVED (John, 2026-07-04): mint synthetic `WP<version>.<n>` items for the ID-less program
topics.** Done for era 0. The same pattern recurs downstream and gets the same treatment as each
era is authored: the contract packets C3/C4/C5 (era-1 WP-1.3/1.4/1.5 → v10), the P2
generator/parser-dual infra (v7), the manual/book program, and each era brief's umbrella-level
WPs that carry no issue. `WP` (program work) stays visually distinct from `W` (feature items).

**Dependency edges** come from `notes/superpowers/eras/dag.md` (the merged DAG). Encoded so far,
single-expression per edge (exemplar convention, no reciprocals): W6.99→W6.96 (C1 blocks M1);
WP6.2→Tjssm-827/921 (One Merge lands the payload they close on); WP6.5←Tfsl-65/Tjssm-922
(dragon-live needs phase-A kitchen-sink + CI gating); WP6.7→Tjssm-756 (perf envelope gates the
journal rewrite). Cross-era edges (C1→trust stack, C2→C4, #756→era-3/4) get wired from the
downstream item when that era is authored.
