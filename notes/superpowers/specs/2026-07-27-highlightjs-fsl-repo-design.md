# `highlightjs-fsl` — repository design

**Status:** plan, nothing built. Researched 2026-07-27 against the live `highlightjs` org (66 repos), the official 3rd-party guide, and three exemplar grammars.

---

## 1. What exists today

| repo | state |
|---|---|
| `highlightjs/highlightjs-fsl` | **empty** — zero branches, zero commits. Placeholder created 2021-01-22. John has `push` + `maintain`, **not** `admin`. |
| `StoneCypher/alpha-highlightjs-fsl` | working grammar at `src/fsl.js`, a theme-preview page generator (`src/makepage.js` → `docs/*.html` across 8 themes), README, LICENSE. **No tests, no `dist/`.** Targets **highlight.js ^10.5.0**. |
| npm `highlightjs-fsl` | **unclaimed** (404) |
| npm `@highlightjs/fsl` | **unclaimed** (404) |

So this is a port-and-restructure job, not a from-scratch one. The alpha is the seed.

---

## 2. The naming answer: unscoped, own npm account

The org does **not** publish grammars under `@highlightjs`. Every third-party grammar is published unscoped, owned by its individual author:

| package | npm maintainers |
|---|---|
| `highlightjs-apex` | `dschach` |
| `highlightjs-cypher` | `gusbemacbe` |
| `highlightjs-structured-text` | `serhioromano` |
| `highlightjs-cshtml-razor` | `romanresh` |
| `highlightjs-solidity` | `marcosc`, `pospi`, `haltman` |
| `@highlightjs/apex` | **404 — no scoped variants exist at all** |

Only `@highlightjs/cdn-assets` and `highlight.js` itself carry org-level ownership (`marcosc`, `joshgoebel`, `isagalaev`, `highlightjs_bot`).

**Consequences of the unscoped default:**

- No `@highlightjs` scope membership is needed. Publish `highlightjs-fsl` from John's own npm account, like every other grammar author.
- The name is free.
- It dodges a jssm-side blocker: `collect_package_sizes.cjs`'s `archiveFile()` is `path.join(outDir, pkg + '.json')`, which cannot hold a scoped name. `highlightjs-fsl` has no slash, so it can be enrolled in `DEFAULT_PACKAGES` the moment it publishes.

### 2a. `@highlightjs/fsl` — considered and DECIDED AGAINST (2026-07-27)

Nothing forbids it: neither `3RD_PARTY_QUICK_START.md` nor `docs/language-contribution.rst` mandates a package name, and the scoped form has a real argument in its favour — unscoped `highlightjs-*` is first-come-first-served by anyone on npm, so the org's namespace is unprotected, while `@highlightjs/*` can only be published by members.

**Rejected anyway, by John: being the only scoped package out of ~60 is a hard no.** Consistency with the ecosystem beats the squatting argument here. Do not re-open this.

Secondary costs that also pointed the same way: every release would need an org member (no standing publish rights), a scoped name implies org endorsement of a third-party grammar, and it would reintroduce the `archiveFile()` scoped-path problem in jssm's collector.

---

## 3. Target repository shape

The official guide (`3RD_PARTY_QUICK_START.md`, carried in `highlightjs-apex`) specifies the layout. Two live conventions exist; follow the **current** one, which is what the guide states and what the most recently maintained repo (`highlightjs-apex`, pushed 2026-07-22) does.

```
highlightjs-fsl/
├── LICENSE                          MIT — org norm; alpha's ISC is an npm-init leftover
├── README.md                        install (npm + CDN <script>), usage, screenshot, theme gallery link
├── CONTRIBUTING.md                  optional; cypher and apex both carry one
├── package.json                     name: highlightjs-fsl, main: src/languages/fsl.js
├── src/
│   └── languages/
│       └── fsl.js                   the grammar — CommonJS, see §4
├── css-class-reference.md           ONLY if the grammar uses custom classes — and if it
│                                    does, ship a custom theme too, since no built-in
│                                    theme will style them
├── test/
│   ├── detect/
│   │   └── fsl/
│   │       └── default.txt          auto-detect corpus; the filename `default.txt` is
│   │                                specified by docs/language-contribution.rst §5
│   └── markup/
│       └── fsl/
│           ├── <case>.txt           input
│           └── <case>.expect.txt    expected markup — NOTE the name, see §5
└── dist/
    ├── fsl.min.js                   built by the CORE repo, committed here
    └── fsl.es.min.js                ESM variant; apex ships both
```

**Layout notes**

- `src/languages/fsl.js`, not `src/fsl.js`. The guide says `src/languages/`; apex uses it and builds cleanly today. `cypher` and `robots-txt` use flat `src/` but have not been touched since 2021–2024.
- `test/detect/fsl/` and `test/markup/fsl/` are **directories named for the language**, per the guide and apex. The older flat style is legacy.
- `dist/` is committed, not gitignored. Users expect a single `<script>` tag from CDN with no build step.

**Deliberately omitted from v1** (apex has these; they are maturity, not requirements): `release-please` automation, dependabot, CodeQL, prettier config, `demo/`, `assets/`, a custom `src/styles/*.css` theme, a private `test/index.js` runner.

**Worth porting from the alpha:** `src/makepage.js` and the multi-theme preview page are genuinely nice and no other grammar repo has one. It belongs under `demo/`, not `docs/`, and should not ship in the npm tarball.

### 3a. Which of their conventions are actually binding

Two tiers, and only one of them is real.

**Binding — the build and test harness consume these, and ignoring them fails silently rather than loudly:**

| convention | why it is load-bearing |
|---|---|
| `src/languages/fsl.js` | where the CDN/node build looks |
| the `/* Language: ... */` header block | parsed by the build system as metadata; `Language` is the only required key |
| the grammar function is *exported, never self-invoked* | the build target decides how to call it |
| `test/detect/fsl/default.txt` | exact filename, per `language-contribution.rst` §5 |
| `test/markup/fsl/*.expect.txt` | exact suffix — `.expected.txt` silently never runs under the core harness |
| `dist/fsl.min.js` committed | users expect one `<script>` tag; built by core's `tools/build.js -t cdn` |
| `css-class-reference.md` + a shipped theme | only if the grammar uses custom classes; no built-in theme will style them |

**Not binding — there is no org standard, at all:**

- **No org-wide defaults repo.** `highlightjs/.github` returns 404, so no inherited templates, workflows, or policies.
- **`CONTRIBUTING.md` is per-repo, not shared** — cypher's and apex's blobs differ in both hash and size (1428 vs 1192 bytes). Each author wrote their own.
- **Formatting is per-author:** apex uses prettier, cypher an `.editorconfig`, robots-txt nothing.
- **CI is per-author and thin:** apex runs release-please, dependabot, and CodeQL; cypher has exactly one workflow, publish-on-release; robots-txt has none.
- **No grammar repo in the org runs the language tests in CI.** Testing is a local ritual inside a highlight.js checkout. Wiring real test CI here would make this repo better than the ecosystem norm rather than merely conformant — worth doing, and cheap.
- **MIT is the norm, not a rule.**

So: follow the binding column exactly, and use jssm's own conventions for everything else. There is nothing to conform to beyond the harness.

### 3b. Widened survey — 8 repos, and the "binding" column shrinks

Checked `gdscript`, `structured-text`, `solidity`, `cshtml-razor`, `luau` on top of `apex`, `cypher`, `robots-txt`. The convergent picture from three repos does not survive eight. **What is actually invariant across all 8:**

- `src/…/<lang>.js` — grammar source under `src/` (nesting varies)
- `package.json` `main` points at the **source** file, never `dist/`. Invariant, 8/8.
- `LICENSE` + `README.md`
- the `/* Language: … */` header block
- the function is exported, never self-invoked

**Everything else varies, including things §3a called binding:**

| dimension | spread |
|---|---|
| `src/languages/<lang>.js` vs flat `src/<lang>.js` | 5 nested (apex, gdscript, cshtml-razor, luau, solidity) vs 3 flat (cypher, robots-txt, structured-text) |
| `test/` at all | **gdscript and solidity have no `test/` directory.** gdscript is 23★ and shipping |
| language-named test subdirs | cshtml-razor + luau + apex yes; cypher, structured-text, robots-txt flat |
| detect filename | `default.txt` (cshtml-razor), `sample.txt` (robots-txt), `detect.txt` (structured-text), `luaudetext.txt` (luau) — **the documented `default.txt` is followed by 1 of 5** |
| `.expect.txt` vs `.expected.txt` | luau ships **both spellings in the same directory** |
| `dist/` committed | 7 of 8 — **solidity has none** |
| `dist/*.es.min.js` too | apex, cshtml-razor, luau |
| module form | `module.exports = function` (robots-txt), named fn + `module.exports = Name` (gdscript), **`export default function`** (luau) |
| `files:` in package.json | apex `[assets,dist,src,CHANGELOG.md]`, luau `[assets,dist,src,test]` — **neither is a superset of the other**; cypher/gdscript/cshtml-razor omit `files` entirely |
| license | MIT mostly, **CC0-1.0** (cshtml-razor), ISC in the alpha |
| `devDependencies: highlight.js` | cshtml-razor pins `^11.1.1`; apex instead depends on `@highlightjs/cdn-assets`; luau declares nothing |

**Revised reading.** Only the five invariants are genuinely load-bearing. The rest is convention with an authority gradient: the *documented* form (`src/languages/`, `default.txt`, `.expect.txt`) is what the core harness and guide specify, and the newest actively-maintained repos follow it — but the ecosystem does not enforce it, so nonconformance shows up as a quiet no-op rather than an error. That is an argument for following the documented form *more* strictly, not less: nothing will tell you if you drift.

**`solidity` is the outlier worth knowing about** — multi-grammar (`src/languages/solidity.js` + `yul.js`), `src/index.js` as an aggregate entry, `src/common.js` shared helpers, a root `test.js`, and no `dist/`. Relevant only if FSL ever grows a genuine second *language*; the fence syntax is **not** one — see §3c.

### 3c. The fence syntax is not a dialect — one grammar, two aliases

Checked directly against `src/ts/fsl_markdown_fence.ts`. The fence convention lives entirely in the Markdown **info string**, never in the FSL body:

```
```fsl image code width=400
  <-- ordinary FSL, byte for byte -->
```
```

`fsl_fence_lang()` reads only the first whitespace-delimited token and accepts `fsl` or `jssm`, case-insensitively. Everything after it — `image`, `code`, `dot`, `editor`, `actions`, `info-panel`, `toolbar`, `title`, `footer`, `svg|png|jpeg|gif`, `width=`/`height=`/`max-width=`/`max-height=`, `interactive` — is directives to the *host renderer*, parsed into a `FenceDescriptor`. The fenced content itself is unmodified FSL.

**Why highlight.js does not care:** highlight.js is handed the block body and a language name; the info string is consumed by the Markdown processor before any highlighter sees it. There is no second grammar, no fence-only token, nothing to disambiguate.

**The one thing that follows:** since `fsl_fence_lang()` accepts both spellings, `aliases` must cover both, or every ```` ```jssm ```` fence in the existing corpus goes unhighlighted:

```js
aliases: ['fsl', 'jssm']
```

This does collide with the deprecated-synonym policy (`fsl-*` canonical, `jssm-*` deprecated and removed in v6) — but an alias costs nothing, and dropping it would break historical documents that highlight.js has no way to migrate. Keep `jssm` as an alias indefinitely; it is a reader, not an API surface.

### 3d. Embedding: the mechanism exists, but points the wrong way for us

Yes — `subLanguage` (documented in `docs/mode-reference.rst`). A mode may hand its entire contents to another grammar:

```js
{ begin: /<\?/, end: /\?>/, subLanguage: 'php' }
```

It takes a language name, an array of names (autodetect constrained to that set), or an empty array (autodetect across everything). Supporting parts: `starts` (a mode that begins after this one ends, outside it — how HTML reaches `<script>`), `returnEnd` (hand the closing lexeme back to the parent, since `</script>` is not parseable as JS), and `skip` (keep a span in the parent's buffer so e.g. a `?>` inside a PHP comment does not end the block early).

**The catch: `subLanguage` is declared by the HOST, not the guest.** There is no attribute by which FSL announces "I may appear inside Markdown." The containing grammar has to name FSL, which means embedding-by-declaration is only reachable by patching upstream grammars — not something a third-party module can do for itself. The `Requires:` header is not this either; it declares grammars *this* grammar needs loaded, a build-time dependency.

**And the Markdown grammar does not dispatch on the info string.** Its `CODE` mode is scope-only, with no `subLanguage` and an explicit `// TODO: fix to allow these to work with sublanguage also`. Highlighting a Markdown *document* with highlight.js paints every fence uniformly as `hljs-code` — regardless of language — so ```` ```fsl ```` gets no FSL colouring by that path, and this is not a gap specific to FSL.

**That does not matter for the real use case.** In normal use the Markdown processor (markdown-it, marked, remark) extracts the fence body itself and calls `hljs.highlight(code, { language: 'fsl' })` directly, dispatching on the info string before highlight.js is involved. That path works the moment the grammar is registered, and it is the path every documentation site actually uses. **No embedding work is required for FSL-in-Markdown.**

**Where `subLanguage` would earn its place is the other direction** — a foreign language embedded *inside* FSL. If the expression-language work introduces expressions in actions or guards that are better parsed by another grammar, an FSL mode can declare `subLanguage` for that region. Not needed for v1; worth remembering the mechanism exists.

**Filed for v7 (2026-07-27), all post-v1 and all blocked on `highlightjs-fsl` existing:**

| issue | what |
|---|---|
| **fsl#1972** | JS grammar: `FSL_TEMPLATE` for `` \.?fsl` `` → `subLanguage: 'fsl'`, mirroring the existing `HTML_TEMPLATE`/`CSS_TEMPLATE`/`GRAPHQL_TEMPLATE` triple. Highest value — tagged templates are jssm's primary authoring surface and every such literal renders today as one flat `hljs-string`. **The `sm`-is-ambiguous risk is resolved:** an `` fsl`…` `` alias now exists in jssm (below), so the patch keys on a distinctive name and `` sm`…` `` is deliberately *not* patched. |
| **fsl#1973** | TypeScript: **probably free.** `typescript.js` does `const tsLanguage = javascript(hljs)` and *concats* onto `contains`, never rebuilding it — so the JS patch is inherited. This issue is verification plus tests, because the inheritance is currently untested and a future refactor could break it silently. |
| **fsl#1974** | Markdown: `CODE` has no `subLanguage` and an explicit `// TODO: fix to allow these to work with sublanguage also`. Must be pitched as the general capability (dispatch fenced code to the info-string language, fall back to today's behaviour for unregistered ones), never as "let Markdown highlight FSL". Lowest priority — the path barely gets used, since Markdown processors dispatch before highlight.js is involved. |

One prerequisite spans all three: confirm that `subLanguage: 'fsl'` **degrades gracefully when `highlightjs-fsl` is not registered**. If an unregistered sublanguage throws rather than falling back to plain text, no upstream maintainer will take any of these patches.

**The `` fsl`…` `` alias LANDED 2026-07-27** on `docs_26-07-04_fable-v6-to-v16` (uncommitted at time of writing) — `fsl<mDT>()` in `src/ts/jssm.ts` beside `sm`, exported; `Machine.prototype.fsl` beside `Machine.prototype.sm`; `src/ts/tests/fsl_tag.spec.ts` (11 tests, serialize-equality against `sm` across plain/interpolated and function/method forms, timestamp excluded since `serialize()` stamps wall-clock time); README row in `src/md/README_base.md`. Neither spelling is deprecated — `sm` stays the terse everyday form, `fsl` is the one for highlighted sources.

**Trap confirmed as real, not theoretical:** luau contains `luaucode.expected.txt` *and* `default.expect.txt` side by side. Someone made exactly the naming mistake §3a warns about and it was never noticed — because nothing runs those tests in CI.

**One admin snag, concretely.** Cypher's publish workflow reads `secrets.NPM_TOKEN`. Repository secrets require **admin**, and John has `maintain`. Automated publishing therefore needs `joshgoebel` or `marcosc`; publishing by hand needs nothing from anyone. v1 publishes by hand.

---

## 4. The grammar port: highlight.js 10 → 11

The alpha pins `highlight.js ^10.5.0`. Current is **11.11.x**. This is the single largest work item and the one place a naive copy-paste breaks.

**Three module forms are live in the wild.** `docs/language-contribution.rst` §3 shows `export default function(hljs) { ... }` and states the function must not be self-invoked — the build target decides how it is called. Observed: `module.exports = function (hljs)` (robots-txt, cypher), a named function plus `module.exports = GDScript` (gdscript), and the documented `export default function (hljs)` (luau, 2025 — the most recent of the five surveyed). **Use `export default`**: it is what the docs specify and what the newest repo ships. Confirm against a build before writing tests.

Note `package.json` `main` points at the **source** file in all 8 repos surveyed — `"main": "src/languages/fsl.js"`, never `dist/`. That is the one packaging detail nobody deviates on.

Header keys are documented in §4: `Language` is **the only required one**; `Requires`, `Author`, `Contributors`, `Description`, `Website` are optional. Note the file's *name* becomes the language identifier and must be valid as an HTML/CSS class — `fsl.js` is fine.

The CommonJS shape, verbatim from `highlightjs-robots-txt`:

```js
/*
Language: robots.txt
Author: Thomas LÉVEIL <thomasleveil@gmail.com>
Description: language definition for robots.txt files
Category: config
*/

module.exports = function (hljs) {
  return {
    aliases: [...],
    case_insensitive: true,
    keywords: { $pattern: /.../, keyword: '...', built_in: '...' },
    contains: [ ... ],
    illegal: '...'
  }
}
```

For FSL the header should carry `Language: FSL`, `Description: Finite State Language`, `Website: https://fsl.tools` (or whichever site is canonical), and a `Category:` — no existing category fits a state-machine DSL well; `config` or `dsl` are the plausible picks and this is worth asking upstream about rather than guessing.

**Port checklist**

- Read `docs/upgrade-11.md` in the core repo before touching the grammar. The headline change is `className` → `scope`.
- `aliases: ['fsl', 'jssm']` — both, and `jssm` is not optional. See §3c: `fsl_fence_lang()` accepts either spelling, so dropping the alias silently unhighlights every existing ```` ```jssm ```` fence.
- `disableAutodetect: true` is the escape hatch the guide explicitly blesses if detect tests won't pass. FSL is small and keyword-light, so autodetect is likely to misfire against config-ish languages — expect to need this, and do not treat it as failure.
- `illegal:` is worth setting; it is what stops FSL from claiming unrelated files during autodetect.

---

## 5. Testing — and one trap

The third-party test workflow runs **inside a checkout of the core repo**, not standalone:

1. Clone `highlightjs/highlight.js`.
2. Clone or symlink this repo into its `extra/` folder, giving `extra/highlightjs-fsl`. (`extra/` is gitignored upstream; do not commit into it.)
3. `node ./tools/build.js -t node`
4. `npm run test`
5. To iterate on markup only: set `ONLY_EXTRA=true`, then `npm run test-markup`.

**The trap:** expectation files must be named `<case>.expect.txt`, not `.expected.txt`. Verified against core (`test/markup/javascript/` uses `.expect.txt` throughout). `highlightjs-apex` uses `.expected.txt` — it gets away with it only because it ships its own `test/index.js` mocha runner and does not rely on the core suite. Copying apex's naming while relying on the core harness means the tests silently never run.

Markup cases worth having, from FSL's own surface: state declarations, transition arrows and their variants, action/label syntax, comments, string and numeric literals, the graph-attribute block, and at least one full realistic machine as `sample.txt`.

---

## 6. `dist/` — built by the core repo, committed here

Do not hand-roll a bundler. From the same core checkout:

```
node ./tools/build.js -t cdn
```

which emits `extra/highlightjs-fsl/dist/fsl.min.js`. Commit that file. Apex additionally ships `dist/apex.es.min.js`, so an ESM variant is available from the same tooling and is worth including.

---

## 7. Publishing and registration

1. **Seed the GitHub repo by direct push.** `highlightjs/highlightjs-fsl` has zero branches, so there is no base ref and a pull request is *impossible* — the first content must arrive as a push. John has `push`, so no fork is needed either.
2. **`npm publish highlightjs-fsl`** from John's own account. Note `npm whoami` currently returns 401 on this machine — there is no local npm auth at all, because jssm publishes via CI OIDC. A `npm login` is required first.
3. **PR `SUPPORTED_LANGUAGES.md`** in the core repo to register FSL. This is the step that makes the language discoverable.
4. **Enroll `highlightjs-fsl` in `DEFAULT_PACKAGES`** in jssm's `src/scripts/collect_package_sizes.cjs` so it joins the size/mass-flow sankey. The new `reconcile:` report will flag it as *unpublished* until step 2 lands, then start collecting automatically.

---

## 8. Where this lives: generate in the monorepo, publish from the satellite

**Yes to the monorepo — for the grammar's *source*. No — for the package and the repo.**

The decisive fact is that FSL's other grammar is **not hand-maintained, it is derived.** `src/buildjs/build_fsl_tmlanguage.cjs` declares the language's lexical surface as structured constants — `ARROWS_A/B/C`, `STRUCTURAL_KEYWORDS`, `ARRANGE_KEYWORDS`, `ATTRIBUTE_KEYS`, `STYLE_KEYS` — and `buildGrammar()` composes them into `dist/grammars/fsl.tmLanguage.json`, with `src/buildjs/tests/fsl_tmlanguage.spec.ts` guarding it and a `jssm/grammar` package export shipping it.

Those constants are the single source of truth for what FSL's tokens *are*. A hand-written highlight.js grammar living in a satellite repo would duplicate them and drift the first time an arrow kind or attribute key is added — and the alpha grammar drifting since 2021 is exactly that failure already having happened once.

**So:**

1. **Extract the vocabulary.** Lift the token constants out of `build_fsl_tmlanguage.cjs` into a shared module (`src/buildjs/fsl_vocabulary.cjs`) that both emitters import. Small, and it is the real work item.
2. **Add `src/buildjs/build_fsl_highlightjs.cjs`** beside the TextMate builder, emitting `dist/grammars/fsl.highlight.js` from that same vocabulary, with a sibling spec.
3. **The satellite consumes it.** `highlightjs/highlightjs-fsl` pulls the emitted grammar — the same pull-based, secret-free sync already used for the TextMate mirror — then adds the parts that only make sense there: the metadata header, `test/detect/fsl/default.txt`, `test/markup/fsl/*`, and `dist/*.min.js` built inside a highlight.js checkout. It publishes `highlightjs-fsl` on its own version line.

**Why it is not an eighth monorepo package:**

- **Foreign build.** `dist/fsl.min.js` is produced by *highlight.js*'s `tools/build.js -t cdn`, with the grammar repo symlinked into that project's `extra/` folder. Embedding that in jssm's build orchestrator means making jssm's build depend on cloning another project.
- **Version lockstep.** Monorepo siblings share a version line. `highlightjs-fsl@6.x` sitting beside `highlightjs-apex@1.66` and `highlightjs-cypher@1.2` reads as nonsense to a highlight.js user.
- **Release cadence.** jssm releases on *every* push to `main`. A grammar that changes a few times a year would accumulate dozens of no-op releases.
- **Discoverability.** highlight.js users look in the `highlightjs` org. That is where the org hosts third-party grammars on purpose.

---

## 9. Open questions

- **`admin: false` matters for step 2 automation.** Repo secrets require admin, so any CI-driven npm publish from `highlightjs/highlightjs-fsl` must be configured by `joshgoebel` or `marcosc`. Publishing by hand from a laptop needs nothing from them. v1 should publish by hand.
- **Which `Category:`** the header should claim — worth asking upstream rather than inventing one.
- **Courtesy heads-up.** The repo has sat empty since 2021. Filling it is within John's permissions, but a note to the org first is cheap and is the kind of thing maintainers prefer.
- **Does the alpha grammar still reflect current FSL?** It predates a great deal of language work. It needs an audit against the FSL of today, not just an API port — and the TextMate grammar shipped in jssm 5.163.0 is a far more current statement of the language's real surface. Diff against that rather than trusting the 2021 grammar.
