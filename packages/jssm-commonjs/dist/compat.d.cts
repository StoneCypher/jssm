import { circular_buffer } from 'circular_buffer_js';

type StateType$9 = string;
/**
 *  A color value accepted by jssm-viz for state and arrow styling.  Currently
 *  any string, validated downstream by Graphviz / the named-colors list.
 *  Intended to be narrowed to `#RRGGBB` / `#RRGGBBAA` and CSS named colors
 *  in a future release.
 */
type JssmColor = string;
/**
 *  Three-state policy flag: `'required'`, `'disallowed'`, or `'optional'`.
 *  Used by machine configuration where a default-permissive middle ground
 *  is meaningful (for example, the `actions` config key).
 */
type JssmPermittedOpt = 'required' | 'disallowed' | 'optional';
/**
 *  Every arrow token recognized by the FSL grammar — all 42 spellings.  Each
 *  arrow encodes a direction (one-way left/right, or two-way) and a "kind" for
 *  each direction (`-` legal, `=` main path, `~` forced-only).  See the
 *  Language Reference docs for the full semantic table.
 *
 *  Every arrow has an ASCII spelling and a unicode spelling, and each half of a
 *  two-way arrow may be spelled independently, so the two-way arrows also have
 *  mixed ASCII/unicode spellings (`←=>`, `<-⇒`, and so on).  All of them are
 *  accepted, by the grammar and by {@link arrow_direction},
 *  {@link arrow_left_kind}, and {@link arrow_right_kind}.
 */
type JssmArrow = '->' | '→' | '=>' | '⇒' | '~>' | '↛' | '<-' | '←' | '<=' | '⇐' | '<~' | '↚' | '<->' | '↔' | '<=>' | '⇔' | '<~>' | '↮' | '<-=>' | '←⇒' | '←=>' | '<-⇒' | '<-~>' | '←↛' | '←~>' | '<-↛' | '<=->' | '⇐→' | '⇐->' | '<=→' | '<=~>' | '⇐↛' | '⇐~>' | '<=↛' | '<~->' | '↚→' | '↚->' | '<~→' | '<~=>' | '↚⇒' | '↚=>' | '<~⇒';
/**
 * A type teaching Typescript the various supported shapes for nodes, mostly inherited from GraphViz
 */
type JssmShape = "box" | "polygon" | "ellipse" | "oval" | "circle" | "point" | "egg" | "triangle" | "plaintext" | "plain" | "diamond" | "trapezium" | "parallelogram" | "house" | "pentagon" | "hexagon" | "septagon" | "octagon" | "doublecircle" | "doubleoctagon" | "tripleoctagon" | "invtriangle" | "invtrapezium" | "invhouse" | "Mdiamond" | "Msquare" | "Mcircle" | "rect" | "rectangle" | "square" | "star" | "none" | "underline" | "cylinder" | "note" | "tab" | "folder" | "box3d" | "component" | "promoter" | "cds" | "terminator" | "utr" | "primersite" | "restrictionsite" | "fivepoverhang" | "threepoverhang" | "noverhang" | "assembly" | "signature" | "insulator" | "ribosite" | "rnastab" | "proteasesite" | "proteinstab" | "rpromoter" | "rarrow" | "larrow" | "lpromoter" | "record";
/**
 *  Direction polarity of an arrow: pointing only `'left'`, only `'right'`,
 *  or `'both'` (a bidirectional arrow).
 */
type JssmArrowDirection = 'left' | 'right' | 'both';
/**
 *  Semantic category of an arrow's transition.  `'legal'` is a normal
 *  transition, `'main'` is part of the machine's primary path, `'forced'`
 *  may only be taken via {@link jssm!Machine.force_transition}, and `'none'`
 *  means no transition exists in that direction.
 */
type JssmArrowKind = 'none' | 'legal' | 'main' | 'forced';
/**
 *  Graphviz layout engine selector.  Controls how jssm-viz lays out the
 *  rendered diagram; `'dot'` is the default and most useful for state
 *  machines.  See the Graphviz documentation for the differences.
 */
type JssmLayout = 'dot' | 'circo' | 'twopi' | 'fdp' | 'neato';
type JssmCorner = 'regular' | 'rounded' | 'lined';
type JssmLineStyle = 'solid' | 'dashed' | 'dotted';
/**
 *  Tristate flag for whether a property may be overridden at runtime.
 *  `true` permits overrides, `false` forbids them, and `undefined` defers
 *  the decision to the surrounding configuration's default.
 */
type JssmAllowsOverride = true | false | undefined;
/**
 *  Controls whether the state graph may contain disconnected components
 *  (islands).  `true` permits islands (default), `false` requires a single
 *  connected component, and `'with_start'` permits islands only when every
 *  component contains at least one start state.
 */
type JssmAllowIslands = true | false | 'with_start';
/**
 *  Structured render-size hint for a machine visualization, set by the FSL
 *  `default_size` directive.  All three forms are optional in the sense that
 *  only one or two fields will be present depending on the form used:
 *
 *  - `{ width }` — single-number form (`default_size: 800;`)
 *  - `{ width, height }` — bounding-box form (`default_size: 800 600;`)
 *  - `{ height }` — height-only form (`default_size: height 600;`)
 *
 *  This is a *hint*, not a hard constraint.  Renderers may ignore it.
 *  @see Machine.default_size
 */
type JssmDefaultSize = {
    width?: number;
    height?: number;
};
/**
 *  A parsed semantic-version breakdown, as produced by the FSL parser for
 *  version-valued directives (`machine_version`, `fsl_version`).  `major`,
 *  `minor`, and `patch` are the three numeric components; `full` preserves
 *  the exact source text of the version.  `loc` is present only when the
 *  source was parsed with `{ locations: true }`.
 *
 *  ```typescript
 *  const m = sm`machine_version: 1.2.3; a -> b;`;
 *  m.machine_version();  // { major: 1, minor: 2, patch: 3, full: '1.2.3' }
 *  ```
 *  @see Machine.machine_version
 *  @see Machine.fsl_version
 */
type JssmParsedSemver = {
    major: number;
    minor: number;
    patch: number;
    full: string;
    loc?: FslSourceLocation;
};
/**
 *  Runtime-iterable list of valid `flow` directions for FSL diagrams.
 *  Use this when you need to enumerate directions; for the type itself
 *  see {@link FslDirection}.
 */
declare const FslDirections: readonly ["up", "right", "down", "left"];
/**
 *  String literal type of the four supported FSL flow directions.  This is
 *  the type of the `flow` config key on a machine.
 */
type FslDirection = typeof FslDirections[number];
/**
 *  Runtime-iterable list of the built-in theme names that ship with jssm-viz.
 *  Use this when you need to enumerate themes; for the type itself see
 *  {@link FslTheme}.
 */
declare const FslThemes: readonly ["default", "ocean", "modern", "plain", "bold"];
/**
 *  String literal type of the built-in theme names.  This is the element
 *  type of the `theme` config key (which accepts an array so that themes
 *  can be layered).
 */
type FslTheme = typeof FslThemes[number];
/**
 *  Persistable snapshot of a Machine produced by {@link jssm!Machine.serialize}
 *  and consumed by {@link jssm!deserialize}.  Carries the current state, the
 *  associated machine data, the recent history (subject to the configured
 *  capacity), and metadata to detect version-skew on rehydration.
 *  @template DataType - The type of the user-supplied data payload (`mDT`).
 */
type JssmSerialization<DataType> = {
    jssm_version: string;
    timestamp: number;
    comment?: string | undefined;
    state: StateType$9;
    history: [string, DataType][];
    history_capacity: number;
    data: DataType;
};
/**
 *  One ordered member of a named group's membership list.  A `'state'`
 *  member is an ordinary state (`a` inside `&g : [a]`).  A `'group'` member
 *  references another group: `mode: 'nest'` is the `&child` form, which
 *  preserves the child group's identity for later precedence/viz, while
 *  `mode: 'spread'` is the `...&child` form, which inlines the child's
 *  members and erases that identity.  Both modes resolve to the same flat
 *  set of states via {@link JssmGroupRegistry} resolution; only their
 *  structural bookkeeping differs.
 *
 *  ```typescript
 *  // `&outer : [&inner x];` direct members:
 *  // [ { kind: 'group', name: 'inner', mode: 'nest' },
 *  //   { kind: 'state', name: 'x' } ]
 *  ```
 *  @see JssmGroupRef
 *  @see JssmGroupRegistry
 */
type JssmGroupMemberRef = {
    kind: 'state';
    name: string;
} | {
    kind: 'group';
    name: string;
    mode: 'nest' | 'spread';
};
/**
 *  The compiled group table: maps each declared group name to its
 *  **ordered, direct** members (a {@link JssmGroupMemberRef} list).  Order
 *  is meaningful — it carries declaration/iteration/precedence order — so
 *  this is always an array-valued `Map`, never a `Set`.  Only direct
 *  members are stored; transitive (flattened) membership is resolved
 *  lazily so the group→group graph survives for viz and precedence.
 *
 *  ```typescript
 *  // for `&inner : [a b]; &outer : [&inner c];`
 *  // registry.get('inner') === [ { kind:'state', name:'a' },
 *  //                             { kind:'state', name:'b' } ]
 *  // registry.get('outer') === [ { kind:'group', name:'inner', mode:'nest' },
 *  //                             { kind:'state', name:'c' } ]
 *  ```
 *  @see JssmGroupMemberRef
 */
type JssmGroupRegistry = Map<string, JssmGroupMemberRef[]>;
/**
 *  The compiled boundary-hook surface for a single subject (a group or a
 *  state): the action to run on entry (`onEnter`) and/or on exit (`onExit`).
 *  Each is optional so a subject may declare only one direction; the compiler
 *  merges an `enter` and an `exit` declaration for the same subject into one
 *  of these.
 *  @see JssmHookDeclaration
 */
type JssmBoundaryHooks = {
    onEnter?: string;
    onExit?: string;
};
/**
 *  Maps each group name that has at least one boundary hook to its merged
 *  {@link JssmBoundaryHooks}.  Carried on {@link JssmGenericConfig} for the
 *  runtime to consume; depth-aware firing is a later task.
 *  @see JssmHookDeclaration
 */
type JssmGroupHooks = Map<string, JssmBoundaryHooks>;
/**
 *  Maps each plain state name that has at least one boundary hook to its
 *  merged {@link JssmBoundaryHooks}.  The state-subject analogue of
 *  {@link JssmGroupHooks}.
 *  @see JssmHookDeclaration
 */
type JssmStateHooks = Map<string, JssmBoundaryHooks>;
/**
 *  Declaration of a named property that a machine's states may carry.
 *  Set `required: true` to force every state to define the property, or
 *  provide `default_value` to fall back when the state does not specify it.
 *
 *  For state-property *bindings* (the `state_property` config list), the
 *  compiler also writes `property` and `state` — the unserialized pair behind
 *  the serialized `name` — so the Machine constructor can validate bindings
 *  without parsing `name` back apart.  Both are optional: hand-built configs
 *  may carry only the serialized `name`, and global property definitions
 *  never set them.
 */
type JssmPropertyDefinition = {
    name: string;
    default_value?: any;
    required?: boolean;
    property?: string;
    state?: string;
};
/*********
 *
 *  The declared type of a machine `val` (extended-state variable): the scalar
 *  type core — `boolean`, `string`, unbounded or bounded `int lo..hi`, and
 *  `enum(...)`.  Carried from the grammar to the runtime, where
 *  `validate_val_value` enforces it at construction and on every write.
 *
 */
type JssmValType = {
    kind: 'boolean';
} | {
    kind: 'string';
} | {
    kind: 'int';
    lo?: number;
    hi?: number;
} | {
    kind: 'enum';
    members: string[];
};
/*********
 *
 *  A machine `val` declaration: a named, typed, validated, mutable
 *  extended-state variable (the mutable sibling of a `property`).
 *
 */
type JssmValDefinition = {
    name: string;
    val_type: JssmValType;
    default_value?: any;
    required?: boolean;
};
type JssmTransitionPermitter<DataType> = (OldState: StateType$9, NewState: StateType$9, OldData: DataType, NewData: DataType) => boolean;
type JssmTransitionPermitterMaybeArray<DataType> = JssmTransitionPermitter<DataType> | Array<JssmTransitionPermitter<DataType>>;
/**
 *  A single directed transition (edge) within a state machine.  Captures
 *  both the topology (`from` / `to`), the FSL semantics (`kind`,
 *  `forced_only`, `main_path`), and any optional metadata such as a
 *  per-edge `name`, an action label, a guard `check`, a transition
 *  `probability` for stochastic models, a `share` recording this edge's
 *  fraction of the list side's default weight (6.0 list weights; set only
 *  when the transition itself declared no `probability`), and an
 *  `after_time` for timed transitions.
 *  @template StateType - The state-name type (usually `string`).
 *  @template DataType  - The machine's data payload type (`mDT`).
 */
type JssmTransition<StateType, DataType> = {
    from: StateType;
    to: StateType;
    after_time?: number;
    se?: JssmCompileSe<StateType, DataType>;
    name?: StateType;
    action?: StateType;
    check?: JssmTransitionPermitterMaybeArray<DataType>;
    probability?: number;
    share?: number;
    kind: JssmArrowKind;
    forced_only: boolean;
    main_path: boolean;
};
/** A list of {@link JssmTransition}s — the edge set of a machine. */
type JssmTransitions<StateType, DataType> = JssmTransition<StateType, DataType>[];
/**
 *  The set of states that can immediately precede or follow a given state.
 *  Returned by jssm helpers that report a state's connectivity in the graph.
 */
type JssmTransitionList = {
    entrances: Array<StateType$9>;
    exits: Array<StateType$9>;
};
/**
 *  Topology record for one node in a compiled machine: its name, the set of
 *  states it can be reached from, the set of states it can transition to,
 *  and whether reaching it constitutes "completing" the machine.
 */
type JssmGenericState = {
    from: Array<StateType$9>;
    name: StateType$9;
    to: Array<StateType$9>;
    complete: boolean;
};
/**
 *  The full internal bookkeeping snapshot of a {@link jssm!Machine}, exposed for
 *  advanced introspection.  Contains the current state, the state map, the
 *  edge map and reverse-action map, and the original edge list.  The
 *  `internal_state_impl_version` field exists so that consumers can detect
 *  shape changes if this representation evolves.
 */
type JssmMachineInternalState<DataType> = {
    internal_state_impl_version: 1;
    state: StateType$9;
    states: Map<StateType$9, JssmGenericState>;
    named_transitions: Map<StateType$9, number>;
    edge_map: Map<StateType$9, Map<StateType$9, number>>;
    actions: Map<StateType$9, Map<StateType$9, number>>;
    reverse_actions: Map<StateType$9, Map<StateType$9, number>>;
    edges: Array<JssmTransition<StateType$9, DataType>>;
};
type JssmStatePermitter<DataType> = (OldState: StateType$9, NewState: StateType$9, OldData: DataType, NewData: DataType) => boolean;
type JssmStatePermitterMaybeArray<DataType> = JssmStatePermitter<DataType> | Array<JssmStatePermitter<DataType>>;
/**
 *  A source span produced by the FSL parser when `parse(input, { locations:
 *  true })` is used.  Mirrors PEG.js's native `location()` shape: byte
 *  `offset`s (0-based, half-open) plus 1-based `line`/`column` for display.
 *
 *  ```typescript
 *  const [t] = parse('a -> b;', { locations: true });
 *  // t.loc === { start: { offset: 0, line: 1, column: 1 },
 *  //             end:   { offset: 7, line: 1, column: 8 } }
 *  ```
 */
type FslSourcePoint = {
    offset: number;
    line: number;
    column: number;
};
type FslSourceLocation = {
    start: FslSourcePoint;
    end: FslSourcePoint;
};
/**
 *  Options accepted by the FSL parser and its {@link wrap_parse} wrapper
 *  (exported from the package as `parse`).  Exists so the two-argument parse
 *  call is typed against what the parser actually reads, instead of a bare
 *  `object`.
 *
 *  - `locations` — when `true`, the grammar attaches a `loc` field of type
 *    {@link FslSourceLocation} (plus curated `*_loc` token sub-spans) to every
 *    AST node.  When absent or `false`, the tree is byte-for-byte identical to
 *    the historical location-free output.
 *
 *  - `startRule` — honored by the generated PEG.js boilerplate, which throws
 *    on any rule name it doesn't expose.  This grammar exposes only its
 *    default rule, `Document`, so the field is only useful for explicitness.
 *
 *  ```typescript
 *  const [t] = parse('a -> b;', { locations: true });
 *  // t.loc === { start: { offset: 0, line: 1, column: 1 },
 *  //             end:   { offset: 7, line: 1, column: 8 } }
 *  ```
 *  @see FslSourceLocation
 */
type JssmParseOptions = {
    locations?: boolean;
    startRule?: 'Document';
};
/**
 *  A single key/value pair from an FSL `state X: { ... };` block, in the
 *  raw form produced by the parser before being condensed into a
 *  {@link JssmStateDeclaration}.
 */
type JssmStateDeclarationRule = {
    key: string;
    value: any;
    name?: string;
    loc?: FslSourceLocation;
    value_loc?: FslSourceLocation;
};
/**
 *  The fully-condensed declaration for a single state, including its raw
 *  rule list (`declarations`) and the well-known styling fields jssm-viz
 *  understands.  Returned by {@link jssm!Machine.state_declaration}.
 */
type JssmStateDeclaration = {
    declarations: Array<JssmStateDeclarationRule>;
    shape?: JssmShape;
    color?: JssmColor;
    corners?: JssmCorner;
    lineStyle?: JssmLineStyle;
    stateLabel?: string;
    textColor?: JssmColor;
    backgroundColor?: JssmColor;
    borderColor?: JssmColor;
    image?: string;
    url?: string;
    state: StateType$9;
    property?: {
        name: string;
        value: unknown;
    };
};
/**
 *  A loosened version of {@link JssmStateDeclaration} where every field is
 *  optional.  Used as the value type for theme entries and for default
 *  state configuration where most fields will be inherited or merged.
 */
type JssmStateConfig = Partial<JssmStateDeclaration>;
type JssmStateStyleShape = {
    key: 'shape';
    value: JssmShape;
};
type JssmStateStyleColor = {
    key: 'color';
    value: JssmColor;
};
type JssmStateStyleTextColor = {
    key: 'text-color';
    value: JssmColor;
};
type JssmStateStyleCorners = {
    key: 'corners';
    value: JssmCorner;
};
type JssmStateStyleLineStyle = {
    key: 'line-style';
    value: JssmLineStyle;
};
type JssmStateStyleStateLabel = {
    key: 'state-label';
    value: string;
};
type JssmStateStyleBackgroundColor = {
    key: 'background-color';
    value: JssmColor;
};
type JssmStateStyleBorderColor = {
    key: 'border-color';
    value: JssmColor;
};
type JssmStateStyleImage = {
    key: 'image';
    value: string;
};
type JssmStateStyleUrl = {
    key: 'url';
    value: string;
};
/**
 *  Tagged union of all individual style key/value pairs that may appear in
 *  a state's style configuration.  The `key` discriminator selects which
 *  member, and the `value` is typed accordingly.
 */
type JssmStateStyleKey = JssmStateStyleShape | JssmStateStyleColor | JssmStateStyleTextColor | JssmStateStyleCorners | JssmStateStyleLineStyle | JssmStateStyleBackgroundColor | JssmStateStyleStateLabel | JssmStateStyleBorderColor | JssmStateStyleImage | JssmStateStyleUrl;
/**
 *  An ordered list of {@link JssmStateStyleKey} entries.  Used by the
 *  `default_*_state_config` machine config options to provide a fallback
 *  style stack.
 */
type JssmStateStyleKeyList = JssmStateStyleKey[];
/**
 *  The graph-wide default edge colour style item, produced by the
 *  `edge-color`/`edge_color` line inside a `transition: {}` (or `graph: {}`)
 *  config block.  Kept distinct from {@link JssmStateStyleColor} because it
 *  applies to edges rather than nodes, and because it carries the legacy
 *  `graph_default_edge_color` key the grammar emits.
 */
type JssmGraphDefaultEdgeColor = {
    key: 'graph_default_edge_color';
    value: JssmColor;
};
/**
 *  A single item inside a `transition: {}` default-config block.  For v1 this
 *  reuses the per-state style items (so `color: red;` works inside a
 *  `transition:` block exactly as inside a `state:` block) plus the
 *  edge-scoped {@link JssmGraphDefaultEdgeColor} default.
 *  @see JssmTransitionConfig
 */
type JssmTransitionStyleKey = JssmStateStyleKey | JssmGraphDefaultEdgeColor;
/**
 *  The compiled value of a `transition: {}` config block: an ordered list of
 *  edge-default style items.  V1 mirrors the state-style shape used by
 *  `default_state_config`; group machinery that consumes it lands in a later
 *  task.
 *
 *  ```typescript
 *  import { compile, parse } from 'jssm';
 *  const cfg = compile(parse('a -> b; transition: { color: red; };'));
 *  // cfg.default_transition_config === [ { key: 'color', value: '#ff0000ff' } ]
 *  ```
 *  @see JssmGraphConfig
 */
type JssmTransitionConfig = JssmTransitionStyleKey[];
/**
 *  Graph-scope default-config style items folded from the deprecated
 *  top-level graph keywords (`graph_layout`, `graph_bg_color`,
 *  `dot_preamble`, `theme`, `flow`, and the `edge-color`/`edge_color`
 *  default) into the consolidated `graph: {}` config.  Each carries the
 *  legacy parse key so downstream consumers can disambiguate.
 */
type JssmGraphAliasKey = JssmGraphDefaultEdgeColor | {
    key: 'graph_layout';
    value: JssmLayout;
} | {
    key: 'graph_bg_color';
    value: JssmColor;
} | {
    key: 'dot_preamble';
    value: string;
} | {
    key: 'theme';
    value: FslTheme | FslTheme[];
} | {
    key: 'flow';
    value: FslDirection;
};
/**
 *  A single item inside a `graph: {}` default-config block.  For v1 this
 *  reuses the per-state style items plus the graph-scope alias items
 *  ({@link JssmGraphAliasKey}) folded in from the deprecated top-level
 *  graph keywords.
 *  @see JssmGraphConfig
 */
type JssmGraphStyleKey = JssmStateStyleKey | JssmGraphAliasKey;
/**
 *  The compiled value of a `graph: {}` config block: an ordered list of
 *  graph-default style items.  The compiler folds the deprecated top-level
 *  graph keywords into this list first, then lets an explicit `graph: {}`
 *  block override on key conflict.
 *
 *  ```typescript
 *  import { compile, parse } from 'jssm';
 *  const cfg = compile(parse('a -> b; graph_bg_color: #ffffff;'));
 *  // the compiler canonicalizes the folded `graph_bg_color` alias to a
 *  // `background-color` item, so:
 *  // cfg.default_graph_config includes { key: 'background-color', value: '#ffffffff' }
 *  ```
 *  @see JssmTransitionConfig
 */
type JssmGraphConfig = JssmGraphStyleKey[];
/**
 *  Full configuration object accepted by the {@link jssm!Machine} constructor and
 *  by {@link from}.  Carries the transition list and the optional knobs
 *  governing layout, theming, history, start/end states, property
 *  definitions, machine metadata (author, license, version, ...) and the
 *  runtime hook surfaces (`time_source`, `timeout_source`, ...).
 *
 *  Most users never construct one of these directly — the `sm` tagged
 *  template literal and {@link from} produce one from FSL source.
 *  @template StateType - The state-name type (usually `string`).
 *  @template DataType  - The user-supplied data payload type (`mDT`).
 */
/**
 *  Editor/panel defaults an FSL machine declares in an `editor: {}` block
 *  (fsl#1334), read by the all-widgets web control: a stochastic run-count
 *  and the panels the machine requests under `request` panel mode.
 */
type JssmEditorConfig = {
    stochastic_run_count?: number;
    panels?: Array<string>;
};
/** Which stochastic view a run batch produces. */
type JssmStochasticMode = 'montecarlo' | 'steady_state';
/** Options for {@link jssm!Machine.stochastic_summary} / {@link jssm!Machine.stochastic_runs}. */
type JssmStochasticOptions = {
    mode?: JssmStochasticMode;
    runs?: number;
    max_steps?: number;
    seed?: number;
};
/** One walk's result, yielded by {@link jssm!Machine.stochastic_runs}. */
type JssmStochasticRun = {
    states: Array<string>;
    edges: Array<string>;
    length: number;
    terminated: boolean;
};
/** Aggregate statistics over a stochastic run batch. */
type JssmStochasticSummary = {
    mode: JssmStochasticMode;
    runs: number;
    seed: number;
    state_visits: Map<string, number>;
    state_visit_fraction: Map<string, number>;
    edge_traversals: Map<string, number>;
    path_lengths?: Array<number>;
    terminal_reached?: number;
    capped?: number;
};
type JssmGenericConfig<StateType, DataType> = {
    graph_layout?: JssmLayout;
    complete?: Array<StateType>;
    transitions: JssmTransitions<StateType, DataType>;
    theme?: FslTheme[];
    flow?: FslDirection;
    name?: string;
    data?: DataType;
    nodes?: Array<StateType>;
    check?: JssmStatePermitterMaybeArray<DataType>;
    history?: number;
    /**
     *  Maximum depth of the boundary-hook action cascade before the machine
     *  throws a {@link jssm_error!JssmError} rather than risking a stack overflow or hang.
     *
     *  Each time a boundary action fires a transition that itself crosses a
     *  boundary, the depth counter increments.  A cascade exceeding this limit is
     *  treated as a probable infinite loop and rejected.
     *
     *  Defaults to `100`.  Raise it for legitimate pipelines that genuinely nest
     *  more than 100 transitions via boundary hooks.
     *  @see Machine._boundary_depth_limit
     *  @see Machine._fire_boundary_actions
     */
    boundary_depth_limit?: number;
    min_exits?: number;
    max_exits?: number;
    allow_islands?: JssmAllowIslands;
    editor_config?: JssmEditorConfig;
    allow_force?: false;
    actions?: JssmPermittedOpt;
    simplify_bidi?: boolean;
    allows_override?: JssmAllowsOverride;
    config_allows_override?: JssmAllowsOverride;
    dot_preamble?: string;
    start_states: Array<StateType>;
    /**
     *  The initial distribution declared by a weighted `start_states` list
     *  (6.0 list weights), e.g. `start_states: [idle 90% booting 10%];`.
     *  One entry per name in {@link JssmGenericConfig.start_states}, shares
     *  normalized to sum to 1.  Absent when `start_states` carried no inner
     *  weights.  Consumed by `Machine.start_state_weights()` /
     *  `Machine.sample_start_state()`.
     */
    start_state_weights?: Array<{
        name: StateType;
        share: number;
    }>;
    end_states?: Array<StateType>;
    failed_outputs?: Array<StateType>;
    initial_state?: StateType;
    start_states_no_enforce?: boolean;
    state_declaration?: object[];
    property_definition?: JssmPropertyDefinition[];
    val_definition?: JssmValDefinition[];
    vals?: {
        [name: string]: any;
    };
    state_property?: JssmPropertyDefinition[];
    arrange_declaration?: Array<Array<StateType>>;
    arrange_start_declaration?: Array<Array<StateType>>;
    arrange_end_declaration?: Array<Array<StateType>>;
    oarrange_declaration?: Array<Array<StateType>>;
    farrange_declaration?: Array<Array<StateType>>;
    machine_author?: string | Array<string>;
    machine_comment?: string;
    machine_contributor?: string | Array<string>;
    machine_definition?: string;
    machine_language?: string;
    machine_license?: string;
    machine_name?: string;
    machine_version?: JssmParsedSemver;
    npm_name?: string;
    default_size?: JssmDefaultSize;
    fsl_version?: JssmParsedSemver;
    auto_api?: boolean | string;
    instance_name?: string | undefined;
    default_state_config?: JssmStateStyleKeyList;
    default_start_state_config?: JssmStateStyleKeyList;
    default_end_state_config?: JssmStateStyleKeyList;
    default_hooked_state_config?: JssmStateStyleKeyList;
    default_terminal_state_config?: JssmStateStyleKeyList;
    default_active_state_config?: JssmStateStyleKeyList;
    default_transition_config?: JssmTransitionConfig;
    default_graph_config?: JssmGraphConfig;
    /**
     *  Overlapping-state-group tables produced by the compile pass and consumed
     *  by the Task-3 runtime cascade.
     *
     *  `group_registry` maps each group name to its ordered list of direct
     *  members (states and sub-group references) as declared in the FSL source.
     *
     *  `group_metadata` maps each group name to its RAW style object
     *  `{ declarations: [...] }` — parsed style items from a
     *  `state &g : { … };` declaration, **not** condensed `JssmStateConfig`
     *  style fields.  Condensation is intentionally deferred to the Task-3
     *  runtime cascade so that depth-specificity resolution can weight each
     *  group's contribution before merging into per-state config.
     *
     *  `group_hooks` and `state_hooks` hold boundary-hook payloads keyed by
     *  group name and state name respectively; firing is also a Task-3 concern.
     *
     *  All four fields are absent (`undefined`) on machines that declare no
     *  groups or hooks.
     */
    group_registry?: JssmGroupRegistry;
    group_metadata?: Map<string, JssmStateConfig>;
    group_hooks?: JssmGroupHooks;
    state_hooks?: JssmStateHooks;
    rng_seed?: number | undefined;
    time_source?: () => number;
    /**
     *  Schedules `fn` to run after `delay_ms`, and returns a handle that will be
     *  handed back to `clear_timeout_source` untouched.  Defaults to `setTimeout`.
     *
     *  The handle is typed `number` — the browser shape.  Node's `setTimeout`
     *  returns a `Timeout` object instead, so a Node-shaped source casts it (as
     *  jssm's own `DEFAULT_TIMEOUT_SOURCE` does); jssm never inspects the handle,
     *  it only stores it and gives it back.
     *
     *  (Before 5.162.14 these read `(Function, number) => number`, in which
     *  `Function` and `number` were *parameter names*, not types — so both
     *  parameters were silently `any`.)
     */
    timeout_source?: (fn: () => void, delay_ms: number) => number;
    /** Cancels a timer previously scheduled by `timeout_source`.  Defaults to `clearTimeout`. */
    clear_timeout_source?: (handle: number) => void;
};
/**
 *  One member of a {@link JssmWeightedList}, `name` with an optional
 *  percent weight. This shape only appears inside a `weighted_list` node,
 *  which the parser produces only once at least one sibling member carries
 *  a weight — so a member here with no `weight` is a *mix* of weighted and
 *  unweighted siblings, which the compiler rejects rather than defaulting.
 *  @see JssmWeightedList
 */
type JssmWeightedListMember = {
    name: string;
    weight?: number;
};
/**
 *  A list target or start-state list carrying per-member weights, as the
 *  parser emits it for `a 50% -> [b 20% c 80%]` or
 *  `start_states: [x 90% y 10%];`. Produced only when at least one member
 *  of the source list carries a weight; a list with no weights parses to a
 *  plain `Array<string>` instead, so every existing weightless-list
 *  consumer sees a byte-identical AST.
 *  @see JssmWeightedListMember
 *  ```ts
 *  const to: Array<string> | JssmWeightedList = {
 *    key: 'weighted_list',
 *    members: [{ name: 'b', weight: 20 }, { name: 'c', weight: 80 }],
 *  };
 *  ```
 */
type JssmWeightedList = {
    key: 'weighted_list';
    members: Array<JssmWeightedListMember>;
    loc?: FslSourceLocation;
};
/**
 *  Internal compiler intermediate: one link in a chained transition
 *  expression (an "s-expression" segment).  Carries both directions of an
 *  arrow with optional per-direction action labels, probabilities, and
 *  after-times.  The recursive `se` field allows the parser to chain
 *  arrows of the form `A -> B -> C`.  Not intended for end-user code.
 *  @internal
 */
type JssmCompileSe<StateType, mDT> = {
    to: StateType;
    se?: JssmCompileSe<StateType, mDT>;
    /**
     *  The arrow token as the parser emitted it.  Deliberately `string` and not
     *  {@link JssmArrow}: this internal intermediate flows through the whole
     *  compiler, and threading a 42-member string-literal union through that much
     *  control-flow analysis overflows `tsc`'s stack (it type-checks standalone
     *  but dies under `npm run make`).  The value *is* a `JssmArrow` — the two
     *  places that care re-assert it on the way into the arrow classifiers.
     */
    kind: string;
    l_action?: StateType;
    r_action?: StateType;
    l_probability: number;
    r_probability: number;
    l_after?: number;
    r_after?: number;
    loc?: FslSourceLocation;
    to_loc?: FslSourceLocation;
    l_action_loc?: FslSourceLocation;
    r_action_loc?: FslSourceLocation;
};
/**
 *  Internal compiler intermediate: the root of a chained transition
 *  expression, anchored at a `from` state.  Also doubles as the carrier
 *  for non-transition rules (state declarations, property definitions,
 *  machine metadata) via its `key`/`value`/`name`/`state` fields.  Not
 *  intended for end-user code.
 *  @internal
 */
type JssmCompileSeStart<StateType, DataType> = {
    from: StateType;
    se: JssmCompileSe<StateType, DataType>;
    key: string;
    value?: string | number | Array<JssmStateDeclarationRule>;
    name?: string;
    state?: string;
    default_value?: any;
    required?: boolean;
    val_type?: JssmValType;
    loc?: FslSourceLocation;
    from_loc?: FslSourceLocation;
    value_loc?: FslSourceLocation;
    name_loc?: FslSourceLocation;
};
/**
 *  The output shape of the FSL parser: a flat array of
 *  {@link JssmCompileSeStart} entries, one per top-level rule in the
 *  source.  Consumed by the compiler to build a machine configuration.
 *  @internal
 */
type JssmParseTree<StateType, mDT> = Array<JssmCompileSeStart<StateType, mDT>>;
type BasicHookDescription<mDT> = {
    kind: 'hook';
    from: string;
    to: string;
    handler: HookHandler<mDT>;
};
type HookDescriptionWithAction<mDT> = {
    kind: 'named';
    from: string;
    to: string;
    action: string;
    handler: HookHandler<mDT>;
};
type StandardTransitionHook<mDT> = {
    kind: 'standard transition';
    handler: HookHandler<mDT>;
};
type MainTransitionHook<mDT> = {
    kind: 'main transition';
    handler: HookHandler<mDT>;
};
type ForcedTransitionHook<mDT> = {
    kind: 'forced transition';
    handler: HookHandler<mDT>;
};
type AnyTransitionHook<mDT> = {
    kind: 'any transition';
    handler: HookHandler<mDT>;
};
type GlobalActionHook<mDT> = {
    kind: 'global action';
    action: string;
    handler: HookHandler<mDT>;
};
type AnyActionHook<mDT> = {
    kind: 'any action';
    handler: HookHandler<mDT>;
};
type EntryHook<mDT> = {
    kind: 'entry';
    to: string;
    handler: HookHandler<mDT>;
};
type ExitHook<mDT> = {
    kind: 'exit';
    from: string;
    handler: HookHandler<mDT>;
};
type AfterHook<mDT> = {
    kind: 'after';
    from: string;
    handler: HookHandler<mDT>;
};
type AfterAnyHook<mDT> = {
    kind: 'after any';
    handler: HookHandler<mDT>;
};
type PostBasicHookDescription<mDT> = {
    kind: 'post hook';
    from: string;
    to: string;
    handler: PostHookHandler<mDT>;
};
type PostHookDescriptionWithAction<mDT> = {
    kind: 'post named';
    from: string;
    to: string;
    action: string;
    handler: PostHookHandler<mDT>;
};
type PostStandardTransitionHook<mDT> = {
    kind: 'post standard transition';
    handler: PostHookHandler<mDT>;
};
type PostMainTransitionHook<mDT> = {
    kind: 'post main transition';
    handler: PostHookHandler<mDT>;
};
type PostForcedTransitionHook<mDT> = {
    kind: 'post forced transition';
    handler: PostHookHandler<mDT>;
};
type PostAnyTransitionHook<mDT> = {
    kind: 'post any transition';
    handler: PostHookHandler<mDT>;
};
type PostGlobalActionHook<mDT> = {
    kind: 'post global action';
    action: string;
    handler: PostHookHandler<mDT>;
};
type PostAnyActionHook<mDT> = {
    kind: 'post any action';
    handler: PostHookHandler<mDT>;
};
type PostEntryHook<mDT> = {
    kind: 'post entry';
    to: string;
    handler: PostHookHandler<mDT>;
};
type PostExitHook<mDT> = {
    kind: 'post exit';
    from: string;
    handler: PostHookHandler<mDT>;
};
type PreEverythingHook<mDT> = {
    kind: 'pre everything';
    handler: EverythingHookHandler<mDT>;
};
type EverythingHook<mDT> = {
    kind: 'everything';
    handler: EverythingHookHandler<mDT>;
};
type PrePostEverythingHook<mDT> = {
    kind: 'pre post everything';
    handler: PostEverythingHookHandler<mDT>;
};
type PostEverythingHook<mDT> = {
    kind: 'post everything';
    handler: PostEverythingHookHandler<mDT>;
};
/**
 *  Discriminated union of every kind of hook registration jssm understands,
 *  pre-transition and post-transition.  The `kind` field selects the
 *  variant; remaining fields describe which transitions / states / actions
 *  the hook is bound to and supply the {@link HookHandler} or
 *  {@link PostHookHandler} to invoke.
 *
 *  Pre-transition variants (`'hook'`, `'named'`, `'standard transition'`,
 *  `'main transition'`, `'forced transition'`, `'any transition'`,
 *  `'global action'`, `'any action'`, `'entry'`, `'exit'`, `'after'`,
 *  `'after any'`) may return a falsy value to veto a transition.  Post-transition
 *  variants (`'post *'`) cannot veto and are invoked only after a
 *  successful transition.
 */
type HookDescription<mDT> = BasicHookDescription<mDT> | HookDescriptionWithAction<mDT> | GlobalActionHook<mDT> | AnyActionHook<mDT> | StandardTransitionHook<mDT> | MainTransitionHook<mDT> | ForcedTransitionHook<mDT> | AnyTransitionHook<mDT> | EntryHook<mDT> | ExitHook<mDT> | AfterHook<mDT> | AfterAnyHook<mDT> | PostBasicHookDescription<mDT> | PostHookDescriptionWithAction<mDT> | PostGlobalActionHook<mDT> | PostAnyActionHook<mDT> | PostStandardTransitionHook<mDT> | PostMainTransitionHook<mDT> | PostForcedTransitionHook<mDT> | PostAnyTransitionHook<mDT> | PostEntryHook<mDT> | PostExitHook<mDT> | PreEverythingHook<mDT> | EverythingHook<mDT> | PrePostEverythingHook<mDT> | PostEverythingHook<mDT>;
/**
 *  Whether an observational hook runs in the pre-transition phase (where it
 *  may veto/mutate the transition) or the post-transition phase (a pure
 *  observer that runs only after a successful transition commits).
 */
type HookPhase = 'pre' | 'post';
/**
 *  Normalized description of the target a registry entry is bound to.  Exactly
 *  one scope variant applies; the present fields depend on the scope:
 *
 *  - `'edge'`   carries `from` + `to` (+ optional `action` for named hooks),
 *  - `'state'`  carries `state`,
 *  - `'action'` carries `action`,
 *  - `'global'` carries no further keys (it matches everything),
 *  - `'group'`  carries `group` (a named state group with a boundary hook).
 */
type HookTarget = {
    scope: 'edge';
    from: StateType$9;
    to: StateType$9;
    action?: string;
} | {
    scope: 'state';
    state: StateType$9;
} | {
    scope: 'action';
    action: string;
} | {
    scope: 'global';
} | {
    scope: 'group';
    group: string;
};
/**
 *  Kinds for FSL boundary hooks (`on enter/exit &group do 'X'` and the plain-
 *  state analogue).  These fire post-commit when a transition crosses the
 *  subject's boundary and are not part of {@link HookDescription} (that union
 *  covers only the programmatically-registered observational hooks), so the
 *  registry widens its `kind` field with them.
 */
type HookBoundaryKind = 'group enter' | 'group exit' | 'state enter' | 'state exit';
/**
 *  One row of the generated uniform observational-hook registry.  `kind` is
 *  either an original {@link HookDescription} discriminator (e.g. `'entry'`,
 *  `'post named'`) or a {@link HookBoundaryKind} for an FSL boundary hook,
 *  `phase` is the {@link HookPhase} the hook runs in, and `target` is the
 *  normalized {@link HookTarget} it is bound to.  The triple
 *  `(kind, target, phase)` is the registry key the spec calls for.
 */
type HookRegistryEntry = {
    kind: HookDescription<unknown>['kind'] | HookBoundaryKind;
    phase: HookPhase;
    target: HookTarget;
};
/**
 *  Query for {@link jssm!Machine.has_hook} / {@link jssm!Machine.hooks_on}.  A bare
 *  string is read as a state name; an `{ from, to, action? }` object is read
 *  as an edge (optionally a named edge); an `{ action }` object is read as a
 *  named action; a `{ group }` object is read as a named state group.  This
 *  mirrors the spec's `hooks_on(state)` / `hooks_on(from→to)` /
 *  `hooks_on(action)` / `hooks_on(&group)` set with one parameter shape.
 */
type HookQuery = StateType$9 | {
    from: StateType$9;
    to: StateType$9;
    action?: string;
} | {
    action: string;
} | {
    group: string;
};
/**
 *  Richer hook return value used when a hook needs to do more than just
 *  accept or veto a transition.  `pass` is the required accept/veto flag
 *  (kept non-optional so that returning a stray object doesn't accidentally
 *  veto everything).  The optional `state` overrides the destination state,
 *  `data` overrides the data observed by other hooks in the same chain,
 *  and `next_data` overrides the data committed after the transition.
 */
type HookComplexResult<mDT> = {
    pass: boolean;
    state?: StateType$9;
    data?: mDT;
    next_data?: mDT;
};
/**
 *  Return value from a {@link HookHandler}.  May be a plain boolean to
 *  accept (`true`/`undefined`/`void`) or veto (`false`) the transition, or
 *  a {@link HookComplexResult} that additionally rewrites the next state
 *  and/or the next data payload.
 */
type HookResult<mDT> = true | false | undefined | void | HookComplexResult<mDT>;
/**
 *  Context object passed to every {@link HookHandler}.  `data` is the
 *  data payload as it stands before the transition, and `next_data` is
 *  the payload that will be committed if the transition is accepted —
 *  handlers may inspect or mutate the latter via a
 *  {@link HookComplexResult} return value.
 *
 *  The remaining fields describe the transition the hook is firing on.  They
 *  are optional because a handler is not obliged to care about them, but the
 *  transition path always supplies all of them; `action` is `undefined` when
 *  the transition was not driven by an action.
 */
type HookContext<mDT> = {
    data: mDT;
    next_data: mDT;
    /** The state being left. */
    from?: string;
    /** The state being entered. */
    to?: string;
    /** The action that drove the transition, or `undefined` if none did. */
    action?: string;
    /** Whether this transition came from `force_transition` rather than `transition`. */
    forced?: boolean;
    /**
     *  Which arrow kind the traversed edge carries — `legal`, `main`, or `forced`.
     *
     *  Populated **only when a transition-kind hook is installed** (a standard,
     *  main, or forced transition hook, or their post- equivalents).  With no such
     *  hook registered there is nothing to switch on, so jssm skips resolving the
     *  edge's kind and this is `undefined`.  Install `hook_standard_transition`
     *  (or a sibling) if a general handler needs to read it.
     */
    trans_type?: JssmArrowKind;
};
/**
 *  Context object passed to "everything" hooks ({@link EverythingHookHandler}
 *  and {@link PostEverythingHookHandler}).  Extends the usual
 *  {@link HookContext} with `hook_name`, which identifies which specific
 *  hook fired so a single handler can route on it.
 */
type EverythingHookContext<mDT> = HookContext<mDT> & {
    hook_name: string;
};
/**
 *  Signature of a pre-transition hook handler.  Receives the current and
 *  proposed-next data payloads via a {@link HookContext} and returns a
 *  {@link HookResult}: a falsy result vetoes the transition, a truthy
 *  result allows it, and a {@link HookComplexResult} can additionally
 *  rewrite the next state or next data.
 */
type HookHandler<mDT> = (hook_context: HookContext<mDT>) => HookResult<mDT>;
/**
 *  Signature of a post-transition hook handler.  Invoked after a successful
 *  transition has been committed; the return value is ignored (the
 *  transition cannot be undone).
 */
type PostHookHandler<mDT> = (hook_context: HookContext<mDT>) => void;
/**
 *  Signature of an "everything" pre-transition hook handler.  Like
 *  {@link HookHandler} but receives an {@link EverythingHookContext} so the
 *  handler can dispatch on `hook_name`.
 */
type EverythingHookHandler<mDT> = (hook_context: EverythingHookContext<mDT>) => HookResult<mDT>;
/**
 *  Signature of an "everything" post-transition hook handler.  Like
 *  {@link PostHookHandler} but receives an {@link EverythingHookContext}.
 *  The return value is ignored.
 */
type PostEverythingHookHandler<mDT> = (hook_context: EverythingHookContext<mDT>) => void;
/**
 *  Extra diagnostic information attached to a {@link jssm_error!JssmError} when it
 *  carries machine-relative context — most often the state name a caller
 *  asked about when the error was raised.
 */
type JssmErrorExtendedInfo = {
    requested_state?: StateType$9 | undefined;
    source_location?: FslSourceLocation;
};
/**
 *  Bounded history of recently-visited states paired with the data payload
 *  observed in each.  Backed by `circular_buffer_js`, so the oldest entry
 *  is dropped silently once the configured capacity is exceeded.
 */
type JssmHistory<mDT> = circular_buffer<[StateType$9, mDT]>;
/**
 *  Pluggable random-number-generator function shape.  Must return a value
 *  in `[0, 1)` exactly as `Math.random` does.  Supplied via the
 *  `rng_seed`-aware machine configuration so that stochastic models can be
 *  made reproducible.
 */
type JssmRng = () => number;
/**
 *  All event names that {@link jssm!Machine.on} accepts.  These are observation
 *  events fired by the machine in addition to (not in place of) the hook
 *  system.  Hooks intercept; events observe.
 *  @see Machine.on
 */
type JssmEventName = 'transition' | 'rejection' | 'action' | 'entry' | 'exit' | 'terminal' | 'complete' | 'error' | 'data-change' | 'override' | 'timeout' | 'hook-registration' | 'hook-removal';
/**
 *  Detail payload fired with a `transition` event.  Carries the resolved
 *  source and target, the action name (if the transition was driven by an
 *  action), the data observed before and after the change, the edge kind,
 *  and whether the call was a forced transition.
 */
type JssmTransitionEventDetail<mDT> = {
    from: StateType$9;
    to: StateType$9;
    action?: StateType$9;
    data: mDT;
    next_data?: mDT;
    trans_type: string | undefined;
    forced: boolean;
};
/**
 *  Detail payload fired with a `rejection` event.  Carries the resolved
 *  source and target plus an indication of who rejected the transition
 *  and why.  `reason` is `'invalid'` when no edge existed, `'hook'` when
 *  a hook handler vetoed; `hook_name` is set when `reason` is `'hook'`.
 */
type JssmRejectionEventDetail<mDT> = {
    from: StateType$9;
    to: StateType$9;
    action?: StateType$9;
    data: mDT;
    next_data?: mDT;
    reason: 'invalid' | 'hook';
    hook_name?: string;
    forced: boolean;
};
/**
 *  Detail payload fired with an `action` event.  Fires when an action is
 *  attempted, before transition validation runs.
 */
type JssmActionEventDetail<mDT> = {
    action: StateType$9;
    from: StateType$9;
    to?: StateType$9;
    data: mDT;
    next_data?: mDT;
};
/**
 *  Detail payload fired with an `entry` event.  `state` is the entered
 *  state.  `from` is the predecessor state, if any.  `action` is the
 *  action that drove the entry, if any.
 */
type JssmEntryEventDetail<mDT> = {
    state: StateType$9;
    from?: StateType$9;
    action?: StateType$9;
    data: mDT;
};
/**
 *  Detail payload fired with an `exit` event.  `state` is the exited
 *  state.  `to` is the next state, if any.  `action` is the action that
 *  drove the exit, if any.
 */
type JssmExitEventDetail<mDT> = {
    state: StateType$9;
    to?: StateType$9;
    action?: StateType$9;
    data: mDT;
};
/**
 *  Detail payload fired with a `terminal` event.  Indicates that the
 *  machine has reached a state with no outgoing edges.
 */
type JssmTerminalEventDetail<mDT> = {
    state: StateType$9;
    data: mDT;
};
/**
 *  Detail payload fired with a `complete` event.  Indicates that the
 *  machine has reached a FSL `complete` state.
 */
type JssmCompleteEventDetail<mDT> = {
    state: StateType$9;
    data: mDT;
};
/**
 *  Detail payload fired with an `error` event.  Wraps an exception caught
 *  while running an event handler; `source_event` and `source_detail`
 *  identify the event whose handler threw, and `handler` is the offending
 *  function so consumers can correlate / blame.
 */
type JssmErrorEventDetail = {
    error: unknown;
    source_event: JssmEventName;
    source_detail: unknown;
    handler: JssmEventHandler<unknown, JssmEventName>;
};
/**
 *  Detail payload fired with a `data-change` event.  Fires whenever the
 *  machine's data payload is replaced.  `old_data` is the value before the
 *  change; `new_data` is the value after.  `cause` names the API family that
 *  performed the replacement: a data-bearing `transition`, an `override`, or
 *  a direct `set_data` call.
 */
type JssmDataChangeEventDetail<mDT> = {
    from?: StateType$9;
    to?: StateType$9;
    action?: StateType$9;
    old_data: mDT;
    new_data: mDT;
    cause: 'transition' | 'override' | 'set_data';
};
/**
 *  Detail payload fired with an `override` event.  Distinguishes a forced
 *  state replacement from a normal transition.
 */
type JssmOverrideEventDetail<mDT> = {
    from: StateType$9;
    to: StateType$9;
    old_data: mDT;
    new_data?: mDT;
};
/**
 *  Detail payload fired with a `timeout` event.  Fires when a configured
 *  `after` clause causes an automatic transition.
 */
type JssmTimeoutEventDetail = {
    from: StateType$9;
    to: StateType$9;
    after_time: number;
};
/**
 *  Detail payload fired with `hook-registration` and `hook-removal` events.
 *  Mirrors the {@link HookDescription} so inspector tools can mirror the
 *  current hook set.
 */
type JssmHookLifecycleEventDetail<mDT> = {
    description: HookDescription<mDT>;
};
/**
 *  Mapped type from {@link JssmEventName} to the corresponding detail
 *  payload.  Drives the discriminated-union typing of {@link jssm!Machine.on},
 *  so `e.action` and friends only exist where they're meaningful.
 */
type JssmEventDetailMap<mDT> = {
    'transition': JssmTransitionEventDetail<mDT>;
    'rejection': JssmRejectionEventDetail<mDT>;
    'action': JssmActionEventDetail<mDT>;
    'entry': JssmEntryEventDetail<mDT>;
    'exit': JssmExitEventDetail<mDT>;
    'terminal': JssmTerminalEventDetail<mDT>;
    'complete': JssmCompleteEventDetail<mDT>;
    'error': JssmErrorEventDetail;
    'data-change': JssmDataChangeEventDetail<mDT>;
    'override': JssmOverrideEventDetail<mDT>;
    'timeout': JssmTimeoutEventDetail;
    'hook-registration': JssmHookLifecycleEventDetail<mDT>;
    'hook-removal': JssmHookLifecycleEventDetail<mDT>;
};
/**
 *  Filter accepted by {@link jssm!Machine.on} / {@link jssm!Machine.once} for an
 *  individual event name.  Only events whose detail key matches every
 *  filter entry fire the handler.  Events that don't list a filter key in
 *  v1 take no filter properties.
 */
type JssmEventFilterMap<mDT> = {
    'transition': {
        from?: StateType$9;
        to?: StateType$9;
    };
    'rejection': Record<string, never>;
    'action': Record<string, never>;
    'entry': {
        state?: StateType$9;
    };
    'exit': {
        state?: StateType$9;
    };
    'terminal': Record<string, never>;
    'complete': Record<string, never>;
    'error': Record<string, never>;
    'data-change': Record<string, never>;
    'override': Record<string, never>;
    'timeout': Record<string, never>;
    'hook-registration': Record<string, never>;
    'hook-removal': Record<string, never>;
};
/**
 *  Per-event filter object (as passed to {@link jssm!Machine.on}).  Use
 *  `JssmEventDetailMap<mDT>[Ev]` to find the matching detail type.
 *  @template mDT The type of the machine data member.
 *  @template Ev  The event name.
 */
type JssmEventFilter<mDT, Ev extends JssmEventName> = JssmEventFilterMap<mDT>[Ev];
/**
 *  Per-event handler signature.  Receives a detail object typed by event
 *  name, so `e.action` (etc.) only exist where they're meaningful.
 *  @template mDT The type of the machine data member.
 *  @template Ev  The event name.
 */
type JssmEventHandler<mDT, Ev extends JssmEventName> = (detail: JssmEventDetailMap<mDT>[Ev]) => void;
/**
 *  Function returned by {@link jssm!Machine.on} and {@link jssm!Machine.once} that
 *  removes the subscription.  Calling it more than once is a no-op.
 */
type JssmUnsubscribe = () => void;

/**
 * String interning support for the jssm machine internals.
 *
 * State and action names are interned to dense integer ids at machine
 * construction so that per-transition dispatch can use numeric map keys
 * (integer hashing) instead of repeated string-keyed lookups.  Internal
 * machinery only — deliberately not re-exported from the `jssm` public
 * surface, so the public API is unchanged.
 * @internal
 */
/**
 * A string↔integer bimap.  Assigns dense ids (0, 1, 2, …) in first-seen
 * order; lookups are O(1) both directions.  Grows monotonically — there is
 * no removal, matching machine semantics (states and actions are fixed
 * after construction; late interning only happens for never-matching
 * lookups such as hook registrations naming unknown states).
 * @example
 *   const i = new Interner();
 *   i.intern('red');     // 0
 *   i.intern('green');   // 1
 *   i.intern('red');     // 0  (idempotent)
 *   i.id_of('green');    // 1
 *   i.name_of(0);        // 'red'
 * @see pair_key
 */
declare class Interner {
    private readonly ids;
    private readonly names;
    constructor();
    /**
     * Return the id for `name`, assigning the next dense id if the name has
     * not been seen before.
     * @param name - The string to intern.
     * @returns The (possibly newly assigned) integer id.
     * @example
     *   interner.intern('red');  // 0 on first call, 0 on every later call
     */
    intern(name: string): number;
    /**
     * Return the id for `name` without interning, or `undefined` when the
     * name has never been interned.  This is the hot-path probe for
     * user-supplied names.
     * @param name - The string to look up.
     * @example
     *   interner.id_of('mauve');  // undefined — never interned
     */
    id_of(name: string): number | undefined;
    /**
     * Return the name for `id`, or `undefined` for an id never assigned.
     * @param id - The integer id to invert.
     * @example
     *   interner.name_of(0);  // 'red'
     */
    name_of(id: number): string | undefined;
    /** The count of distinct interned names. */
    get size(): number;
}

/*******
 *
 *  The events family: subscribing to, and dispatching, the machine's typed
 *  observation events (`transition`, `entry`, `exit`, `rejection`, `timeout`,
 *  `error`, ...).  Every function takes the machine as its first argument and
 *  works on the machine's `_event_handlers` table directly; the `Machine`
 *  class methods of the same names are one-line delegates onto these.
 *
 *  `on`, `once`, and `off` are the public surface (re-exported by the `jssm`
 *  barrel).  `fire`, `fire_one`, and `has_subscribers` are the dispatch side,
 *  exported for the other families (the transition commit, the timers) but
 *  not part of the barrel.
 *
 */

/**
 *  Internal record holding a single registered event subscription: the
 *  handler, its optional filter, and a flag for `once` semantics.  Exported
 *  only so the machine's `_event_handlers` field can name its element type.
 *  @internal
 */
type JssmEventEntry<mDT, Ev extends JssmEventName> = {
    handler: JssmEventHandler<mDT, Ev>;
    filter?: JssmEventFilter<mDT, Ev>;
    once: boolean;
};
/**
 *  Subscribe to a typed observation event.  Hooks (`set_hook` and friends)
 *  intercept and may cancel a transition; events fire alongside the same
 *  state-machine moments but cannot influence the outcome.  This is the
 *  surface most users actually want for "tell me when state changes".
 *
 *  Handlers run synchronously, in registration order.  A throwing handler
 *  does not block subsequent handlers — its exception is caught and
 *  re-emitted as an `error` event whose detail names the original event
 *  and the offending handler.
 *
 *  @example
 *  import { sm, on, transition } from 'jssm';
 *
 *  const m    = sm`a -> b -> c;`;
 *  const seen: string[] = [];
 *
 *  on(m, 'transition', e => { seen.push(`${e.from} -> ${e.to}`); });
 *  on(m, 'entry', { state: 'c' }, e => { seen.push(`entered ${e.state}`); });
 *
 *  const unsubscribe = on(m, 'transition', () => { seen.push('never'); });
 *  unsubscribe();
 *
 *  transition(m, 'b');
 *  transition(m, 'c');
 *  seen;  // => ['a -> b', 'b -> c', 'entered c']
 *
 *  @template Ev      The event name (drives the detail type).
 *  @param m           The machine to subscribe on.
 *  @param name        The event name to subscribe to.
 *  @param handler     The handler invoked on each matching delivery.  The
 *                     four-argument `(m, name, filter, handler)` form inserts
 *                     a filter object before the handler (see the example
 *                     above).
 *  @returns A function that unsubscribes when called.
 *  @see off
 *  @see once
 */
declare function on<mDT, Ev extends JssmEventName>(m: Machine<mDT>, name: Ev, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
declare function on<mDT, Ev extends JssmEventName>(m: Machine<mDT>, name: Ev, filter: JssmEventFilter<mDT, Ev>, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
/**
 *  Subscribe to a typed observation event for one matching delivery, then
 *  auto-remove.  Accepts the same `(m, name, handler)` and `(m, name, filter,
 *  handler)` shapes as {@link on}.
 *
 *  @example
 *  import { sm, once, transition } from 'jssm';
 *
 *  const m = sm`a -> b -> c;`;
 *  let count = 0;
 *
 *  once(m, 'transition', () => { count += 1; });
 *
 *  transition(m, 'b');
 *  transition(m, 'c');
 *  count;  // => 1
 *
 *  @template Ev      The event name.
 *  @param m           The machine to subscribe on.
 *  @param name        The event name.
 *  @param handler     The handler invoked on the first matching delivery.  The
 *                     four-argument `(m, name, filter, handler)` form inserts
 *                     a filter object before the handler (same shapes as `on`).
 *  @returns A function that unsubscribes early if called before the
 *           handler has fired.
 *  @see on
 *  @see off
 */
declare function once<mDT, Ev extends JssmEventName>(m: Machine<mDT>, name: Ev, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
declare function once<mDT, Ev extends JssmEventName>(m: Machine<mDT>, name: Ev, filter: JssmEventFilter<mDT, Ev>, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
/**
 *  Remove a previously-registered event handler.  Match is by reference —
 *  the same function value passed to {@link on} or {@link once}.  Returns
 *  `true` if a subscription was found and removed, `false` otherwise.
 *
 *  @example
 *  import { sm, on, off } from 'jssm';
 *
 *  const m  = sm`a -> b;`;
 *  const fn = () => {};
 *
 *  on(m, 'transition', fn);
 *  off(m, 'transition', fn);  // => true
 *  off(m, 'transition', fn);  // => false
 *
 *  @param m       The machine the handler was registered on.
 *  @param name    The event name.
 *  @param handler The handler reference to remove.
 *  @returns `true` if removed, `false` if no match was registered.
 */
declare function off<mDT, Ev extends JssmEventName>(m: Machine<mDT>, name: Ev, handler: JssmEventHandler<mDT, Ev>): boolean;

type StateType$8 = string;

declare const shapes$1: string[];
declare const gviz_shapes$1: string[];
declare const named_colors$1: string[];
declare const state_name_chars$1: readonly {
    from: string;
    to: string;
}[];
declare const state_name_first_chars$1: readonly {
    from: string;
    to: string;
}[];
declare const action_label_chars$1: readonly {
    from: string;
    to: string;
}[];
declare const is_state_name_first_char$1: (ch: string) => boolean;
declare const is_state_name_char$1: (ch: string) => boolean;

/*******
 *
 *  Core finite state machine class.  Holds the full graph of states and
 *  transitions, the current state, hooks, data, properties, and all runtime
 *  behavior.  Typically created via the {@link sm} tagged template literal
 *  rather than constructed directly.
 *
 *  ```typescript
 *  import { sm } from 'jssm';
 *
 *  const light = sm`Red 'next' => Green 'next' => Yellow 'next' => Red;`;
 *  light.state();       // 'Red'
 *  light.action('next'); // true
 *  light.state();       // 'Green'
 *  ```
 *
 *  @typeParam mDT The machine data type — the type of the value stored in
 *  `.data()`.  Defaults to `undefined` when no data is used.
 *
 */
declare class Machine<mDT> {
    _state: StateType$8;
    _states: Map<StateType$8, JssmGenericState>;
    _edges: Array<JssmTransition<StateType$8, mDT>>;
    _edge_map: Map<StateType$8, Map<StateType$8, number>>;
    _outbound_edge_ids: Map<StateType$8, Array<number>>;
    _named_transitions: Map<StateType$8, number>;
    _actions: Map<StateType$8, Map<StateType$8, number>>;
    _reverse_actions: Map<StateType$8, Map<StateType$8, number>>;
    _reverse_action_targets: Map<StateType$8, Map<StateType$8, number>>;
    _state_interner: Interner;
    _action_interner: Interner;
    _state_id: number;
    _edge_id_by_pair: Map<number, number>;
    _edge_id_by_action_pair: Map<number, number>;
    _edge_to_ids: Array<number>;
    _start_states: Set<StateType$8>;
    _start_state_weights: Map<StateType$8, number>;
    _end_states: Set<StateType$8>;
    _failed_outputs: Set<StateType$8>;
    _machine_author?: Array<string>;
    _machine_comment?: string;
    _machine_contributor?: Array<string>;
    _machine_definition?: string;
    _machine_language?: string;
    _machine_license?: string;
    _machine_name?: string;
    _machine_version?: JssmParsedSemver;
    _npm_name?: string;
    _default_size?: JssmDefaultSize;
    _fsl_version?: JssmParsedSemver;
    _raw_state_declaration?: Array<object>;
    _state_declarations: Map<StateType$8, JssmStateDeclaration>;
    _data?: mDT;
    _instance_name: string;
    _rng_seed: number;
    _rng: JssmRng;
    _graph_layout: JssmLayout;
    _dot_preamble: string;
    _default_transition_config: JssmTransitionConfig | undefined;
    _default_graph_config: JssmGraphConfig | undefined;
    _arrange_declaration: Array<Array<StateType$8>>;
    _arrange_start_declaration: Array<Array<StateType$8>>;
    _arrange_end_declaration: Array<Array<StateType$8>>;
    _oarrange_declaration: Array<Array<StateType$8>>;
    _farrange_declaration: Array<Array<StateType$8>>;
    _themes: FslTheme[];
    _flow: FslDirection;
    _has_hooks: boolean;
    _has_basic_hooks: boolean;
    _has_named_hooks: boolean;
    _has_entry_hooks: boolean;
    _has_exit_hooks: boolean;
    _has_after_hooks: boolean;
    _has_global_action_hooks: boolean;
    _has_transition_hooks: boolean;
    _has_forced_transitions: boolean;
    _hooks: Map<number, HookHandler<mDT>>;
    _named_hooks: Map<number, Map<number, HookHandler<mDT>>>;
    _entry_hooks: Map<number, HookHandler<mDT>>;
    _exit_hooks: Map<number, HookHandler<mDT>>;
    _after_hooks: Map<string, HookHandler<mDT>>;
    _after_any_hook: HookHandler<mDT> | undefined;
    _global_action_hooks: Map<number, HookHandler<mDT>>;
    _any_action_hook: HookHandler<mDT> | undefined;
    _standard_transition_hook: HookHandler<mDT> | undefined;
    _main_transition_hook: HookHandler<mDT> | undefined;
    _forced_transition_hook: HookHandler<mDT> | undefined;
    _any_transition_hook: HookHandler<mDT> | undefined;
    _has_post_hooks: boolean;
    _has_post_basic_hooks: boolean;
    _has_post_named_hooks: boolean;
    _has_post_entry_hooks: boolean;
    _has_post_exit_hooks: boolean;
    _has_post_global_action_hooks: boolean;
    _has_post_transition_hooks: boolean;
    _code_allows_override: JssmAllowsOverride;
    _config_allows_override: JssmAllowsOverride;
    _allow_islands: JssmAllowIslands;
    _editor_config?: JssmEditorConfig;
    _post_hooks: Map<number, HookHandler<mDT>>;
    _post_named_hooks: Map<number, Map<number, HookHandler<mDT>>>;
    _post_entry_hooks: Map<number, HookHandler<mDT>>;
    _post_exit_hooks: Map<number, HookHandler<mDT>>;
    _post_global_action_hooks: Map<number, HookHandler<mDT>>;
    _post_any_action_hook: HookHandler<mDT> | undefined;
    _post_standard_transition_hook: HookHandler<mDT> | undefined;
    _post_main_transition_hook: HookHandler<mDT> | undefined;
    _post_forced_transition_hook: HookHandler<mDT> | undefined;
    _post_any_transition_hook: HookHandler<mDT> | undefined;
    _pre_everything_hook: EverythingHookHandler<mDT> | undefined;
    _everything_hook: EverythingHookHandler<mDT> | undefined;
    _pre_post_everything_hook: PostEverythingHookHandler<mDT> | undefined;
    _post_everything_hook: PostEverythingHookHandler<mDT> | undefined;
    _property_keys: Set<string>;
    _default_properties: Map<string, any>;
    _state_properties: Map<string, any>;
    _required_properties: Set<string>;
    _state_property_first_state: Map<string, StateType$8>;
    _val_keys: Set<string>;
    _val_types: Map<string, JssmValType>;
    _val_values: Map<string, any>;
    _required_vals: Set<string>;
    _history: JssmHistory<mDT>;
    _history_length: number;
    _state_style: JssmStateConfig;
    _active_state_style: JssmStateConfig;
    _hooked_state_style: JssmStateConfig;
    _terminal_state_style: JssmStateConfig;
    _start_state_style: JssmStateConfig;
    _end_state_style: JssmStateConfig;
    _group_registry: JssmGroupRegistry;
    _group_metadata: Map<string, JssmStateConfig>;
    _group_hooks: JssmGroupHooks;
    _state_hooks: JssmStateHooks;
    _state_to_groups: Map<StateType$8, Set<string>>;
    _group_order: string[];
    _static_state_config_cache: Map<StateType$8, JssmStateConfig>;
    _state_labels: Map<string, string>;
    _time_source: () => number;
    _create_started: number;
    _created: number;
    _after_mapping: Map<string, [string, number]>;
    _timeout_source: (f: () => void, a: number) => number;
    _clear_timeout_source: (h: number) => void;
    _timeout_handle: number | undefined;
    _timeout_target: string | undefined;
    _timeout_target_time: number | undefined;
    _event_handlers: Map<JssmEventName, Set<JssmEventEntry<any, any>>>;
    _event_listener_count: number;
    _firing_error: boolean;
    _committing_transition: boolean;
    _boundary_depth: number;
    _boundary_depth_limit: number;
    constructor({ start_states, start_state_weights, end_states, failed_outputs, initial_state, start_states_no_enforce, complete, transitions, machine_author, machine_comment, machine_contributor, machine_definition, machine_language, machine_license, machine_name, machine_version, npm_name, default_size, state_declaration, property_definition, val_definition, vals, state_property, fsl_version, dot_preamble, arrange_declaration, arrange_start_declaration, arrange_end_declaration, oarrange_declaration, farrange_declaration, theme, flow, graph_layout, instance_name, history, boundary_depth_limit, data, default_state_config, default_active_state_config, default_hooked_state_config, default_terminal_state_config, default_start_state_config, default_end_state_config, default_transition_config, default_graph_config, group_registry, group_metadata, group_hooks, state_hooks, allows_override, config_allows_override, allow_islands, editor_config, rng_seed, time_source, timeout_source, clear_timeout_source }: JssmGenericConfig<StateType$8, mDT>);
    /********
     *
     *  Internal method for fabricating states.  Not meant for external use.
     *  Delegates to the create family's {@link new_state}, which carries the
     *  full contract.
     *
     *  @see new_state
     *
     *  @internal
     *
     */
    _new_state(state_config: JssmGenericState): StateType$8;
    /**
     *  Get the current state of a machine.  Delegates to the query family's
     *  {@link state}, which carries the full contract and example.
     *  @see state
     */
    state(): StateType$8;
    /**
     *  Get the label for a given state, if any.  Delegates to the query
     *  family's {@link label_for}, which carries the full contract and example.
     *  @see label_for
     */
    label_for(state: StateType$8): string;
    /**
     *  Get whatever the node should show as text.  Delegates to the query
     *  family's {@link display_text}, which carries the full contract and
     *  example.
     *  @see display_text
     */
    display_text(state: StateType$8): string;
    /**
     *  Get the current data of a machine, as a deep clone.  Delegates to the
     *  data family's {@link data}, which carries the full contract and example.
     *  @see data
     */
    data(): mDT;
    /**
     *  Replace the machine's data in place, without a transition.  Delegates
     *  to the data family's {@link set_data}, which carries the full contract
     *  and example.
     *  @returns The machine, for chaining.
     *  @see set_data
     */
    set_data(newData: mDT): Machine<mDT>;
    /**
     *  The machine's current data by REFERENCE — no clone.  Delegates to the
     *  data family's {@link data_ref}, which carries the full contract; kept
     *  on the class because the same-package panels (`fsl_bind_wc`) and tests
     *  reach it by this name.
     *  @returns The live data value; treat as read-only.
     *  @see data_ref
     *  @internal
     */
    _data_ref(): mDT;
    /**
     *  Get the current value of a given property name, or `undefined`.
     *  Delegates to the data family's {@link prop}, which carries the full
     *  contract and example.
     *  @see prop
     */
    prop(name: string): any;
    /**
     *  Get the current value of a given property name, throwing when it is
     *  missing.  Delegates to the data family's {@link strict_prop}, which
     *  carries the full contract and example.
     *  @throws {JssmError} If the property is not defined on the current state
     *  and has no default.
     *  @see strict_prop
     */
    strict_prop(name: string): any;
    /**
     *  Get the current value of every prop, as an object.  Delegates to the
     *  data family's {@link props}, which carries the full contract and
     *  example.
     *  @see props
     */
    props(): object;
    /**
     *  Check whether a given string is a known property's name.  Delegates to
     *  the data family's {@link known_prop}.
     *  @see known_prop
     */
    known_prop(prop_name: string): boolean;
    /**
     *  List all known property names.  Delegates to the data family's
     *  {@link known_props}.
     *  @see known_props
     */
    known_props(): string[];
    /**
     *  Read the current value of a declared machine `val`.  Delegates to the
     *  data family's {@link val}, which carries the full contract and example.
     *  @throws {JssmError} If `name` is not a declared val.
     *  @see val
     */
    val(name: string): any;
    /**
     *  Set the value of a declared machine `val`, validating it against the
     *  val's declared type.  Delegates to the data family's {@link set_val},
     *  which carries the full contract and example.
     *  @throws {JssmError} If `name` is not a declared val, or `value` violates the type.
     *  @see set_val
     */
    set_val(name: string, value: any): void;
    /**
     *  Return a plain object mapping every declared val name to its current
     *  value.  Delegates to the data family's {@link vals}.
     *  @see vals
     */
    vals(): object;
    /**
     *  Check whether a string is the name of a declared `val`.  Delegates to
     *  the data family's {@link known_val}.
     *  @see known_val
     */
    known_val(name: string): boolean;
    /**
     *  List every declared `val` name, in declaration order.  Delegates to the
     *  data family's {@link known_vals}.
     *  @see known_vals
     */
    known_vals(): string[];
    /**
     *  Return the declared type descriptor of a `val`.  Delegates to the data
     *  family's {@link val_type}.
     *  @throws {JssmError} If `name` is not a declared val.
     *  @see val_type
     */
    val_type(name: string): JssmValType;
    /**
     *  Check whether a given state is a valid start state.  Delegates to the
     *  query family's {@link is_start_state}, which carries the full contract
     *  and example.
     *  @see is_start_state
     */
    is_start_state(whichState: StateType$8): boolean;
    /**
     *  The initial distribution declared by a weighted `start_states` list
     *  (6.0).  Delegates to the stochastic family's
     *  {@link start_state_weights}, which carries the full contract and
     *  example.
     *  @see start_state_weights
     */
    start_state_weights(): Map<StateType$8, number>;
    /**
     *  Draws a start state from the weighted start distribution using the
     *  machine's RNG.  Delegates to the stochastic family's
     *  {@link sample_start_state}, which carries the full contract and
     *  example.
     *  @see sample_start_state
     */
    sample_start_state(): StateType$8;
    /**
     *  Check whether a given state is a declared end state.  Delegates to the
     *  query family's {@link is_end_state}, which carries the full contract
     *  and example.
     *  @see is_end_state
     */
    is_end_state(whichState: StateType$8): boolean;
    /**
     *  Get the set of states declared as failure outputs for this machine.
     *  Delegates to the query family's {@link failed_outputs}.
     *  @see failed_outputs
     */
    failed_outputs(): Array<StateType$8>;
    /**
     *  Check whether a given state is declared as a failure output.  Delegates
     *  to the query family's {@link is_failed_output}.
     *  @see is_failed_output
     */
    is_failed_output(whichState: StateType$8): boolean;
    /**
     *  Check whether the machine is currently in a failure state.  Delegates
     *  to the query family's {@link is_failed}.
     *  @see is_failed
     */
    is_failed(): boolean;
    /**
     *  Check whether a given state is final (either has no exits or is marked
     *  `complete`.)  Delegates to the query family's {@link state_is_final},
     *  which carries the full contract and example.
     *  @see state_is_final
     */
    state_is_final(whichState: StateType$8): boolean;
    /**
     *  Check whether the current state is final.  Delegates to the query
     *  family's {@link is_final}, which carries the full contract and example.
     *  @see is_final
     */
    is_final(): boolean;
    /**
     *  Serialize the current machine to a structure.  Delegates to the create
     *  family's {@link serialize}, which carries the full contract.
     *  @see serialize
     */
    serialize(comment?: string): JssmSerialization<mDT>;
    /**
     *  The RFC 8785 canonical-config identity of the current configuration.
     *  Delegates to the query family's {@link canonical}, which carries the
     *  full contract and example.
     *  @returns The canonical config string.
     *  @see canonical
     */
    canonical(): string;
    /**
     * Get the graph layout direction.  Delegates to the style family's
     *  {@link graph_layout}.
     *  @see graph_layout
     */
    graph_layout(): string;
    /**
     * Get the Graphviz DOT preamble string.  Delegates to the style family's
     *  {@link dot_preamble}.
     *  @see dot_preamble
     */
    dot_preamble(): string;
    /**
     * Get the consolidated `transition: {}` default-config block.  Delegates
     *  to the style family's {@link default_transition_config}, which carries
     *  the full contract and example.
     *  @see default_transition_config
     */
    default_transition_config(): JssmTransitionConfig | undefined;
    /**
     * Get the consolidated `graph: {}` default-config block.  Delegates to
     *  the style family's {@link default_graph_config}, which carries the full
     *  contract and example.
     *  @see default_graph_config
     */
    default_graph_config(): JssmGraphConfig | undefined;
    /**
     * Get the machine's author list.  Delegates to the query family's
     *  {@link machine_author}.
     *  @see machine_author
     */
    machine_author(): Array<string>;
    /**
     * Get the machine's comment string.  Delegates to the query family's
     *  {@link machine_comment}.
     *  @see machine_comment
     */
    machine_comment(): string;
    /**
     * Get the machine's contributor list.  Delegates to the query family's
     *  {@link machine_contributor}.
     *  @see machine_contributor
     */
    machine_contributor(): Array<string>;
    /**
     * Get the machine's definition string.  Delegates to the query family's
     *  {@link machine_definition}.
     *  @see machine_definition
     */
    machine_definition(): string;
    /**
     * Get the machine's natural language as an ISO 639-1 code.  Delegates to
     *  the query family's {@link machine_language}, which carries the full
     *  contract.
     *  @see machine_language
     */
    machine_language(): string;
    /**
     * Get the machine's license string.  Delegates to the query family's
     *  {@link machine_license}.
     *  @see machine_license
     */
    machine_license(): string;
    /**
     * Get the machine's name.  Delegates to the query family's
     *  {@link machine_name}.
     *  @see machine_name
     */
    machine_name(): string;
    /**
     * The editor/panel defaults declared in the FSL `editor: {}` block, or
     *  `undefined`.  Delegates to the query family's {@link editor_config},
     *  which carries the full contract and example.
     *  @see editor_config
     */
    editor_config(): JssmEditorConfig | undefined;
    /**
     * Get the npm package name associated with the machine, or `undefined`.
     *  Delegates to the query family's {@link npm_name}.
     *  @see npm_name
     */
    npm_name(): string;
    /**
     * Get the render-size hint for the machine's visualization, or
     *  `undefined`.  Delegates to the query family's {@link default_size},
     *  which carries the full contract.
     *  @see default_size
     */
    default_size(): JssmDefaultSize | undefined;
    /**
     * Get the machine's declared version, parsed, or `undefined`.  Delegates
     *  to the query family's {@link machine_version}, which carries the full
     *  contract and example.
     *  @see machine_version
     */
    machine_version(): JssmParsedSemver | undefined;
    /**
     * Get the raw state declaration objects as parsed from the FSL source.
     *  Delegates to the query family's {@link raw_state_declarations}.
     *  @see raw_state_declarations
     */
    raw_state_declarations(): Array<object>;
    /**
     * Get the processed state declaration for a specific state.  Delegates to
     *  the query family's {@link state_declaration}.
     *  @see state_declaration
     */
    state_declaration(which: StateType$8): JssmStateDeclaration;
    /**
     * Get all processed state declarations as a Map.  Delegates to the query
     *  family's {@link state_declarations}.
     *  @see state_declarations
     */
    state_declarations(): Map<StateType$8, JssmStateDeclaration>;
    /**
     * Get the FSL language version this machine declares, parsed, or
     *  `undefined`.  Delegates to the query family's {@link fsl_version},
     *  which carries the full contract and example.
     *  @see fsl_version
     */
    fsl_version(): JssmParsedSemver | undefined;
    /**
     * Get the complete internal state of the machine as a serializable
     *  structure.  Delegates to the query family's {@link machine_state}.
     *  @see machine_state
     */
    machine_state(): JssmMachineInternalState<mDT>;
    /**
     *  List all the states known by the machine.  Delegates to the query
     *  family's {@link states}, which carries the full contract and example.
     *  @see states
     */
    states(): Array<StateType$8>;
    /**
     * Get the internal state descriptor for a given state name.  Delegates to
     *  the query family's {@link state_for}.
     *  @throws {JssmError} If the state does not exist.
     *  @see state_for
     */
    state_for(whichState: StateType$8): JssmGenericState;
    /**
     *  Check whether the machine knows a given state.  Delegates to the query
     *  family's {@link has_state}, which carries the full contract and example.
     *  @see has_state
     */
    has_state(whichState: StateType$8): boolean;
    /**
     *  Lists all edges of a machine.  Delegates to the query family's
     *  {@link list_edges}, which carries the full contract and example.
     *  @see list_edges
     */
    list_edges(): Array<JssmTransition<StateType$8, mDT>>;
    /**
     * Get the map of named transitions.  Delegates to the query family's
     *  {@link list_named_transitions}.
     *  @see list_named_transitions
     */
    list_named_transitions(): Map<StateType$8, number>;
    /**
     * List all distinct action names defined anywhere in the machine.
     *  Delegates to the query family's {@link list_actions}.
     *  @see list_actions
     */
    list_actions(): Array<StateType$8>;
    /**
     * Whether any actions are defined on this machine.  Delegates to the
     *  query family's {@link uses_actions}.
     *  @see uses_actions
     */
    get uses_actions(): boolean;
    /**
     * Whether any forced (`~>`) transitions exist in this machine.  Delegates
     *  to the query family's {@link uses_forced_transitions}.
     *  @see uses_forced_transitions
     */
    get uses_forced_transitions(): boolean;
    /**
     *  Check if the code that built the machine allows overriding state and
     *  data.  Delegates to the query family's {@link code_allows_override}.
     *  @see code_allows_override
     */
    get code_allows_override(): JssmAllowsOverride;
    /**
     *  Check if the machine config allows overriding state and data.
     *  Delegates to the query family's {@link config_allows_override}.
     *  @see config_allows_override
     */
    get config_allows_override(): JssmAllowsOverride;
    /**
     *  Check if a machine allows overriding state and data, resolving code
     *  and config.  Delegates to the query family's {@link allows_override},
     *  which carries the full contract.
     *  @see allows_override
     */
    get allows_override(): JssmAllowsOverride;
    /**
     *  Return the effective island policy for this machine.  Delegates to the
     *  query family's {@link allow_islands}, which carries the full contract.
     *  @see allow_islands
     */
    get allow_islands(): JssmAllowIslands;
    /**
     * List all available theme names.  Delegates to the style family's
     *  {@link all_themes}.
     *  @see all_themes
     */
    all_themes(): FslTheme[];
    /**
     * List the ASCII character ranges accepted in any but the first position
     *  of a state name.  Delegates to the query family's
     *  {@link all_state_name_chars}, which carries the full contract and
     *  example.
     *  @see all_state_name_chars
     */
    all_state_name_chars(): ReadonlyArray<{
        from: string;
        to: string;
    }>;
    /**
     * List the ASCII character ranges accepted in the first position of a
     *  state name.  Delegates to the query family's
     *  {@link all_state_name_first_chars}, which carries the full contract
     *  and example.
     *  @see all_state_name_first_chars
     */
    all_state_name_first_chars(): ReadonlyArray<{
        from: string;
        to: string;
    }>;
    /**
     * List the character ranges accepted inside a single-quoted FSL action
     *  label.  Delegates to the query family's {@link all_action_label_chars},
     *  which carries the full contract and example.
     *  @see all_action_label_chars
     */
    all_action_label_chars(): ReadonlyArray<{
        from: string;
        to: string;
    }>;
    /**
     * Get the active theme(s) for this machine.  Delegates to the style
     *  family's {@link themes}.
     *  @see themes
     */
    get themes(): FslTheme | FslTheme[];
    /**
     * Set the active theme(s).  Delegates to the style family's
     *  {@link set_themes}, which carries the full contract and example
     *  (including the config-cache invalidation).
     *  @see set_themes
     */
    set themes(to: FslTheme | FslTheme[]);
    /**
     * Get the flow direction for graph layout.  Delegates to the style
     *  family's {@link flow}.
     *  @see flow
     */
    flow(): FslDirection;
    /**
     * Look up a transition's edge index by source and target state names.
     *  Delegates to the query family's {@link get_transition_by_state_names}.
     *  @see get_transition_by_state_names
     */
    get_transition_by_state_names(from: StateType$8, to: StateType$8): number;
    /**
     * Look up the full transition object for a given source→target pair.
     *  Delegates to the query family's {@link lookup_transition_for}.
     *  @see lookup_transition_for
     */
    lookup_transition_for(from: StateType$8, to: StateType$8): JssmTransition<StateType$8, mDT>;
    /**
     *  List all transitions attached to a state, sorted by entrance and exit.
     *  Delegates to the query family's {@link list_transitions}, which carries
     *  the full contract and example.
     *  @see list_transitions
     */
    list_transitions(whichState?: StateType$8): JssmTransitionList;
    /**
     *  List all entrances attached to a state.  Delegates to the query
     *  family's {@link list_entrances}, which carries the full contract and
     *  example.
     *  @see list_entrances
     */
    list_entrances(whichState?: StateType$8): Array<StateType$8>;
    /**
     *  List all exits attached to a state.  Delegates to the query family's
     *  {@link list_exits}, which carries the full contract and example.
     *  @see list_exits
     */
    list_exits(whichState?: StateType$8): Array<StateType$8>;
    /**
     * Get the transitions available from a state for use by the probabilistic
     *  walk system.  Delegates to the stochastic family's
     *  {@link probable_exits_for}, which carries the full contract.
     *  @throws {JssmError} If the state does not exist.
     *  @see probable_exits_for
     */
    probable_exits_for(whichState: StateType$8): Array<JssmTransition<StateType$8, mDT>>;
    /**
     * Take a single random transition from the current state, weighted by
     *  edge probabilities.  Delegates to the stochastic family's
     *  {@link probabilistic_transition}, which carries the full contract.
     *  @see probabilistic_transition
     */
    probabilistic_transition(): boolean;
    /**
     * Take `n` consecutive probabilistic transitions and return the states
     *  visited.  Delegates to the stochastic family's
     *  {@link probabilistic_walk}, which carries the full contract.
     *  @see probabilistic_walk
     */
    probabilistic_walk(n: number): Array<StateType$8>;
    /**
     * Take `n` probabilistic steps and return a histograph of the visits.
     *  Delegates to the stochastic family's {@link probabilistic_histo_walk},
     *  which carries the full contract.
     *  @see probabilistic_histo_walk
     */
    probabilistic_histo_walk(n: number): Map<StateType$8, number>;
    /**
     * Lazily yield one {@link JssmStochasticRun} at a time.  Delegates to the
     *  stochastic family's {@link stochastic_runs} generator, which carries
     *  the full contract and example; `yield*` forwards every yielded run and
     *  the generator's completion unchanged.
     *  @see stochastic_runs
     */
    stochastic_runs(opts?: JssmStochasticOptions): Generator<JssmStochasticRun>;
    /**
     * Run many weighted-random walks and return aggregate statistics.
     *  Delegates to the stochastic family's {@link stochastic_summary}, which
     *  carries the full contract and example.
     *  @see stochastic_summary
     */
    stochastic_summary(opts?: JssmStochasticOptions): JssmStochasticSummary;
    /**
     *  List all actions available from a state.  Delegates to the query
     *  family's {@link actions}, which carries the full contract and example.
     *  @throws {JssmError} If the state does not exist.
     *  @see actions
     */
    actions(whichState?: StateType$8): Array<StateType$8>;
    /**
     *  List all states that have a specific action attached.  Delegates to
     *  the query family's {@link list_states_having_action}, which carries the
     *  full contract and example.
     *  @throws {JssmError} If no state has the action.
     *  @see list_states_having_action
     */
    list_states_having_action(whichState: StateType$8): Array<StateType$8>;
    /**
     * List all action names available as exits from a given state.  Delegates
     *  to the query family's {@link list_exit_actions}, which carries the full
     *  contract and example.
     *  @throws {JssmError} If the state does not exist.
     *  @see list_exit_actions
     */
    list_exit_actions(whichState?: StateType$8): Array<StateType$8>;
    /**
     * List all action exits from a state with their probabilities and shares.
     *  Delegates to the query family's {@link probable_action_exits}, which
     *  carries the full contract.
     *  @throws {JssmError} If the state does not exist.
     *  @see probable_action_exits
     */
    probable_action_exits(whichState?: StateType$8): Array<any>;
    /**
     * Check whether a state has no incoming transitions.  Delegates to the
     *  query family's {@link is_unenterable}.
     *  @throws {JssmError} If the state does not exist.
     *  @see is_unenterable
     */
    is_unenterable(whichState: StateType$8): boolean;
    /**
     * Check whether any state in the machine is unenterable.  Delegates to
     *  the query family's {@link has_unenterables}.
     *  @see has_unenterables
     */
    has_unenterables(): boolean;
    /**
     * Check whether the current state is terminal (has no exits).  Delegates
     *  to the query family's {@link is_terminal}.
     *  @see is_terminal
     */
    is_terminal(): boolean;
    /**
     * Check whether a specific state is terminal (has no exits).  Delegates
     *  to the query family's {@link state_is_terminal}.
     *  @throws {JssmError} If the state does not exist.
     *  @see state_is_terminal
     */
    state_is_terminal(whichState: StateType$8): boolean;
    /**
     * Check whether any state in the machine is terminal.  Delegates to the
     *  query family's {@link has_terminals}.
     *  @see has_terminals
     */
    has_terminals(): boolean;
    /**
     *  Reports whether the machine's CURRENT state is a transitive member of a
     *  named group.  Delegates to the groups family's {@link isIn}, which
     *  carries the full contract and example.
     *  @see isIn
     */
    isIn(groupName: string): boolean;
    /**
     *  Lists every group that transitively contains a given state.  Delegates
     *  to the groups family's {@link groupsOf}, which carries the full
     *  contract and example.
     *  @see groupsOf
     */
    groupsOf(state: StateType$8): Set<string>;
    /**
     *  Lists all declared group names, in source declaration order.  Delegates
     *  to the groups family's {@link groups}, which carries the full contract
     *  and example.
     *  @see groups
     */
    groups(): string[];
    /**
     *  Lists every state that is a transitive member of a named group.
     *  Delegates to the groups family's {@link statesIn}, which carries the
     *  full contract and example.
     *  @throws {JssmError} If `groupName` is not a declared group.
     *  @see statesIn
     */
    statesIn(groupName: string): Array<StateType$8>;
    /**
     * Check whether the current state is complete.  Delegates to the query
     *  family's {@link is_complete}.
     *  @see is_complete
     */
    is_complete(): boolean;
    /**
     * Check whether a specific state is complete.  Delegates to the query
     *  family's {@link state_is_complete}.
     *  @throws {JssmError} If the state does not exist.
     *  @see state_is_complete
     */
    state_is_complete(whichState: StateType$8): boolean;
    /**
     * Check whether any state in the machine is complete.  Delegates to the
     *  query family's {@link has_completes}.
     *  @see has_completes
     */
    has_completes(): boolean;
    /**
     *  Subscribe to a typed observation event.  Delegates to the events
     *  family's {@link on}, which carries the full contract and examples.
     *  @see on
     */
    on<Ev extends JssmEventName>(name: Ev, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
    on<Ev extends JssmEventName>(name: Ev, filter: JssmEventFilter<mDT, Ev>, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
    /**
     *  Subscribe to a typed observation event for one matching delivery, then
     *  auto-remove.  Delegates to the events family's {@link once}.
     *  @see once
     */
    once<Ev extends JssmEventName>(name: Ev, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
    once<Ev extends JssmEventName>(name: Ev, filter: JssmEventFilter<mDT, Ev>, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
    /**
     *  Remove a previously-registered event handler.  Delegates to the events
     *  family's {@link off}.
     *  @see off
     */
    off<Ev extends JssmEventName>(name: Ev, handler: JssmEventHandler<mDT, Ev>): boolean;
    /**
     *  Invoke a single event-handler entry.  Delegates to the events family's
     *  {@link fire_one}.
     *  @internal
     */
    _fire_one<Ev extends JssmEventName>(entry: JssmEventEntry<mDT, Ev>, set: Set<JssmEventEntry<any, any>>, name: Ev, detail: JssmEventDetailMap<mDT>[Ev]): void;
    /**
     *  Whether at least one live subscriber is registered for `name`.
     *  Delegates to the events family's {@link has_subscribers}.
     *  @internal
     */
    _has_subscribers(name: JssmEventName): boolean;
    /**
     *  Dispatch an event to every registered subscriber.  Delegates to the
     *  events family's {@link fire}.
     *  @internal
     */
    _fire<Ev extends JssmEventName>(name: Ev, detail: JssmEventDetailMap<mDT>[Ev]): void;
    /**
     *  Low-level hook registration.  Delegates to the hooks family's
     *  {@link set_hook}, which carries the full contract, the descriptor
     *  validation, and the examples.
     *  @throws JssmError if the descriptor is mis-shaped.
     *  @see set_hook
     */
    set_hook(HookDesc: HookDescription<mDT>): void;
    /**
     *  Remove a previously-registered hook.  Delegates to the hooks family's
     *  {@link remove_hook}.
     *  @returns `true` if a hook was removed, `false` otherwise.
     *  @see remove_hook
     */
    remove_hook(HookDesc: HookDescription<mDT>): boolean;
    /**
     *  Register a pre-transition hook on a specific edge.  Delegates to the
     *  hooks family's {@link hook}.
     *  @returns `this` for chaining.
     *  @see hook
     */
    hook(from: string, to: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a pre-transition hook on a specific action-labeled edge.
     *  Delegates to the hooks family's {@link hook_action}.
     *  @returns `this` for chaining.
     *  @see hook_action
     */
    hook_action(from: string, to: string, action: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a pre-transition hook on any edge triggered by a specific
     *  action.  Delegates to the hooks family's {@link hook_global_action}.
     *  @returns `this` for chaining.
     *  @see hook_global_action
     */
    hook_global_action(action: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a pre-transition hook on any action-driven transition.
     *  Delegates to the hooks family's {@link hook_any_action}.
     *  @returns `this` for chaining.
     *  @see hook_any_action
     */
    hook_any_action(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a pre-transition hook on any standard (`->`) transition.
     *  Delegates to the hooks family's {@link hook_standard_transition}.
     *  @returns `this` for chaining.
     *  @see hook_standard_transition
     */
    hook_standard_transition(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a pre-transition hook on any main-path (`=>`) transition.
     *  Delegates to the hooks family's {@link hook_main_transition}.
     *  @returns `this` for chaining.
     *  @see hook_main_transition
     */
    hook_main_transition(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a pre-transition hook on any forced (`~>`) transition.
     *  Delegates to the hooks family's {@link hook_forced_transition}.
     *  @returns `this` for chaining.
     *  @see hook_forced_transition
     */
    hook_forced_transition(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a pre-transition hook on any transition regardless of kind.
     *  Delegates to the hooks family's {@link hook_any_transition}.
     *  @returns `this` for chaining.
     *  @see hook_any_transition
     */
    hook_any_transition(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a hook that fires when entering a specific state.  Delegates
     *  to the hooks family's {@link hook_entry}.
     *  @returns `this` for chaining.
     *  @see hook_entry
     */
    hook_entry(to: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a hook that fires when leaving a specific state.  Delegates to
     *  the hooks family's {@link hook_exit}.
     *  @returns `this` for chaining.
     *  @see hook_exit
     */
    hook_exit(from: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a hook that fires when a state's `after` timer elapses.
     *  Delegates to the hooks family's {@link hook_after}, which carries the
     *  full contract and example.
     *  @returns `this` for chaining.
     *  @see hook_after
     */
    hook_after(from: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a hook that fires when ANY state's `after` timer elapses.
     *  Delegates to the hooks family's {@link hook_after_any}, which carries
     *  the full contract and example.
     *  @returns `this` for chaining.
     *  @see hook_after_any
     */
    hook_after_any(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Post-transition hook on a specific edge.  Delegates to the hooks
     *  family's {@link post_hook}.
     *  @returns `this` for chaining.
     *  @see post_hook
     */
    post_hook(from: string, to: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Post-transition hook on a specific action-labeled edge.  Delegates to
     *  the hooks family's {@link post_hook_action}.
     *  @returns `this` for chaining.
     *  @see post_hook_action
     */
    post_hook_action(from: string, to: string, action: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Post-transition hook on any edge triggered by a specific action.
     *  Delegates to the hooks family's {@link post_hook_global_action}.
     *  @returns `this` for chaining.
     *  @see post_hook_global_action
     */
    post_hook_global_action(action: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Post-transition hook on any action-driven transition.  Delegates to
     *  the hooks family's {@link post_hook_any_action}.
     *  @returns `this` for chaining.
     *  @see post_hook_any_action
     */
    post_hook_any_action(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Post-transition hook on any standard (`->`) transition.  Delegates to
     *  the hooks family's {@link post_hook_standard_transition}.
     *  @returns `this` for chaining.
     *  @see post_hook_standard_transition
     */
    post_hook_standard_transition(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Post-transition hook on any main-path (`=>`) transition.  Delegates to
     *  the hooks family's {@link post_hook_main_transition}.
     *  @returns `this` for chaining.
     *  @see post_hook_main_transition
     */
    post_hook_main_transition(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Post-transition hook on any forced (`~>`) transition.  Delegates to
     *  the hooks family's {@link post_hook_forced_transition}.
     *  @returns `this` for chaining.
     *  @see post_hook_forced_transition
     */
    post_hook_forced_transition(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Post-transition hook on any transition regardless of kind.  Delegates
     *  to the hooks family's {@link post_hook_any_transition}.
     *  @returns `this` for chaining.
     *  @see post_hook_any_transition
     */
    post_hook_any_transition(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Post-transition hook that fires after entering a specific state.
     *  Delegates to the hooks family's {@link post_hook_entry}.
     *  @returns `this` for chaining.
     *  @see post_hook_entry
     */
    post_hook_entry(to: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Post-transition hook that fires after leaving a specific state.
     *  Delegates to the hooks family's {@link post_hook_exit}.
     *  @returns `this` for chaining.
     *  @see post_hook_exit
     */
    post_hook_exit(from: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a pre-transition hook that fires before all other pre-hooks.
     *  Delegates to the hooks family's {@link hook_pre_everything}.
     *  @returns `this` for chaining.
     *  @see hook_pre_everything
     */
    hook_pre_everything(handler: EverythingHookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a pre-transition hook that fires after all other pre-hooks.
     *  Delegates to the hooks family's {@link hook_everything}.
     *  @returns `this` for chaining.
     *  @see hook_everything
     */
    hook_everything(handler: EverythingHookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a post-transition hook that fires after all other post-hooks.
     *  Delegates to the hooks family's {@link hook_post_everything}.
     *  @returns `this` for chaining.
     *  @see hook_post_everything
     */
    hook_post_everything(handler: PostEverythingHookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a post-transition hook that fires before all other post-hooks.
     *  Delegates to the hooks family's {@link hook_pre_post_everything}.
     *  @returns `this` for chaining.
     *  @see hook_pre_post_everything
     */
    hook_pre_post_everything(handler: PostEverythingHookHandler<mDT>): Machine<mDT>;
    /**
     * Get the current RNG seed used for probabilistic transitions.  Delegates
     *  to the stochastic family's {@link rng_seed}.
     *  @see rng_seed
     */
    get rng_seed(): number;
    /**
     * Set the RNG seed.  Delegates to the stochastic family's
     *  {@link set_rng_seed}, which carries the full contract.
     *  @see set_rng_seed
     */
    set rng_seed(to: number | undefined);
    /**
     * Get all edges between two states (there can be multiple with
     *  different actions).  Delegates to the query family's
     *  {@link edges_between}, which carries the full contract.
     *  @see edges_between
     */
    edges_between(from: string, to: string): JssmTransition<StateType$8, mDT>[];
    /*********
     *
     *  Replace the current state — and, when a data argument is provided, the
     *  data — with no regard to the graph.  The class form of the transition
     *  family's {@link override}, which carries the full contract and example.
     *  The data argument is arity-detected (StoneCypher/fsl#1264), so the
     *  delegate forwards it only when it was given.
     *
     *  @param newState The state to teleport to; must exist in the graph.
     *
     *  @param newData Replacement data.  Omit to keep the current data; pass
     *  `undefined` explicitly to clear it.
     *
     *  @throws {JssmError} If the machine's config does not set
     *  `allows_override: true`, or if `newState` does not exist.
     *
     *  @see override
     *
     */
    override(newState: StateType$8, newData?: mDT): void;
    /**
     *  Fire a `'rejection'` event caused by a hook vetoing a pending transition.
     *  Delegates to the transition family's {@link fire_hook_rejection}.
     *  @internal
     */
    _fire_hook_rejection(hook_name: string, fromState: StateType$8, newState: StateType$8, fromAction: StateType$8 | undefined, oldData: mDT, newData: mDT | undefined, wasForced: boolean): void;
    /**
     *  Fire the FSL boundary-hook actions for an already-committed state
     *  change.  Delegates to the transition family's {@link fire_boundary_actions}.
     *  @internal
     */
    _fire_boundary_actions(prev_state: StateType$8, next_state: StateType$8): void;
    /**
     *  Shared transition core.  Delegates to the transition family's
     *  {@link transition_impl}, which carries the full contract.  The public
     *  movers on this class (`transition`, `go`, `force_transition`, `act`,
     *  `action`, `do`) call the family function directly rather than this
     *  delegate, so the class path is no deeper than it was in 5.x.
     *  @internal
     */
    transition_impl(newStateOrAction: StateType$8, newData: mDT | undefined, wasForced: boolean, wasAction: boolean, dataProvided?: boolean): boolean;
    /**
     *  If the current state has an `after` timeout configured, schedule it.
     *  Delegates to the timers family's {@link auto_set_state_timeout}.
     *  @see auto_set_state_timeout
     */
    auto_set_state_timeout(): void;
    /**
     *  Get a truncated history of the recent states and data of the machine,
     *  without the current state.  Delegates to the history family's
     *  {@link history}, which carries the full contract and examples.
     *  @see history
     */
    get history(): Array<[StateType$8, mDT]>;
    /**
     *  Get a truncated history of the recent states and data of the machine,
     *  including the current state.  Delegates to the history family's
     *  {@link history_inclusive}.
     *  @see history_inclusive
     */
    get history_inclusive(): Array<[StateType$8, mDT]>;
    /**
     *  Find out how long a history this machine is keeping.  Delegates to the
     *  history family's {@link history_length}; the setter delegates to
     *  {@link set_history_length}.
     *  @see history_length
     *  @see set_history_length
     */
    get history_length(): number;
    set history_length(to: number);
    /********
     *
     *  Instruct the machine to complete an action.  Synonym for {@link act}
     *  (and for the deprecated {@link do}); the class form of the transition
     *  family's {@link act}, which carries the full contract and example.
     *
     *  ```typescript
     *  const light = sm`red 'next' -> green 'next' -> yellow 'next' -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
     *
     *  light.state();               // 'red'
     *  light.action('next');        // true
     *  light.state();               // 'green'
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param actionName The action to engage
     *
     *  @param newData The data change to insert during the action; omit to
     *  keep the current data (StoneCypher/fsl#1264)
     *
     *  @returns `true` if the action was valid and the transition occurred,
     *  `false` otherwise.
     *
     *  @see act
     *
     */
    action(actionName: StateType$8, newData?: mDT): boolean;
    /********
     *
     *  Instruct the machine to complete an action.  The class form of the
     *  transition family's {@link act}, which carries the full contract and
     *  example; {@link action} is its synonym and {@link do} its deprecated
     *  synonym.  New in 6.0 so the deprecation advice on `do()` holds on both
     *  entries.
     *
     *  ```typescript
     *  const light = sm`red 'next' -> green 'next' -> yellow 'next' -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
     *
     *  light.state();               // 'red'
     *  light.act('next');           // true
     *  light.state();               // 'green'
     *  light.act('dance');          // false - no such action
     *  light.state();               // 'green'
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param actionName The action to engage
     *
     *  @param newData The data change to insert during the action; omit to
     *  keep the current data (StoneCypher/fsl#1264)
     *
     *  @returns `true` if the action was valid and the transition occurred,
     *  `false` otherwise.
     *
     *  @see act
     *
     */
    act(actionName: StateType$8, newData?: mDT): boolean;
    /**
     *  Get the standard style for a single state.  Delegates to the style
     *  family's {@link standard_state_style}, which carries the full contract
     *  and example.
     *  @see standard_state_style
     */
    get standard_state_style(): JssmStateConfig;
    /**
     *  Get the hooked state style.  Delegates to the style family's
     *  {@link hooked_state_style}, which carries the full contract and
     *  example.
     *  @see hooked_state_style
     */
    get hooked_state_style(): JssmStateConfig;
    /**
     *  Get the start state style.  Delegates to the style family's
     *  {@link start_state_style}, which carries the full contract and example.
     *  @see start_state_style
     */
    get start_state_style(): JssmStateConfig;
    /**
     *  Get the end state style.  Delegates to the style family's
     *  {@link end_state_style}, which carries the full contract and example.
     *  @see end_state_style
     */
    get end_state_style(): JssmStateConfig;
    /**
     *  Get the terminal state style.  Delegates to the style family's
     *  {@link terminal_state_style}, which carries the full contract and
     *  example.
     *  @see terminal_state_style
     */
    get terminal_state_style(): JssmStateConfig;
    /**
     *  Get the style for the active state.  Delegates to the style family's
     *  {@link active_state_style}, which carries the full contract and
     *  example.
     *  @see active_state_style
     */
    get active_state_style(): JssmStateConfig;
    /**
     *  Generate the uniform observational-hook registry.  Delegates to the
     *  hooks family's {@link hook_registry}, which carries the full contract
     *  and examples.
     *  @returns Every registered hook as a {@link HookRegistryEntry}.
     *  @see hook_registry
     */
    hook_registry(): HookRegistryEntry[];
    /**
     *  Return every registry entry observing the given target.  Delegates to
     *  the hooks family's {@link hooks_on}.
     *  @returns The matching {@link HookRegistryEntry} rows (possibly empty).
     *  @see hooks_on
     */
    hooks_on(query: HookQuery): HookRegistryEntry[];
    /**
     *  Is at least one observational hook bound to the given target?
     *  Delegates to the hooks family's {@link has_hook}.
     *  @returns `true` when a matching hook exists.
     *  @see has_hook
     */
    has_hook(query: HookQuery, phase?: HookPhase): boolean;
    /**
     *  Does the given state carry any observational hook?  Delegates to the
     *  hooks family's {@link state_has_hooks}.
     *  @returns `true` when the state is observed by at least one hook.
     *  @see state_has_hooks
     */
    state_has_hooks(state: StateType$8): boolean;
    /**
     *  Resolves the full unified style/config cascade for a state.  Delegates
     *  to the style family's {@link resolve_state_config}, which carries the
     *  full contract and example.
     *  @see resolve_state_config
     */
    resolve_state_config(state: StateType$8): JssmStateConfig;
    /**
     *  Gets the composite style for a specific node — the public viz entry
     *  point.  Delegates to the style family's {@link style_for}, which
     *  carries the full contract.
     *  @see style_for
     */
    style_for(state: StateType$8): JssmStateConfig;
    /********
     *
     *  Instruct the machine to complete an action.  Synonym for {@link action}
     *  and {@link act}; the class form of the transition family's {@link act},
     *  which carries the full contract and example.  Prefer `act()` — `do` is a
     *  JavaScript reserved word, so it has no function form and is deprecated
     *  here.
     *
     *  ```typescript
     *  import { sm } from 'jssm/compat';
     *
     *  const light = sm`
     *    off 'start' -> red;
     *    red 'next' -> green 'next' -> yellow 'next' -> red;
     *    [red yellow green] 'shutdown' ~> off;
     *  `;
     *
     *  light.state();        // 'off'
     *  light.act('start');   // true  - the preferred spelling
     *  light.state();        // 'red'
     *  light.do('next');     // true  - still works, but deprecated
     *  light.state();        // 'green'
     *  light.act('dance');   // !! false - no such action
     *  light.state();        // 'green'
     *  ```
     *
     *  @deprecated Use act() or action(); do is a JavaScript reserved word and has no function form. Removal is tracked as StoneCypher/fsl#1992.
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param actionName The action to engage
     *
     *  @param newData The data change to insert during the action; omit to
     *  keep the current data (StoneCypher/fsl#1264)
     *
     *  @returns `true` if the action was valid and the transition occurred,
     *  `false` otherwise.
     *
     *  @see act
     *
     */
    do(actionName: StateType$8, newData?: mDT): boolean;
    /********
     *
     *  Instruct the machine to complete a transition.  Synonym for {@link go};
     *  the class form of the transition family's {@link transition}, which
     *  carries the full contract and example.
     *
     *  ```typescript
     *  const light = sm`
     *    off 'start' -> red;
     *    red 'next' -> green 'next' -> yellow 'next' -> red;
     *    [red yellow green] 'shutdown' ~> off;
     *  `;
     *
     *  light.state();       // 'off'
     *  light.go('red');     // true
     *  light.state();       // 'red'
     *  light.go('blue');    // !! false - no such state
     *  light.state();       // 'red'
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param newState The state to switch to
     *
     *  @param newData The data change to insert during the transition; omit to
     *  keep the current data (StoneCypher/fsl#1264)
     *
     *  @returns `true` if the transition was legal and occurred, `false` otherwise.
     *
     *  @see transition
     *
     */
    transition(newState: StateType$8, newData?: mDT): boolean;
    /********
     *
     *  Instruct the machine to complete a transition.  Synonym for {@link transition};
     *  the class form of the transition family's {@link go}.
     *
     *  ```typescript
     *  const light = sm`red -> green -> yellow -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
     *
     *  light.state();       // 'red'
     *  light.go('green');   // true
     *  light.state();       // 'green'
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param newState The state to switch to
     *
     *  @param newData The data change to insert during the transition; omit to
     *  keep the current data (StoneCypher/fsl#1264)
     *
     *  @returns `true` if the transition was legal and occurred, `false` otherwise.
     *
     *  @see go
     *
     */
    go(newState: StateType$8, newData?: mDT): boolean;
    /********
     *
     *  Instruct the machine to complete a forced transition (which will reject if
     *  called with a normal {@link transition} call.)  The class form of the
     *  transition family's {@link force_transition}, which carries the full
     *  contract and example.
     *
     *  ```typescript
     *  const light = sm`red -> green -> yellow -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
     *
     *  light.state();                     // 'red'
     *  light.transition('off');           // false
     *  light.state();                     // 'red'
     *  light.force_transition('off');     // true
     *  light.state();                     // 'off'
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param newState The state to switch to
     *
     *  @param newData The data change to insert during the transition; omit to
     *  keep the current data (StoneCypher/fsl#1264)
     *
     *  @returns `true` if a transition (forced or otherwise) existed and occurred,
     *  `false` otherwise.
     *
     *  @see force_transition
     *
     */
    force_transition(newState: StateType$8, newData?: mDT): boolean;
    /**
     * Get the edge index for an action from the current state.  Delegates to
     *  the query family's {@link current_action_for}, which carries the full
     *  contract.
     *  @see current_action_for
     */
    current_action_for(action: StateType$8): number;
    /**
     * Get the full transition object for an action from the current state.
     *  Delegates to the query family's {@link current_action_edge_for}.
     *  @throws {JssmError} If the action is not available from the current state.
     *  @see current_action_edge_for
     */
    current_action_edge_for(action: StateType$8): JssmTransition<StateType$8, mDT>;
    /**
     * Check whether an action is available from the current state.  Delegates
     *  to the transition family's {@link valid_action}.
     *  @param action   - The action name to check.
     *  @param _newData - Reserved for future data validation.
     *  @returns `true` if the action can be taken.
     *  @see valid_action
     */
    valid_action(action: StateType$8, _newData?: mDT): boolean;
    /**
     * Check whether a transition to a given state is legal (non-forced) from
     *  the current state.  Delegates to the transition family's
     *  {@link valid_transition}.
     *  @param newState - The target state.
     *  @param _newData - Reserved for future data validation.
     *  @returns `true` if the transition is legal.
     *  @see valid_transition
     */
    valid_transition(newState: StateType$8, _newData?: mDT): boolean;
    /**
     * Check whether a forced transition to a given state exists from the
     *  current state.  Delegates to the transition family's
     *  {@link valid_force_transition}.
     *  @param newState - The target state.
     *  @param _newData - Reserved for future data validation.
     *  @returns `true` if a forced (or any) transition exists.
     *  @see valid_force_transition
     */
    valid_force_transition(newState: StateType$8, _newData?: mDT): boolean;
    /**
     * Get the instance name of this machine.  Delegates to the create family's
     *  {@link instance_name}.
     *  @see instance_name
     */
    instance_name(): string | undefined;
    /**
     * Get the creation date of this machine as a `Date` object.  Delegates to
     *  the create family's {@link creation_date}.
     *  @see creation_date
     */
    get creation_date(): Date;
    /**
     * Get the creation timestamp (milliseconds since epoch).  Delegates to the
     *  create family's {@link creation_timestamp}.
     *  @see creation_timestamp
     */
    get creation_timestamp(): number;
    /**
     * Get the timestamp when construction began (before parsing).  Delegates
     *  to the create family's {@link create_start_time}.
     *  @see create_start_time
     */
    get create_start_time(): number;
    /**
     *  Schedule an automatic transition to `next_state` after `after_time`
     *  milliseconds.  Delegates to the timers family's
     *  {@link set_state_timeout}, which carries the full contract.
     *  @throws JssmError If a timeout is already pending.
     *  @see set_state_timeout
     */
    set_state_timeout(next_state: StateType$8, after_time: number): void;
    /**
     *  Cancel any pending state timeout.  Delegates to the timers family's
     *  {@link clear_state_timeout}.
     *  @see clear_state_timeout
     */
    clear_state_timeout(): void;
    /**
     *  Get the configured `after` timeout for a given state, if any.
     *  Delegates to the timers family's {@link state_timeout_for}.
     *  @see state_timeout_for
     */
    state_timeout_for(which_state: StateType$8): [StateType$8, number] | undefined;
    /**
     *  Get the pending state timeout, if any.  Delegates to the timers
     *  family's {@link current_state_timeout}.
     *  @see current_state_timeout
     */
    current_state_timeout(): [StateType$8, number] | undefined;
    /**
     * Convenience method to create a new machine from a tagged template literal.
     *  Equivalent to calling the top-level `sm` function.
     *  @param template_strings - The template string array.
     *  @param remainder        - Interpolated values.
     *  @returns A new {@link Machine} instance.
     */
    sm(template_strings: TemplateStringsArray, ...remainder: any[]): Machine<mDT>;
    /**
     * Convenience method to create a new machine from a tagged template literal;
     *  an exact alias of {@link Machine.sm}, matching the top-level {@link fsl}.
     *  @param template_strings - The template string array.
     *  @param remainder        - Interpolated values.
     *  @returns A new {@link Machine} instance.
     */
    fsl(template_strings: TemplateStringsArray, ...remainder: any[]): Machine<mDT>;
}
/*******
 *
 *  Constructs a machine from a configuration object.  This is the function
 *  form of `new Machine(config)`: the value it returns is the machine record
 *  every other function in this package takes as its first argument.  In
 *  6.0 that record is also a `Machine` instance, so `instanceof Machine`
 *  holds and the 5.x methods remain reachable through `jssm/compat`.
 *
 *  @example
 *  import { create, state, transition } from 'jssm';
 *
 *  const m = create({
 *    start_states : ['a'],
 *    transitions  : [ { from: 'a', to: 'b', kind: 'legal', forced_only: false, main_path: false } ],
 *  });
 *
 *  state(m);             // => 'a'
 *  transition(m, 'b');   // => true
 *  state(m);             // => 'b'
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param config The machine configuration; the same shape `compile` produces from FSL.
 *
 *  @returns The new machine at its start state.
 *
 *  @see sm
 *  @see from
 *
 */
declare function create<mDT>(config: JssmGenericConfig<StateType$8, mDT>): Machine<mDT>;
/*******
 *
 *  The type of the machine value the bare functions operate on.  Named so
 *  signatures can say what they take without naming the compat class; in 6.0
 *  it is the same type as `Machine`.
 *
 */
type JssmMachine<mDT = unknown> = Machine<mDT>;
/*********
 *
 *  Create a state machine from a template string.  This is one of the two main
 *  paths for working with JSSM, alongside {@link from}.
 *
 *  Use this function when you want to work directly and conveniently with a
 *  constant template expression.  Use `from` when you want to pull from
 *  dynamic strings.
 *
 *  @example
 *  import { sm, state, transition } from 'jssm';
 *
 *  const lswitch = sm`on <=> off;`;
 *  state(lswitch);              // => 'on'
 *  transition(lswitch, 'off');  // => true
 *  state(lswitch);              // => 'off'
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param template_strings The assembled code
 *
 *  @param remainder The mechanic for template argument insertion
 *
 */
declare function sm<mDT>(template_strings: TemplateStringsArray, ...remainder: any[]): Machine<mDT>;
/*********
 *
 *  Create a state machine from a template string; an exact alias of {@link sm}.
 *
 *  Prefer this spelling in JavaScript and TypeScript sources that will be
 *  syntax-highlighted.  Highlighters dispatch a tagged template to a grammar by
 *  matching the tag name, and `sm` is two generic letters that collide with
 *  ordinary identifiers — `small`, `session manager`, a local variable.  `fsl`
 *  names the language unambiguously, so a highlighter can key on it without
 *  risking false positives on unrelated code.
 *
 *  Identical to {@link sm} in every respect: same parameters, same return, same
 *  errors.  Neither is deprecated.
 *
 *  @example
 *  import { fsl, state } from 'jssm';
 *
 *  const lswitch = fsl`on <=> off;`;
 *  state(lswitch);  // => 'on'
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param template_strings The assembled code
 *
 *  @param remainder The mechanic for template argument insertion
 *
 *  @see sm
 *  @see from
 *
 */
declare function fsl<mDT>(template_strings: TemplateStringsArray, ...remainder: any[]): Machine<mDT>;
/*********
 *
 *  Create a state machine from an implementation string.  This is one of the
 *  two main paths for working with JSSM, alongside {@link sm}.
 *
 *  Use this function when you want to conveniently pull a state machine from
 *  a string dynamically.  Use the template tag `sm` when you just want to
 *  work with a template expression.
 *
 *  @example
 *  import { from, state, data } from 'jssm';
 *
 *  const lswitch = from('on <=> off;', { data: 1 });
 *  state(lswitch);  // => 'on'
 *  data(lswitch);   // => 1
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param MachineAsString The FSL code to evaluate
 *
 *  @param ExtraConstructorFields Extra non-code configuration to pass at creation time
 *
 */
declare function from<mDT>(MachineAsString: string, ExtraConstructorFields?: Partial<JssmGenericConfig<StateType$8, mDT>>): Machine<mDT>;
/**
 * Compares two semantic version strings, including prerelease versions.
 *
 * The numeric (`major.minor.patch`) parts compare numerically, with missing
 * segments treated as zero.  Prerelease parts (everything after the first
 * `-`) follow semver precedence: a version *with* a prerelease precedes the
 * same version *without* one; prerelease identifiers compare dot-by-dot,
 * numeric identifiers numerically and below alphanumeric ones, alphanumeric
 * identifiers in ASCII order, and a shorter identifier set precedes a longer
 * one that it prefixes.
 * @param {string} v1 - First version string (e.g., "5.104.2" or "6.0.0-alpha.1")
 * @param {string} v2 - Second version string (e.g., "5.103.1")
 * @returns {number} - Negative if v1 < v2, 0 if equal, positive if v1 > v2
 * @example
 * import { compareVersions } from 'jssm';
 * compareVersions("5.104.2", "5.103.1");  // => 1
 * @example
 * import { compareVersions } from 'jssm';
 * compareVersions("5.104.2", "6.0.0");  // => -1
 * @example
 * import { compareVersions } from 'jssm';
 * compareVersions("5.104.2", "5.104.2");  // => 0
 * @example
 * import { compareVersions } from 'jssm';
 * compareVersions("6.0.0-alpha.1", "6.0.0");  // => -1
 * @example
 * import { compareVersions } from 'jssm';
 * compareVersions("6.0.0-alpha.1", "6.0.0-alpha.2");  // => -1
 * @example
 * import { compareVersions } from 'jssm';
 * compareVersions("6.0.0-beta.1", "6.0.0-alpha.1");  // => 1
 */
declare function compareVersions(v1: string, v2: string): number;
/**
 * Deserializes a previously serialized machine state.
 *
 * This function recreates a machine from a serialization object, restoring its
 * state, data, and history. For security and compatibility reasons, it will
 * refuse to deserialize data from future versions of the library.
 * @template mDT - The type of the machine data member
 * @param {string} machine_string - The FSL string defining the machine structure
 * @param {JssmSerialization<mDT>} ser - The serialization object to restore from
 * @returns {Machine<mDT>} - The restored machine instance
 * @throws {Error} If the serialization is from a future version
 * @example
 * import { from, deserialize, serialize, state, transition } from 'jssm';
 * const machine    = from("a -> b;");
 * transition(machine, 'b');
 * const serialized = serialize(machine);
 * const restored   = deserialize("a -> b;", serialized);
 * state(restored);  // => 'b'
 */
declare function deserialize<mDT>(machine_string: string, ser: JssmSerialization<mDT>): Machine<mDT>;

/*******
 *
 *  The history family: reading and resizing the machine's ring buffer of
 *  recent `[state, data]` pairs.  Every function takes the machine as its
 *  first argument and reads the machine's `_history` / `_history_length`
 *  fields directly; the `Machine` class getters and setter of the same names
 *  are one-line delegates onto these.
 *
 */

type StateType$7 = string;
/*********
 *
 *  Get a truncated history of the recent states and data of the machine.
 *  Turned off by default; configure with `from('...', {history: 5})` by
 *  length, or call `set_history_length` at runtime.
 *
 *  History *does not contain the current state*.  If you want that, call
 *  `history_inclusive` instead.
 *
 *  Notice that in the example the machine's current state, `e`, is not in
 *  the returned list.
 *
 *  @example
 *  import { from, act, history } from 'jssm';
 *
 *  const foo = from(
 *    "a 'next' -> b 'next' -> c 'next' -> d 'next' -> e;",
 *    { history: 3 }
 *  );
 *
 *  act(foo, 'next');
 *  act(foo, 'next');
 *  act(foo, 'next');
 *  act(foo, 'next');
 *
 *  history(foo);  // => [ ['b', undefined], ['c', undefined], ['d', undefined] ]
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine whose history to read.
 *
 *  @returns The retained `[state, data]` pairs, oldest first, as a fresh array.
 *
 *  @see history_inclusive
 *  @see set_history_length
 *
 */
declare function history<mDT>(m: Machine<mDT>): Array<[StateType$7, mDT]>;
/*********
 *
 *  Get a truncated history of the recent states and data of the machine,
 *  including the current state.  Turned off by default; configure with
 *  `from('...', {history: 5})` by length, or call `set_history_length` at
 *  runtime.
 *
 *  History inclusive contains the current state.  If you only want past
 *  states, call `history` instead.
 *
 *  The list returned will be one longer than the history buffer kept, as the
 *  history buffer kept gets the current state added to it to produce this
 *  list.
 *
 *  Notice that in the example the machine's current state, `e`, is in the
 *  returned list.
 *
 *  @example
 *  import { from, act, history_inclusive } from 'jssm';
 *
 *  const foo = from(
 *    "a 'next' -> b 'next' -> c 'next' -> d 'next' -> e;",
 *    { history: 3 }
 *  );
 *
 *  act(foo, 'next');
 *  act(foo, 'next');
 *  act(foo, 'next');
 *  act(foo, 'next');
 *
 *  history_inclusive(foo);  // => [ ['b', undefined], ['c', undefined], ['d', undefined], ['e', undefined] ]
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine whose history to read.
 *
 *  @returns The retained `[state, data]` pairs followed by the current
 *  `[state, data]`, oldest first, as a fresh array.
 *
 *  @see history
 *
 */
declare function history_inclusive<mDT>(m: Machine<mDT>): Array<[StateType$7, mDT]>;
/*********
 *
 *  Find out how long a history this machine is keeping.  Defaults to zero.
 *  Change it with `set_history_length`.
 *
 *  @example
 *  import { from, history_length, set_history_length } from 'jssm';
 *
 *  const foo = from("a -> b;");
 *  history_length(foo);                                 // => 0
 *
 *  const bar = from("a -> b;", { history: 3 });
 *  history_length(bar);                                 // => 3
 *  set_history_length(bar, 5);
 *  history_length(bar);                                 // => 5
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to inspect.
 *
 *  @returns The number of past `[state, data]` pairs the machine retains.
 *
 *  @see set_history_length
 *
 */
declare function history_length<mDT>(m: Machine<mDT>): number;
/*********
 *
 *  Set how long a history this machine keeps, resizing the buffer in place.
 *  Growing keeps every retained entry; shrinking drops the oldest entries so
 *  the most recent `to` survive; zero turns history off and empties it.
 *  Takes effect for every later transition.
 *
 *  @example
 *  import { from, act, history, set_history_length } from 'jssm';
 *
 *  const foo = from("a 'next' <-> 'next' b;");
 *  act(foo, 'next');
 *
 *  set_history_length(foo, 3);
 *  act(foo, 'next');
 *  act(foo, 'next');
 *  history(foo);              // => [ ['b', undefined], ['a', undefined] ]
 *
 *  set_history_length(foo, 1);
 *  history(foo);              // => [ ['a', undefined] ]
 *
 *  set_history_length(foo, 0);
 *  history(foo);              // => []
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m  The machine to resize the history of.
 *  @param to The number of past `[state, data]` pairs to retain, zero or more.
 *
 *  @see history_length
 *  @see history
 *
 */
declare function set_history_length<mDT>(m: Machine<mDT>, to: number): void;

/*******
 *
 *  The timers family: the machine's single pending state timeout, which
 *  backs the FSL `after` clause (`a after 5s -> b;`) and can also be armed
 *  by hand.  Every function takes the machine as its first argument and
 *  reads the machine's `_timeout_*` / `_after_mapping` fields directly; the
 *  `Machine` class methods of the same names are one-line delegates onto
 *  these.
 *
 *  The three `DEFAULT_*_SOURCE` singletons are the machine constructor's
 *  fallbacks for the injectable `time_source` / `timeout_source` /
 *  `clear_timeout_source` config; they are exported for `machine.ts` and are
 *  not part of the barrel.
 *
 */

type StateType$6 = string;
/**
 *  Schedule an automatic transition to `next_state` after `after_time`
 *  milliseconds.  Only one timeout may be active at a time.
 *
 *  @example
 *  import { sm, set_state_timeout, current_state_timeout, clear_state_timeout } from 'jssm';
 *
 *  const m = sm`a -> b;`;
 *  set_state_timeout(m, 'b', 1000);
 *  current_state_timeout(m);  // => ['b', 1000]
 *  clear_state_timeout(m);
 *
 *  @param m          - The machine to arm.
 *  @param next_state - The state to transition to when the timer fires.
 *  @param after_time - Delay in milliseconds.
 *  @throws JssmError If a timeout is already pending.
 *  @see clear_state_timeout
 *  @see current_state_timeout
 */
declare function set_state_timeout<mDT>(m: Machine<mDT>, next_state: StateType$6, after_time: number): void;
/**
 *  Cancel any pending state timeout.  Safe to call when no timeout is active.
 *
 *  @example
 *  import { sm, set_state_timeout, current_state_timeout, clear_state_timeout } from 'jssm';
 *
 *  const m = sm`a -> b;`;
 *  set_state_timeout(m, 'b', 1000);
 *  clear_state_timeout(m);
 *  current_state_timeout(m);  // => undefined
 *
 *  @param m - The machine to disarm.
 *  @see set_state_timeout
 */
declare function clear_state_timeout<mDT>(m: Machine<mDT>): void;
/**
 *  Get the configured `after` timeout for a given state, if any.
 *
 *  @example
 *  import { sm, state_timeout_for, clear_state_timeout } from 'jssm';
 *
 *  const m = sm`a after 5s -> b; b -> c;`;
 *  state_timeout_for(m, 'a');  // => ['b', 5000]
 *  state_timeout_for(m, 'b');  // => undefined
 *  clear_state_timeout(m);
 *
 *  @param m           - The machine to inspect.
 *  @param which_state - The state to look up.
 *  @returns A `[targetState, delayMs]` tuple, or `undefined` if no timeout
 *  is configured for that state.
 *  @see current_state_timeout
 */
declare function state_timeout_for<mDT>(m: Machine<mDT>, which_state: StateType$6): [StateType$6, number] | undefined;
/**
 *  Get the pending state timeout, if any: the target of the timer that is
 *  currently armed, whether it came from an FSL `after` clause or from
 *  `set_state_timeout`.
 *
 *  @example
 *  import { sm, current_state_timeout, clear_state_timeout } from 'jssm';
 *
 *  const m = sm`a after 5s -> b;`;
 *  current_state_timeout(m);  // => ['b', 5000]
 *  clear_state_timeout(m);
 *  current_state_timeout(m);  // => undefined
 *
 *  @param m - The machine to inspect.
 *  @returns A `[targetState, delayMs]` tuple, or `undefined`.
 *  @see state_timeout_for
 */
declare function current_state_timeout<mDT>(m: Machine<mDT>): [StateType$6, number] | undefined;
/**
 *  If the current state has an `after` timeout configured, schedule it.
 *  Called internally after each transition.
 *
 *  @example
 *  import { sm, auto_set_state_timeout, current_state_timeout, clear_state_timeout } from 'jssm';
 *
 *  const m = sm`a after 5s -> b;`;
 *  clear_state_timeout(m);
 *  current_state_timeout(m);  // => undefined
 *  auto_set_state_timeout(m);
 *  current_state_timeout(m);  // => ['b', 5000]
 *  clear_state_timeout(m);
 *
 *  @param m - The machine to arm.
 *  @throws JssmError If a timeout is already pending and the current state
 *  has an `after` mapping (see `set_state_timeout`).
 *  @see set_state_timeout
 */
declare function auto_set_state_timeout<mDT>(m: Machine<mDT>): void;

/*******
 *
 *  The transition family: everything that moves the machine.  `transition_impl`
 *  is the single commit path (validation, the hook pipeline, the commit, the
 *  observation events, the boundary actions, the `after` timer), and every
 *  public mover — `transition` / `go`, `force_transition`, `act` / `action`,
 *  and the graph-ignoring `override` — is a one-liner over it.  Every function
 *  takes the machine as its first argument and reads its fields directly; the
 *  `Machine` class methods of the same names are one-line delegates onto these
 *  (the class movers call `transition_impl` directly so the class path gains
 *  no frame).
 *
 *  The class's `do()` has no function form because `do` is a reserved word:
 *  `act` is the function and `action` is an alias of the same function object
 *  (bare-functions design, decision 5; `Machine.do()` is deprecated, its
 *  removal is StoneCypher/fsl#1992).
 *
 *  `transition_impl`, `fire_hook_rejection`, and `fire_boundary_actions` are
 *  exported for the class delegates and the other families (hooks, groups),
 *  not for the barrel.
 *
 */

type StateType$5 = string;
/********
 *
 *  Instruct the machine to complete a transition.  Synonym for {@link go}.
 *
 *  @example
 *  import { sm, transition, state } from 'jssm';
 *
 *  const light = sm`
 *    off 'start' -> red;
 *    red 'next' -> green 'next' -> yellow 'next' -> red;
 *    [red yellow green] 'shutdown' ~> off;
 *  `;
 *
 *  state(light);                 // => 'off'
 *  transition(light, 'red');     // => true
 *  state(light);                 // => 'red'
 *  transition(light, 'green');   // => true
 *  state(light);                 // => 'green'
 *  // no such state, so the transition is refused and the machine stays put:
 *  transition(light, 'blue');    // => false
 *  state(light);                 // => 'green'
 *  // green may not go directly to red, only to yellow:
 *  transition(light, 'red');     // => false
 *  state(light);                 // => 'green'
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to move
 *
 *  @param newState The state to switch to
 *
 *  @param newData The data change to insert during the transition.  Omit to
 *  keep the current data; an explicit `undefined` clears it
 *  (StoneCypher/fsl#1264).
 *
 *  @returns `true` if the transition was legal and occurred, `false` otherwise.
 *
 *  @see go
 *  @see force_transition
 *  @see act
 *
 */
declare function transition<mDT>(m: Machine<mDT>, newState: StateType$5, newData?: mDT): boolean;
/********
 *
 *  Instruct the machine to complete a transition.  Synonym for {@link transition}.
 *
 *  @example
 *  import { sm, go, state } from 'jssm';
 *
 *  const light = sm`red -> green -> yellow -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
 *
 *  state(light);          // => 'red'
 *  go(light, 'green');    // => true
 *  state(light);          // => 'green'
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to move
 *
 *  @param newState The state to switch to
 *
 *  @param newData The data change to insert during the transition.  Omit to
 *  keep the current data; an explicit `undefined` clears it
 *  (StoneCypher/fsl#1264).
 *
 *  @returns `true` if the transition was legal and occurred, `false` otherwise.
 *
 *  @see transition
 *
 */
declare function go<mDT>(m: Machine<mDT>, newState: StateType$5, newData?: mDT): boolean;
/********
 *
 *  Instruct the machine to complete a forced transition (which will reject if
 *  called with a normal {@link transition} call.)  Any existing edge
 *  qualifies, forced-only or not; a target with no edge from the current
 *  state is refused.
 *
 *  @example
 *  import { sm, transition, force_transition, state } from 'jssm';
 *
 *  const light = sm`red -> green -> yellow -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
 *
 *  state(light);                        // => 'red'
 *  transition(light, 'off');            // => false
 *  state(light);                        // => 'red'
 *  force_transition(light, 'off');      // => true
 *  state(light);                        // => 'off'
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to move
 *
 *  @param newState The state to switch to
 *
 *  @param newData The data change to insert during the transition.  Omit to
 *  keep the current data; an explicit `undefined` clears it
 *  (StoneCypher/fsl#1264).
 *
 *  @returns `true` if a transition (forced or otherwise) existed and occurred,
 *  `false` otherwise.
 *
 *  @see transition
 *  @see valid_force_transition
 *
 */
declare function force_transition<mDT>(m: Machine<mDT>, newState: StateType$5, newData?: mDT): boolean;
/********
 *
 *  Instruct the machine to complete an action.  Also exported as `action`,
 *  the same function object, so `import { action }` and `import { act }` are
 *  interchangeable.  This is the function form of the 5.x class methods
 *  `action()` and `do()`; `do` itself has no function form because it is a
 *  JavaScript reserved word, and `Machine.do()` is deprecated in its favor
 *  (removal tracked as StoneCypher/fsl#1992).
 *
 *  @example
 *  import { sm, act, state } from 'jssm';
 *
 *  const light = sm`
 *    off 'start' -> red;
 *    red 'next' -> green 'next' -> yellow 'next' -> red;
 *    [red yellow green] 'shutdown' ~> off;
 *  `;
 *
 *  state(light);           // => 'off'
 *  act(light, 'start');    // => true
 *  state(light);           // => 'red'
 *  act(light, 'next');     // => true
 *  state(light);           // => 'green'
 *  act(light, 'next');     // => true
 *  state(light);           // => 'yellow'
 *  // no such action anywhere in the machine:
 *  act(light, 'dance');    // => false
 *  state(light);           // => 'yellow'
 *  // yellow does not have the action 'start':
 *  act(light, 'start');    // => false
 *  state(light);           // => 'yellow'
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to move
 *
 *  @param actionName The action to engage
 *
 *  @param newData The data change to insert during the action.  Omit to keep
 *  the current data; an explicit `undefined` clears it (StoneCypher/fsl#1264).
 *
 *  @returns `true` if the action was valid and the transition occurred,
 *  `false` otherwise.
 *
 *  @see transition
 *  @see valid_action
 *
 */
declare function act<mDT>(m: Machine<mDT>, actionName: StateType$5, newData?: mDT): boolean;

/*********
 *
 *  Replace the current state — and, when a data argument is provided, the
 *  data — with no regard to the graph.
 *
 *  The data argument is arity-detected: omitting it preserves the current
 *  data, while explicitly passing `undefined` really sets the data to
 *  `undefined` (StoneCypher/fsl#1264).  Before 5.163 an omitted data
 *  argument silently cleared the data.
 *
 *  @example
 *  import { sm, go, override, state } from 'jssm';
 *
 *  const machine = sm`allows_override: true; a -> b -> c;`;
 *  state(machine);    // => 'a'
 *
 *  go(machine, 'b');
 *  go(machine, 'c');
 *  state(machine);    // => 'c'
 *
 *  override(machine, 'a');
 *  state(machine);    // => 'a'
 *
 *  @param m The machine to teleport; must have `allows_override` on.
 *
 *  @param newState The state to teleport to; must exist in the graph.
 *
 *  @param newData Replacement data.  Omit to keep the current data; pass
 *  `undefined` explicitly to clear it.
 *
 *  @throws {JssmError} If the machine's config does not set
 *  `allows_override: true`, or if `newState` does not exist.
 *
 *  @see set_data
 *
 */
declare function override<mDT>(m: Machine<mDT>, newState: StateType$5, newData?: mDT): void;
/**
 * Check whether an action is available from the current state.
 *
 *  @example
 *  import { sm, act, valid_action } from 'jssm';
 *
 *  const m = sm`a 'next' -> b 'back' -> a;`;
 *  valid_action(m, 'next');   // => true
 *  // b has 'back'; a does not:
 *  valid_action(m, 'back');   // => false
 *  act(m, 'next');
 *  valid_action(m, 'back');   // => true
 *
 *  @param m        - The machine to inspect; it does not move.
 *  @param action   - The action name to check.
 *  @param _newData - Reserved for future data validation.
 *  @returns `true` if the action can be taken.
 *  @see act
 */
declare function valid_action<mDT>(m: Machine<mDT>, action: StateType$5, _newData?: mDT): boolean;
/**
 * Check whether a transition to a given state is legal (non-forced) from
 *  the current state.
 *
 *  @example
 *  import { sm, valid_transition } from 'jssm';
 *
 *  const m = sm`a -> b; a ~> c;`;
 *  valid_transition(m, 'b');   // => true
 *  // a forced-only edge:
 *  valid_transition(m, 'c');   // => false
 *  // no such state:
 *  valid_transition(m, 'd');   // => false
 *
 *  @param m        - The machine to inspect; it does not move.
 *  @param newState - The target state.
 *  @param _newData - Reserved for future data validation.
 *  @returns `true` if the transition is legal.
 *  @see transition
 */
declare function valid_transition<mDT>(m: Machine<mDT>, newState: StateType$5, _newData?: mDT): boolean;
/**
 * Check whether a forced transition to a given state exists from the
 *  current state.
 *
 *  @example
 *  import { sm, valid_force_transition } from 'jssm';
 *
 *  const m = sm`a -> b; a ~> c; d -> e;`;
 *  valid_force_transition(m, 'b');   // => true
 *  valid_force_transition(m, 'c');   // => true
 *  // no edge from a to e:
 *  valid_force_transition(m, 'e');   // => false
 *
 *  @param m        - The machine to inspect; it does not move.
 *  @param newState - The target state.
 *  @param _newData - Reserved for future data validation.
 *  @returns `true` if a forced (or any) transition exists.
 *  @see force_transition
 */
declare function valid_force_transition<mDT>(m: Machine<mDT>, newState: StateType$5, _newData?: mDT): boolean;

/*******
 *
 *  The hooks family: registering, removing, and introspecting the machine's
 *  transition hooks, plus the step helpers the transition commit path uses
 *  to run them.  Every function takes the machine as its first argument and
 *  reads the machine's hook tables and `_has_*` fast-path flags directly; the
 *  `Machine` class methods of the same names are one-line delegates onto
 *  these.
 *
 *  `set_hook`, `remove_hook`, the 26 `hook_*` / `post_hook_*` wrappers, and
 *  the registry accessors (`hook_registry`, `hooks_on`, `has_hook`,
 *  `state_has_hooks`) are the public surface, re-exported by the `jssm`
 *  barrel together with the `is_hook_*` predicates and the two
 *  `abstract_*_hook_step` adapters.  `update_hook_fields`, `HOOK_PASSED`,
 *  `HOOK_REJECTED`, `hook_required_fields`, and `hook_spatial_fields` are
 *  exported for the other families (the transition commit path) and are not
 *  part of the barrel.
 *
 */

type StateType$4 = string;
/**
 * Low-level hook registration.  Installs a handler described by a
 *  {@link HookDescription} into the appropriate internal map.  Prefer the
 *  convenience wrappers ({@link hook}, {@link hook_entry}, etc.) over
 *  calling this directly.
 *
 *  @example
 *  import { sm, set_hook, transition } from 'jssm';
 *
 *  const m = sm`a -> b;`;
 *  set_hook(m, { kind: 'hook', from: 'a', to: 'b', handler: () => false });
 *  // the hook vetoed it:
 *  transition(m, 'b');   // => false
 *
 *  @param m        - The machine to register the hook on.
 *  @param HookDesc - A hook descriptor specifying kind, states, and handler.
 *  @throws JssmError if the descriptor is mis-shaped (unknown kind, missing
 *          handler, missing or extraneous spatial field).
 *  @see remove_hook
 */
declare function set_hook<mDT>(m: Machine<mDT>, HookDesc: HookDescription<mDT>): void;
/**
 *  Remove a previously-registered hook described by a
 *  {@link HookDescription}.  Match is by `kind` + identifying keys
 *  (`from`/`to`/`action`/etc.), not by handler reference — there is one
 *  hook per slot in the registry, so the description uniquely identifies
 *  which one to clear.  Fires a `hook-removal` event for inspector tools.
 *
 *  This is the symmetric counterpart of {@link set_hook} for the
 *  event-bridging use case (#638).  Reasoning about hooks via observation
 *  events requires being able to observe their disappearance too.
 *
 *  @example
 *  import { sm, set_hook, remove_hook } from 'jssm';
 *
 *  const m = sm`a -> b;`;
 *  const fn = () => true;
 *  set_hook(m, { kind: 'hook', from: 'a', to: 'b', handler: fn });
 *  remove_hook(m, { kind: 'hook', from: 'a', to: 'b', handler: fn });   // => true
 *  remove_hook(m, { kind: 'hook', from: 'a', to: 'b', handler: fn });   // => false
 *
 *  @param m        - The machine to remove the hook from.
 *  @param HookDesc - A hook descriptor identifying the hook to remove.
 *  @returns `true` if a hook was removed, `false` otherwise.
 *  @throws JssmError if the descriptor's kind is unknown.
 *  @see set_hook
 */
declare function remove_hook<mDT>(m: Machine<mDT>, HookDesc: HookDescription<mDT>): boolean;
/**
 * Register a pre-transition hook on a specific edge.  Fires before
 *  transitioning from `from` to `to`.  If the handler returns `false`, the
 *  transition is blocked.
 *
 *  @example
 *  import { sm, hook, transition } from 'jssm';
 *
 *  const m = sm`a -> b -> c;`;
 *  const seen: string[] = [];
 *  hook(m, 'a', 'b', () => { seen.push('a->b'); });
 *  transition(m, 'b');   // => true
 *  seen;                 // => ['a->b']
 *
 *  @param m       - The machine to register the hook on.
 *  @param from    - Source state name.
 *  @param to      - Target state name.
 *  @param handler - Callback invoked before the transition.
 *  @returns The machine, for chaining.
 *  @see set_hook
 *  @see post_hook
 */
declare function hook<mDT>(m: Machine<mDT>, from: string, to: string, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Register a pre-transition hook on a specific action-labeled edge.
 *  @param m       - The machine to register the hook on.
 *  @param from    - Source state name.
 *  @param to      - Target state name.
 *  @param action  - The action label that triggers this hook.
 *  @param handler - Callback invoked before the transition.
 *  @returns The machine, for chaining.
 */
declare function hook_action<mDT>(m: Machine<mDT>, from: string, to: string, action: string, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Register a pre-transition hook on any edge triggered by a specific action.
 *  @param m       - The machine to register the hook on.
 *  @param action  - The action name to hook.
 *  @param handler - Callback invoked before any transition with this action.
 *  @returns The machine, for chaining.
 */
declare function hook_global_action<mDT>(m: Machine<mDT>, action: string, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Register a pre-transition hook on any action-driven transition.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked before any action transition.
 *  @returns The machine, for chaining.
 */
declare function hook_any_action<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Register a pre-transition hook on any standard (`->`) transition.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked before any legal transition.
 *  @returns The machine, for chaining.
 */
declare function hook_standard_transition<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Register a pre-transition hook on any main-path (`=>`) transition.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked before any main transition.
 *  @returns The machine, for chaining.
 */
declare function hook_main_transition<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Register a pre-transition hook on any forced (`~>`) transition.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked before any forced transition.
 *  @returns The machine, for chaining.
 */
declare function hook_forced_transition<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Register a pre-transition hook on any transition regardless of kind.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked before every transition.
 *  @returns The machine, for chaining.
 */
declare function hook_any_transition<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Register a hook that fires when entering a specific state.
 *  @param m       - The machine to register the hook on.
 *  @param to      - The state being entered.
 *  @param handler - Callback invoked on entry.
 *  @returns The machine, for chaining.
 */
declare function hook_entry<mDT>(m: Machine<mDT>, to: string, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Register a hook that fires when leaving a specific state.
 *  @param m       - The machine to register the hook on.
 *  @param from    - The state being exited.
 *  @param handler - Callback invoked on exit.
 *  @returns The machine, for chaining.
 */
declare function hook_exit<mDT>(m: Machine<mDT>, from: string, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Register a hook that fires when a state's `after` timer elapses — the
 *  delay-over companion to `a after 5s -> b;` style time transitions.  It
 *  does NOT fire when the state is entered or left by ordinary dispatch;
 *  use {@link hook_entry} / {@link hook_exit} for those.  (Versions through
 *  5.143.28 also spuriously fired it on entering the state, the jssm side
 *  of StoneCypher/fsl#1327.)
 *  @param m       - The machine to register the hook on.
 *  @param from    - The state whose `after` timer is being watched.
 *  @param handler - Callback invoked when the timer fires, just before the
 *                   timed transition is taken; informational — its outcome
 *                   cannot reject the transition.
 *  @returns The machine, for chaining.
 *  @example
 *    import { sm, hook_after, go, clear_state_timeout } from 'jssm';
 *    const m = sm`a after 1000 -> b; a -> c; c -> a;`;
 *    let calls = 0;
 *    hook_after(m, 'a', () => { calls += 1; });
 *    go(m, 'c');
 *    go(m, 'a');
 *    // ordinary dispatch never fires it; only the timer elapsing does:
 *    calls;  // => 0
 *    clear_state_timeout(m);
 *  @see hook_entry
 *  @see hook_exit
 *  @see set_state_timeout
 */
declare function hook_after<mDT>(m: Machine<mDT>, from: string, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Register a hook that fires when ANY state's `after` timer elapses — the
 *  whole-machine companion to {@link hook_after}, mirroring how
 *  {@link hook_any_transition} companions {@link hook}.  When the elapsing
 *  state also has a specific {@link hook_after}, the specific hook fires
 *  first and this one fires second; a specific after hook firing always
 *  implies the any-after hook fires too (StoneCypher/fsl#1299).  Like
 *  `hook_after` it is informational — its outcome cannot reject the timed
 *  transition — and it does NOT fire on ordinary dispatch.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked whenever any `after` timer fires, just
 *                   before the timed transition is taken.
 *  @returns The machine, for chaining.
 *  @example
 *    import { sm, hook_after_any, go, clear_state_timeout } from 'jssm';
 *    const m = sm`a after 1000 -> b; a -> c; c -> a;`;
 *    let calls = 0;
 *    hook_after_any(m, () => { calls += 1; });
 *    go(m, 'c');
 *    go(m, 'a');
 *    // ordinary dispatch never fires it; only a timer elapsing does:
 *    calls;  // => 0
 *    clear_state_timeout(m);
 *  @see hook_after
 *  @see hook_any_transition
 *  @see set_state_timeout
 */
declare function hook_after_any<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Post-transition hook on a specific edge.  Fires after the transition
 *  from `from` to `to` has completed.  Cannot block the transition.
 *  @param m       - The machine to register the hook on.
 *  @param from    - Source state name.
 *  @param to      - Target state name.
 *  @param handler - Callback invoked after the transition.
 *  @returns The machine, for chaining.
 */
declare function post_hook<mDT>(m: Machine<mDT>, from: string, to: string, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Post-transition hook on a specific action-labeled edge.
 *  @param m       - The machine to register the hook on.
 *  @param from    - Source state name.
 *  @param to      - Target state name.
 *  @param action  - The action label.
 *  @param handler - Callback invoked after the transition.
 *  @returns The machine, for chaining.
 */
declare function post_hook_action<mDT>(m: Machine<mDT>, from: string, to: string, action: string, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Post-transition hook on any edge triggered by a specific action.
 *  @param m       - The machine to register the hook on.
 *  @param action  - The action name.
 *  @param handler - Callback invoked after any transition with this action.
 *  @returns The machine, for chaining.
 */
declare function post_hook_global_action<mDT>(m: Machine<mDT>, action: string, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Post-transition hook on any action-driven transition.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked after any action transition.
 *  @returns The machine, for chaining.
 */
declare function post_hook_any_action<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Post-transition hook on any standard (`->`) transition.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked after any legal transition.
 *  @returns The machine, for chaining.
 */
declare function post_hook_standard_transition<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Post-transition hook on any main-path (`=>`) transition.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked after any main transition.
 *  @returns The machine, for chaining.
 */
declare function post_hook_main_transition<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Post-transition hook on any forced (`~>`) transition.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked after any forced transition.
 *  @returns The machine, for chaining.
 */
declare function post_hook_forced_transition<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Post-transition hook on any transition regardless of kind.
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked after every transition.
 *  @returns The machine, for chaining.
 */
declare function post_hook_any_transition<mDT>(m: Machine<mDT>, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Post-transition hook that fires after entering a specific state.
 *  @param m       - The machine to register the hook on.
 *  @param to      - The state that was entered.
 *  @param handler - Callback invoked after entry.
 *  @returns The machine, for chaining.
 */
declare function post_hook_entry<mDT>(m: Machine<mDT>, to: string, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Post-transition hook that fires after leaving a specific state.
 *  @param m       - The machine to register the hook on.
 *  @param from    - The state that was exited.
 *  @param handler - Callback invoked after exit.
 *  @returns The machine, for chaining.
 */
declare function post_hook_exit<mDT>(m: Machine<mDT>, from: string, handler: HookHandler<mDT>): Machine<mDT>;
/**
 * Register a pre-transition hook that fires **before** all other pre-hooks
 *  on every transition.  If the handler returns `false`, the transition is
 *  blocked.  The handler receives an {@link EverythingHookContext} whose
 *  `hook_name` is `'pre everything'`.
 *
 *  @example
 *  import { sm, hook_pre_everything, transition } from 'jssm';
 *
 *  const m = sm`a -> b -> c;`;
 *  const fired: string[] = [];
 *  hook_pre_everything(m, ({ hook_name }) => {
 *    fired.push(hook_name);
 *    return true;
 *  });
 *  transition(m, 'b');   // => true
 *  fired;                // => ['pre everything']
 *
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked before all other pre-hooks.
 *  @returns The machine, for chaining.
 */
declare function hook_pre_everything<mDT>(m: Machine<mDT>, handler: EverythingHookHandler<mDT>): Machine<mDT>;
/**
 * Register a pre-transition hook that fires **after** all other pre-hooks
 *  on every transition.  If the handler returns `false`, the transition is
 *  blocked.  The handler receives an {@link EverythingHookContext} whose
 *  `hook_name` is `'everything'`.
 *
 *  @example
 *  import { sm, hook_everything, transition } from 'jssm';
 *
 *  const m = sm`a -> b -> c;`;
 *  const fired: string[] = [];
 *  hook_everything(m, ({ hook_name }) => {
 *    fired.push(hook_name);
 *    return true;
 *  });
 *  transition(m, 'b');   // => true
 *  fired;                // => ['everything']
 *
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked after all other pre-hooks.
 *  @returns The machine, for chaining.
 */
declare function hook_everything<mDT>(m: Machine<mDT>, handler: EverythingHookHandler<mDT>): Machine<mDT>;
/**
 * Register a post-transition hook that fires **after** all other
 *  post-hooks on every transition.  Cannot block the transition.  The
 *  handler receives an {@link EverythingHookContext} whose `hook_name` is
 *  `'post everything'`.
 *
 *  @example
 *  import { sm, hook_post_everything, transition } from 'jssm';
 *
 *  const m = sm`a -> b -> c;`;
 *  const fired: string[] = [];
 *  hook_post_everything(m, ({ hook_name }) => {
 *    fired.push(hook_name);
 *  });
 *  transition(m, 'b');   // => true
 *  fired;                // => ['post everything']
 *
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked after all other post-hooks.
 *  @returns The machine, for chaining.
 */
declare function hook_post_everything<mDT>(m: Machine<mDT>, handler: PostEverythingHookHandler<mDT>): Machine<mDT>;
/**
 * Register a post-transition hook that fires **before** all other
 *  post-hooks on every transition.  Cannot block the transition.  The
 *  handler receives an {@link EverythingHookContext} whose `hook_name` is
 *  `'pre post everything'`.
 *
 *  @example
 *  import { sm, hook_pre_post_everything, transition } from 'jssm';
 *
 *  const m = sm`a -> b -> c;`;
 *  const fired: string[] = [];
 *  hook_pre_post_everything(m, ({ hook_name }) => {
 *    fired.push(hook_name);
 *  });
 *  transition(m, 'b');   // => true
 *  fired;                // => ['pre post everything']
 *
 *  @param m       - The machine to register the hook on.
 *  @param handler - Callback invoked before all other post-hooks.
 *  @returns The machine, for chaining.
 */
declare function hook_pre_post_everything<mDT>(m: Machine<mDT>, handler: PostEverythingHookHandler<mDT>): Machine<mDT>;
/********
 *
 *  Generate the uniform observational-hook registry — every currently
 *  registered hook projected onto a normalized `(kind, target, phase)` row
 *  (megaspec §12, → #1357).  The registry is *generated* on demand by
 *  walking the concrete per-kind storage tables rather than maintained as a
 *  second copy, so it can never drift from the tables {@link set_hook}
 *  actually dispatches into.  It is the single source of truth behind the
 *  introspection accessors ({@link has_hook}, {@link hooks_on})
 *  and the `hooked_state` viz styling.
 *
 *  Targets are normalized: edge hooks become `{ scope: 'edge', from, to }`
 *  (named hooks add `action`), entry/exit/after become `{ scope: 'state' }`,
 *  global-action hooks become `{ scope: 'action' }`, and the `any-*`,
 *  transition-class, and `everything` observers become `{ scope: 'global' }`.
 *
 *  @example
 *  import { sm, hook_entry, hook_registry } from 'jssm';
 *
 *  const m = sm`a 'go' -> b;`;
 *  hook_entry(m, 'b', () => true);
 *  hook_registry(m);   // => [ { kind: 'entry', phase: 'pre', target: { scope: 'state', state: 'b' } } ]
 *
 *  @param m The machine to inspect.
 *
 *  @returns Every registered hook as a {@link HookRegistryEntry}, in a stable
 *  table-walk order (pre-phase tables first, then post-phase).
 *
 */
declare function hook_registry<mDT>(m: Machine<mDT>): HookRegistryEntry[];
/********
 *
 *  Return every registry entry observing the given target (megaspec §12).
 *  The `query` selects the target shape:
 *
 *  - a bare **state name** matches entry/exit/after hooks on that state, its
 *    state-boundary hooks, and every edge hook touching it (`from` or `to`),
 *  - a `{ from, to, action? }` **edge** matches edge hooks on that
 *    transition (optionally narrowed to the named action),
 *  - a `{ action }` **action** matches global-action and named-edge hooks
 *    carrying that action,
 *  - a `{ group }` **group** matches that group's boundary hooks (group hooks
 *    are matched by name only and do not propagate to member states).
 *
 *  @example
 *  import { sm, hook_entry, hooks_on } from 'jssm';
 *
 *  const m = sm`a 'go' -> b;`;
 *  hook_entry(m, 'b', () => true);
 *  hooks_on(m, 'b').length;             // => 1
 *  // no edge hook is registered:
 *  hooks_on(m, { from: 'a', to: 'b' }); // => []
 *
 *  @param m     The machine to inspect.
 *  @param query The {@link HookQuery} naming the target to inspect.
 *  @returns The matching {@link HookRegistryEntry} rows (possibly empty).
 *
 */
declare function hooks_on<mDT>(m: Machine<mDT>, query: HookQuery): HookRegistryEntry[];
/********
 *
 *  Is at least one observational hook bound to the given target (megaspec
 *  §12)?  The `query` is read exactly as in {@link hooks_on}.  An
 *  optional `phase` narrows the test to pre- or post-transition hooks only;
 *  omitted, either phase satisfies it.
 *
 *  @example
 *  import { sm, hook_entry, has_hook } from 'jssm';
 *
 *  const m = sm`a -> b;`;
 *  has_hook(m, 'b');                 // => false
 *  hook_entry(m, 'b', () => true);
 *  has_hook(m, 'b');                 // => true
 *  // the entry hook is pre-phase:
 *  has_hook(m, 'b', 'post');         // => false
 *
 *  @param m     The machine to inspect.
 *  @param query The {@link HookQuery} naming the target to inspect.
 *  @param phase Optional {@link HookPhase} to restrict the test to.
 *  @returns `true` when a matching hook exists.
 *
 */
declare function has_hook<mDT>(m: Machine<mDT>, query: HookQuery, phase?: HookPhase): boolean;
/********
 *
 *  Does the given state carry any observational hook — i.e. should it receive
 *  the `hooked_state` viz styling?  True when an entry/exit/after hook is
 *  bound to the state, any edge hook touches it, or the state has its own
 *  boundary hook.  Group-boundary hooks do *not* count here — they are
 *  matched by group only and never propagate to member states.  Powers the
 *  `hooked` styling layer in `resolve_state_config`; replaces
 *  the long-stubbed `has_hooks` placeholder (megaspec §12).
 *
 *  @example
 *  import { sm, hook_exit, state_has_hooks } from 'jssm';
 *
 *  const m = sm`a -> b;`;
 *  state_has_hooks(m, 'a');          // => false
 *  hook_exit(m, 'a', () => true);
 *  state_has_hooks(m, 'a');          // => true
 *
 *  @param m     The machine to inspect.
 *  @param state The state to test.
 *  @returns `true` when the state is observed by at least one hook.
 *
 */
declare function state_has_hooks<mDT>(m: Machine<mDT>, state: StateType$4): boolean;
/**
 *
 *  Type guard that narrows an unknown value to a {@link HookComplexResult}.
 *
 *  A hook complex result is an object with at minimum a boolean `pass` field,
 *  and may optionally also carry replacement `data` / `next_data` fields that
 *  the machine should adopt if the hook passes.  This helper is used by the
 *  hook-dispatch machinery to tell "hook returned a complex object" from
 *  "hook returned a bare boolean / null / undefined".
 *
 *  @example
 *  import { is_hook_complex_result } from 'jssm';
 *
 *  is_hook_complex_result({ pass: true });                 // => true
 *  is_hook_complex_result({ pass: false, data: { x: 1 }}); // => true
 *  is_hook_complex_result(true);                           // => false
 *  is_hook_complex_result(null);                           // => false
 *  is_hook_complex_result({ other: 'thing' });             // => false
 *
 *  @template mDT The type of the machine data member; usually omitted.
 *  @param hr The value to test.
 *  @returns `true` if `hr` is a non-null object with a boolean `pass` field;
 *  `false` otherwise.  When `true`, TypeScript narrows `hr` to
 *  `HookComplexResult<mDT>`.
 */
declare function is_hook_complex_result<mDT>(hr: unknown): hr is HookComplexResult<mDT>;
/**
 *
 *  Normalize any legal hook return value to a single "did it reject?" boolean.
 *
 *  Hooks in jssm may return any of the following to indicate success:
 *  `true`, `undefined`, or a complex result whose `pass` field is `true`.
 *  They may return any of the following to indicate rejection:
 *  `false`, or a complex result whose `pass` field is `false`.  This helper
 *  collapses all of those shapes into one boolean so callers don't have to
 *  re-implement the matrix.
 *
 *  @example
 *  import { is_hook_rejection } from 'jssm';
 *
 *  // passes:
 *  is_hook_rejection(true);            // => false
 *  is_hook_rejection(undefined);       // => false
 *  is_hook_rejection({ pass: true });  // => false
 *  // rejections:
 *  is_hook_rejection(false);           // => true
 *  is_hook_rejection({ pass: false }); // => true
 *
 *  @template mDT The type of the machine data member; usually omitted.
 *  @param hr A hook result of any legal shape.
 *  @returns `true` if the hook rejected the transition; `false` if it passed.
 *  @throws {TypeError} If `hr` is not a recognized hook result shape (for
 *  example, a number or a plain object without a `pass` field).
 */
declare function is_hook_rejection<mDT>(hr: HookResult<mDT>): boolean;
/**
 *
 *  Invoke an optional transition/action hook and normalize its return value
 *  into a {@link HookComplexResult}.
 *
 *  This is the central adapter the transition pipeline uses to run every
 *  non-"everything" hook kind (basic, named, entry, exit, after, action, etc).
 *  It accepts `undefined` for the hook slot because most hooks are not set on
 *  most machines; when no hook is installed the step is a no-op pass.
 *
 *  The valid return shapes from a hook and their normalized meanings are:
 *  - `undefined` → `{ pass: true }`
 *  - `true`      → `{ pass: true }`
 *  - `false`     → `{ pass: false }`
 *  - `null`      → `{ pass: false }`
 *  - a complex result object → returned as-is
 *
 *  Anything else is a programmer error and throws.
 *  @template mDT The type of the machine data member; usually omitted.
 *  @param maybe_hook The hook handler to call, or `undefined` for the
 *  "no hook installed" case.
 *  @param hook_args The context object passed to the hook.  Includes the
 *  current and proposed state, current and proposed data, action name, and
 *  transition kind.
 *  @returns A {@link HookComplexResult} describing whether the hook passed
 *  and, optionally, any data replacements it requested.
 *  @throws {TypeError} If the hook returns a value that is not one of the
 *  legal shapes listed above.
 *  @internal
 */
declare function abstract_hook_step<mDT>(maybe_hook: HookHandler<mDT> | undefined, hook_args: HookContext<mDT>): HookComplexResult<mDT>;
/**
 *
 *  Invoke an optional "everything" hook and normalize its return value into
 *  a {@link HookComplexResult}.
 *
 *  Mechanically identical to {@link abstract_hook_step}, but typed for the
 *  everything-hook family (`pre_everything_hook` and `everything_hook`),
 *  whose context object carries an extra `hook_name` field identifying which
 *  bracket of the pipeline is firing.  Separated from `abstract_hook_step`
 *  so TypeScript can enforce that the hook handler and the context object
 *  agree on shape.
 *
 *  The valid return shapes and their meanings are the same as for
 *  `abstract_hook_step`:
 *  - `undefined` or `true` → `{ pass: true }`
 *  - `false` or `null`     → `{ pass: false }`
 *  - a complex result      → returned as-is
 *  @template mDT The type of the machine data member; usually omitted.
 *  @param maybe_hook The everything-hook handler, or `undefined` when none
 *  is installed.
 *  @param hook_args The everything-hook context object.  Differs from a
 *  normal hook context in that it also includes `hook_name`.
 *  @returns A {@link HookComplexResult} describing whether the hook passed
 *  and any data replacements it requested.
 *  @throws {TypeError} If the hook returns a value outside the legal shapes.
 *  @internal
 */
declare function abstract_everything_hook_step<mDT>(maybe_hook: EverythingHookHandler<mDT> | undefined, hook_args: EverythingHookContext<mDT>): HookComplexResult<mDT>;

/*******
 *
 *  The data family: the machine's free-form data value, its declared
 *  `property` table, and its typed `val` table.  Every function takes the
 *  machine as its first argument and reads the machine's `_data`,
 *  `_state_properties` / `_default_properties` / `_property_keys`, and
 *  `_val_*` fields directly; the `Machine` class methods of the same names
 *  are one-line delegates onto these.
 *
 *  `data`, `set_data`, `prop`, `strict_prop`, `props`, `known_prop`,
 *  `known_props`, `val`, `set_val`, `vals`, `known_val`, `known_vals`, and
 *  `val_type` are the public surface, re-exported by the `jssm` barrel.
 *  `data_ref` (the zero-copy read the class exposes as `_data_ref`) and
 *  `validate_val_value` (which the constructor runs over the initial vals)
 *  are exported for the class and the same-package panels only, and are not
 *  part of the barrel.
 *
 */

/*********
 *
 *  Get the current data of a machine.
 *
 *  @example
 *  import { from, data } from 'jssm';
 *
 *  const lswitch = from('on <=> off;', {data: 1});
 *  data(lswitch);              // => 1
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine whose data to read.
 *
 *  @returns A deep clone of the machine's current data value.
 *
 */
declare function data<mDT>(m: Machine<mDT>): mDT;
/*********
 *
 *  Replace the machine's data in place, without a transition.  This is the
 *  practical way to assign any value — including `undefined`, `null`, or
 *  `false` — outside a hook's complex return, closing the gap where an
 *  `undefined` assignment had no direct API (StoneCypher/fsl#1264).  Fires
 *  a `data-change` event with cause `'set_data'` when the value actually
 *  changes; unlike {@link override} it requires no `allows_override`
 *  config, because it never moves the state.
 *
 *  @example
 *  import { from, data, set_data } from 'jssm';
 *
 *  const lswitch = from('on <=> off;', {data: 1});
 *  data(lswitch);              // => 1
 *
 *  set_data(lswitch, 2);
 *  data(lswitch);              // => 2
 *
 *  set_data(lswitch, undefined);
 *  data(lswitch);              // => undefined
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m       The machine whose data to replace.
 *  @param newData The value to install as the machine's data.
 *
 *  @returns The machine, for chaining.
 *
 *  @see data
 *  @see override
 *
 */
declare function set_data<mDT>(m: Machine<mDT>, newData: mDT): Machine<mDT>;
/*********
 *
 *  Get the current value of a given property name.  Checks the current
 *  state's properties first, then falls back to the global default.
 *  Returns `undefined` if neither exists.  For a throwing variant, see
 *  {@link strict_prop}.
 *
 *  @example
 *  import { sm, go, prop } from 'jssm';
 *
 *  const m = sm`property color default "grey"; a -> b;
 *               state b: { property: color "blue"; };`;
 *
 *  // the default, because the state is 'a':
 *  prop(m, 'color');  // => 'grey'
 *  go(m, 'b');
 *  // state 'b' overrides the default:
 *  prop(m, 'color');  // => 'blue'
 *  // no such property:
 *  prop(m, 'size');   // => undefined
 *
 *  @param m    The machine to read the property from.
 *  @param name The relevant property name to look up.
 *
 *  @returns The value behind the prop name, or `undefined` if not defined.
 *
 */
declare function prop<mDT>(m: Machine<mDT>, name: string): any;
/*********
 *
 *  Get the current value of a given property name.  If missing on the state
 *  and without a global default, throws a {@link JssmError}, unlike
 *  {@link prop}, which would return `undefined` instead.
 *
 *  @example
 *  import { sm, strict_prop } from 'jssm';
 *
 *  const m = sm`property color default "grey"; a -> b;`;
 *
 *  strict_prop(m, 'color');  // => 'grey'
 *  // an undeclared property throws a JssmError:
 *  expect(() => strict_prop(m, 'size')).toThrow();
 *
 *  @param m    The machine to read the property from.
 *  @param name The relevant property name to look up.
 *
 *  @returns The value behind the prop name.
 *
 *  @throws {JssmError} If the property is not defined on the current state
 *  and has no default.
 *
 */
declare function strict_prop<mDT>(m: Machine<mDT>, name: string): any;
/*********
 *
 *  Get the current value of every prop, as an object.  If no current definition
 *  exists for a prop — that is, if the prop was defined without a default and
 *  the current state also doesn't define the prop — then that prop will be listed
 *  in the returned object with a value of `undefined`.
 *
 *  @example
 *  import { sm, go, state, props } from 'jssm';
 *
 *  const traffic_light = sm`
 *
 *    property can_go     default true;
 *    property hesitate   default true;
 *    property stop_first default false;
 *
 *    Off -> Red => Green => Yellow => Red;
 *    [Red Yellow Green] ~> [Off FlashingRed];
 *    FlashingRed -> Red;
 *
 *    state Red:         { property: stop_first true;  property: can_go false; };
 *    state Off:         { property: stop_first true;  };
 *    state FlashingRed: { property: stop_first true;  };
 *    state Green:       { property: hesitate   false; };
 *
 *  `;
 *
 *  state(traffic_light);  // => 'Off'
 *  props(traffic_light);  // => { can_go: true,  hesitate: true,  stop_first: true  }
 *
 *  go(traffic_light, 'Red');
 *  props(traffic_light);  // => { can_go: false, hesitate: true,  stop_first: true  }
 *
 *  go(traffic_light, 'Green');
 *  props(traffic_light);  // => { can_go: true,  hesitate: false, stop_first: false }
 *
 *  @param m The machine to read the properties from.
 *
 *  @returns An object mapping every known property name to its current value
 *  (or `undefined` if the property has no default and the current state
 *  doesn't define it).
 *
 */
declare function props<mDT>(m: Machine<mDT>): object;
/*********
 *
 *  Check whether a given string is a known property's name.
 *
 *  @example
 *  import { sm, known_prop } from 'jssm';
 *
 *  const example = sm`property foo default 1; a->b;`;
 *
 *  known_prop(example, 'foo');  // => true
 *  known_prop(example, 'bar');  // => false
 *
 *  @param m         The machine to inspect.
 *  @param prop_name The relevant property name to look up
 *
 *  @returns Whether the name is a declared property.
 *
 */
declare function known_prop<mDT>(m: Machine<mDT>, prop_name: string): boolean;
/*********
 *
 *  List all known property names.  If you'd also like values, use
 *  {@link props} instead.  The order of the properties is not defined, and
 *  the properties generally will not be sorted.
 *
 *  @example
 *  import { sm, known_props } from 'jssm';
 *
 *  const m = sm`property color default "grey"; property size default 1; a -> b;`;
 *
 *  known_props(m).sort();  // => ['color', 'size']
 *
 *  @param m The machine to inspect.
 *
 *  @returns An array of all property name strings defined on this machine.
 *
 */
declare function known_props<mDT>(m: Machine<mDT>): string[];
/*********
 *
 *  Read the current value of a declared machine `val`.
 *
 *  @example
 *  import { sm, val } from 'jssm';
 *
 *  const m = sm`val ok : boolean default true; a -> b;`;
 *
 *  val(m, 'ok');   // => true
 *
 *  @param m    The machine to read the val from.
 *  @param name The declared val name to read.
 *  @returns The val's current value (or `undefined` if it has no default and was not supplied).
 *  @throws {JssmError} If `name` is not a declared val.
 *
 */
declare function val<mDT>(m: Machine<mDT>, name: string): any;
/*********
 *
 *  Set the value of a declared machine `val`, validating it against the val's
 *  declared type.  This is the runtime mutation surface; source-level `assign`
 *  arrives in a later phase.
 *
 *  @example
 *  import { sm, val, set_val } from 'jssm';
 *
 *  const m = sm`val n : int default 0; a -> b;`;
 *
 *  set_val(m, 'n', 5);
 *  val(m, 'n');   // => 5
 *
 *  @param m     The machine to write the val on.
 *  @param name  The declared val name to write.
 *  @param value The new value; must satisfy the val's declared type.
 *  @throws {JssmError} If `name` is not a declared val, or `value` violates the type.
 *
 */
declare function set_val<mDT>(m: Machine<mDT>, name: string, value: any): void;
/*********
 *
 *  Return a plain object mapping every declared val name to its current value.
 *
 *  @example
 *  import { sm, vals } from 'jssm';
 *
 *  const m = sm`val a : int default 1; val b : boolean default false; x -> y;`;
 *
 *  vals(m);   // => { a: 1, b: false }
 *
 *  @param m The machine to read the vals from.
 *
 *  @returns An object of every declared val name to its current value.
 *
 */
declare function vals<mDT>(m: Machine<mDT>): object;
/*********
 *
 *  Check whether a string is the name of a declared `val`.
 *
 *  @example
 *  import { sm, known_val } from 'jssm';
 *
 *  const m = sm`val a : int default 1; x -> y;`;
 *
 *  known_val(m, 'a');   // => true
 *  known_val(m, 'z');   // => false
 *
 *  @param m    The machine to inspect.
 *  @param name The candidate val name.
 *  @returns Whether the name is a declared val.
 *
 */
declare function known_val<mDT>(m: Machine<mDT>, name: string): boolean;
/*********
 *
 *  List every declared `val` name, in declaration order.
 *
 *  @example
 *  import { sm, known_vals } from 'jssm';
 *
 *  const m = sm`val a : int default 1; val b : int default 2; x -> y;`;
 *
 *  known_vals(m);   // => ['a', 'b']
 *
 *  @param m The machine to inspect.
 *
 *  @returns The declared val names in declaration order.
 *
 */
declare function known_vals<mDT>(m: Machine<mDT>): string[];
/*********
 *
 *  Return the declared type descriptor of a `val`.
 *
 *  @example
 *  import { sm, val_type } from 'jssm';
 *
 *  const m = sm`val n : int 0..3 default 0; x -> y;`;
 *
 *  val_type(m, 'n');   // => { kind: 'int', lo: 0, hi: 3 }
 *
 *  @param m    The machine to inspect.
 *  @param name The declared val name.
 *  @returns The val's declared type descriptor.
 *  @throws {JssmError} If `name` is not a declared val.
 *
 */
declare function val_type<mDT>(m: Machine<mDT>, name: string): JssmValType;

/*******
 *
 *  The query family: everything that reads the machine without moving it —
 *  the current state, labels, the start / end / failed / final / terminal /
 *  complete predicates, the machine attribute accessors (`machine_*`,
 *  `editor_config`, `npm_name`, `default_size`, `fsl_version`, the state
 *  declarations, `machine_state`), the state and edge lists, the override
 *  and island policies, the grammar character tables, and the edge lookups
 *  (`get_transition_by_state_names`, `lookup_transition_for`, `edges_between`,
 *  `current_action_for`, `current_action_edge_for`).  Every function takes
 *  the machine as its first argument and reads its fields directly; the
 *  `Machine` class methods and getters of the same names are one-line
 *  delegates onto these.
 *
 *  Every export here is public and re-exported by the `jssm` barrel.
 *
 */

type StateType$3 = string;
/*********
 *
 *  Get the current state of a machine.
 *
 *  @example
 *  import { from, transition, state } from 'jssm';
 *
 *  const lswitch = from('on <=> off;');
 *  state(lswitch);             // => 'on'
 *
 *  transition(lswitch, 'off');
 *  state(lswitch);             // => 'off'
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to read.
 *
 *  @returns The current state name.
 *
 */
declare function state<mDT>(m: Machine<mDT>): StateType$3;
/*********
 *
 *  Get the label for a given state, if any; return `undefined` otherwise.
 *
 *  See also {@link display_text}.
 *
 *  @example
 *  import { from, label_for } from 'jssm';
 *
 *  const lswitch = from('a -> b; state a: { label: "Foo!"; };');
 *  label_for(lswitch, 'a');              // => 'Foo!'
 *  label_for(lswitch, 'b');              // => undefined
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m     The machine to read.
 *  @param state The state to get the label for.
 *
 *  @returns The label string, or `undefined` if no label is set.
 *
 */
declare function label_for<mDT>(m: Machine<mDT>, state: StateType$3): string;
/*********
 *
 *  Get whatever the node should show as text.
 *
 *  Currently, this means to get the label for a given state, if any;
 *  otherwise to return the node's name.  However, this definition is expected
 *  to grow with time, and it is currently considered ill-advised to manually
 *  parse this text.
 *
 *  See also {@link label_for}.
 *
 *  @example
 *  import { from, display_text } from 'jssm';
 *
 *  const lswitch = from('a -> b; state a: { label: "Foo!"; };');
 *  display_text(lswitch, 'a');              // => 'Foo!'
 *  display_text(lswitch, 'b');              // => 'b'
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m     The machine to read.
 *  @param state The state to get display text for.
 *
 *  @returns The label if one exists, otherwise the state's name.
 *
 */
declare function display_text<mDT>(m: Machine<mDT>, state: StateType$3): string;
/********
 *
 *  Check whether a given state is a valid start state (either because it was
 *  explicitly named as such, or because it was the first mentioned state.)
 *
 *  @example
 *  import { sm, is_start_state } from 'jssm';
 *
 *  const example = sm`a -> b;`;
 *
 *  is_start_state(example, 'a');   // => true
 *  is_start_state(example, 'b');   // => false
 *
 *  const example2 = sm`start_states: [a b]; a -> b;`;
 *
 *  is_start_state(example2, 'a');   // => true
 *  is_start_state(example2, 'b');   // => true
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m          The machine to read.
 *  @param whichState The name of the state to check
 *
 *  @returns Whether the state is a start state.
 *
 */
declare function is_start_state<mDT>(m: Machine<mDT>, whichState: StateType$3): boolean;
/********
 *
 *  Check whether a given state is a declared end state.
 *
 *  @example
 *  import { sm, is_end_state } from 'jssm';
 *
 *  const example = sm`a -> b;`;
 *
 *  is_end_state(example, 'a');   // => false
 *  is_end_state(example, 'b');   // => false
 *
 *  const example2 = sm`end_states: [a b]; a -> b;`;
 *
 *  is_end_state(example2, 'a');   // => true
 *  is_end_state(example2, 'b');   // => true
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m          The machine to read.
 *  @param whichState The name of the state to check
 *
 *  @returns Whether the state is a declared end state.
 *
 */
declare function is_end_state<mDT>(m: Machine<mDT>, whichState: StateType$3): boolean;
/********
 *
 *  Get the set of states declared as failure outputs for this machine.
 *  Returns an array of state labels, or an empty array when none were
 *  declared.  A state in this list means the machine is in a failure
 *  condition when it occupies that state.
 *
 *  @param m The machine to read.
 *
 *  @returns The declared failure-output state names, as a fresh array.
 *
 *  @see {@link is_failed_output} to test a single state
 *  @see {@link is_failed} to test the current state
 *
 */
declare function failed_outputs<mDT>(m: Machine<mDT>): Array<StateType$3>;
/********
 *
 *  Check whether a given state is declared as a failure output.
 *
 *  @param m          The machine to read.
 *  @param whichState The name of the state to check
 *
 *  @returns Whether the state is a declared failure output.
 *
 *  @see {@link failed_outputs} for the full failure-output set
 *  @see {@link is_failed} to test the current state
 *
 */
declare function is_failed_output<mDT>(m: Machine<mDT>, whichState: StateType$3): boolean;
/********
 *
 *  Check whether the machine is currently in a failure state — that is,
 *  whether its current state is one of the declared `failed_outputs`.
 *
 *  @param m The machine to read.
 *
 *  @returns Whether the current state is a declared failure output.
 *
 *  @see {@link failed_outputs} for the full failure-output set
 *  @see {@link is_failed_output} to test an arbitrary state
 *
 */
declare function is_failed<mDT>(m: Machine<mDT>): boolean;
/********
 *
 *  Check whether a given state is final (either has no exits or is marked
 *  `complete`.)
 *
 *  @example
 *  import { sm, state_is_final } from 'jssm';
 *
 *  const final_test = sm`first -> second;`;
 *
 *  state_is_final(final_test, 'first');   // => false
 *  state_is_final(final_test, 'second');  // => true
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m          The machine to read.
 *  @param whichState The name of the state to check for finality
 *
 *  @returns Whether the state is terminal or complete.
 *
 */
declare function state_is_final<mDT>(m: Machine<mDT>, whichState: StateType$3): boolean;
/********
 *
 *  Check whether the current state is final (either has no exits or is marked
 *  `complete`.)
 *
 *  @example
 *  import { sm, transition, is_final } from 'jssm';
 *
 *  const final_test = sm`first -> second;`;
 *
 *  is_final(final_test);   // => false
 *  transition(final_test, 'second');
 *  is_final(final_test);   // => true
 *
 *  @param m The machine to read.
 *
 *  @returns Whether the current state is terminal or complete.
 *
 */
declare function is_final<mDT>(m: Machine<mDT>): boolean;
/**
 *  The RFC 8785 canonical-config identity of the current configuration
 *  (`{v, state, data}`) — the byte-stable, replay-derivable core used for
 *  hashing.  Excludes envelope fields (timestamp/comment/history).
 *  @param m The machine to read.
 *  @returns The canonical config string.
 *  @example
 *    import { sm, canonical } from 'jssm';
 *    canonical(sm`a -> b;`).includes('"state":"a"');  // => true
 */
declare function canonical<mDT>(m: Machine<mDT>): string;
/**
 * Get the machine's author list.  Set via the FSL `machine_author` directive.
 *  @param m The machine to read.
 *  @returns An array of author name strings.
 */
declare function machine_author<mDT>(m: Machine<mDT>): Array<string>;
/**
 * Get the machine's comment string.  Set via the FSL `machine_comment` directive.
 *  @param m The machine to read.
 *  @returns The comment string.
 */
declare function machine_comment<mDT>(m: Machine<mDT>): string;
/**
 * Get the machine's contributor list.  Set via the FSL `machine_contributor` directive.
 *  @param m The machine to read.
 *  @returns An array of contributor name strings.
 */
declare function machine_contributor<mDT>(m: Machine<mDT>): Array<string>;
/**
 * Get the machine's definition string.  Set via the FSL `machine_definition` directive.
 *  @param m The machine to read.
 *  @returns The definition string.
 */
declare function machine_definition<mDT>(m: Machine<mDT>): string;
/**
 * Get the machine's natural language as an ISO 639-1 code.  Set via the FSL
 *  `machine_language` directive, which accepts a language name or code, or a
 *  BCP-47 tag whose region subtag is dropped (`en-us` -> `en`).  Unrecognized
 *  values resolve to `undefined`.
 *  @param m The machine to read.
 *  @returns The ISO 639-1 language code (e.g. `'en'`), or `undefined` if the
 *           supplied value did not resolve to a known language.
 */
declare function machine_language<mDT>(m: Machine<mDT>): string;
/**
 * Get the machine's license string.  Set via the FSL `machine_license` directive.
 *  @param m The machine to read.
 *  @returns The license string.
 */
declare function machine_license<mDT>(m: Machine<mDT>): string;
/**
 * Get the machine's name.  Set via the FSL `machine_name` directive.
 *  @param m The machine to read.
 *  @returns The machine name string.
 */
declare function machine_name<mDT>(m: Machine<mDT>): string;
/**
 * The editor/panel defaults declared in the FSL `editor: {}` block, or
 *  `undefined` when none was given.  Read by the all-widgets web control
 *  (fsl#1334) — `panels` drives `request` panel mode.
 *  @param m The machine to read.
 *  @returns `{ stochastic_run_count?, panels? }`, or `undefined`.
 *  @example
 *    import { sm, editor_config } from 'jssm';
 *    const m = sm`editor: { panels: [history]; }; a -> b;`;
 *    editor_config(m);  // => { panels: ['history'] }
 */
declare function editor_config<mDT>(m: Machine<mDT>): JssmEditorConfig | undefined;
/**
 * Get the npm package name associated with the machine.  Set via the FSL `npm_name` directive.
 *  Returns `undefined` when not present.
 *  @param m The machine to read.
 *  @returns The npm package name string, or `undefined`.
 *  @see machine_name
 */
declare function npm_name<mDT>(m: Machine<mDT>): string;
/**
 * Get the render-size hint for the machine's visualization.  Set via the
 *  FSL `default_size` directive.  Returns `undefined` when not present.
 *
 *  The three FSL forms each produce a different subset of fields:
 *
 *  - `default_size: 800;`       → `{ width: 800 }`
 *  - `default_size: 800 600;`   → `{ width: 800, height: 600 }`
 *  - `default_size: height 600;` → `{ height: 600 }`
 *
 *  This is a hint, not a hard constraint.  Renderers may ignore it.
 *  @param m The machine to read.
 *  @returns The size-hint object, or `undefined` if not set.
 *  @see npm_name
 */
declare function default_size<mDT>(m: Machine<mDT>): JssmDefaultSize | undefined;
/**
 * Get the machine's declared version, parsed.  Set via the FSL
 *  `machine_version` directive, which takes a semver triple; the parser
 *  breaks it into numeric `major`/`minor`/`patch` fields and keeps the
 *  exact source text in `full`.  Returns `undefined` when the directive
 *  was not given.
 *  @param m The machine to read.
 *  @returns The parsed {@link JssmParsedSemver}, or `undefined` if unset.
 *  @example
 *    import { sm, machine_version } from 'jssm';
 *    const m = sm`machine_version: 1.2.3; a -> b;`;
 *    machine_version(m);  // => { major: 1, minor: 2, patch: 3, full: '1.2.3' }
 *  @see fsl_version
 */
declare function machine_version<mDT>(m: Machine<mDT>): JssmParsedSemver | undefined;
/**
 * Get the raw state declaration objects as parsed from the FSL source.
 *  @param m The machine to read.
 *  @returns An array of raw state declaration objects.
 */
declare function raw_state_declarations<mDT>(m: Machine<mDT>): Array<object>;
/**
 * Get the processed state declaration for a specific state.
 *  @param m     The machine to read.
 *  @param which The state to look up.
 *  @returns The {@link JssmStateDeclaration} for the given state.
 */
declare function state_declaration<mDT>(m: Machine<mDT>, which: StateType$3): JssmStateDeclaration;
/**
 * Get all processed state declarations as a Map.
 *  @param m The machine to read.
 *  @returns A `Map` from state name to {@link JssmStateDeclaration}.
 */
declare function state_declarations<mDT>(m: Machine<mDT>): Map<StateType$3, JssmStateDeclaration>;
/**
 * Get the FSL language version this machine declares, parsed.  Set via
 *  the FSL `fsl_version` directive, which takes a semver triple; the
 *  parser breaks it into numeric `major`/`minor`/`patch` fields and keeps
 *  the exact source text in `full`.  Returns `undefined` when the
 *  directive was not given.
 *  @param m The machine to read.
 *  @returns The parsed {@link JssmParsedSemver}, or `undefined` if unset.
 *  @example
 *    import { sm, fsl_version } from 'jssm';
 *    const m = sm`fsl_version: 1.0.0; a -> b;`;
 *    fsl_version(m);  // => { major: 1, minor: 0, patch: 0, full: '1.0.0' }
 *  @see machine_version
 */
declare function fsl_version<mDT>(m: Machine<mDT>): JssmParsedSemver | undefined;
/**
 * Get the complete internal state of the machine as a serializable
 *  structure.  Includes actions, edges, edge map, named transitions,
 *  reverse actions, current state, and states map.
 *  @param m The machine to read.
 *  @returns A {@link JssmMachineInternalState} snapshot.
 */
declare function machine_state<mDT>(m: Machine<mDT>): JssmMachineInternalState<mDT>;
/*********
 *
 *  List all the states known by the machine.  Please note that the order of
 *  these states is not guaranteed.
 *
 *  @example
 *  import { from, states } from 'jssm';
 *
 *  const lswitch = from('on <=> off;');
 *  states(lswitch).sort();             // => ['off', 'on']
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to read.
 *
 *  @returns An array of all state names in the machine.
 *
 */
declare function states<mDT>(m: Machine<mDT>): Array<StateType$3>;
/**
 * Get the internal state descriptor for a given state name.
 *  @param m          The machine to read.
 *  @param whichState The state to look up.
 *  @returns The {@link JssmGenericState} descriptor.
 *  @throws {JssmError} If the state does not exist.
 */
declare function state_for<mDT>(m: Machine<mDT>, whichState: StateType$3): JssmGenericState;
/*********
 *
 *  Check whether the machine knows a given state.
 *
 *  @example
 *  import { from, has_state } from 'jssm';
 *
 *  const lswitch = from('on <=> off;');
 *
 *  has_state(lswitch, 'off');     // => true
 *  has_state(lswitch, 'dance');   // => false
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m          The machine to read.
 *  @param whichState The state to be checked for existence.
 *
 *  @returns `true` if the state exists, `false` otherwise.
 *
 */
declare function has_state<mDT>(m: Machine<mDT>, whichState: StateType$3): boolean;
/*********
 *
 *  Lists all edges of a machine.  Each edge is a {@link JssmTransition}
 *  record such as `{ from: 'on', to: 'off', kind: 'main', forced_only: false,
 *  main_path: true, action: 'toggle' }`.
 *
 *  @example
 *  import { sm, list_edges } from 'jssm';
 *
 *  const lswitch = sm`on 'toggle' <=> 'toggle' off;`;
 *
 *  list_edges(lswitch).length;                                      // => 2
 *  list_edges(lswitch).map(e => [e.from, e.to, e.kind, e.action]);  // => [ ['on', 'off', 'main', 'toggle'], ['off', 'on', 'main', 'toggle'] ]
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to read.
 *
 *  @returns An array of all {@link JssmTransition} edge objects.
 *
 */
declare function list_edges<mDT>(m: Machine<mDT>): Array<JssmTransition<StateType$3, mDT>>;
/**
 * Get the map of named transitions (transitions with explicit names).
 *  @param m The machine to read.
 *  @returns A `Map` from transition name to edge index.
 */
declare function list_named_transitions<mDT>(m: Machine<mDT>): Map<StateType$3, number>;
/**
 * List all distinct action names defined anywhere in the machine.
 *  @param m The machine to read.
 *  @returns An array of action name strings.
 */
declare function list_actions<mDT>(m: Machine<mDT>): Array<StateType$3>;
/**
 * Whether any actions are defined on this machine.
 *  @param m The machine to read.
 *  @returns `true` if the machine has at least one action.
 */
declare function uses_actions<mDT>(m: Machine<mDT>): boolean;
/**
 * Whether any forced (`~>`) transitions exist in this machine.
 *  @param m The machine to read.
 *  @returns `true` if at least one forced transition is defined.
 */
declare function uses_forced_transitions<mDT>(m: Machine<mDT>): boolean;
/*********
 *
 *  Check if the code that built the machine allows overriding state and data.
 *
 *  @param m The machine to read.
 *
 *  @returns The override permission from the FSL source code.
 *
 */
declare function code_allows_override<mDT>(m: Machine<mDT>): JssmAllowsOverride;
/*********
 *
 *  Check if the machine config allows overriding state and data.
 *
 *  @param m The machine to read.
 *
 *  @returns The override permission from the runtime config.
 *
 */
declare function config_allows_override<mDT>(m: Machine<mDT>): JssmAllowsOverride;
/*********
 *
 *  Check if a machine allows overriding state and data.  Resolves the
 *  combined effect of code and config permissions — config may not be
 *  less strict than code.
 *
 *  @param m The machine to read.
 *
 *  @returns The effective override permission.
 *
 */
declare function allows_override<mDT>(m: Machine<mDT>): JssmAllowsOverride;
/*********
 *
 *  Return the effective island policy for this machine.  `true` means
 *  disconnected components are allowed (the default), `false` requires a
 *  single connected component, and `'with_start'` allows islands only when
 *  every component contains at least one start state.
 *
 *  @param m The machine to read.
 *
 *  @returns The island policy stored in the machine.
 *
 */
declare function allow_islands<mDT>(m: Machine<mDT>): JssmAllowIslands;
/**
 * List the ASCII character ranges accepted by the FSL grammar in any but
 *  the first position of a state name (atom): digits, letters, and
 *  underscore.  Each entry is an inclusive `{from, to}` range of single
 *  Unicode characters.  Non-ASCII characters are classified by
 *  {@link is_state_name_char}, the complete rule (#754).
 *  @param m The machine to read; the table is the grammar's, the same for every machine.
 *  @returns An array of `{from, to}` inclusive character ranges.
 *  @example
 *  import { sm, all_state_name_chars } from 'jssm';
 *  const m = sm`a -> b;`;
 *  all_state_name_chars(m).some(r => '_' >= r.from && '_' <= r.to);  // => true
 *  all_state_name_chars(m).some(r => '+' >= r.from && '+' <= r.to);  // => false
 */
declare function all_state_name_chars<mDT>(m: Machine<mDT>): ReadonlyArray<{
    from: string;
    to: string;
}>;
/**
 * List the ASCII character ranges accepted by the FSL grammar in the first
 *  position of a state name (atom): letters and underscore (never a
 *  digit).  Non-ASCII characters are classified by
 *  {@link is_state_name_first_char}, the complete rule (#754).
 *  @param m The machine to read; the table is the grammar's, the same for every machine.
 *  @returns An array of `{from, to}` inclusive character ranges.
 *  @example
 *  import { sm, all_state_name_first_chars } from 'jssm';
 *  const m = sm`a -> b;`;
 *  all_state_name_first_chars(m).some(r => '_' >= r.from && '_' <= r.to);  // => true
 *  all_state_name_first_chars(m).some(r => '+' >= r.from && '+' <= r.to);  // => false
 */
declare function all_state_name_first_chars<mDT>(m: Machine<mDT>): ReadonlyArray<{
    from: string;
    to: string;
}>;
/**
 * List the character ranges accepted inside a single-quoted FSL action
 *  label without escaping.  Space is allowed; the apostrophe `'` is
 *  explicitly excluded since it terminates the label.
 *  @param m The machine to read; the table is the grammar's, the same for every machine.
 *  @returns An array of `{from, to}` inclusive character ranges.
 *  @example
 *  import { sm, all_action_label_chars } from 'jssm';
 *  const m = sm`a -> b;`;
 *  all_action_label_chars(m).some(r => ' ' >= r.from && ' ' <= r.to);   // => true
 *  all_action_label_chars(m).some(r => "'" >= r.from && "'" <= r.to);   // => false
 */
declare function all_action_label_chars<mDT>(m: Machine<mDT>): ReadonlyArray<{
    from: string;
    to: string;
}>;
/**
 * Look up a transition's edge index by source and target state names.
 *  @param m    The machine to read.
 *  @param from Source state name.
 *  @param to   Target state name.
 *  @returns The edge index in the edges array, or `undefined` if no
 *  such transition exists.
 */
declare function get_transition_by_state_names<mDT>(m: Machine<mDT>, from: StateType$3, to: StateType$3): number;
/**
 * Look up the full transition object for a given source→target pair.
 *  @param m    The machine to read.
 *  @param from Source state name.
 *  @param to   Target state name.
 *  @returns The {@link JssmTransition} object, or `undefined` if none exists.
 */
declare function lookup_transition_for<mDT>(m: Machine<mDT>, from: StateType$3, to: StateType$3): JssmTransition<StateType$3, mDT>;
/********
 *
 *  List all transitions attached to the current state, sorted by entrance and
 *  exit.  The order of each sublist is not defined.  A node could appear in
 *  both lists.
 *
 *  @example
 *  import { sm, state, list_transitions } from 'jssm';
 *
 *  const light = sm`red 'next' -> green 'next' -> yellow 'next' -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
 *
 *  state(light);               // => 'red'
 *  list_transitions(light);    // => { entrances: [ 'yellow', 'off' ], exits: [ 'green', 'off' ] }
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m          The machine to read.
 *  @param whichState The state whose transitions to have listed; defaults to the current state.
 *
 *  @returns The entrances and exits of the state.
 *
 */
declare function list_transitions<mDT>(m: Machine<mDT>, whichState?: StateType$3): JssmTransitionList;
/********
 *
 *  List all entrances attached to the current state.  Please note that the
 *  order of the list is not defined.  This list includes both unforced and
 *  forced entrances; if this isn't desired, consider
 *  `list_unforced_entrances` or `list_forced_entrances` as
 *  appropriate.
 *
 *  @example
 *  import { sm, state, list_entrances } from 'jssm';
 *
 *  const light = sm`red 'next' -> green 'next' -> yellow 'next' -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
 *
 *  state(light);               // => 'red'
 *  list_entrances(light);      // => [ 'yellow', 'off' ]
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m          The machine to read.
 *  @param whichState The state whose entrances to have listed; defaults to the current state.
 *
 *  @returns The names of the states with an edge into `whichState`.
 *
 */
declare function list_entrances<mDT>(m: Machine<mDT>, whichState?: StateType$3): Array<StateType$3>;
/********
 *
 *  List all exits attached to the current state.  Please note that the order
 *  of the list is not defined.  This list includes both unforced and forced
 *  exits; if this isn't desired, consider `list_unforced_exits` or
 *  `list_forced_exits` as appropriate.
 *
 *  @example
 *  import { sm, state, list_exits } from 'jssm';
 *
 *  const light = sm`red 'next' -> green 'next' -> yellow 'next' -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
 *
 *  state(light);               // => 'red'
 *  list_exits(light);          // => [ 'green', 'off' ]
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m          The machine to read.
 *  @param whichState The state whose exits to have listed; defaults to the current state.
 *
 *  @returns The names of the states with an edge out of `whichState`.
 *
 */
declare function list_exits<mDT>(m: Machine<mDT>, whichState?: StateType$3): Array<StateType$3>;
/********
 *
 *  List all actions available from this state.  Please note that the order of
 *  the actions is not guaranteed.
 *
 *  @example
 *  import { sm, act, state, actions } from 'jssm';
 *
 *  const machine = sm`
 *    red 'next' -> green 'next' -> yellow 'next' -> red;
 *    [red yellow green] 'shutdown' ~> off 'start' -> red;
 *  `;
 *
 *  state(machine);             // => 'red'
 *  actions(machine).sort();    // => ['next', 'shutdown']
 *
 *  act(machine, 'next');       // => true
 *  state(machine);             // => 'green'
 *  actions(machine).sort();    // => ['next', 'shutdown']
 *
 *  act(machine, 'shutdown');   // => true
 *  state(machine);             // => 'off'
 *  actions(machine);           // => ['start']
 *
 *  act(machine, 'start');      // => true
 *  state(machine);             // => 'red'
 *  actions(machine).sort();    // => ['next', 'shutdown']
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m          The machine to read.
 *  @param whichState The state whose actions to list.  Defaults to the
 *  current state.
 *
 *  @returns An array of action names available from the given state.
 *
 *  @throws {JssmError} If the state does not exist.
 *
 */
declare function actions<mDT>(m: Machine<mDT>, whichState?: StateType$3): Array<StateType$3>;
/********
 *
 *  List all states that have a specific action attached.  Please note that
 *  the order of the states is not guaranteed.
 *
 *  @example
 *  import { sm, list_states_having_action } from 'jssm';
 *
 *  const machine = sm`
 *    red 'next' -> green 'next' -> yellow 'next' -> red;
 *    [red yellow green] 'shutdown' ~> off 'start' -> red;
 *  `;
 *
 *  list_states_having_action(machine, 'next').sort();    // => ['green', 'red', 'yellow']
 *  list_states_having_action(machine, 'start');          // => ['off']
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m          The machine to read.
 *  @param whichState The action to be checked for associated states
 *
 *  @returns The names of the states the action exits from.
 *
 *  @throws {JssmError} If no state has the action.
 *
 */
declare function list_states_having_action<mDT>(m: Machine<mDT>, whichState: StateType$3): Array<StateType$3>;
/**
 * List all action names available as exits from a given state.
 *
 *  Returns the empty array (does not throw) when `whichState` exists but has
 *  no action-named exits — including terminal states, states whose only
 *  exits are plain `->` transitions, and states in machines that use no
 *  actions at all.  Only nonexistent states cause a throw.
 *  @param m          The machine to read.
 *  @param whichState The state to inspect.  Defaults to the current state.
 *  @returns An array of action name strings, possibly empty.
 *  @throws {JssmError} If the state does not exist.
 *  @example
 *    import { sm, list_exit_actions } from 'jssm';
 *    const m = sm`a 'go' -> b; b -> c;`;
 *    list_exit_actions(m, 'a');  // => ['go']
 *    list_exit_actions(m, 'b');  // => []
 *    list_exit_actions(m, 'c');  // => []
 *    expect(() => list_exit_actions(m, 'z')).toThrow();
 */
declare function list_exit_actions<mDT>(m: Machine<mDT>, whichState?: StateType$3): Array<StateType$3>;
/**
 * List all action exits from a state with their probabilities and shares.
 *  @param m          The machine to read.
 *  @param whichState The state to inspect.  Defaults to the current state.
 *  @returns An array of `{ action, probability, share }` objects — `share`
 *           is the edge's within-list share (6.0 list weights), present
 *           only for an edge that landed on a list side with no declared
 *           `probability`; `undefined` otherwise, same as the edge itself.
 *  @throws {JssmError} If the state does not exist.
 */
declare function probable_action_exits<mDT>(m: Machine<mDT>, whichState?: StateType$3): Array<any>;
/**
 * Check whether a state has no incoming transitions (unreachable after start).
 *  @param m          The machine to read.
 *  @param whichState The state to check.
 *  @returns `true` if the state has zero entrances.
 *  @throws {JssmError} If the state does not exist.
 */
declare function is_unenterable<mDT>(m: Machine<mDT>, whichState: StateType$3): boolean;
/**
 * Check whether any state in the machine is unenterable.
 *  @param m The machine to read.
 *  @returns `true` if at least one state has no incoming transitions.
 */
declare function has_unenterables<mDT>(m: Machine<mDT>): boolean;
/**
 * Check whether the current state is terminal (has no exits).
 *  @param m The machine to read.
 *  @returns `true` if the current state has zero exits.
 */
declare function is_terminal<mDT>(m: Machine<mDT>): boolean;
/**
 * Check whether a specific state is terminal (has no exits).
 *  @param m          The machine to read.
 *  @param whichState The state to check.
 *  @returns `true` if the state has zero exits.
 *  @throws {JssmError} If the state does not exist.
 */
declare function state_is_terminal<mDT>(m: Machine<mDT>, whichState: StateType$3): boolean;
/**
 * Check whether any state in the machine is terminal.
 *  @param m The machine to read.
 *  @returns `true` if at least one state has no exits.
 */
declare function has_terminals<mDT>(m: Machine<mDT>): boolean;
/**
 * Check whether the current state is complete (every exit has an action).
 *  @param m The machine to read.
 *  @returns `true` if the current state is complete.
 */
declare function is_complete<mDT>(m: Machine<mDT>): boolean;
/**
 * Check whether a specific state is complete (every exit has an action).
 *  @param m          The machine to read.
 *  @param whichState The state to check.
 *  @returns `true` if the state is complete.
 *  @throws {JssmError} If the state does not exist.
 */
declare function state_is_complete<mDT>(m: Machine<mDT>, whichState: StateType$3): boolean;
/**
 * Check whether any state in the machine is complete.
 *  @param m The machine to read.
 *  @returns `true` if at least one state is complete.
 */
declare function has_completes<mDT>(m: Machine<mDT>): boolean;
/**
 * Get all edges between two states (there can be multiple with
 *  different actions).
 *  @param m    The machine to read.
 *  @param from Source state name.
 *  @param to   Target state name.
 *  @returns An array of matching {@link JssmTransition} objects.
 */
declare function edges_between<mDT>(m: Machine<mDT>, from: string, to: string): JssmTransition<StateType$3, mDT>[];
/**
 * Get the edge index for an action from the current state.
 *  Interned dispatch: resolves via the numeric (action, from) index —
 *  unknown action names miss without throwing.
 *  @param m      The machine to read.
 *  @param action The action name.
 *  @returns The edge index, or `undefined` if the action is not available.
 */
declare function current_action_for<mDT>(m: Machine<mDT>, action: StateType$3): number;
/**
 * Get the full transition object for an action from the current state.
 *  @param m      The machine to read.
 *  @param action The action name.
 *  @returns The {@link JssmTransition} object.
 *  @throws {JssmError} If the action is not available from the current state.
 */
declare function current_action_edge_for<mDT>(m: Machine<mDT>, action: StateType$3): JssmTransition<StateType$3, mDT>;

/*******
 *
 *  The stochastic family: everything that draws on the machine's seeded
 *  PRNG — the weighted start-state distribution (`start_state_weights`,
 *  `sample_start_state`), the probabilistic exit pool (`probable_exits_for`),
 *  the destructive random steps (`probabilistic_transition`,
 *  `probabilistic_walk`, `probabilistic_histo_walk`), the non-destructive
 *  Monte-Carlo engine (`stochastic_runs`, `stochastic_summary`), and the seed
 *  accessors (`rng_seed`, `set_rng_seed`).  Every function takes the machine
 *  as its first argument and reads its fields directly; the `Machine` class
 *  methods, getter, and setter of the same names are one-line delegates onto
 *  these.
 *
 *  Every export here is public and re-exported by the `jssm` barrel,
 *  including the two `STOCHASTIC_DEFAULT_*` constants.  The former private
 *  methods `_assert_selectable_exit_pool` and `_stochastic_one_walk` are
 *  module-private functions here.
 *
 */

type StateType$2 = string;
/** Default number of independent Monte-Carlo runs when none is declared. */
declare const STOCHASTIC_DEFAULT_RUNS = 1000;
/** Default per-run step cap (montecarlo) / walk length (steady_state). */
declare const STOCHASTIC_DEFAULT_MAX_STEPS = 1000;
/**
 *  The initial distribution declared by a weighted `start_states` list
 *  (6.0), normalized to sum 1.  Empty when the machine's start states are
 *  unweighted.
 *  @param m The machine to read.
 *  @returns A map from start state to its share of the distribution.
 *  @example
 *  import { sm, start_state_weights } from 'jssm';
 *  const m = sm`start_states: [idle 90% booting 10%]; idle -> booting;`;
 *  start_state_weights(m).get('idle');  // => 0.9
 *  @see sample_start_state
 */
declare function start_state_weights<mDT>(m: Machine<mDT>): Map<StateType$2, number>;
/**
 *  Draws a start state from {@link start_state_weights} using the
 *  machine's RNG; on an unweighted machine returns the first declared
 *  start state.  Does not change the machine's state.
 *  @param m The machine whose RNG and start distribution are used.
 *  @returns The sampled start state.
 *  @example
 *  import { sm, sample_start_state } from 'jssm';
 *  const m = sm`start_states: [idle 90% booting 10%]; idle -> booting;`;
 *  ['idle', 'booting'].includes(sample_start_state(m));  // => true
 *  @see start_state_weights
 */
declare function sample_start_state<mDT>(m: Machine<mDT>): StateType$2;
/**
 * Get the transitions available from a state for use by the probabilistic
 *  walk system.
 *
 *  If any exit declares a `probability`, only those probability-bearing
 *  exits are returned, so that non-probability peers cannot dilute the
 *  declared distribution.  If no exit declares a `probability`, every
 *  legal (non-forced) exit is returned, which `weighted_rand_select`
 *  treats as equal weight.  Forced-only exits (`~>`) are always excluded,
 *  since they cannot be taken by an ordinary `transition()` call.
 *
 *  Fixes StoneCypher/fsl#1325, in which the function previously returned
 *  every exit unconditionally — including forced-only exits and exits
 *  with no `probability`, which distorted the weighted distribution.
 *
 *  Share-only edges (an unweighted transition onto a weighted list; 6.0
 *  list weights) carry no declared `probability` and so never evict their
 *  siblings from the pool; their `share` is applied later, by the picker.
 *  @param m The machine to inspect.
 *  @param whichState - The state to inspect.
 *  @returns An array of {@link JssmTransition} edges exiting the state,
 *  filtered as described above.  May be empty.
 *  @throws {JssmError} If the state does not exist.
 */
declare function probable_exits_for<mDT>(m: Machine<mDT>, whichState: StateType$2): Array<JssmTransition<StateType$2, mDT>>;
/**
 * Take a single random transition from the current state, weighted by
 *  edge probabilities.
 *  @param m The machine to move.
 *  @returns `true` if a transition was taken, `false` otherwise.
 *  @throws {JssmError} If the candidate exit pool is non-empty but its
 *  total weight is zero — every candidate declares `0%` — per
 *  StoneCypher/fsl#1248.
 */
declare function probabilistic_transition<mDT>(m: Machine<mDT>): boolean;
/**
 * Take `n` consecutive probabilistic transitions and return the sequence
 *  of states visited (before each transition).
 *  @param m The machine to move.
 *  @param n - Number of steps to walk.
 *  @returns An array of state names visited during the walk.
 *  @throws {JssmError} If a visited state's candidate exit pool is
 *  non-empty but all-zero-weight (StoneCypher/fsl#1248).
 */
declare function probabilistic_walk<mDT>(m: Machine<mDT>, n: number): Array<StateType$2>;
/**
 * Take `n` probabilistic steps and return a histograph of how many times
 *  each state was visited.
 *  @param m The machine to move.
 *  @param n - Number of steps to walk.
 *  @returns A `Map` from state name to visit count.
 *  @throws {JssmError} If a visited state's candidate exit pool is
 *  non-empty but all-zero-weight (StoneCypher/fsl#1248).
 */
declare function probabilistic_histo_walk<mDT>(m: Machine<mDT>, n: number): Map<StateType$2, number>;
/**
 * Lazily yield one {@link JssmStochasticRun} at a time.
 *
 *  In `montecarlo` mode (default) yields `runs` independent walks from the
 *  current state, each ending at a terminal or after `max_steps`.  In
 *  `steady_state` mode yields exactly one walk of `max_steps` steps.  This
 *  is the lazy engine behind {@link stochastic_summary}; the
 *  fsl-stochastic panel drives it across animation frames.  A walk already
 *  at a terminal is reported as terminated with length zero, including when
 *  `max_steps` is zero.
 *
 *  Passing `seed` reseeds the machine for reproducible runs.  Unlike
 *  {@link stochastic_summary}, the generator does NOT restore the
 *  prior seed afterward — a direct caller's machine is left reseeded.
 *  When the machine declares weighted `start_states` (6.0), each run's
 *  start is drawn independently via {@link sample_start_state}
 *  instead of always starting from the machine's current state.
 *  @param m The machine whose graph and RNG are read.
 *  @param opts - {@link JssmStochasticOptions}.
 *  @yields One {@link JssmStochasticRun} per completed walk.
 *  @returns A generator of per-run results.
 *  @example
 *  import { sm, stochastic_runs } from 'jssm';
 *  const m = sm`a 'go' -> b 'go' -> c;`;
 *  [...stochastic_runs(m, { runs: 2, seed: 1 })].length;  // => 2
 */
declare function stochastic_runs<mDT>(m: Machine<mDT>, opts?: JssmStochasticOptions): Generator<JssmStochasticRun>;
/**
 * Run many weighted-random walks and return aggregate statistics.
 *
 *  Honors `%` transition probabilities (via the existing probabilistic
 *  machinery).  Non-destructive: the machine's current state and
 *  {@link rng_seed} are restored before returning, so calling this
 *  never perturbs the live machine.  `montecarlo` mode (default) reports
 *  per-run `path_lengths`, `terminal_reached`, and `capped`; `steady_state`
 *  mode runs one long walk and omits those fields.
 *
 *  Monte-Carlo runs count as `terminal_reached` when they start at a
 *  terminal or reach one on the final permitted transition.  Terminal
 *  starts contribute zero to `path_lengths`, even when `max_steps` is zero.
 *
 *  Timing (`after`) decorations and data-guard conditions are not modeled
 *  by this sampler; it walks the probabilistic graph topology.  When the
 *  machine declares weighted `start_states` (6.0), each run starts from an
 *  independently sampled start state (see {@link stochastic_runs}).
 *  @param m The machine whose graph and RNG are read.
 *  @param opts - {@link JssmStochasticOptions}.  `runs` defaults to the
 *  machine's declared `editor: { stochastic_run_count }` (fsl#1334) when
 *  present, otherwise {@link STOCHASTIC_DEFAULT_RUNS}.
 *  @returns A {@link JssmStochasticSummary}.
 *  @see stochastic_runs
 *  @see probabilistic_walk
 *  @see editor_config
 *  @example
 *  import { sm, stochastic_summary } from 'jssm';
 *  const m = sm`a 'go' -> b 'go' -> c;`;
 *  const s = stochastic_summary(m, { runs: 100, seed: 1 });
 *  s.terminal_reached;  // => 100
 */
declare function stochastic_summary<mDT>(m: Machine<mDT>, opts?: JssmStochasticOptions): JssmStochasticSummary;
/**
 * Get the current RNG seed used for probabilistic transitions.
 *  @param m The machine to read.
 *  @returns The numeric seed value.
 */
declare function rng_seed<mDT>(m: Machine<mDT>): number;
/**
 * Set the RNG seed.  Pass `undefined` to reseed from the current time.
 *  Resets the internal PRNG so subsequent probabilistic operations use the
 *  new seed.
 *  @param m The machine to reseed.
 *  @param to - The seed value, or `undefined` for time-based seeding.
 */
declare function set_rng_seed<mDT>(m: Machine<mDT>, to: number | undefined): void;

/*******
 *
 *  The groups family: the overlapping-state-group membership queries —
 *  `isIn`, `groupsOf`, `groups`, `statesIn` — over the tables the compiler
 *  carries into the machine (`_group_registry`, `_group_order`,
 *  `_state_to_groups`).  Every function takes the machine as its first
 *  argument and reads its fields directly; the `Machine` class methods of the
 *  same names are one-line delegates onto these.
 *
 *  `groups_by_depth` (formerly the class's `#groups_by_depth`) is exported
 *  for the style family's config cascade and is not part of the barrel.
 *
 */

type StateType$1 = string;
/********
 *
 *  Reports whether the machine's CURRENT state is a transitive member of a
 *  named group.  Membership is deep: a state counts as in `groupName` if it
 *  belongs to that group directly, or via any nested (`&child`) or spread
 *  (`...&child`) sub-group, at any depth.  An undeclared group simply has no
 *  members, so this returns `false` rather than throwing.
 *
 *  @example
 *  import { sm, act, isIn } from 'jssm';
 *
 *  const m = sm`&busy : [working]; idle 'go' -> working;`;
 *  // the current state is 'idle':
 *  isIn(m, 'busy');     // => false
 *  act(m, 'go');
 *  // the current state is now 'working':
 *  isIn(m, 'busy');     // => true
 *  // an undeclared group has no members:
 *  isIn(m, 'nonesuch'); // => false
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine whose current state is tested.
 *
 *  @param groupName The group to test the current state against.
 *
 *  @returns `true` if the current state is a transitive member of `groupName`.
 *
 *  @see groupsOf
 *  @see statesIn
 *
 */
declare function isIn<mDT>(m: Machine<mDT>, groupName: string): boolean;
/********
 *
 *  Lists every group that transitively contains a given state.  Membership is
 *  deep — direct, nested, and spread sub-group containment all count — and the
 *  result is the precomputed inverse-index entry for the state, so the lookup
 *  is constant-time.  A state that belongs to no group (or a state name that
 *  appears in no group) yields an empty `Set`.
 *
 *  @example
 *  import { sm, groupsOf } from 'jssm';
 *
 *  const m = sm`&inner : [a]; &outer : [&inner b]; a -> b;`;
 *  // deep: a is in &outer through &inner
 *  groupsOf(m, 'a');     // => new Set(['inner', 'outer'])
 *  groupsOf(m, 'b');     // => new Set(['outer'])
 *  // z is in no group
 *  groupsOf(m, 'z');     // => new Set()
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine whose group index is read.
 *
 *  @param state The state whose containing groups are wanted.
 *
 *  @returns A `Set` of every group name transitively containing `state`;
 *  empty when `state` belongs to no group.
 *
 *  @see isIn
 *  @see groups
 *
 */
declare function groupsOf<mDT>(m: Machine<mDT>, state: StateType$1): Set<string>;
/********
 *
 *  Lists all declared group names, in source declaration order.  The order
 *  matches the order the `&group : [ … ];` declarations appear in the FSL, and
 *  is the same order used to break depth-specificity ties in the config
 *  cascade.  Machines that declare no groups return an empty array.
 *
 *  @example
 *  import { sm, groups } from 'jssm';
 *
 *  const m = sm`&first : [a]; &second : [b]; a -> b;`;
 *  groups(m);  // => [ 'first', 'second' ]
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine whose declared groups are listed.
 *
 *  @returns The declared group names, in declaration order.
 *
 *  @see groupsOf
 *  @see statesIn
 *
 */
declare function groups<mDT>(m: Machine<mDT>): string[];
/********
 *
 *  Lists every state that is a transitive member of a named group — the
 *  flattened membership of the group, descending through nested and spread
 *  sub-groups, in member-declaration order.
 *
 *  @example
 *  import { sm, statesIn } from 'jssm';
 *
 *  const m = sm`&inner : [a b]; &outer : [&inner c]; a -> b -> c;`;
 *  statesIn(m, 'outer');  // => [ 'a', 'b', 'c' ]
 *  statesIn(m, 'inner');  // => [ 'a', 'b' ]
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine whose group registry is read.
 *
 *  @param groupName The group whose transitive member states are wanted.
 *
 *  @returns The transitive member states of `groupName`, in declaration order.
 *
 *  @throws {JssmError} If `groupName` is not a declared group.
 *
 *  @see groups
 *  @see groupsOf
 *
 */
declare function statesIn<mDT>(m: Machine<mDT>, groupName: string): Array<StateType$1>;

/*******
 *
 *  The style family: everything the viz layer reads to draw a machine — the
 *  graph-level settings (`graph_layout`, `dot_preamble`, `flow`,
 *  `default_transition_config`, `default_graph_config`), the theme stack
 *  (`all_themes`, `themes`, `set_themes`), the six per-kind style blocks
 *  (`standard_state_style`, `hooked_state_style`, `start_state_style`,
 *  `end_state_style`, `terminal_state_style`, `active_state_style`), and the
 *  unified config cascade (`resolve_state_config`, `style_for`).  Every
 *  function takes the machine as its first argument and reads its fields
 *  directly; the `Machine` class methods, getters, and the `themes` setter
 *  of the same names are one-line delegates onto these.
 *
 *  The construction-time helpers `transfer_state_properties` and
 *  `state_style_condense` live here too (the constructor imports them) and
 *  are public through the barrel, as they were before the split.  The former
 *  `#resolved_themes`, `#individual_state_config`, `#compose_state_config`
 *  methods and the `apply_state_style_key` / `merge_state_config` helpers
 *  are module-private.
 *
 */

type StateType = string;
/*********
 *
 *  An internal method meant to take a series of declarations and fold them into
 *  a single multi-faceted declaration, in the process of building a state.  Not
 *  generally meant for external use.
 *
 *  @internal
 *
 */
declare function transfer_state_properties(state_decl: JssmStateDeclaration): JssmStateDeclaration;
/**
 *
 *  Collapse a list of individual state-style key/value pairs into a single
 *  {@link JssmStateConfig} object, remapping FSL-style kebab-case keys to the
 *  camelCase field names the runtime uses.
 *
 *  The parser emits state styling as a flat array like
 *  `[{ key: 'color', value: 'red' }, { key: 'line-style', value: 'dashed' }]`
 *  because that is the most natural shape for the grammar to produce.  This
 *  helper runs once per style bucket during `Machine` construction to turn
 *  those arrays into the compact `{ color, lineStyle, ... }` objects the
 *  graph-rendering code expects.
 *
 *  @example
 *  import { state_style_condense } from 'jssm';
 *
 *  const condensed = state_style_condense([
 *    { key: 'color',      value: 'red' },
 *    { key: 'shape',      value: 'oval' },
 *    { key: 'line-style', value: 'dashed' }
 *  ]);
 *  condensed;                         // => { color: 'red', shape: 'oval', lineStyle: 'dashed' }
 *
 *  state_style_condense(undefined);   // => {}
 *
 *  @param jssk The list of style keys to condense.  `undefined` is accepted
 *  and yields an empty config.
 *  @param machine Optional `Machine` reference, used only so that any
 *  {@link JssmError} thrown can point at the offending machine in its
 *  diagnostic message.
 *  @returns A `JssmStateConfig` object containing every key from `jssk`
 *  remapped into its camelCase field.
 *  @throws {JssmError} If `jssk` is neither an array nor `undefined`, if any
 *  element is not an object, if the same key appears more than once, or if a
 *  key is not one of the recognized style names.
 *  @internal
 */
declare function state_style_condense(jssk: JssmStateStyleKeyList, machine?: any): JssmStateConfig;
/**
 * Get the graph layout direction (e.g. `'LR'`, `'TB'`).  Set via the
 *  FSL `graph_layout` directive.
 *  @param m The machine to read.
 *  @returns The layout string, or the default if not set.
 */
declare function graph_layout<mDT>(m: Machine<mDT>): string;
/**
 * Get the Graphviz DOT preamble string, injected before the graph body
 *  during visualization.  Set via the FSL `dot_preamble` directive.
 *  @param m The machine to read.
 *  @returns The preamble string.
 */
declare function dot_preamble<mDT>(m: Machine<mDT>): string;
/**
 * Get the consolidated `transition: {}` default-config block: the ordered,
 *  de-duplicated `{ key, value }[]` list of edge-default style items compiled
 *  from a `transition: {}` block (e.g. `transition: { color: blue; }`).  The
 *  viz layer projects this onto a Graphviz `edge [ … ]` default statement so
 *  every edge inherits it.
 *
 *  @example
 *  import { sm, default_transition_config } from 'jssm';
 *  default_transition_config(sm`a -> b; transition: { color: blue; };`);   // => [ { key: 'color', value: '#0000ffff' } ]
 *
 *  @param m The machine to read.
 *  @returns The transition-config item list, or `undefined` if the machine
 *  declared no `transition: {}` block.
 *  @see default_graph_config
 */
declare function default_transition_config<mDT>(m: Machine<mDT>): JssmTransitionConfig | undefined;
/**
 * Get the consolidated `graph: {}` default-config block: the ordered,
 *  de-duplicated `{ key, value }[]` list of graph-scope style items.  The
 *  compiler folds the deprecated top-level graph keywords
 *  (`graph_bg_color` → `background-color`, plus `graph_layout`, `theme`,
 *  `flow`, `dot_preamble`) into this list first, then lets an explicit
 *  `graph: {}` block win on key conflict.  The viz layer projects the
 *  graph-meaningful keys onto graph-scope Graphviz attributes (e.g.
 *  `background-color` → `bgcolor`).
 *
 *  @example
 *  import { sm, default_graph_config } from 'jssm';
 *  default_graph_config(sm`a -> b; graph: { background-color: #ffffff; };`);   // => [ { key: 'background-color', value: '#ffffffff' } ]
 *
 *  @param m The machine to read.
 *  @returns The graph-config item list, or `undefined` if the machine has no
 *  graph config (no `graph: {}` block and no deprecated graph keyword).
 *  @see default_transition_config
 */
declare function default_graph_config<mDT>(m: Machine<mDT>): JssmGraphConfig | undefined;
/**
 * List all available theme names.
 *  @param m The machine asked; the table is the library's, the same for every machine.
 *  @returns An array of theme name strings.
 */
declare function all_themes<mDT>(m: Machine<mDT>): FslTheme[];
/**
 * Get the active theme(s) for this machine.  Always stored as an array
 *  internally; the union return type exists for setter compatibility.
 *  @param m The machine to read.
 *  @returns The current theme or array of themes.
 */
declare function themes<mDT>(m: Machine<mDT>): FslTheme | FslTheme[];
/**
 * Set the active theme(s).  Accepts a single theme name or an array.
 *  Also drops every memoized static state config, so styles resolved
 *  before the change re-resolve under the new theme stack.
 *
 *  @example
 *  import { sm, style_for, set_themes, themes } from 'jssm';
 *
 *  const m = sm`a -> b -> c;`;
 *  // b is a plain state; resolved (and memoized) under the default theme:
 *  style_for(m, 'b').backgroundColor;   // => 'white'
 *  set_themes(m, 'ocean');
 *  themes(m);                           // => ['ocean']
 *  // ocean's plain-state color, not the stale default:
 *  style_for(m, 'b').backgroundColor;   // => 'cadetblue1'
 *
 *  @param m The machine to re-theme.
 *  @param to - A theme name or array of theme names to apply.
 *  @see resolve_state_config
 */
declare function set_themes<mDT>(m: Machine<mDT>, to: FslTheme | FslTheme[]): void;
/**
 * Get the flow direction for graph layout (e.g. `'right'`, `'down'`).
 *  Set via the FSL `flow` directive.
 *  @param m The machine to read.
 *  @returns The current flow direction.
 */
declare function flow<mDT>(m: Machine<mDT>): FslDirection;
/********
 *
 *  Get the standard style for a single state.  ***Does not*** include
 *  composition from an applied theme, or things from the underlying base
 *  stylesheet; only the modifications applied by this machine.
 *
 *  @example
 *  import { sm, standard_state_style } from 'jssm';
 *
 *  const plain = sm`a -> b;`;
 *  standard_state_style(plain);    // => {}
 *
 *  const styled = sm`a -> b; state: { shape: circle; };`;
 *  standard_state_style(styled);   // => { shape: 'circle' }
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to read.
 *
 *  @returns The {@link JssmStateConfig} for standard states.
 *
 */
declare function standard_state_style<mDT>(m: Machine<mDT>): JssmStateConfig;
/********
 *
 *  Get the hooked state style.  ***Does not*** include
 *  composition from an applied theme, or things from the underlying base
 *  stylesheet; only the modifications applied by this machine.
 *
 *  The hooked style is only applied to nodes which have a named hook in the
 *  graph.  Open hooks set through the external API aren't graphed, because
 *  that would be literally every node.
 *
 *  @example
 *  import { sm, hooked_state_style } from 'jssm';
 *
 *  const plain = sm`a -> b;`;
 *  hooked_state_style(plain);    // => {}
 *
 *  const styled = sm`a -> b; hooked_state: { shape: circle; };`;
 *  hooked_state_style(styled);   // => { shape: 'circle' }
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to read.
 *
 *  @returns The {@link JssmStateConfig} for hooked states.
 *
 */
declare function hooked_state_style<mDT>(m: Machine<mDT>): JssmStateConfig;
/********
 *
 *  Get the start state style.  ***Does not*** include composition from an
 *  applied theme, or things from the underlying base stylesheet; only the
 *  modifications applied by this machine.
 *
 *  Start states are defined by the directive `start_states`, or in absentia,
 *  are the first mentioned state.
 *
 *  @example
 *  import { sm, start_state_style } from 'jssm';
 *
 *  const plain = sm`a -> b;`;
 *  start_state_style(plain);    // => {}
 *
 *  const styled = sm`a -> b; start_state: { shape: circle; };`;
 *  start_state_style(styled);   // => { shape: 'circle' }
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to read.
 *
 *  @returns The {@link JssmStateConfig} for start states.
 *
 */
declare function start_state_style<mDT>(m: Machine<mDT>): JssmStateConfig;
/********
 *
 *  Get the end state style.  ***Does not*** include
 *  composition from an applied theme, or things from the underlying base
 *  stylesheet; only the modifications applied by this machine.
 *
 *  End states are defined in the directive `end_states`, and are distinct
 *  from terminal states.  End states are voluntary successful endpoints for a
 *  process.  Terminal states are states that cannot be exited.  By example,
 *  most error states are terminal states, but not end states.  Also, since
 *  some end states can be exited and are determined by hooks, such as
 *  recursive or iterative nodes, there is such a thing as an end state that
 *  is not a terminal state.
 *
 *  @example
 *  import { sm, end_state_style } from 'jssm';
 *
 *  const plain = sm`a -> b;`;
 *  end_state_style(plain);    // => {}
 *
 *  const styled = sm`a -> b; end_state: { shape: circle; };`;
 *  end_state_style(styled);   // => { shape: 'circle' }
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to read.
 *
 *  @returns The {@link JssmStateConfig} for end states.
 *
 */
declare function end_state_style<mDT>(m: Machine<mDT>): JssmStateConfig;
/********
 *
 *  Get the terminal state style.  ***Does not*** include
 *  composition from an applied theme, or things from the underlying base
 *  stylesheet; only the modifications applied by this machine.
 *
 *  Terminal state styles are automatically determined by the machine.  Any
 *  state without a valid exit transition is terminal.
 *
 *  @example
 *  import { sm, terminal_state_style } from 'jssm';
 *
 *  const plain = sm`a -> b;`;
 *  terminal_state_style(plain);    // => {}
 *
 *  const styled = sm`a -> b; terminal_state: { shape: circle; };`;
 *  terminal_state_style(styled);   // => { shape: 'circle' }
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to read.
 *
 *  @returns The {@link JssmStateConfig} for terminal states.
 *
 */
declare function terminal_state_style<mDT>(m: Machine<mDT>): JssmStateConfig;
/********
 *
 *  Get the style for the active state.  ***Does not*** include
 *  composition from an applied theme, or things from the underlying base
 *  stylesheet; only the modifications applied by this machine.
 *
 *  @example
 *  import { sm, active_state_style } from 'jssm';
 *
 *  const plain = sm`a -> b;`;
 *  active_state_style(plain);    // => {}
 *
 *  const styled = sm`a -> b; active_state: { shape: circle; };`;
 *  active_state_style(styled);   // => { shape: 'circle' }
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to read.
 *
 *  @returns The {@link JssmStateConfig} for the active state.
 *
 */
declare function active_state_style<mDT>(m: Machine<mDT>): JssmStateConfig;
/********
 *
 *  Resolves the full unified style/config cascade for a state — the runtime
 *  successor to the ad-hoc layer merge {@link style_for} used to perform.
 *
 *  For any state OTHER than the current one, this returns the memoized static
 *  resolution (tiers 1–5; see `compose_state_config`) — theme →
 *  `default_state_config` → per-kind defaults → depth-ordered group metadata →
 *  per-state config.  The cache is keyed by state; those tiers do not depend
 *  on which state is current, so it survives transitions, but the mutable
 *  cascade inputs each clear it when they change — hook registration and
 *  removal ({@link set_hook}, {@link remove_hook}; the hooked layer) and
 *  theme assignment ({@link set_themes}; tier 1 and the per-kind theme
 *  layers).
 *
 *  For the machine's CURRENTLY-occupied state the result is recomputed each
 *  call (never cached) and additionally carries the dynamic `active_state`
 *  layers: the active-state THEME layers fold in just below the per-state
 *  config (tier 3-active), and the user `active_state : { … }` overlay folds
 *  in LAST (tier 6), on top of everything, so it wins over per-state config.
 *  Every fold uses `merge_state_config`, so a key set at a lower tier is
 *  overridden — never rejected — by a higher one.
 *
 *  @example
 *  import { sm, resolve_state_config } from 'jssm';
 *
 *  const m = sm`&busy : [working]; idle 'go' -> working; state &busy : { color: orange; };`;
 *  // from group &busy:
 *  resolve_state_config(m, 'working').color;  // => '#ffa500ff'
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine whose cascade is resolved.
 *
 *  @param state The state to compute the composite config for.
 *
 *  @returns The fully composited {@link JssmStateConfig} for the state,
 *  including the active overlay when the state is current.
 *
 *  @see style_for
 *
 */
declare function resolve_state_config<mDT>(m: Machine<mDT>, state: StateType): JssmStateConfig;
/********
 *
 *  Gets the composite style for a specific node — the public viz entry point,
 *  now a thin wrapper over the unified config cascade in
 *  {@link resolve_state_config}.
 *
 *  The order of composition runs least-specific to most-specific: theme
 *  defaults, then the `default_state_config` root, then per-kind defaults
 *  (terminal, start, end), then depth-ordered group metadata (inner groups
 *  winning over outer), then the per-state config, and finally — for the
 *  current state only — the active overlay.  Last wins at every tier.
 *
 *  @example
 *  import { sm, style_for, resolve_state_config } from 'jssm';
 *
 *  const m = sm`a -> b; state b : { shape: circle; };`;
 *  style_for(m, 'b').shape;   // => 'circle'
 *  style_for(m, 'b');         // => resolve_state_config(m, 'b')
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine whose cascade is resolved.
 *
 *  @param state The state to compute the composite style for.
 *
 *  @returns The fully composited {@link JssmStateConfig} for the given state.
 *
 *  @see resolve_state_config
 *
 */
declare function style_for<mDT>(m: Machine<mDT>, state: StateType): JssmStateConfig;

/*******
 *
 *  The create family: the construction-adjacent members — `serialize`, the
 *  identity accessors (`instance_name`, `creation_date`,
 *  `creation_timestamp`, `create_start_time`), and the two helpers the
 *  constructor itself calls: `new_state` (formerly the class's `_new_state`)
 *  and `find_connected_components` (the `allow_islands` check).  Every
 *  function takes the machine as its first argument, except
 *  `find_connected_components`, which is a pure graph function over the
 *  state map and edge list.  The `Machine` class methods and getters of the
 *  same names are one-line delegates onto these.
 *
 *  `serialize`, `instance_name`, `creation_date`, `creation_timestamp`, and
 *  `create_start_time` are public through the `jssm` barrel.  `new_state`
 *  and `find_connected_components` are exported for the constructor (the
 *  class keeps a `_new_state` delegate) and are not part of the barrel.
 *  The factories themselves — `create`, `sm`, `fsl`, `from`, `deserialize` —
 *  stay beside the class in `machine.ts` because they need the constructor
 *  as a value.
 *
 */

/********
 *
 *  Serialize the current machine, including all defining state but not the
 *  machine string, to a structure.  This means you will need the machine
 *  string to recreate (to not waste repeated space;) if you want the machine
 *  string embedded, call `serialize_with_string` instead.
 *
 *  @example
 *  import { from, serialize, deserialize, transition, state, data } from 'jssm';
 *
 *  const m = from('a -> b;', { data: 7 });
 *  transition(m, 'b');
 *
 *  const ser = serialize(m, 'checkpoint');
 *  ser.state;    // => 'b'
 *  ser.data;     // => 7
 *  ser.comment;  // => 'checkpoint'
 *
 *  const restored = deserialize('a -> b;', ser);
 *  state(restored);  // => 'b'
 *  data(restored);   // => 7
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to serialize.
 *
 *  @param comment An optional comment string to embed in the serialized
 *  output for identification or debugging.
 *
 *  @returns A {@link JssmSerialization} object containing the machine's
 *  current state, data, and timestamp.
 *
 */
declare function serialize<mDT>(m: Machine<mDT>, comment?: string): JssmSerialization<mDT>;
/**
 * Get the instance name of this machine, if one was assigned at creation.
 *  @param m The machine to read.
 *  @returns The instance name string, or `undefined`.
 *  @example
 *  import { from, instance_name } from 'jssm';
 *  instance_name(from('a -> b;'));                                   // => undefined
 *  instance_name(from('a -> b;', { instance_name: 'lamp' }));        // => 'lamp'
 */
declare function instance_name<mDT>(m: Machine<mDT>): string | undefined;
/**
 * Get the creation date of this machine as a `Date` object.
 *  @param m The machine to read.
 *  @returns A `Date` representing when the machine was created.
 *  @example
 *  import { sm, creation_date, creation_timestamp } from 'jssm';
 *  const m = sm`a -> b;`;
 *  creation_date(m) instanceof Date;                          // => true
 *  creation_date(m).getTime() === creation_timestamp(m);      // => true
 */
declare function creation_date<mDT>(m: Machine<mDT>): Date;
/**
 * Get the creation timestamp (milliseconds since epoch).
 *  @param m The machine to read.
 *  @returns The timestamp as a number.
 */
declare function creation_timestamp<mDT>(m: Machine<mDT>): number;
/**
 * Get the timestamp when construction began (before parsing).
 *  @param m The machine to read.
 *  @returns The start-of-construction timestamp as a number.
 *  @example
 *  import { sm, create_start_time, creation_timestamp } from 'jssm';
 *  const m = sm`a -> b;`;
 *  // construction starts before it finishes:
 *  create_start_time(m) <= creation_timestamp(m);   // => true
 */
declare function create_start_time<mDT>(m: Machine<mDT>): number;

/**
 * Editor-agnostic data types for the FSL language service.
 *
 * These are the neutral contract every editor adapter (CodeMirror, VS Code, a
 * future LSP server) converts to/from. Shapes are kept aligned with LSP types so
 * an LSP wrapper is a near-mechanical mapping.
 */
/** A character-offset range in the FSL source. */
interface Range {
    from: number;
    to: number;
}
/** Diagnostic severity, aligned with LSP severities. */
type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';
/** An editor-agnostic diagnostic (one parse/compile problem). */
interface Diagnostic {
    range: Range;
    severity: DiagnosticSeverity;
    message: string;
}
/** What a completion item suggests, so adapters can pick an icon. */
type CompletionKind = 'key' | 'value-color' | 'value-shape' | 'value-enum';
/** An editor-agnostic completion suggestion. */
interface CompletionItem {
    label: string;
    kind: CompletionKind;
    detail?: string;
}
/** Parser-derived semantic role of a source span. */
type SemanticSpanKind = 'color' | 'state' | 'enum';
/** An editor-agnostic semantic span (for decorations / semantic tokens). */
interface SemanticSpan extends Range {
    kind: SemanticSpanKind;
    value?: string;
}

/**
 * Editor-agnostic FSL diagnostics: parse then compile, reporting problems as
 * neutral {@link Diagnostic}s. Adapters map these to CodeMirror lint diagnostics,
 * VS Code markers, or LSP `Diagnostic`s.
 *
 * Parse errors (peg.js) carry `.location`; compile errors carry
 * `.source_location` *when they reference a parsed node* — but machine-level
 * compile errors (e.g. an empty machine, an unknown machine rule) have none, so
 * the location is treated as optional and falls back to the whole document.
 *
 * Some validity checks (e.g. a `required` property that no state defines) live
 * in the {@link Machine} constructor, a stage past `compile`. We therefore also
 * construct the machine so the editor surfaces those construction-time errors
 * instead of calling such a machine valid. The `Machine` class is imported from
 * `machine/machine.js` directly because the default `jssm` entry exports
 * `Machine` as a type only since 6.0 (intra-core code never routes through
 * `jssm/compat`). This is a diamond, not a cycle: both this module and the
 * `jssm` barrel depend on `machine/machine.js`, and nothing under `machine/`
 * imports `language_service/`.
 */

/**
 * Parse then compile `text`, returning a list of diagnostics — empty when the
 * machine parses and compiles cleanly.
 * @example
 *   fslDiagnostics('a -> b;');            // => []
 *   fslDiagnostics('a -> ;')[0].severity; // => 'error'
 *   // a `required` property no state defines is a construction-time error:
 *   fslDiagnostics('property p required; a -> b;')[0].severity; // => 'error'
 */
declare function fslDiagnostics(text: string): Diagnostic[];

/**
 * Context-aware, editor-agnostic FSL completions. Value suggestions after a
 * `key:`, key suggestions at a statement start (top-level vs inside a `{ }`
 * block, by brace depth). Adapters convert {@link CompletionItem}s to their own
 * completion type. Value vocab is jssm's own (`gviz_shapes`, `named_colors`,
 * `FslDirections`), so it cannot drift from the renderer.
 */

/**
 * Completions for the caret at `offset` in `text`.
 * @example
 *   fslCompletions('state x : { color: ', 19)[0].kind;  // => 'value-color'
 */
declare function fslCompletions(text: string, offset: number): CompletionItem[];

/**
 * Parser-derived semantic spans for FSL: color values (with resolved hex),
 * state names, and shape-enum values. Returns `[]` if the document does not
 * parse. Editor-agnostic — adapters map spans to decorations or semantic
 * tokens. Logic is a verified port of the sketch's `semantic_overlay.mjs`.
 */

/**
 * Collect color / state / shape-enum semantic spans from `text`. State spans
 * cover transition endpoints, state-declaration subjects, group-list members
 * (`&G : [a b c];` — but not the group's own name, nor `&`/`...&` nested
 * group references), and plain-label hook subjects (`on enter x do 'act';` —
 * but not `&group` subjects). Every state span's `value` is the parser's
 * resolved name (unquoted, unescaped), while `from`/`to` cover the source
 * spelling including any quotes.
 * @example
 *   fslSemanticSpans('state s : { color: crimson; };')
 *     .find(s => s.kind === 'color')?.value;   // => '#dc143cff'
 * @example
 *   fslSemanticSpans('&G : [a b];\na -> b;')
 *     .filter(s => s.kind === 'state').length;   // => 4 (two members + two endpoints)
 */
declare function fslSemanticSpans(text: string): SemanticSpan[];

/**
 *  The FSL Markdown fence convention parser — pure, host-agnostic logic that
 *  turns a fenced-code-block info string into a {@link FenceDescriptor}.  Hosts
 *  (a VS Code preview plugin, a static-site generator, …) each interpret the
 *  descriptor according to their capabilities.
 *  @see notes/superpowers/specs/2026-06-23-fsl-markdown-fence-convention-design.md
 */
/** A single renderable part of a fence block (stacks in listed order, first on top). */
type FencePart = 'image' | 'code' | 'dot' | 'editor' | 'actions' | 'info-panel' | 'toolbar' | 'title' | 'footer';
/** An image output format for the `image` part. */
type FenceImageFormat = 'svg' | 'png' | 'jpeg' | 'gif';
/** The unit of a {@link FenceDimension} (`%` is represented as `'percent'`). */
type FenceDimensionUnit = 'px' | 'percent';
/** A parsed `width=`/`height=` value with its unit. */
interface FenceDimension {
    value: number;
    unit: FenceDimensionUnit;
}
/**
 *  The fully-parsed, validated description of one FSL Markdown fence block.
 *
 *  Sizing semantics: `width`/`height` (from `width=`/`height=` tokens) are
 *  exact* dimensions — the host renders the block at that size.
 *  `max_width`/`max_height` (from `max-width=`/`max-height=` tokens) are
 *  upper bounds* on natural sizing — the block renders at its natural size
 *  but is capped on that axis.  When both an exact and a max token are given
 *  for the same axis, the exact dimension wins and the cap is moot.  All four
 *  are `null` when their token is absent.
 */
interface FenceDescriptor {
    parts: FencePart[];
    ide: boolean;
    format: FenceImageFormat;
    width: FenceDimension | null;
    height: FenceDimension | null;
    max_width: FenceDimension | null;
    max_height: FenceDimension | null;
    interactive: boolean;
    notes: string[];
}
/**
 *  Canonical fence language for an info string, or `null` if the block is not
 *  an FSL fence.  Reads only the first whitespace-delimited token,
 *  case-insensitively.
 *  @param info The full fence info string (everything after the opening fence).
 *  @returns `'fsl'` or `'jssm'` for our fences; `null` otherwise.
 *  @example fsl_fence_lang('fsl image code') // => 'fsl'
 *  @example fsl_fence_lang('JSSM')           // => 'jssm'
 *  @example fsl_fence_lang('mermaid')        // => null
 */
declare function fsl_fence_lang(info: string): 'fsl' | 'jssm' | null;
/**
 *  Parse a fence info string into a {@link FenceDescriptor}.  The first token is
 *  the (already-validated) language and is ignored; remaining tokens are
 *  classified as parts, image formats, the `ide` macro, or the dimension
 *  options `width`/`height` (exact size) and `max-width`/`max-height`
 *  (upper bounds on natural size — see {@link FenceDescriptor} for the
 *  precedence rule when both appear on one axis).  All four dimension tokens
 *  share one value syntax: a bare number (pixels), `<n>px`, or `<n>%`.
 *  Unrecognized or conflicting tokens are dropped and recorded in
 *  `notes` rather than throwing, so a host can render forward-compatibly.
 *  @param info The full fence info string, e.g. `'fsl image code width=300'`.
 *  @returns The validated descriptor; `notes` lists anything ignored or overridden.
 *  @example parse_fence_info('fsl').parts // => ['image', 'code']
 *  @example parse_fence_info('fsl code image').parts // => ['code', 'image']
 *  @example parse_fence_info('fsl image max-width=300 max-height=50%').max_width // => { value: 300, unit: 'px' }
 */
declare function parse_fence_info(info: string): FenceDescriptor;

/*******
 *
 *  Custom error class for jssm.  Enriches the standard `Error` with
 *  machine context (current state, instance name) and an optional
 *  `requested_state` so that error messages are self-describing.
 *
 *  When a semantic error is detected during `compile()` and the parse tree
 *  was produced with `parse(input, { locations: true })`, the thrown error
 *  also carries a `source_location` field — the FSL source span of the
 *  offending statement — so downstream tooling can map the error to a precise
 *  position in the original source text without additional scanning.
 *
 *  ```typescript
 *  throw new JssmError(machine, 'no such state', { requested_state: 'Blue' });
 *  // JssmError: [[my-light]]: no such state (at "Red", requested "Blue")
 *  ```
 *
 *  @param machine         - The `Machine` instance that raised the error, or
 *                           `undefined` if no machine is available.  Used to
 *                           read `state()` and `instance_name()` for context.
 *  @param message         - A human-readable description of the error.
 *  @param JEEI            - Optional {@link JssmErrorExtendedInfo} with extra
 *                           context such as `requested_state` and/or
 *                           `source_location` (the FSL source span of the
 *                           offending statement, present when the error
 *                           originated from a located parse tree).
 *
 */
declare class JssmError extends Error {
    message: string;
    base_message: string;
    requested_state: string | undefined;
    source_location: FslSourceLocation | undefined;
    constructor(machine: any, message: string, JEEI?: JssmErrorExtendedInfo);
}

/*********
 *
 *  Return the direction of an arrow - `right`, `left`, or `both`.
 *
 *  ```typescript
 *  import { arrow_direction } from 'jssm';
 *
 *  arrow_direction('->');    // 'right'
 *  arrow_direction('<~=>');  // 'both'
 *  ```
 *
 *  @param arrow The arrow to be evaluated
 *
 */
declare function arrow_direction(arrow: JssmArrow): JssmArrowDirection;
/*********
 *
 *  Return the direction of an arrow - `right`, `left`, or `both`.
 *
 *  ```typescript
 *  import { arrow_left_kind } from 'jssm';
 *
 *  arrow_left_kind('<-');    // 'legal'
 *  arrow_left_kind('<=');    // 'main'
 *  arrow_left_kind('<~');    // 'forced'
 *  arrow_left_kind('<->');   // 'legal'
 *  arrow_left_kind('->');    // 'none'
 *  ```
 *
 *  @param arrow The arrow to be evaluated
 *
 */
declare function arrow_left_kind(arrow: JssmArrow): JssmArrowKind;
/*********
 *
 *  Return the direction of an arrow - `right`, `left`, or `both`.
 *
 *  ```typescript
 *  import { arrow_left_kind } from 'jssm';
 *
 *  arrow_left_kind('->');    // 'legal'
 *  arrow_left_kind('=>');    // 'main'
 *  arrow_left_kind('~>');    // 'forced'
 *  arrow_left_kind('<->');   // 'legal'
 *  arrow_left_kind('<-');    // 'none'
 *  ```
 *
 *  @param arrow The arrow to be evaluated
 *
 */
declare function arrow_right_kind(arrow: JssmArrow): JssmArrowKind;

/*********
 *
 *  This method wraps the parser call that comes from the peg grammar,
 *  {@link parse}.  Generally neither this nor that should be used directly
 *  unless you mean to develop plugins or extensions for the machine.
 *
 *  Parses the intermediate representation of a compiled string down to a
 *  machine configuration object.  If you're using this (probably don't,) you're
 *  probably also using {@link compile} and {@link create} (or, through
 *  `jssm/compat`, the `Machine` constructor).
 *
 *  ```typescript
 *  import { parse, compile, create } from 'jssm';
 *
 *  const intermediate = parse('a -> b;');
 *  // [ {key:'transition', from:'a', se:{kind:'->',to:'b'}} ]
 *
 *  const cfg = compile(intermediate);
 *  // { start_states:['a'], transitions: [{ from:'a', to:'b', kind:'legal', forced_only:false, main_path:false }] }
 *
 *  const machine = create(cfg);
 *  // Machine { _instance_name: undefined, _state: 'a', ...
 *  ```
 *
 *  This method is mostly for plugin and intermediate tool authors, or people
 *  who need to work with the machine's intermediate representation.
 *
 *  ## Opt-in source locations
 *
 *  Pass `{ locations: true }` to attach source-span information to every
 *  object node in the AST.  Each node gains a `loc` field of type
 *  {@link FslSourceLocation} covering its full statement span.  Selected nodes
 *  also gain curated sub-span fields that pinpoint individual tokens within the
 *  statement:
 *
 *  - Transition nodes: `from_loc` (source state), `to_loc` (target state, on
 *    the nested `se` object), `l_action_loc` / `r_action_loc` (action labels).
 *  - State-declaration nodes: `name_loc` (state name), plus `value_loc` on
 *    each color-bearing item inside the declaration block.
 *  - Machine-attribute nodes (`machine_name`, `fsl_version`, etc.): `value_loc`
 *    (the attribute value token).
 *
 *  Without `{ locations: true }` the AST is byte-for-byte identical to the
 *  default output; no `loc` or `*_loc` fields are present.
 *
 *  ```typescript
 *  const tree = wrap_parse('a -> b;', { locations: true });
 *  // tree[0].loc  === { start: { offset: 0, line: 1, column: 1 },
 *  //                    end:   { offset: 7, line: 1, column: 8 } }
 *  // tree[0].from_loc.start.offset === 0   // 'a'
 *  // tree[0].se.to_loc.start.offset === 5  // 'b'
 *  ```
 *
 *  @see {@link FslSourceLocation}
 *
 *  # Hey!
 *
 *  Most people looking at this want either the `sm` operator or method `from`,
 *  which perform all the steps in the chain.  The library's author mostly uses
 *  operator `sm`, and mostly falls back to `.from` when needing to parse
 *  strings dynamically instead of from template literals.
 *
 *  Operator {@link sm}:
 *
 *  ```typescript
 *  import { sm } from 'jssm';
 *
 *  const lswitch = sm`on <=> off;`;
 *  ```
 *
 *  Method {@link from}:
 *
 *  ```typescript
 *  import * as jssm from 'jssm';
 *
 *  const toggle = jssm.from('up <=> down;');
 *  ```
 *
 *  `wrap_parse` itself is an internal convenience method for alting out an
 *  object as the options call.  Not generally meant for external use.
 *
 *  @typeParam StateType The type of state names in the resulting tree; the
 *                       grammar itself always produces `string`s, so only
 *                       override this when threading a caller's own state
 *                       naming through to {@link compile}.
 *  @typeParam mDT       The type of the machine data member; usually omitted.
 *
 *  @param input The FSL code to be evaluated
 *
 *  @param options Things to control about the parse.  Pass
 *                 `{ locations: true }` to enable opt-in source location
 *                 tracking on every AST node.  When omitted, an empty options
 *                 object is passed through to the parser.
 *
 *  @returns The machine's intermediate representation: a flat
 *           {@link JssmParseTree} with one node per top-level FSL statement.
 *
 *  @throws {SyntaxError} The generated PEG.js parser's `SyntaxError` when
 *                        `input` is not valid FSL.
 *
 *  @see {@link compile}
 *  @see {@link make}
 *  @see {@link JssmParseOptions}
 *
 */
declare function wrap_parse<StateType = string, mDT = unknown>(input: string, options?: JssmParseOptions): JssmParseTree<StateType, mDT>;
/*********
 *
 *  Computes the minimum membership distance from a source `state` up to a
 *  containing `group` — the specificity metric that drives group-vs-group
 *  conflict resolution.  Distance 1 means `state` is a direct member of
 *  `group`; distance 2 means `state` belongs to some sub-group nested (or
 *  spread) one hop inside `group`; and so on.  A smaller distance means the
 *  group is "nearer"/"more specific" to the state, so it wins.
 *
 *  The walk is a breadth-first descent over the group→group membership edges
 *  starting at `group`: a group dequeued at hop-count `h` contributes its
 *  direct `state` members at distance `h + 1`, and enqueues its `group`
 *  members at hop-count `h + 1`.  BFS guarantees the first time `state` is
 *  seen is via a shortest path; cycles cannot occur because the registry is
 *  validated acyclic by {@link group_registry_cycle_check} first, but a
 *  `visited` set guards against re-expansion regardless.
 *
 *  ```typescript
 *  // for `&Playing:[normal]; &Active:[&Playing];`
 *  // membership_distance(reg, 'normal', 'Playing') === 1
 *  // membership_distance(reg, 'normal', 'Active')  === 2
 *  ```
 *
 *  @param registry The compiled group registry.
 *  @param state    The source state whose distance is measured.
 *  @param group    The containing group to measure the distance to.
 *
 *  @returns The minimum membership distance (>= 1), or `Infinity` if `state`
 *           is not a transitive member of `group`.
 *
 *  @see transitive_members
 *  @internal
 */
declare function membership_distance(registry: JssmGroupRegistry, state: string, group: string): number;
/*********
 *
 *  Resolves a list target or `start_states` list's members to their
 *  within-list shares (6.0 list weights).  A plain list (or a weighted list
 *  whose members carry no inner weight) shares uniformly (`1/n`); a
 *  weighted list normalizes its inner weights (`w_i / Σw`).  Pure.
 *
 *  @param list A plain name array (`['b', 'c']`) or a parsed
 *              {@link JssmWeightedList} node.
 *
 *  @returns One entry per member, in list order, with shares summing to 1.
 *
 *  @throws {JssmError} When a weighted list mixes weighted and unweighted
 *                       members (every member must carry a weight, or none
 *                       may), when its inner weights sum to zero (no member
 *                       could ever be chosen), or when any inner weight is
 *                       negative.
 *
 *  ```typescript
 *  list_shares(['b', 'c']);
 *  // [ { name: 'b', share: 0.5 }, { name: 'c', share: 0.5 } ]
 *
 *  list_shares({ key: 'weighted_list', members: [{ name: 'b', weight: 20 }, { name: 'c', weight: 80 }] });
 *  // [ { name: 'b', share: 0.2 }, { name: 'c', share: 0.8 } ]
 *  ```
 *
 */
declare function list_shares(list: Array<string> | JssmWeightedList): Array<{
    name: string;
    share: number;
}>;
/*********
 *
 *  Compile a machine's JSON intermediate representation to a config object.  If
 *  you're using this (probably don't,) you're probably also using
 *  {@link parse} to get the IR, and {@link create} (or, through `jssm/compat`,
 *  the `Machine` constructor) to turn the config object into a workable machine.
 *
 *  ```typescript
 *  import { parse, compile, create } from 'jssm';
 *
 *  const intermediate = parse('a -> b;');
 *  // [ {key:'transition', from:'a', se:{kind:'->',to:'b'}} ]
 *
 *  const cfg = compile(intermediate);
 *  // { start_states:['a'], transitions: [{ from:'a', to:'b', kind:'legal', forced_only:false, main_path:false }] }
 *
 *  const machine = create(cfg);
 *  // Machine { _instance_name: undefined, _state: 'a', ...
 *  ```
 *
 *  This method is mostly for plugin and intermediate tool authors, or people
 *  who need to work with the machine's intermediate representation.
 *
 *  ## Source-location-aware error reporting
 *
 *  `compile()` ignores `loc` and `*_loc` fields during machine construction —
 *  the resulting config is identical whether or not the tree was parsed with
 *  `{ locations: true }`.  However, when those fields are present, `compile()`
 *  attaches the offending node's source span to any semantic {@link JssmError}
 *  it throws, via the error's `source_location` field
 *  (type {@link FslSourceLocation}).  This lets downstream tooling (e.g. a
 *  CodeMirror 6 linter) map the error to a precise editor range without any
 *  additional source-scanning.
 *
 *  ```typescript
 *  import { parse, compile } from 'jssm';
 *
 *  try {
 *    compile(parse('fsl_version: 1.0.0;\nfsl_version: 2.0.0;\na -> b;',
 *                  { locations: true }));
 *  } catch (err) {
 *    // err.source_location.start.offset points at the second fsl_version line
 *    console.log(err.source_location);
 *  }
 *  ```
 *
 *  @see {@link FslSourceLocation}
 *
 *  # Hey!
 *
 *  Most people looking at this want either the `sm` operator or method `from`,
 *  which perform all the steps in the chain.  The library's author mostly uses
 *  operator `sm`, and mostly falls back to `.from` when needing to parse
 *  strings dynamically instead of from template literals.
 *
 *  Operator {@link sm}:
 *
 *  ```typescript
 *  import { sm } from 'jssm';
 *
 *  const lswitch = sm`on <=> off;`;
 *  ```
 *
 *  Method {@link from}:
 *
 *  ```typescript
 *  import * as jssm from 'jssm';
 *
 *  const toggle = jssm.from('up <=> down;');
 *  ```
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param tree The parse tree to be boiled down into a machine config.  If the
 *              tree was produced with `parse(input, { locations: true })`, any
 *              semantic error thrown will carry a `source_location` span
 *              pointing at the offending statement.
 *
 *  @throws {JssmError} If the document declares no transitions (for example a
 *                      states-first document of only `state` blocks) — a
 *                      machine requires at least one transition; also for
 *                      repeated property definitions, group errors, and other
 *                      semantic problems noted throughout.
 *
 */
declare function compile<StateType, mDT>(tree: JssmParseTree<StateType, mDT>): JssmGenericConfig<StateType, mDT>;
/*********
 *
 *  An internal convenience wrapper for parsing then compiling a machine string.
 *  Not generally meant for external use.  Please see {@link compile} or
 *  {@link sm}.
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param plan The FSL code to be evaluated and built into a machine config
 *
 */
declare function make<StateType, mDT>(plan: string): JssmGenericConfig<StateType, mDT>;

/*******
 *
 *  Selects a single item from a weighted array of objects using cumulative
 *  probability.  Each object in the array should have a numeric property
 *  indicating its relative weight (defaults to `'probability'`).  Objects
 *  missing the property are treated as weight 1.  On the default
 *  `'probability'` key only, an option's `share` (6.0 list weights) multiplies
 *  its weight — `(probability ?? 1) × (share ?? 1)`; custom keys ignore
 *  `share` entirely, so the generic weighted-selection API is unchanged for
 *  callers who pass their own property name.
 *
 *  ```typescript
 *  const opts = [
 *    { value: 'common',  probability: 0.8 },
 *    { value: 'rare',    probability: 0.2 }
 *  ];
 *
 *  weighted_rand_select(opts);  // most often { value: 'common', ... }
 *
 *  // default key: probability × share
 *  const list_opts = [
 *    { to: 'b', share: 0.2 },  // no declared probability -> weight 1 × 0.2
 *    { to: 'c', share: 0.8 },  // weight 1 × 0.8
 *    { to: 'd' }               // weight 1 × 1
 *  ];
 *
 *  weighted_rand_select(list_opts);  // d most often (weights 0.2 : 0.8 : 1)
 *  ```
 *
 *  @param options              - Non-empty array of objects to choose from.
 *  @param probability_property - Name of the numeric weight property on each
 *                                object.  Defaults to `'probability'`.
 *  @param rng                  - Optional random number generator `() => number`
 *                                in `[0, 1)`.  Defaults to `Math.random`.
 *
 *  @returns One element from `options`, chosen by weighted random selection.
 *
 *  @throws {TypeError} If `options` is not a non-empty array of objects.
 *
 */
declare const weighted_rand_select: (options: Array<any>, probability_property?: string, rng?: JssmRng) => any;
/*******
 *
 *  Returns, for a non-negative integer argument `n`, the series `[0 .. n]`.
 *
 *  ```typescript
 *  import { seq } from './jssm.js';
 *
 *  seq(5);  // [0, 1, 2, 3, 4]
 *  seq(0);  // []
 *  ```
 *
 */
declare function seq(n: number): number[];
/*******
 *
 *  Returns the histograph of an array as a `Map`.  Makes no attempt to cope
 *  with deep equality; will fail for complex contents, as such.
 *
 *  ```typescript
 *  import { histograph } from './jssm.js';
 *
 *  histograph( [0, 0, 1, 1, 2, 2, 1] );  // Map()
 *  ```
 *
 */
declare const histograph: (ar: any[]) => Map<any, number>;
/*******
 *
 *  Draws `n` weighted random samples from an array of objects.  Each draw is
 *  independent (with replacement), delegating to {@link weighted_rand_select}.
 *
 *  ```typescript
 *  const opts = [
 *    { value: 'a', probability: 0.9 },
 *    { value: 'b', probability: 0.1 }
 *  ];
 *
 *  weighted_sample_select(3, opts, 'probability');
 *  // e.g. [ { value: 'a', ... }, { value: 'a', ... }, { value: 'b', ... } ]
 *  ```
 *
 *  @param n                    - Number of samples to draw.
 *  @param options              - Non-empty array of weighted objects.
 *  @param probability_property - Name of the numeric weight property.
 *  @param rng                  - Optional random number generator.
 *
 *  @returns An array of `n` independently selected items.
 *
 */
declare const weighted_sample_select: (n: number, options: Array<any>, probability_property: string, rng?: JssmRng) => Array<any>;
/*******
 *
 *  Draws `n` weighted random samples, extracts a named key from each, and
 *  returns a histograph (`Map`) of how often each key value appeared.  Useful
 *  for validating that a probabilistic transition distribution is roughly
 *  correct over many trials.
 *
 *  ```typescript
 *  const opts = [
 *    { to: 'a', probability: 0.7 },
 *    { to: 'b', probability: 0.3 }
 *  ];
 *
 *  weighted_histo_key(1000, opts, 'probability', 'to');
 *  // Map { 'a' => ~700, 'b' => ~300 }
 *  ```
 *
 *  @param n         - Number of samples to draw.
 *  @param opts      - Non-empty array of weighted objects.
 *  @param prob_prop - Name of the numeric weight property.
 *  @param extract   - Name of the property to extract from each sample for
 *                     histogramming.
 *  @param rng       - Optional random number generator.
 *
 *  @returns A `Map` from extracted key values to their occurrence counts.
 *
 */
declare const weighted_histo_key: (n: number, opts: Array<any>, prob_prop: string, extract: string, rng?: JssmRng) => Map<any, number>;
/*******
 *
 *  Internal method generating composite keys for the hook lookup map by
 *  JSON-serializing a `[property, state]` pair.  Not meant for external use.
 *
 *  ```typescript
 *  name_bind_prop_and_state('color', 'Red');  // '["color","Red"]'
 *  ```
 *
 *  @param prop  - The property name (e.g. a data key or hook category).
 *  @param state - The state name to bind to.
 *
 *  @returns A deterministic JSON string key for the `[prop, state]` pair.
 *
 *  @throws {JssmError} If either argument is not a string.
 *
 */
declare function name_bind_prop_and_state(prop: string, state: string): string;
/*******
 *
 *  Creates a SplitMix32 random generator.  Used by the randomness test suite.
 *
 *  Sourced from `bryc`: https://github.com/bryc/code/blob/master/jshash/PRNGs.md#splitmix32
 *
 *  Replaces the Mulberry generator, which was found to have problems
 *
 */
declare function gen_splitmix32(a?: number): () => number;
/*******
 *
 *  Reduces an array to its unique contents.  Compares with `===` and makes no
 *  effort to deep-compare contents; two matching arrays or objects contained
 *  will be treated as distinct, according to javascript rules.  This also means
 *  that `NaNs` will be ***dropped***, because they do not self-compare.
 *
 *  ```typescript
 *  unique( [] );                     // []
 *  unique( [0,0] );                  // [0]
 *  unique( [0,1,2, 0,1,2, 0,1,2] );  // [0,1,2]
 *  unique( [ [1], [1] ] );           // [ [1], [1] ] because arrays don't match
 *  unique( [0,NaN,2] );              // [0,2]
 *  ```
 *
 */
declare const unique: <T>(arr: T[]) => T[];
/*******
 *
 *  Lists all repeated items in an array along with their counts.  Subject to
 *  matching rules of Map.  `NaN` is manually removed because of conflict rules
 *  around {@link unique}.  Because these are compared with `===` and because
 *  arrays and objects never match that way unless they're the same object,
 *  arrays and objects are never considered repeats.
 *
 *  ```typescript
 *  find_repeated<string>([ ]);                     // []
 *  find_repeated<string>([ "one" ]);               // []
 *  find_repeated<string>([ "one", "two" ]);        // []
 *  find_repeated<string>([ "one", "one" ]);        // [ ["one", 2] ]
 *  find_repeated<string>([ "one", "two", "one" ]); // [ ["one", 2] ]
 *  find_repeated<number>([ 0, NaN, 0, NaN ]);      // [ [0,     2] ]
 *  ```
 *
 */
declare function find_repeated<T>(arr: T[]): [T, number][];
/*******
 *
 *  Returns a `Promise` that resolves after `ms` milliseconds.  Useful for
 *  inserting delays in async test flows or demos.
 *
 *  ```typescript
 *  await sleep(100);  // pauses execution for 100ms
 *  ```
 *
 *  @param ms - Number of milliseconds to wait before resolving.
 *
 *  @returns A `Promise<void>` that resolves after the timeout.
 *
 */
declare function sleep(ms: number): Promise<unknown>;

declare const SUPPORTED_TAPE_VERSION = 1;
type ReplayErrorKind = 'malformed_tape' | 'unsupported_format_version' | 'unknown_op' | 'source_hash_mismatch' | 'no_pending_timer' | 'parse_error';
/** Typed error for the tape/replay layer (kind-discriminated, like FslError). */
declare class ReplayError extends Error {
    kind: ReplayErrorKind;
    step?: number;
    constructor(kind: ReplayErrorKind, message: string, step?: number);
}
type Stimulus = {
    op: 'action';
    name: string;
    data?: unknown;
} | {
    op: 'transition';
    name: string;
    data?: unknown;
} | {
    op: 'timer';
};
type TapeHeader = {
    fsl_tape: number;
    machine: {
        ref?: string;
        source_hash?: string;
        source?: string;
    };
    seed?: unknown;
    created?: number;
    comment?: string;
};
type StimulusTape = {
    header: TapeHeader;
    stimuli: Stimulus[];
};
/**
 * Parse JSONL tape text into a {@link StimulusTape}.
 * @param text - JSONL: a header object line, then stimulus lines.
 * @returns The parsed header + stimuli.
 * @throws ReplayError kind `malformed_tape` / `unsupported_format_version` / `unknown_op`.
 * @example
 *   parse_tape('{"fsl_tape":1,"machine":{}}\n{"op":"timer"}');
 */
declare function parse_tape(text: string): StimulusTape;
/**
 * Serialize a {@link StimulusTape} back to canonical JSONL (stable key order
 * per line, so the bytes are deterministic).
 * @param tape - The tape to serialize.
 * @returns JSONL text.
 * @example
 *   serialize_tape({ header: { fsl_tape: 1, machine: {} }, stimuli: [{ op: 'timer' }] });
 */
declare function serialize_tape(tape: StimulusTape): string;

type ReplayStep = {
    index: number;
    op: string;
    name?: string;
    accepted: boolean;
};
type ReplayResult = {
    final_state: unknown;
    final_data: unknown;
    steps: ReplayStep[];
    source_hash: string;
    canonical: string;
};
/**
 * Replay `tape` against the machine compiled from `source`.
 * @param source - FSL source text.
 * @param tape - The parsed stimulus tape.
 * @returns The deterministic {@link ReplayResult}.
 * @throws ReplayError `source_hash_mismatch` / `no_pending_timer`.
 * @example
 *   replay("a 'go' -> b;", parse_tape('{"fsl_tape":1,"machine":{}}\n{"op":"action","name":"go"}'));
 */
declare function replay(source: string, tape: StimulusTape): ReplayResult;

/**
 *  The published semantic version of the jssm package this build was cut from.
 *  Mirrored from `package.json` by `src/buildjs/makever.cjs` at build time.
 *  Useful for runtime diagnostics and for embedding in serialized machine
 *  snapshots so that deserializers can detect version-skew.
 */
declare const version: string;
/**
 *  The Unix epoch timestamp (in milliseconds) at which this build was produced,
 *  written by `src/buildjs/makever.cjs`.  Useful for distinguishing builds
 *  with the same `version` string during development, and for diagnostic logs.
 */
declare const build_time: number;

/*******
 *
 *  Convenience aliases for common mathematical and numeric constants from
 *  `Number` and `Math`.  Re-exported so that FSL data expressions and tests
 *  can reference them without importing `Math` directly.
 *
 *  Includes: `NegInfinity`, `PosInfinity`, `Epsilon`, `Pi`, `E`, `Root2`,
 *  `RootHalf`, `Ln2`, `Ln10`, `Log2E`, `Log10E`, `MaxSafeInt`, `MinSafeInt`,
 *  `MaxPosNum`, `MinPosNum`, `Phi` (golden ratio), `EulerC` (Euler–Mascheroni).
 *
 */
declare const NegInfinity: number;
declare const PosInfinity: number;
declare const Epsilon: number;
declare const Pi: number;
declare const E: number;
declare const Root2: number;
declare const RootHalf: number;
declare const Ln2: number;
declare const Ln10: number;
declare const Log2E: number;
declare const Log10E: number;
declare const MaxSafeInt: number;
declare const MinSafeInt: number;
declare const MaxPosNum: number;
declare const MinPosNum: number;
declare const Phi = 1.618033988749895;
declare const EulerC = 0.5772156649015329;
/*******
 *
 *  Complete list of node shapes supported by Graphviz.  Used by jssm-viz to
 *  validate and render state shapes in FSL `state ... : { shape: ... }` blocks.
 *
 *  `shapes` is an alias for `gviz_shapes`.
 *
 */
declare const gviz_shapes: string[];
/**
 *  Public alias for {@link gviz_shapes}.  The list of node shapes supported
 *  by Graphviz that jssm-viz accepts in FSL `state ... : { shape: ... }`
 *  declarations.
 */
declare const shapes: string[];
/*******
 *
 *  List of CSS/SVG named colors accepted by jssm-viz for state styling
 *  properties like `background-color` and `text-color`.  Case-insensitive
 *  matching is done at parse time; the canonical casing here follows the
 *  CSS specification.
 *
 */
declare const named_colors: string[];
/*******
 *
 *  Character ranges accepted by the FSL grammar for identifier and label
 *  tokens.  Each entry is an inclusive `{from, to}` range of single Unicode
 *  characters.  Single-character entries (e.g. `.`) appear with `from === to`.
 *
 *  These are intended for tooling, validators, and editors that need to know
 *  which characters are legal in a given FSL token position without re-parsing
 *  the PEG grammar.
 *
 */
/**
 *  Inclusive ASCII character ranges accepted in any but the first position of
 *  an FSL bareword (state / property / val / enum-member name): digits,
 *  letters, and underscore.  Non-ASCII characters are classified by
 *  {@link is_state_name_char}, which is the complete rule; this table exists
 *  for tooling that wants the ASCII portion as ranges.
 *  @example
 *  import { state_name_chars } from 'jssm';
 *  state_name_chars.some(r => 'A' >= r.from && 'A' <= r.to);  // => true
 *  state_name_chars.some(r => '+' >= r.from && '+' <= r.to);  // => false
 *  @see is_state_name_char
 */
declare const state_name_chars: ReadonlyArray<{
    from: string;
    to: string;
}>;
/**
 *  Inclusive ASCII character ranges accepted in the first position of an FSL
 *  bareword: letters and underscore (never a digit).  Non-ASCII characters
 *  are classified by {@link is_state_name_first_char}.
 *  @example
 *  import { state_name_first_chars } from 'jssm';
 *  state_name_first_chars.some(r => '7' >= r.from && '7' <= r.to);  // => false
 *  @see is_state_name_first_char
 */
declare const state_name_first_chars: ReadonlyArray<{
    from: string;
    to: string;
}>;
/**
 *  Whether one code point may begin an FSL bareword (#754): a Unicode letter,
 *  a letter-number, or underscore.  Mirrors the grammar's `AtomFirstLetter`.
 *  @param ch - Exactly one code point (a surrogate pair counts as one).
 *  @example
 *  import { is_state_name_first_char } from 'jssm';
 *  is_state_name_first_char('é');  // => true
 *  is_state_name_first_char('7');  // => false
 *  @see is_state_name_char
 */
declare const is_state_name_first_char: (ch: string) => boolean;
/**
 *  Whether one code point may continue an FSL bareword (#754): anything
 *  {@link is_state_name_first_char} accepts, plus combining marks, decimal
 *  digits, and connector punctuation.  Mirrors the grammar's `AtomLetter`.
 *  @param ch - Exactly one code point (a surrogate pair counts as one).
 *  @example
 *  import { is_state_name_char } from 'jssm';
 *  is_state_name_char('7');  // => true
 *  is_state_name_char('.');  // => false
 *  @see is_state_name_first_char
 */
declare const is_state_name_char: (ch: string) => boolean;
/**
 *  Inclusive character ranges accepted by `ActionLabelUnescaped` — i.e., the
 *  characters legal inside a single-quoted action label without escaping.
 *  Space (`U+0020`) is included; the apostrophe `'` (`U+0027`) is explicitly
 *  excluded since it terminates the label.
 *
 *  Three ranges: `U+0020`–`U+0026`, `U+0028`–`U+005B`, `U+005D`–`U+FFFF`.
 *  @example
 *  import { action_label_chars } from 'jssm';
 *  action_label_chars.some(r => ' ' >= r.from && ' ' <= r.to);   // => true
 *  action_label_chars.some(r => "'" >= r.from && "'" <= r.to);   // => false
 */
declare const action_label_chars: ReadonlyArray<{
    from: string;
    to: string;
}>;

declare const jssm_constants_d_E: typeof E;
declare const jssm_constants_d_Epsilon: typeof Epsilon;
declare const jssm_constants_d_EulerC: typeof EulerC;
declare const jssm_constants_d_Ln10: typeof Ln10;
declare const jssm_constants_d_Ln2: typeof Ln2;
declare const jssm_constants_d_Log10E: typeof Log10E;
declare const jssm_constants_d_Log2E: typeof Log2E;
declare const jssm_constants_d_MaxPosNum: typeof MaxPosNum;
declare const jssm_constants_d_MaxSafeInt: typeof MaxSafeInt;
declare const jssm_constants_d_MinPosNum: typeof MinPosNum;
declare const jssm_constants_d_MinSafeInt: typeof MinSafeInt;
declare const jssm_constants_d_NegInfinity: typeof NegInfinity;
declare const jssm_constants_d_Phi: typeof Phi;
declare const jssm_constants_d_Pi: typeof Pi;
declare const jssm_constants_d_PosInfinity: typeof PosInfinity;
declare const jssm_constants_d_Root2: typeof Root2;
declare const jssm_constants_d_RootHalf: typeof RootHalf;
declare const jssm_constants_d_action_label_chars: typeof action_label_chars;
declare const jssm_constants_d_gviz_shapes: typeof gviz_shapes;
declare const jssm_constants_d_is_state_name_char: typeof is_state_name_char;
declare const jssm_constants_d_is_state_name_first_char: typeof is_state_name_first_char;
declare const jssm_constants_d_named_colors: typeof named_colors;
declare const jssm_constants_d_shapes: typeof shapes;
declare const jssm_constants_d_state_name_chars: typeof state_name_chars;
declare const jssm_constants_d_state_name_first_chars: typeof state_name_first_chars;
declare namespace jssm_constants_d {
  export {
    jssm_constants_d_E as E,
    jssm_constants_d_Epsilon as Epsilon,
    jssm_constants_d_EulerC as EulerC,
    jssm_constants_d_Ln10 as Ln10,
    jssm_constants_d_Ln2 as Ln2,
    jssm_constants_d_Log10E as Log10E,
    jssm_constants_d_Log2E as Log2E,
    jssm_constants_d_MaxPosNum as MaxPosNum,
    jssm_constants_d_MaxSafeInt as MaxSafeInt,
    jssm_constants_d_MinPosNum as MinPosNum,
    jssm_constants_d_MinSafeInt as MinSafeInt,
    jssm_constants_d_NegInfinity as NegInfinity,
    jssm_constants_d_Phi as Phi,
    jssm_constants_d_Pi as Pi,
    jssm_constants_d_PosInfinity as PosInfinity,
    jssm_constants_d_Root2 as Root2,
    jssm_constants_d_RootHalf as RootHalf,
    jssm_constants_d_action_label_chars as action_label_chars,
    jssm_constants_d_gviz_shapes as gviz_shapes,
    jssm_constants_d_is_state_name_char as is_state_name_char,
    jssm_constants_d_is_state_name_first_char as is_state_name_first_char,
    jssm_constants_d_named_colors as named_colors,
    jssm_constants_d_shapes as shapes,
    jssm_constants_d_state_name_chars as state_name_chars,
    jssm_constants_d_state_name_first_chars as state_name_first_chars,
  };
}

export { FslDirections, JssmError, Machine, ReplayError, STOCHASTIC_DEFAULT_MAX_STEPS, STOCHASTIC_DEFAULT_RUNS, SUPPORTED_TAPE_VERSION, abstract_everything_hook_step, abstract_hook_step, act, act as action, action_label_chars$1 as action_label_chars, actions, active_state_style, all_action_label_chars, all_state_name_chars, all_state_name_first_chars, all_themes, allow_islands, allows_override, arrow_direction, arrow_left_kind, arrow_right_kind, auto_set_state_timeout, build_time, canonical, clear_state_timeout, code_allows_override, compareVersions, compile, config_allows_override, jssm_constants_d as constants, create, create_start_time, creation_date, creation_timestamp, current_action_edge_for, current_action_for, current_state_timeout, data, default_graph_config, default_size, default_transition_config, deserialize, display_text, dot_preamble, edges_between, editor_config, end_state_style, failed_outputs, find_repeated, flow, force_transition, from, fsl, fslCompletions, fslDiagnostics, fslSemanticSpans, fsl_fence_lang, fsl_version, gen_splitmix32, get_transition_by_state_names, go, graph_layout, groups, groupsOf, gviz_shapes$1 as gviz_shapes, has_completes, has_hook, has_state, has_terminals, has_unenterables, histograph, history, history_inclusive, history_length, hook, hook_action, hook_after, hook_after_any, hook_any_action, hook_any_transition, hook_entry, hook_everything, hook_exit, hook_forced_transition, hook_global_action, hook_main_transition, hook_post_everything, hook_pre_everything, hook_pre_post_everything, hook_registry, hook_standard_transition, hooked_state_style, hooks_on, instance_name, isIn, is_complete, is_end_state, is_failed, is_failed_output, is_final, is_hook_complex_result, is_hook_rejection, is_start_state, is_state_name_char$1 as is_state_name_char, is_state_name_first_char$1 as is_state_name_first_char, is_terminal, is_unenterable, known_prop, known_props, known_val, known_vals, label_for, list_actions, list_edges, list_entrances, list_exit_actions, list_exits, list_named_transitions, list_shares, list_states_having_action, list_transitions, lookup_transition_for, machine_author, machine_comment, machine_contributor, machine_definition, machine_language, machine_license, machine_name, machine_state, machine_version, make, membership_distance, name_bind_prop_and_state, named_colors$1 as named_colors, npm_name, off, on, once, override, wrap_parse as parse, parse_fence_info, parse_tape, post_hook, post_hook_action, post_hook_any_action, post_hook_any_transition, post_hook_entry, post_hook_exit, post_hook_forced_transition, post_hook_global_action, post_hook_main_transition, post_hook_standard_transition, probabilistic_histo_walk, probabilistic_transition, probabilistic_walk, probable_action_exits, probable_exits_for, prop, props, raw_state_declarations, remove_hook, replay, resolve_state_config, rng_seed, sample_start_state, seq, serialize, serialize_tape, set_data, set_history_length, set_hook, set_rng_seed, set_state_timeout, set_themes, set_val, shapes$1 as shapes, sleep, sm, standard_state_style, start_state_style, start_state_weights, state, state_declaration, state_declarations, state_for, state_has_hooks, state_is_complete, state_is_final, state_is_terminal, state_name_chars$1 as state_name_chars, state_name_first_chars$1 as state_name_first_chars, state_style_condense, state_timeout_for, states, statesIn, stochastic_runs, stochastic_summary, strict_prop, style_for, terminal_state_style, themes, transfer_state_properties, transition, unique, uses_actions, uses_forced_transitions, val, val_type, valid_action, valid_force_transition, valid_transition, vals, version, weighted_histo_key, weighted_rand_select, weighted_sample_select };
export type { FenceDescriptor, FenceDimension, FenceDimensionUnit, FenceImageFormat, FencePart, JssmMachine, JssmParseOptions, ReplayErrorKind, ReplayResult, ReplayStep, Stimulus, StimulusTape, TapeHeader };
