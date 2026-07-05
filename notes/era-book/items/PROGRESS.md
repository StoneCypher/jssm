# Item register — authoring progress

One line per slice. Ordered by execution value: v5.x → v6 → v7 → v8 → v9 → v10 → v11 → v12 → v13 → v14 → v15 → v16.

- 2026-07-04 · **v5.x** · The Long Goodbye · 31 files (Tfsl-486,480 audit; Tfsl-1299,1264,1185,935,710,659,653 bug/QoL; Tfsl-1317,1073,732,731,730,729,728,727,726,545,112 lint; Tfsl-652,651,556,389 coverage; Tfsl-65 + Tjssm-922 dragon-A; Tfsl-1307,1100,986,611,365 housekeeping) — all `e0` cleanup rows, no W-items; `npm run era_book` green.
- 2026-07-04 · **v6** · The Ground · 10 files (W6.99 C1 hash, W6.100 seeded-walk repro; Tjssm-754 atom-charset breakage; Tjssm-755,757,758,759 val-bug-tail; Tjssm-756 perf-keystone; Tjssm-827 M3 via One Merge; Tjssm-921 deno drop) — the addressable rows that map to v6; `npm run era_book` green. **See cluster-tier note below** — the v6 program WPs without a W-ID/issue stay at cluster tier.

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
the addressable rows became items. Flagging in case John wants synthetic IDs (e.g. `WP6.x`)
for the ID-less program topics; if so, that is a one-time schema decision affecting each era's
WP-level entries, not this era alone.
