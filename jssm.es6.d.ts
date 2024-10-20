import { circular_buffer } from 'circular_buffer_js';

declare type StateType$1 = string; /** Composite type composing whether or not a result was successful */
declare type JssmColor = string;
declare type JssmPermittedOpt = 'required' | 'disallowed' | 'optional';
declare type JssmArrow = '->' | '<-' | '<->' | '<=->' | '<~->' | '=>' | '<=' | '<=>' | '<-=>' | '<~=>' | '~>' | '<~' | '<~>' | '<-~>' | '<=~>';
/**
 * A type teaching Typescript the various supported shapes for nodes, mostly inherited from GraphViz
 */
declare type JssmShape = "box" | "polygon" | "ellipse" | "oval" | "circle" | "point" | "egg" | "triangle" | "plaintext" | "plain" | "diamond" | "trapezium" | "parallelogram" | "house" | "pentagon" | "hexagon" | "septagon" | "octagon" | "doublecircle" | "doubleoctagon" | "tripleoctagon" | "invtriangle" | "invtrapezium" | "invhouse" | "Mdiamond" | "Msquare" | "Mcircle" | "rect" | "rectangle" | "square" | "star" | "none" | "underline" | "cylinder" | "note" | "tab" | "folder" | "box3d" | "component" | "promoter" | "cds" | "terminator" | "utr" | "primersite" | "restrictionsite" | "fivepoverhang" | "threepoverhang" | "noverhang" | "assembly" | "signature" | "insulator" | "ribosite" | "rnastab" | "proteasesite" | "proteinstab" | "rpromoter" | "rarrow" | "larrow" | "lpromoter" | "record";
declare type JssmArrowDirection = 'left' | 'right' | 'both';
declare type JssmArrowKind = 'none' | 'legal' | 'main' | 'forced';
declare type JssmLayout = 'dot' | 'circo' | 'twopi' | 'fdp' | 'neato';
declare type JssmCorner = 'regular' | 'rounded' | 'lined';
declare type JssmLineStyle = 'solid' | 'dashed' | 'dotted';
declare type JssmAllowsOverride = true | false | undefined;
declare const FslDirections: readonly ["up", "right", "down", "left"];
declare type FslDirection = typeof FslDirections[number];
declare const FslThemes: readonly ["default", "ocean", "modern", "plain", "bold"];
declare type FslTheme = typeof FslThemes[number];
declare type JssmSerialization<DataType> = {
    jssm_version: string;
    timestamp: number;
    comment?: string | undefined;
    state: StateType$1;
    history: [string, DataType][];
    history_capacity: number;
    data: DataType;
};
declare type JssmPropertyDefinition = {
    name: string;
    default_value?: any;
    required?: boolean;
};
declare type JssmTransitionPermitter<DataType> = (OldState: StateType$1, NewState: StateType$1, OldData: DataType, NewData: DataType) => boolean;
declare type JssmTransitionPermitterMaybeArray<DataType> = JssmTransitionPermitter<DataType> | Array<JssmTransitionPermitter<DataType>>;
declare type JssmTransition<StateType, DataType> = {
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
declare type JssmTransitions<StateType, DataType> = JssmTransition<StateType, DataType>[];
declare type JssmTransitionList = {
    entrances: Array<StateType$1>;
    exits: Array<StateType$1>;
};
declare type JssmGenericState = {
    from: Array<StateType$1>;
    name: StateType$1;
    to: Array<StateType$1>;
    complete: boolean;
};
declare type JssmMachineInternalState<DataType> = {
    internal_state_impl_version: 1;
    state: StateType$1;
    states: Map<StateType$1, JssmGenericState>;
    named_transitions: Map<StateType$1, number>;
    edge_map: Map<StateType$1, Map<StateType$1, number>>;
    actions: Map<StateType$1, Map<StateType$1, number>>;
    reverse_actions: Map<StateType$1, Map<StateType$1, number>>;
    edges: Array<JssmTransition<StateType$1, DataType>>;
};
declare type JssmStatePermitter<DataType> = (OldState: StateType$1, NewState: StateType$1, OldData: DataType, NewData: DataType) => boolean;
declare type JssmStatePermitterMaybeArray<DataType> = JssmStatePermitter<DataType> | Array<JssmStatePermitter<DataType>>;
declare type JssmStateDeclarationRule = {
    key: string;
    value: any;
    name?: string;
};
declare type JssmStateDeclaration = {
    declarations: Array<JssmStateDeclarationRule>;
    shape?: JssmShape;
    color?: JssmColor;
    corners?: JssmCorner;
    lineStyle?: JssmLineStyle;
    stateLabel?: string;
    textColor?: JssmColor;
    backgroundColor?: JssmColor;
    borderColor?: JssmColor;
    state: StateType$1;
    property?: {
        name: string;
        value: unknown;
    };
};
declare type JssmStateConfig = Partial<JssmStateDeclaration>;
declare type JssmStateStyleShape = {
    key: 'shape';
    value: JssmShape;
};
declare type JssmStateStyleColor = {
    key: 'color';
    value: JssmColor;
};
declare type JssmStateStyleTextColor = {
    key: 'text-color';
    value: JssmColor;
};
declare type JssmStateStyleCorners = {
    key: 'corners';
    value: JssmCorner;
};
declare type JssmStateStyleLineStyle = {
    key: 'line-style';
    value: JssmLineStyle;
};
declare type JssmStateStyleStateLabel = {
    key: 'state-label';
    value: string;
};
declare type JssmStateStyleBackgroundColor = {
    key: 'background-color';
    value: JssmColor;
};
declare type JssmStateStyleBorderColor = {
    key: 'border-color';
    value: JssmColor;
};
declare type JssmStateStyleKey = JssmStateStyleShape | JssmStateStyleColor | JssmStateStyleTextColor | JssmStateStyleCorners | JssmStateStyleLineStyle | JssmStateStyleBackgroundColor | JssmStateStyleStateLabel | JssmStateStyleBorderColor;
declare type JssmStateStyleKeyList = JssmStateStyleKey[];
declare type JssmGenericConfig<StateType, DataType> = {
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
    min_exits?: number;
    max_exits?: number;
    allow_islands?: false;
    allow_force?: false;
    actions?: JssmPermittedOpt;
    simplify_bidi?: boolean;
    allows_override?: JssmAllowsOverride;
    config_allows_override?: JssmAllowsOverride;
    dot_preamble?: string;
    start_states: Array<StateType>;
    end_states?: Array<StateType>;
    initial_state?: StateType;
    start_states_no_enforce?: boolean;
    state_declaration?: Object[];
    property_definition?: JssmPropertyDefinition[];
    state_property?: JssmPropertyDefinition[];
    arrange_declaration?: Array<Array<StateType>>;
    arrange_start_declaration?: Array<Array<StateType>>;
    arrange_end_declaration?: Array<Array<StateType>>;
    machine_author?: string | Array<string>;
    machine_comment?: string;
    machine_contributor?: string | Array<string>;
    machine_definition?: string;
    machine_language?: string;
    machine_license?: string;
    machine_name?: string;
    machine_version?: string;
    fsl_version?: string;
    auto_api?: boolean | string;
    instance_name?: string | undefined;
    default_state_config?: JssmStateStyleKeyList;
    default_start_state_config?: JssmStateStyleKeyList;
    default_end_state_config?: JssmStateStyleKeyList;
    default_hooked_state_config?: JssmStateStyleKeyList;
    default_terminal_state_config?: JssmStateStyleKeyList;
    default_active_state_config?: JssmStateStyleKeyList;
    rng_seed?: number | undefined;
    time_source?: () => number;
    timeout_source?: (Function: any, number: any) => number;
    clear_timeout_source?: (number: any) => void;
};
declare type JssmCompileSe<StateType, mDT> = {
    to: StateType;
    se?: JssmCompileSe<StateType, mDT>;
    kind: JssmArrow;
    l_action?: StateType;
    r_action?: StateType;
    l_probability: number;
    r_probability: number;
    l_after?: number;
    r_after?: number;
};
declare type JssmCompileSeStart<StateType, DataType> = {
    from: StateType;
    se: JssmCompileSe<StateType, DataType>;
    key: string;
    value?: string | number;
    name?: string;
    state?: string;
    default_value?: any;
    required?: boolean;
};
declare type JssmParseTree<StateType, mDT> = Array<JssmCompileSeStart<StateType, mDT>>;
declare type BasicHookDescription<mDT> = {
    kind: 'hook';
    from: string;
    to: string;
    handler: HookHandler<mDT>;
};
declare type HookDescriptionWithAction<mDT> = {
    kind: 'named';
    from: string;
    to: string;
    action: string;
    handler: HookHandler<mDT>;
};
declare type StandardTransitionHook<mDT> = {
    kind: 'standard transition';
    handler: HookHandler<mDT>;
};
declare type MainTransitionHook<mDT> = {
    kind: 'main transition';
    handler: HookHandler<mDT>;
};
declare type ForcedTransitionHook<mDT> = {
    kind: 'forced transition';
    handler: HookHandler<mDT>;
};
declare type AnyTransitionHook<mDT> = {
    kind: 'any transition';
    handler: HookHandler<mDT>;
};
declare type GlobalActionHook<mDT> = {
    kind: 'global action';
    action: string;
    handler: HookHandler<mDT>;
};
declare type AnyActionHook<mDT> = {
    kind: 'any action';
    handler: HookHandler<mDT>;
};
declare type EntryHook<mDT> = {
    kind: 'entry';
    to: string;
    handler: HookHandler<mDT>;
};
declare type ExitHook<mDT> = {
    kind: 'exit';
    from: string;
    handler: HookHandler<mDT>;
};
declare type AfterHook<mDT> = {
    kind: 'after';
    from: string;
    handler: HookHandler<mDT>;
};
declare type PostBasicHookDescription<mDT> = {
    kind: 'post hook';
    from: string;
    to: string;
    handler: PostHookHandler<mDT>;
};
declare type PostHookDescriptionWithAction<mDT> = {
    kind: 'post named';
    from: string;
    to: string;
    action: string;
    handler: PostHookHandler<mDT>;
};
declare type PostStandardTransitionHook<mDT> = {
    kind: 'post standard transition';
    handler: PostHookHandler<mDT>;
};
declare type PostMainTransitionHook<mDT> = {
    kind: 'post main transition';
    handler: PostHookHandler<mDT>;
};
declare type PostForcedTransitionHook<mDT> = {
    kind: 'post forced transition';
    handler: PostHookHandler<mDT>;
};
declare type PostAnyTransitionHook<mDT> = {
    kind: 'post any transition';
    handler: PostHookHandler<mDT>;
};
declare type PostGlobalActionHook<mDT> = {
    kind: 'post global action';
    action: string;
    handler: PostHookHandler<mDT>;
};
declare type PostAnyActionHook<mDT> = {
    kind: 'post any action';
    handler: PostHookHandler<mDT>;
};
declare type PostEntryHook<mDT> = {
    kind: 'post entry';
    to: string;
    handler: PostHookHandler<mDT>;
};
declare type PostExitHook<mDT> = {
    kind: 'post exit';
    from: string;
    handler: PostHookHandler<mDT>;
};
declare type HookDescription<mDT> = BasicHookDescription<mDT> | HookDescriptionWithAction<mDT> | GlobalActionHook<mDT> | AnyActionHook<mDT> | StandardTransitionHook<mDT> | MainTransitionHook<mDT> | ForcedTransitionHook<mDT> | AnyTransitionHook<mDT> | EntryHook<mDT> | ExitHook<mDT> | AfterHook<mDT> | PostBasicHookDescription<mDT> | PostHookDescriptionWithAction<mDT> | PostGlobalActionHook<mDT> | PostAnyActionHook<mDT> | PostStandardTransitionHook<mDT> | PostMainTransitionHook<mDT> | PostForcedTransitionHook<mDT> | PostAnyTransitionHook<mDT> | PostEntryHook<mDT> | PostExitHook<mDT>;
declare type HookComplexResult<mDT> = {
    pass: boolean;
    state?: StateType$1;
    data?: mDT;
    next_data?: mDT;
};
declare type HookResult<mDT> = true | false | undefined | void | HookComplexResult<mDT>; /** Documents whether a hook succeeded, either with a primitive or a reference to the hook complex object */
declare type HookContext<mDT> = {
    data: mDT;
    next_data: mDT;
};
declare type HookHandler<mDT> = (hook_context: HookContext<mDT>) => HookResult<mDT>;
declare type PostHookHandler<mDT> = (hook_context: HookContext<mDT>) => void;
declare type JssmHistory<mDT> = circular_buffer<[StateType$1, mDT]>;
declare type JssmRng = () => number;

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
 *  @param options Things to control about the instance
 *
 */
declare function wrap_parse(input: string, options?: Object): any;
/*********
 *
 *  Compile a machine's JSON intermediate representation to a config object.  If
 *  you're using this (probably don't,) you're probably also using
 *  {@link parse} to get the IR, and the object constructor
 *  {@link Machine.construct} to turn the config object into a workable machine.
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
 *  @typeparam mDT The type of the machine data member; usually omitted
 *
 *  @param tree The parse tree to be boiled down into a machine config
 *
 */
declare function compile<StateType, mDT>(tree: JssmParseTree<StateType, mDT>): JssmGenericConfig<StateType, mDT>;
/*********
 *
 *  An internal convenience wrapper for parsing then compiling a machine string.
 *  Not generally meant for external use.  Please see {@link compile} or
 *  {@link sm}.
 *
 *  @typeparam mDT The type of the machine data member; usually omitted
 *
 *  @param plan The FSL code to be evaluated and built into a machine config
 *
 */
declare function make<StateType, mDT>(plan: string): JssmGenericConfig<StateType, mDT>;

declare const weighted_rand_select: Function;
/*******
 *
 *  Returns, for a non-negative integer argument `n`, the series `[0 .. n]`.
 *
 *  ```typescript
 *  import { seq } from './jssm';
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
 *  import { histograph } from './jssm';
 *
 *  histograph( [0, 0, 1, 1, 2, 2, 1] );  // Map()
 *  ```
 *
 */
declare const histograph: Function;
declare const weighted_sample_select: Function;
declare const weighted_histo_key: Function;
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
declare const unique: <T>(arr?: T[]) => T[];
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
declare function sleep(ms: number): Promise<unknown>;

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
declare const gviz_shapes$1: string[];
declare const shapes$1: string[];
declare const named_colors$1: string[];

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
  export { jssm_constants_d_E as E, jssm_constants_d_Epsilon as Epsilon, jssm_constants_d_EulerC as EulerC, jssm_constants_d_Ln10 as Ln10, jssm_constants_d_Ln2 as Ln2, jssm_constants_d_Log10E as Log10E, jssm_constants_d_Log2E as Log2E, jssm_constants_d_MaxPosNum as MaxPosNum, jssm_constants_d_MaxSafeInt as MaxSafeInt, jssm_constants_d_MinPosNum as MinPosNum, jssm_constants_d_MinSafeInt as MinSafeInt, jssm_constants_d_NegInfinity as NegInfinity, jssm_constants_d_Phi as Phi, jssm_constants_d_Pi as Pi, jssm_constants_d_PosInfinity as PosInfinity, jssm_constants_d_Root2 as Root2, jssm_constants_d_RootHalf as RootHalf, gviz_shapes$1 as gviz_shapes, named_colors$1 as named_colors, shapes$1 as shapes };
}

declare const version: string;
declare const build_time: number;

declare type StateType = string;

declare const shapes: string[];
declare const gviz_shapes: string[];
declare const named_colors: string[];

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
declare function state_style_condense(jssk: JssmStateStyleKeyList): JssmStateConfig;
declare class Machine<mDT> {
    _state: StateType;
    _states: Map<StateType, JssmGenericState>;
    _edges: Array<JssmTransition<StateType, mDT>>;
    _edge_map: Map<StateType, Map<StateType, number>>;
    _named_transitions: Map<StateType, number>;
    _actions: Map<StateType, Map<StateType, number>>;
    _reverse_actions: Map<StateType, Map<StateType, number>>;
    _reverse_action_targets: Map<StateType, Map<StateType, number>>;
    _start_states: Set<StateType>;
    _end_states: Set<StateType>;
    _machine_author?: Array<string>;
    _machine_comment?: string;
    _machine_contributor?: Array<string>;
    _machine_definition?: string;
    _machine_language?: string;
    _machine_license?: string;
    _machine_name?: string;
    _machine_version?: string;
    _fsl_version?: string;
    _raw_state_declaration?: Array<Object>;
    _state_declarations: Map<StateType, JssmStateDeclaration>;
    _data?: mDT;
    _instance_name: string;
    _rng_seed: number;
    _rng: JssmRng;
    _graph_layout: JssmLayout;
    _dot_preamble: string;
    _arrange_declaration: Array<Array<StateType>>;
    _arrange_start_declaration: Array<Array<StateType>>;
    _arrange_end_declaration: Array<Array<StateType>>;
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
    _hooks: Map<string, HookHandler<mDT>>;
    _named_hooks: Map<string, HookHandler<mDT>>;
    _entry_hooks: Map<string, HookHandler<mDT>>;
    _exit_hooks: Map<string, HookHandler<mDT>>;
    _after_hooks: Map<string, HookHandler<mDT>>;
    _global_action_hooks: Map<string, HookHandler<mDT>>;
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
    _post_hooks: Map<string, HookHandler<mDT>>;
    _post_named_hooks: Map<string, HookHandler<mDT>>;
    _post_entry_hooks: Map<string, HookHandler<mDT>>;
    _post_exit_hooks: Map<string, HookHandler<mDT>>;
    _post_global_action_hooks: Map<string, HookHandler<mDT>>;
    _post_any_action_hook: HookHandler<mDT> | undefined;
    _post_standard_transition_hook: HookHandler<mDT> | undefined;
    _post_main_transition_hook: HookHandler<mDT> | undefined;
    _post_forced_transition_hook: HookHandler<mDT> | undefined;
    _post_any_transition_hook: HookHandler<mDT> | undefined;
    _property_keys: Set<string>;
    _default_properties: Map<string, any>;
    _state_properties: Map<string, any>;
    _required_properties: Set<string>;
    _history: JssmHistory<mDT>;
    _history_length: number;
    _state_style: JssmStateConfig;
    _active_state_style: JssmStateConfig;
    _hooked_state_style: JssmStateConfig;
    _terminal_state_style: JssmStateConfig;
    _start_state_style: JssmStateConfig;
    _end_state_style: JssmStateConfig;
    _state_labels: Map<string, string>;
    _time_source: () => number;
    _create_started: number;
    _created: number;
    _after_mapping: Map<string, [string, number]>;
    _timeout_source: (Function: any, number: any) => number;
    _clear_timeout_source: (h: any) => void;
    _timeout_handle: number | undefined;
    _timeout_target: string | undefined;
    _timeout_target_time: number | undefined;
    constructor({ start_states, end_states, initial_state, start_states_no_enforce, complete, transitions, machine_author, machine_comment, machine_contributor, machine_definition, machine_language, machine_license, machine_name, machine_version, state_declaration, property_definition, state_property, fsl_version, dot_preamble, arrange_declaration, arrange_start_declaration, arrange_end_declaration, theme, flow, graph_layout, instance_name, history, data, default_state_config, default_active_state_config, default_hooked_state_config, default_terminal_state_config, default_start_state_config, default_end_state_config, allows_override, config_allows_override, rng_seed, time_source, timeout_source, clear_timeout_source }: JssmGenericConfig<StateType, mDT>);
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
     *  @typeparam mDT The type of the machine data member; usually omitted
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
     *  @typeparam mDT The type of the machine data member; usually omitted
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
     *  @typeparam mDT The type of the machine data member; usually omitted
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
     *  @typeparam mDT The type of the machine data member; usually omitted
     *
     */
    data(): mDT;
    /*********
     *
     *  Get the current value of a given property name.
     *
     *  ```typescript
     *
     *  ```
     *
     *  @param name The relevant property name to look up
     *
     *  @returns The value behind the prop name.  Because functional props are
     *  evaluated as getters, this can be anything.
     *
     */
    prop(name: string): any;
    /*********
     *
     *  Get the current value of a given property name.  If missing on the state
     *  and without a global default, throw, unlike {@link prop}, which would
     *  return `undefined` instead.
     *
     *  ```typescript
     *
     *  ```
     *
     *  @param name The relevant property name to look up
     *
     *  @returns The value behind the prop name.  Because functional props are
     *  evaluated as getters, this can be anything.
     *
     */
    strict_prop(name: string): any;
    /*********
     *
     *  Get the current value of every prop, as an object.  If no current definition
     *  exists for a prop - that is, if the prop was defined without a default and
     *  the current state also doesn't define the prop - then that prop will be listed
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
     *    state Red:         { property stop_first true;  property can_go false; };
     *    state Off:         { property stop_first true;  };
     *    state FlashingRed: { property stop_first true;  };
     *    state Green:       { property hesitate   false; };
     *
     *  `;
     *
     *  traffic_light.state();  // Off
     *  traffic_light.props();  // { can_go: true,  hesitate: true,  stop_first: true;  }
     *
     *  traffic_light.go('Red');
     *  traffic_light.props();  // { can_go: false, hesitate: true,  stop_first: true;  }
     *
     *  traffic_light.go('Green');
     *  traffic_light.props();  // { can_go: true,  hesitate: false, stop_first: false; }
     *  ```
     *
     */
    props(): object;
    /*********
     *
     *  Get the current value of every prop, as an object.  Compare
     *  {@link prop_map}, which returns a `Map`.
     *
     *  ```typescript
     *
     *  ```
     *
     */
    /*********
     *
     *  Get the current value of every prop, as an object.  Compare
     *  {@link prop_map}, which returns a `Map`.  Akin to {@link strict_prop},
     *  this throws if a required prop is missing.
     *
     *  ```typescript
     *
     *  ```
     *
     */
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
     *  ```
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
     *  @typeparam mDT The type of the machine data member; usually omitted
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
     *  @typeparam mDT The type of the machine data member; usually omitted
     *
     *  @param whichState The name of the state to check
     *
     */
    is_end_state(whichState: StateType): boolean;
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
     *  @typeparam mDT The type of the machine data member; usually omitted
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
     *  string embedded, call {@link serialize_with_string} instead.
     *
     *  @typeparam mDT The type of the machine data member; usually omitted
     *
     */
    serialize(comment?: string | undefined): JssmSerialization<mDT>;
    graph_layout(): string;
    dot_preamble(): string;
    machine_author(): Array<string>;
    machine_comment(): string;
    machine_contributor(): Array<string>;
    machine_definition(): string;
    machine_language(): string;
    machine_license(): string;
    machine_name(): string;
    machine_version(): string;
    raw_state_declarations(): Array<Object>;
    state_declaration(which: StateType): JssmStateDeclaration;
    state_declarations(): Map<StateType, JssmStateDeclaration>;
    fsl_version(): string;
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
     *  @typeparam mDT The type of the machine data member; usually omitted
     *
     */
    states(): Array<StateType>;
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
     *  @typeparam mDT The type of the machine data member; usually omitted
     *
     *  @param whichState The state to be checked for extance
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
     *  @typeparam mDT The type of the machine data member; usually omitted
     *
     */
    list_edges(): Array<JssmTransition<StateType, mDT>>;
    list_named_transitions(): Map<StateType, number>;
    list_actions(): Array<StateType>;
    get uses_actions(): boolean;
    get uses_forced_transitions(): boolean;
    /*********
     *
     *  Check if the code that built the machine allows overriding state and data.
     *
     */
    get code_allows_override(): JssmAllowsOverride;
    /*********
     *
     *  Check if the machine config allows overriding state and data.
     *
     */
    get config_allows_override(): JssmAllowsOverride;
    /*********
     *
     *  Check if a machine allows overriding state and data.
     *
     */
    get allows_override(): JssmAllowsOverride;
    all_themes(): FslTheme[];
    get themes(): FslTheme | FslTheme[];
    set themes(to: FslTheme | FslTheme[]);
    flow(): FslDirection;
    get_transition_by_state_names(from: StateType, to: StateType): number;
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
     *  @typeparam mDT The type of the machine data member; usually omitted
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
     *  {@link list_unforced_entrances} or {@link list_forced_entrances} as
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
     *  @typeparam mDT The type of the machine data member; usually omitted
     *
     *  @param whichState The state whose entrances to have listed
     *
     */
    list_entrances(whichState?: StateType): Array<StateType>;
    /********
     *
     *  List all exits attached to the current state.  Please note that the order
     *  of the list is not defined.  This list includes both unforced and forced
     *  exits; if this isn't desired, consider {@link list_unforced_exits} or
     *  {@link list_forced_exits} as appropriate.
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
     *  @typeparam mDT The type of the machine data member; usually omitted
     *
     *  @param whichState The state whose exits to have listed
     *
     */
    list_exits(whichState?: StateType): Array<StateType>;
    probable_exits_for(whichState: StateType): Array<JssmTransition<StateType, mDT>>;
    probabilistic_transition(): boolean;
    probabilistic_walk(n: number): Array<StateType>;
    probabilistic_histo_walk(n: number): Map<StateType, number>;
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
     *  @typeparam mDT The type of the machine data member; usually omitted
     *
     *  @param whichState The state whose actions to have listed
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
     *  @typeparam mDT The type of the machine data member; usually omitted
     *
     *  @param whichState The action to be checked for associated states
     *
     */
    list_states_having_action(whichState: StateType): Array<StateType>;
    list_exit_actions(whichState?: StateType): Array<StateType>;
    probable_action_exits(whichState?: StateType): Array<any>;
    is_unenterable(whichState: StateType): boolean;
    has_unenterables(): boolean;
    is_terminal(): boolean;
    state_is_terminal(whichState: StateType): boolean;
    has_terminals(): boolean;
    is_complete(): boolean;
    state_is_complete(whichState: StateType): boolean;
    has_completes(): boolean;
    set_hook(HookDesc: HookDescription<mDT>): void;
    hook(from: string, to: string, handler: HookHandler<mDT>): Machine<mDT>;
    hook_action(from: string, to: string, action: string, handler: HookHandler<mDT>): Machine<mDT>;
    hook_global_action(action: string, handler: HookHandler<mDT>): Machine<mDT>;
    hook_any_action(handler: HookHandler<mDT>): Machine<mDT>;
    hook_standard_transition(handler: HookHandler<mDT>): Machine<mDT>;
    hook_main_transition(handler: HookHandler<mDT>): Machine<mDT>;
    hook_forced_transition(handler: HookHandler<mDT>): Machine<mDT>;
    hook_any_transition(handler: HookHandler<mDT>): Machine<mDT>;
    hook_entry(to: string, handler: HookHandler<mDT>): Machine<mDT>;
    hook_exit(from: string, handler: HookHandler<mDT>): Machine<mDT>;
    hook_after(from: string, handler: HookHandler<mDT>): Machine<mDT>;
    post_hook(from: string, to: string, handler: HookHandler<mDT>): Machine<mDT>;
    post_hook_action(from: string, to: string, action: string, handler: HookHandler<mDT>): Machine<mDT>;
    post_hook_global_action(action: string, handler: HookHandler<mDT>): Machine<mDT>;
    post_hook_any_action(handler: HookHandler<mDT>): Machine<mDT>;
    post_hook_standard_transition(handler: HookHandler<mDT>): Machine<mDT>;
    post_hook_main_transition(handler: HookHandler<mDT>): Machine<mDT>;
    post_hook_forced_transition(handler: HookHandler<mDT>): Machine<mDT>;
    post_hook_any_transition(handler: HookHandler<mDT>): Machine<mDT>;
    post_hook_entry(to: string, handler: HookHandler<mDT>): Machine<mDT>;
    post_hook_exit(from: string, handler: HookHandler<mDT>): Machine<mDT>;
    get rng_seed(): number;
    set rng_seed(to: number | undefined);
    edges_between(from: string, to: string): JssmTransition<StateType, mDT>[];
    /*********
     *
     *  Replace the current state and data with no regard to the graph.
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
     */
    override(newState: StateType, newData?: mDT | undefined): void;
    transition_impl(newStateOrAction: StateType, newData: mDT | undefined, wasForced: boolean, wasAction: boolean): boolean;
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
     *  @typeparam mDT The type of the machine data member; usually omitted
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
     *  @typeparam mDT The type of the machine data member; usually omitted
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
     *  @typeparam mDT The type of the machine data member; usually omitted
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
     *  @typeparam mDT The type of the machine data member; usually omitted
     *
     *  @param actionName The action to engage
     *
     *  @param newData The data change to insert during the action
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
     *  @typeparam mDT The type of the machine data member; usually omitted
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
     *  @typeparam mDT The type of the machine data member; usually omitted
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
     *  @typeparam mDT The type of the machine data member; usually omitted
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
     *  @typeparam mDT The type of the machine data member; usually omitted
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
     *  @typeparam mDT The type of the machine data member; usually omitted
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
     *  @typeparam mDT The type of the machine data member; usually omitted
     *
     */
    get active_state_style(): JssmStateConfig;
    /********
     *
     *  Gets the composite style for a specific node by individually imposing the
     *  style layers on a given object, after determining which layers are
     *  appropriate.
     *
     *  The order of composition is base, then theme, then user content.  Each
     *  item in the stack will be composited independently.  First, the base state
     *  style, then the theme state style, then the user state style.
     *
     *  After the three state styles, we'll composite the hooked styles; then the
     *  terminal styles; then the start styles; then the end styles; finally, the
     *  active styles.  Remember, last wins.
     *
     *  The base state style must exist.  All other styles are optional.
     *
     *  @typeparam mDT The type of the machine data member; usually omitted
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
     *  @typeparam mDT The type of the machine data member; usually omitted
     *
     *  @param actionName The action to engage
     *
     *  @param newData The data change to insert during the action
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
     *  @typeparam mDT The type of the machine data member; usually omitted
     *
     *  @param newState The state to switch to
     *
     *  @param newData The data change to insert during the transition
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
     *  @typeparam mDT The type of the machine data member; usually omitted
     *
     *  @param newState The state to switch to
     *
     *  @param newData The data change to insert during the transition
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
     *  @typeparam mDT The type of the machine data member; usually omitted
     *
     *  @param newState The state to switch to
     *
     *  @param newData The data change to insert during the transition
     *
     */
    force_transition(newState: StateType, newData?: mDT): boolean;
    current_action_for(action: StateType): number;
    current_action_edge_for(action: StateType): JssmTransition<StateType, mDT>;
    valid_action(action: StateType, _newData?: mDT): boolean;
    valid_transition(newState: StateType, _newData?: mDT): boolean;
    valid_force_transition(newState: StateType, _newData?: mDT): boolean;
    instance_name(): string | undefined;
    get creation_date(): Date;
    get creation_timestamp(): number;
    get create_start_time(): number;
    set_state_timeout(next_state: StateType, after_time: number): void;
    clear_state_timeout(): void;
    state_timeout_for(which_state: StateType): [StateType, number] | undefined;
    current_state_timeout(): [StateType, number] | undefined;
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
 *  @typeparam mDT The type of the machine data member; usually omitted
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
 *  @typeparam mDT The type of the machine data member; usually omitted
 *
 *  @param MachineAsString The FSL code to evaluate
 *
 *  @param ExtraConstructorFields Extra non-code configuration to pass at creation time
 *
 */
declare function from<mDT>(MachineAsString: string, ExtraConstructorFields?: Partial<JssmGenericConfig<StateType, mDT>> | undefined): Machine<mDT>;
declare function is_hook_complex_result<mDT>(hr: unknown): hr is HookComplexResult<mDT>;
declare function is_hook_rejection<mDT>(hr: HookResult<mDT>): boolean;
declare function abstract_hook_step<mDT>(maybe_hook: HookHandler<mDT> | undefined, hook_args: HookContext<mDT>): HookComplexResult<mDT>;
declare function deserialize<mDT>(machine_string: string, ser: JssmSerialization<mDT>): Machine<mDT>;

export { FslDirections, Machine, abstract_hook_step, arrow_direction, arrow_left_kind, arrow_right_kind, build_time, compile, jssm_constants_d as constants, deserialize, find_repeated, from, gviz_shapes, histograph, is_hook_complex_result, is_hook_rejection, make, named_colors, wrap_parse as parse, seq, shapes, sleep, sm, state_style_condense, transfer_state_properties, unique, version, weighted_histo_key, weighted_rand_select, weighted_sample_select };
