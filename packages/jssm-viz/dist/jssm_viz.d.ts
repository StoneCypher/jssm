import { circular_buffer } from 'circular_buffer_js';

type StateType$1 = string;
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
 * A type teaching Typescript the various supported shapes for nodes, mostly inherited from GraphViz
 */
type JssmShape = "box" | "polygon" | "ellipse" | "oval" | "circle" | "point" | "egg" | "triangle" | "plaintext" | "plain" | "diamond" | "trapezium" | "parallelogram" | "house" | "pentagon" | "hexagon" | "septagon" | "octagon" | "doublecircle" | "doubleoctagon" | "tripleoctagon" | "invtriangle" | "invtrapezium" | "invhouse" | "Mdiamond" | "Msquare" | "Mcircle" | "rect" | "rectangle" | "square" | "star" | "none" | "underline" | "cylinder" | "note" | "tab" | "folder" | "box3d" | "component" | "promoter" | "cds" | "terminator" | "utr" | "primersite" | "restrictionsite" | "fivepoverhang" | "threepoverhang" | "noverhang" | "assembly" | "signature" | "insulator" | "ribosite" | "rnastab" | "proteasesite" | "proteinstab" | "rpromoter" | "rarrow" | "larrow" | "lpromoter" | "record";
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
    state: StateType$1;
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
type JssmTransitionPermitter<DataType> = (OldState: StateType$1, NewState: StateType$1, OldData: DataType, NewData: DataType) => boolean;
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
    entrances: Array<StateType$1>;
    exits: Array<StateType$1>;
};
/**
 *  Topology record for one node in a compiled machine: its name, the set of
 *  states it can be reached from, the set of states it can transition to,
 *  and whether reaching it constitutes "completing" the machine.
 */
type JssmGenericState = {
    from: Array<StateType$1>;
    name: StateType$1;
    to: Array<StateType$1>;
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
    state: StateType$1;
    states: Map<StateType$1, JssmGenericState>;
    named_transitions: Map<StateType$1, number>;
    edge_map: Map<StateType$1, Map<StateType$1, number>>;
    actions: Map<StateType$1, Map<StateType$1, number>>;
    reverse_actions: Map<StateType$1, Map<StateType$1, number>>;
    edges: Array<JssmTransition<StateType$1, DataType>>;
};
type JssmStatePermitter<DataType> = (OldState: StateType$1, NewState: StateType$1, OldData: DataType, NewData: DataType) => boolean;
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
    state: StateType$1;
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
    from: StateType$1;
    to: StateType$1;
    action?: string;
} | {
    scope: 'state';
    state: StateType$1;
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
type HookQuery = StateType$1 | {
    from: StateType$1;
    to: StateType$1;
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
    state?: StateType$1;
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
 *  Bounded history of recently-visited states paired with the data payload
 *  observed in each.  Backed by `circular_buffer_js`, so the oldest entry
 *  is dropped silently once the configured capacity is exceeded.
 */
type JssmHistory<mDT> = circular_buffer<[StateType$1, mDT]>;
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
    from: StateType$1;
    to: StateType$1;
    action?: StateType$1;
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
    from: StateType$1;
    to: StateType$1;
    action?: StateType$1;
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
    action: StateType$1;
    from: StateType$1;
    to?: StateType$1;
    data: mDT;
    next_data?: mDT;
};
/**
 *  Detail payload fired with an `entry` event.  `state` is the entered
 *  state.  `from` is the predecessor state, if any.  `action` is the
 *  action that drove the entry, if any.
 */
type JssmEntryEventDetail<mDT> = {
    state: StateType$1;
    from?: StateType$1;
    action?: StateType$1;
    data: mDT;
};
/**
 *  Detail payload fired with an `exit` event.  `state` is the exited
 *  state.  `to` is the next state, if any.  `action` is the action that
 *  drove the exit, if any.
 */
type JssmExitEventDetail<mDT> = {
    state: StateType$1;
    to?: StateType$1;
    action?: StateType$1;
    data: mDT;
};
/**
 *  Detail payload fired with a `terminal` event.  Indicates that the
 *  machine has reached a state with no outgoing edges.
 */
type JssmTerminalEventDetail<mDT> = {
    state: StateType$1;
    data: mDT;
};
/**
 *  Detail payload fired with a `complete` event.  Indicates that the
 *  machine has reached a FSL `complete` state.
 */
type JssmCompleteEventDetail<mDT> = {
    state: StateType$1;
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
    from?: StateType$1;
    to?: StateType$1;
    action?: StateType$1;
    old_data: mDT;
    new_data: mDT;
    cause: 'transition' | 'override' | 'set_data';
};
/**
 *  Detail payload fired with an `override` event.  Distinguishes a forced
 *  state replacement from a normal transition.
 */
type JssmOverrideEventDetail<mDT> = {
    from: StateType$1;
    to: StateType$1;
    old_data: mDT;
    new_data?: mDT;
};
/**
 *  Detail payload fired with a `timeout` event.  Fires when a configured
 *  `after` clause causes an automatic transition.
 */
type JssmTimeoutEventDetail = {
    from: StateType$1;
    to: StateType$1;
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
        from?: StateType$1;
        to?: StateType$1;
    };
    'rejection': Record<string, never>;
    'action': Record<string, never>;
    'entry': {
        state?: StateType$1;
    };
    'exit': {
        state?: StateType$1;
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

type StateType = string;

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
    _state: StateType;
    _states: Map<StateType, JssmGenericState>;
    _edges: Array<JssmTransition<StateType, mDT>>;
    _edge_map: Map<StateType, Map<StateType, number>>;
    _outbound_edge_ids: Map<StateType, Array<number>>;
    _named_transitions: Map<StateType, number>;
    _actions: Map<StateType, Map<StateType, number>>;
    _reverse_actions: Map<StateType, Map<StateType, number>>;
    _reverse_action_targets: Map<StateType, Map<StateType, number>>;
    _state_interner: Interner;
    _action_interner: Interner;
    _state_id: number;
    _edge_id_by_pair: Map<number, number>;
    _edge_id_by_action_pair: Map<number, number>;
    _edge_to_ids: Array<number>;
    _start_states: Set<StateType>;
    _start_state_weights: Map<StateType, number>;
    _end_states: Set<StateType>;
    _failed_outputs: Set<StateType>;
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
    _state_declarations: Map<StateType, JssmStateDeclaration>;
    _data?: mDT;
    _instance_name: string;
    _rng_seed: number;
    _rng: JssmRng;
    _graph_layout: JssmLayout;
    _dot_preamble: string;
    _default_transition_config: JssmTransitionConfig | undefined;
    _default_graph_config: JssmGraphConfig | undefined;
    _arrange_declaration: Array<Array<StateType>>;
    _arrange_start_declaration: Array<Array<StateType>>;
    _arrange_end_declaration: Array<Array<StateType>>;
    _oarrange_declaration: Array<Array<StateType>>;
    _farrange_declaration: Array<Array<StateType>>;
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
    _state_property_first_state: Map<string, StateType>;
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
    _state_to_groups: Map<StateType, Set<string>>;
    _group_order: string[];
    _static_state_config_cache: Map<StateType, JssmStateConfig>;
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
    constructor({ start_states, start_state_weights, end_states, failed_outputs, initial_state, start_states_no_enforce, complete, transitions, machine_author, machine_comment, machine_contributor, machine_definition, machine_language, machine_license, machine_name, machine_version, npm_name, default_size, state_declaration, property_definition, val_definition, vals, state_property, fsl_version, dot_preamble, arrange_declaration, arrange_start_declaration, arrange_end_declaration, oarrange_declaration, farrange_declaration, theme, flow, graph_layout, instance_name, history, boundary_depth_limit, data, default_state_config, default_active_state_config, default_hooked_state_config, default_terminal_state_config, default_start_state_config, default_end_state_config, default_transition_config, default_graph_config, group_registry, group_metadata, group_hooks, state_hooks, allows_override, config_allows_override, allow_islands, editor_config, rng_seed, time_source, timeout_source, clear_timeout_source }: JssmGenericConfig<StateType, mDT>);
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
    _new_state(state_config: JssmGenericState): StateType;
    /**
     *  Get the current state of a machine.  Delegates to the query family's
     *  {@link state}, which carries the full contract and example.
     *  @see state
     */
    state(): StateType;
    /**
     *  Get the label for a given state, if any.  Delegates to the query
     *  family's {@link label_for}, which carries the full contract and example.
     *  @see label_for
     */
    label_for(state: StateType): string;
    /**
     *  Get whatever the node should show as text.  Delegates to the query
     *  family's {@link display_text}, which carries the full contract and
     *  example.
     *  @see display_text
     */
    display_text(state: StateType): string;
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
    is_start_state(whichState: StateType): boolean;
    /**
     *  The initial distribution declared by a weighted `start_states` list
     *  (6.0).  Delegates to the stochastic family's
     *  {@link start_state_weights}, which carries the full contract and
     *  example.
     *  @see start_state_weights
     */
    start_state_weights(): Map<StateType, number>;
    /**
     *  Draws a start state from the weighted start distribution using the
     *  machine's RNG.  Delegates to the stochastic family's
     *  {@link sample_start_state}, which carries the full contract and
     *  example.
     *  @see sample_start_state
     */
    sample_start_state(): StateType;
    /**
     *  Check whether a given state is a declared end state.  Delegates to the
     *  query family's {@link is_end_state}, which carries the full contract
     *  and example.
     *  @see is_end_state
     */
    is_end_state(whichState: StateType): boolean;
    /**
     *  Get the set of states declared as failure outputs for this machine.
     *  Delegates to the query family's {@link failed_outputs}.
     *  @see failed_outputs
     */
    failed_outputs(): Array<StateType>;
    /**
     *  Check whether a given state is declared as a failure output.  Delegates
     *  to the query family's {@link is_failed_output}.
     *  @see is_failed_output
     */
    is_failed_output(whichState: StateType): boolean;
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
    state_is_final(whichState: StateType): boolean;
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
    state_declaration(which: StateType): JssmStateDeclaration;
    /**
     * Get all processed state declarations as a Map.  Delegates to the query
     *  family's {@link state_declarations}.
     *  @see state_declarations
     */
    state_declarations(): Map<StateType, JssmStateDeclaration>;
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
    states(): Array<StateType>;
    /**
     * Get the internal state descriptor for a given state name.  Delegates to
     *  the query family's {@link state_for}.
     *  @throws {JssmError} If the state does not exist.
     *  @see state_for
     */
    state_for(whichState: StateType): JssmGenericState;
    /**
     *  Check whether the machine knows a given state.  Delegates to the query
     *  family's {@link has_state}, which carries the full contract and example.
     *  @see has_state
     */
    has_state(whichState: StateType): boolean;
    /**
     *  Lists all edges of a machine.  Delegates to the query family's
     *  {@link list_edges}, which carries the full contract and example.
     *  @see list_edges
     */
    list_edges(): Array<JssmTransition<StateType, mDT>>;
    /**
     * Get the map of named transitions.  Delegates to the query family's
     *  {@link list_named_transitions}.
     *  @see list_named_transitions
     */
    list_named_transitions(): Map<StateType, number>;
    /**
     * List all distinct action names defined anywhere in the machine.
     *  Delegates to the query family's {@link list_actions}.
     *  @see list_actions
     */
    list_actions(): Array<StateType>;
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
    get_transition_by_state_names(from: StateType, to: StateType): number;
    /**
     * Look up the full transition object for a given source→target pair.
     *  Delegates to the query family's {@link lookup_transition_for}.
     *  @see lookup_transition_for
     */
    lookup_transition_for(from: StateType, to: StateType): JssmTransition<StateType, mDT>;
    /**
     *  List all transitions attached to a state, sorted by entrance and exit.
     *  Delegates to the query family's {@link list_transitions}, which carries
     *  the full contract and example.
     *  @see list_transitions
     */
    list_transitions(whichState?: StateType): JssmTransitionList;
    /**
     *  List all entrances attached to a state.  Delegates to the query
     *  family's {@link list_entrances}, which carries the full contract and
     *  example.
     *  @see list_entrances
     */
    list_entrances(whichState?: StateType): Array<StateType>;
    /**
     *  List all exits attached to a state.  Delegates to the query family's
     *  {@link list_exits}, which carries the full contract and example.
     *  @see list_exits
     */
    list_exits(whichState?: StateType): Array<StateType>;
    /**
     * Get the transitions available from a state for use by the probabilistic
     *  walk system.  Delegates to the stochastic family's
     *  {@link probable_exits_for}, which carries the full contract.
     *  @throws {JssmError} If the state does not exist.
     *  @see probable_exits_for
     */
    probable_exits_for(whichState: StateType): Array<JssmTransition<StateType, mDT>>;
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
    probabilistic_walk(n: number): Array<StateType>;
    /**
     * Take `n` probabilistic steps and return a histograph of the visits.
     *  Delegates to the stochastic family's {@link probabilistic_histo_walk},
     *  which carries the full contract.
     *  @see probabilistic_histo_walk
     */
    probabilistic_histo_walk(n: number): Map<StateType, number>;
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
    actions(whichState?: StateType): Array<StateType>;
    /**
     *  List all states that have a specific action attached.  Delegates to
     *  the query family's {@link list_states_having_action}, which carries the
     *  full contract and example.
     *  @throws {JssmError} If no state has the action.
     *  @see list_states_having_action
     */
    list_states_having_action(whichState: StateType): Array<StateType>;
    /**
     * List all action names available as exits from a given state.  Delegates
     *  to the query family's {@link list_exit_actions}, which carries the full
     *  contract and example.
     *  @throws {JssmError} If the state does not exist.
     *  @see list_exit_actions
     */
    list_exit_actions(whichState?: StateType): Array<StateType>;
    /**
     * List all action exits from a state with their probabilities and shares.
     *  Delegates to the query family's {@link probable_action_exits}, which
     *  carries the full contract.
     *  @throws {JssmError} If the state does not exist.
     *  @see probable_action_exits
     */
    probable_action_exits(whichState?: StateType): Array<any>;
    /**
     * Check whether a state has no incoming transitions.  Delegates to the
     *  query family's {@link is_unenterable}.
     *  @throws {JssmError} If the state does not exist.
     *  @see is_unenterable
     */
    is_unenterable(whichState: StateType): boolean;
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
    state_is_terminal(whichState: StateType): boolean;
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
    groupsOf(state: StateType): Set<string>;
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
    statesIn(groupName: string): Array<StateType>;
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
    state_is_complete(whichState: StateType): boolean;
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
    edges_between(from: string, to: string): JssmTransition<StateType, mDT>[];
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
    override(newState: StateType, newData?: mDT): void;
    /**
     *  Fire a `'rejection'` event caused by a hook vetoing a pending transition.
     *  Delegates to the transition family's {@link fire_hook_rejection}.
     *  @internal
     */
    _fire_hook_rejection(hook_name: string, fromState: StateType, newState: StateType, fromAction: StateType | undefined, oldData: mDT, newData: mDT | undefined, wasForced: boolean): void;
    /**
     *  Fire the FSL boundary-hook actions for an already-committed state
     *  change.  Delegates to the transition family's {@link fire_boundary_actions}.
     *  @internal
     */
    _fire_boundary_actions(prev_state: StateType, next_state: StateType): void;
    /**
     *  Shared transition core.  Delegates to the transition family's
     *  {@link transition_impl}, which carries the full contract.  The public
     *  movers on this class (`transition`, `go`, `force_transition`, `act`,
     *  `action`, `do`) call the family function directly rather than this
     *  delegate, so the class path is no deeper than it was in 5.x.
     *  @internal
     */
    transition_impl(newStateOrAction: StateType, newData: mDT | undefined, wasForced: boolean, wasAction: boolean, dataProvided?: boolean): boolean;
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
    get history(): Array<[StateType, mDT]>;
    /**
     *  Get a truncated history of the recent states and data of the machine,
     *  including the current state.  Delegates to the history family's
     *  {@link history_inclusive}.
     *  @see history_inclusive
     */
    get history_inclusive(): Array<[StateType, mDT]>;
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
    action(actionName: StateType, newData?: mDT): boolean;
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
    act(actionName: StateType, newData?: mDT): boolean;
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
    state_has_hooks(state: StateType): boolean;
    /**
     *  Resolves the full unified style/config cascade for a state.  Delegates
     *  to the style family's {@link resolve_state_config}, which carries the
     *  full contract and example.
     *  @see resolve_state_config
     */
    resolve_state_config(state: StateType): JssmStateConfig;
    /**
     *  Gets the composite style for a specific node — the public viz entry
     *  point.  Delegates to the style family's {@link style_for}, which
     *  carries the full contract.
     *  @see style_for
     */
    style_for(state: StateType): JssmStateConfig;
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
    do(actionName: StateType, newData?: mDT): boolean;
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
    transition(newState: StateType, newData?: mDT): boolean;
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
    go(newState: StateType, newData?: mDT): boolean;
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
    force_transition(newState: StateType, newData?: mDT): boolean;
    /**
     * Get the edge index for an action from the current state.  Delegates to
     *  the query family's {@link current_action_for}, which carries the full
     *  contract.
     *  @see current_action_for
     */
    current_action_for(action: StateType): number;
    /**
     * Get the full transition object for an action from the current state.
     *  Delegates to the query family's {@link current_action_edge_for}.
     *  @throws {JssmError} If the action is not available from the current state.
     *  @see current_action_edge_for
     */
    current_action_edge_for(action: StateType): JssmTransition<StateType, mDT>;
    /**
     * Check whether an action is available from the current state.  Delegates
     *  to the transition family's {@link valid_action}.
     *  @param action   - The action name to check.
     *  @param _newData - Reserved for future data validation.
     *  @returns `true` if the action can be taken.
     *  @see valid_action
     */
    valid_action(action: StateType, _newData?: mDT): boolean;
    /**
     * Check whether a transition to a given state is legal (non-forced) from
     *  the current state.  Delegates to the transition family's
     *  {@link valid_transition}.
     *  @param newState - The target state.
     *  @param _newData - Reserved for future data validation.
     *  @returns `true` if the transition is legal.
     *  @see valid_transition
     */
    valid_transition(newState: StateType, _newData?: mDT): boolean;
    /**
     * Check whether a forced transition to a given state exists from the
     *  current state.  Delegates to the transition family's
     *  {@link valid_force_transition}.
     *  @param newState - The target state.
     *  @param _newData - Reserved for future data validation.
     *  @returns `true` if a forced (or any) transition exists.
     *  @see valid_force_transition
     */
    valid_force_transition(newState: StateType, _newData?: mDT): boolean;
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
    set_state_timeout(next_state: StateType, after_time: number): void;
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
    state_timeout_for(which_state: StateType): [StateType, number] | undefined;
    /**
     *  Get the pending state timeout, if any.  Delegates to the timers
     *  family's {@link current_state_timeout}.
     *  @see current_state_timeout
     */
    current_state_timeout(): [StateType, number] | undefined;
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

/**
 *  How {@link machine_to_dot} renders FSL state groups (`&group : [ … ];`).
 *
 *  - `'cluster'` (default) — render the subset of groups that form a clean
 *    nesting tree as nested Graphviz `subgraph cluster_<group> { … }` boxes,
 *    deepest group innermost.  A state that genuinely *overlaps* two groups
 *    (member of two groups where neither nests inside the other) can only be
 *    drawn inside one cluster, so its remaining memberships are shown as
 *    bracketed chips appended to the node label.
 *  - `'chips'` — render *every* group membership as a chip on the node label
 *    and emit no clusters at all.  Useful when cluster boxes clutter the
 *    diagram or when overlap is pervasive.
 *  - `'off'` — ignore groups entirely; byte-for-byte the historical output.
 */
type RenderGroups = 'cluster' | 'chips' | 'off';
/**
 *  The Graphviz engine surface jssm/viz actually consumes: one ready-to-use
 *  object with a `renderString(dot, options)` method.  This is the contract
 *  for {@link configure}`({ viz })` injection — a *direct adapter*, not a
 *  factory: the caller instantiates (and, if needed, awaits) their engine
 *  themselves, then hands over the finished object.  `renderString` receives
 *  the dot source and an options object whose members jssm/viz uses are
 *  `format` (always `'svg'`) and `engine` (a Graphviz layout engine name,
 *  when the caller of a render function supplied one); it may return the
 *  output string synchronously (like `@viz-js/viz`) or as a promise (like
 *  asm.js `viz.js` 2.x), and jssm/viz awaits either.
 *
 *  ```typescript
 *  import { instance } from '@viz-js/viz';
 *  configure({ viz: await instance() });   // the default engine, injected by hand
 *  ```
 *  @see configure
 */
type VizEngine = {
    renderString: (dot: string, options?: {
        format?: string;
        engine?: string;
    }) => string | Promise<string>;
};
/**
 *  Inject runtime configuration for jssm/viz — a custom `DOMParser`
 *  constructor for the `*_svg_element` functions, a replacement Graphviz
 *  engine for every render path, or both.
 *
 *  Each key is handled independently.  Idempotent — last call wins per key;
 *  an omitted (or `undefined`) key leaves any earlier injection for that key
 *  in place, so neither injection can be un-set.  No-op if called with no
 *  recognized keys.
 *
 *  Precedence differs by key, on purpose:
 *
 *  - `DOMParser` is a *fallback* — `globalThis.DOMParser` (browsers, jsdom
 *    test environments) still wins when present.
 *  - `viz` is an *override* — once injected it is used for every render, and
 *    the default `@viz-js/viz` import is never even attempted.  This is what
 *    lets WASM-hostile environments (strict-CSP webviews such as VS Code's
 *    markdown preview) supply an asm.js Graphviz build at runtime, without
 *    bundler aliasing.  See {@link VizEngine} for the exact contract.
 *
 *  ```typescript
 *  // Node, with jsdom:
 *  import { JSDOM } from 'jsdom';
 *  import { configure, fsl_to_svg_element } from 'jssm/viz';
 *
 *  configure({ DOMParser: new JSDOM().window.DOMParser });
 *  const el = await fsl_to_svg_element('a -> b;');
 *  ```
 *
 *  ```typescript
 *  // strict-CSP webview, with an asm.js Graphviz:
 *  import { configure, fsl_to_svg_string } from 'jssm/viz';
 *
 *  configure({ viz: my_asm_graphviz });  // anything with renderString(dot, opts)
 *  const svg = await fsl_to_svg_string('a -> b;');
 *  ```
 *  @param opts Configuration overrides.
 *  @param opts.DOMParser Constructor compatible with the WHATWG `DOMParser`
 *  interface.  Used as a fallback when `globalThis.DOMParser` is undefined.
 *  @param opts.viz A ready-to-use Graphviz engine implementing
 *  {@link VizEngine} (`renderString(dot, opts)`).  Overrides the default
 *  `@viz-js/viz` engine for all subsequent renders.
 *  @throws {JssmError} if `DOMParser` is provided and is not a constructor.
 *  @throws {JssmError} if `viz` is provided and lacks a callable `renderString`.
 *  @see VizEngine
 */
declare function configure(opts: {
    DOMParser?: typeof globalThis.DOMParser;
    viz?: VizEngine;
}): void;
/**
 *  Look up a color from the default viz palette by key, returning empty
 *  string if the key is unknown (so it disappears in feature concatenation).
 *  @internal
 */
declare function vc(col: string): string;
/**
 *  Escape a string for safe interpolation inside a DOT double-quoted
 *  attribute value.  Escapes every `\` and `"` so that group names, state
 *  labels, and chip labels containing either character produce valid,
 *  parseable DOT source.
 *
 *  Backslash is escaped *first*: a label ending in `\` would otherwise emit
 *  `label="a\"`, whose `\"` escapes the closing quote and corrupts the DOT so
 *  the whole render throws.  Escaping `\`→`\\` before `"`→`\"` avoids
 *  double-escaping the backslashes the quote step introduces.  StoneCypher/fsl#1951
 *
 *  ```typescript
 *  doublequote('a"b');   // 'a\\"b'
 *  doublequote('a\\');   // 'a\\\\'
 *  doublequote('safe');  // 'safe'
 *  ```
 *  @param txt Any string that will be placed inside `"…"` in a DOT attribute.
 *  @returns The string with every `\` and `"` backslash-escaped.
 *  @internal
 */
declare function doublequote(txt: string): string;
/**
 *  Reverse {@link doublequote}: turn DOT's `\"` escape back into the literal
 *  `"` that graphviz renders into SVG `<text>` content.  Used by
 *  {@link state_svg_label_texts} to reconstruct a node's on-screen label from
 *  the DOT label it was handed, so the fence renderer keys against exactly what
 *  was drawn.
 *
 *  ```typescript
 *  undoublequote('a\\"b');  // 'a"b'
 *  undoublequote('safe');   // 'safe'
 *  ```
 *  @param txt A DOT-escaped attribute string (as produced by `doublequote`).
 *  @returns The string with every `\"` collapsed back to `"`.
 *  @internal
 */
declare function undoublequote(txt: string): string;
/**
 *  Convert a state name into a URL-friendly slug suitable for use as the
 *  body of a dot/SVG node identifier.  The transformation is:
 *
 *  1. Lowercase
 *  2. Any run of characters outside `[a-z0-9]` (after lowercasing) becomes
 *     a single `-`
 *  3. Leading and trailing `-` are trimmed
 *
 *  If the result is empty (e.g. for a state named `"!!!"`), the empty
 *  string is returned — callers are expected to fall back to an indexed
 *  placeholder like `node-N`.  See {@link slug_states} for the collision-
 *  resolving wrapper that consumes this helper.
 *
 *  ```typescript
 *  slug_for('Green Light');  // 'green-light'
 *  slug_for('!!!');          // ''
 *  slug_for('  Foo  Bar  '); // 'foo-bar'
 *  ```
 *  Exported so consumers which must match rendered SVG node `<title>`s back
 *  to state names (notably `FslViz.highlightTrace`, fsl#1935) can slug with
 *  the *same* function the dot generator used, rather than a drifting copy.
 *  @param state The state name to slugify.
 *  @returns The lowercase hyphen-separated slug, or empty string if none of
 *  the characters were retainable.
 *  @see slug_states
 *  @internal
 */
declare function slug_for(state: string): string;
/**
 *  Build a `Map<state, slug>` assigning every state in `states` a unique,
 *  deterministic, URL-safe slug used as its dot/SVG node identifier.
 *
 *  Algorithm:
 *
 *  1. Slug each state via {@link slug_for}.  States whose slug comes out
 *     empty fall back to `node-N`, where `N` is the state's declaration
 *     index (1-based, to match user-visible numbering).
 *  2. Walk the state list in declaration order, tracking how many times
 *     each base slug has already been used.  The first occurrence keeps
 *     the base slug; subsequent collisions get `-2`, `-3`, … suffixes.
 *     If the proposed suffixed slug itself collides with a base slug
 *     used later, the counter advances until a free slot is found.
 *
 *  This yields a deterministic mapping given the state-declaration order,
 *  so output is stable across runs.
 *
 *  ```typescript
 *  slug_states(['Red Light', 'red-light']);
 *  // Map { 'Red Light' => 'red-light', 'red-light' => 'red-light-2' }
 *
 *  slug_states(['!!!', '???']);
 *  // Map { '!!!' => 'node-1', '???' => 'node-2' }
 *  ```
 *  @param states States in declaration order.
 *  @returns A `Map` from each state name to its unique slug.
 *  @internal
 */
declare function slug_states(states: string[]): Map<string, string>;
/**
 *  Build a graphviz-safe node identifier for a state.  Accepts either a
 *  `string[]` (legacy test-only path; returns an index-based `n0`/`n1`
 *  identifier via `indexOf`), or a precomputed `Map<state, slug>` produced
 *  by {@link slug_states} (used by all rendering hot paths).
 *
 *  When a slug map is supplied, the identifier is the slug wrapped in
 *  double quotes — dot allows quoted identifiers, and the slug alphabet
 *  (lowercase alphanumerics + `-`) requires quoting because bare dot IDs
 *  may not contain `-`.  Graphviz round-trips the quoted form through to
 *  the SVG `<title>` element and uses the slug as a stable basis for the
 *  generated SVG element `id` attribute.
 *
 *  ```typescript
 *  node_of('Red Light', new Map([['Red Light', 'red-light']]));
 *  // '"red-light"'
 *  ```
 *  @internal
 */
declare function node_of(state: string, state_index: string[] | Map<string, number> | Map<string, string>): string;
/**
 *  Convert an 8-channel hex color (`#RRGGBBAA`) to a 6-channel hex color
 *  (`#RRGGBB`), discarding the alpha channel.  Throws if the input is not
 *  a 9-character `#`-prefixed string.
 *
 *  Graphviz dot does not support alpha; this is a lossy projection.
 *  @internal
 */
declare function color8to6(color8: string): string;
/**
 *  Variant of {@link color8to6} that passes `undefined` through.
 *  @internal
 */
declare function u_color8to6(color8?: string): string | undefined;
/**
 *  Read the graphviz shape for a state through {@link jssm.Machine.style_for},
 *  so theme-supplied shapes are honoured along with per-state declarations.
 *  Returns `undefined` if neither a theme nor a state declaration supplies a
 *  shape.
 *  @internal
 */
declare function shape_for_state<T>(u_jssm: Machine<T>, state: string): string | undefined;
/**
 *  Read the image filename for a state through {@link jssm.Machine.style_for},
 *  so theme-supplied images are honoured along with per-state declarations.
 *  Returns `undefined` if neither a theme nor a state declaration supplies an
 *  image.
 *  @internal
 */
declare function image_for_state<T>(u_jssm: Machine<T>, state: string): string | undefined;
/**
 *  Compose a graphviz `style` string for a state by looking up its merged
 *  style via {@link jssm.Machine.style_for}, then delegating to
 *  {@link compose_style_string}.  Theme-supplied `corners` and `lineStyle`
 *  are honoured along with per-state declarations.
 *  @internal
 */
declare function style_for_state<T>(u_jssm: Machine<T>, state: string): string;
/**
 *  Map a single `transition: {}` config item (`{ key, value }`) to a Graphviz
 *  edge*-scope attribute `name="value"` pair, or `undefined` when the key has
 *  no edge-meaningful projection.  Mirrors the per-node mapping in
 *  {@link state_node_line}, but targets the attribute names Graphviz uses on
 *  edges:
 *
 *  - `color` and the legacy `graph_default_edge_color` both set the edge line
 *    `color`.
 *  - `text-color`  → edge label `fontcolor`.
 *  - `line-style`  → edge `style` (`dashed`/`dotted`/`solid` pass through).
 *
 *  Node-only keys (`background-color`, `shape`, `corners`, `image`, `url`,
 *  `state-label`, `border-color`) have no edge meaning and yield `undefined`,
 *  so they are dropped from the `edge [ … ]` default statement.
 *  @internal
 */
declare function edge_attr_for(key: string, value: string): string | undefined;
/**
 *  Project a {@link JssmTransitionConfig} (the compiled `transition: {}` block)
 *  onto the body of a Graphviz default-edge statement — the attribute list that
 *  belongs inside `edge [ … ];`.  Per-key last-wins is already applied by the
 *  compiler, so the list is walked in order and each edge-meaningful key
 *  (see {@link edge_attr_for}) contributes one attribute.  Returns the empty
 *  string when the config is absent or contributes nothing, so a machine with
 *  no `transition: {}` block produces byte-identical output to before.
 *
 *  ```typescript
 *  edge_defaults_body([{ key: 'color', value: '#0000ffff' }]);
 *  // 'color="#0000ffff"'
 *  ```
 *  @internal
 */
declare function edge_defaults_body(config: JssmTransitionConfig | undefined): string;
/**
 *  Map a single `graph: {}` config item (`{ key, value }`) to a Graphviz
 *  graph*-scope attribute `name="value"` pair, or `undefined` when the key is
 *  either not graph-meaningful or already handled by another machine path
 *  (`graph_layout` → SVG engine, `flow` → `rankdir`, `theme` → style cascade,
 *  `dot_preamble` → preamble).  `background-color` is handled separately — it
 *  feeds the existing single `bgcolor` slot in {@link dot_template} so it is
 *  never double-emitted — and so is excluded here.
 *
 *  - `color`      → graph `color` (cluster/graph border).
 *  - `text-color` → graph `fontcolor`.
 *  @internal
 */
declare function graph_attr_for(key: string, value: string): string | undefined;
/**
 *  Read the effective graph background color from a {@link JssmGraphConfig},
 *  honouring the `background-color` item the compiler folded `graph_bg_color`
 *  into (and into which an explicit `graph: { background-color: … }` block
 *  already won, last-wins).  Falls back to the supplied palette default when
 *  the config carries no background color, so output is unchanged for machines
 *  without a `graph: {}` background.
 *
 *  This is the single reconciliation point for the graph background: the value
 *  it returns flows into {@link dot_template}'s one `bgcolor="…"` slot, so the
 *  `graph: {}` value wins over the legacy alias and is never emitted twice.
 *  @internal
 */
declare function graph_bg_color_from_config(config: JssmGraphConfig | undefined, fallback: string): string;
/**
 *  Project the graph-scope attributes of a {@link JssmGraphConfig} that are NOT
 *  the background color (handled via {@link graph_bg_color_from_config}) onto
 *  one Graphviz graph attribute statement per key (e.g. `color="…";`).  Returns
 *  the empty string when nothing applies, so machines without graph-scope color
 *  attributes are byte-identical to before.
 *  @internal
 */
declare function graph_attrs_body(config: JssmGraphConfig | undefined): string;
/**
 *  Classification of a state for viz styling purposes.  Each bucket is
 *  meaningfully distinct:
 *
 *  - `final`    — the state is both terminal AND complete (the strongest
 *                 form; user-marked complete *and* has no exits).
 *  - `complete` — the state is user-marked complete but still has exits.
 *  - `terminal` — the state has no exits but is not user-marked complete
 *                 (automatic / structural terminus).
 *  - `base`     — none of the above.
 *
 *  Historical note: the viz code used to check `state_is_final` first,
 *  which made the `complete` and `terminal` branches structurally
 *  unreachable (because `state_is_final` in the jssm core is itself
 *  `terminal || complete`).  That meant per-state-kind styling
 *  differences were silently absent for any state that was only complete
 *  or only terminal — a long-standing bug.  The fix is to check the two
 *  underlying predicates directly so the three named buckets reflect
 *  three meaningfully distinct conditions.
 *  @internal
 */
type StateKind = 'final' | 'complete' | 'terminal' | 'base';
/**
 *  Slugify a group name into the body of a Graphviz `cluster_…` subgraph
 *  identifier.  Graphviz treats any `subgraph` whose name begins with the
 *  literal `cluster` as a visually-boxed cluster, so the emitted name is
 *  `cluster_<slug>_<index>`.  The slug alphabet is lowercase alphanumerics
 *  joined by `_`; a name that slugs to empty (e.g. `&"!!!"`) falls back to
 *  `g<index>` (the index alone, no slug component).  The `_<index>` suffix
 *  guarantees every group gets a unique cluster id even when two distinct
 *  names happen to slugify identically (e.g. `"Active Players"` and
 *  `"active-players"` both slug to `active_players`).
 *
 *  ```typescript
 *  cluster_id_for('Active Players', 0);  // 'cluster_active_players_0'
 *  cluster_id_for('!!!', 3);             // 'cluster_g3'
 *  ```
 *  @param group The FSL group name.
 *  @param index The group's stable declaration-order index (0-based); included
 *  in the emitted id to prevent slug collisions.
 *  @returns A valid Graphviz subgraph identifier starting with `cluster_`.
 *  @internal
 */
declare function cluster_id_for(group: string, index: number): string;
/**
 *  Append group-membership chips to a node label.  Each extra group becomes a
 *  bracketed suffix (e.g. `Foo [overlap] [extra]`), so a node that the cluster
 *  tree can only place in its primary group still surfaces its other
 *  memberships visually.  With no chips the label is returned verbatim, so
 *  chip-free output is byte-identical to the historical label.
 *
 *  ```typescript
 *  label_with_chips('Foo', []);              // 'Foo'
 *  label_with_chips('Foo', ['a', 'b']);      // 'Foo [a] [b]'
 *  ```
 *  @internal
 */
declare function label_with_chips(label: string, chips: string[]): string;
/**
 *  Build the group→parent-group map used to lay groups out as a properly
 *  nested cluster tree.  Graphviz clusters must nest strictly (a node lives in
 *  exactly one innermost cluster, and clusters may not partially overlap), but
 *  the FSL group registry is a DAG — a sub-group may be referenced by several
 *  parents.  We therefore pick, for each group that is referenced as a
 *  `group`-kind member, a single *primary* parent: the earliest-declared group
 *  that lists it.  Groups with no parent are roots.
 *
 *  ```typescript
 *  // for `&inner:[a]; &outer:[&inner b];`
 *  // group_parent_map(reg, ['inner','outer']) === Map { 'inner' => 'outer' }
 *  ```
 *  @internal
 */
declare function group_parent_map(registry: Map<string, JssmGroupMemberRef[]>, order: string[]): Map<string, string>;
/**
 *  Walk the primary-parent chain of a group up to its root, returning the
 *  ancestor set *including the group itself*.  Used both to nest clusters and
 *  to decide which of a state's memberships its primary cluster already
 *  represents (so the rest become chips).
 *  @internal
 */
declare function group_ancestry(group: string, parents: Map<string, string>): Set<string>;
/**
 *  Choose the *primary* cluster for a state: the innermost (smallest
 *  {@link membership_distance}) group containing it, ties broken by latest
 *  declaration order — the same precedence the config cascade uses, so a
 *  state's cluster placement agrees with the group whose style won.  Returns
 *  `undefined` for a state in no group.
 *  @internal
 */
declare function primary_group_for<T>(u_jssm: Machine<T>, state: string, order: string[]): string | undefined;
/**
 *  Plan how each state's groups are rendered in `'cluster'` mode.  Produces,
 *  per state, the *primary* cluster it is placed in (or `undefined` for an
 *  ungrouped state) plus the *chip* groups — memberships the primary cluster's
 *  ancestry does not already represent, i.e. genuine overlap that nesting
 *  cannot show.
 *  @returns `{ placement, chips }` where `placement` maps state → primary
 *  group, and `chips` maps state → the overflow group names (declaration
 *  order).
 *  @internal
 */
declare function plan_cluster_groups<T>(u_jssm: Machine<T>, l_states: string[], order: string[], parents: Map<string, string>): {
    placement: Map<string, string>;
    chips: Map<string, string[]>;
};
/**
 *  Emit the nested-cluster DOT for a machine's groups, weaving each state's
 *  node statement into its primary cluster's `subgraph cluster_<group> { … }`
 *  block, deepest group innermost.  Roots (groups with no primary parent) are
 *  emitted at top level; ungrouped states are returned separately so the
 *  caller can place them outside every cluster.
 *
 *  The cluster tree follows {@link group_parent_map} — the strict-nesting
 *  subset of the group DAG — so output is always valid Graphviz even when the
 *  source groups genuinely overlap; the unrepresentable memberships travel as
 *  chips on the node label instead (see {@link plan_cluster_groups}).
 *
 *  ```typescript
 *  // for `&inner:[a]; &outer:[&inner b]; a -> b;` the result contains
 *  //   subgraph cluster_outer { label="outer"; … subgraph cluster_inner { … } }
 *  ```
 *  @returns `{ clusters, ungrouped_nodes }` — the cluster DOT block and the
 *  node statements for states in no group.
 *  @internal
 */
declare function groups_to_subgraph_string<T>(u_jssm: Machine<T>, l_states: string[], state_index: Map<string, string>, state_kinds: Map<string, StateKind>, hide_state_labels: boolean): {
    clusters: string;
    ungrouped_nodes: string;
};
/**
 *  Build the per-state chip map for `'chips'` mode: every group a state
 *  belongs to, in declaration order, becomes a chip on its label, and no
 *  clusters are emitted at all.  This is the all-chips counterpart to the
 *  overflow-only chips produced by {@link plan_cluster_groups}.
 *
 *  ```typescript
 *  // for `&inner:[a]; &outer:[&inner b]; a -> b;`
 *  // chips_for_all_groups(m, ['a','b']) === Map { 'a' => ['inner','outer'], 'b' => ['outer'] }
 *  ```
 *  @internal
 */
declare function chips_for_all_groups<T>(u_jssm: Machine<T>, l_states: string[]): Map<string, string[]>;
/**
 *  Options for the dot/SVG render entry points.
 *
 *  - `hide_state_labels` (default `false`) — when `true`, the rendered dot
 *    output omits the `label=` attribute on every state's node line.
 *    Graphviz then draws the box without any text inside.  Useful for
 *    diagrams where shape, color, or layout alone carry the meaning
 *    (icon-only diagrams, tutorial graphics, presentation slides).
 *  - `footer` — verbatim dot source inserted just before the closing `}`
 *    of the generated dot source (e.g. `labelloc="b"; label="caption";`).
 *  - `engine` — graphviz layout engine for the SVG render path (e.g.
 *    `dot`, `neato`, `circo`); honored by `fsl_to_svg_string`.
 *  - `render_groups` (default `'cluster'`) — how FSL state groups are drawn;
 *    see {@link RenderGroups}.  `'off'` reproduces the historical, group-blind
 *    output byte-for-byte.
 */
type VizRenderOpts = {
    hide_state_labels?: boolean;
    footer?: string;
    engine?: string;
    render_groups?: RenderGroups;
};
/**
 *  Assemble the node-declaration block for a machine, honouring the
 *  `render_groups` mode:
 *
 *  - `'cluster'` — emit nested `subgraph cluster_<group> { … }` boxes via
 *    {@link groups_to_subgraph_string}, with each member node statement woven
 *    into its primary cluster and overlap memberships chipped onto the label.
 *  - `'chips'`   — emit a flat node list (no clusters) with *every* group
 *    membership rendered as a label chip (see {@link chips_for_all_groups}).
 *  - `'off'`     — emit the historical flat node list, ignoring groups
 *    entirely; output is byte-identical to the pre-groups renderer.
 *
 *  A machine that declares no groups produces the same flat node list in every
 *  mode, so `'cluster'`/`'chips'` are no-ops there.
 *  @internal
 */
declare function node_block_for<T>(u_jssm: Machine<T>, l_states: string[], state_index: Map<string, string>, state_kinds: Map<string, StateKind>, hide_labels: boolean, mode: RenderGroups): string;
/**
 *  The per-state group-chip map that {@link node_block_for} appends to labels
 *  in a given render mode.  Mirrors that function's mode dispatch and calls the
 *  very same chip sources — {@link chips_for_all_groups} for `'chips'`,
 *  {@link plan_cluster_groups} (with identical inputs) for `'cluster'` — so a
 *  reconstructed label can never disagree with the one graphviz was handed.
 *  `'off'`, and any machine that declares no groups, yields an empty map.
 *  @internal
 */
declare function chips_for_render_mode<T>(u_jssm: Machine<T>, l_states: string[], mode: RenderGroups): Map<string, string[]>;
/**
 *  The exact text graphviz places in each state's SVG `<text>` element(s) when
 *  a machine is rendered via {@link machine_to_dot} / {@link fsl_to_svg_string}:
 *  the state's display text plus any group chips the node builder appends, with
 *  DOT's `\"` escaping undone (SVG carries the literal character).  A label that
 *  wraps across lines becomes several `<text>` elements; this returns the lines
 *  joined by `\n`, exactly how `extract_state_fills` reads them back — so
 *  the derived key and the extracted key meet at the same string.
 *
 *  This is the single source of truth the static fence renderer keys its
 *  highlight and recolor lookups against, so those lookups can never drift from
 *  what was actually drawn — plain labels, group chips, and multi-line wraps
 *  alike.  It is built by running the node builder's own
 *  `label_with_chips(doublequote(display_text), chips)` and inverting the one
 *  escaping step, so it follows any change to the label format for free.
 *  @param u_jssm The machine being rendered.
 *  @param opts Render flags; only `render_groups` affects the label text
 *  (default `'cluster'`, matching `fsl_to_svg_string`).
 *  @returns A map from each state name to its rendered SVG label text.
 *
 *  ```typescript
 *  import { sm } from 'jssm';
 *  import { state_svg_label_texts } from 'jssm/viz';
 *
 *  // a state in two groups renders a chip suffix in its node label
 *  state_svg_label_texts(sm`&g1 : [a b]; &g2 : [a]; a -> b;`).get('a');  // 'a [g1]'
 *  state_svg_label_texts(sm`a -> b;`).get('a');                          // 'a'
 *  ```
 *  @see extract_state_fills
 */
declare function state_svg_label_texts<T>(u_jssm: Machine<T>, opts?: VizRenderOpts): Map<string, string>;
/**
 *  Render a {@link jssm.Machine} as a graphviz dot string.
 *
 *  An optional `footer` may be supplied via `opts.footer`; it is emitted
 *  verbatim just before the closing `}` of the dot source, after all
 *  arrange declarations.  This is a function-argument-only feature for
 *  the moment — a machine-attribute equivalent is planned as a follow-up.
 *
 *  ```typescript
 *  import { sm } from 'jssm';
 *  import { machine_to_dot } from 'jssm/viz';
 *
 *  const dot = machine_to_dot(sm`a -> b;`);
 *  // 'digraph G { ... }'
 *
 *  // suppress state-name labels (boxes only, no text inside)
 *  const dot2 = machine_to_dot(sm`a -> b;`, { hide_state_labels: true });
 *
 *  const dot_with_footer = machine_to_dot(sm`a -> b;`, { footer: 'labelloc="b"; label="caption";' });
 *  // 'digraph G { ... labelloc="b"; label="caption"; }'
 *
 *  // render FSL state groups as nested clusters (the default)
 *  const grouped = machine_to_dot(sm`&g : [a b]; a -> b;`);
 *  // 'digraph G { ... subgraph cluster_g { label="g"; ... } ... }'
 *
 *  // or as label chips, with no cluster boxes
 *  const chipped = machine_to_dot(sm`&g : [a b]; a -> b;`, { render_groups: 'chips' });
 *  ```
 *  @param u_jssm The machine to render.
 *  @param opts Optional render flags.  See {@link VizRenderOpts}.
 *  @returns A complete graphviz dot source string.
 */
declare function machine_to_dot<T>(u_jssm: Machine<T>, opts?: VizRenderOpts): string;
/**
 *  Render an FSL string directly to graphviz dot source.
 *
 *  ```typescript
 *  import { fsl_to_dot } from 'jssm/viz';
 *  const dot = fsl_to_dot('a -> b;');
 *
 *  // suppress state-name labels
 *  const dot2 = fsl_to_dot('a -> b;', { hide_state_labels: true });
 *
 *  const dot_with_footer = fsl_to_dot('a -> b;', { footer: 'label="caption";' });
 *  // 'digraph G { ... label="caption"; }'
 *  ```
 *  @param fsl The FSL source.
 *  @param opts Optional render flags.  See {@link VizRenderOpts}.
 *  @returns A complete graphviz dot source string.
 */
declare function fsl_to_dot(fsl: string, opts?: VizRenderOpts): string;
/**
 *  Render a graphviz dot source string to SVG using `@viz-js/viz`, or the
 *  engine injected via {@link configure}`({ viz })` when one is set.  The
 *  default viz instance is lazy-initialized on first call and cached for
 *  the lifetime of the module; an injected engine bypasses it entirely.
 *
 *  ```typescript
 *  const svg = await dot_to_svg('digraph G { a -> b }');
 *  const svg_neato = await dot_to_svg('digraph G { a -> b }', { engine: 'neato' });
 *  ```
 *  @param dot Graphviz dot source.
 *  @param options Optional renderer overrides.
 *  @param options.engine Graphviz layout engine to use (e.g. `'dot'`,
 *  `'neato'`, `'circo'`).  Unrecognized engine names cause `@viz-js/viz`
 *  to throw at render time.
 *  @returns A promise resolving to an SVG XML string.
 */
declare function dot_to_svg(dot: string, options?: {
    engine?: string;
}): Promise<string>;
/**
 *  Render an FSL string directly to SVG.
 *
 *  ```typescript
 *  const svg = await fsl_to_svg_string('a -> b;');
 *  const svg_neato = await fsl_to_svg_string('a -> b;', { engine: 'neato' });
 *  ```
 *  @param fsl The FSL source.
 *  @param opts Optional render flags.  See {@link VizRenderOpts}.
 *  @returns A promise resolving to an SVG XML string.
 */
declare function fsl_to_svg_string(fsl: string, opts?: VizRenderOpts): Promise<string>;
/**
 *  Render a {@link jssm.Machine} to SVG.
 *  @param u_jssm The machine to render.
 *  @param opts Optional render flags.  See {@link VizRenderOpts}.
 *  @returns A promise resolving to an SVG XML string.
 */
declare function machine_to_svg_string<T>(u_jssm: Machine<T>, opts?: VizRenderOpts): Promise<string>;
/**
 *  Render an FSL string directly to a parsed `SVGSVGElement`.
 *  @param fsl The FSL source.
 *  @param opts Optional render flags.  See {@link VizRenderOpts}.
 *  @returns A promise resolving to a parsed `SVGSVGElement`.
 *  @throws {JssmError} if no `DOMParser` is available (Node without `configure`).
 */
declare function fsl_to_svg_element(fsl: string, opts?: VizRenderOpts): Promise<SVGSVGElement>;
/**
 *  Render a {@link jssm.Machine} to a parsed `SVGSVGElement`.
 *  @param u_jssm The machine to render.
 *  @param opts Optional render flags.  See {@link VizRenderOpts}.
 *  @returns A promise resolving to a parsed `SVGSVGElement`.
 *  @throws {JssmError} if no `DOMParser` is available (Node without `configure`).
 */
declare function machine_to_svg_element<T>(u_jssm: Machine<T>, opts?: VizRenderOpts): Promise<SVGSVGElement>;
/**
 *  Compatibility wrapper for {@link machine_to_dot}, retained from
 *  jssm-viz.  Will be removed in the next major.
 *  @deprecated Use {@link machine_to_dot} instead.
 */
declare function dot<T>(machine: Machine<T>): string;

/** @internal */
declare const _test: {
    doublequote: typeof doublequote;
    color8to6: typeof color8to6;
    u_color8to6: typeof u_color8to6;
    vc: typeof vc;
    node_of: typeof node_of;
    slug_for: typeof slug_for;
    slug_states: typeof slug_states;
    shape_for_state: typeof shape_for_state;
    image_for_state: typeof image_for_state;
    style_for_state: typeof style_for_state;
    cluster_id_for: typeof cluster_id_for;
    label_with_chips: typeof label_with_chips;
    undoublequote: typeof undoublequote;
    group_parent_map: typeof group_parent_map;
    group_ancestry: typeof group_ancestry;
    primary_group_for: typeof primary_group_for;
    plan_cluster_groups: typeof plan_cluster_groups;
    groups_to_subgraph_string: typeof groups_to_subgraph_string;
    chips_for_all_groups: typeof chips_for_all_groups;
    node_block_for: typeof node_block_for;
    chips_for_render_mode: typeof chips_for_render_mode;
    edge_attr_for: typeof edge_attr_for;
    edge_defaults_body: typeof edge_defaults_body;
    graph_attr_for: typeof graph_attr_for;
    graph_attrs_body: typeof graph_attrs_body;
    graph_bg_color_from_config: typeof graph_bg_color_from_config;
};

export { _test, build_time, configure, dot, dot_to_svg, fsl_to_dot, fsl_to_svg_element, fsl_to_svg_string, machine_to_dot, machine_to_svg_element, machine_to_svg_string, slug_for, state_svg_label_texts, version };
export type { RenderGroups, VizEngine, VizRenderOpts };
