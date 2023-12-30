import { circular_buffer } from 'circular_buffer_js';
declare type StateType = string;
declare type JssmSuccess = {
    success: true;
}; /** Composite type indicating success as part of a result */
declare type JssmFailure = {
    success: false;
    error: any;
}; /** Composite type indicating an error, and why, as part of a result */
declare type JssmIncomplete = {
    success: 'incomplete';
}; /** Composite type indicating that a result isn't finished */
declare type JssmResult = JssmSuccess | JssmFailure | JssmIncomplete; /** Composite type composing whether or not a result was successful */
declare type JssmColor = string;
declare type JssmPermitted = 'required' | 'disallowed';
declare type JssmPermittedOpt = 'required' | 'disallowed' | 'optional';
declare type JssmArrow = '->' | '<-' | '<->' | '<=->' | '<~->' | '=>' | '<=' | '<=>' | '<-=>' | '<~=>' | '~>' | '<~' | '<~>' | '<-~>' | '<=~>';
/**
 * A type teaching Typescript the various supported shapes for nodes, mostly inherited from GraphViz
 */
declare type JssmShape = "box" | "polygon" | "ellipse" | "oval" | "circle" | "point" | "egg" | "triangle" | "plaintext" | "plain" | "diamond" | "trapezium" | "parallelogram" | "house" | "pentagon" | "hexagon" | "septagon" | "octagon" | "doublecircle" | "doubleoctagon" | "tripleoctagon" | "invtriangle" | "invtrapezium" | "invhouse" | "Mdiamond" | "Msquare" | "Mcircle" | "rect" | "rectangle" | "square" | "star" | "none" | "underline" | "cylinder" | "note" | "tab" | "folder" | "box3d" | "component" | "promoter" | "cds" | "terminator" | "utr" | "primersite" | "restrictionsite" | "fivepoverhang" | "threepoverhang" | "noverhang" | "assembly" | "signature" | "insulator" | "ribosite" | "rnastab" | "proteasesite" | "proteinstab" | "rpromoter" | "rarrow" | "larrow" | "lpromoter" | "record";
declare type JssmArrowDirection = 'left' | 'right' | 'both';
declare type JssmArrowKind = 'none' | 'legal' | 'main' | 'forced';
declare type JssmLayout = 'dot' | 'circo' | 'twopi' | 'fdp';
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
    state: StateType;
    history: [string, DataType][];
    history_capacity: number;
    data: DataType;
};
declare type JssmPropertyDefinition = {
    name: string;
    default_value?: any;
    required?: boolean;
};
declare type JssmTransitionPermitter<DataType> = (OldState: StateType, NewState: StateType, OldData: DataType, NewData: DataType) => boolean;
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
    entrances: Array<StateType>;
    exits: Array<StateType>;
};
declare type JssmTransitionCycle = {
    key: 'cycle';
    value: StateType;
};
declare type JssmTransitionRule = StateType | JssmTransitionCycle;
declare type JssmGenericState = {
    from: Array<StateType>;
    name: StateType;
    to: Array<StateType>;
    complete: boolean;
};
declare type JssmMachineInternalState<DataType> = {
    internal_state_impl_version: 1;
    state: StateType;
    states: Map<StateType, JssmGenericState>;
    named_transitions: Map<StateType, number>;
    edge_map: Map<StateType, Map<StateType, number>>;
    actions: Map<StateType, Map<StateType, number>>;
    reverse_actions: Map<StateType, Map<StateType, number>>;
    edges: Array<JssmTransition<StateType, DataType>>;
};
declare type JssmStatePermitter<DataType> = (OldState: StateType, NewState: StateType, OldData: DataType, NewData: DataType) => boolean;
declare type JssmStatePermitterMaybeArray<DataType> = JssmStatePermitter<DataType> | Array<JssmStatePermitter<DataType>>;
declare type JssmGenericMachine<DataType> = {
    name?: string;
    state: StateType;
    data?: DataType;
    nodes?: Array<StateType>;
    transitions: JssmTransitions<StateType, DataType>;
    check?: JssmStatePermitterMaybeArray<DataType>;
    min_transitions?: number;
    max_transitions?: number;
    allow_empty?: boolean;
    allow_islands?: boolean;
    allow_force?: boolean;
    keep_history?: boolean | number;
};
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
    state: StateType;
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
declare type JssmBaseTheme = {
    name: string;
    state: JssmStateConfig;
    hooked: JssmStateConfig;
    start: JssmStateConfig;
    end: JssmStateConfig;
    terminal: JssmStateConfig;
    active: JssmStateConfig;
    active_hooked: JssmStateConfig;
    active_start: JssmStateConfig;
    active_end: JssmStateConfig;
    active_terminal: JssmStateConfig;
    graph: undefined;
    legal: undefined;
    main: undefined;
    forced: undefined;
    action: undefined;
    title: undefined;
};
declare type JssmTheme = Partial<JssmBaseTheme>;
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
declare type JssmCompileRule<StateType> = {
    agg_as: string;
    val: any;
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
declare type JssmParseFunctionType<StateType, mDT> = (string: any) => JssmParseTree<StateType, mDT>;
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
declare type HookDescription<mDT> = BasicHookDescription<mDT> | HookDescriptionWithAction<mDT> | GlobalActionHook<mDT> | AnyActionHook<mDT> | StandardTransitionHook<mDT> | MainTransitionHook<mDT> | ForcedTransitionHook<mDT> | AnyTransitionHook<mDT> | EntryHook<mDT> | ExitHook<mDT> | PostBasicHookDescription<mDT> | PostHookDescriptionWithAction<mDT> | PostGlobalActionHook<mDT> | PostAnyActionHook<mDT> | PostStandardTransitionHook<mDT> | PostMainTransitionHook<mDT> | PostForcedTransitionHook<mDT> | PostAnyTransitionHook<mDT> | PostEntryHook<mDT> | PostExitHook<mDT>;
declare type HookComplexResult<mDT> = {
    pass: boolean;
    state?: StateType;
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
declare type JssmErrorExtendedInfo = {
    requested_state?: StateType | undefined;
};
declare type JssmHistory<mDT> = circular_buffer<[StateType, mDT]>;
declare type JssmRng = () => number;
export { JssmColor, JssmShape, JssmTransition, JssmTransitions, JssmTransitionList, JssmTransitionRule, JssmArrow, JssmArrowKind, JssmArrowDirection, JssmGenericConfig, JssmGenericState, JssmGenericMachine, JssmParseTree, JssmCompileSe, JssmCompileSeStart, JssmCompileRule, JssmPermitted, JssmPermittedOpt, JssmResult, JssmStateDeclaration, JssmStateDeclarationRule, JssmStateConfig, JssmStateStyleKey, JssmStateStyleKeyList, JssmBaseTheme, JssmTheme, JssmLayout, JssmHistory, JssmSerialization, JssmPropertyDefinition, JssmAllowsOverride, JssmParseFunctionType, JssmMachineInternalState, JssmErrorExtendedInfo, FslDirections, FslDirection, FslThemes, FslTheme, HookDescription, HookHandler, HookContext, HookResult, HookComplexResult, JssmRng };
