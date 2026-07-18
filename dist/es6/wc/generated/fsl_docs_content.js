export const DOCS_PAGES = [
    {
        "id": "mealy-vs-moore",
        "section": "about-state-machines",
        "title": "Mealy vs Moore",
        "order": 20,
        "teaches": [],
        "mentions": [],
        "indexTerms": [
            "mealy",
            "moore",
            "output",
            "action",
            "theory"
        ],
        "body": "\n# Mealy vs Moore\n\nTwo classic models differ in *where the output lives*:\n\n- A **Moore machine** produces output based only on the **current state**. The output is a property of *being* in a state.\n- A **Mealy machine** produces output based on the **state and the transition** taken. The output is a property of *moving*.\n\nFSL can express both styles. Actions attached to transitions (`A 'go' -> B;`) read naturally as Mealy outputs; state-level behaviour reads as Moore. You rarely have to choose a camp — you model what the system does, and the distinction becomes a way to *describe* your machine rather than a constraint you fight.\n"
    },
    {
        "id": "what-is-an-fsm",
        "section": "about-state-machines",
        "title": "What is a state machine?",
        "order": 10,
        "teaches": [],
        "mentions": [],
        "indexTerms": [
            "fsm",
            "finite",
            "state",
            "transition",
            "theory",
            "automaton"
        ],
        "body": "\n# What is a state machine?\n\nA **finite state machine** is a system that is always in exactly one of a finite set of **states**, and moves between them through **transitions**. A transition fires in response to an input — in FSL, an **action**.\n\nThree ideas carry most of the weight:\n\n- **States** are the situations a system can be in: a door is *Open* or *Closed*; a traffic light is *Red*, *Yellow*, or *Green*.\n- **Transitions** are the allowed moves between states. A door can go *Closed → Open*, but a turnstile cannot go *Locked → Locked-and-paid* without paying first.\n- **Determinism** means that, from a given state and input, the next state is fixed. FSL machines are deterministic by construction.\n\nBecause the set of states is finite and the moves are explicit, a state machine is something you can *reason about* — and even *prove things about* — rather than just run.\n"
    },
    {
        "id": "ex-toggle",
        "section": "example-machines",
        "title": "Toggle",
        "order": 20,
        "teaches": [],
        "mentions": [
            "transitions"
        ],
        "indexTerms": [
            "toggle",
            "switch",
            "on",
            "off",
            "example"
        ],
        "body": "\n# Toggle\n\nThe smallest useful machine: two states and one action that flips between them.\n\n```fsl {run: true}\nOff 'flip' -> On 'flip' -> Off;\n```\n\nThis is the shape behind every checkbox, light switch, and feature flag — a single action bouncing the system between two states.\n"
    },
    {
        "id": "ex-traffic-light",
        "section": "example-machines",
        "title": "Traffic light",
        "order": 10,
        "teaches": [],
        "mentions": [
            "transitions",
            "timed-transitions"
        ],
        "indexTerms": [
            "traffic",
            "light",
            "example",
            "cycle"
        ],
        "body": "\n# Traffic light\n\nThe canonical state machine: three states that cycle on a timer. Load it and watch the diagram.\n\n```fsl {run: true}\nGreen after 5 -> Yellow;\nYellow after 2 -> Red;\nRed after 5 -> Green;\n```\n\nSwap the `after` clauses for actions (`Green 'advance' -> Yellow;`) to drive it by hand instead of by timer.\n"
    },
    {
        "id": "first-machine",
        "section": "getting-started",
        "title": "Your first machine",
        "order": 30,
        "teaches": [],
        "mentions": [
            "transitions"
        ],
        "indexTerms": [
            "first",
            "example",
            "quickstart",
            "machine"
        ],
        "body": "\n# Your first machine\n\nAn FSL file is a list of statements. The simplest machine is a chain of transitions. States are inferred from the arrows — you do not have to declare them.\n\nTry loading this into the editor and watch the diagram appear:\n\n```fsl {run: true}\nSolid 'crack' -> Liquid 'boil' -> Gas;\n```\n\nEach transition is a **source state**, an optional **action** in single quotes, an **arrow**, and a **target state**. Add `machine_name : \"…\";` at the top to give your machine a title.\n"
    },
    {
        "id": "using-the-editor",
        "section": "getting-started",
        "title": "Using the editor",
        "order": 20,
        "teaches": [],
        "mentions": [],
        "indexTerms": [
            "autocomplete",
            "layout",
            "theme",
            "diagram",
            "resize",
            "highlight"
        ],
        "body": "\n# Using the editor\n\n## Editing and autocomplete\n\nWrite FSL in the code pane. Suggestions appear as you type after a `:`, or on Ctrl+Space. At the start of a line you get **keys** — machine attributes, config, and (inside a `{ }` block) per-state style keys. After a key's `:` you get its **values** — shapes, layouts, directions, and the full SVG color list with a swatch preview.\n\n## The live diagram\n\nThe graph re-renders whenever the machine parses and compiles cleanly. While an edit is invalid, the last good diagram stays and the status bar shows the parser error.\n\n## Layouts\n\nThe **View** button chooses how the panes sit: side by side or stacked with the editor on either side, just the editor or just the viewer, or **Tabbed** — one pane at a time. **Auto** follows the window shape.\n\n## Resizing panes\n\nDrag any divider to resize — between the graph and code, or this docs panel and the rest. Double-click a divider to reset it.\n\n## Highlighting\n\nBeyond the base syntax colors, the editor reads the parsed machine to mark what the tokenizer cannot: color values get a swatch chip in their own color, state names are tinted apart from other identifiers, and shape values are marked as enums.\n\n## Theme\n\nThe sun / moon button switches between light and dark, and your choice is remembered.\n"
    },
    {
        "id": "welcome",
        "section": "getting-started",
        "title": "Welcome to FSL",
        "order": 10,
        "teaches": [],
        "mentions": [
            "transitions"
        ],
        "indexTerms": [
            "intro",
            "start",
            "hello"
        ],
        "body": "\n# Welcome to FSL\n\nFSL is a small language for finite state machines. Most machines are one line.\n\n```fsl {teaches: transitions, run: true}\nRed 'go' -> Green 'go' -> Yellow 'go' -> Red;\n```\n"
    },
    {
        "id": "tut-api-arrow-introspection",
        "section": "tutorials",
        "title": "API: arrow introspection",
        "order": 86,
        "teaches": [
            "api-arrow-introspection"
        ],
        "mentions": [
            "api-machine",
            "arrow-flavors"
        ],
        "indexTerms": [
            "arrow_direction",
            "arrow_left_kind",
            "arrow_right_kind",
            "API"
        ],
        "body": "\n# API: arrow introspection\n\n`arrow_direction`, `arrow_left_kind`, and `arrow_right_kind` decode an arrow token into its direction and per-side kind — useful when building tools that reason about transition semantics.\n\n```js\nimport { arrow_direction, arrow_right_kind } from 'jssm';\n\narrow_direction('<->');     // 'both'\narrow_right_kind('=>');     // 'main'\n```\n\nThe arrows they decode are the ones you write between states:\n\n```fsl {teaches: api-arrow-introspection, run: true}\na <-> b;\nb => c;\n```\n"
    },
    {
        "id": "tut-api-constants",
        "section": "tutorials",
        "title": "API: constants and vocabularies",
        "order": 84,
        "teaches": [
            "api-constants"
        ],
        "mentions": [
            "api-machine",
            "colors",
            "shapes"
        ],
        "indexTerms": [
            "named_colors",
            "gviz_shapes",
            "constants",
            "FslDirections",
            "API"
        ],
        "body": "\n# API: constants and vocabularies\n\nThe library exports the vocabularies the grammar accepts, so editors and tools never have to hard-code them: `named_colors`, `gviz_shapes`, `shapes`, `FslDirections`, and the `constants` bundle.\n\n```js\nimport { named_colors, gviz_shapes, FslDirections } from 'jssm';\n\nnamed_colors.includes('ForestGreen'); // true\ngviz_shapes.includes('doublecircle');  // true\n```\n\nThese are the exact values that style a machine:\n\n```fsl {teaches: api-constants, run: true}\nstate Go : { color: ForestGreen; shape: doublecircle; };\nStop 'go' -> Go;\n```\n"
    },
    {
        "id": "tut-api-hook-helpers",
        "section": "tutorials",
        "title": "API: hook result helpers",
        "order": 88,
        "teaches": [
            "api-hook-helpers"
        ],
        "mentions": [
            "api-machine",
            "hooks"
        ],
        "indexTerms": [
            "is_hook_rejection",
            "hook result",
            "abstract_hook_step",
            "API"
        ],
        "body": "\n# API: hook result helpers\n\nWhen you attach hooks from JavaScript, the result helpers — `is_hook_rejection`, `is_hook_complex_result`, `abstract_hook_step` — classify what a hook returned so you can react to a rejection or a complex result uniformly.\n\n```js\nimport { sm, is_hook_rejection } from 'jssm';\n\nconst m = sm`a 'go' -> b;`;\nm.hook('a', 'b', () => false);   // a hook that rejects the transition\nis_hook_rejection(false);        // true\n```\n\nHooks attach to the boundaries of a machine like this one:\n\n```fsl {teaches: api-hook-helpers, run: true}\non exit a do 'log';\na 'go' -> b;\n```\n"
    },
    {
        "id": "tut-api-language-service",
        "section": "tutorials",
        "title": "API: the language service",
        "order": 92,
        "teaches": [
            "api-language-service"
        ],
        "mentions": [
            "api-machine",
            "editor-language-support"
        ],
        "indexTerms": [
            "fslCompletions",
            "fslDiagnostics",
            "fslSemanticSpans",
            "language service",
            "API"
        ],
        "body": "\n# API: the language service\n\nFor building editors, the language-service exports turn FSL text into editor primitives: `fslCompletions` (context-aware suggestions), `fslDiagnostics` (parse/compile errors), and `fslSemanticSpans` (token spans for highlighting).\n\n```js\nimport { fslDiagnostics, fslCompletions } from 'jssm';\n\nfslDiagnostics('a -> ');          // reports the parse error\nfslCompletions('machine_', 8);    // suggests machine_name, machine_author, …\n```\n\nThey operate on raw FSL source, the same text you would otherwise compile:\n\n```fsl {teaches: api-language-service, run: true}\nmachine_name : \"Sample\";\na 'go' -> b;\n```\n"
    },
    {
        "id": "tut-api-machine",
        "section": "tutorials",
        "title": "API: the Machine and its factories",
        "order": 80,
        "teaches": [
            "api-machine"
        ],
        "mentions": [
            "transitions",
            "states"
        ],
        "indexTerms": [
            "sm",
            "from",
            "compile",
            "Machine",
            "transition",
            "API"
        ],
        "body": "\n# API: the Machine and its factories\n\nIn JavaScript, the quickest way to build a machine is the `sm` template tag. It compiles an FSL string into a live `Machine` you can drive with `.transition()`.\n\n```js\nimport { sm } from 'jssm';\n\nconst traffic = sm`Red 'go' -> Green 'go' -> Yellow 'go' -> Red;`;\ntraffic.state;                 // 'Red'\ntraffic.transition('go');      // true; now in 'Green'\n```\n\nThe machine this compiles from is just ordinary FSL:\n\n```fsl {teaches: api-machine, run: true}\nRed 'go' -> Green 'go' -> Yellow 'go' -> Red;\n```\n\n`sm` is the terse path; `from(...)` and `compile(...)` give you the same `Machine` with more control over options, and `deserialize` rebuilds one from saved state.\n"
    },
    {
        "id": "tut-api-utilities",
        "section": "tutorials",
        "title": "API: utility exports",
        "order": 90,
        "teaches": [
            "api-utilities"
        ],
        "mentions": [
            "api-machine",
            "weighted-arrows"
        ],
        "indexTerms": [
            "seq",
            "unique",
            "weighted_rand_select",
            "sleep",
            "utility",
            "API"
        ],
        "body": "\n# API: utility exports\n\nA handful of small utilities ride along with the package — `seq`, `unique`, `find_repeated`, `weighted_rand_select`, `sleep`, and friends. They back the stochastic tooling and are handy on their own.\n\n```js\nimport { seq, unique, weighted_rand_select } from 'jssm';\n\nseq(3);                                   // [0, 1, 2]\nunique([1, 1, 2, 3, 3]);                  // [1, 2, 3]\nweighted_rand_select([[0.7, 'win'], [0.3, 'lose']]);\n```\n\n`weighted_rand_select` is the engine behind probabilistic transitions:\n\n```fsl {teaches: api-utilities, run: true}\nIdle -> 70% Win;\nIdle -> 30% Lose;\n```\n"
    },
    {
        "id": "tut-api-version-info",
        "section": "tutorials",
        "title": "API: version and build info",
        "order": 82,
        "teaches": [
            "api-version-info"
        ],
        "mentions": [
            "api-machine"
        ],
        "indexTerms": [
            "version",
            "build_time",
            "compareVersions",
            "API"
        ],
        "body": "\n# API: version and build info\n\nThe package exports its own `version` and `build_time`, plus `compareVersions` for ordering SemVer strings.\n\n```js\nimport { version, build_time, compareVersions } from 'jssm';\n\nversion;                          // e.g. '5.149.2'\ncompareVersions('5.2.0', '5.10.0'); // -1  (5.2.0 is older)\n```\n\nThis is the same machinery `fsl_version` ranges lean on:\n\n```fsl {teaches: api-version-info, run: true}\nfsl_version : 5.0.0;\na 'go' -> b;\n```\n"
    },
    {
        "id": "tut-arrange",
        "section": "tutorials",
        "title": "Layout hints (arrange)",
        "order": 60,
        "teaches": [
            "arrange"
        ],
        "mentions": [
            "states"
        ],
        "indexTerms": [
            "arrange",
            "layout",
            "rank",
            "position"
        ],
        "body": "\n# Layout hints (arrange)\n\n`arrange [ … ];` nudges the layout engine to place a set of states on the same rank (row/column). Use `arrange-start` / `arrange-end` to pin states to the first or last rank.\n\n```fsl {teaches: arrange, run: true}\narrange [a b];\na -> b;\nc -> d;\narrange [c d];\n```\n\nArrange is purely presentational — it changes how the diagram is drawn, never the machine's behaviour.\n"
    },
    {
        "id": "tut-arrow-decorations",
        "section": "tutorials",
        "title": "Per-arrow decorations",
        "order": 68,
        "teaches": [
            "arrow-decorations"
        ],
        "mentions": [
            "transitions",
            "colors"
        ],
        "indexTerms": [
            "edge-color",
            "arc_label",
            "head_label",
            "tail_label",
            "per-arrow"
        ],
        "body": "\n# Per-arrow decorations\n\nA `{ … }` block placed **between an arrow and its target** decorates that one edge — its color, line style, or labels (`arc_label`, `head_label`, `tail_label`).\n\n```fsl {teaches: arrow-decorations, run: true}\na -> {edge-color: SteelBlue;} b;\nb -> {arc_label: retry;} a;\n```\n\nThis is the per-edge counterpart to the `transition: {}` default block: use the block for machine-wide edge defaults, a decoration for a single distinctive edge. (`edge_color` with an underscore is accepted as a legacy alias of `edge-color`.)\n"
    },
    {
        "id": "tut-arrow-flavors",
        "section": "tutorials",
        "title": "Arrow flavors",
        "order": 64,
        "teaches": [
            "arrow-flavors"
        ],
        "mentions": [
            "transitions"
        ],
        "indexTerms": [
            "arrow",
            "fat arrow",
            "tilde arrow",
            "main",
            "forced",
            "=>",
            "~>"
        ],
        "body": "\n# Arrow flavors\n\nBeyond the plain legal arrow `->`, FSL has arrows that carry *intent*: `=>` is the **main** path (the expected route), and `~>` is a **forced** transition (the machine takes it on its own). Bidirectional forms (`<->`, `<=>`, `<~>`) declare both directions at once.\n\n```fsl {teaches: arrow-flavors, run: true}\nRed 'tick' => Green 'tick' => Yellow 'tick' => Red;\nDoor 'panic' ~> Open;\n```\n\nUnicode glyphs (`→`, `⇒`, `↔`) are accepted as synonyms for the ASCII forms, if you prefer them.\n"
    },
    {
        "id": "tut-cli-dispatcher",
        "section": "tutorials",
        "title": "CLI: the fsl command",
        "order": 130,
        "teaches": [
            "cli-dispatcher"
        ],
        "mentions": [
            "cli-render"
        ],
        "indexTerms": [
            "cli",
            "fsl",
            "dispatcher",
            "--help",
            "--version"
        ],
        "body": "\n# CLI: the fsl command\n\nThe `fsl` command is the entry point (with `jssm` as an alias). It dispatches subcommands and supports the usual `--help` / `--version` flags.\n\n```sh\nfsl --version\nfsl --help\nfsl render machine.fsl\n```\n\nThe files it works on contain ordinary FSL:\n\n```fsl {teaches: cli-dispatcher, run: true}\nmachine_name : \"From a file\";\na 'go' -> b;\n```\n"
    },
    {
        "id": "tut-cli-export-prompt",
        "section": "tutorials",
        "title": "CLI: fsl export-system-prompt",
        "order": 136,
        "teaches": [
            "cli-export-prompt"
        ],
        "mentions": [
            "cli-dispatcher"
        ],
        "indexTerms": [
            "system prompt",
            "llms.txt",
            "export prompt"
        ],
        "body": "\n# CLI: fsl export-system-prompt\n\n`fsl-export-system-prompt` prints an `llms.txt`-style FSL syntax guide for feeding to a large language model, so an agent can generate idiomatic FSL.\n\n```sh\nfsl-export-system-prompt > fsl-llms.txt\n```\n\nThe prompt teaches an LLM to produce machines like:\n\n```fsl {teaches: cli-export-prompt, run: true}\nmachine_name : \"Generated\";\nIdle 'start' -> Running 'stop' -> Idle;\n```\n"
    },
    {
        "id": "tut-cli-render-targets",
        "section": "tutorials",
        "title": "CLI: render output formats",
        "order": 134,
        "teaches": [
            "cli-render-targets"
        ],
        "mentions": [
            "cli-render"
        ],
        "indexTerms": [
            "svg",
            "png",
            "jpeg",
            "dot",
            "html",
            "format",
            "export"
        ],
        "body": "\n# CLI: render output formats\n\n`fsl render` can emit several formats via `--target`: `svg` (default), `png`, `jpeg`, `dot`, and `html`.\n\n```sh\nfsl render machine.fsl --target png  -o machine.png\nfsl render machine.fsl --target dot  -o machine.dot\n```\n\nThe same machine renders to any of them:\n\n```fsl {teaches: cli-render-targets, run: true}\na 'go' -> b 'go' -> c;\n```\n"
    },
    {
        "id": "tut-cli-render",
        "section": "tutorials",
        "title": "CLI: fsl render",
        "order": 132,
        "teaches": [
            "cli-render"
        ],
        "mentions": [
            "cli-dispatcher",
            "viz-render"
        ],
        "indexTerms": [
            "render",
            "cli render",
            "fsl-render"
        ],
        "body": "\n# CLI: fsl render\n\n`fsl render` turns an `.fsl` file into a diagram from the command line (the `fsl-render` binary does the same standalone).\n\n```sh\nfsl render traffic.fsl -o traffic.svg\n```\n\nGiven a machine file like:\n\n```fsl {teaches: cli-render, run: true}\nRed 'go' -> Green 'go' -> Yellow 'go' -> Red;\n```\n\n…it writes out the rendered diagram — handy in build scripts and CI.\n"
    },
    {
        "id": "tut-colors",
        "section": "tutorials",
        "title": "Colors",
        "order": 40,
        "teaches": [
            "colors"
        ],
        "mentions": [
            "state-styling"
        ],
        "indexTerms": [
            "color",
            "svg color",
            "hex",
            "background-color"
        ],
        "body": "\n# Colors\n\nAnywhere a color is expected you can use a **PascalCase SVG color name** (the canonical form) or a `#rrggbb` **hex** value. The lowercase form (`forestgreen`) also parses, but PascalCase is preferred.\n\n```fsl {teaches: colors, run: true}\nstate Go   : { color: ForestGreen; };\nstate Stop : { color: #b91c1c; };\nStop 'go' -> Go 'stop' -> Stop;\n```\n\nThe same color vocabulary is used for `color`, `background-color`, `border-color`, and the graph defaults.\n"
    },
    {
        "id": "tut-comments",
        "section": "tutorials",
        "title": "Comments",
        "order": 4,
        "teaches": [
            "comments"
        ],
        "mentions": [],
        "indexTerms": [
            "comment",
            "line comment",
            "block comment"
        ],
        "body": "\n# Comments\n\nFSL has line comments (`//` to end of line) and block comments (`/* … */`), just like C or JavaScript.\n\n```fsl {teaches: comments, run: true}\n// a one-line note\na 'go' -> b;\n/* a block comment\n   spanning lines */\nb 'go' -> a;\n```\n\nComments are ignored by the parser — use them freely to annotate intent.\n"
    },
    {
        "id": "tut-config-blocks",
        "section": "tutorials",
        "title": "Configuration blocks",
        "order": 50,
        "teaches": [
            "config-blocks"
        ],
        "mentions": [
            "state-styling"
        ],
        "indexTerms": [
            "config",
            "state defaults",
            "transition defaults",
            "graph"
        ],
        "body": "\n# Configuration blocks\n\nA `keyword : { … };` block sets **defaults** for a whole class of things at once — every state, every transition (edge), or the graph as a whole — instead of styling each one inline.\n\n```fsl {teaches: config-blocks, run: true}\nstate : {\n  background-color : WhiteSmoke;\n};\ntransition : {\n  color : SlateGray;\n};\na 'go' -> b 'go' -> a;\n```\n\nThe block forms are `state`, `start_state`, `end_state`, `active_state`, `terminal_state`, `hooked_state`, `transition`, and `graph`. They accept the same style vocabulary as a per-state block.\n"
    },
    {
        "id": "tut-corners",
        "section": "tutorials",
        "title": "Corner styles",
        "order": 72,
        "teaches": [
            "corners"
        ],
        "mentions": [
            "state-styling"
        ],
        "indexTerms": [
            "corners",
            "rounded",
            "regular",
            "lined"
        ],
        "body": "\n# Corner styles\n\nThe `corners` key softens or squares a state's box — `regular` (sharp), `rounded`, or `lined`.\n\n```fsl {teaches: corners, run: true}\nstate Draft : { corners: rounded; };\nDraft 'publish' -> Live;\n```\n\n`rounded` corners pair well with a `box` shape for a softer, card-like node.\n"
    },
    {
        "id": "tut-directions",
        "section": "tutorials",
        "title": "Directions",
        "order": 62,
        "teaches": [
            "directions"
        ],
        "mentions": [
            "arrange",
            "machine-attributes"
        ],
        "indexTerms": [
            "direction",
            "flow",
            "up",
            "down",
            "left",
            "right"
        ],
        "body": "\n# Directions\n\nA direction — `up`, `down`, `left`, or `right` — sets the **flow** of the diagram, i.e. which way the graph grows.\n\n```fsl {teaches: directions, run: true}\nflow: right;\na 'go' -> b 'go' -> c 'go' -> d;\n```\n\n`flow: down` (the default) stacks states top-to-bottom; `flow: right` lays them left-to-right, which often reads better for linear pipelines.\n"
    },
    {
        "id": "tut-document-structure",
        "section": "tutorials",
        "title": "Document structure",
        "order": 2,
        "teaches": [
            "doc-structure"
        ],
        "mentions": [
            "transitions"
        ],
        "indexTerms": [
            "document",
            "statement",
            "term",
            "semicolon"
        ],
        "body": "\n# Document structure\n\nAn FSL file is a flat list of **statements**, each ended with a semicolon. Order rarely matters — transitions, state declarations, and machine attributes can appear in any sequence.\n\n```fsl {teaches: doc-structure, run: true}\nmachine_name : \"Tiny\";\na 'go' -> b;\nb 'go' -> a;\n```\n\nWhitespace and blank lines are free. That is the whole shape of a document: statements, separated by semicolons.\n"
    },
    {
        "id": "tut-editor-highlighting",
        "section": "tutorials",
        "title": "Editor: syntax highlighting",
        "order": 112,
        "teaches": [
            "editor-highlighting"
        ],
        "mentions": [
            "editor-language-support"
        ],
        "indexTerms": [
            "highlight",
            "syntax color",
            "deprecated marker",
            "editor"
        ],
        "body": "\n# Editor: syntax highlighting\n\n`fslHighlightStyle` is the highlight style the language support uses; `fslDeprecated` is a token modifier that marks deprecated keywords so an editor can grey them out.\n\n```js\nimport { fslHighlightStyle } from 'jssm/cm6';\nimport { syntaxHighlighting } from '@codemirror/language';\n\nconst extensions = [ syntaxHighlighting(fslHighlightStyle) ];\n```\n\nThe highlighter colours the parts of a machine differently — keywords, state names, values:\n\n```fsl {teaches: editor-highlighting, run: true}\nstate Go : { shape: doublecircle; };\nStop 'go' -> Go;\n```\n"
    },
    {
        "id": "tut-editor-keyword-sets",
        "section": "tutorials",
        "title": "Editor: keyword classification sets",
        "order": 114,
        "teaches": [
            "editor-keyword-sets"
        ],
        "mentions": [
            "editor-highlighting"
        ],
        "indexTerms": [
            "keywords",
            "structural",
            "property",
            "enum",
            "editor"
        ],
        "body": "\n# Editor: keyword classification sets\n\nThe language support exports the keyword sets it uses to classify tokens — `STRUCTURAL_KEYWORDS`, `PROPERTY_KEYWORDS`, `ENUM_KEYWORDS`, and `DEPRECATED_KEYWORDS` — so tools can reuse the same vocabulary.\n\n```js\nimport { STRUCTURAL_KEYWORDS, ENUM_KEYWORDS } from 'jssm/cm6';\n\nSTRUCTURAL_KEYWORDS.has('state');     // true\nENUM_KEYWORDS.has('doublecircle');    // true\n```\n\nThese are the words an editor highlights specially in a machine:\n\n```fsl {teaches: editor-keyword-sets, run: true}\nstate Final : { shape: doublecircle; };\na 'go' -> Final;\n```\n"
    },
    {
        "id": "tut-editor-language-support",
        "section": "tutorials",
        "title": "Editor: CodeMirror 6 language support",
        "order": 110,
        "teaches": [
            "editor-language-support"
        ],
        "mentions": [
            "doc-structure"
        ],
        "indexTerms": [
            "codemirror",
            "cm6",
            "language support",
            "editor"
        ],
        "body": "\n# Editor: CodeMirror 6 language support\n\nThe `jssm/cm6` entry provides FSL language support for CodeMirror 6 — `fsl()` returns a `LanguageSupport` extension you drop into an editor.\n\n```js\nimport { EditorView } from '@codemirror/view';\nimport { fsl } from 'jssm/cm6';\n\nnew EditorView({\n  doc: `a 'go' -> b;`,\n  extensions: [fsl()],\n  parent: document.body,\n});\n```\n\nIt highlights the FSL you type — declarations, attributes, and values:\n\n```fsl {teaches: editor-language-support, run: true}\nmachine_name : \"Demo\";\na 'go' -> b;\n```\n"
    },
    {
        "id": "tut-groups",
        "section": "tutorials",
        "title": "Groups and named lists",
        "order": 44,
        "teaches": [
            "groups"
        ],
        "mentions": [
            "states"
        ],
        "indexTerms": [
            "group",
            "named list",
            "&",
            "set",
            "reusable"
        ],
        "body": "\n# Groups and named lists\n\nA **named list** with `&name : [ … ];` gives a reusable set of states a single handle. It groups states visually and lets you refer to the set by name.\n\n```fsl {teaches: groups, run: true}\n&warm : [Red Orange Yellow];\nRed 'next' -> Orange 'next' -> Yellow 'next' -> Red;\n```\n\nMembers are separated by spaces inside the brackets. Groups are how you draw clusters and (in later features) attach shared behaviour.\n"
    },
    {
        "id": "tut-hooks",
        "section": "tutorials",
        "title": "Boundary hooks",
        "order": 46,
        "teaches": [
            "hooks"
        ],
        "mentions": [
            "states",
            "groups"
        ],
        "indexTerms": [
            "hook",
            "on enter",
            "on exit",
            "boundary",
            "callback"
        ],
        "body": "\n# Boundary hooks\n\nA **boundary hook** runs an action when the machine enters or exits a state (or a group). The form is `on enter|exit <state> do '<action>';`.\n\n```fsl {teaches: hooks, run: true}\non enter Locked do 'beep';\nUnlocked 'lock' -> Locked 'unlock' -> Unlocked;\n```\n\nHooks fire on the *boundary* — the transition into or out of the named state — which is how you wire side effects to a machine without entangling them in the transitions themselves.\n"
    },
    {
        "id": "tut-labels-quoting",
        "section": "tutorials",
        "title": "Labels and quoting",
        "order": 8,
        "teaches": [
            "labels-quoting"
        ],
        "mentions": [
            "states",
            "transitions"
        ],
        "indexTerms": [
            "label",
            "string",
            "atom",
            "quote",
            "action"
        ],
        "body": "\n# Labels and quoting\n\nState names and action names are **labels**. A bare label (an *atom*) needs no quotes when it is a simple identifier — `Red`, `idle_2`. Anything with spaces or punctuation must be quoted, and the two quote styles mean different things:\n\n- **Single quotes** mark **action labels** — `'insert coin'`.\n- **Double quotes** mark **string literals** — used for attributes like `machine_name`.\n\n```fsl {teaches: labels-quoting, run: true}\nmachine_name : \"Vending Machine\";\nIdle 'insert coin' -> Paid;\nPaid 'refund' -> Idle;\n```\n\nThe quote styles are not interchangeable: single = action, double = string.\n"
    },
    {
        "id": "tut-line-styles",
        "section": "tutorials",
        "title": "Line styles",
        "order": 56,
        "teaches": [
            "line-styles"
        ],
        "mentions": [
            "state-styling"
        ],
        "indexTerms": [
            "line-style",
            "dashed",
            "dotted",
            "solid",
            "bold"
        ],
        "body": "\n# Line styles\n\nThe `line-style` key controls how a border or edge is stroked — `solid` (the default), `dashed`, `dotted`, or `bold`.\n\n```fsl {teaches: line-styles, run: true}\nstate Pending : { line-style: dashed; };\nIdle 'submit' -> Pending 'confirm' -> Done;\n```\n\nOn a state it styles the node border; in a `transition: {}` block it styles edges — handy for visually distinguishing tentative or fallback paths.\n"
    },
    {
        "id": "tut-literal-values",
        "section": "tutorials",
        "title": "Literal values",
        "order": 48,
        "teaches": [
            "literal-values"
        ],
        "mentions": [
            "single-value-configs"
        ],
        "indexTerms": [
            "true",
            "false",
            "null",
            "undefined",
            "boolean"
        ],
        "body": "\n# Literal values\n\nA few configuration keys take literal values rather than labels: booleans (`true` / `false`), `null`, and `undefined`. They appear in the on/off-style config keys.\n\n```fsl {teaches: literal-values, run: true}\nallows_override : true;\nallow_islands   : false;\na 'go' -> b;\n```\n\nThese are the same literals you would recognise from JavaScript — `true`/`false` toggle a feature, and `undefined` leaves it at its default.\n"
    },
    {
        "id": "tut-machine-attributes",
        "section": "tutorials",
        "title": "Machine attributes",
        "order": 25,
        "teaches": [
            "machine-attributes"
        ],
        "mentions": [
            "semver",
            "labels-quoting"
        ],
        "indexTerms": [
            "machine_name",
            "machine_author",
            "fsl_version",
            "theme",
            "metadata"
        ],
        "body": "\n# Machine attributes\n\nTop-level `key : value;` lines attach **metadata** to the machine — its name, author, version, license, theme, and more.\n\n```fsl {teaches: machine-attributes, run: true}\nmachine_name    : \"Traffic Light\";\nmachine_author  : \"Jane Doe\";\nmachine_version : 1.2.0;\nfsl_version     : 5.0.0;\n\nRed 'tick' -> Green 'tick' -> Yellow 'tick' -> Red;\n```\n\nMost attributes are optional. `machine_name` appears in visualizations; `fsl_version` declares the language version the machine targets (see version ranges).\n"
    },
    {
        "id": "tut-prompt-examples",
        "section": "tutorials",
        "title": "LLM prompt: worked examples",
        "order": 142,
        "teaches": [
            "prompt-examples"
        ],
        "mentions": [
            "prompt-overview"
        ],
        "indexTerms": [
            "example",
            "basic machine",
            "actions"
        ],
        "body": "\n# LLM prompt: worked examples\n\nThe Syntax Guide section carries worked examples an LLM can pattern-match: a Basic Machine, Actions and Multiple Targets, and Explicit State Declarations. The explicit-state example shows styled `state` blocks:\n\n```fsl {teaches: prompt-examples, run: true}\nstate Red : {\n  background-color : red;\n  text-color       : white;\n};\n\nstate Green : {\n  background-color : green;\n};\n\nRed -> Green;\n```\n\nThese are the same patterns the rest of this curriculum teaches — the prompt distils them for a machine reader.\n"
    },
    {
        "id": "tut-prompt-overview",
        "section": "tutorials",
        "title": "LLM prompt: overview",
        "order": 140,
        "teaches": [
            "prompt-overview"
        ],
        "mentions": [
            "cli-export-prompt"
        ],
        "indexTerms": [
            "llms.txt",
            "system prompt",
            "agent",
            "concepts"
        ],
        "body": "\n# LLM prompt: overview\n\nThe exported system prompt is organized into sections: **Core Concepts** (machines, states, transition types, actions, probabilities, attributes), a **Syntax Guide**, and **Agent Directives** (rules like \"always output valid FSL\", \"use single quotes for actions\").\n\n```sh\nfsl-export-system-prompt | less\n```\n\nIt is built to make an LLM produce correct FSL the first time — for example:\n\n```fsl {teaches: prompt-overview, run: true}\nmachine_name : \"Simple Traffic Light\";\nRed 'timer' => Green 'timer' => Yellow 'timer' => Red;\n```\n"
    },
    {
        "id": "tut-shapes",
        "section": "tutorials",
        "title": "State shapes",
        "order": 70,
        "teaches": [
            "shapes"
        ],
        "mentions": [
            "state-styling"
        ],
        "indexTerms": [
            "shape",
            "circle",
            "doublecircle",
            "box",
            "ellipse"
        ],
        "body": "\n# State shapes\n\nThe `shape` key draws a state as one of Graphviz's node shapes — `circle`, `doublecircle`, `box`, `ellipse`, `diamond`, and dozens more.\n\n```fsl {teaches: shapes, run: true}\nstate Start : { shape: circle; };\nstate Final : { shape: doublecircle; };\nStart 'run' -> Final;\n```\n\nA common idiom: `doublecircle` for accepting/final states, plain `circle` or `box` for the rest — an at-a-glance convention borrowed from automata diagrams.\n"
    },
    {
        "id": "tut-single-value-configs",
        "section": "tutorials",
        "title": "Single-value configuration",
        "order": 52,
        "teaches": [
            "single-value-configs"
        ],
        "mentions": [
            "config-blocks"
        ],
        "indexTerms": [
            "graph_layout",
            "allow_islands",
            "allows_override",
            "failed_outputs"
        ],
        "body": "\n# Single-value configuration\n\nSome settings are a single `key : value;` rather than a block — graph layout, island rules, override permission, and similar machine-wide switches.\n\n```fsl {teaches: single-value-configs, run: true}\ngraph_layout  : circo;\nallow_islands : false;\na 'go' -> b;\n```\n\n`graph_layout` chooses a Graphviz engine (`dot`, `circo`, `fdp`, `neato`, `twopi`); `allow_islands` controls whether disconnected components are permitted.\n"
    },
    {
        "id": "tut-state-styling",
        "section": "tutorials",
        "title": "State styling",
        "order": 42,
        "teaches": [
            "state-styling"
        ],
        "mentions": [
            "colors",
            "shapes"
        ],
        "indexTerms": [
            "style",
            "background-color",
            "border-color",
            "shape",
            "state"
        ],
        "body": "\n# State styling\n\nA `state` declaration can carry style keys that control how the node is drawn: `color`, `text-color`, `background-color`, `border-color`, `shape`, `corners`, `line-style`, `image`, and `url`.\n\n```fsl {teaches: state-styling, run: true}\nstate Active : {\n  background-color : LightYellow;\n  border-color     : GoldenRod;\n  shape            : doublecircle;\n};\nIdle 'start' -> Active 'stop' -> Idle;\n```\n\nThese are the same keys the autocomplete offers inside a `{ }` block, and the same vocabulary the `state: {}` default-config block accepts.\n"
    },
    {
        "id": "tut-states-and-styling",
        "section": "tutorials",
        "title": "States and styling",
        "order": 20,
        "teaches": [
            "states"
        ],
        "mentions": [
            "state-styling",
            "colors"
        ],
        "indexTerms": [
            "state",
            "declaration",
            "style",
            "color",
            "shape"
        ],
        "body": "\n# States and styling\n\nMost states are inferred from transitions, but you can **declare** a state explicitly to give it a style. A declaration is `state Name { … };` with style keys inside.\n\n```fsl {teaches: states, run: true}\nstate On : {\n  background-color : green;\n};\n\nOff 'flip' -> On 'flip' -> Off;\n```\n\nInside the block you can set `background-color`, `text-color`, `border-color`, `shape`, `corners`, and more — the same vocabulary the autocomplete offers after a `:`. Declared or not, a state still participates in transitions exactly the same way.\n"
    },
    {
        "id": "tut-timed-transitions",
        "section": "tutorials",
        "title": "Timed transitions",
        "order": 30,
        "teaches": [
            "timed-transitions"
        ],
        "mentions": [
            "transitions"
        ],
        "indexTerms": [
            "after",
            "timeout",
            "delay",
            "timer",
            "seconds"
        ],
        "body": "\n# Timed transitions\n\nA transition can fire **on its own after a delay** using `after`. This is how you model timeouts — a traffic light that advances itself, a session that expires.\n\n```fsl {teaches: timed-transitions, run: true}\nGreen after 5 -> Yellow;\nYellow after 2 -> Red;\nRed after 5 -> Green;\n```\n\n**Watch the units.** A bare `after 5` means **five seconds**, not five milliseconds — the implicit scale is 1000. Write `after 500ms` if you really mean milliseconds. This trips people up constantly, so when in doubt, spell the unit out.\n"
    },
    {
        "id": "tut-transitions",
        "section": "tutorials",
        "title": "Transitions",
        "order": 10,
        "teaches": [
            "transitions"
        ],
        "mentions": [
            "states",
            "labels-quoting"
        ],
        "indexTerms": [
            "arrow",
            "edge",
            "transition",
            "action"
        ],
        "body": "\n# Transitions\n\nA transition is the core of FSL: a **source state**, an arrow, and a **target state**. States are inferred from the arrows, so you never declare them just to use them.\n\n```fsl {teaches: transitions, run: true}\nOff 'flip' -> On 'flip' -> Off;\n```\n\nThe text in single quotes is an **action** — the named input that fires the transition. You can chain transitions on one line, as above, or write them one per line. The plain `->` arrow means a *legal* transition; later tutorials cover the other arrow kinds.\n"
    },
    {
        "id": "tut-typed-properties",
        "section": "tutorials",
        "title": "State properties",
        "order": 76,
        "teaches": [
            "typed-properties"
        ],
        "mentions": [
            "machine-attributes"
        ],
        "indexTerms": [
            "property",
            "state property",
            "extended state",
            "value"
        ],
        "body": "\n# State properties\n\nA state can carry **properties** — named values attached to it — with `property: <name> <value>;` inside its declaration. Add `required` to mark one mandatory.\n\n```fsl {teaches: typed-properties, run: true}\nstate Account : { property: balance 100; };\nOpen 'deposit' -> Account;\n```\n\nProperties are how a state carries data beyond its name — the seed of FSL's extended-state model.\n"
    },
    {
        "id": "tut-urls",
        "section": "tutorials",
        "title": "URLs",
        "order": 74,
        "teaches": [
            "urls"
        ],
        "mentions": [
            "state-styling"
        ],
        "indexTerms": [
            "url",
            "link",
            "http",
            "click-through"
        ],
        "body": "\n# URLs\n\nA state can carry a `url` (a double-quoted string). In a rendered SVG it becomes a click-through link on the node — handy for wiring states to docs or dashboards.\n\n```fsl {teaches: urls, run: true}\nstate Docs : { url: \"https://fsl.tools\"; };\nHome 'help' -> Docs;\n```\n\nThe URL passes through to Graphviz's `URL=` attribute and surfaces as an `xlink:href` on the SVG node.\n"
    },
    {
        "id": "tut-semver",
        "section": "tutorials",
        "title": "Version ranges (SemVer)",
        "order": 54,
        "teaches": [
            "semver"
        ],
        "mentions": [
            "machine-attributes"
        ],
        "indexTerms": [
            "semver",
            "version",
            "fsl_version",
            "range"
        ],
        "body": "\n# Version ranges (SemVer)\n\n`fsl_version` declares which FSL language version a machine targets, as a SemVer value. A plain version pins exactly; the comparison operators (`<`, `>`, `<=`, `>=`) express a range.\n\n```fsl {teaches: semver, run: true}\nfsl_version : 5.2.0;\na 'go' -> b;\n```\n\nPinning `fsl_version` lets tooling warn when a machine relies on syntax newer than the runtime it is loaded into.\n"
    },
    {
        "id": "tut-viz-config",
        "section": "tutorials",
        "title": "Viz: render configuration",
        "order": 104,
        "teaches": [
            "viz-config"
        ],
        "mentions": [
            "viz-render"
        ],
        "indexTerms": [
            "configure",
            "render options",
            "groups",
            "viz"
        ],
        "body": "\n# Viz: render configuration\n\n`configure` sets global render defaults, and the `VizRenderOpts` / `RenderGroups` types let you tune a single render — engine choice, group rendering, and more.\n\n```js\nimport { configure, fsl_to_svg_string } from 'jssm/viz';\n\nconfigure({ /* global defaults */ });\nconst svg = await fsl_to_svg_string(`a -> b;`, { /* VizRenderOpts */ });\n```\n\nRender options shape how a machine like this is drawn without changing the FSL:\n\n```fsl {teaches: viz-config, run: true}\ngraph_layout : circo;\na 'go' -> b;\n```\n"
    },
    {
        "id": "tut-viz-dot",
        "section": "tutorials",
        "title": "Viz: DOT output",
        "order": 102,
        "teaches": [
            "viz-dot"
        ],
        "mentions": [
            "viz-render"
        ],
        "indexTerms": [
            "dot",
            "graphviz",
            "viz"
        ],
        "body": "\n# Viz: DOT output\n\nIf you want the Graphviz **DOT** source rather than rendered SVG — to feed another tool or render server-side — use `fsl_to_dot` / `machine_to_dot`, or `dot_to_svg` to finish the job yourself.\n\n```js\nimport { fsl_to_dot } from 'jssm/viz';\n\nconst dot = fsl_to_dot(`a 'go' -> b;`);   // 'digraph { … }'\n```\n\nThe DOT is generated from the same machine you would otherwise render:\n\n```fsl {teaches: viz-dot, run: true}\na 'go' -> b 'go' -> c;\n```\n"
    },
    {
        "id": "tut-viz-render",
        "section": "tutorials",
        "title": "Viz: rendering to SVG",
        "order": 100,
        "teaches": [
            "viz-render"
        ],
        "mentions": [
            "api-machine"
        ],
        "indexTerms": [
            "svg",
            "render",
            "visualize",
            "diagram",
            "viz"
        ],
        "body": "\n# Viz: rendering to SVG\n\nThe `jssm/viz` entry turns a machine (or FSL string) into an SVG diagram: `fsl_to_svg_string`, `fsl_to_svg_element`, `machine_to_svg_string`, `machine_to_svg_element`.\n\n```js\nimport { fsl_to_svg_string } from 'jssm/viz';\n\nconst svg = await fsl_to_svg_string(`Red 'go' -> Green 'go' -> Red;`);\ndocument.body.insertAdjacentHTML('beforeend', svg);\n```\n\nAny machine renders — the styling you write in FSL flows straight through to the SVG:\n\n```fsl {teaches: viz-render, run: true}\nstate Go : { color: ForestGreen; };\nStop 'go' -> Go 'stop' -> Stop;\n```\n"
    },
    {
        "id": "tut-viz-version-info",
        "section": "tutorials",
        "title": "Viz: version and build info",
        "order": 106,
        "teaches": [
            "viz-version-info"
        ],
        "mentions": [
            "viz-render"
        ],
        "indexTerms": [
            "version",
            "build_time",
            "viz"
        ],
        "body": "\n# Viz: version and build info\n\nThe viz module reports its own `version` and `build_time`, independent of the core package — useful when the renderer is loaded from a CDN separately from the core.\n\n```js\nimport { version, build_time } from 'jssm/viz';\n\nversion;      // the viz build's version\nbuild_time;   // when it was built\n```\n\nIt renders machines like any other:\n\n```fsl {teaches: viz-version-info, run: true}\na 'go' -> b;\n```\n"
    },
    {
        "id": "tut-wc-bind",
        "section": "tutorials",
        "title": "Web component: <fsl-bind>",
        "order": 124,
        "teaches": [
            "wc-bind"
        ],
        "mentions": [
            "wc-instance"
        ],
        "indexTerms": [
            "fsl-bind",
            "binding",
            "data"
        ],
        "body": "\n# Web component: &lt;fsl-bind&gt;\n\n`<fsl-bind>` wires DOM to a hosted machine — reflecting the current state into the page and dispatching actions from it, so plain HTML can drive and read a machine.\n\n```html\n<fsl-instance fsl=\"Off 'flip' -> On 'flip' -> Off;\">\n  <fsl-bind>\n    <button data-fsl-action=\"flip\">Toggle</button>\n  </fsl-bind>\n</fsl-instance>\n```\n\nBehind it is a normal machine:\n\n```fsl {teaches: wc-bind, run: true}\nOff 'flip' -> On 'flip' -> Off;\n```\n"
    },
    {
        "id": "tut-wc-editor-suite",
        "section": "tutorials",
        "title": "Web component: the editor suite",
        "order": 128,
        "teaches": [
            "wc-editor-suite"
        ],
        "mentions": [
            "wc-instance",
            "editor-language-support"
        ],
        "indexTerms": [
            "fsl-editor",
            "fsl-help",
            "fsl-docs",
            "toolbar",
            "web component suite"
        ],
        "body": "\n# Web component: the editor suite\n\nThe `fsl-*` editor suite composes a full editing surface: `<fsl-editor>` (a CodeMirror FSL editor), `<fsl-toolbar>`, `<fsl-footer>`, `<fsl-help>` (a docs drawer), and `<fsl-docs>` (this very curriculum, as a component), among others.\n\n```html\n<fsl-editor fsl=\"a 'go' -> b;\"></fsl-editor>\n<fsl-help open>\n  <fsl-docs></fsl-docs>\n</fsl-help>\n```\n\n`<fsl-editor>` edits machines like:\n\n```fsl {teaches: wc-editor-suite, run: true}\nmachine_name : \"Edit me\";\na 'go' -> b 'go' -> a;\n```\n"
    },
    {
        "id": "tut-wc-instance",
        "section": "tutorials",
        "title": "Web component: <fsl-instance>",
        "order": 122,
        "teaches": [
            "wc-instance"
        ],
        "mentions": [
            "wc-viz",
            "api-machine"
        ],
        "indexTerms": [
            "fsl-instance",
            "interactive",
            "live machine"
        ],
        "body": "\n# Web component: &lt;fsl-instance&gt;\n\n`<fsl-instance>` hosts a *live* machine. Nested viz/panel components bind to it automatically, and it drives transitions — an interactive machine on the page.\n\n```html\n<fsl-instance fsl=\"Off 'flip' -> On 'flip' -> Off;\">\n  <fsl-viz></fsl-viz>\n</fsl-instance>\n```\n\nThe hosted machine is ordinary FSL:\n\n```fsl {teaches: wc-instance, run: true}\nOff 'flip' -> On 'flip' -> Off;\n```\n"
    },
    {
        "id": "tut-wc-panels",
        "section": "tutorials",
        "title": "Web component: inspector panels",
        "order": 126,
        "teaches": [
            "wc-panels"
        ],
        "mentions": [
            "wc-instance"
        ],
        "indexTerms": [
            "fsl-info-panel",
            "fsl-effective-properties",
            "inspector",
            "panel"
        ],
        "body": "\n# Web component: inspector panels\n\nThe inspector panels read a hosted machine and show its internals: `<fsl-info-panel>` (current state, available actions) and `<fsl-effective-properties>` (the resolved properties of the active state).\n\n```html\n<fsl-instance fsl=\"Idle 'start' -> Running 'stop' -> Idle;\">\n  <fsl-info-panel></fsl-info-panel>\n  <fsl-effective-properties></fsl-effective-properties>\n</fsl-instance>\n```\n\nThey inspect a machine such as:\n\n```fsl {teaches: wc-panels, run: true}\nIdle 'start' -> Running 'stop' -> Idle;\n```\n"
    },
    {
        "id": "tut-wc-viz",
        "section": "tutorials",
        "title": "Web component: <fsl-viz>",
        "order": 120,
        "teaches": [
            "wc-viz"
        ],
        "mentions": [
            "viz-render"
        ],
        "indexTerms": [
            "fsl-viz",
            "web component",
            "custom element",
            "diagram"
        ],
        "body": "\n# Web component: &lt;fsl-viz&gt;\n\n`<fsl-viz>` renders a machine as a diagram with zero JavaScript — set its `fsl` attribute and it draws.\n\n```html\n<script type=\"module\" src=\"https://unpkg.com/jssm/dist/cdn/viz.js\"></script>\n\n<fsl-viz fsl=\"Red 'go' -> Green 'go' -> Red;\"></fsl-viz>\n```\n\nWhatever FSL you give it renders, styling and all:\n\n```fsl {teaches: wc-viz, run: true}\nstate Go : { color: ForestGreen; };\nStop 'go' -> Go;\n```\n\n(The legacy `jssm-viz` tag still works but is deprecated — prefer `fsl-viz`.)\n"
    },
    {
        "id": "tut-weighted-arrows",
        "section": "tutorials",
        "title": "Weighted / probabilistic arrows",
        "order": 66,
        "teaches": [
            "weighted-arrows"
        ],
        "mentions": [
            "transitions"
        ],
        "indexTerms": [
            "probability",
            "weight",
            "percent",
            "random"
        ],
        "body": "\n# Weighted / probabilistic arrows\n\nA transition can carry a **probability** with `N%`. When several transitions share a source, the weights bias a random walk over the machine.\n\n```fsl {teaches: weighted-arrows, run: true}\nIdle -> 70% Win;\nIdle -> 30% Lose;\n```\n\nProbabilities power FSL's stochastic tooling — random walks, sampling, and Monte-Carlo-style exploration of a machine's reachable states.\n"
    }
];
export const DOCS_FEATURES = [
    {
        "id": "doc-structure",
        "surface": "language",
        "title": "Document structure",
        "tier": "core",
        "referenceAnchor": "1-document-shape",
        "indexTerms": [
            "document",
            "term",
            "statement",
            "top level"
        ]
    },
    {
        "id": "comments",
        "surface": "language",
        "title": "Comments",
        "tier": "core",
        "indexTerms": [
            "comment",
            "//",
            "/*",
            "block comment",
            "line comment"
        ]
    },
    {
        "id": "transitions",
        "surface": "language",
        "title": "Transitions",
        "tier": "core",
        "referenceAnchor": "3-transitions",
        "indexTerms": [
            "transition",
            "arrow",
            "edge",
            "->",
            "<-",
            "<->"
        ]
    },
    {
        "id": "arrow-flavors",
        "surface": "language",
        "title": "Arrow flavors (fat, tilde, light)",
        "tier": "advanced",
        "indexTerms": [
            "fat arrow",
            "tilde arrow",
            "=>",
            "~>",
            "legal",
            "main path",
            "forced"
        ]
    },
    {
        "id": "timed-transitions",
        "surface": "language",
        "title": "Timed transitions (after)",
        "tier": "intermediate",
        "indexTerms": [
            "after",
            "timeout",
            "delay",
            "timer",
            "seconds"
        ]
    },
    {
        "id": "weighted-arrows",
        "surface": "language",
        "title": "Weighted / probabilistic arrows",
        "tier": "advanced",
        "indexTerms": [
            "probability",
            "weight",
            "percent",
            "random",
            "cycle",
            "Pi",
            "Infinity"
        ]
    },
    {
        "id": "arrow-decorations",
        "surface": "language",
        "title": "Per-arrow decorations (labels, colors)",
        "tier": "advanced",
        "indexTerms": [
            "arrow label",
            "edge label",
            "arc_label",
            "head_label",
            "tail_label",
            "per-arrow color"
        ]
    },
    {
        "id": "labels-quoting",
        "surface": "language",
        "title": "Labels and quoting",
        "tier": "core",
        "referenceAnchor": "5-labels-strings-atoms",
        "indexTerms": [
            "label",
            "string",
            "atom",
            "quote",
            "name",
            "action"
        ]
    },
    {
        "id": "states",
        "surface": "language",
        "title": "State declarations",
        "tier": "core",
        "indexTerms": [
            "state",
            "node",
            "declaration"
        ]
    },
    {
        "id": "state-styling",
        "surface": "language",
        "title": "State styling",
        "tier": "intermediate",
        "indexTerms": [
            "style",
            "color",
            "shape",
            "border",
            "background",
            "image",
            "node style"
        ]
    },
    {
        "id": "colors",
        "surface": "language",
        "title": "Colors",
        "tier": "intermediate",
        "indexTerms": [
            "color",
            "svg color",
            "hex",
            "rgb",
            "rgba",
            "#"
        ]
    },
    {
        "id": "shapes",
        "surface": "language",
        "title": "State shapes",
        "tier": "advanced",
        "indexTerms": [
            "shape",
            "box",
            "circle",
            "ellipse",
            "graphviz shape"
        ]
    },
    {
        "id": "line-styles",
        "surface": "language",
        "title": "Line styles",
        "tier": "intermediate",
        "indexTerms": [
            "line style",
            "dashed",
            "dotted",
            "solid",
            "bold"
        ]
    },
    {
        "id": "corners",
        "surface": "language",
        "title": "Corner styles",
        "tier": "advanced",
        "indexTerms": [
            "corners",
            "rounded",
            "regular"
        ]
    },
    {
        "id": "directions",
        "surface": "language",
        "title": "Directions",
        "tier": "advanced",
        "indexTerms": [
            "direction",
            "up",
            "down",
            "left",
            "right"
        ]
    },
    {
        "id": "literal-values",
        "surface": "language",
        "title": "Literal values (boolean, null, undefined)",
        "tier": "intermediate",
        "indexTerms": [
            "true",
            "false",
            "null",
            "undefined",
            "boolean"
        ]
    },
    {
        "id": "urls",
        "surface": "language",
        "title": "URLs",
        "tier": "advanced",
        "indexTerms": [
            "url",
            "link",
            "http",
            "https"
        ]
    },
    {
        "id": "groups",
        "surface": "language",
        "title": "Groups and named lists",
        "tier": "intermediate",
        "indexTerms": [
            "group",
            "named list",
            "&",
            "reusable",
            "set"
        ]
    },
    {
        "id": "hooks",
        "surface": "language",
        "title": "Boundary hooks",
        "tier": "intermediate",
        "indexTerms": [
            "hook",
            "on enter",
            "on exit",
            "boundary",
            "callback"
        ]
    },
    {
        "id": "config-blocks",
        "surface": "language",
        "title": "Configuration blocks",
        "tier": "intermediate",
        "referenceAnchor": "8-configuration-blocks-config",
        "indexTerms": [
            "config",
            "transition config",
            "graph config",
            "state defaults",
            "block"
        ]
    },
    {
        "id": "single-value-configs",
        "surface": "language",
        "title": "Single-value configuration",
        "tier": "intermediate",
        "referenceAnchor": "8-configuration-blocks-config",
        "indexTerms": [
            "graph_layout",
            "start_states",
            "allow_islands",
            "allows_override",
            "failed_outputs"
        ]
    },
    {
        "id": "machine-attributes",
        "surface": "language",
        "title": "Machine attributes",
        "tier": "core",
        "referenceAnchor": "9-machine-attributes",
        "indexTerms": [
            "machine_name",
            "fsl_version",
            "author",
            "license",
            "theme",
            "metadata",
            "attribute"
        ]
    },
    {
        "id": "typed-properties",
        "surface": "language",
        "title": "Typed machine properties",
        "tier": "advanced",
        "indexTerms": [
            "property",
            "typed property",
            "required",
            "default",
            "extended state"
        ]
    },
    {
        "id": "semver",
        "surface": "language",
        "title": "Version ranges (SemVer)",
        "tier": "intermediate",
        "indexTerms": [
            "semver",
            "version",
            "fsl_version",
            "range"
        ]
    },
    {
        "id": "arrange",
        "surface": "language",
        "title": "Layout hints (arrange)",
        "tier": "advanced",
        "indexTerms": [
            "arrange",
            "layout",
            "rank",
            "position"
        ]
    },
    {
        "id": "api-machine",
        "surface": "api",
        "title": "The Machine and its factories",
        "tier": "core",
        "indexTerms": [
            "state_machine",
            "sm",
            "from",
            "compile",
            "deserialize",
            "instantiate",
            "Machine"
        ]
    },
    {
        "id": "api-version-info",
        "surface": "api",
        "title": "Version and build info (API)",
        "tier": "intermediate",
        "indexTerms": [
            "version",
            "build time",
            "compareVersions"
        ]
    },
    {
        "id": "api-arrow-introspection",
        "surface": "api",
        "title": "Arrow introspection helpers",
        "tier": "advanced",
        "indexTerms": [
            "arrow direction",
            "arrow kind",
            "introspection"
        ]
    },
    {
        "id": "api-constants",
        "surface": "api",
        "title": "Exported constants and vocabularies",
        "tier": "intermediate",
        "indexTerms": [
            "constants",
            "shapes",
            "named_colors",
            "directions"
        ]
    },
    {
        "id": "api-hook-helpers",
        "surface": "api",
        "title": "Hook result helpers (API)",
        "tier": "advanced",
        "indexTerms": [
            "hook",
            "rejection",
            "hook result"
        ]
    },
    {
        "id": "api-utilities",
        "surface": "api",
        "title": "Utility exports",
        "tier": "advanced",
        "indexTerms": [
            "seq",
            "random",
            "weighted",
            "sleep",
            "utility"
        ]
    },
    {
        "id": "viz-render",
        "surface": "viz",
        "title": "Rendering FSL / machines to SVG",
        "tier": "core",
        "indexTerms": [
            "svg",
            "render",
            "visualize",
            "diagram"
        ]
    },
    {
        "id": "viz-dot",
        "surface": "viz",
        "title": "DOT (Graphviz) output",
        "tier": "intermediate",
        "indexTerms": [
            "dot",
            "graphviz"
        ]
    },
    {
        "id": "viz-config",
        "surface": "viz",
        "title": "Render configuration",
        "tier": "intermediate",
        "indexTerms": [
            "configure",
            "render options",
            "groups"
        ]
    },
    {
        "id": "viz-version-info",
        "surface": "viz",
        "title": "Version and build info (viz)",
        "tier": "advanced",
        "indexTerms": [
            "version",
            "build time"
        ]
    },
    {
        "id": "editor-language-support",
        "surface": "editor",
        "title": "CodeMirror 6 FSL language support",
        "tier": "core",
        "indexTerms": [
            "codemirror",
            "cm6",
            "language support",
            "editor"
        ]
    },
    {
        "id": "editor-highlighting",
        "surface": "editor",
        "title": "Syntax highlighting",
        "tier": "intermediate",
        "indexTerms": [
            "highlight",
            "syntax color",
            "deprecated marker"
        ]
    },
    {
        "id": "editor-keyword-sets",
        "surface": "editor",
        "title": "Keyword classification sets",
        "tier": "advanced",
        "indexTerms": [
            "keywords",
            "structural",
            "property",
            "enum"
        ]
    },
    {
        "id": "wc-viz",
        "surface": "webcomponent",
        "title": "<fsl-viz> diagram element",
        "tier": "core",
        "indexTerms": [
            "fsl-viz",
            "web component",
            "custom element",
            "diagram"
        ]
    },
    {
        "id": "wc-instance",
        "surface": "webcomponent",
        "title": "<fsl-instance> live machine element",
        "tier": "intermediate",
        "indexTerms": [
            "fsl-instance",
            "interactive",
            "live machine"
        ]
    },
    {
        "id": "wc-bind",
        "surface": "webcomponent",
        "title": "<fsl-bind> data binding",
        "tier": "intermediate",
        "indexTerms": [
            "fsl-bind",
            "binding",
            "data"
        ]
    },
    {
        "id": "wc-panels",
        "surface": "webcomponent",
        "title": "Inspector panels",
        "tier": "advanced",
        "indexTerms": [
            "panel",
            "inspector",
            "info",
            "effective properties"
        ]
    },
    {
        "id": "cli-dispatcher",
        "surface": "cli",
        "title": "The fsl dispatcher",
        "tier": "core",
        "indexTerms": [
            "cli",
            "fsl",
            "dispatcher",
            "--help",
            "--version"
        ]
    },
    {
        "id": "cli-render",
        "surface": "cli",
        "title": "fsl render",
        "tier": "core",
        "indexTerms": [
            "render",
            "cli render",
            "fsl-render"
        ]
    },
    {
        "id": "cli-render-targets",
        "surface": "cli",
        "title": "Render output formats",
        "tier": "intermediate",
        "indexTerms": [
            "svg",
            "png",
            "jpeg",
            "dot",
            "html",
            "format",
            "export"
        ]
    },
    {
        "id": "cli-export-prompt",
        "surface": "cli",
        "title": "fsl export-system-prompt",
        "tier": "advanced",
        "indexTerms": [
            "system prompt",
            "llms.txt",
            "export prompt"
        ]
    },
    {
        "id": "prompt-overview",
        "surface": "llm-prompt",
        "title": "System-prompt overview sections",
        "tier": "intermediate",
        "indexTerms": [
            "llms.txt",
            "system prompt",
            "agent",
            "concepts"
        ]
    },
    {
        "id": "prompt-examples",
        "surface": "llm-prompt",
        "title": "System-prompt worked examples",
        "tier": "advanced",
        "indexTerms": [
            "example",
            "basic machine",
            "actions"
        ]
    },
    {
        "id": "api-language-service",
        "surface": "api",
        "title": "Language service helpers",
        "tier": "advanced",
        "indexTerms": [
            "language service",
            "completions",
            "diagnostics",
            "semantic spans"
        ]
    },
    {
        "id": "wc-editor-suite",
        "surface": "webcomponent",
        "title": "FSL editor web-component suite",
        "tier": "advanced",
        "indexTerms": [
            "editor",
            "help panel",
            "docs",
            "toolbar",
            "footer",
            "inspector",
            "web component suite"
        ]
    }
];
