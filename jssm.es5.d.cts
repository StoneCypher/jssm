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
 *  The set of ASCII arrow tokens recognized by the FSL grammar.  Each arrow
 *  encodes a direction (one-way left/right, or two-way) and a "kind" for
 *  each direction (`-` legal, `=` main path, `~` forced-only).  See the
 *  Language Reference docs for the full semantic table.
 */
type JssmArrow = '->' | '<-' | '<->' | '<=->' | '<~->' | '=>' | '<=' | '<=>' | '<-=>' | '<~=>' | '~>' | '<~' | '<~>' | '<-~>' | '<=~>';
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
type JssmTransitionPermitter<DataType> = (OldState: StateType$1, NewState: StateType$1, OldData: DataType, NewData: DataType) => boolean;
type JssmTransitionPermitterMaybeArray<DataType> = JssmTransitionPermitter<DataType> | Array<JssmTransitionPermitter<DataType>>;
/**
 *  A single directed transition (edge) within a state machine.  Captures
 *  both the topology (`from` / `to`), the FSL semantics (`kind`,
 *  `forced_only`, `main_path`), and any optional metadata such as a
 *  per-edge `name`, an action label, a guard `check`, a transition
 *  `probability` for stochastic models, and an `after_time` for timed
 *  transitions.
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
    end_states?: Array<StateType>;
    failed_outputs?: Array<StateType>;
    initial_state?: StateType;
    start_states_no_enforce?: boolean;
    state_declaration?: object[];
    property_definition?: JssmPropertyDefinition[];
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
    machine_version?: string;
    npm_name?: string;
    default_size?: JssmDefaultSize;
    fsl_version?: string;
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
    timeout_source?: (Function: any, number: any) => number;
    clear_timeout_source?: (number: any) => void;
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
    kind: JssmArrow;
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
 */
type HookContext<mDT> = {
    data: mDT;
    next_data: mDT;
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
 * instead of calling such a machine valid. The `Machine` import closes a cycle
 * (`jssm` re-exports this module), but it is only referenced at call time inside
 * {@link fslDiagnostics}, never during module initialization, so the cycle is
 * benign.
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
/** The fully-parsed, validated description of one FSL Markdown fence block. */
interface FenceDescriptor {
    parts: FencePart[];
    ide: boolean;
    format: FenceImageFormat;
    width: FenceDimension | null;
    height: FenceDimension | null;
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
 *  classified as parts, image formats, the `ide` macro, or `width`/`height`
 *  options.  Unrecognized or conflicting tokens are dropped and recorded in
 *  `notes` rather than throwing, so a host can render forward-compatibly.
 *  @param info The full fence info string, e.g. `'fsl image code width=300'`.
 *  @returns The validated descriptor; `notes` lists anything ignored or overridden.
 *  @example parse_fence_info('fsl').parts // => ['image', 'code']
 *  @example parse_fence_info('fsl code image').parts // => ['code', 'image']
 */
declare function parse_fence_info(info: string): FenceDescriptor;

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
 *  probably also using {@link compile} and {@link Machine.constructor}.
 *
 *  ```typescript
 *  import { parse, compile, Machine } from 'jssm';
 *
 *  const intermediate = wrap_parse('a -> b;', {});
 *  // [ {key:'transition', from:'a', se:{kind:'->',to:'b'}} ]
 *
 *  const cfg = compile(intermediate);
 *  // { start_states:['a'], transitions: [{ from:'a', to:'b', kind:'legal', forced_only:false, main_path:false }] }
 *
 *  const machine = new Machine(cfg);
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
 *  @param input The FSL code to be evaluated
 *
 *  @param options Things to control about the instance.  Pass
 *                 `{ locations: true }` to enable opt-in source location
 *                 tracking on every AST node.
 *
 */
declare function wrap_parse(input: string, options?: object): any;
/*********
 *
 *  Compile a machine's JSON intermediate representation to a config object.  If
 *  you're using this (probably don't,) you're probably also using
 *  {@link parse} to get the IR, and the object constructor
 *  {@link Machine.constructor} to turn the config object into a workable machine.
 *
 *  ```typescript
 *  import { parse, compile, Machine } from 'jssm';
 *
 *  const intermediate = parse('a -> b;');
 *  // [ {key:'transition', from:'a', se:{kind:'->',to:'b'}} ]
 *
 *  const cfg = compile(intermediate);
 *  // { start_states:['a'], transitions: [{ from:'a', to:'b', kind:'legal', forced_only:false, main_path:false }] }
 *
 *  const machine = new Machine(cfg);
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
 *  missing the property are treated as weight 1.
 *
 *  ```typescript
 *  const opts = [
 *    { value: 'common',  probability: 0.8 },
 *    { value: 'rare',    probability: 0.2 }
 *  ];
 *
 *  weighted_rand_select(opts);  // most often { value: 'common', ... }
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
declare const weighted_rand_select: (options: Array<any>, probability_property: string, rng: JssmRng) => any;
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
declare const gviz_shapes$1: string[];
/**
 *  Public alias for {@link gviz_shapes}.  The list of node shapes supported
 *  by Graphviz that jssm-viz accepts in FSL `state ... : { shape: ... }`
 *  declarations.
 */
declare const shapes$1: string[];
/*******
 *
 *  List of CSS/SVG named colors accepted by jssm-viz for state styling
 *  properties like `background-color` and `text-color`.  Case-insensitive
 *  matching is done at parse time; the canonical casing here follows the
 *  CSS specification.
 *
 */
declare const named_colors$1: string[];
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
 *  Inclusive character ranges accepted by `AtomLetter` — i.e., the characters
 *  legal in any but the first position of an FSL state name (atom).
 *
 *  Includes ASCII digits/letters and the symbols
 *  `.`, `+`, `_`, `^`, `(`, `)`, `*`, `&`, `$`, `#`, `@`, `!`, `?`, `,`,
 *  plus the high-Unicode range `U+0080`–`U+FFFF`.
 *  @example
 *  import { state_name_chars } from 'jssm';
 *  state_name_chars.some(r => 'A' >= r.from && 'A' <= r.to);  // => true
 */
declare const state_name_chars$1: ReadonlyArray<{
    from: string;
    to: string;
}>;
/**
 *  Inclusive character ranges accepted by `AtomFirstLetter` — i.e., the
 *  characters legal in the first position of an FSL state name (atom).
 *
 *  Notably narrower than {@link state_name_chars}: omits `+`, `(`, `)`, `&`,
 *  `#`, `@`.  Includes ASCII digits/letters, `.`, `_`, `!`, `$`, `^`, `*`,
 *  `?`, `,`, and the high-Unicode range `U+0080`–`U+FFFF`.
 *  @example
 *  import { state_name_first_chars } from 'jssm';
 *  state_name_first_chars.some(r => '+' >= r.from && '+' <= r.to);  // => false
 */
declare const state_name_first_chars$1: ReadonlyArray<{
    from: string;
    to: string;
}>;
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
declare const action_label_chars$1: ReadonlyArray<{
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
    action_label_chars$1 as action_label_chars,
    gviz_shapes$1 as gviz_shapes,
    named_colors$1 as named_colors,
    shapes$1 as shapes,
    state_name_chars$1 as state_name_chars,
    state_name_first_chars$1 as state_name_first_chars,
  };
}

type StateType = string;

declare const shapes: string[];
declare const gviz_shapes: string[];
declare const named_colors: string[];
declare const state_name_chars: readonly {
    from: string;
    to: string;
}[];
declare const state_name_first_chars: readonly {
    from: string;
    to: string;
}[];
declare const action_label_chars: readonly {
    from: string;
    to: string;
}[];

/**
 *  Internal record holding a single registered event subscription: the
 *  handler, its optional filter, and a flag for `once` semantics.  Not
 *  exported.
 *  @internal
 */
type JssmEventEntry<mDT, Ev extends JssmEventName> = {
    handler: JssmEventHandler<mDT, Ev>;
    filter?: JssmEventFilter<mDT, Ev>;
    once: boolean;
};
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
declare function state_style_condense(jssk: JssmStateStyleKeyList, machine?: any): JssmStateConfig;
/** Default number of independent Monte-Carlo runs when none is declared. */
declare const STOCHASTIC_DEFAULT_RUNS = 1000;
/** Default per-run step cap (montecarlo) / walk length (steady_state). */
declare const STOCHASTIC_DEFAULT_MAX_STEPS = 1000;
declare class Machine<mDT> {
    #private;
    _state: StateType;
    _state_interner: Interner;
    _action_interner: Interner;
    _state_id: number;
    _edge_id_by_pair: Map<number, number>;
    _edge_id_by_action_pair: Map<number, number>;
    _edge_to_ids: Array<number>;
    _start_states: Set<StateType>;
    _end_states: Set<StateType>;
    _failed_outputs: Set<StateType>;
    _machine_author?: Array<string>;
    _machine_comment?: string;
    _machine_contributor?: Array<string>;
    _machine_definition?: string;
    _machine_language?: string;
    _machine_license?: string;
    _machine_name?: string;
    _machine_version?: string;
    _npm_name?: string;
    _default_size?: JssmDefaultSize;
    _fsl_version?: string;
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
    _boundary_depth: number;
    _boundary_depth_limit: number;
    constructor({ start_states, end_states, failed_outputs, initial_state, start_states_no_enforce, complete, transitions, machine_author, machine_comment, machine_contributor, machine_definition, machine_language, machine_license, machine_name, machine_version, npm_name, default_size, state_declaration, property_definition, state_property, fsl_version, dot_preamble, arrange_declaration, arrange_start_declaration, arrange_end_declaration, oarrange_declaration, farrange_declaration, theme, flow, graph_layout, instance_name, history, boundary_depth_limit, data, default_state_config, default_active_state_config, default_hooked_state_config, default_terminal_state_config, default_start_state_config, default_end_state_config, default_transition_config, default_graph_config, group_registry, group_metadata, group_hooks, state_hooks, allows_override, config_allows_override, allow_islands, editor_config, rng_seed, time_source, timeout_source, clear_timeout_source }: JssmGenericConfig<StateType, mDT>);
    /********
     *
     *  Internal method for fabricating states.  Not meant for external use.
     *
     *  @internal
     *
     */
    _new_state(state_config: JssmGenericState): StateType;
    /*********
     *
     *  Get the current state of a machine.
     *
     *  ```typescript
     *  import * as jssm from 'jssm';
     *
     *  const lswitch = jssm.from('on <=> off;');
     *  console.log( lswitch.state() );             // 'on'
     *
     *  lswitch.transition('off');
     *  console.log( lswitch.state() );             // 'off'
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @returns The current state name.
     *
     */
    state(): StateType;
    /*********
     *
     *  Get the label for a given state, if any; return `undefined` otherwise.
     *
     *  ```typescript
     *  import * as jssm from 'jssm';
     *
     *  const lswitch = jssm.from('a -> b; state a: { label: "Foo!"; };');
     *  console.log( lswitch.label_for('a') );              // 'Foo!'
     *  console.log( lswitch.label_for('b') );              // undefined
     *  ```
     *
     *  See also {@link display_text}.
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param state The state to get the label for.
     *
     *  @returns The label string, or `undefined` if no label is set.
     *
     */
    label_for(state: StateType): string;
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
     *  ```typescript
     *  import * as jssm from 'jssm';
     *
     *  const lswitch = jssm.from('a -> b; state a: { label: "Foo!"; };');
     *  console.log( lswitch.display_text('a') );              // 'Foo!'
     *  console.log( lswitch.display_text('b') );              // 'b'
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param state The state to get display text for.
     *
     *  @returns The label if one exists, otherwise the state's name.
     *
     */
    display_text(state: StateType): string;
    /*********
     *
     *  Get the current data of a machine.
     *
     *  ```typescript
     *  import * as jssm from 'jssm';
     *
     *  const lswitch = jssm.from('on <=> off;', {data: 1});
     *  console.log( lswitch.data() );              // 1
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @returns A deep clone of the machine's current data value.
     *
     */
    data(): mDT;
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
     *  ```typescript
     *  import * as jssm from 'jssm';
     *
     *  const lswitch = jssm.from('on <=> off;', {data: 1});
     *  console.log( lswitch.data() );              // 1
     *
     *  lswitch.set_data(2);
     *  console.log( lswitch.data() );              // 2
     *
     *  lswitch.set_data(undefined);
     *  console.log( lswitch.data() );              // undefined
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param newData The value to install as the machine's data.
     *
     *  @returns The machine, for chaining.
     *
     *  @see Machine.data
     *  @see override
     *
     */
    set_data(newData: mDT): Machine<mDT>;
    /**
     *  The machine's current data by REFERENCE — no clone.  The public
     *  {@link Machine.data} contract is a deep clone per call (a mutation
     *  boundary for external consumers, and deliberately untouched); that clone
     *  is `structuredClone` of the whole data value, which same-package
     *  read-only consumers — the fsl-bind and fsl-data-inspector panels, which
     *  read one dotted path or serialize per transition — should not pay on
     *  every event.  Callers MUST NOT mutate the returned value or store it
     *  beyond the current tick; anything crossing a trust boundary must use
     *  {@link Machine.data} instead.
     *
     *  ```typescript
     *  const m = jssm.from('on <=> off;', { data: { a: { b: 1 } } });
     *  m._data_ref().a.b;   // 1, zero-copy
     *  ```
     *  @returns The live data value; treat as read-only.
     *  @see Machine.data
     *  @internal
     */
    _data_ref(): mDT;
    /*********
     *
     *  Get the current value of a given property name.  Checks the current
     *  state's properties first, then falls back to the global default.
     *  Returns `undefined` if neither exists.  For a throwing variant, see
     *  {@link strict_prop}.
     *
     *  ```typescript
     *  const m = sm`property color default "grey"; a -> b;
     *               state b: { property color "blue"; };`;
     *
     *  m.prop('color');  // 'grey'  (default, because state is 'a')
     *  m.go('b');
     *  m.prop('color');  // 'blue'  (state 'b' overrides the default)
     *  m.prop('size');   // undefined (no such property)
     *  ```
     *
     *  @param name The relevant property name to look up.
     *
     *  @returns The value behind the prop name, or `undefined` if not defined.
     *
     */
    prop(name: string): any;
    /*********
     *
     *  Get the current value of a given property name.  If missing on the state
     *  and without a global default, throws a {@link JssmError}, unlike
     *  {@link prop}, which would return `undefined` instead.
     *
     *  ```typescript
     *  const m = sm`property color default "grey"; a -> b;`;
     *
     *  m.strict_prop('color');  // 'grey'
     *  m.strict_prop('size');   // throws JssmError
     *  ```
     *
     *  @param name The relevant property name to look up.
     *
     *  @returns The value behind the prop name.
     *
     *  @throws {JssmError} If the property is not defined on the current state
     *  and has no default.
     *
     */
    strict_prop(name: string): any;
    /*********
     *
     *  Get the current value of every prop, as an object.  If no current definition
     *  exists for a prop — that is, if the prop was defined without a default and
     *  the current state also doesn't define the prop — then that prop will be listed
     *  in the returned object with a value of `undefined`.
     *
     *  ```typescript
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
     *  traffic_light.state();  // Off
     *  traffic_light.props();  // { can_go: true,  hesitate: true,  stop_first: true  }
     *
     *  traffic_light.go('Red');
     *  traffic_light.props();  // { can_go: false, hesitate: true,  stop_first: true  }
     *
     *  traffic_light.go('Green');
     *  traffic_light.props();  // { can_go: true,  hesitate: false, stop_first: false }
     *  ```
     *
     *  @returns An object mapping every known property name to its current value
     *  (or `undefined` if the property has no default and the current state
     *  doesn't define it).
     *
     */
    props(): object;
    /*********
     *
     *  Check whether a given string is a known property's name.
     *
     *  ```typescript
     *  const example = sm`property foo default 1; a->b;`;
     *
     *  example.known_prop('foo');  // true
     *  example.known_prop('bar');  // false
     *  ```
     *
     *  @param prop_name The relevant property name to look up
     *
     */
    known_prop(prop_name: string): boolean;
    /*********
     *
     *  List all known property names.  If you'd also like values, use
     *  {@link props} instead.  The order of the properties is not defined, and
     *  the properties generally will not be sorted.
     *
     *  ```typescript
     *  const m = sm`property color default "grey"; property size default 1; a -> b;`;
     *
     *  m.known_props();  // ['color', 'size']
     *  ```
     *
     *  @returns An array of all property name strings defined on this machine.
     *
     */
    known_props(): string[];
    /********
     *
     *  Check whether a given state is a valid start state (either because it was
     *  explicitly named as such, or because it was the first mentioned state.)
     *
     *  ```typescript
     *  import { sm, is_start_state } from 'jssm';
     *
     *  const example = sm`a -> b;`;
     *
     *  console.log( final_test.is_start_state('a') );   // true
     *  console.log( final_test.is_start_state('b') );   // false
     *
     *  const example = sm`start_states: [a b]; a -> b;`;
     *
     *  console.log( final_test.is_start_state('a') );   // true
     *  console.log( final_test.is_start_state('b') );   // true
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param whichState The name of the state to check
     *
     */
    is_start_state(whichState: StateType): boolean;
    /********
     *
     *  Check whether a given state is a valid start state (either because it was
     *  explicitly named as such, or because it was the first mentioned state.)
     *
     *  ```typescript
     *  import { sm, is_end_state } from 'jssm';
     *
     *  const example = sm`a -> b;`;
     *
     *  console.log( final_test.is_start_state('a') );   // false
     *  console.log( final_test.is_start_state('b') );   // true
     *
     *  const example = sm`end_states: [a b]; a -> b;`;
     *
     *  console.log( final_test.is_start_state('a') );   // true
     *  console.log( final_test.is_start_state('b') );   // true
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param whichState The name of the state to check
     *
     */
    is_end_state(whichState: StateType): boolean;
    /********
     *
     *  Get the set of states declared as failure outputs for this machine.
     *  Returns an array of state labels, or an empty array when none were
     *  declared.  A state in this list means the machine is in a failure
     *  condition when it occupies that state.
     *
     *  @see {@link is_failed_output} to test a single state
     *  @see {@link is_failed} to test the current state
     *
     */
    failed_outputs(): Array<StateType>;
    /********
     *
     *  Check whether a given state is declared as a failure output.
     *
     *  @param whichState The name of the state to check
     *
     *  @see {@link failed_outputs} for the full failure-output set
     *  @see {@link is_failed} to test the current state
     *
     */
    is_failed_output(whichState: StateType): boolean;
    /********
     *
     *  Check whether the machine is currently in a failure state — that is,
     *  whether its current state is one of the declared `failed_outputs`.
     *
     *  @see {@link failed_outputs} for the full failure-output set
     *  @see {@link is_failed_output} to test an arbitrary state
     *
     */
    is_failed(): boolean;
    /********
     *
     *  Check whether a given state is final (either has no exits or is marked
     *  `complete`.)
     *
     *  ```typescript
     *  import { sm, state_is_final } from 'jssm';
     *
     *  const final_test = sm`first -> second;`;
     *
     *  console.log( final_test.state_is_final('first') );   // false
     *  console.log( final_test.state_is_final('second') );  // true
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param whichState The name of the state to check for finality
     *
     */
    state_is_final(whichState: StateType): boolean;
    /********
     *
     *  Check whether the current state is final (either has no exits or is marked
     *  `complete`.)
     *
     *  ```typescript
     *  import { sm, is_final } from 'jssm';
     *
     *  const final_test = sm`first -> second;`;
     *
     *  console.log( final_test.is_final() );   // false
     *  state.transition('second');
     *  console.log( final_test.is_final() );   // true
     *  ```
     *
     */
    is_final(): boolean;
    /********
     *
     *  Serialize the current machine, including all defining state but not the
     *  machine string, to a structure.  This means you will need the machine
     *  string to recreate (to not waste repeated space;) if you want the machine
     *  string embedded, call `serialize_with_string` instead.
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param comment An optional comment string to embed in the serialized
     *  output for identification or debugging.
     *
     *  @returns A {@link JssmSerialization} object containing the machine's
     *  current state, data, and timestamp.
     *
     */
    serialize(comment?: string): JssmSerialization<mDT>;
    /**
     * Get the graph layout direction (e.g. `'LR'`, `'TB'`).  Set via the
     *  FSL `graph_layout` directive.
     *  @returns The layout string, or the default if not set.
     */
    graph_layout(): string;
    /**
     * Get the Graphviz DOT preamble string, injected before the graph body
     *  during visualization.  Set via the FSL `dot_preamble` directive.
     *  @returns The preamble string.
     */
    dot_preamble(): string;
    /**
     * Get the consolidated `transition: {}` default-config block: the ordered,
     *  de-duplicated `{ key, value }[]` list of edge-default style items compiled
     *  from a `transition: {}` block (e.g. `transition: { color: blue; }`).  The
     *  viz layer projects this onto a Graphviz `edge [ … ]` default statement so
     *  every edge inherits it.
     *
     *  ```typescript
     *  import { sm } from 'jssm';
     *  sm`a -> b; transition: { color: blue; };`.default_transition_config();
     *  // [ { key: 'color', value: '#0000ffff' } ]
     *  ```
     *  @returns The transition-config item list, or `undefined` if the machine
     *  declared no `transition: {}` block.
     *  @see default_graph_config
     */
    default_transition_config(): JssmTransitionConfig | undefined;
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
     *  ```typescript
     *  import { sm } from 'jssm';
     *  sm`a -> b; graph: { background-color: #ffffff; };`.default_graph_config();
     *  // [ { key: 'background-color', value: '#ffffffff' } ]
     *  ```
     *  @returns The graph-config item list, or `undefined` if the machine has no
     *  graph config (no `graph: {}` block and no deprecated graph keyword).
     *  @see default_transition_config
     */
    default_graph_config(): JssmGraphConfig | undefined;
    /**
     * Get the machine's author list.  Set via the FSL `machine_author` directive.
     *  @returns An array of author name strings.
     */
    machine_author(): Array<string>;
    /**
     * Get the machine's comment string.  Set via the FSL `machine_comment` directive.
     *  @returns The comment string.
     */
    machine_comment(): string;
    /**
     * Get the machine's contributor list.  Set via the FSL `machine_contributor` directive.
     *  @returns An array of contributor name strings.
     */
    machine_contributor(): Array<string>;
    /**
     * Get the machine's definition string.  Set via the FSL `machine_definition` directive.
     *  @returns The definition string.
     */
    machine_definition(): string;
    /**
     * Get the machine's natural language as an ISO 639-1 code.  Set via the FSL
     *  `machine_language` directive, which accepts a language name or code, or a
     *  BCP-47 tag whose region subtag is dropped (`en-us` -> `en`).  Unrecognized
     *  values resolve to `undefined`.
     *  @returns The ISO 639-1 language code (e.g. `'en'`), or `undefined` if the
     *           supplied value did not resolve to a known language.
     */
    machine_language(): string;
    /**
     * Get the machine's license string.  Set via the FSL `machine_license` directive.
     *  @returns The license string.
     */
    machine_license(): string;
    /**
     * Get the machine's name.  Set via the FSL `machine_name` directive.
     *  @returns The machine name string.
     */
    machine_name(): string;
    /**
     * The editor/panel defaults declared in the FSL `editor: {}` block, or
     *  `undefined` when none was given.  Read by the all-widgets web control
     *  (fsl#1334) — `panels` drives `request` panel mode.
     *  @returns `{ stochastic_run_count?, panels? }`, or `undefined`.
     *  @example
     *    const m = sm`editor: { panels: [history]; }; a -> b;`;
     *    m.editor_config();  // => { panels: ['history'] }
     */
    editor_config(): JssmEditorConfig | undefined;
    /**
     * Get the npm package name associated with the machine.  Set via the FSL `npm_name` directive.
     *  Returns `undefined` when not present.
     *  @returns The npm package name string, or `undefined`.
     *  @see machine_name
     */
    npm_name(): string;
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
     *  @returns The size-hint object, or `undefined` if not set.
     *  @see npm_name
     */
    default_size(): JssmDefaultSize | undefined;
    /**
     * Get the machine's version string.  Set via the FSL `machine_version` directive.
     *  @returns The version string.
     */
    machine_version(): string;
    /**
     * Get the raw state declaration objects as parsed from the FSL source.
     *  @returns An array of raw state declaration objects.
     */
    raw_state_declarations(): Array<object>;
    /**
     * Get the processed state declaration for a specific state.
     *  @param which - The state to look up.
     *  @returns The {@link JssmStateDeclaration} for the given state.
     */
    state_declaration(which: StateType): JssmStateDeclaration;
    /**
     * Get all processed state declarations as a Map.
     *  @returns A `Map` from state name to {@link JssmStateDeclaration}.
     */
    state_declarations(): Map<StateType, JssmStateDeclaration>;
    /**
     * Get the FSL language version this machine was compiled under.
     *  @returns The FSL version string.
     */
    fsl_version(): string;
    /**
     * Get the complete internal state of the machine as a serializable
     *  structure.  Includes actions, edges, edge map, named transitions,
     *  reverse actions, current state, and states map.
     *  @returns A {@link JssmMachineInternalState} snapshot.
     */
    machine_state(): JssmMachineInternalState<mDT>;
    /*********
     *
     *  List all the states known by the machine.  Please note that the order of
     *  these states is not guaranteed.
     *
     *  ```typescript
     *  import * as jssm from 'jssm';
     *
     *  const lswitch = jssm.from('on <=> off;');
     *  console.log( lswitch.states() );             // ['on', 'off']
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @returns An array of all state names in the machine.
     *
     */
    states(): Array<StateType>;
    /**
     * Get the internal state descriptor for a given state name.
     *  @param whichState - The state to look up.
     *  @returns The {@link JssmGenericState} descriptor.
     *  @throws {JssmError} If the state does not exist.
     */
    state_for(whichState: StateType): JssmGenericState;
    /*********
     *
     *  Check whether the machine knows a given state.
     *
     *  ```typescript
     *  import * as jssm from 'jssm';
     *
     *  const lswitch = jssm.from('on <=> off;');
     *
     *  console.log( lswitch.has_state('off') );     // true
     *  console.log( lswitch.has_state('dance') );   // false
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param whichState The state to be checked for existence.
     *
     *  @returns `true` if the state exists, `false` otherwise.
     *
     */
    has_state(whichState: StateType): boolean;
    /*********
     *
     *  Lists all edges of a machine.
     *
     *  ```typescript
     *  import { sm } from 'jssm';
     *
     *  const lswitch = sm`on 'toggle' <=> 'toggle' off;`;
     *
     *  lswitch.list_edges();
     *  [
     *    {
     *      from: 'on',
     *      to: 'off',
     *      kind: 'main',
     *      forced_only: false,
     *      main_path: true,
     *      action: 'toggle'
     *    },
     *    {
     *      from: 'off',
     *      to: 'on',
     *      kind: 'main',
     *      forced_only: false,
     *      main_path: true,
     *      action: 'toggle'
     *    }
     *  ]
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @returns An array of all {@link JssmTransition} edge objects.
     *
     */
    list_edges(): Array<JssmTransition<StateType, mDT>>;
    /**
     * Get the map of named transitions (transitions with explicit names).
     *  @returns A `Map` from transition name to edge index.
     */
    list_named_transitions(): Map<StateType, number>;
    /**
     * List all distinct action names defined anywhere in the machine.
     *  @returns An array of action name strings.
     */
    list_actions(): Array<StateType>;
    /**
     * Whether any actions are defined on this machine.
     *  @returns `true` if the machine has at least one action.
     */
    get uses_actions(): boolean;
    /**
     * Whether any forced (`~>`) transitions exist in this machine.
     *  @returns `true` if at least one forced transition is defined.
     */
    get uses_forced_transitions(): boolean;
    /*********
     *
     *  Check if the code that built the machine allows overriding state and data.
     *
     *  @returns The override permission from the FSL source code.
     *
     */
    get code_allows_override(): JssmAllowsOverride;
    /*********
     *
     *  Check if the machine config allows overriding state and data.
     *
     *  @returns The override permission from the runtime config.
     *
     */
    get config_allows_override(): JssmAllowsOverride;
    /*********
     *
     *  Check if a machine allows overriding state and data.  Resolves the
     *  combined effect of code and config permissions — config may not be
     *  less strict than code.
     *
     *  @returns The effective override permission.
     *
     */
    get allows_override(): JssmAllowsOverride;
    /*********
     *
     *  Return the effective island policy for this machine.  `true` means
     *  disconnected components are allowed (the default), `false` requires a
     *  single connected component, and `'with_start'` allows islands only when
     *  every component contains at least one start state.
     *
     *  @returns The island policy stored in the machine.
     *
     */
    get allow_islands(): JssmAllowIslands;
    /**
     * List all available theme names.
     *  @returns An array of theme name strings.
     */
    all_themes(): FslTheme[];
    /**
     * List the character ranges accepted by the FSL grammar in any but the
     *  first position of a state name (atom).  Each entry is an inclusive
     *  `{from, to}` range of single Unicode characters.
     *  @returns An array of `{from, to}` inclusive character ranges.
     *  @example
     *  import { sm } from 'jssm';
     *  const m = sm`a -> b;`;
     *  m.all_state_name_chars().some(r => '+' >= r.from && '+' <= r.to);  // => true
     */
    all_state_name_chars(): ReadonlyArray<{
        from: string;
        to: string;
    }>;
    /**
     * List the character ranges accepted by the FSL grammar in the first
     *  position of a state name (atom).  Narrower than
     *  {@link all_state_name_chars}: notably omits `+`, `(`, `)`, `&`, `#`, `@`.
     *  @returns An array of `{from, to}` inclusive character ranges.
     *  @example
     *  import { sm } from 'jssm';
     *  const m = sm`a -> b;`;
     *  m.all_state_name_first_chars().some(r => '+' >= r.from && '+' <= r.to);  // => false
     */
    all_state_name_first_chars(): ReadonlyArray<{
        from: string;
        to: string;
    }>;
    /**
     * List the character ranges accepted inside a single-quoted FSL action
     *  label without escaping.  Space is allowed; the apostrophe `'` is
     *  explicitly excluded since it terminates the label.
     *  @returns An array of `{from, to}` inclusive character ranges.
     *  @example
     *  import { sm } from 'jssm';
     *  const m = sm`a -> b;`;
     *  m.all_action_label_chars().some(r => ' ' >= r.from && ' ' <= r.to);   // => true
     *  m.all_action_label_chars().some(r => "'" >= r.from && "'" <= r.to);   // => false
     */
    all_action_label_chars(): ReadonlyArray<{
        from: string;
        to: string;
    }>;
    /**
     * Get the active theme(s) for this machine.  Always stored as an array
     *  internally; the union return type exists for setter compatibility.
     *  @returns The current theme or array of themes.
     */
    get themes(): FslTheme | FslTheme[];
    /**
     * Set the active theme(s).  Accepts a single theme name or an array.
     *  @param to - A theme name or array of theme names to apply.
     */
    set themes(to: FslTheme | FslTheme[]);
    /**
     * Get the flow direction for graph layout (e.g. `'right'`, `'down'`).
     *  Set via the FSL `flow` directive.
     *  @returns The current flow direction.
     */
    flow(): FslDirection;
    /**
     * Look up a transition's edge index by source and target state names.
     *  @param from - Source state name.
     *  @param to   - Target state name.
     *  @returns The edge index in the edges array, or `undefined` if no
     *  such transition exists.
     */
    get_transition_by_state_names(from: StateType, to: StateType): number;
    /**
     * Look up the full transition object for a given source→target pair.
     *  @param from - Source state name.
     *  @param to   - Target state name.
     *  @returns The {@link JssmTransition} object, or `undefined` if none exists.
     */
    lookup_transition_for(from: StateType, to: StateType): JssmTransition<StateType, mDT>;
    /********
     *
     *  List all transitions attached to the current state, sorted by entrance and
     *  exit.  The order of each sublist is not defined.  A node could appear in
     *  both lists.
     *
     *  ```typescript
     *  import { sm } from 'jssm';
     *
     *  const light = sm`red 'next' -> green 'next' -> yellow 'next' -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
     *
     *  light.state();               // 'red'
     *  light.list_transitions();    // { entrances: [ 'yellow', 'off' ], exits: [ 'green', 'off' ] }
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param whichState The state whose transitions to have listed
     *
     */
    list_transitions(whichState?: StateType): JssmTransitionList;
    /********
     *
     *  List all entrances attached to the current state.  Please note that the
     *  order of the list is not defined.  This list includes both unforced and
     *  forced entrances; if this isn't desired, consider
     *  `list_unforced_entrances` or `list_forced_entrances` as
     *  appropriate.
     *
     *  ```typescript
     *  import { sm } from 'jssm';
     *
     *  const light = sm`red 'next' -> green 'next' -> yellow 'next' -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
     *
     *  light.state();               // 'red'
     *  light.list_entrances();      // [ 'yellow', 'off' ]
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param whichState The state whose entrances to have listed
     *
     */
    list_entrances(whichState?: StateType): Array<StateType>;
    /********
     *
     *  List all exits attached to the current state.  Please note that the order
     *  of the list is not defined.  This list includes both unforced and forced
     *  exits; if this isn't desired, consider `list_unforced_exits` or
     *  `list_forced_exits` as appropriate.
     *
     *  ```typescript
     *  import { sm } from 'jssm';
     *
     *  const light = sm`red 'next' -> green 'next' -> yellow 'next' -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
     *
     *  light.state();               // 'red'
     *  light.list_exits();          // [ 'green', 'off' ]
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param whichState The state whose exits to have listed
     *
     */
    list_exits(whichState?: StateType): Array<StateType>;
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
     *  @param whichState - The state to inspect.
     *  @returns An array of {@link JssmTransition} edges exiting the state,
     *  filtered as described above.  May be empty.
     *  @throws {JssmError} If the state does not exist.
     */
    probable_exits_for(whichState: StateType): Array<JssmTransition<StateType, mDT>>;
    /**
     * Take a single random transition from the current state, weighted by
     *  edge probabilities.
     *  @returns `true` if a transition was taken, `false` otherwise.
     */
    probabilistic_transition(): boolean;
    /**
     * Take `n` consecutive probabilistic transitions and return the sequence
     *  of states visited (before each transition).
     *  @param n - Number of steps to walk.
     *  @returns An array of state names visited during the walk.
     */
    probabilistic_walk(n: number): Array<StateType>;
    /**
     * Take `n` probabilistic steps and return a histograph of how many times
     *  each state was visited.
     *  @param n - Number of steps to walk.
     *  @returns A `Map` from state name to visit count.
     */
    probabilistic_histo_walk(n: number): Map<StateType, number>;
    /**
     * One non-destructive weighted-random walk over the graph from `start`.
     *
     *  Reads the graph and advances the PRNG only — it never calls
     *  {@link Machine.transition}, so it fires no hooks, mutates no machine
     *  state, and touches no `data`.  A state with no probabilistic exits
     *  (a terminal, or a forced-only `~>` state) ends the walk.
     *  @param start - State to begin the walk from.
     *  @param max_steps - Maximum transitions before the walk is step-capped.
     *  @param exit_memo - Per-run-set cache of {@link Machine.probable_exits_for}
     *    results.  The graph is immutable after construction, so a state's
     *    probable exits never change; sharing one memo across a generator's
     *    runs collapses runs×steps re-derivations (two array allocations and an
     *    exit rescan per step) to one per distinct state.  The memo only reuses
     *    the derived arrays — RNG draw order is untouched, so seeded walks
     *    reproduce exactly.
     *  @returns The {@link JssmStochasticRun} for this walk.
     */
    private _stochastic_one_walk;
    /**
     * Lazily yield one {@link JssmStochasticRun} at a time.
     *
     *  In `montecarlo` mode (default) yields `runs` independent walks from the
     *  current state, each ending at a terminal or after `max_steps`.  In
     *  `steady_state` mode yields exactly one walk of `max_steps` steps.  This
     *  is the lazy engine behind {@link Machine.stochastic_summary}; the
     *  fsl-stochastic panel drives it across animation frames.
     *
     *  Passing `seed` reseeds the machine for reproducible runs.  Unlike
     *  {@link Machine.stochastic_summary}, the generator does NOT restore the
     *  prior seed afterward — a direct caller's machine is left reseeded.
     *  @param opts - {@link JssmStochasticOptions}.
     *  @yields One {@link JssmStochasticRun} per completed walk.
     *  @returns A generator of per-run results.
     *  @example
     *  const m = sm`a 'go' -> b 'go' -> c;`;
     *  [...m.stochastic_runs({ runs: 2, seed: 1 })].length;  // => 2
     */
    stochastic_runs(opts?: JssmStochasticOptions): Generator<JssmStochasticRun>;
    /**
     * Run many weighted-random walks and return aggregate statistics.
     *
     *  Honors `%` transition probabilities (via the existing probabilistic
     *  machinery).  Non-destructive: the machine's current state and
     *  {@link Machine.rng_seed} are restored before returning, so calling this
     *  never perturbs the live machine.  `montecarlo` mode (default) reports
     *  per-run `path_lengths`, `terminal_reached`, and `capped`; `steady_state`
     *  mode runs one long walk and omits those fields.
     *
     *  Timing (`after`) decorations and data-guard conditions are not modeled
     *  by this sampler; it walks the probabilistic graph topology.
     *  @param opts - {@link JssmStochasticOptions}.  `runs` defaults to the
     *  machine's declared `editor: { stochastic_run_count }` (fsl#1334) when
     *  present, otherwise {@link STOCHASTIC_DEFAULT_RUNS}.
     *  @returns A {@link JssmStochasticSummary}.
     *  @see Machine.stochastic_runs
     *  @see Machine.probabilistic_walk
     *  @see Machine.editor_config
     *  @example
     *  const m = sm`a 'go' -> b 'go' -> c;`;
     *  const s = m.stochastic_summary({ runs: 100, seed: 1 });
     *  s.terminal_reached;  // => 100
     */
    stochastic_summary(opts?: JssmStochasticOptions): JssmStochasticSummary;
    /********
     *
     *  List all actions available from this state.  Please note that the order of
     *  the actions is not guaranteed.
     *
     *  ```typescript
     *  import { sm } from 'jssm';
     *
     *  const machine = sm`
     *    red 'next' -> green 'next' -> yellow 'next' -> red;
     *    [red yellow green] 'shutdown' ~> off 'start' -> red;
     *  `;
     *
     *  console.log( machine.state() );    // logs 'red'
     *  console.log( machine.actions() );  // logs ['next', 'shutdown']
     *
     *  machine.action('next');            // true
     *  console.log( machine.state() );    // logs 'green'
     *  console.log( machine.actions() );  // logs ['next', 'shutdown']
     *
     *  machine.action('shutdown');        // true
     *  console.log( machine.state() );    // logs 'off'
     *  console.log( machine.actions() );  // logs ['start']
     *
     *  machine.action('start');           // true
     *  console.log( machine.state() );    // logs 'red'
     *  console.log( machine.actions() );  // logs ['next', 'shutdown']
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param whichState The state whose actions to list.  Defaults to the
     *  current state.
     *
     *  @returns An array of action names available from the given state.
     *
     */
    actions(whichState?: StateType): Array<StateType>;
    /********
     *
     *  List all states that have a specific action attached.  Please note that
     *  the order of the states is not guaranteed.
     *
     *  ```typescript
     *  import { sm } from 'jssm';
     *
     *  const machine = sm`
     *    red 'next' -> green 'next' -> yellow 'next' -> red;
     *    [red yellow green] 'shutdown' ~> off 'start' -> red;
     *  `;
     *
     *  console.log( machine.list_states_having_action('next') );    // ['red', 'green', 'yellow']
     *  console.log( machine.list_states_having_action('start') );   // ['off']
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param whichState The action to be checked for associated states
     *
     */
    list_states_having_action(whichState: StateType): Array<StateType>;
    /**
     * List all action names available as exits from a given state.
     *
     *  Returns the empty array (does not throw) when `whichState` exists but has
     *  no action-named exits — including terminal states, states whose only
     *  exits are plain `->` transitions, and states in machines that use no
     *  actions at all.  Only nonexistent states cause a throw.
     *  @param whichState - The state to inspect.  Defaults to the current state.
     *  @returns An array of action name strings, possibly empty.
     *  @throws {JssmError} If the state does not exist.
     *  @example
     *    const m = sm`a 'go' -> b; b -> c;`;
     *    m.list_exit_actions('a');  // => ['go']
     *    m.list_exit_actions('b');  // => []
     *    m.list_exit_actions('c');  // => []
     *    expect(() => m.list_exit_actions('z')).toThrow();
     */
    list_exit_actions(whichState?: StateType): Array<StateType>;
    /**
     * List all action exits from a state with their probabilities.
     *  @param whichState - The state to inspect.  Defaults to the current state.
     *  @returns An array of `{ action, probability }` objects.
     *  @throws {JssmError} If the state does not exist.
     */
    probable_action_exits(whichState?: StateType): Array<any>;
    /**
     * Check whether a state has no incoming transitions (unreachable after start).
     *  @param whichState - The state to check.
     *  @returns `true` if the state has zero entrances.
     *  @throws {JssmError} If the state does not exist.
     */
    is_unenterable(whichState: StateType): boolean;
    /**
     * Check whether any state in the machine is unenterable.
     *  @returns `true` if at least one state has no incoming transitions.
     */
    has_unenterables(): boolean;
    /**
     * Check whether the current state is terminal (has no exits).
     *  @returns `true` if the current state has zero exits.
     */
    is_terminal(): boolean;
    /**
     * Check whether a specific state is terminal (has no exits).
     *  @param whichState - The state to check.
     *  @returns `true` if the state has zero exits.
     *  @throws {JssmError} If the state does not exist.
     */
    state_is_terminal(whichState: StateType): boolean;
    /**
     * Check whether any state in the machine is terminal.
     *  @returns `true` if at least one state has no exits.
     */
    has_terminals(): boolean;
    /********
     *
     *  Reports whether the machine's CURRENT state is a transitive member of a
     *  named group.  Membership is deep: a state counts as in `groupName` if it
     *  belongs to that group directly, or via any nested (`&child`) or spread
     *  (`...&child`) sub-group, at any depth.  An undeclared group simply has no
     *  members, so this returns `false` rather than throwing.
     *
     *  ```typescript
     *  import { sm } from 'jssm';
     *
     *  const m = sm`&busy : [working]; idle 'go' -> working;`;
     *  m.isIn('busy');     // false — current state is 'idle'
     *  m.action('go');
     *  m.isIn('busy');     // true  — current state is now 'working'
     *  m.isIn('nonesuch'); // false — undeclared group has no members
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param groupName The group to test the current state against.
     *
     *  @returns `true` if the current state is a transitive member of `groupName`.
     *
     *  @see groupsOf
     *  @see statesIn
     *
     */
    isIn(groupName: string): boolean;
    /********
     *
     *  Lists every group that transitively contains a given state.  Membership is
     *  deep — direct, nested, and spread sub-group containment all count — and the
     *  result is the precomputed inverse-index entry for the state, so the lookup
     *  is constant-time.  A state that belongs to no group (or a state name that
     *  appears in no group) yields an empty `Set`.
     *
     *  ```typescript
     *  import { sm } from 'jssm';
     *
     *  const m = sm`&inner : [a]; &outer : [&inner b]; a -> b;`;
     *  m.groupsOf('a');     // Set { 'inner', 'outer' }  — deep through &inner
     *  m.groupsOf('b');     // Set { 'outer' }
     *  m.groupsOf('z');     // Set {}                    — not in any group
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
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
    groupsOf(state: StateType): Set<string>;
    /********
     *
     *  Lists all declared group names, in source declaration order.  The order
     *  matches the order the `&group : [ … ];` declarations appear in the FSL, and
     *  is the same order used to break depth-specificity ties in the config
     *  cascade.  Machines that declare no groups return an empty array.
     *
     *  ```typescript
     *  import { sm } from 'jssm';
     *
     *  const m = sm`&first : [a]; &second : [b]; a -> b;`;
     *  m.groups();  // [ 'first', 'second' ]
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @returns The declared group names, in declaration order.
     *
     *  @see groupsOf
     *  @see statesIn
     *
     */
    groups(): string[];
    /********
     *
     *  Lists every state that is a transitive member of a named group — the
     *  flattened membership of the group, descending through nested and spread
     *  sub-groups, in member-declaration order.
     *
     *  ```typescript
     *  import { sm } from 'jssm';
     *
     *  const m = sm`&inner : [a b]; &outer : [&inner c]; a -> b -> c;`;
     *  m.statesIn('outer');  // [ 'a', 'b', 'c' ]
     *  m.statesIn('inner');  // [ 'a', 'b' ]
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
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
    statesIn(groupName: string): Array<StateType>;
    /**
     * Check whether the current state is complete (every exit has an action).
     *  @returns `true` if the current state is complete.
     */
    is_complete(): boolean;
    /**
     * Check whether a specific state is complete (every exit has an action).
     *  @param whichState - The state to check.
     *  @returns `true` if the state is complete.
     *  @throws {JssmError} If the state does not exist.
     */
    state_is_complete(whichState: StateType): boolean;
    /**
     * Check whether any state in the machine is complete.
     *  @returns `true` if at least one state is complete.
     */
    has_completes(): boolean;
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
     *  ```typescript
     *  const m = sm`a -> b -> c;`;
     *
     *  m.on('transition', e => console.log(`${e.from} -> ${e.to}`));
     *  m.on('entry', { state: 'b' }, e => console.log(`entered ${e.state}`));
     *
     *  const off = m.on('transition', () => {});
     *  off();  // unsubscribe
     *  ```
     *  @template Ev      The event name (drives the detail type).
     *  @param name        The event name to subscribe to.
     *  @param handler     The handler invoked on each matching delivery.  The
     *                     three-argument `(name, filter, handler)` form inserts a
     *                     filter object before the handler (see the example above).
     *  @returns A function that unsubscribes when called.
     *  @see Machine.off
     *  @see Machine.once
     */
    on<Ev extends JssmEventName>(name: Ev, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
    on<Ev extends JssmEventName>(name: Ev, filter: JssmEventFilter<mDT, Ev>, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
    /**
     *  Subscribe to a typed observation event for one matching delivery, then
     *  auto-remove.  Accepts the same `(name, handler)` and `(name, filter,
     *  handler)` shapes as {@link Machine.on}.
     *
     *  ```typescript
     *  m.once('terminal', e => console.log(`done at ${e.state}`));
     *  ```
     *  @template Ev      The event name.
     *  @param name        The event name.
     *  @param handler     The handler invoked on the first matching delivery.  The
     *                     three-argument `(name, filter, handler)` form inserts a
     *                     filter object before the handler (same shapes as `on`).
     *  @returns A function that unsubscribes early if called before the
     *           handler has fired.
     *  @see Machine.on
     *  @see Machine.off
     */
    once<Ev extends JssmEventName>(name: Ev, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
    once<Ev extends JssmEventName>(name: Ev, filter: JssmEventFilter<mDT, Ev>, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
    /**
     *  Remove a previously-registered event handler.  Match is by reference —
     *  the same function value passed to {@link Machine.on} or
     *  {@link Machine.once}.  Returns `true` if a subscription was found and
     *  removed, `false` otherwise.
     *
     *  ```typescript
     *  const fn = (e: any) => console.log(e);
     *  m.on('transition', fn);
     *  m.off('transition', fn);  // true
     *  m.off('transition', fn);  // false
     *  ```
     *  @param name    The event name.
     *  @param handler The handler reference to remove.
     *  @returns `true` if removed, `false` if no match was registered.
     */
    off<Ev extends JssmEventName>(name: Ev, handler: JssmEventHandler<mDT, Ev>): boolean;
    set_hook(HookDesc: HookDescription<mDT>): void;
    /**
     *  Remove a previously-registered hook described by a
     *  {@link HookDescription}.  Match is by `kind` + identifying keys
     *  (`from`/`to`/`action`/etc.), not by handler reference — there is one
     *  hook per slot in the registry, so the description uniquely identifies
     *  which one to clear.  Fires a `hook-removal` event for inspector tools.
     *
     *  This is the symmetric counterpart of {@link Machine.set_hook} for the
     *  event-bridging use case (#638).  Reasoning about hooks via observation
     *  events requires being able to observe their disappearance too.
     *
     *  ```typescript
     *  const m = sm`a -> b;`;
     *  const fn = () => true;
     *  m.set_hook({ kind: 'hook', from: 'a', to: 'b', handler: fn });
     *  m.remove_hook({ kind: 'hook', from: 'a', to: 'b', handler: fn });
     *  ```
     *  @param HookDesc - A hook descriptor identifying the hook to remove.
     *  @returns `true` if a hook was removed, `false` otherwise.
     */
    remove_hook(HookDesc: HookDescription<mDT>): boolean;
    /**
     * Register a pre-transition hook on a specific edge.  Fires before
     *  transitioning from `from` to `to`.  If the handler returns `false`, the
     *  transition is blocked.
     *
     *  ```typescript
     *  const m = sm`a -> b -> c;`;
     *  m.hook('a', 'b', () => console.log('a->b'));
     *  ```
     *  @param from    - Source state name.
     *  @param to      - Target state name.
     *  @param handler - Callback invoked before the transition.
     *  @returns `this` for chaining.
     */
    hook(from: string, to: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     * Register a pre-transition hook on a specific action-labeled edge.
     *  @param from    - Source state name.
     *  @param to      - Target state name.
     *  @param action  - The action label that triggers this hook.
     *  @param handler - Callback invoked before the transition.
     *  @returns `this` for chaining.
     */
    hook_action(from: string, to: string, action: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     * Register a pre-transition hook on any edge triggered by a specific action.
     *  @param action  - The action name to hook.
     *  @param handler - Callback invoked before any transition with this action.
     *  @returns `this` for chaining.
     */
    hook_global_action(action: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     * Register a pre-transition hook on any action-driven transition.
     *  @param handler - Callback invoked before any action transition.
     *  @returns `this` for chaining.
     */
    hook_any_action(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     * Register a pre-transition hook on any standard (`->`) transition.
     *  @param handler - Callback invoked before any legal transition.
     *  @returns `this` for chaining.
     */
    hook_standard_transition(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     * Register a pre-transition hook on any main-path (`=>`) transition.
     *  @param handler - Callback invoked before any main transition.
     *  @returns `this` for chaining.
     */
    hook_main_transition(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     * Register a pre-transition hook on any forced (`~>`) transition.
     *  @param handler - Callback invoked before any forced transition.
     *  @returns `this` for chaining.
     */
    hook_forced_transition(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     * Register a pre-transition hook on any transition regardless of kind.
     *  @param handler - Callback invoked before every transition.
     *  @returns `this` for chaining.
     */
    hook_any_transition(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     * Register a hook that fires when entering a specific state.
     *  @param to      - The state being entered.
     *  @param handler - Callback invoked on entry.
     *  @returns `this` for chaining.
     */
    hook_entry(to: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     * Register a hook that fires when leaving a specific state.
     *  @param from    - The state being exited.
     *  @param handler - Callback invoked on exit.
     *  @returns `this` for chaining.
     */
    hook_exit(from: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     * Register a hook that fires when a state's `after` timer elapses — the
     *  delay-over companion to `a after 5s -> b;` style time transitions.  It
     *  does NOT fire when the state is entered or left by ordinary dispatch;
     *  use {@link hook_entry} / {@link hook_exit} for those.  (Versions through
     *  5.143.28 also spuriously fired it on entering the state, the jssm side
     *  of StoneCypher/fsl#1327.)
     *  @param from    - The state whose `after` timer is being watched.
     *  @param handler - Callback invoked when the timer fires, just before the
     *                   timed transition is taken; informational — its outcome
     *                   cannot reject the transition.
     *  @returns `this` for chaining.
     *  @example
     *    const m = sm`a after 1000 -> b; a -> c; c -> a;`;
     *    let calls = 0;
     *    m.hook_after('a', () => { calls += 1; });
     *    m.go('c');
     *    m.go('a');
     *    // ordinary dispatch never fires it; only the timer elapsing does:
     *    calls;  // => 0
     *    m.clear_state_timeout();
     *  @see hook_entry
     *  @see hook_exit
     *  @see set_state_timeout
     */
    hook_after(from: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     * Register a hook that fires when ANY state's `after` timer elapses — the
     *  whole-machine companion to {@link hook_after}, mirroring how
     *  {@link hook_any_transition} companions {@link hook}.  When the elapsing
     *  state also has a specific {@link hook_after}, the specific hook fires
     *  first and this one fires second; a specific after hook firing always
     *  implies the any-after hook fires too (StoneCypher/fsl#1299).  Like
     *  `hook_after` it is informational — its outcome cannot reject the timed
     *  transition — and it does NOT fire on ordinary dispatch.
     *  @param handler - Callback invoked whenever any `after` timer fires, just
     *                   before the timed transition is taken.
     *  @returns `this` for chaining.
     *  @example
     *    const m = sm`a after 1000 -> b; a -> c; c -> a;`;
     *    let calls = 0;
     *    m.hook_after_any(() => { calls += 1; });
     *    m.go('c');
     *    m.go('a');
     *    // ordinary dispatch never fires it; only a timer elapsing does:
     *    calls;  // => 0
     *    m.clear_state_timeout();
     *  @see hook_after
     *  @see hook_any_transition
     *  @see set_state_timeout
     */
    hook_after_any(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     * Post-transition hook on a specific edge.  Fires after the transition
     *  from `from` to `to` has completed.  Cannot block the transition.
     *  @param from    - Source state name.
     *  @param to      - Target state name.
     *  @param handler - Callback invoked after the transition.
     *  @returns `this` for chaining.
     */
    post_hook(from: string, to: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     * Post-transition hook on a specific action-labeled edge.
     *  @param from    - Source state name.
     *  @param to      - Target state name.
     *  @param action  - The action label.
     *  @param handler - Callback invoked after the transition.
     *  @returns `this` for chaining.
     */
    post_hook_action(from: string, to: string, action: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     * Post-transition hook on any edge triggered by a specific action.
     *  @param action  - The action name.
     *  @param handler - Callback invoked after any transition with this action.
     *  @returns `this` for chaining.
     */
    post_hook_global_action(action: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     * Post-transition hook on any action-driven transition.
     *  @param handler - Callback invoked after any action transition.
     *  @returns `this` for chaining.
     */
    post_hook_any_action(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     * Post-transition hook on any standard (`->`) transition.
     *  @param handler - Callback invoked after any legal transition.
     *  @returns `this` for chaining.
     */
    post_hook_standard_transition(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     * Post-transition hook on any main-path (`=>`) transition.
     *  @param handler - Callback invoked after any main transition.
     *  @returns `this` for chaining.
     */
    post_hook_main_transition(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     * Post-transition hook on any forced (`~>`) transition.
     *  @param handler - Callback invoked after any forced transition.
     *  @returns `this` for chaining.
     */
    post_hook_forced_transition(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     * Post-transition hook on any transition regardless of kind.
     *  @param handler - Callback invoked after every transition.
     *  @returns `this` for chaining.
     */
    post_hook_any_transition(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     * Post-transition hook that fires after entering a specific state.
     *  @param to      - The state that was entered.
     *  @param handler - Callback invoked after entry.
     *  @returns `this` for chaining.
     */
    post_hook_entry(to: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     * Post-transition hook that fires after leaving a specific state.
     *  @param from    - The state that was exited.
     *  @param handler - Callback invoked after exit.
     *  @returns `this` for chaining.
     */
    post_hook_exit(from: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     * Register a pre-transition hook that fires **before** all other pre-hooks
     *  on every transition.  If the handler returns `false`, the transition is
     *  blocked.  The handler receives an {@link EverythingHookContext} whose
     *  `hook_name` is `'pre everything'`.
     *
     *  ```typescript
     *  const m = sm`a -> b -> c;`;
     *  m.hook_pre_everything(({ hook_name }) => {
     *    console.log(`${hook_name} fired`);
     *    return true;
     *  });
     *  ```
     *  @param handler - Callback invoked before all other pre-hooks.
     *  @returns `this` for chaining.
     */
    hook_pre_everything(handler: EverythingHookHandler<mDT>): Machine<mDT>;
    /**
     * Register a pre-transition hook that fires **after** all other pre-hooks
     *  on every transition.  If the handler returns `false`, the transition is
     *  blocked.  The handler receives an {@link EverythingHookContext} whose
     *  `hook_name` is `'everything'`.
     *
     *  ```typescript
     *  const m = sm`a -> b -> c;`;
     *  m.hook_everything(({ hook_name }) => {
     *    console.log(`${hook_name} fired`);
     *    return true;
     *  });
     *  ```
     *  @param handler - Callback invoked after all other pre-hooks.
     *  @returns `this` for chaining.
     */
    hook_everything(handler: EverythingHookHandler<mDT>): Machine<mDT>;
    /**
     * Register a post-transition hook that fires **after** all other
     *  post-hooks on every transition.  Cannot block the transition.  The
     *  handler receives an {@link EverythingHookContext} whose `hook_name` is
     *  `'post everything'`.
     *
     *  ```typescript
     *  const m = sm`a -> b -> c;`;
     *  m.hook_post_everything(({ hook_name }) => {
     *    console.log(`${hook_name} fired`);
     *  });
     *  ```
     *  @param handler - Callback invoked after all other post-hooks.
     *  @returns `this` for chaining.
     */
    hook_post_everything(handler: PostEverythingHookHandler<mDT>): Machine<mDT>;
    /**
     * Register a post-transition hook that fires **before** all other
     *  post-hooks on every transition.  Cannot block the transition.  The
     *  handler receives an {@link EverythingHookContext} whose `hook_name` is
     *  `'pre post everything'`.
     *
     *  ```typescript
     *  const m = sm`a -> b -> c;`;
     *  m.hook_pre_post_everything(({ hook_name }) => {
     *    console.log(`${hook_name} fired`);
     *  });
     *  ```
     *  @param handler - Callback invoked before all other post-hooks.
     *  @returns `this` for chaining.
     */
    hook_pre_post_everything(handler: PostEverythingHookHandler<mDT>): Machine<mDT>;
    /**
     * Get the current RNG seed used for probabilistic transitions.
     *  @returns The numeric seed value.
     */
    get rng_seed(): number;
    /**
     * Set the RNG seed.  Pass `undefined` to reseed from the current time.
     *  Resets the internal PRNG so subsequent probabilistic operations use the
     *  new seed.
     *  @param to - The seed value, or `undefined` for time-based seeding.
     */
    set rng_seed(to: number | undefined);
    /**
     * Get all edges between two states (there can be multiple with
     *  different actions).
     *  @param from - Source state name.
     *  @param to   - Target state name.
     *  @returns An array of matching {@link JssmTransition} objects.
     */
    edges_between(from: string, to: string): JssmTransition<StateType, mDT>[];
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
     *  ```typescript
     *  import { sm } from 'jssm';
     *
     *  const machine = sm`a -> b -> c;`;
     *  console.log( machine.state() );    // 'a'
     *
     *  machine.go('b');
     *  machine.go('c');
     *  console.log( machine.state() );    // 'c'
     *
     *  machine.override('a');
     *  console.log( machine.state() );    // 'a'
     *  ```
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
    override(newState: StateType, newData?: mDT): void;
    /*********
     *
     *  Shared transition core used by {@link transition}, {@link force_transition},
     *  and {@link action}.  Runs validation, fires the full hook pipeline (pre-
     *  everything, any-action, after, any-transition, exit, named, basic,
     *  edge-type, entry, everything), commits the new state if nothing
     *  rejected, and returns whether the transition succeeded.
     *
     *  Not meant for external use.  Call one of the public wrappers instead:
     *  - `transition` for an ordinary legal transition
     *  - `force_transition` to bypass the legality check
     *  - `action` to dispatch by action name rather than target state
     *
     *  @remarks
     *  Known sharp edges, carried over from the original `// TODO` comments:
     *  - The forced-ness behavior needs to be cleaned up a lot here.
     *  - The callbacks are not fully correct across the forced / action / plain
     *    cases and should be revisited.
     *  - When multiple edges exist between two states with different `kind`
     *    values, only the first edge's kind is used to pick the edge-type hook.
     *
     *  @typeParam mDT The type of the machine data member; usually omitted.
     *
     *  @param newStateOrAction The target state name (for a plain or forced
     *  transition) or the action name (when `wasAction` is true).
     *
     *  @param newData Optional replacement machine data to install alongside
     *  the transition.  Hooks may further override this via complex results.
     *
     *  @param wasForced `true` if the caller invoked `force_transition`, in
     *  which case legality is checked against `valid_force_transition` rather
     *  than `valid_transition`.
     *
     *  @param wasAction `true` if the caller invoked `action`, in which case
     *  `newStateOrAction` is an action name and the target state is looked up
     *  via the current action edge.
     *
     *  @param dataProvided `true` when the caller explicitly supplied a data
     *  argument — even an explicitly-`undefined` one, which commits `undefined`
     *  as the new data (StoneCypher/fsl#1264).  When `false` the current data
     *  is preserved.  The public wrappers derive this from call arity; the
     *  default reproduces the old `!== undefined` inference for any direct
     *  callers.
     *
     *  @returns `true` if the transition was valid and every hook passed;
     *  `false` if the transition was invalid or any hook rejected.
     *
     *  @internal
     *
     */
    transition_impl(newStateOrAction: StateType, newData: mDT | undefined, wasForced: boolean, wasAction: boolean, dataProvided?: boolean): boolean;
    /**
     * If the current state has an `after` timeout configured, schedule it.
     *  Called internally after each transition.
     */
    auto_set_state_timeout(): void;
    /*********
     *
     *  Get a truncated history of the recent states and data of the machine.
     *  Turned off by default; configure with `.from('...', {data: 5})` by length,
     *  or set `.history_length` at runtime.
     *
     *  History *does not contain the current state*.  If you want that, call
     *  `.history_inclusive` instead.
     *
     *  ```typescript
     *  const foo = jssm.from(
     *    "a 'next' -> b 'next' -> c 'next' -> d 'next' -> e;",
     *    { history: 3 }
     *  );
     *
     *  foo.action('next');
     *  foo.action('next');
     *  foo.action('next');
     *  foo.action('next');
     *
     *  foo.history;  // [ ['b',undefined], ['c',undefined], ['d',undefined] ]
     *  ```
     *
     *  Notice that the machine's current state, `e`, is not in the returned list.
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     */
    get history(): [string, mDT][];
    /*********
     *
     *  Get a truncated history of the recent states and data of the machine,
     *  including the current state.  Turned off by default; configure with
     *  `.from('...', {data: 5})` by length, or set `.history_length` at runtime.
     *
     *  History inclusive contains the current state.  If you only want past
     *  states, call `.history` instead.
     *
     *  The list returned will be one longer than the history buffer kept, as the
     *  history buffer kept gets the current state added to it to produce this
     *  list.
     *
     *  ```typescript
     *  const foo = jssm.from(
     *    "a 'next' -> b 'next' -> c 'next' -> d 'next' -> e;",
     *    { history: 3 }
     *  );
     *
     *  foo.action('next');
     *  foo.action('next');
     *  foo.action('next');
     *  foo.action('next');
     *
     *  foo.history_inclusive;  // [ ['b',undefined], ['c',undefined], ['d',undefined], ['e',undefined] ]
     *  ```
     *
     *  Notice that the machine's current state, `e`, is in the returned list.
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     */
    get history_inclusive(): [string, mDT][];
    /*********
     *
     *  Find out how long a history this machine is keeping.  Defaults to zero.
     *  Settable directly.
     *
     *  ```typescript
     *  const foo = jssm.from("a -> b;");
     *  foo.history_length;                                  // 0
     *
     *  const bar = jssm.from("a -> b;", { history: 3 });
     *  foo.history_length;                                  // 3
     *  foo.history_length = 5;
     *  foo.history_length;                                  // 5
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     */
    get history_length(): number;
    set history_length(to: number);
    /********
     *
     *  Instruct the machine to complete an action.  Synonym for {@link do}.
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
     *  @param newData The data change to insert during the action
     *
     *  @returns `true` if the action was valid and the transition occurred,
     *  `false` otherwise.
     *
     */
    action(actionName: StateType, newData?: mDT): boolean;
    /********
     *
     *  Get the standard style for a single state.  ***Does not*** include
     *  composition from an applied theme, or things from the underlying base
     *  stylesheet; only the modifications applied by this machine.
     *
     *  ```typescript
     *  const light = sm`a -> b;`;
     *  console.log(light.standard_state_style);
     *  // {}
     *
     *  const light = sm`a -> b; state: { shape: circle; };`;
     *  console.log(light.standard_state_style);
     *  // { shape: 'circle' }
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @returns The {@link JssmStateConfig} for standard states.
     *
     */
    get standard_state_style(): JssmStateConfig;
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
     *  ```typescript
     *  const light = sm`a -> b;`;
     *  console.log(light.hooked_state_style);
     *  // {}
     *
     *  const light = sm`a -> b; hooked_state: { shape: circle; };`;
     *  console.log(light.hooked_state_style);
     *  // { shape: 'circle' }
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @returns The {@link JssmStateConfig} for hooked states.
     *
     */
    get hooked_state_style(): JssmStateConfig;
    /********
     *
     *  Get the start state style.  ***Does not*** include composition from an
     *  applied theme, or things from the underlying base stylesheet; only the
     *  modifications applied by this machine.
     *
     *  Start states are defined by the directive `start_states`, or in absentia,
     *  are the first mentioned state.
     *
     *  ```typescript
     *  const light = sm`a -> b;`;
     *  console.log(light.start_state_style);
     *  // {}
     *
     *  const light = sm`a -> b; start_state: { shape: circle; };`;
     *  console.log(light.start_state_style);
     *  // { shape: 'circle' }
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @returns The {@link JssmStateConfig} for start states.
     *
     */
    get start_state_style(): JssmStateConfig;
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
     *  ```typescript
     *  const light = sm`a -> b;`;
     *  console.log(light.standard_state_style);
     *  // {}
     *
     *  const light = sm`a -> b; end_state: { shape: circle; };`;
     *  console.log(light.standard_state_style);
     *  // { shape: 'circle' }
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @returns The {@link JssmStateConfig} for end states.
     *
     */
    get end_state_style(): JssmStateConfig;
    /********
     *
     *  Get the terminal state style.  ***Does not*** include
     *  composition from an applied theme, or things from the underlying base
     *  stylesheet; only the modifications applied by this machine.
     *
     *  Terminal state styles are automatically determined by the machine.  Any
     *  state without a valid exit transition is terminal.
     *
     *  ```typescript
     *  const light = sm`a -> b;`;
     *  console.log(light.terminal_state_style);
     *  // {}
     *
     *  const light = sm`a -> b; terminal_state: { shape: circle; };`;
     *  console.log(light.terminal_state_style);
     *  // { shape: 'circle' }
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @returns The {@link JssmStateConfig} for terminal states.
     *
     */
    get terminal_state_style(): JssmStateConfig;
    /********
     *
     *  Get the style for the active state.  ***Does not*** include
     *  composition from an applied theme, or things from the underlying base
     *  stylesheet; only the modifications applied by this machine.
     *
     *  ```typescript
     *  const light = sm`a -> b;`;
     *  console.log(light.active_state_style);
     *  // {}
     *
     *  const light = sm`a -> b; active_state: { shape: circle; };`;
     *  console.log(light.active_state_style);
     *  // { shape: 'circle' }
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @returns The {@link JssmStateConfig} for the active state.
     *
     */
    get active_state_style(): JssmStateConfig;
    /********
     *
     *  Generate the uniform observational-hook registry — every currently
     *  registered hook projected onto a normalized `(kind, target, phase)` row
     *  (megaspec §12, → #1357).  The registry is *generated* on demand by
     *  walking the concrete per-kind storage tables rather than maintained as a
     *  second copy, so it can never drift from the tables {@link Machine.set_hook}
     *  actually dispatches into.  It is the single source of truth behind the
     *  introspection accessors ({@link Machine.has_hook}, {@link Machine.hooks_on})
     *  and the `hooked_state` viz styling.
     *
     *  Targets are normalized: edge hooks become `{ scope: 'edge', from, to }`
     *  (named hooks add `action`), entry/exit/after become `{ scope: 'state' }`,
     *  global-action hooks become `{ scope: 'action' }`, and the `any-*`,
     *  transition-class, and `everything` observers become `{ scope: 'global' }`.
     *
     *  ```typescript
     *  const m = sm`a 'go' -> b;`;
     *  m.hook_entry('b', () => true);
     *  m.hook_registry();
     *  // => [ { kind: 'entry', phase: 'pre', target: { scope: 'state', state: 'b' } } ]
     *  ```
     *
     *  @returns Every registered hook as a {@link HookRegistryEntry}, in a stable
     *  table-walk order (pre-phase tables first, then post-phase).
     *
     */
    hook_registry(): HookRegistryEntry[];
    /********
     *
     *  Does a single registry entry reference the state `state`?  An entry
     *  references a state when it is a `'state'`-scoped hook on that state, or an
     *  `'edge'`-scoped hook whose `from` or `to` is that state.  `'action'`- and
     *  `'global'`-scoped entries reference no particular state.  This is the
     *  predicate behind both per-state introspection and the `hooked_state`
     *  styling layer.
     *
     *  @param entry The registry entry to test.
     *  @param state The state name to test membership of.
     *  @returns `true` when the entry observes that state.
     *
     */
    private static _entry_touches_state;
    /********
     *
     *  Does a single registry entry match a `{ from, to, action? }` edge query?
     *  Only `'edge'`-scoped entries can match.  When the query omits `action`
     *  the entry's action (if any) is ignored; when the query supplies `action`
     *  it must match exactly.
     *
     *  @param entry The registry entry to test.
     *  @param from  The edge origin to match.
     *  @param to    The edge destination to match.
     *  @param action Optional named action to match exactly.
     *  @returns `true` when the entry observes that edge.
     *
     */
    private static _entry_matches_edge;
    /********
     *
     *  Does a single registry entry match an action name?  Both `'action'`-scoped
     *  hooks (global-action hooks) and named-edge hooks carrying that action
     *  count as matches.
     *
     *  @param entry  The registry entry to test.
     *  @param action The action name to match.
     *  @returns `true` when the entry observes that action.
     *
     */
    private static _entry_matches_action;
    /********
     *
     *  Does a single registry entry match a named state group?  Only
     *  `'group'`-scoped entries (FSL group-boundary hooks) match.  Group hooks
     *  are matched by group name only — they deliberately do not propagate to
     *  member states, so a member-state query never returns them.
     *
     *  @param entry The registry entry to test.
     *  @param group The group name to match.
     *  @returns `true` when the entry observes that group's boundary.
     *
     */
    private static _entry_matches_group;
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
     *  ```typescript
     *  const m = sm`a 'go' -> b;`;
     *  m.hook_entry('b', () => true);
     *  m.hooks_on('b').length;             // 1
     *  m.hooks_on({ from: 'a', to: 'b' }); // []  (no edge hook registered)
     *  ```
     *
     *  @param query The {@link HookQuery} naming the target to inspect.
     *  @returns The matching {@link HookRegistryEntry} rows (possibly empty).
     *
     */
    hooks_on(query: HookQuery): HookRegistryEntry[];
    /********
     *
     *  Is at least one observational hook bound to the given target (megaspec
     *  §12)?  The `query` is read exactly as in {@link Machine.hooks_on}.  An
     *  optional `phase` narrows the test to pre- or post-transition hooks only;
     *  omitted, either phase satisfies it.
     *
     *  ```typescript
     *  const m = sm`a -> b;`;
     *  m.has_hook('b');                 // false
     *  m.hook_entry('b', () => true);
     *  m.has_hook('b');                 // true
     *  m.has_hook('b', 'post');         // false  (the entry hook is pre-phase)
     *  ```
     *
     *  @param query The {@link HookQuery} naming the target to inspect.
     *  @param phase Optional {@link HookPhase} to restrict the test to.
     *  @returns `true` when a matching hook exists.
     *
     */
    has_hook(query: HookQuery, phase?: HookPhase): boolean;
    /********
     *
     *  Does the given state carry any observational hook — i.e. should it receive
     *  the `hooked_state` viz styling?  True when an entry/exit/after hook is
     *  bound to the state, any edge hook touches it, or the state has its own
     *  boundary hook.  Group-boundary hooks do *not* count here — they are
     *  matched by group only and never propagate to member states.  Powers the
     *  `hooked` styling layer in {@link Machine.resolve_state_config}; replaces
     *  the long-stubbed `has_hooks` placeholder (megaspec §12).
     *
     *  ```typescript
     *  const m = sm`a -> b;`;
     *  m.state_has_hooks('a');          // false
     *  m.hook_exit('a', () => true);
     *  m.state_has_hooks('a');          // true
     *  ```
     *
     *  @param state The state to test.
     *  @returns `true` when the state is observed by at least one hook.
     *
     */
    state_has_hooks(state: StateType): boolean;
    /********
     *
     *  Resolves the full unified style/config cascade for a state — the runtime
     *  successor to the ad-hoc layer merge {@link style_for} used to perform.
     *
     *  For any state OTHER than the current one, this returns the memoized static
     *  resolution (tiers 1–5; see `_compose_state_config`) — theme →
     *  `default_state_config` → per-kind defaults → depth-ordered group metadata →
     *  per-state config.  The cache is keyed by state and never invalidated, since
     *  those tiers do not depend on which state is current.
     *
     *  For the machine's CURRENTLY-occupied state the result is recomputed each
     *  call (never cached) and additionally carries the dynamic `active_state`
     *  layers: the active-state THEME layers fold in just below the per-state
     *  config (tier 3-active), and the user `active_state : { … }` overlay folds
     *  in LAST (tier 6), on top of everything, so it wins over per-state config.
     *  Every fold uses `merge_state_config`, so a key set at a lower tier is
     *  overridden — never rejected — by a higher one.
     *
     *  ```typescript
     *  import { sm } from 'jssm';
     *
     *  const m = sm`&busy : [working]; idle 'go' -> working; state &busy : { color: orange; };`;
     *  m.resolve_state_config('working').color;  // '#ffa500ff' — from group &busy
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param state The state to compute the composite config for.
     *
     *  @returns The fully composited {@link JssmStateConfig} for the state,
     *  including the active overlay when the state is current.
     *
     *  @see style_for
     *
     */
    resolve_state_config(state: StateType): JssmStateConfig;
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
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param state The state to compute the composite style for.
     *
     *  @returns The fully composited {@link JssmStateConfig} for the given state.
     *
     *  @see resolve_state_config
     *
     */
    style_for(state: StateType): JssmStateConfig;
    /********
     *
     *  Instruct the machine to complete an action.  Synonym for {@link action}.
     *
     *  ```typescript
     *  const light = sm`
     *    off 'start' -> red;
     *    red 'next' -> green 'next' -> yellow 'next' -> red;
     *    [red yellow green] 'shutdown' ~> off;
     *  `;
     *
     *  light.state();       // 'off'
     *  light.do('start');   // true
     *  light.state();       // 'red'
     *  light.do('next');    // true
     *  light.state();       // 'green'
     *  light.do('next');    // true
     *  light.state();       // 'yellow'
     *  light.do('dance');   // !! false - no such action
     *  light.state();       // 'yellow'
     *  light.do('start');   // !! false - yellow does not have the action start
     *  light.state();       // 'yellow'
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param actionName The action to engage
     *
     *  @param newData The data change to insert during the action
     *
     *  @returns `true` if the action was valid and the transition occurred,
     *  `false` otherwise.
     *
     */
    do(actionName: StateType, newData?: mDT): boolean;
    /********
     *
     *  Instruct the machine to complete a transition.  Synonym for {@link go}.
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
     *  light.go('green');   // true
     *  light.state();       // 'green'
     *  light.go('blue');    // !! false - no such state
     *  light.state();       // 'green'
     *  light.go('red');     // !! false - green may not go directly to red, only to yellow
     *  light.state();       // 'green'
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param newState The state to switch to
     *
     *  @param newData The data change to insert during the transition
     *
     *  @returns `true` if the transition was legal and occurred, `false` otherwise.
     *
     */
    transition(newState: StateType, newData?: mDT): boolean;
    /********
     *
     *  Instruct the machine to complete a transition.  Synonym for {@link transition}.
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
     *  @param newData The data change to insert during the transition
     *
     *  @returns `true` if the transition was legal and occurred, `false` otherwise.
     *
     */
    go(newState: StateType, newData?: mDT): boolean;
    /********
     *
     *  Instruct the machine to complete a forced transition (which will reject if
     *  called with a normal {@link transition} call.)
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
     *  @param newData The data change to insert during the transition
     *
     *  @returns `true` if a transition (forced or otherwise) existed and occurred,
     *  `false` otherwise.
     *
     */
    force_transition(newState: StateType, newData?: mDT): boolean;
    /**
     * Get the edge index for an action from the current state.
     *  Interned dispatch: resolves via the numeric (action, from) index —
     *  unknown action names miss without throwing.
     *  @param action - The action name.
     *  @returns The edge index, or `undefined` if the action is not available.
     */
    current_action_for(action: StateType): number;
    /**
     * Get the full transition object for an action from the current state.
     *  @param action - The action name.
     *  @returns The {@link JssmTransition} object.
     *  @throws {JssmError} If the action is not available from the current state.
     */
    current_action_edge_for(action: StateType): JssmTransition<StateType, mDT>;
    /**
     * Check whether an action is available from the current state.
     *  @param action   - The action name to check.
     *  @param _newData - Reserved for future data validation.
     *  @returns `true` if the action can be taken.
     */
    valid_action(action: StateType, _newData?: mDT): boolean;
    /**
     * Check whether a transition to a given state is legal (non-forced) from
     *  the current state.
     *  @param newState - The target state.
     *  @param _newData - Reserved for future data validation.
     *  @returns `true` if the transition is legal.
     */
    valid_transition(newState: StateType, _newData?: mDT): boolean;
    /**
     * Check whether a forced transition to a given state exists from the
     *  current state.
     *  @param newState - The target state.
     *  @param _newData - Reserved for future data validation.
     *  @returns `true` if a forced (or any) transition exists.
     */
    valid_force_transition(newState: StateType, _newData?: mDT): boolean;
    /**
     * Get the instance name of this machine, if one was assigned at creation.
     *  @returns The instance name string, or `undefined`.
     */
    instance_name(): string | undefined;
    /**
     * Get the creation date of this machine as a `Date` object.
     *  @returns A `Date` representing when the machine was created.
     */
    get creation_date(): Date;
    /**
     * Get the creation timestamp (milliseconds since epoch).
     *  @returns The timestamp as a number.
     */
    get creation_timestamp(): number;
    /**
     * Get the timestamp when construction began (before parsing).
     *  @returns The start-of-construction timestamp as a number.
     */
    get create_start_time(): number;
    /**
     * Schedule an automatic transition to `next_state` after `after_time`
     *  milliseconds.  Only one timeout may be active at a time.
     *  @param next_state - The state to transition to when the timer fires.
     *  @param after_time - Delay in milliseconds.
     *  @throws {JssmError} If a timeout is already pending.
     */
    set_state_timeout(next_state: StateType, after_time: number): void;
    /**
      Cancel any pending state timeout.  Safe to call when no timeout is active.
     */
    clear_state_timeout(): void;
    /**
     * Get the configured `after` timeout for a given state, if any.
     *  @param which_state - The state to look up.
     *  @returns A `[targetState, delayMs]` tuple, or `undefined` if no timeout
     *  is configured for that state.
     */
    state_timeout_for(which_state: StateType): [StateType, number] | undefined;
    /**
     * Get the configured `after` timeout for the current state, if any.
     *  @returns A `[targetState, delayMs]` tuple, or `undefined`.
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
}
/*********
 *
 *  Create a state machine from a template string.  This is one of the two main
 *  paths for working with JSSM, alongside {@link from}.
 *
 *  Use this method when you want to work directly and conveniently with a
 *  constant template expression.  Use `.from` when you want to pull from
 *  dynamic strings.
 *
 *
 *  ```typescript
 *  import * as jssm from 'jssm';
 *
 *  const lswitch = jssm.from('on <=> off;');
 *  ```
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
 *  Create a state machine from an implementation string.  This is one of the
 *  two main paths for working with JSSM, alongside {@link sm}.
 *
 *  Use this method when you want to conveniently pull a state machine from a
 *  string dynamically.  Use operator `sm` when you just want to work with a
 *  template expression.
 *
 *  ```typescript
 *  import * as jssm from 'jssm';
 *
 *  const lswitch = jssm.from('on <=> off;');
 *  ```
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param MachineAsString The FSL code to evaluate
 *
 *  @param ExtraConstructorFields Extra non-code configuration to pass at creation time
 *
 */
declare function from<mDT>(MachineAsString: string, ExtraConstructorFields?: Partial<JssmGenericConfig<StateType, mDT>>): Machine<mDT>;
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
 *  ```typescript
 *  is_hook_complex_result({ pass: true });                 // true
 *  is_hook_complex_result({ pass: false, data: { x: 1 }}); // true
 *  is_hook_complex_result(true);                           // false
 *  is_hook_complex_result(null);                           // false
 *  is_hook_complex_result({ other: 'thing' });             // false
 *  ```
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
 *  ```typescript
 *  is_hook_rejection(true);            // false (pass)
 *  is_hook_rejection(undefined);       // false (pass)
 *  is_hook_rejection(false);           // true  (reject)
 *  is_hook_rejection({ pass: true });  // false (pass)
 *  is_hook_rejection({ pass: false }); // true  (reject)
 *  ```
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
 * import { from, deserialize } from 'jssm';
 * const machine    = from("a -> b;");
 * const serialized = machine.serialize();
 * const restored   = deserialize("a -> b;", serialized);
 * restored.state();  // => 'a'
 */
declare function deserialize<mDT>(machine_string: string, ser: JssmSerialization<mDT>): Machine<mDT>;

export { FslDirections, Machine, STOCHASTIC_DEFAULT_MAX_STEPS, STOCHASTIC_DEFAULT_RUNS, abstract_everything_hook_step, abstract_hook_step, action_label_chars, arrow_direction, arrow_left_kind, arrow_right_kind, build_time, compareVersions, compile, jssm_constants_d as constants, deserialize, find_repeated, from, fslCompletions, fslDiagnostics, fslSemanticSpans, fsl_fence_lang, gen_splitmix32, gviz_shapes, histograph, is_hook_complex_result, is_hook_rejection, make, named_colors, wrap_parse as parse, parse_fence_info, seq, shapes, sleep, sm, state_name_chars, state_name_first_chars, state_style_condense, transfer_state_properties, unique, version, weighted_histo_key, weighted_rand_select, weighted_sample_select };
export type { FenceDescriptor, FenceDimension, FenceDimensionUnit, FenceImageFormat, FencePart };
