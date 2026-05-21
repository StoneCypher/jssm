# CodeMirror 6 Editor — Handoff Document

A second Claude instance has accidentally been started on this same task. This
document is the full state of the work so that instance (or any future
instance) can pick up cold without re-reading the conversation transcript.

> **Status note (added on merge):** the sketch was imported into `main` on
> 2026-05-12 at the paths `sketch/cm6-editor/` and `sketch/cm6-lang-fsl/`.
> References to `.claude/worktrees/cm6-editor-sketch/` below are historical.
> The PNG screenshots and the `servehere` devDependency change from the
> worktree's `package.json` were deliberately NOT brought over.

## What is being built

A modern web-based editor for FSL (the source language of `jssm` finite state
machines), replacing the previous Ace-based editor. The editor needs to work
as a **widget**: sometimes the entire page, sometimes a tiny embed — the host
can't be predicted in advance. Bundle size is not a concern (the existing
`jssm_viz` is already multiple megabytes).

## Where the work lives

- **Worktree path (historical):** `.claude/worktrees/cm6-editor-sketch`
- **Branch (historical):** `worktree-cm6-editor-sketch`
- **Current location:** `sketch/cm6-editor/` and `sketch/cm6-lang-fsl/` on `main`.
- The worktree was branched from `origin/main` via the `EnterWorktree` native
  tool. The branch was found to have zero commits beyond main — all work was
  uncommitted in the worktree's working tree.

## Decisions already taken (do not re-litigate without new info)

1. **Editor library: CodeMirror 6.** A long survey of alternatives was done
   (Monaco, CodeMirror 5/6, Ace, Lexical, TipTap, Slate, CodeJar + Shiki,
   Theia, Sandpack, and parser systems Lezer / tree-sitter / TextMate). The
   user picked CM6 because (a) bundle size is irrelevant given `jssm_viz`
   already ships megabytes, (b) CM6 has the strongest custom-language story
   via Lezer for the eventual upgrade path, and (c) mobile + a11y story is
   the best of the modern editors.

2. **Highlighting strategy (sketch phase): hand-written `StreamLanguage`
   tokenizer + separate `linter` driven by the existing `fsl_parser.parse()`.**
   Reasoning: the current PEG parser does NOT annotate its output with source
   locations (action blocks like `{ return { key, value } }` discard them),
   so AST-driven highlighting would require either modifying the canonical
   `.peg` grammar or rebuilding the parser with `--trace` and hooking the
   tracer. Both are larger projects than a sketch should take on. The split
   architecture is also good design: highlighting never blocks on the parser,
   and a failing parse doesn't kill the colors.

3. **Distribution shape: redistributable CM6 language package.** Extracted
   the tokenizer from the demo into `sketch/cm6-lang-fsl/` shaped exactly
   like the standard `@codemirror/lang-*` packages — exports `fslLanguage`
   (the `Language`) and `fsl()` (factory returning `LanguageSupport`).
   Consumer API matches the rest of the CM6 ecosystem.

4. **CDN strategy: esm.sh + importmap with pinned versions and `?external=`
   chains.** This is non-obvious and load-bearing — see the bug log below.

## What "auto-derive Lezer grammar from PEG" came down to

The user asked about auto-derivation. Four options were laid out:

- **Option A — Reuse existing PEG parser for diagnostics, separate tokenizer
  for highlighting.** Effort: half a day. *This is what the sketch does.*
- **Option B — Auto-derive a CM6 `StreamLanguage` tokenizer from the PEG's
  terminal rules.** Effort: ~1 day for the derivation script + a few hours
  hand-touch-up. Recommended escalation from A if needed.
- **Option C — Auto-derive a real Lezer grammar from the PEG.** Effort:
  3-5 days for the transpiler + 1-2 days hand-finishing. *Not recommended
  for a single grammar — the transpiler becomes a maintained artifact.*
- **Option D — Hand-write the Lezer grammar.** Effort: 2-4 days. Worst
  maintenance story (every PEG change requires a Lezer change).

The user chose A for the sketch. Escalation path is A → B → maybe C/D later.

## File inventory

```
sketch/
├── cm6-editor/                  the live demo
│   ├── index.html               importmap + layout + status bar
│   ├── editor.js                CM6 setup, composed basicSetup, linter
│   ├── sample.fsl               small traffic-light machine (parses cleanly)
│   └── README.md                how to run, what it is/isn't
└── cm6-lang-fsl/                the redistributable package
    ├── index.js                 exports fslLanguage and fsl()
    ├── package.json             name: "codemirror-lang-fsl", v0.0.1
    └── README.md                install / usage / highlight-tag-map / linter recipe

notes/superpowers/
└── cm6-editor-handoff.md        this file (post-merge location)
```

## How to run the sketch

ES modules require an HTTP origin, AND the parser is imported via
`../../dist/es6/fsl_parser.js` from `sketch/cm6-editor/editor.js`. So the
static server MUST be rooted at the repo root, NOT inside the sketch dir.

```
cd C:\Users\john\projects\jssm
npx serve .
```

Then open `http://localhost:3000/sketch/cm6-editor/`.

Alternatively, an inline Node static server one-liner was used during
debugging (port 7373); see the conversation for the exact invocation if
needed.

## Bug log — DO NOT REPEAT THESE

**1. esm.sh meta-package export problem.** The very first attempt used
`import { EditorView, basicSetup } from "https://esm.sh/codemirror@6"`. This
fails with *"does not provide an export named 'EditorView'"* (and later
*"basicSetup"*). The `codemirror` npm meta package re-exports its symbols
via `export *` from sub-packages, and esm.sh's auto-generated wrapper
exposes only what was *originally declared* in the meta package's own
source. **Fix:** import each symbol from its actual source package
(`@codemirror/view`, `@codemirror/state`, etc.), and compose `basicSetup`
manually from the individual extensions. The `codemirror` meta package was
dropped entirely.

**2. Dual `@codemirror/state` instances.** First fix attempt switched to
jsdelivr's `+esm` endpoint. This fails with *"Unrecognized extension value
in extension set ([object Object]). This sometimes happens because multiple
instances of @codemirror/state are loaded, breaking instanceof checks."*
Each `+esm` bundle inlines its own copy of `@codemirror/state`, so packages
end up seeing different `Extension` symbols. **Fix:** importmap in
`index.html` that pins each `@codemirror/*` package to a specific version
on esm.sh with `?external=` chains so all packages resolve their shared
deps through the importmap. The browser dedupes by URL, giving a single
state singleton. The current importmap is in
`sketch/cm6-editor/index.html` — don't touch it without understanding why
each `?external=` clause exists.

**3. Repo's own `.fsl` example files don't parse against the current
grammar.** Most files in `src/machines/linguist/` are missing terminating
semicolons on attribute lines and use `jssm_version` (with operators like
`>=`) where the current grammar expects bare `fsl_version: 5.0.0;`. The
`sample.fsl` in this sketch was hand-fixed. **This is a separate bug worth
reporting / fixing in the repo, but is NOT part of this task** — flag to
the user, don't go chase it.

**4. The first `serve` instruction in the README was wrong.** It said to
`cd sketch/cm6-editor && npx serve .`, which makes that directory the
document root — and then `../../dist/...` traverses outside the root and
404s. README has been corrected.

## Open decisions waiting on the user

1. **Where the package lives long-term.** Currently under `sketch/` so it
   can be discarded with the rest of the experiment. Real options:
   - Separate npm package `codemirror-lang-fsl` (package.json is already
     shaped for this)
   - Subpath export of `jssm` itself (`jssm/cm6`)
   - Sibling directory under the repo root

   **Update 2026-05-12:** the packaging spec
   (`notes/superpowers/specs/2026-05-12-editor-widget-packaging-design.md`)
   selects `jssm/cm6` as the canonical subpath.
2. **Tokenizer derivation.** Hand-written today (~80 lines). Decisions A→B
   in the four-options ladder above.
3. **Web-component wrapper.** Still pending. The user wants a `<jssm-editor>`
   widget that can be embedded in arbitrary host pages with style isolation
   (Shadow DOM). The sketch currently mounts into a `<div>` directly. The
   wrapper would be a ~50-line shim over `editor.js`. **This is the subject
   of the future Plan 2.**
4. **`jssm_viz` integration.** Editor is standalone today. Future work:
   either bundle editor + viz together as a single widget, or emit a
   `change` event for hosts to feed into a separate `<jssm-viz>`. **The
   spec's `<jssm-playground>` composite widget covers this.**

## User collaboration preferences (project-specific)

These are the relevant ones from the user's global memory and `CLAUDE.md`
that have come up during this task:

- **Never use compound commands in Bash/PowerShell.** Each `;`/`&&` chain
  triggers a fresh permission prompt. The user lost a work night to this.
- **Prefer Node over Python for scripting.**
- **Don't switch git branches without explicit unambiguous permission.**
  Phrases like "switch back" or "once we're on main" are NOT permission.
- **Don't pin bugs.** When a bug is found, fix the source, don't write
  characterization tests around the buggy behavior.
- **Check IDE diagnostics after editing code.** Call `mcp__ide__getDiagnostics`
  after Write/Edit to catch deprecation/lint warnings the user would
  otherwise have to flag manually.
- **Don't push code or change package versions without asking** (per
  project `CLAUDE.md`).
- **Documentation in docblocks, with args/return/examples.**
- **Update tests, docblocks, and `base_README.md` when changing functions.**
  (Note: the sketch is not yet "real" code in this sense — it's a
  prototype. If/when it gets promoted to production code under `src/`, this
  rule kicks in.)
- **No golden-file tests; prefer substring assertions.**

## What I'd suggest the receiving instance do

1. Read this file fully.
2. Pull up `sketch/cm6-editor/index.html`, `sketch/cm6-editor/editor.js`, and
   `sketch/cm6-lang-fsl/index.js` to confirm the current state.
3. Run the sketch locally per the "How to run" section above — verify it
   actually works in the browser before making any changes.
4. If the user has already given direction on one of the "open decisions"
   above, execute on that. Otherwise wait for direction — do not start
   refactoring proactively.

## What NOT to do

- Do not rewrite the importmap without understanding the `?external=`
  chains — see bug log entry #2.
- Do not switch the CDN back to the `codemirror` meta package — see bug log
  entry #1.
- Do not fix the broken `.fsl` example files in `src/machines/linguist/`
  unless explicitly asked — that is a separate task.
- Do not switch branches.
- Do not push or commit without explicit permission.
- Do not invest in the PEG → Lezer transpiler (Option C) unless the user
  asks. It's not worth doing for a single grammar.
