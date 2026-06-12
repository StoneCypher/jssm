'use strict';

/**
 *  Declared feature catalog for the shootout grid — the editorial half of the
 *  Borland matrix, modeled on jssm's historic FeatureComparison taxonomy
 *  (Language Features / Notations / API / Docs+Community / Testing / Tools).
 *
 *  These are the rows the harness cannot machine-measure across arbitrary
 *  libraries (jssm-specific notation, tooling, docs). Each carries:
 *    - jssm / jssm6 : jssm's value (authoritative — verifiable from this repo).
 *    - fill         : optional key telling the grid to fill competitor cells
 *                     from MEASURED data instead of leaving them unassessed:
 *                       'cap:<flag>'      -> adapter capability flag
 *                       'static:types'    -> ships bundled types
 *                       'behavior:self'   -> self-transition works
 *                     When absent, competitor cells render '?' (declared,
 *                     to assess) — never fabricated.
 *    - demo/explain : an FSL demo (executed as a test vector when present) and
 *                     one-line explainer for the unfold.
 *
 *  Value glyphs: '✓' yes, '✗' no, '◐' planned (jssm 6), '?' not assessed.
 *
 *  @see https://stonecypher.github.io/jssm/docs/pages/FeatureComparison.html
 */

const Y = '✓', N = '✗', P = '◐', Q = '?';

module.exports = [

  // ===== Language Features =====
  { section: 'Language features', label: 'States',              jssm: Y, jssm6: Y, fill: 'always', demo: `a -> b;`, explain: 'Named states.' },
  { section: 'Language features', label: 'Transitions',         jssm: Y, jssm6: Y, fill: 'always', demo: `a -> b;`, explain: 'Edges between states.' },
  { section: 'Language features', label: 'Actions',             jssm: Y, jssm6: Y, fill: 'cap:action', demo: `a 'go' -> b;`, explain: 'Named-event dispatch (not just by target state).' },
  { section: 'Language features', label: 'Data / context',      jssm: Y, jssm6: Y, fill: 'cap:data', demo: `a -> b;`, explain: 'A data payload carried through transitions.' },
  { section: 'Language features', label: 'Typed data',          jssm: Y, jssm6: Y, fill: 'static:types', demo: `a -> b;`, explain: 'TypeScript-typed machine data.' },
  { section: 'Language features', label: 'General hooks',       jssm: Y, jssm6: Y, fill: 'cap:hook', demo: `a -> b -> a;`, explain: 'Observe/intercept any transition.' },
  { section: 'Language features', label: 'Specific hooks',      jssm: Y, jssm6: Y, demo: `a 'go' -> b;`, explain: 'Hook a specific edge or action.' },
  { section: 'Language features', label: 'Post-hooks',          jssm: Y, jssm6: Y, demo: `a -> b;`, explain: 'Hooks that fire after the transition commits.' },
  { section: 'Language features', label: 'Hook rejection',      jssm: Y, jssm6: Y, fill: 'cap:guard', demo: `a -> b;`, explain: 'A hook can veto a transition.' },
  { section: 'Language features', label: 'Timeouts (after)',    jssm: Y, jssm6: Y, fill: 'cap:timer', demo: `a -> b;\nb after 1000ms -> a;`, explain: 'Time-delayed automatic transitions.' },
  { section: 'Language features', label: 'Termination',         jssm: Y, jssm6: Y, demo: `a -> b;`, explain: 'Terminal/complete states.' },
  { section: 'Language features', label: 'Weighted edges',      jssm: Y, jssm6: Y, demo: null, explain: 'Probabilities on transitions, for weighted random walks.' },
  { section: 'Language features', label: 'State groups',        jssm: Y, jssm6: Y, demo: `[a b] ~> off;`, explain: 'Operate on a set of states at once (overlapping groups in 5.143).' },
  { section: 'Language features', label: 'Random walks',        jssm: Y, jssm6: Y, demo: `a 'n' -> b 'n' -> a;`, explain: 'Probabilistically walk the machine.' },
  { section: 'Language features', label: 'Serialization',       jssm: Y, jssm6: Y, demo: `a -> b;`, explain: 'Serialize/deserialize machine state.' },
  { section: 'Language features', label: 'Properties',          jssm: Y, jssm6: Y, demo: null, explain: 'Declared per-machine / per-state properties.' },
  { section: 'Language features', label: 'Hierarchical states', jssm: N, jssm6: P, demo: null, explain: 'Nested/compound states. Planned for jssm 6 via systems.' },
  { section: 'Language features', label: 'Machine composition', jssm: N, jssm6: P, demo: null, explain: 'Compose several machines into one. Planned for jssm 6 (systems).' },
  { section: 'Language features', label: 'Factories',           jssm: N, jssm6: P, demo: null, explain: 'Parameterised reusable machine templates. Planned for jssm 6.' },
  { section: 'Language features', label: 'Extended state vars', jssm: N, jssm6: P, demo: null, explain: 'Typed variables + expression language. Planned for jssm 6.' },
  { section: 'Language features', label: 'Named instances',     jssm: Y, jssm6: Y, demo: null, explain: 'Name and address machine instances.' },
  { section: 'Language features', label: 'Error hooks',         jssm: Y, jssm6: Y, demo: null, explain: 'Hooks on rejected/invalid transitions.' },

  // ===== Notations (jssm FSL) =====
  { section: 'Notation (FSL)', label: 'String DSL',     jssm: Y, jssm6: Y, demo: `a -> b -> c;`, explain: 'A dedicated textual state-machine language (FSL), not just object config.' },
  { section: 'Notation (FSL)', label: 'Wildcards',      jssm: Y, jssm6: Y, demo: null, explain: 'Match groups of states.' },
  { section: 'Notation (FSL)', label: 'Stripes',        jssm: Y, jssm6: Y, demo: `a -> b -> c -> d;`, explain: 'Chain many transitions on one line (a -> b -> c).' },
  { section: 'Notation (FSL)', label: 'Cycles',         jssm: Y, jssm6: Y, demo: `a -> b -> c -> a;`, explain: 'Close a chain back to its start.' },
  { section: 'Notation (FSL)', label: 'Arrow kinds',    jssm: Y, jssm6: Y, demo: `a -> b;\nc <=> d;\ne ~> f;`, explain: 'Distinct arrow kinds (legal / main / forced) with different semantics.' },
  { section: 'Notation (FSL)', label: 'State spread',   jssm: Y, jssm6: Y, demo: `[a b c] ~> off;`, explain: 'Apply one edge across a bracketed set of states.' },
  { section: 'Notation (FSL)', label: 'Complex labels', jssm: Y, jssm6: Y, demo: `a 'cook 🍳' -> b;`, explain: 'Rich edge labels (quoted, unicode, actions, weights, timing).' },

  // ===== API / reflection =====
  { section: 'API & reflection', label: 'Graph reflection API', jssm: Y, jssm6: Y, demo: null, explain: 'Query states, edges, exits, reachability at runtime.' },
  { section: 'API & reflection', label: 'History',             jssm: Y, jssm6: Y, demo: null, explain: 'Bounded visited-state/data history.' },
  { section: 'API & reflection', label: 'State histograms',    jssm: Y, jssm6: Y, demo: null, explain: 'Distribution of states over a random walk.' },
  { section: 'API & reflection', label: 'Automatic API',       jssm: Y, jssm6: Y, demo: null, explain: 'Generated per-machine API surface.' },

  // ===== Docs, support, community =====
  { section: 'Docs & community', label: 'Detailed errors',     jssm: Y, jssm6: Y, demo: null, explain: 'Errors that name states and explain the cause.' },
  { section: 'Docs & community', label: 'Defined start states',jssm: Y, jssm6: Y, demo: null, explain: 'Explicit, validated start states.' },
  { section: 'Docs & community', label: 'Probabilistic starts',jssm: Y, jssm6: Y, demo: null, explain: 'Weighted random initial state.' },
  { section: 'Docs & community', label: 'Graph renderer',      jssm: Y, jssm6: Y, demo: null, explain: 'Render the machine as a diagram (jssm-viz / Graphviz / SVG).' },
  { section: 'Docs & community', label: 'Visual styling',      jssm: Y, jssm6: Y, demo: null, explain: 'Theme and style the rendered diagram.' },
  { section: 'Docs & community', label: 'Compiler',            jssm: Y, jssm6: Y, demo: null, explain: 'Compile FSL source to a machine config.' },
  { section: 'Docs & community', label: 'Manual',              jssm: Y, jssm6: Y, demo: null, explain: 'A written manual, beyond API docs.' },
  { section: 'Docs & community', label: 'API samples',         jssm: Y, jssm6: Y, demo: null, explain: 'Worked examples per API entity (DocBlock @example).' },
  { section: 'Docs & community', label: 'Tutorial videos',     jssm: Q, jssm6: Q, demo: null, explain: 'Video tutorials. Not re-verified — historic grid is stale.' },
  { section: 'Docs & community', label: 'Example library',     jssm: Y, jssm6: Y, demo: null, explain: 'A gallery of example machines.' },

  // ===== Testing =====
  { section: 'Testing', label: '100% test coverage', jssm: Y, jssm6: Y, demo: null, explain: 'Full statement/branch coverage of the runtime.' },
  { section: 'Testing', label: 'Stochastic testing', jssm: Y, jssm6: Y, demo: null, explain: 'Property/fuzz testing with random plans.' },
  { section: 'Testing', label: 'Conformance suite',  jssm: Y, jssm6: Y, demo: null, explain: 'A behavior conformance test corpus.' },

  // ===== Tools =====
  { section: 'Tools', label: 'Live editor',      jssm: Y, jssm6: Y, demo: null, explain: 'A browser editor for FSL machines.' },
  { section: 'Tools', label: 'CLI',              jssm: Y, jssm6: Y, demo: null, explain: 'A command-line tool (render, etc.).' },
  { section: 'Tools', label: 'Graph Action',     jssm: Q, jssm6: Q, demo: null, explain: 'A GitHub Action. Not re-verified — historic grid is stale.' },
  { section: 'Tools', label: 'URL live-paste',   jssm: Y, jssm6: Y, demo: null, explain: 'Share a machine via URL.' },
  { section: 'Tools', label: 'Web components',   jssm: Y, jssm6: Y, demo: null, explain: '<jssm-viz> / <jssm-instance> custom elements.' },
  { section: 'Tools', label: 'Minified builds',  jssm: Y, jssm6: Y, demo: null, explain: 'Minified distribution bundles.' },
  { section: 'Tools', label: 'CLI render (svg/png/jpeg)', jssm: Y, jssm6: Y, demo: null, explain: 'Render a machine to SVG / PNG / JPEG from the command line.' },
  { section: 'Tools', label: 'Declarative WC tags', jssm: Q, jssm6: Q, demo: null, explain: '<jssm-bind> / <jssm-on> / <jssm-hook> / <jssm-action> custom elements. Not re-verified which shipped.' },

  // ===== Language features (batch 2 — mined from closed issues, jssm re-verified) =====
  { section: 'Language features', label: 'State properties',       jssm: Y, jssm6: Y, demo: null, explain: 'Per-state typed properties (number/string/bool/null/object/array), read via .prop/.props.' },
  { section: 'Language features', label: 'Property defaults/override', jssm: Y, jssm6: Y, demo: null, explain: 'Property defaults at the machine level, overridable per state.' },
  { section: 'Language features', label: 'Named numeric constants', jssm: Y, jssm6: Y, demo: null, explain: 'Inf / NaN / π / e / √2 / Epsilon / MaxSafeInt etc. as numeric literals (parser carries EulerConstant, LN2, NInf, …).' },
  { section: 'Language features', label: 'Injectable clock',       jssm: Y, jssm6: Y, demo: null, explain: 'Custom setTimeout/clearTimeout sources for `after` timers (deterministic tests).' },
  { section: 'Language features', label: 'Seeded / reproducible RNG', jssm: Y, jssm6: Y, demo: null, explain: 'Injectable seeded RNG for reproducible weighted random walks (gen_splitmix32).' },
  { section: 'Language features', label: 'Forced transitions',     jssm: Y, jssm6: Y, demo: `a ~> b;`, explain: 'Forced-only edges (~>) that bypass normal legality.' },
  { section: 'Language features', label: 'Event API (machine.on)', jssm: Y, jssm6: Y, demo: null, explain: 'A clean machine.on(...) observation API, separate from hooks.' },
  { section: 'Language features', label: 'Versioned serialization',jssm: Y, jssm6: Y, demo: null, explain: 'Serialization carries data + history + machine version + timestamp.' },

  // ===== Machine attributes (FSL) =====
  { section: 'Machine attributes', label: 'Metadata (author/version/license…)', jssm: Y, jssm6: Y, demo: null, explain: 'Declared machine metadata: author, version, license, comment, name, npm_name.' },
  { section: 'Machine attributes', label: 'Island control (allow_islands)',     jssm: Y, jssm6: Y, demo: null, explain: 'Allow / forbid disconnected components, optionally requiring a start.' },
  { section: 'Machine attributes', label: 'Override control (allows_override)',  jssm: Y, jssm6: Y, demo: null, explain: 'Permit direct state override outside normal transitions.' },
  { section: 'Machine attributes', label: 'Failed-output states',                jssm: Y, jssm6: Y, demo: null, explain: 'Declare states treated as failure outputs.' },
  { section: 'Machine attributes', label: 'Render-size hint (default_size)',     jssm: Y, jssm6: Y, demo: null, explain: 'A default rendering size hint for the diagram.' },

  // ===== API & reflection (batch 2) =====
  { section: 'API & reflection', label: 'is_start_state / is_end_state', jssm: Y, jssm6: Y, demo: null, explain: 'Query whether a state is a start or end state.' },
  { section: 'API & reflection', label: 'Introspection (uses_actions, …)', jssm: Y, jssm6: Y, demo: null, explain: 'uses_actions / uses_forced_transitions and similar machine-shape queries.' },
  { section: 'API & reflection', label: 'Property reflection',           jssm: Y, jssm6: Y, demo: null, explain: 'Enumerate property keys (.known_props) and read one (.known_prop).' },

  // ===== Notation (batch 2) =====
  { section: 'Notation (FSL)', label: 'Mixed arrows', jssm: Y, jssm6: Y, demo: `a <=> b;`, explain: 'Mixed-kind arrows (<=>, light/fat/tilde combinations) in one token.' },

  // ===== Visualization (jssm-viz) =====
  { section: 'Visualization', label: 'Graph rendering',        jssm: Y, jssm6: Y, demo: null, explain: 'Render the machine as a graph diagram.' },
  { section: 'Visualization', label: 'Per-state-kind styling', jssm: Y, jssm6: Y, demo: null, explain: 'Style start / end / current / terminal / hooked / standard states distinctly.' },
  { section: 'Visualization', label: 'Themes',                 jssm: Y, jssm6: Y, demo: null, explain: 'Selectable rendering themes (default / ocean / modern / plain / bold).' },
  { section: 'Visualization', label: 'Color support (rgb/rgba/named)', jssm: Y, jssm6: Y, demo: null, explain: 'RGB3/6, rgba4/8, and W3 named colors in styling.' },
  { section: 'Visualization', label: 'Layout direction',       jssm: Y, jssm6: Y, demo: null, explain: 'Control graph layout direction (graph_layout).' },
  { section: 'Visualization', label: 'SVG output',             jssm: Y, jssm6: Y, demo: null, explain: 'Vector SVG rendering.' },
  { section: 'Visualization', label: 'PNG / JPEG output',      jssm: Y, jssm6: Y, demo: null, explain: 'Raster image rendering with text labels.' },
  { section: 'Visualization', label: 'React component',        jssm: Q, jssm6: Q, demo: null, explain: 'A dedicated React component. Not re-verified.' },
  { section: 'Visualization', label: 'Editor (Monaco)',        jssm: Q, jssm6: Q, demo: null, explain: 'A Monaco-based FSL editor. Not re-verified.' },

];

module.exports.GLYPHS = { Y, N, P, Q };
