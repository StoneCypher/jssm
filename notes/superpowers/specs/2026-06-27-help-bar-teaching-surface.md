# Help-bar IA + teaching-surface coverage manifest

| | |
|---|---|
| **Status** | Design — language surface specced; surfaces 2–7 deferred pending [jssm#822](https://github.com/StoneCypher/jssm/issues/822) |
| **Branch** | `docs_26-06-27_help-sidebar-grammar-ref` |
| **Date** | 2026-06-27 |
| **Related** | `notes/fsl-grammar-reference.md`; #817 / #818 (proof corpus + grammar pinning); #650 (FSL spec extraction); `v6_breaking_changes.json` |

## 1. Goal

Build a help-bar (docs sidebar, hosted in the CM6 editor) whose tutorial content is
*provably complete* against everything a user can learn — and stays complete as the
language and APIs evolve. "Complete" means the **curated, non-deprecated teaching
surface** (what a user wants to learn), not the raw grammar surface (everything that
parses). The deprecated/internal/edge-meaningless productions are deliberately excluded.

The mechanism is a machine-readable **teaching-surface manifest** plus CI checks, so
"is X covered?" is a diff against ground truth, not a human judgment that rots silently.
This is the same discipline as `verify_version_bump` gating releases.

The motivating failure mode is real and recent: the grammar reference described
`validation: {}` / `action: {}` config blocks that StoneCypher/fsl#1366 had *removed*.
A tutorial can be "complete" yet teach a construct the language no longer has. Coverage
has two directions — *did I mention everything?* and *is everything I mention still true?*
— and both must be checked.

## 2. Help-bar information architecture

Six top-level sections, each with sub-pages. Crucially they are **not** all the same kind:

| Section | Kind | Gates coverage? | Notes |
|---|---|---|---|
| Getting Started | authored | yes | onboarding; weaves language + API |
| About State Machines | authored | **no** | FSM theory (Mealy/Moore, determinism); pedagogy, not feature coverage |
| Tutorials | authored | yes | primary coverage target |
| Example Machines | oracle | no | rendered from the cookbook / proof-corpus (#817); a usefulness-filtered oracle |
| Index | generated | no | derived from the manifest + page index-terms; never authored |
| Search | generated | no | indexes rendered pages |

The `kind` field is what keeps checks honest: the coverage checker walks only `authored`
sections with `gatesCoverage: true`. About-FSM is authored but ungated. Index/Search are
generated, so they can never go stale.

## 3. Surface model

jssm is not one surface. "Covers the whole thing" must mean **per-surface** coverage,
each surface partition-checked against its own ground-truth artifact.

**Discriminator.** A thing is a first-class **surface** iff
(a) a user crosses an interface boundary to it (supplies input or consumes output), **and**
(b) it has an independently-enumerable contract we can census.
Fail (b) → it's an `area` (authored coverage only, no partition check).
Mere repackaging of another surface's contract → **delivery channel**, out of scope.

### v5 surface inventory (pending re-confirmation for v6 — #822)

| # | Surface | Ground truth (extractor source) | Class |
|---|---|---|---|
| 1 | **FSL language** | `src/ts/fsl_parser.peg` | first-class (specced below) |
| 2 | Core API | `.d.ts` / TypeDoc over the 7 `docs`-script entry points | first-class (deferred) |
| 3 | Visualization API (`./viz`) | `jssm_viz.ts` | first-class or area (deferred) |
| 4 | CLI (`fsl`/`jssm`/`fsl-render`/`fsl-export-system-prompt`) | `src/ts/cli` dispatcher + subcommands | first-class (deferred) |
| 5 | Web components (`fsl-*` panel suite) | `custom-elements.json` (CEM manifest) | first-class (deferred) |
| 6 | Editor / CodeMirror-6 package (`./cm6`) | `cm6/fsl_language.ts` exports + language config | first-class (deferred) |
| 7 | FSL-for-LLMs system prompt | `fsl-export-system-prompt` output artifact | first-class (deferred) |

**Areas** (tagged, not separately partition-checked): render output formats
(dot/svg/png/jpeg/html), hooks contract, serialization/AST/machine-JSON (note `ajv` is a
dep — there may be a JSON schema to extract), theming, events.

**Delivery channels** (out of scope): CDN bundles, Deno build, es5/es6/iife variants,
minified outputs.

> Surfaces 2–7 extractors are intentionally **not** specced here. #822 must re-enumerate
> the surface list against v6 milestone scope first (the expression language extends #1's
> grammar; run/verify verbs add API+CLI surface; `fsl-*` canonicalization removes the
> deprecated `jssm-*` synonyms from #5; the LLM prompt #7 is being rewritten). Designing
> their extractors now would bake in a v5-pinned inventory that is about to move.

## 4. Manifest schema

One authored manifest, `surface`-discriminated. Schema is stable across all surfaces;
only the extractor that seeds the universe and the `referenceAnchor` target differ.

```ts
/** One curated teaching feature. Per surface, the set of these is DERIVED from that
 *  surface's ground truth (e.g. fsl_parser.peg) — every rule/symbol must be claimed by
 *  exactly one feature (a partition), or the build fails. Hand-edited; completeness
 *  machine-checked. One feature may own MANY grammar rules (teaching-shaped, not
 *  parse-shaped): `transition` owns Exp + Subexp + the arrow terminals. */
interface TeachingFeature {
  id:        string;                 // stable slug, "timed-transition"
  surface:   'language' | 'api' | 'viz' | 'cli' | 'webcomponent' | 'editor' | 'llm-prompt';
  title:     string;

  grammar:   { rules: string[]; terminals: string[]; };  // join back to the ground truth

  tier:      'core' | 'intermediate' | 'advanced' | 'exclude';
  exclude?: {                        // iff tier === 'exclude'
    reason:  'deprecated' | 'removed' | 'internal' | 'edge-meaningless' | 'alias';
    aliasOf?: string;                // feature id, when reason === 'alias'
    forbidInTutorial: boolean;       // deprecated/removed → tutorial must NOT use it
    note?:   string;
  };

  dependsOn:  string[];              // prerequisite feature ids → ordering DAG
  indexTerms: string[];
  canonicalExample?: string;         // Example-Machines page id → "learn it"
  referenceAnchor?:  string;         // §anchor in the surface's reference doc → "look it up"
  footguns?:  Footgun[];

  since?: string; deprecatedIn?: string; removedIn?: string;
}

interface Footgun {
  id:         string;                // "after-unit-seconds" — Index-addressable
  summary:    string;                // "after N defaults to seconds, not ms"
  indexTerms: string[];
}
```

**Tier ↔ treatment contract** (enforced against computed coverage, see §6):

| tier | required treatment somewhere |
|---|---|
| core | at least one `prose` **and** one `example` |
| intermediate | at least one `example` |
| advanced | at least one `mention` (a `referenceAnchor` link counts) |
| exclude | coverage must be **empty**; if `forbidInTutorial`, no page may even `mention` it |

## 5. Coverage source — pages, not the manifest

`taughtAt` is **derived**, never authored, to avoid two-file drift. The page is the single
source of truth for "what do I teach"; the build computes coverage by scanning pages.

```ts
/** Page front-matter — the SOURCE of coverage. Authors edit here only. */
interface HelpPageFront {
  id:       string;                  // "tut-time" (joins to nav + CoverageRow.page)
  section:  string;                  // "tutorials"
  title:    string;
  order:    number;
  teaches?:  string[];               // feature ids → credits 'prose'
  mentions?: string[];               // feature ids → credits 'mention'
  indexTerms?: string[];             // page-level search terms (incl. About-FSM concepts)
}
```

**Tagged code fence** convention — one tag does triple duty (doctest + example-credit +
Example-Machines render):

    ```fsl {teaches: timed-transition, run: true}
    a 'go' -> b;
    after 5 -> c;
    ```

A fence tagged `teaches: <id>` credits `example`-level treatment for that feature **and**
is extracted/executed as a doctest (the existing `@example` machinery is the model). This
is what would have caught the whargarbl removal: a fence using `validation: {}` would fail
to parse the moment fsl#1366 landed.

```ts
/** COMPUTED by the build — never authored. The coverage join. */
interface CoverageRow {
  feature:   string;
  surface:   TeachingFeature['surface'];
  tier:      TeachingFeature['tier'];
  taughtAt:  { page: string; treatment: 'prose' | 'example' | 'mention' }[];
  satisfied: boolean;
  violations: string[];
}
```

## 6. The four checks

Run per surface (each surface partitions independently):

1. **Classification completeness** — extract every named rule from the surface's ground
   truth; assert each rule is claimed by exactly one `TeachingFeature.grammar.rules` (a
   partition). The partition unit is the **rule set** (167 for the language surface);
   terminals are owned transitively by the rule that introduces them, so `grammar.terminals`
   lists are illustrative / Index fodder / terminal-level `exclude` markers (check 3), not
   the partition unit. Unclassified rule → fail. (New grammar rule → unclassified → build
   breaks; this is what keeps the curated set from silently falling behind the language.)
2. **Tier ↔ treatment** — compute `taughtAt` from page front-matter + tagged fences;
   assert the per-tier contract in §4.
3. **No-stale** — no page may `teach`/`mention`/tag a feature whose
   `exclude.forbidInTutorial` is true, nor use any terminal listed as forbidden
   (terminal-granular, e.g. `edge_color`).
4. **Dependency order** — `dependsOn` is a DAG; in the linear tutorial ordering (nav
   `order`), every prerequisite's page precedes its dependents'.

## 7. Language surface (fully specced)

### 7.1 Census

A throwaway extractor (`build/peg_census.cjs`, gitignored) lexes `fsl_parser.peg`,
stripping comments, char-classes, and `{…}` semantic actions so JS strings inside actions
are not counted as terminals. Result (verified 2026-06-27):

```
167 named rules · 498 keyword terminals · 88 symbol terminals · 50 display labels (excluded)
```

### 7.2 The enumeration collapse

The raw counts are large but **shallow**: ~480 of ~500 keyword terminals are four
enumerations plus one arrow-synonym family, each collapsing to a single teaching feature
(the "one feature, many rules" rule). The maintainable manifest is **~40 rows**, not ~600.

| Cluster | ~terminals | Rules absorbed | → feature | tier |
|---|---|---|---|---|
| SVG color names (both cases) | ~294 | `Color`,`SvgColor`,`SvgColorLabel`,`Rgb*`,`Rgba*` | **Colors** | intermediate |
| Graphviz shapes | ~55 | `GvizShape` | **State shape** | advanced |
| Math/number constants (π,φ,ε,Infinity,NaN…) | ~35 | `JsNumericLiteral`,`NonNegNumber`,`ArrowProbability` | **Weighted/probabilistic arrows** | advanced |
| Time-unit spellings (ms…weeks) | ~30 | `TimeType`,`ArrowAfter` | **Timed transitions** (+footgun) | intermediate |
| Arrow glyphs (`->`,`=>`,`~>`,`<->`,→↔⇒…) | ~40 sym | ~25 `*Arrow*` rules | **Transitions** (+ arrow flavors) | core / advanced |
| License names | ~10 | `MachineLicense` | folds into **machine_license** | intermediate |
| Themes / line-styles / corners / directions / booleans | ~25 | `Theme`,`LineStyle`,`Corners`,`Direction`,`Boolean` | 4–5 small features | mixed |

Remainder splits cleanly:

- **~40 lexical/internal rules** (`Char`, `Escape`, `*Digit`, `WS`, `EOF`, `QuoteMark`,
  the `Js*` numeric ladder, `AtomLetter`, `ActionLabelChar`…) → all
  `tier: exclude, reason: internal`. Zero teaching rows; they exist only to satisfy the
  partition check.
- **~30–35 genuinely teachable structural features** — Document structure, Comments,
  Transitions, Labels & quoting, State declarations, State styling, Groups/named-lists,
  Boundary hooks, Machine attributes, Typed properties, `fsl_version`/SemVer, Config
  blocks, Single-value configs, Arrange/layout hints, URLs.

### 7.3 Curation calls (language) — DECIDED 2026-06-27

1. **Color case** — both `AliceBlue` and `aliceblue` parse. **`AliceBlue` (PascalCase) is
   canonical and taught.** The lowercase form is folded into the single **Colors** feature
   as an accepted-but-non-canonical input (a note on the feature, not a separate row); both
   cases are rule-claimed by `SvgColor`/`SvgColorLabel`, so no alias row is needed.
2. **Unicode glyphs** — `→ ⇒ φ π` etc. are **taught**, at `advanced` tier ("you *may* use
   Unicode arrows/constants"). They are not hidden aliases; their rules belong to the
   Transitions / Weighted-arrows features.

### 7.4 Known deprecated/removed (seed the exclude entries)

- `edge_color` — alias of `edge-color` → `exclude: { reason: 'alias', forbidInTutorial: true }`.
- `validation: {}` / `action: {}` / whargarbl `TransitionItem` — removed in fsl#1366 →
  `exclude: { reason: 'removed', removedIn: '5.147.3', forbidInTutorial: true }`.

## 8. File locations

- **This spec** — `notes/superpowers/specs/` (durable; `npm run clean` removes `docs/`, not `notes/`).
- **Manifest data** — `src/data/teaching-surface.json` (tracked source; hand-curated,
  completeness machine-checked). Seeded by the census extractor, then tiers assigned by hand.
- **Page content tree** — deferred to the editor-packaging decision (currently `sketch/cm6-editor`).

## 9. Deferred / open

- Surfaces 2–7 extractors — blocked on #822 (v6 surface re-enumeration).
- API exact symbol count — needs the built `.d.ts`/TypeDoc JSON (barrel re-exports defeat a
  source-only census; the prototype found ~33 documented members on `jssm.ts`, 46 `@example`
  blocks across 18 non-test files).
- Promote the census extractors from `build/` throwaways to the real partition-check tooling
  (likely `src/scripts/`), wired into the build as a gate.
- The two §7.3 curation calls.
```
