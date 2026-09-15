/**
 * build_fsl_tmlanguage.cjs — generate dist/grammars/fsl.tmLanguage.json, the
 * canonical TextMate grammar for FSL.
 *
 * A TextMate grammar (scope `source.fsl`) is ecosystem currency: it is what
 * shiki, GitHub Linguist, Monaco, Sublime, `bat`, and the VS Code extension
 * (vscode-fsl) all consume to colorize `.fsl` files and ` ```fsl ` fences.
 * jssm owns the peg (`src/ts/fsl_parser.peg`) that is the source of truth for
 * FSL's token inventory, so the grammar is authored and shipped here, next to
 * the parser, and mirrors the way `dist/cm6/` ships the CodeMirror language.
 *
 * The token tables below are transcribed from fsl_parser.peg. The spec
 * `src/buildjs/tests/fsl_tmlanguage.spec.ts` fails the build if the parser
 * grows an arrow spelling or config keyword the grammar doesn't cover, and if
 * the committed artifact drifts from what this generator emits — so the two
 * cannot silently diverge.
 *
 * Run:  node src/buildjs/build_fsl_tmlanguage.cjs   (writes the artifact)
 *
 * @example
 *   const { buildGrammar } = require('./build_fsl_tmlanguage.cjs');
 *   buildGrammar().scopeName;   // 'source.fsl'
 */

'use strict';

const { writeFileSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');

// ---------------------------------------------------------------------------
// Arrows. Kind names follow jssm's own scoping (pre_post, each side one of
// legal / main / forced / none). Spellings are transcribed from the Arrow
// rules of fsl_parser.peg. Kinds are emitted in length groups (mixed/4-char,
// then 3-char two-way, then 2-char directional) so a short arrow can never
// steal a longer arrow's opening characters during tokenization.
// ---------------------------------------------------------------------------

// group A — six mixed kinds (ASCII forms 4 chars; unicode-mixed 2-3 codepoints)
const ARROWS_A = [
  ['legal_main',   ['<-=>', '←=>', '<-⇒', '←⇒']],
  ['main_legal',   ['<=->', '⇐->', '<=→', '⇐→']],
  ['legal_forced', ['<-~>', '←~>', '<-↛', '←↛']],
  ['forced_legal', ['<~->', '↚->', '<~→', '↚→']],
  ['main_forced',  ['<=~>', '⇐~>', '<=↛', '⇐↛']],
  ['forced_main',  ['<~=>', '↚=>', '<~⇒', '↚⇒']],
];

// group B — three two-way kinds (ASCII 3 chars; unicode single glyph)
const ARROWS_B = [
  ['legal_legal',   ['<->', '↔']],
  ['main_main',     ['<=>', '⇔']],
  ['forced_forced', ['<~>', '↮']],
];

// group C — six directional kinds (ASCII 2 chars; unicode single glyph)
const ARROWS_C = [
  ['legal_none',  ['<-', '←']],
  ['none_legal',  ['->', '→']],
  ['main_none',   ['<=', '⇐']],
  ['none_main',   ['=>', '⇒']],
  ['forced_none', ['<~', '↚']],
  ['none_forced', ['~>', '↛']],
];

const ARROW_KINDS = [...ARROWS_A, ...ARROWS_B, ...ARROWS_C];

// ---------------------------------------------------------------------------
// Keyword vocabularies, transcribed from fsl_parser.peg.
// ---------------------------------------------------------------------------

// Structural keywords scoped flat: `state` (dual-use — `state:` config and
// `state Foo:` declaration) and `property` (property declarations). Both rarely
// collide with a state name. The other former keywords are context-scoped in
// buildGrammar() so they don't mis-color state names: the hook keywords
// `on`/`enter`/`exit`/`do` fire only in hook shape (`on <enter|exit> … do '…'`),
// and `after` only before a number. `default`/`required` are left unscoped —
// scoping `default` would wrongly color the `theme: default` config value.
const STRUCTURAL_KEYWORDS = ['state', 'property'];

// arrange declarations — their own pattern, longest-first so `arrange-start`
// wins over `arrange`.
const ARRANGE_KEYWORDS = ['arrange-start', 'arrange-end', 'oarrange', 'farrange', 'arrange'];

// config + machine-attribute keys, matched only when followed by `:`
// (entity.other.attribute-name).
const ATTRIBUTE_KEYS = [
  // machine attributes
  'fsl_version', 'machine_name', 'npm_name', 'machine_author', 'machine_contributor',
  'machine_comment', 'machine_definition', 'machine_reference', 'machine_version',
  'machine_license', 'machine_language', 'theme', 'dot_preamble', 'flow', 'hooks',
  'default_size',
  // config
  'graph_layout', 'start_states', 'end_states', 'failed_outputs', 'graph_bg_color',
  'allows_override', 'allow_islands', 'transition', 'graph', 'editor',
  // config state blocks
  'start_state', 'end_state', 'active_state', 'terminal_state', 'hooked_state',
  // editor items
  'stochastic_run_count', 'panels',
];

// style-item keys inside `{ ... }` blocks, matched only when followed by `:`
// (support.type.property-name). Compound (hyphenated) names first so `color`
// / `label` do not pre-empt `text-color` / `arc_label`.
const STYLE_KEYS = [
  'background-color', 'border-color', 'text-color', 'edge-color', 'edge_color',
  'line-style', 'linestyle', 'arc_label', 'head_label', 'tail_label',
  'corners', 'shape', 'image', 'color', 'label', 'url',
];

// ---------------------------------------------------------------------------
// Assembly.
// ---------------------------------------------------------------------------

const arrowPattern = ([kind, spellings]) => ({
  name:  `keyword.control.transition.${kind.replace(/_/g, '-')}.fsl`,
  match: `(?:${spellings.join('|')})`,
});

const alt = (words) => words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

/**
 * Build the TextMate grammar object.
 * @returns {object} the `source.fsl` grammar, ready to JSON-serialize.
 */
function buildGrammar() {
  const patterns = [
    // comments
    {
      name: 'comment.block.fsl',
      begin: '/\\*',
      beginCaptures: { '0': { name: 'punctuation.definition.comment.begin.fsl' } },
      end: '\\*/',
      endCaptures: { '0': { name: 'punctuation.definition.comment.end.fsl' } },
    },
    {
      name: 'comment.line.double-slash.fsl',
      begin: '//',
      beginCaptures: { '0': { name: 'punctuation.definition.comment.fsl' } },
      end: '$',
    },

    // strings — double-quoted label, single-quoted action
    {
      name: 'string.quoted.double.fsl',
      begin: '"',
      beginCaptures: { '0': { name: 'punctuation.definition.string.begin.fsl' } },
      end: '"',
      endCaptures: { '0': { name: 'punctuation.definition.string.end.fsl' } },
      patterns: [{ name: 'constant.character.escape.fsl', match: '\\\\.' }],
    },
    {
      name: 'string.quoted.single.action.fsl',
      begin: "'",
      beginCaptures: { '0': { name: 'punctuation.definition.string.begin.fsl' } },
      end: "'",
      endCaptures: { '0': { name: 'punctuation.definition.string.end.fsl' } },
      patterns: [{ name: 'constant.character.escape.fsl', match: '\\\\.' }],
    },

    // semver (before generic number)
    { name: 'constant.numeric.version.fsl', match: '\\b[0-9]+\\.[0-9]+\\.[0-9]+\\b' },

    // hex colors, longest-first
    {
      name: 'constant.other.color.rgb-value.fsl',
      match: '#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\\b',
    },

    // edge probability annotation
    { name: 'constant.numeric.percentage.fsl', match: '[0-9]+(?:\\.[0-9]+)?\\s*%' },

    // arrows — group A, then B, then C
    ...ARROW_KINDS.map(arrowPattern),

    // arrange declarations (longest-first)
    { name: 'keyword.control.arrange.fsl', match: `\\b(?:${alt(ARRANGE_KEYWORDS)})\\b` },

    // structural keywords (flat — `state`/`property` rarely collide with a state name)
    { name: 'keyword.control.fsl', match: `\\b(?:${alt(STRUCTURAL_KEYWORDS)})\\b` },

    // hook keywords, scoped only in hook shape so `on`/`enter`/`exit`/`do` used
    // as ordinary state names (e.g. `on 'flip' -> off;`) are not mis-colored.
    {
      match: '\\b(on)\\s+(enter|exit)\\b',
      captures: { '1': { name: 'keyword.control.fsl' }, '2': { name: 'keyword.control.fsl' } },
    },
    { name: 'keyword.control.fsl', match: "\\bdo\\b(?=\\s+')" },

    // `after` timer — only before a number, so an `after` state stays a label
    { name: 'keyword.control.fsl', match: '\\bafter\\b(?=\\s+[0-9])' },

    // config / machine-attribute keys (only before `:`)
    { name: 'entity.other.attribute-name.fsl', match: `\\b(?:${alt(ATTRIBUTE_KEYS)})\\b(?=\\s*:)` },

    // style-item keys (only before `:`)
    { name: 'support.type.property-name.fsl', match: `\\b(?:${alt(STYLE_KEYS)})\\b(?=\\s*:)` },

    // language constants
    { name: 'constant.language.fsl', match: '\\b(?:true|false|null|undefined)\\b' },

    // group spread + reference
    //
    // #754 (final review): the name half used to be the 5.x atom char set
    // ([0-9A-Za-z._!$^*?] first, plus +()&$#@!^- continuation) -- a group
    // reference's name is a bareword (fsl_parser.peg's Atom/Label), so it
    // follows the same Unicode identifier classes as #754 gave every other
    // bareword: first \p{L}/\p{Nl}/_, continuation adds \p{Mn}/\p{Mc}/
    // \p{Nd}/\p{Pc}. Oniguruma (the regex engine TextMate/VSCode grammars
    // run under) supports \p{...} property escapes natively, no `u` flag
    // needed -- unlike a native JS RegExp, where the class needs that flag
    // to mean anything; see fsl_tmlanguage.spec.ts's "every pattern regex
    // compiles" check, which only proves this string doesn't throw as a
    // (flagless) JS RegExp, not that it behaves the way Oniguruma runs it.
    { name: 'keyword.operator.spread.fsl', match: '\\.\\.\\.(?=\\s*&)' },
    {
      match: '(&)\\s*([\\p{L}\\p{Nl}_][\\p{L}\\p{Nl}\\p{Mn}\\p{Mc}\\p{Nd}\\p{Pc}_]*)',
      captures: {
        '1': { name: 'punctuation.definition.group.fsl' },
        '2': { name: 'variable.other.group.fsl' },
      },
    },

    // stripe / cycle arrange targets (before generic number)
    {
      match: '([+\\-]\\|)([0-9]+)',
      captures: {
        '1': { name: 'keyword.operator.stripe.fsl' },
        '2': { name: 'constant.numeric.fsl' },
      },
    },
    {
      match: '([+\\-])([0-9]+)\\b',
      captures: {
        '1': { name: 'keyword.operator.cycle.fsl' },
        '2': { name: 'constant.numeric.fsl' },
      },
    },

    // generic number
    { name: 'constant.numeric.fsl', match: '\\b[0-9]+(?:\\.[0-9]+)?\\b' },

    // punctuation
    { name: 'punctuation.terminator.fsl', match: ';' },
    { name: 'punctuation.separator.key-value.fsl', match: ':' },
    { name: 'punctuation.definition.list.fsl', match: '[\\[\\]]' },
    { name: 'punctuation.definition.block.fsl', match: '[{}]' },
  ];

  return {
    $schema: 'https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json',
    name: 'FSL',
    scopeName: 'source.fsl',
    fileTypes: ['fsl'],
    patterns,
  };
}

/** Serialize the grammar exactly as it is committed (trailing newline). */
function serializeGrammar() {
  return JSON.stringify(buildGrammar(), null, 2) + '\n';
}

/** Write the artifact to dist/grammars/fsl.tmLanguage.json. */
function writeGrammar(repoRoot = join(__dirname, '..', '..')) {
  const dir = join(repoRoot, 'dist', 'grammars');
  mkdirSync(dir, { recursive: true });
  const out = join(dir, 'fsl.tmLanguage.json');
  writeFileSync(out, serializeGrammar(), 'utf8');
  return out;
}

module.exports = {
  buildGrammar,
  serializeGrammar,
  writeGrammar,
  ARROW_KINDS,
  STRUCTURAL_KEYWORDS,
  ARRANGE_KEYWORDS,
  ATTRIBUTE_KEYS,
  STYLE_KEYS,
};

if (require.main === module) {
  const out = writeGrammar();
  const spellings = ARROW_KINDS.reduce((n, [, s]) => n + s.length, 0);
  console.log(`wrote ${out} — ${ARROW_KINDS.length} arrow kinds, ${spellings} arrow spellings`);
}
