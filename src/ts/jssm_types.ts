
import { circular_buffer } from 'circular_buffer_js';





type StateType = string;





/** Composite type indicating success as part of a result. */
type JssmSuccess        = { success: true };

/** Composite type indicating an error, and the reason for it, as part of a result. */
type JssmFailure        = { success: false, error: any };

/** Composite type indicating that a result isn't finished yet. */
type JssmIncomplete     = { success: 'incomplete' };

/**
 *  Discriminated union representing the outcome of an operation: either
 *  success, failure (with an `error`), or incomplete.  Used as the return
 *  shape for operations that may need to report partial progress.
 */
type JssmResult         = JssmSuccess | JssmFailure | JssmIncomplete;

/**
 *  A color value accepted by jssm-viz for state and arrow styling.  Currently
 *  any string, validated downstream by Graphviz / the named-colors list.
 *  Intended to be narrowed to `#RRGGBB` / `#RRGGBBAA` and CSS named colors
 *  in a future release.
 */
type JssmColor          = string;  // TODO FIXME constrain to #RRGGBBAA later // whargarbl



/**
 *  Two-state policy flag: a feature is either `'required'` or `'disallowed'`.
 *  Used by machine configuration where the option must take a definite stance.
 */
type JssmPermitted      = 'required' | 'disallowed';

/**
 *  Three-state policy flag: `'required'`, `'disallowed'`, or `'optional'`.
 *  Used by machine configuration where a default-permissive middle ground
 *  is meaningful (for example, the `actions` config key).
 */
type JssmPermittedOpt   = 'required' | 'disallowed' | 'optional';

/**
 *  The set of ASCII arrow tokens recognized by the FSL grammar.  Each arrow
 *  encodes a direction (one-way left/right, or two-way) and a "kind" for
 *  each direction (`-` legal, `=` main path, `~` forced-only).  See the
 *  Language Reference docs for the full semantic table.
 */
type JssmArrow          = '->' | '<-' | '<->' | '<=->' | '<~->'
                        | '=>' | '<=' | '<=>' | '<-=>' | '<~=>'
                        | '~>' | '<~' | '<~>' | '<-~>' | '<=~>';
                        // | '⇒'  | '⇐'  | '⇔'  | '⇐→' | '↚→'
                        // | '→'  | '←'  | '↔'  | '←⇒' | '↚⇒'
                        // | '↛'  | '↚'  | '↮'  | '←↛' | '⇐↛';

// TODO finish the arrow types - unicode *and* mixed

/**
 * A type teaching Typescript the various supported shapes for nodes, mostly inherited from GraphViz
 */
type JssmShape          = "box" | "polygon" | "ellipse" | "oval" | "circle" | "point" | "egg" | "triangle"
                        | "plaintext" | "plain" | "diamond" | "trapezium" | "parallelogram" | "house" | "pentagon"
                        | "hexagon" | "septagon" | "octagon" | "doublecircle" | "doubleoctagon" | "tripleoctagon"
                        | "invtriangle" | "invtrapezium" | "invhouse" | "Mdiamond" | "Msquare" | "Mcircle" | "rect"
                        | "rectangle" | "square" | "star" | "none" | "underline" | "cylinder" | "note" | "tab"
                        | "folder" | "box3d" | "component" | "promoter" | "cds" | "terminator" | "utr" | "primersite"
                        | "restrictionsite" | "fivepoverhang" | "threepoverhang" | "noverhang" | "assembly"
                        | "signature" | "insulator" | "ribosite" | "rnastab" | "proteasesite" | "proteinstab"
                        | "rpromoter" | "rarrow" | "larrow" | "lpromoter" | "record";

/**
 *  Direction polarity of an arrow: pointing only `'left'`, only `'right'`,
 *  or `'both'` (a bidirectional arrow).
 */
type JssmArrowDirection = 'left' | 'right' | 'both';

/**
 *  Semantic category of an arrow's transition.  `'legal'` is a normal
 *  transition, `'main'` is part of the machine's primary path, `'forced'`
 *  may only be taken via {@link Machine.force_transition}, and `'none'`
 *  means no transition exists in that direction.
 */
type JssmArrowKind      = 'none' | 'legal' | 'main' | 'forced';

/**
 *  Graphviz layout engine selector.  Controls how jssm-viz lays out the
 *  rendered diagram; `'dot'` is the default and most useful for state
 *  machines.  See the Graphviz documentation for the differences.
 */
type JssmLayout         = 'dot' | 'circo' | 'twopi' | 'fdp' | 'neato';  // todo add the rest

type JssmCorner         = 'regular' | 'rounded' | 'lined';
type JssmLineStyle      = 'solid' | 'dashed' | 'dotted';

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
 *
 *  @see Machine.default_size
 */
type JssmDefaultSize = { width?: number; height?: number };





/**
 *  Runtime-iterable list of valid `flow` directions for FSL diagrams.
 *  Use this when you need to enumerate directions; for the type itself
 *  see {@link FslDirection}.
 */
const FslDirections     = ['up', 'right', 'down', 'left'] as const;

/**
 *  String literal type of the four supported FSL flow directions.  This is
 *  the type of the `flow` config key on a machine.
 */
type  FslDirection      = typeof FslDirections[number];

/**
 *  Runtime-iterable list of the built-in theme names that ship with jssm-viz.
 *  Use this when you need to enumerate themes; for the type itself see
 *  {@link FslTheme}.
 */
const FslThemes         = ['default', 'ocean', 'modern', 'plain', 'bold'] as const;

/**
 *  String literal type of the built-in theme names.  This is the element
 *  type of the `theme` config key (which accepts an array so that themes
 *  can be layered).
 */
type  FslTheme          = typeof FslThemes[number];





/**
 *  Persistable snapshot of a Machine produced by {@link Machine.serialize}
 *  and consumed by {@link deserialize}.  Carries the current state, the
 *  associated machine data, the recent history (subject to the configured
 *  capacity), and metadata to detect version-skew on rehydration.
 *
 *  @typeParam DataType - The type of the user-supplied data payload (`mDT`).
 */
type JssmSerialization<DataType> = {

  jssm_version     : string,
  timestamp        : number,
  comment?         : string | undefined,
  state            : StateType,
  history          : [string, DataType][],
  history_capacity : number,
  data             : DataType

};





/**
 *  A bare reference to a named group as it appears in the parse tree —
 *  written `&Name` in FSL.  Stands in for a state wherever a group may be
 *  used (a transition source/target, a `state` declaration subject, or a
 *  hook subject).  Distinct from the `&Name : [...]` declaration form,
 *  which defines the group's members.
 *
 *  ```typescript
 *  import { parse } from 'jssm';
 *  parse('&busy : [a b]; &busy -> idle;')[1].from;
 *  // { key: 'group_ref', name: 'busy' }
 *  ```
 *
 *  @see JssmGroupMemberRef
 *  @see JssmGroupRegistry
 */
type JssmGroupRef = {
  key  : 'group_ref',
  name : string
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
 *
 *  @see JssmGroupRef
 *  @see JssmGroupRegistry
 */
type JssmGroupMemberRef =
    { kind: 'state'; name: string }
  | { kind: 'group'; name: string; mode: 'nest' | 'spread' };

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
 *
 *  @see JssmGroupMemberRef
 */
type JssmGroupRegistry = Map<string, JssmGroupMemberRef[]>;

/**
 *  A parsed FSL boundary-hook declaration — the `on <enter|exit> <subject> do
 *  '<action>';` form.  `event` is the boundary crossing the hook listens for,
 *  `subject` is either a {@link JssmGroupRef} (a `&Group`) or a plain state
 *  label `string`, and `action` is the (unquoted) action name to run.  The
 *  compiler routes a group subject into `group_hooks` and a state subject
 *  into `state_hooks` on {@link JssmGenericConfig}; runtime firing is a
 *  later task.
 *
 *  ```typescript
 *  import { parse } from 'jssm';
 *  parse("on enter &busy do 'log';")[0];
 *  // { key:'hook_decl', event:'enter',
 *  //   subject:{ key:'group_ref', name:'busy' }, action:'log' }
 *  ```
 *
 *  @see JssmGroupRef
 *  @see JssmGroupHooks
 */
type JssmHookDeclaration = {
  key     : 'hook_decl',
  event   : 'enter' | 'exit',
  subject : JssmGroupRef | string,
  action  : string
};

/**
 *  The compiled boundary-hook surface for a single subject (a group or a
 *  state): the action to run on entry (`onEnter`) and/or on exit (`onExit`).
 *  Each is optional so a subject may declare only one direction; the compiler
 *  merges an `enter` and an `exit` declaration for the same subject into one
 *  of these.
 *
 *  @see JssmHookDeclaration
 */
type JssmBoundaryHooks = {
  onEnter? : string,
  onExit?  : string
};

/**
 *  Maps each group name that has at least one boundary hook to its merged
 *  {@link JssmBoundaryHooks}.  Carried on {@link JssmGenericConfig} for the
 *  runtime to consume; depth-aware firing is a later task.
 *
 *  @see JssmHookDeclaration
 */
type JssmGroupHooks = Map<string, JssmBoundaryHooks>;

/**
 *  Maps each plain state name that has at least one boundary hook to its
 *  merged {@link JssmBoundaryHooks}.  The state-subject analogue of
 *  {@link JssmGroupHooks}.
 *
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
  name           : string,
  default_value? : any,
  required?      : boolean,
  property?      : string,
  state?         : string
};





type JssmTransitionPermitter<DataType> =
  (OldState: StateType, NewState: StateType, OldData: DataType, NewData: DataType) => boolean;

type JssmTransitionPermitterMaybeArray<DataType> =
    JssmTransitionPermitter<DataType>
  | Array< JssmTransitionPermitter<DataType> >;





/**
 *  A single directed transition (edge) within a state machine.  Captures
 *  both the topology (`from` / `to`), the FSL semantics (`kind`,
 *  `forced_only`, `main_path`), and any optional metadata such as a
 *  per-edge `name`, an action label, a guard `check`, a transition
 *  `probability` for stochastic models, and an `after_time` for timed
 *  transitions.
 *
 *  @typeParam StateType - The state-name type (usually `string`).
 *  @typeParam DataType  - The machine's data payload type (`mDT`).
 */
type JssmTransition<StateType, DataType> = {

  from          : StateType,
  to            : StateType,
  after_time  ? : number,
  se          ? : JssmCompileSe<StateType, DataType>,
  name        ? : StateType,
  action      ? : StateType,
  check       ? : JssmTransitionPermitterMaybeArray<DataType>,  // validate this edge's transition; usually about data
  probability ? : number,                                       // for stoch modelling, would like to constrain to [0..1], dunno how // TODO FIXME
  kind          : JssmArrowKind,
  forced_only   : boolean,
  main_path     : boolean

};

/** A list of {@link JssmTransition}s — the edge set of a machine. */
type JssmTransitions<StateType, DataType> =
  JssmTransition<StateType, DataType>[];

/**
 *  The set of states that can immediately precede or follow a given state.
 *  Returned by jssm helpers that report a state's connectivity in the graph.
 */
type JssmTransitionList = {
  entrances : Array<StateType>,
  exits     : Array<StateType>
};

/**
 *  Internal marker used by the compiler to indicate a cycle declaration in
 *  the parse stream, rather than a literal state name.  See
 *  {@link JssmTransitionRule}.
 */
type JssmTransitionCycle = {
  key   : 'cycle',
  value : StateType
};

/**
 *  An entry produced while parsing a transition rule: either a literal
 *  state name (`StateType`) or a {@link JssmTransitionCycle} marker.
 */
type JssmTransitionRule =
  StateType
| JssmTransitionCycle;





/**
 *  Topology record for one node in a compiled machine: its name, the set of
 *  states it can be reached from, the set of states it can transition to,
 *  and whether reaching it constitutes "completing" the machine.
 */
type JssmGenericState = {

  from     : Array< StateType > ,
  name     :        StateType   ,
  to       : Array< StateType > ,
  complete : boolean

};





/**
 *  The full internal bookkeeping snapshot of a {@link Machine}, exposed for
 *  advanced introspection.  Contains the current state, the state map, the
 *  edge map and reverse-action map, and the original edge list.  The
 *  `internal_state_impl_version` field exists so that consumers can detect
 *  shape changes if this representation evolves.
 */
type JssmMachineInternalState<DataType> = {

  internal_state_impl_version : 1,

  state                       : StateType,
  states                      : Map< StateType, JssmGenericState >,
  named_transitions           : Map< StateType, number >,
  edge_map                    : Map< StateType, Map<StateType, number> >,
  actions                     : Map< StateType, Map<StateType, number> >,
  reverse_actions             : Map< StateType, Map<StateType, number> >,
  edges                       : Array< JssmTransition<StateType, DataType> >

};





type JssmStatePermitter<DataType> =
  (OldState: StateType, NewState: StateType, OldData: DataType, NewData: DataType) => boolean;

type JssmStatePermitterMaybeArray<DataType> =
  JssmStatePermitter<DataType> | Array< JssmStatePermitter<DataType> >;

/**
 *  Minimal machine description used internally and accepted by some
 *  lower-level constructors.  Most callers should use the richer
 *  {@link JssmGenericConfig} instead.
 */
type JssmGenericMachine<DataType> = {

  name?            : string,
  state            : StateType,
  data?            : DataType,
  nodes?           : Array<StateType>,
  transitions      : JssmTransitions<StateType, DataType>,
  check?           : JssmStatePermitterMaybeArray<DataType>,

  min_transitions? : number,
  max_transitions? : number,

  allow_empty?     : boolean,
  allow_islands?   : boolean,
  allow_force?     : boolean,

  keep_history?    : boolean | number

};





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
type FslSourcePoint    = { offset: number, line: number, column: number };
type FslSourceLocation = { start: FslSourcePoint, end: FslSourcePoint };


/**
 *  A single key/value pair from an FSL `state X: { ... };` block, in the
 *  raw form produced by the parser before being condensed into a
 *  {@link JssmStateDeclaration}.
 */
type JssmStateDeclarationRule = {
  key       : string,
  value     : any,  // TODO FIXME COMEBACK enumerate types against concrete keys
  name?     : string,

  loc       ? : FslSourceLocation,
  value_loc ? : FslSourceLocation
};

/**
 *  The fully-condensed declaration for a single state, including its raw
 *  rule list (`declarations`) and the well-known styling fields jssm-viz
 *  understands.  Returned by {@link Machine.state_declaration}.
 */
type JssmStateDeclaration = {

  declarations     : Array<JssmStateDeclarationRule>,

  shape?           : JssmShape,
  color?           : JssmColor,
  corners?         : JssmCorner,
  lineStyle?       : JssmLineStyle,

  stateLabel?      : string,

  textColor?       : JssmColor,
  backgroundColor? : JssmColor,
  borderColor?     : JssmColor,

  image?           : string,
  url?             : string,

  state            : StateType,
  property?        : { name: string, value: unknown }

};

/**
 *  A loosened version of {@link JssmStateDeclaration} where every field is
 *  optional.  Used as the value type for theme entries and for default
 *  state configuration where most fields will be inherited or merged.
 */
type JssmStateConfig = Partial<JssmStateDeclaration>;

type JssmStateStyleShape           = { key: 'shape',            value: JssmShape     };
type JssmStateStyleColor           = { key: 'color',            value: JssmColor     };
type JssmStateStyleTextColor       = { key: 'text-color',       value: JssmColor     };
type JssmStateStyleCorners         = { key: 'corners',          value: JssmCorner    };
type JssmStateStyleLineStyle       = { key: 'line-style',       value: JssmLineStyle };
type JssmStateStyleStateLabel      = { key: 'state-label',      value: string        };
type JssmStateStyleBackgroundColor = { key: 'background-color', value: JssmColor     };
type JssmStateStyleBorderColor     = { key: 'border-color',     value: JssmColor     };
type JssmStateStyleImage           = { key: 'image',            value: string        };
type JssmStateStyleUrl             = { key: 'url',              value: string        };

/**
 *  Tagged union of all individual style key/value pairs that may appear in
 *  a state's style configuration.  The `key` discriminator selects which
 *  member, and the `value` is typed accordingly.
 */
type JssmStateStyleKey     = JssmStateStyleShape | JssmStateStyleColor
                           | JssmStateStyleTextColor | JssmStateStyleCorners
                           | JssmStateStyleLineStyle | JssmStateStyleBackgroundColor
                           | JssmStateStyleStateLabel | JssmStateStyleBorderColor
                           | JssmStateStyleImage | JssmStateStyleUrl;

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
type JssmGraphDefaultEdgeColor = { key: 'graph_default_edge_color', value: JssmColor };

/**
 *  A single item inside a `transition: {}` default-config block.  For v1 this
 *  reuses the per-state style items (so `color: red;` works inside a
 *  `transition:` block exactly as inside a `state:` block) plus the
 *  edge-scoped {@link JssmGraphDefaultEdgeColor} default.
 *
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
 *
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
type JssmGraphAliasKey
  =  { key: 'graph_layout',   value: JssmLayout      }
  |  { key: 'graph_bg_color', value: JssmColor       }
  |  { key: 'dot_preamble',   value: string          }
  |  { key: 'theme',          value: FslTheme | FslTheme[] }
  |  { key: 'flow',           value: FslDirection    }
  |  JssmGraphDefaultEdgeColor;

/**
 *  A single item inside a `graph: {}` default-config block.  For v1 this
 *  reuses the per-state style items plus the graph-scope alias items
 *  ({@link JssmGraphAliasKey}) folded in from the deprecated top-level
 *  graph keywords.
 *
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
 *
 *  @see JssmTransitionConfig
 */
type JssmGraphConfig = JssmGraphStyleKey[];





/**
 *  Complete shape of a jssm-viz theme.  A theme provides a style block for
 *  each kind of state (`state`, `hooked`, `start`, `end`, `terminal`) as
 *  well as a matching `active_*` variant used while that state is current.
 *
 *  The `graph`, `legal`, `main`, `forced`, `action`, and `title` slots are
 *  reserved for future use and currently typed as `undefined`.
 *
 *  Most user-defined themes should be typed as {@link JssmTheme} (the
 *  `Partial` of this) so that omitted fields fall back to the base theme.
 */
type JssmBaseTheme = {

  name            : string,

  state           : JssmStateConfig,
  hooked          : JssmStateConfig,
  start           : JssmStateConfig,
  end             : JssmStateConfig,
  terminal        : JssmStateConfig,

  active          : JssmStateConfig,
  active_hooked   : JssmStateConfig,
  active_start    : JssmStateConfig,
  active_end      : JssmStateConfig,
  active_terminal : JssmStateConfig,

  graph           : undefined,

  legal           : undefined,
  main            : undefined,
  forced          : undefined,

  action          : undefined,
  title           : undefined

};

/**
 *  A user-supplied theme.  Identical in shape to {@link JssmBaseTheme}, but
 *  every field is optional so themes can be layered: omitted slots fall
 *  through to the underlying base theme.
 */
type JssmTheme = Partial<JssmBaseTheme>;





/**
 *  Full configuration object accepted by the {@link Machine} constructor and
 *  by {@link from}.  Carries the transition list and the optional knobs
 *  governing layout, theming, history, start/end states, property
 *  definitions, machine metadata (author, license, version, ...) and the
 *  runtime hook surfaces (`time_source`, `timeout_source`, ...).
 *
 *  Most users never construct one of these directly — the `sm` tagged
 *  template literal and {@link from} produce one from FSL source.
 *
 *  @typeParam StateType - The state-name type (usually `string`).
 *  @typeParam DataType  - The user-supplied data payload type (`mDT`).
 */
/**
 *  Editor/panel defaults an FSL machine declares in an `editor: {}` block
 *  (fsl#1334), read by the all-widgets web control: a stochastic run-count
 *  and the panels the machine requests under `request` panel mode.
 */
type JssmEditorConfig = {
  stochastic_run_count? : number,
  panels?               : Array<string>,
};

type JssmGenericConfig<StateType, DataType> = {

  graph_layout?                  : JssmLayout,

  complete?                      : Array<StateType>,
  transitions                    : JssmTransitions<StateType, DataType>,

  theme?                         : FslTheme[],
  flow?                          : FslDirection,

  name?                          : string,
  data?                          : DataType,
  nodes?                         : Array<StateType>,  // uncommon
  check?                         : JssmStatePermitterMaybeArray<DataType>,
  history?                       : number,

  /**
   *  Maximum depth of the boundary-hook action cascade before the machine
   *  throws a {@link JssmError} rather than risking a stack overflow or hang.
   *
   *  Each time a boundary action fires a transition that itself crosses a
   *  boundary, the depth counter increments.  A cascade exceeding this limit is
   *  treated as a probable infinite loop and rejected.
   *
   *  Defaults to `100`.  Raise it for legitimate pipelines that genuinely nest
   *  more than 100 transitions via boundary hooks.
   *
   *  @see Machine._boundary_depth_limit
   *  @see Machine._fire_boundary_actions
   */
  boundary_depth_limit?          : number,

//locked?                        : bool = true,
  min_exits?                     : number,
  max_exits?                     : number,
  allow_islands?                 : JssmAllowIslands,
  editor_config?                 : JssmEditorConfig,
  allow_force?                   : false,
  actions?                       : JssmPermittedOpt,

  simplify_bidi?                 : boolean,
  allows_override?               : JssmAllowsOverride,
  config_allows_override?        : JssmAllowsOverride,

  dot_preamble?                  : string,

  start_states                   : Array<StateType>,
  end_states?                    : Array<StateType>,
  failed_outputs?                : Array<StateType>,

  initial_state?                 : StateType,
  start_states_no_enforce?       : boolean,

  state_declaration?             : Object[],
  property_definition?           : JssmPropertyDefinition[],
  state_property?                : JssmPropertyDefinition[]

  arrange_declaration?           : Array<Array<StateType>>,
  arrange_start_declaration?     : Array<Array<StateType>>,
  arrange_end_declaration?       : Array<Array<StateType>>,

  machine_author?                : string | Array<string>,
  machine_comment?               : string,
  machine_contributor?           : string | Array<string>,
  machine_definition?            : string,
  machine_language?              : string,   // TODO FIXME COMEBACK
  machine_license?               : string,   // TODO FIXME COMEBACK
  machine_name?                  : string,
  machine_version?               : string,   // TODO FIXME COMEBACK
  npm_name?                      : string,

  default_size?                  : JssmDefaultSize,

  fsl_version?                   : string,   // TODO FIXME COMEBACK

  auto_api?                      : boolean | string, // TODO FIXME COMEBACK // boolean false means don't; boolean true means do; string means do-with-this-prefix
  instance_name?                 : string | undefined,

  default_state_config?          : JssmStateStyleKeyList,
  default_start_state_config?    : JssmStateStyleKeyList,
  default_end_state_config?      : JssmStateStyleKeyList,
  default_hooked_state_config?   : JssmStateStyleKeyList,
  default_terminal_state_config? : JssmStateStyleKeyList,
  default_active_state_config?   : JssmStateStyleKeyList,

  default_transition_config?     : JssmTransitionConfig,
  default_graph_config?          : JssmGraphConfig,

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
  group_registry?                : JssmGroupRegistry,
  group_metadata?                : Map<string, JssmStateConfig>,
  group_hooks?                   : JssmGroupHooks,
  state_hooks?                   : JssmStateHooks,

  rng_seed?                      : number | undefined,

  time_source?                   : () => number,
  timeout_source?                : (Function, number) => number,
  clear_timeout_source?          : (number) => void

};





/**
 *  Internal compiler intermediate: a single aggregated rule produced while
 *  folding a parse tree into a machine configuration.  Not intended for
 *  end-user code.
 *
 *  @internal
 */
type JssmCompileRule<StateType> = {

  agg_as : string,
  val    : any      // TODO COMEBACK FIXME

};






/**
 *  Internal compiler intermediate: one link in a chained transition
 *  expression (an "s-expression" segment).  Carries both directions of an
 *  arrow with optional per-direction action labels, probabilities, and
 *  after-times.  The recursive `se` field allows the parser to chain
 *  arrows of the form `A -> B -> C`.  Not intended for end-user code.
 *
 *  @internal
 */
type JssmCompileSe<StateType, mDT> = {

  to              : StateType,
  se            ? : JssmCompileSe<StateType, mDT>,
  kind            : JssmArrow,
  l_action      ? : StateType,
  r_action      ? : StateType,
  l_probability   : number,
  r_probability   : number,
  l_after       ? : number,
  r_after       ? : number,

  loc            ? : FslSourceLocation,
  to_loc         ? : FslSourceLocation,
  l_action_loc   ? : FslSourceLocation,
  r_action_loc   ? : FslSourceLocation

};





/**
 *  Internal compiler intermediate: the root of a chained transition
 *  expression, anchored at a `from` state.  Also doubles as the carrier
 *  for non-transition rules (state declarations, property definitions,
 *  machine metadata) via its `key`/`value`/`name`/`state` fields.  Not
 *  intended for end-user code.
 *
 *  @internal
 */
type JssmCompileSeStart<StateType, DataType> = {

  from           : StateType,
  se             : JssmCompileSe<StateType, DataType>,
  key            : string,
  value?         : string | number | Array<JssmStateDeclarationRule>,
  name?          : string,
  state?         : string,
  default_value? : any,     // for properties
  required?      : boolean, // for properties

  loc            ? : FslSourceLocation,
  from_loc       ? : FslSourceLocation,
  value_loc      ? : FslSourceLocation,
  name_loc       ? : FslSourceLocation

};





/**
 *  The output shape of the FSL parser: a flat array of
 *  {@link JssmCompileSeStart} entries, one per top-level rule in the
 *  source.  Consumed by the compiler to build a machine configuration.
 *
 *  @internal
 */
type JssmParseTree<StateType, mDT> =

  Array< JssmCompileSeStart<StateType, mDT> >;





/**
 *  Signature of an FSL parse function: takes a source string and returns a
 *  {@link JssmParseTree}.  Used to type the parser export so consumers can
 *  swap in alternative parser implementations.
 */
type JssmParseFunctionType<StateType, mDT> =

  (string) => JssmParseTree<StateType, mDT>;





type BasicHookDescription<mDT> = {
  kind    : 'hook'
  from    : string,
  to      : string,
  handler : HookHandler<mDT>
};

type HookDescriptionWithAction<mDT> = {
  kind    : 'named',
  from    : string,
  to      : string,
  action  : string,
  handler : HookHandler<mDT>
};

type StandardTransitionHook<mDT> = {
  kind    : 'standard transition',
  handler : HookHandler<mDT>
};

type MainTransitionHook<mDT> = {
  kind    : 'main transition',
  handler : HookHandler<mDT>
};

type ForcedTransitionHook<mDT> = {
  kind    : 'forced transition',
  handler : HookHandler<mDT>
};

type AnyTransitionHook<mDT> = {
  kind    : 'any transition',
  handler : HookHandler<mDT>
};

type GlobalActionHook<mDT> = {
  kind    : 'global action',
  action  : string,
  handler : HookHandler<mDT>
};

type AnyActionHook<mDT> = {
  kind    : 'any action',
  handler : HookHandler<mDT>
};

type EntryHook<mDT> = {
  kind    : 'entry',
  to      : string,
  handler : HookHandler<mDT>
};

type ExitHook<mDT> = {
  kind    : 'exit',
  from    : string,
  handler : HookHandler<mDT>
};

type AfterHook<mDT> = {
  kind    : 'after',
  from    : string,
  handler : HookHandler<mDT>
};



type PostBasicHookDescription<mDT> = {
  kind    : 'post hook'
  from    : string,
  to      : string,
  handler : PostHookHandler<mDT>
};

type PostHookDescriptionWithAction<mDT> = {
  kind    : 'post named',
  from    : string,
  to      : string,
  action  : string,
  handler : PostHookHandler<mDT>
};

type PostStandardTransitionHook<mDT> = {
  kind    : 'post standard transition',
  handler : PostHookHandler<mDT>
};

type PostMainTransitionHook<mDT> = {
  kind    : 'post main transition',
  handler : PostHookHandler<mDT>
};

type PostForcedTransitionHook<mDT> = {
  kind    : 'post forced transition',
  handler : PostHookHandler<mDT>
};

type PostAnyTransitionHook<mDT> = {
  kind    : 'post any transition',
  handler : PostHookHandler<mDT>
};

type PostGlobalActionHook<mDT> = {
  kind    : 'post global action',
  action  : string,
  handler : PostHookHandler<mDT>
};

type PostAnyActionHook<mDT> = {
  kind    : 'post any action',
  handler : PostHookHandler<mDT>
};

type PostEntryHook<mDT> = {
  kind    : 'post entry',
  to      : string,
  handler : PostHookHandler<mDT>
};

type PostExitHook<mDT> = {
  kind    : 'post exit',
  from    : string,
  handler : PostHookHandler<mDT>
};

type PreEverythingHook<mDT> = {
  kind    : 'pre everything',
  handler : EverythingHookHandler<mDT>
};

type EverythingHook<mDT> = {
  kind    : 'everything',
  handler : EverythingHookHandler<mDT>
};

type PrePostEverythingHook<mDT> = {
  kind    : 'pre post everything',
  handler : PostEverythingHookHandler<mDT>
};

type PostEverythingHook<mDT> = {
  kind    : 'post everything',
  handler : PostEverythingHookHandler<mDT>
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
 *  `'global action'`, `'any action'`, `'entry'`, `'exit'`, `'after'`)
 *  may return a falsy value to veto a transition.  Post-transition
 *  variants (`'post *'`) cannot veto and are invoked only after a
 *  successful transition.
 */
type HookDescription<mDT>
  = BasicHookDescription<mDT>
  | HookDescriptionWithAction<mDT>
  | GlobalActionHook<mDT>
  | AnyActionHook<mDT>
  | StandardTransitionHook<mDT>
  | MainTransitionHook<mDT>
  | ForcedTransitionHook<mDT>
  | AnyTransitionHook<mDT>
  | EntryHook<mDT>
  | ExitHook<mDT>
  | AfterHook<mDT>
  | PostBasicHookDescription<mDT>
  | PostHookDescriptionWithAction<mDT>
  | PostGlobalActionHook<mDT>
  | PostAnyActionHook<mDT>
  | PostStandardTransitionHook<mDT>
  | PostMainTransitionHook<mDT>
  | PostForcedTransitionHook<mDT>
  | PostAnyTransitionHook<mDT>
  | PostEntryHook<mDT>
  | PostExitHook<mDT>
  | PreEverythingHook<mDT>
  | EverythingHook<mDT>
  | PrePostEverythingHook<mDT>
  | PostEverythingHook<mDT>;




/* ===========================================================================
 *  Observational-hook registry (megaspec §12, → #1357)
 *
 *  The uniform registry projects the many concrete hook-storage tables onto a
 *  single normalized shape keyed by `(kind, target, phase)`, so introspection
 *  (`has_hook` / `hooks_on` / `hook_registry`) and `hooked_state` viz styling
 *  read from one generated source of truth rather than hand-written per-kind
 *  pairs.  Pure-observer surface only; veto/mutate stays in source constructs.
 * ===========================================================================
 */

/**
 *  Whether an observational hook runs in the pre-transition phase (where it
 *  may veto/mutate the transition) or the post-transition phase (a pure
 *  observer that runs only after a successful transition commits).
 */
type HookPhase = 'pre' | 'post';

/**
 *  Coarse classification of *what* a hook observes, used to bucket every hook
 *  kind into the uniform registry.  `'edge'` hooks watch a `from→to`
 *  transition (optionally narrowed to a named `action`); `'state'` hooks watch
 *  a single state (entry/exit/after, or a state boundary hook); `'action'`
 *  hooks watch a named action regardless of edge; `'global'` hooks watch every
 *  transition or every action (the `any-*`, transition-class, and `everything`
 *  observers); `'group'` hooks watch a named state group's enter/exit boundary.
 */
type HookTargetScope = 'edge' | 'state' | 'action' | 'global' | 'group';

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
type HookTarget =
  | { scope : 'edge',   from : StateType, to : StateType, action? : string }
  | { scope : 'state',  state : StateType }
  | { scope : 'action', action : string }
  | { scope : 'global' }
  | { scope : 'group',  group : string };

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
  kind   : HookDescription<unknown>['kind'] | HookBoundaryKind,
  phase  : HookPhase,
  target : HookTarget
};

/**
 *  Query for {@link Machine.has_hook} / {@link Machine.hooks_on}.  A bare
 *  string is read as a state name; an `{ from, to, action? }` object is read
 *  as an edge (optionally a named edge); an `{ action }` object is read as a
 *  named action; a `{ group }` object is read as a named state group.  This
 *  mirrors the spec's `hooks_on(state)` / `hooks_on(from→to)` /
 *  `hooks_on(action)` / `hooks_on(&group)` set with one parameter shape.
 */
type HookQuery =
  | StateType
  | { from : StateType, to : StateType, action? : string }
  | { action : string }
  | { group : string };





/**
 *  Richer hook return value used when a hook needs to do more than just
 *  accept or veto a transition.  `pass` is the required accept/veto flag
 *  (kept non-optional so that returning a stray object doesn't accidentally
 *  veto everything).  The optional `state` overrides the destination state,
 *  `data` overrides the data observed by other hooks in the same chain,
 *  and `next_data` overrides the data committed after the transition.
 */
type HookComplexResult<mDT> = {
  pass       : boolean,    // DO NOT MAKE OPTIONAL, prevents accidental other objects
  state?     : StateType,
  data?      : mDT,
  next_data? : mDT
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
  data      : mDT,
  next_data : mDT
};

/**
 *  Context object passed to "everything" hooks ({@link EverythingHookHandler}
 *  and {@link PostEverythingHookHandler}).  Extends the usual
 *  {@link HookContext} with `hook_name`, which identifies which specific
 *  hook fired so a single handler can route on it.
 */
type EverythingHookContext<mDT> = HookContext<mDT> & {
  hook_name : string
};





/**
 *  Signature of a pre-transition hook handler.  Receives the current and
 *  proposed-next data payloads via a {@link HookContext} and returns a
 *  {@link HookResult}: a falsy result vetoes the transition, a truthy
 *  result allows it, and a {@link HookComplexResult} can additionally
 *  rewrite the next state or next data.
 */
type HookHandler<mDT> = (hook_context: HookContext<mDT>) =>
  HookResult<mDT>;

/**
 *  Signature of a post-transition hook handler.  Invoked after a successful
 *  transition has been committed; the return value is ignored (the
 *  transition cannot be undone).
 */
type PostHookHandler<mDT> = (hook_context: HookContext<mDT>) =>
  void;

/**
 *  Signature of an "everything" pre-transition hook handler.  Like
 *  {@link HookHandler} but receives an {@link EverythingHookContext} so the
 *  handler can dispatch on `hook_name`.
 */
type EverythingHookHandler<mDT> = (hook_context: EverythingHookContext<mDT>) =>
  HookResult<mDT>;

/**
 *  Signature of an "everything" post-transition hook handler.  Like
 *  {@link PostHookHandler} but receives an {@link EverythingHookContext}.
 *  The return value is ignored.
 */
type PostEverythingHookHandler<mDT> = (hook_context: EverythingHookContext<mDT>) =>
  void;





/**
 *  Extra diagnostic information attached to a {@link JssmError} when it
 *  carries machine-relative context — most often the state name a caller
 *  asked about when the error was raised.
 */
type JssmErrorExtendedInfo = {
  requested_state? : StateType | undefined,
  source_location? : FslSourceLocation
};





/**
 *  Bounded history of recently-visited states paired with the data payload
 *  observed in each.  Backed by `circular_buffer_js`, so the oldest entry
 *  is dropped silently once the configured capacity is exceeded.
 */
type JssmHistory<mDT> = circular_buffer<[StateType, mDT]>;

/**
 *  Pluggable random-number-generator function shape.  Must return a value
 *  in `[0, 1)` exactly as `Math.random` does.  Supplied via the
 *  `rng_seed`-aware machine configuration so that stochastic models can be
 *  made reproducible.
 */
type JssmRng = () => number;





/**
 *  All event names that {@link Machine.on} accepts.  These are observation
 *  events fired by the machine in addition to (not in place of) the hook
 *  system.  Hooks intercept; events observe.
 *
 *  @see Machine.on
 */
type JssmEventName =
  | 'transition'
  | 'rejection'
  | 'action'
  | 'entry'
  | 'exit'
  | 'terminal'
  | 'complete'
  | 'error'
  | 'data-change'
  | 'override'
  | 'timeout'
  | 'hook-registration'
  | 'hook-removal';

/**
 *  Detail payload fired with a `transition` event.  Carries the resolved
 *  source and target, the action name (if the transition was driven by an
 *  action), the data observed before and after the change, the edge kind,
 *  and whether the call was a forced transition.
 */
type JssmTransitionEventDetail<mDT> = {
  from       : StateType,
  to         : StateType,
  action?    : StateType,
  data       : mDT,
  next_data? : mDT,
  trans_type : string | undefined,
  forced     : boolean
};

/**
 *  Detail payload fired with a `rejection` event.  Carries the resolved
 *  source and target plus an indication of who rejected the transition
 *  and why.  `reason` is `'invalid'` when no edge existed, `'hook'` when
 *  a hook handler vetoed; `hook_name` is set when `reason` is `'hook'`.
 */
type JssmRejectionEventDetail<mDT> = {
  from       : StateType,
  to         : StateType,
  action?    : StateType,
  data       : mDT,
  next_data? : mDT,
  reason     : 'invalid' | 'hook',
  hook_name? : string,
  forced     : boolean
};

/**
 *  Detail payload fired with an `action` event.  Fires when an action is
 *  attempted, before transition validation runs.
 */
type JssmActionEventDetail<mDT> = {
  action     : StateType,
  from       : StateType,
  to?        : StateType,
  data       : mDT,
  next_data? : mDT
};

/**
 *  Detail payload fired with an `entry` event.  `state` is the entered
 *  state.  `from` is the predecessor state, if any.  `action` is the
 *  action that drove the entry, if any.
 */
type JssmEntryEventDetail<mDT> = {
  state    : StateType,
  from?    : StateType,
  action?  : StateType,
  data     : mDT
};

/**
 *  Detail payload fired with an `exit` event.  `state` is the exited
 *  state.  `to` is the next state, if any.  `action` is the action that
 *  drove the exit, if any.
 */
type JssmExitEventDetail<mDT> = {
  state    : StateType,
  to?      : StateType,
  action?  : StateType,
  data     : mDT
};

/**
 *  Detail payload fired with a `terminal` event.  Indicates that the
 *  machine has reached a state with no outgoing edges.
 */
type JssmTerminalEventDetail<mDT> = {
  state    : StateType,
  data     : mDT
};

/**
 *  Detail payload fired with a `complete` event.  Indicates that the
 *  machine has reached a FSL `complete` state.
 */
type JssmCompleteEventDetail<mDT> = {
  state    : StateType,
  data     : mDT
};

/**
 *  Detail payload fired with an `error` event.  Wraps an exception caught
 *  while running an event handler; `source_event` and `source_detail`
 *  identify the event whose handler threw, and `handler` is the offending
 *  function so consumers can correlate / blame.
 */
type JssmErrorEventDetail = {
  error          : unknown,
  source_event   : JssmEventName,
  source_detail  : unknown,
  handler        : Function
};

/**
 *  Detail payload fired with a `data-change` event.  Fires whenever the
 *  machine's data payload is replaced.  `old_data` is the value before the
 *  change; `new_data` is the value after.
 */
type JssmDataChangeEventDetail<mDT> = {
  from?     : StateType,
  to?       : StateType,
  action?   : StateType,
  old_data  : mDT,
  new_data  : mDT,
  cause     : 'transition' | 'override'
};

/**
 *  Detail payload fired with an `override` event.  Distinguishes a forced
 *  state replacement from a normal transition.
 */
type JssmOverrideEventDetail<mDT> = {
  from      : StateType,
  to        : StateType,
  old_data  : mDT,
  new_data? : mDT
};

/**
 *  Detail payload fired with a `timeout` event.  Fires when a configured
 *  `after` clause causes an automatic transition.
 */
type JssmTimeoutEventDetail = {
  from       : StateType,
  to         : StateType,
  after_time : number
};

/**
 *  Detail payload fired with `hook-registration` and `hook-removal` events.
 *  Mirrors the {@link HookDescription} so inspector tools can mirror the
 *  current hook set.
 */
type JssmHookLifecycleEventDetail<mDT> = {
  description : HookDescription<mDT>
};



/**
 *  Mapped type from {@link JssmEventName} to the corresponding detail
 *  payload.  Drives the discriminated-union typing of {@link Machine.on},
 *  so `e.action` and friends only exist where they're meaningful.
 */
type JssmEventDetailMap<mDT> = {
  'transition'        : JssmTransitionEventDetail<mDT>,
  'rejection'         : JssmRejectionEventDetail<mDT>,
  'action'            : JssmActionEventDetail<mDT>,
  'entry'             : JssmEntryEventDetail<mDT>,
  'exit'              : JssmExitEventDetail<mDT>,
  'terminal'          : JssmTerminalEventDetail<mDT>,
  'complete'          : JssmCompleteEventDetail<mDT>,
  'error'             : JssmErrorEventDetail,
  'data-change'       : JssmDataChangeEventDetail<mDT>,
  'override'          : JssmOverrideEventDetail<mDT>,
  'timeout'           : JssmTimeoutEventDetail,
  'hook-registration' : JssmHookLifecycleEventDetail<mDT>,
  'hook-removal'      : JssmHookLifecycleEventDetail<mDT>
};

/**
 *  Filter accepted by {@link Machine.on} / {@link Machine.once} for an
 *  individual event name.  Only events whose detail key matches every
 *  filter entry fire the handler.  Events that don't list a filter key in
 *  v1 take no filter properties.
 */
type JssmEventFilterMap<mDT> = {
  'transition'        : { from?: StateType, to?: StateType },
  'rejection'         : Record<string, never>,
  'action'            : Record<string, never>,
  'entry'             : { state?: StateType },
  'exit'              : { state?: StateType },
  'terminal'          : Record<string, never>,
  'complete'          : Record<string, never>,
  'error'             : Record<string, never>,
  'data-change'       : Record<string, never>,
  'override'          : Record<string, never>,
  'timeout'           : Record<string, never>,
  'hook-registration' : Record<string, never>,
  'hook-removal'      : Record<string, never>
};

/**
 *  Per-event filter object (as passed to {@link Machine.on}).  Use
 *  `JssmEventDetailMap<mDT>[Ev]` to find the matching detail type.
 *  @typeparam mDT The type of the machine data member.
 *  @typeparam Ev  The event name.
 */
type JssmEventFilter<mDT, Ev extends JssmEventName> = JssmEventFilterMap<mDT>[Ev];

/**
 *  Per-event handler signature.  Receives a detail object typed by event
 *  name, so `e.action` (etc.) only exist where they're meaningful.
 *  @typeparam mDT The type of the machine data member.
 *  @typeparam Ev  The event name.
 */
type JssmEventHandler<mDT, Ev extends JssmEventName> =
  (detail: JssmEventDetailMap<mDT>[Ev]) => void;

/**
 *  Function returned by {@link Machine.on} and {@link Machine.once} that
 *  removes the subscription.  Calling it more than once is a no-op.
 */
type JssmUnsubscribe = () => void;





export {

  JssmColor,
    JssmShape,

  JssmTransition,
    JssmTransitions,
    JssmTransitionList,
    JssmTransitionRule,

  JssmArrow,
    JssmArrowKind,
    JssmArrowDirection,

  JssmGenericConfig,
  JssmEditorConfig,
    JssmGenericState,
    JssmGenericMachine,

  JssmParseTree,
    JssmCompileSe,
    JssmCompileSeStart,
    JssmCompileRule,

  JssmPermitted,
    JssmPermittedOpt,
    JssmResult,

  JssmStateDeclaration,
    JssmStateDeclarationRule,
    JssmStateConfig,

  JssmStateStyleKey,
    JssmStateStyleKeyList,

  JssmGraphDefaultEdgeColor,
    JssmTransitionStyleKey,
    JssmTransitionConfig,
    JssmGraphAliasKey,
    JssmGraphStyleKey,
    JssmGraphConfig,

  JssmBaseTheme,
    JssmTheme,

  JssmLayout,

  JssmHistory,
  JssmSerialization,
  JssmPropertyDefinition,
  JssmAllowsOverride,
  JssmAllowIslands,
  JssmDefaultSize,

  JssmGroupRef,
    JssmGroupMemberRef,
    JssmGroupRegistry,
    JssmHookDeclaration,
    JssmBoundaryHooks,
    JssmGroupHooks,
    JssmStateHooks,

  JssmParseFunctionType,

  JssmMachineInternalState,

  JssmErrorExtendedInfo,

  FslDirections,
    FslDirection,

  FslThemes,
    FslTheme,

  FslSourcePoint,
    FslSourceLocation,

  HookDescription,
    HookHandler,
    HookContext,
    HookResult,
    HookComplexResult,
    EverythingHookContext,
    EverythingHookHandler,
    PostEverythingHookHandler,

  HookPhase,
    HookTargetScope,
    HookTarget,
    HookBoundaryKind,
    HookRegistryEntry,
    HookQuery,

  JssmEventName,
    JssmEventDetailMap,
    JssmEventFilterMap,
    JssmEventFilter,
    JssmEventHandler,
    JssmUnsubscribe,
    JssmTransitionEventDetail,
    JssmRejectionEventDetail,
    JssmActionEventDetail,
    JssmEntryEventDetail,
    JssmExitEventDetail,
    JssmTerminalEventDetail,
    JssmCompleteEventDetail,
    JssmErrorEventDetail,
    JssmDataChangeEventDetail,
    JssmOverrideEventDetail,
    JssmTimeoutEventDetail,
    JssmHookLifecycleEventDetail,

  JssmRng

};
