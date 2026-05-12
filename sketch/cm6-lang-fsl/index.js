import { StreamLanguage, LanguageSupport } from "@codemirror/language";

const STRUCTURAL_KEYWORDS = new Set([
  "state", "start_state", "end_state", "active_state",
  "terminal_state", "hooked_state",
  "action", "transition", "validation", "configuration", "hooks",
]);

const PROPERTY_KEYWORDS = new Set([
  "machine_name", "machine_version", "machine_author", "machine_license",
  "machine_comment", "machine_contributor", "machine_definition",
  "machine_language", "machine_reference", "jssm_version",
  "graph_layout", "graph_bg_color", "start_states", "end_states",
  "allows_override", "edge_color", "fsl_version", "arrange", "flow",
  "theme", "color", "corners", "line", "shape", "label", "direction",
  "background_color", "text_color", "arc_label", "head_label",
  "dot_preamble", "arrow", "image", "hook_definition",
]);

const ENUM_KEYWORDS = new Set([
  "true", "false", "none", "default", "modern", "ocean", "bold",
  "dot", "circo", "fdp", "neato", "twopi",
  "up", "right", "down", "left",
  "solid", "dotted", "dashed",
  "regular", "rounded", "lined",
  "MIT",
]);

const ARROWS = /^(?:<-=>|<-~>|<=->|<=~>|<~->|<~=>|<->|<=>|<~>|->|<-|=>|<=|~>|<~|↔|←|→|⇔|⇐|⇒|↮|↚|↛)/;
const COMPARATORS = /^(?:>=|<=|>|<)/;

const ATOM_START = /[0-9a-zA-Z._!$^*?,-￿]/;
const ATOM_BODY  = /[0-9a-zA-Z.+_^()*&$#@!?,-￿]/;

const fslStreamParser = {
  name: "fsl",

  startState: () => ({ inBlockComment: false }),

  token(stream, state) {
    if (state.inBlockComment) {
      while (!stream.eol()) {
        if (stream.match("*/")) { state.inBlockComment = false; return "comment"; }
        stream.next();
      }
      return "comment";
    }

    if (stream.eatSpace()) return null;

    if (stream.match("//")) { stream.skipToEnd(); return "comment"; }
    if (stream.match("/*")) { state.inBlockComment = true; return "comment"; }

    if (stream.match(/^"(?:\\.|[^"\\])*"?/)) return "string";
    if (stream.match(/^'(?:\\.|[^'\\])*'?/)) return "labelName";

    if (stream.match(ARROWS))      return "operator";
    if (stream.match(COMPARATORS)) return "operator";

    if (stream.match(/^\d+(?:\.\d+)*/)) return "number";

    if (stream.match(/^&[A-Za-z_][\w]*/)) return "variableName.special";

    const ch = stream.peek();
    if (ch && ATOM_START.test(ch)) {
      let tok = "";
      while (!stream.eol() && ATOM_BODY.test(stream.peek())) {
        tok += stream.next();
      }
      if (STRUCTURAL_KEYWORDS.has(tok)) return "keyword";
      if (PROPERTY_KEYWORDS.has(tok))   return "propertyName";
      if (ENUM_KEYWORDS.has(tok))       return "atom";
      return "variableName";
    }

    if (stream.match(/^[\[\]{}()]/)) return "bracket";
    if (stream.match(/^[;:,|]/))     return "punctuation";

    stream.next();
    return null;
  },

  languageData: {
    commentTokens: { line: "//", block: { open: "/*", close: "*/" } },
  },
};

/**
 * CodeMirror 6 `Language` for FSL (Finite State Language), the source dialect
 * used by [jssm](https://github.com/StoneCypher/jssm).
 *
 * Built on `StreamLanguage` — token-stream based, not tree-based. Tokens map to
 * standard CodeMirror highlight tags (`keyword`, `propertyName`, `string`,
 * `labelName`, `operator`, `number`, `comment`, `variableName`,
 * `variableName.special`, `atom`, `bracket`, `punctuation`).
 *
 * Most consumers will prefer the `fsl()` factory below.
 */
export const fslLanguage = StreamLanguage.define(fslStreamParser);

/**
 * CodeMirror 6 `LanguageSupport` for FSL. Drop this into an editor's
 * `extensions` array to get FSL syntax highlighting.
 *
 * @returns {LanguageSupport} extension ready for `new EditorView({ extensions })`
 *
 * @example
 *   import { EditorView, basicSetup } from "codemirror";
 *   import { fsl } from "codemirror-lang-fsl";
 *
 *   new EditorView({
 *     doc: "machine_name : 'demo';\nA -> B;\n",
 *     parent: document.body,
 *     extensions: [ basicSetup, fsl() ],
 *   });
 */
export function fsl() {
  return new LanguageSupport(fslLanguage);
}
