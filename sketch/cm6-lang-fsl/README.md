# codemirror-lang-fsl

CodeMirror 6 language support for **FSL**, the source dialect of
[jssm](https://github.com/StoneCypher/jssm) finite-state machines.

## Status

Sketch / preview. The tokenizer is a hand-written approximation of the FSL PEG
grammar — it covers comments, strings, action labels, arrows, atoms, keywords,
numbers, and punctuation, but is not derived from the canonical grammar yet. A
future version may swap the `StreamLanguage` implementation for a Lezer
grammar generated from `fsl_parser.peg`. The exported API (`fslLanguage`,
`fsl()`) will not change.

## Install

```sh
npm install codemirror-lang-fsl
```

`@codemirror/language` and `@codemirror/state` are peer dependencies (i.e. they
must be present in your project already — every CodeMirror 6 project has them).

## Usage

```js
import { EditorView, basicSetup } from "codemirror";
import { fsl }                    from "codemirror-lang-fsl";

new EditorView({
  doc:    "machine_name : \"demo\";\nA -> B;\n",
  parent: document.body,
  extensions: [
    basicSetup,
    fsl(),
  ],
});
```

If you'd prefer the raw `Language` without the `LanguageSupport` wrapper (for
example to compose it manually with additional extensions):

```js
import { fslLanguage } from "codemirror-lang-fsl";
```

## Highlight tags emitted

The tokenizer returns the standard CodeMirror highlight tag names below. Pair
with any compatible highlight style (e.g. `defaultHighlightStyle` from
`@codemirror/language`) to get colors.

| Tag                      | Used for                                                    |
|--------------------------|-------------------------------------------------------------|
| `comment`                | `// line` and `/* block */` comments                        |
| `string`                 | `"double-quoted"` strings (state names, labels, etc.)       |
| `labelName`              | `'single-quoted'` action labels on transitions              |
| `keyword`                | Structural keywords (`state`, `transition`, `action`, ...)  |
| `propertyName`           | Machine-attribute keys (`machine_name`, `fsl_version`, ...) |
| `atom`                   | Enumerated values (`true`, `false`, `dot`, `MIT`, ...)      |
| `variableName`           | State names, identifiers                                    |
| `variableName.special`   | `&ref` named-list references                                |
| `operator`               | Arrows (`->`, `=>`, `~>`, `<->`, ...) and version operators |
| `number`                 | Numeric literals, including dotted versions (e.g. `5.0.0`)  |
| `bracket`                | `()`, `[]`, `{}`                                            |
| `punctuation`            | `;`, `:`, `,`, `|`                                          |

## Diagnostics

This package only ships syntax highlighting. To wire FSL parse errors into the
editor's lint gutter, use the real `fsl_parser` from jssm with
`@codemirror/lint`:

```js
import { linter } from "@codemirror/lint";
import { parse }  from "jssm/dist/es6/fsl_parser.js";

const fslLinter = linter((view) => {
  try { parse(view.state.doc.toString(), {}); return []; }
  catch (err) {
    if (!err.location) return [];
    const { start, end } = err.location;
    const from = view.state.doc.line(start.line).from + start.column - 1;
    const to   = view.state.doc.line(end.line).from   + end.column   - 1;
    return [{ from, to: Math.max(to, from + 1), severity: "error", message: err.message }];
  }
});
```

## License

MIT
