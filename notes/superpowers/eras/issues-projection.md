# Issues Projection — Prepared Tracker Actions

> **Status:** **REVISION APPROVED by John 2026-07-04** — sections A+B are authorized for
> filing as drafted. **MILESTONES ALREADY CREATED by Fable (2026-07-04): fsl milestones
> #48 "5.x — The Long Goodbye" through #59 "v16 — The Public Machine"**, one per major;
> every filed issue gets its milestone; umbrella issues (A) pin to their own milestone ·
> **Author:** Claude Fable 5 · **Date:** 2026-07-04
> **Rules (HANDOFF standing grant):** nothing in this file is executed until John approves the
> containing revision; ALL new issues file to **StoneCypher/fsl** (jssm stays empty); every
> close cites its supersessor. Executors: append drafts under the matching section, request
> John's batch approval, then execute mechanically and mark each row `filed:fsl#NNN` /
> `closed`.

## A. Era umbrella issues (file to fsl; one per era; bodies link the era briefs)

**EXECUTED 2026-07-04 (Opus 4.8, John's go): all 11 umbrellas filed to StoneCypher/fsl as
fsl#1401–#1411, each pinned to its milestone (#49–#59), labelled `Created by AI`. Bodies carry
mission + delivers + exit criteria + links to the era book (`notes/era-book/`) and briefs, and
the "children file just-in-time" cadence line.**

*(Renumbered A1–A11 2026-07-04, dropping the pre-five-way-split `A2b/c/d` fossil now that all
umbrellas are filed; row IDs are internal ledger keys, the filed issues are unaffected.)*

| # | Draft title | Milestone | Filed |
|---|-------------|-----------|-------|
| A0 | `5.x "The Long Goodbye" — end-of-line cleanup before 6.0 (umbrella)` | #48 | **fsl#1418** |
| A1 | `v6 "The Ground" — end the 5.x line: breakage batch, One Merge, dragon (umbrella)` | #49 | **fsl#1401** |
| A2 | `v7 "The Computing Machine" — scalars, expressions, where-guards, stdlib (umbrella)` | #50 | **fsl#1402** |
| A3 | `v8 "The Structured Machine" — containers, ADTs, streams, fn-slots, groups, graph (umbrella)` | #51 | **fsl#1403** |
| A4 | `v9 "The Transactional Machine" — assign, contracts, RTC, hooks, safety (umbrella; opens w/ mDT→val-record batch)` | #52 | **fsl#1404** |
| A5 | `v10 "The Portable Machine" — conformance, Rust N=2, format, tooling (umbrella)` | #53 | **fsl#1405** |
| A6 | `v11 "The Composable Machine" — systems, factories, supervision, statecharts (umbrella)` | #54 | **fsl#1406** |
| A7 | `v12 "The Proven Machine" — verification stack (umbrella)` | #55 | **fsl#1407** |
| A8 | `v13 "The Durable Machine" — durable execution (umbrella; PROCESS-gated)` | #56 | **fsl#1408** |
| A9 | `v14 "The Trusted Machine" — signing + receipts (umbrella; security-review-gated)` | #57 | **fsl#1409** |
| A10 | `v15 "The Ubiquitous Machine" — multi-host fan-out (umbrella)` | #58 | **fsl#1410** |
| A11 | `v16 "The Public Machine" — registry + agent economy (umbrella)` | #59 | **fsl#1411** |

## B. Decision-record asks (file to fsl)

**EXECUTED 2026-07-04 (Opus 4.8, John's go): all 6 filed to StoneCypher/fsl, labelled
`Created by AI`. B2–B6 pin to v6 (#49, the active era) as children of the v6 umbrella #1401;
B1 pins to v12 (#55) as the first child of the v12 umbrella #1407.**

| # | Draft title | Milestone | Filed |
|---|-------------|-----------|-------|
| B1 | `decision record: automata-ladder checkable band — §3 four rungs vs the formal push-up` | #55 | **fsl#1417** |
| B2 | `spec: canonical source_hash — normalization, layer identity, algorithm (C1)` | #49 | **fsl#1412** |
| B3 | `manifest entries: jssm-* synonym removal + probabilistic list-target split` | #49 | **fsl#1414** |
| B4 | `spec: operational-semantics appendix — small-step macrostep (C2, §29)` | #49 | **fsl#1413** |
| B5 | `perf envelope: allowed runtime-regression budget for v6 enabling infra vs 6.0 baseline` | #49 | **fsl#1415** |
| B6 | `reserve the stable diagnostic/error-code namespace before ad-hoc codes multiply` | #49 | **fsl#1416** |

Deliberately NOT pre-filed (first-touch cadence, HANDOFF): remaining §29 appendices (verifier
budget model, security/effects model, compatibility policy), fsl.lock / certificate-record /
interface-card / publish-manifest / advisory-feed schemas, hook-return slot (next tape-format
touch), 5.x snapshot-lift policy (era 4), seed-tree edit stability (F1), era-5 security review
(era-5 entry). Each is inventoried in `irreversibles.md` or the era briefs with its trigger.

## C. Migration twins (WP-8 jssm drain) — EXECUTED 2026-07-05 (Opus 4.8, John's "go")

> **Status:** **EXECUTED.** John approved (2026-07-04, defaults accepted) and gave the go
> (2026-07-05). **97 twins filed to StoneCypher/fsl as fsl#1419–#1515**, milestone-pinned,
> labelled `Created by AI`, umbrella-first; **99 jssm issues closed** with citation comments; the
> jssm tracker is drained to **7 open** (the KEEP set, which close via their own PRs). Full
> jssm→fsl map and three corrections are in the **Execution log** at the bottom of this file.
> The draft tables below are retained as the approved plan of record; the Execution log carries
> the filed numbers and the reality-corrections.
>
> *Original draft note (Increment 4): reconciled 106 open → 95 twins + 99 closes + 7 KEEP; two
> folds (jssm#623→#825 twin, jssm#621→#792 twin). Execution added two the draft had dropped
> (jssm#919, #666, both MIG in the approved ledger) and corrected two DONE?/count errors — see
> the Execution log.*

**Filing conventions (apply to every twin below):**
- Title = the original jssm title verbatim (so search/muscle-memory survives).
- Body opens `(was jssm#NNN)`, then the ledger's one-line intent, then a live back-link to the
  jssm original; label `Created by AI`; pin the stated milestone.
- **Umbrella-first ordering:** file the umbrella twins before their children so children can link
  parents. Umbrellas here: #846 (AI-distribution top), #832 (MCP), #847 (Skill), #857 (corpus),
  #619 (CLI), #793 (wc panel suite), #909 (state kinds). Each era umbrella (fsl#1401–#1411) is the
  grandparent by milestone.
- **SAT rows stay open, tagged `sat-pending`** until their satellite repo exists (only #865
  tree-sitter here) — the twin is filed but not closed-through.
- **Milestone/era note:** every `MIG-e1` twin defaults to **#50 (v7)**, the opening era-1 major.
  Flagged below where a later era-1 wave is likely (val→v9, portability→v10) — these are John-
  retag candidates, not blockers.

### C-#49 · v6 "The Ground" (e0) — 1 twin
| jssm# | Twin title (= original) | Notes |
|---|---|---|
| 922 | ci: decide whether push-only heavy jobs (…) gate to main-only | folds into WP-6 dragon-lane decision (Q3) |

### C-#50 · v7 "The Computing Machine" (e1) — 43 twins
*Umbrella twins:* **619** `fsl CLI: unified toolchain — tracking issue`; **793** `Track: <fsl-*> web-component panel suite`; **909** `State kinds: inventory and future vocabulary … (umbrella)`.

| jssm# | Twin title (= original) | Parent / note |
|---|---|---|
| 619 | fsl CLI: unified toolchain — tracking issue | CLI umbrella |
| 620 | fsl lint: linter subcommand for FSL source | child of 619-twin |
| 622 | *(see C-#55 — e3, test verb moves to v12)* | — |
| 624 | fsl typegen: emit TypeScript type declarations from FSL machines | child of 619-twin |
| 625 | fsl new: project scaffolder subcommand | child of 619-twin |
| 626 | fsl convert: format converter between FSL and other notations | child of 619-twin; note S3 (import/export partly shipped) |
| 627 | fsl playground: local web playground server | child of 619-twin |
| 628 | fsl mcp: Model Context Protocol server for AI agents | child of 619-twin; phased after verb surface stabilizes |
| 629 | fsl lsp: Language Server Protocol implementation | child of 619-twin |
| 630 | fsl REPL: interactive mode when invoked with no subcommand | child of 619-twin |
| 607 | Custom theme files: auto-load default.fsl_theme, invoke named themes via CLI | child of 619-twin |
| 793 | Track: <fsl-*> web-component panel suite | wc-panel umbrella |
| 897 | feat(wc): <fsl-workbench> dockable layout shell | child of 793-twin |
| 896 | feat(wc): editable extended-state data — <fsl-data-inspector> | child of 793-twin |
| 895 | feat(viz): bake a theme-derived legend into the rendered SVG | child of 793-twin |
| 894 | feat(wc): <fsl-timers> pending-timeout panel | child of 793-twin |
| 893 | feat(wc): <fsl-diagnostics> problems panel | child of 793-twin |
| 820 | feat(wc): load a theme from a URL parameter in the web version | child of 793-twin |
| 819 | fsl web replay shell: browser tape-replay over the M3 engine | child of 793-twin |
| 798 | Re-land pick / oracle / graph-highlighter (backed out in 5.145.2) | branches exist |
| 909 | State kinds: inventory and future vocabulary … (umbrella) | state-kinds umbrella; needs spec (omissions C) |
| 920 | perf: cm6-editor sketch runtime fixes | perf track |
| 874 | perf_backfill: harden c8g.medium + refill 5.45–5.65 gap | perf track |
| 720 | perf(machine): constructor cleanups | perf track |
| 719 | perf(transition): gate auto_set_state_timeout for no-'after' machines | perf track |
| 718 | perf(hooks): identity fast-path in _update_hook_fields | perf track |
| 717 | perf(parser): investigate peg$parseSubexp | perf track |
| 716 | perf(parser): first-char gate for ArrowDecoration probes | perf track |
| 715 | perf(parser): merge NonNegNumber alternatives | perf track |
| 714 | perf(parser): hand-rolled arrow-token scanner | perf track |
| 713 | perf(parser): two-pass expectation-free parsing | perf track |
| 712 | perf(transition): inline the validity/edge-lookup chain in transition_impl | perf track (biggest lever) |
| 825 | M1 (signed-run-receipts): check verb + verification certificates | **absorbs jssm#623** (fsl check = M1) |
| 826 | M2 (signed-run-receipts): keyless signing + transparency log + revocation | attempts e1, **may slip to #57 (v14)** — decided |
| 828 | M4 (signed-run-receipts): property evaluator | subset e1, full with P2 |
| 818 | Pin the surface grammar for proof constructs (§29 slice) | blocks the example corpus |
| 817 | Proof-by-example corpus: 100+ CI-verified FSL examples | user-flagged high value |
| 822 | Revisit the documentation surface inventory for v6 | bridge to help-bar manifest (omissions D7) |
| 792 | feat: FSL source formatter / pretty-printer (AST → FSL) | **absorbs jssm#621** (fsl fmt = this) |
| 756 | v6/val #3+#5: columnar val storage + undo-log journal | **John-retag candidate → #52 (v9)**; envelope first |
| 743 | Inline circular_buffer_js → zero runtime dependencies | — |
| 650 | chore(spec): extract FSL into its own repo + conformance testsuite | **John-retag candidate → #53 (v10)** (the contract's housing) |
| 790 | Download DeBERTa-v3 ONNX models → phantom-models branch | tag `deferred-until-pick`; activates with #798 re-land |

### C-#54 · v11 "The Composable Machine" (e2) — 4 twins
| jssm# | Twin title (= original) | Note |
|---|---|---|
| 690 | Observable support | revisit against §14 channels |
| 686 | feat(wc): SSR support (@lit-labs/ssr / Declarative Shadow DOM) | framework track (excluded from 793) |
| 685 | feat(wc): Angular hand-written wrapper directives + generated types | framework track |
| 684 | feat(wc): framework-wrapper generator pipeline (React/Vue/Svelte/Solid) | framework track |

### C-#55 · v12 "The Proven Machine" (e3) — 1 twin
| jssm# | Twin title (= original) | Note |
|---|---|---|
| 622 | fsl test: model-based testing framework for FSL machines | MBT / test verb |

### C-#56 · v13 "The Durable Machine" (e4) — 1 twin
| jssm# | Twin title (= original) | Note |
|---|---|---|
| 813 | v6 §15: full durable-execution posture (flight recorder, OTel, persistence) | era-4 anchor issue |

### C-#57 · v14 "The Trusted Machine" (e5) — 2 twins
| jssm# | Twin title (= original) | Note |
|---|---|---|
| 830 | M6 (signed-run-receipts): signed run-receipts — replayed slice (capstone) | trust capstone |
| 829 | M5 (signed-run-receipts): verify verb (trust chain) | — |

### C-#58 · v15 "The Ubiquitous Machine" (e6) — 1 twin
| jssm# | Twin title (= original) | Note |
|---|---|---|
| 815 | v6 §15/§26: cross-host byte-identical replay determinism conformance | fleet determinism |

### C-#59 · v16 "The Public Machine" (e7) — 42 twins
*Umbrella twins:* **846** `AI-ecosystem distribution: … MCP, Skill, and Agentfile channels` (top); **832** `MCP distribution: list … in every relevant MCP registry`; **847** `Skill distribution: publish + list an FSL/jssm skill`; **857** `Corpus & retrieval visibility: make FSL/jssm visible to the models themselves`.

| jssm# | Twin title (= original) | Parent / note |
|---|---|---|
| 846 | AI-ecosystem distribution: get FSL/jssm into MCP, Skill, and Agentfile channels | top distribution umbrella (child of v16 umbrella fsl#1411) |
| 832 | MCP distribution: list FSL/jssm in every relevant MCP registry | child of 846-twin |
| 831 | List jssm/FSL in the GitHub MCP registry (github.com/mcp) | child of 832-twin |
| 833 | List in the Official MCP Registry (registry.modelcontextprotocol.io) | child of 832-twin |
| 834 | List in the Claude connectors / MCP directory (Anthropic) | child of 832-twin |
| 835 | List on Smithery (smithery.ai) | child of 832-twin |
| 836 | List on Glama (glama.ai/mcp/servers) | child of 832-twin |
| 837 | List on PulseMCP (pulsemcp.com) | child of 832-twin |
| 838 | List on mcp.so | child of 832-twin |
| 839 | List in the Docker MCP Catalog | child of 832-twin |
| 840 | List in the Cline MCP Marketplace | child of 832-twin |
| 841 | List in the Cursor MCP directory | child of 832-twin |
| 842 | List in Continue (MCP) | child of 832-twin |
| 843 | List in Zed (MCP / context servers) | child of 832-twin |
| 844 | Add to modelcontextprotocol/servers (official community list) | child of 832-twin |
| 845 | Add to punkpeye/awesome-mcp-servers | child of 832-twin |
| 847 | Skill distribution: publish + list an FSL/jssm skill | child of 846-twin (skill umbrella) |
| 848 | Publish the FSL skill via a Claude Code plugin marketplace | child of 847-twin |
| 849 | List the FSL skill on Smithery / mcp.so (skill listings) | child of 847-twin |
| 850 | Add the FSL skill to awesome-claude-skills | child of 847-twin |
| 851 | Add the FSL skill/plugin to awesome-claude-code | child of 847-twin |
| 852 | Contribute an FSL skill example to anthropics/skills | child of 847-twin |
| 853 | Agentfile distribution (speculative): package FSL as a portable agent | child of 846-twin (agentfile family) |
| 854 | Publish an FSL agent as a Letta Agent File (.af) | child of 846-twin |
| 855 | Publish an FSL agent via Docker cagent / Agentfile | child of 846-twin |
| 856 | Add an AGENTS.md to the repo (agent-convention compliance) | child of 846-twin; cheap — may just do in era 0 |
| 857 | Corpus & retrieval visibility: make FSL/jssm visible to the models themselves | child of 846-twin (corpus umbrella) |
| 858 | Add llms.txt + llms-full.txt to fsl.tools | child of 857-twin |
| 859 | Submit jssm/FSL docs to Context7 and DeepWiki | child of 857-twin |
| 860 | Publish a canonical "FSL for LLMs" reference | child of 857-twin |
| 861 | Publish the verified proof-example corpus as LLM training/RAG material | child of 857-twin (pairs jssm#817) |
| 862 | Set crawler posture: robots.txt + sitemap for LLM crawlers | child of 857-twin |
| 863 | Publish an "FSL Assistant" Custom GPT / Gemini Gem / Claude Project | child of 846-twin |
| 864 | Agent-framework tool integrations (LangChain / LlamaIndex / Vercel AI SDK) | child of 846-twin |
| 865 | Ship a tree-sitter-fsl grammar | **SAT** — grammars ship from satellite repo; twin tagged `sat-pending` |
| 866 | Seed a Reddit training surface for FSL/jssm | child of 846-twin |
| 867 | Seed canonical Stack Overflow Q&A for FSL/jssm | child of 846-twin |
| 868 | Publish articles + a Wikipedia mention for FSL/jssm | child of 846-twin |
| 869 | Package-registry richness: npm keywords, JSR, schema.org JSON-LD | child of 846-twin |
| 870 | Build a Reddit (Devvit) app for FSL state machines + graph rendering | **jssm#871 is a dup — closes to #870, no twin** |
| 778 | RFC: machines.txt — publish a site's state machines (+ package-manifest block) | pairs jssm#610 |
| 610 | Expose FSL state machines through package.json — design spec request | pairs jssm#778 |

## D. Close batches (WP-8 jssm drain) — DRAFTED 2026-07-04, AWAITING JOHN'S BATCH APPROVAL

> Executed only after the matching §C twins are filed (so each close cites a LIVE fsl number).
> Format John approves; execution is mechanical. **95 twins → 97 migrate-closes** (the two folded
> originals included) **+ 1 dup-close + 1 DONE?-close = 99 jssm closes.**

**D1 · Migration closes (97).** For every §C row, close the jssm original with:
`Migrated to StoneCypher/fsl#NNN (was jssm#<this>). jssm tracker kept empty per policy (npm search-ranking signal); all issues now live on StoneCypher/fsl.`
Plus the two folded originals:
- **jssm#623** → close citing the M1-check twin (fsl twin of #825): "Folded into the `fsl check` = M1 work — migrated as StoneCypher/fsl#NNN."
- **jssm#621** → close citing the formatter twin (fsl twin of #792): "Folded into the FSL formatter/pretty-printer — migrated as StoneCypher/fsl#NNN."

**D2 · Duplicate close (1).**
- **jssm#871** → `Duplicate of jssm#870 (identical Devvit app request); #870 is migrating to StoneCypher/fsl#NNN.`

**D3 · DONE?-verified close (1) — needs code verification FIRST (queue step 3).**
- **jssm#631** `fsl CLI: unified JSON configuration file` — ledger says shipped (loader + render integration). Verify against code, then close citing the shipping commit/PR; if verification fails, downgrade to a #619-twin child instead of closing.

**D4 · KEEP — NOT closed in this batch (7).** These close via their own named PRs (cross-repo
`closes StoneCypher/fsl#N` where a twin exists), not the drain:
- **jssm#921** (drop dist/deno) — 6.0 assembly PR
- **jssm#827** (M3 run verb, implemented on v6) — the One Merge PR
- **jssm#759 / #758 / #757 / #755** (val bug tail) — the val-fix PRs (WP-2 / WP-10)
- **jssm#754** (atom charset restriction) — the 6.0 breakage-batch PR (WP-5)

**Open questions for John (batched; none block the mechanical filing — all have safe defaults):**
1. Milestone retags: move **#756** columnar-vals to **v9 (#52)** and **#650** FSL-repo-extract to
   **v10 (#53)** now, or keep both at v7 (#50) and retag when era 1 subdivides? (Default: keep at
   #50, note the intent.)
2. **#826** M2 signing is tagged e1 but "slips to e5 (v14)" per the ledger — file at v7 (#50) or
   straight to v14 (#57)? (Default: #50, note the slip.)
3. Confirm the AI-distribution umbrella structure (846 → 832/847/857 + families) rather than one
   flat era-7 list; this is the only place I imposed hierarchy the ledger only implied.

## Execution log — WP-8 jssm drain (2026-07-05, Opus 4.8)

**Result:** jssm tracker drained from 106 open to **7 open** (the KEEP set). **97 fsl twins filed**
(fsl#1419–#1515), milestone-pinned, `Created by AI`, umbrella-first (parents before children so
child bodies link the parent fsl#). **99 jssm issues closed** as `not planned` with a citation
comment naming the live fsl twin (dup #871 cites #870). Executed via a resumable state-file script
(scratchpad, not committed); the durable record is this map.

**Corrections (reality vs the approved ledger — reality won):**
1. **jssm#631 was NOT done.** The drain ledger marked it `DONE?` ("CLI config shipped"). Code
   verification refuted it — no CLI config loader anywhere in `src` (no `loadConfig`/`fsl.config`/
   `.fslrc`; no `fsl` CLI source at all), only mentions in `todo.md`/`CHANGELOG.long.md`. So it was
   **migrated OPEN** as fsl#1514 (v7, child of the CLI umbrella #1420), not closed as complete.
2. **jssm#790 was dropped from the drafter's §C arrays** (the count still summed to 106 by an
   offsetting miscount). Caught by reconciling the live tracker after the batch: 8 remained, not 7.
   Migrated as fsl#1515 (v7, deferred-until-pick, tied to #798→fsl#1456) and closed.
3. **jssm#919 (+ #666) were absent from the draft §C** though both are `MIG` in the approved
   ledger; restored and filed (fsl#1511, fsl#1438). jssm#919 was already closed live (fence
   rendering shipped 5.158.0), so its twin was still filed and a migration comment was posted to
   the closed original by hand (gh skips the comment when closing an already-closed issue).

**Milestone/era open-Qs:** kept all defaults (John accepted defaults) — #756 and #650 filed at v7
(retag candidates for v9/v10), #826 filed at v7 (noted "may slip to v14"). AI-distribution
hierarchy (846→832/847/857+families) filed as drafted.

**jssm → fsl twin map (97):**

```
jssm#607=fsl#1426  jssm#610=fsl#1427  jssm#619=fsl#1420  jssm#620=fsl#1428  jssm#622=fsl#1429
jssm#624=fsl#1430  jssm#625=fsl#1431  jssm#626=fsl#1432  jssm#627=fsl#1433  jssm#628=fsl#1434
jssm#629=fsl#1435  jssm#630=fsl#1436  jssm#631=fsl#1514  jssm#650=fsl#1437  jssm#666=fsl#1438
jssm#684=fsl#1439  jssm#685=fsl#1440  jssm#686=fsl#1441  jssm#690=fsl#1442  jssm#712=fsl#1443
jssm#713=fsl#1444  jssm#714=fsl#1445  jssm#715=fsl#1446  jssm#716=fsl#1447  jssm#717=fsl#1448
jssm#718=fsl#1449  jssm#719=fsl#1450  jssm#720=fsl#1451  jssm#743=fsl#1452  jssm#756=fsl#1453
jssm#778=fsl#1454  jssm#790=fsl#1515  jssm#792=fsl#1455  jssm#793=fsl#1421  jssm#798=fsl#1456
jssm#813=fsl#1457  jssm#815=fsl#1458  jssm#817=fsl#1459  jssm#818=fsl#1460  jssm#819=fsl#1461
jssm#820=fsl#1462  jssm#822=fsl#1463  jssm#825=fsl#1464  jssm#826=fsl#1465  jssm#828=fsl#1466
jssm#829=fsl#1467  jssm#830=fsl#1468  jssm#831=fsl#1469  jssm#832=fsl#1423  jssm#833=fsl#1470
jssm#834=fsl#1471  jssm#835=fsl#1472  jssm#836=fsl#1473  jssm#837=fsl#1474  jssm#838=fsl#1475
jssm#839=fsl#1476  jssm#840=fsl#1477  jssm#841=fsl#1478  jssm#842=fsl#1479  jssm#843=fsl#1480
jssm#844=fsl#1481  jssm#845=fsl#1482  jssm#846=fsl#1419  jssm#847=fsl#1424  jssm#848=fsl#1483
jssm#849=fsl#1484  jssm#850=fsl#1485  jssm#851=fsl#1486  jssm#852=fsl#1487  jssm#853=fsl#1488
jssm#854=fsl#1489  jssm#855=fsl#1490  jssm#856=fsl#1491  jssm#857=fsl#1425  jssm#858=fsl#1492
jssm#859=fsl#1493  jssm#860=fsl#1494  jssm#861=fsl#1495  jssm#862=fsl#1496  jssm#863=fsl#1497
jssm#864=fsl#1498  jssm#865=fsl#1499  jssm#866=fsl#1500  jssm#867=fsl#1501  jssm#868=fsl#1502
jssm#869=fsl#1503  jssm#870=fsl#1504  jssm#874=fsl#1505  jssm#893=fsl#1506  jssm#894=fsl#1507
jssm#895=fsl#1508  jssm#896=fsl#1509  jssm#897=fsl#1510  jssm#909=fsl#1422  jssm#919=fsl#1511
jssm#920=fsl#1512  jssm#922=fsl#1513
```

Folds (no own twin): jssm#623 → fsl#1464 (M1 check twin) · jssm#621 → fsl#1455 (formatter twin).
Dup: jssm#871 → cites jssm#870 (fsl#1504). KEEP still open on jssm (close via own PRs):
#921, #827, #759, #758, #757, #755, #754.
