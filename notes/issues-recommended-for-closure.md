# Open Issues Recommended for Closure (Review Before Acting)

Compiled 2026-05-12 from `fsl-issues.json` against the `StoneCypher/fsl` issue tracker. Repo: `https://github.com/StoneCypher/fsl/issues/<number>`.

**Conservative bias:** when uncertain, listed as borderline rather than recommended-close. The list is grouped by reason for closure, with strongest cases first.

---

## Tier 1 — Dead platforms / tools (high-confidence close)

These target platforms that have been discontinued, abandoned, or are visibly dormant.

| Issue | Title | Why close |
|---|---|---|
| **#9** | Atom Package Manager | Atom deprecated by GitHub Dec 2022; archived. |
| **#16** | Get into Atom | Same; Atom discontinued. |
| **#13** | Add FSL to Brackets | Adobe Brackets project ended Sept 2021; archived. |
| **#6** | CodeFlask | Tiny code editor; project dormant since 2020. |
| **#29** | Add FSL to Google Code Prettify | Google abandoned the project in 2014; not officially maintained. |
| **#36** | Add FSL to sunlight.js | sunlight.js is dead; last release 2013. |
| **#38** | Add FSL to Rainbows | Dormant since 2015. |
| **#19** | Get FSL into Slate (ruby docgen) | Slate (the ruby docgen, not the slack tool) has been minimally maintained; better doc tools exist now. |
| **#37** | Add FSL to GeSHI (php) | GeSHi is in archive state; replaced by other PHP highlighters. |
| **#39** | Add FSL to Crayon (php, jquery) | Dormant since 2017. |
| **#28** | Get listed on ToHTML | Service appears defunct. |
| **#21** *(same)* | Get listed on ToHTML duplicate | If both exist, close one. |
| **#4** | Instructure Design editor | Niche LMS editor; no clear ongoing work. |

## Tier 2 — Placeholder / lol items (clear close)

The titles themselves signal these aren't actionable.

| Issue | Title | Why close |
|---|---|---|
| **#65** | lol just try to keep the kitchen sink up to date | Self-described as "lol"; meta-todo with no actionable scope. |
| **#66** | one of the tests should honestly be a chess game being played through | Humor item; not an actionable feature. |
| **#26** | lol maybe get FSL into GNU source-highlight | "lol maybe" + GNU source-highlight is barely maintained. |
| **#27** | lol maybe shjs | Same shape; shjs is unmaintained. |
| **#147** | Cover image | Two-word title; no scope. |
| **#155** | consider the `.gallery` tld | Speculative; no follow-up. |
| **#469** | Help panel topics | Placeholder umbrella with no contents. |

## Tier 3 — Clear duplicates with later/more-concrete versions

Both members of the pair are open. The recommendation is to close the older / vaguer one and keep the newer / more concrete one.

| Older (close) | Newer (keep) | Concept |
|---|---|---|
| **#56** Cycles | **#400** Cycles | Cycle notation — same feature, two issues |
| **#57** Stripes | **#401** Stripes | Stripe notation — same feature, two issues |
| **#14** Maybe a TreeSitter grammar? | **#594** Add a tree-sitter grammar | TreeSitter — duplicate, #14 is speculative wording |
| **#160** Embedding machines in other machines | **#235** Embeddable machine fragments | Embedding — same concept; #235 is more specific |

(Verify the two members of each pair really say the same thing before closing — these are matched on title-keyword only.)

## Tier 4 — Likely obsolete due to recent project work

These were filed before recent work that probably resolved them. Worth a quick verification before closing.

| Issue | Title | Why probably obsolete |
|---|---|---|
| **#998** | Viz needs real tests | The jssm-viz merge added smoke-test suites (`viz_dot.spec.ts`, `viz_svg_string.spec.ts`, `viz_svg_element.spec.ts`). Verify coverage is sufficient, then close. |
| **#119** | Make sure everything in spec is in PEG | `notes/fsl-grammar-reference.md` now exists and explicitly cross-references every PEG rule. Probably done; verify. |
| **#120** | Spec is the new source of truth on what is actually in the language | Same — the grammar-reference doc serves this role now. |
| **#279** | Apparently named lists parse. Implement and test their use | NamedList is in active use as fan-out target. Partial done; might be worth re-scoping rather than closing outright. |
| **#176** | Mechanism to control background color of graphs | `graph_bg_color` machine attribute exists. Likely done — verify. |
| **#369** | Update corner support in jssm-viz | Verify whether corners are now functionally supported through `corners: rounded\|lined\|regular`. |

## Tier 5 — Highlighter-specific speculation against unclear targets

Many of these targeted highlighter integrations that have unclear status today. Each is "speculative outreach to a code-highlighting library that may or may not be alive." Best closed as a batch with a note that the strategy now goes through Tree-sitter (#594) and TextMate (#32) which together cover most modern editors.

| Issue | Title |
|---|---|
| #5 | Prism.js |
| #11 | Add FSL to highlight.js |
| #12 | Add FSL to CodeMirror |
| #17 | Get FSL into Rouge (ruby) |
| #18 | Get FSL into Pygments (python) |
| #77 | Support Microsoft Monarch |

These are *not all dead* — Prism, highlight.js, CodeMirror, Rouge, Pygments are alive. But the strategy has changed: per the TextMate-grammar TODO item (which can feed Pygments / Rouge / Prism via converters), individual outreach for each is no longer the right shape. Recommend closing with a note pointing at the strategic shift, OR converting to a single umbrella issue "ship via TextMate grammar; downstream highlighter coverage follows."

## Tier 6 — Single-line speculative examples

Each is "this would be a cool example machine to build" — but they're listed as feature issues rather than under a single "example machines wanted" umbrella, and have been open for years without action. Probably close and recreate under a single umbrella with a clearer process.

| Issue | Title |
|---|---|
| #44 | Oil cracking SL |
| #43 | DRAKON style chart animations |
| #46 | Fault Trees and Fault Tree Analysis |
| #249 | Cooking examples |
| #252 | Holiday machines |
| #281 | oh man let's clean up XKCD |
| #499 | Unweighted and gender weighted family trees |
| #502 | Unprisoning your Think Rhino |
| #518 | NSA hiring flowchart |
| #877 | Oof. A practical SCSI state machine example? |
| #878 | Microsoft bounds drivers with state machines |
| #879 | USB Device State from Oracle's Solaris docs |

(Cluster total: ~12 issues. Replace with one umbrella "example-machine queue" or move into a `notes/example-machine-queue.md` file outside the tracker.)

## Tier 7 — Borderline (NOT recommending close; flag for review)

Listing these so you can decide; I'm not confident enough to recommend closure either way.

| Issue | Title | Why borderline |
|---|---|---|
| #62 | Random walks | Adjacent to recent stochastic items (#1244–#1248); possibly subsumed but verify before closing. |
| #80 | Support WebView in VS Code | The VS Code-extension-via-LSP plan partially addresses this; the WebView angle specifically may still be wanted. |
| #146 | Microsoft LSPs for TypeScript | The LSP server item in the TODO addresses the general LSP angle; the TypeScript-specific framing here might be redundant or might be distinct. |
| #157 | track down all assets | Project-org task; may or may not still be relevant. |
| #163 | poster printing service for fsl diagrams | Aspirational; been open a long time; may not be worth tracking. |
| #167 | set up for tree shakeability | Build infrastructure; may already be partially done with the recent ES6 build target work. |
| #232 | Put FSL, JSSM on gh actions | Some GH-action work has happened; may be partially done. |
| #233 | Gh commit render action | Adjacent to existing jssm-viz-action; may be redundant. |
| #277 | Performance test the site (artillery and gimbal, or tsung, or jmeter) | Old benchmark-tooling speculation; the modern equivalents would be different. |
| #318 | Use dependency tree to find stray issues | Meta-task; possibly outlived its usefulness. |
| #357 | edge_color shouldn't be underscore if the rest are dash | Naming-consistency micro-fix; verify whether it was already addressed. |
| #365 | graph_explorer needs a favicon | Likely-trivial; verify state. |
| #381 | Finish centralizing, canonizing, and unanimizing all the written material onto fsl.tools | The cookbook + fsl.tools site work *is* this; verify if the issue framing is still apt. |
| #393 | Reduce the size of the parser | Open question whether the recent peg / swc-jest changes affected this. |
| #587 | Prior compile for parser constants | Niche perf opt; verify whether still relevant. |
| #611 | Set up trace tests for future releases | Infrastructure; may or may not have happened. |
| #654 | Differential benching in Benny | Benny is in the project; differential benching might be done or not. |
| #847 | Set up a Starter Workflow | GitHub Starter Workflows; verify state. |

## Tier 8 — Pinned umbrellas (keep open as organization tools)

These are explicitly labeled `[List issues]` and serve as umbrellas grouping multiple related items. **Do not close** — they're organizational fixtures, not standalone features.

Sample (not exhaustive):

- #310 Make a Youtube formal course
- #319, #320, #321, #322 Visual improvements umbrellas
- #399 Make jssm easier to contribute to
- #444 Enforcements for start states
- #463 FSL needs a linter
- #465 Stochastic testing in general
- #466 Editor quality of life improvements
- #467 Apps
- #468 New language concepts and features
- #471 README improvements
- #473 Other sites
- #477 Tutorial material
- #478 Outsider tutorial content
- #479 General visual improvements
- #480 Package quality issues
- #481 Highlighter stuff
- #482 On the ending of machines
- #484 There was interesting stuff at StateSoft
- #485 Probabilities, probabilistics, and stochastics
- #490 Top level topics
- #585+ many minifier sub-items under one strategy
- #588 The machine should expose more constants and lists
- #699 Fluent hooking API
- #735 Novel hooks
- #752 Better error object
- #772 Let's write some docs!
- #811 Improve the documentation
- #835/836/837 Sidebar Tutorials series
- #849 Currently known needed example machines
- #855–#857 State Machines for X
- #863 Automatically update jssm dependencies
- #881 Bring other discord webhooks online
- #928 Return from hooks complex returns umbrella
- #1070 Future serialize and deserialize
- #1073 Linting stuff
- #1074 Visual bugs
- #1075 Example machines remaining outstanding
- #1076 Site stuff needed
- #1077 Documentation topics
- #1078 Future testing topics
- #1079 Typescript nuclear future
- #1080 CDN stuff
- #1081 Editor quality of life topics
- #1082 Upcoming language conveniences
- #1083 Outstanding automation tasks
- #1084 Outstanding bugs
- #1103 Stuff that needs to be done for future repos
- #1104 Future posthooks work
- #1105 Basic hooks, #1106 Future hooks
- #1109 Basic hooks in grammar
- #1127 Feature presentation pattern
- #1128 State machine pattern catalogue
- #1166 Version 6: poly-type template
- #1169 Universal character set test
- #1170 Theme creation tool in-editor
- #1171 Add a style layer on the machine
- #1199 Unicode rampage
- #1208 Template starting points
- #1216 make a page listing other tools and integrations
- #1303 Task list for `.set_data`

---

## Summary counts

| Tier | Action | Count |
|---|---|---|
| Tier 1 — Dead platforms | Recommend close | 13 |
| Tier 2 — Placeholder/lol | Recommend close | 7 |
| Tier 3 — Clear duplicates | Recommend close (close older) | 4 pairs (4 closures) |
| Tier 4 — Obsolete due to recent work | Recommend close after verification | 6 |
| Tier 5 — Highlighter speculation | Recommend close as a batch, replace with umbrella | 6 |
| Tier 6 — Example-machine speculation | Recommend close, replace with file/umbrella | 12 |
| **Total recommended for closure** | | **~48 issues** |
| Tier 7 — Borderline | Flagged for review, no recommendation | 18 |
| Tier 8 — Umbrellas | Keep open | ~50 listed |

That's roughly **6.5% of the open issue count** as confident-close-candidates, plus another 2.4% as borderline-needs-verification. Modest but real cleanup signal.

## Suggested workflow for actually closing

When you do close, suggested message templates:

- **Tier 1 (dead platforms):** "Closing — `[platform name]` is no longer maintained / has been deprecated. Reopen if a successor target emerges."
- **Tier 2 (placeholder):** "Closing — speculative placeholder with no actionable scope. Concrete proposals welcome as new issues."
- **Tier 3 (duplicate):** "Closing as duplicate of #[other]. Continuing discussion there."
- **Tier 4 (obsolete due to recent work):** Verify the recent work covers it; if so, link the PR/commit in the closing message.
- **Tier 5 (highlighter strategy shift):** "Closing — highlighter coverage now flows through TextMate grammar (#32) and Tree-sitter (#594) rather than per-tool integrations. Reopen if a target needs custom work outside that pipeline."
- **Tier 6 (example-machine queue):** Move to `notes/example-machine-queue.md` (or similar) and reference that location in the closing message.

Double-check each closure against the actual issue body before acting — some titles I categorized may have nuance in the body that flips the recommendation.
