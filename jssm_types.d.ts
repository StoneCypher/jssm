declare type StateType = string;
declare type JssmSuccess = {
    success: true;
};
declare type JssmFailure = {
    success: false;
    error: any;
};
declare type JssmIncomplete = {
    success: 'incomplete';
};
declare type JssmResult = JssmSuccess | JssmFailure | JssmIncomplete;
declare type JssmColor = string;
declare type JssmPermitted = 'required' | 'disallowed';
declare type JssmPermittedOpt = 'required' | 'disallowed' | 'optional';
declare type JssmArrow = '->' | '<-' | '<->' | '<=->' | '<~->' | '=>' | '<=' | '<=>' | '<-=>' | '<~=>' | '~>' | '<~' | '<~>' | '<-~>' | '<=~>';
declare type JssmShape = "box" | "polygon" | "ellipse" | "oval" | "circle" | "point" | "egg" | "triangle" | "plaintext" | "plain" | "diamond" | "trapezium" | "parallelogram" | "house" | "pentagon" | "hexagon" | "septagon" | "octagon" | "doublecircle" | "doubleoctagon" | "tripleoctagon" | "invtriangle" | "invtrapezium" | "invhouse" | "Mdiamond" | "Msquare" | "Mcircle" | "rect" | "rectangle" | "square" | "star" | "none" | "underline" | "cylinder" | "note" | "tab" | "folder" | "box3d" | "component" | "promoter" | "cds" | "terminator" | "utr" | "primersite" | "restrictionsite" | "fivepoverhang" | "threepoverhang" | "noverhang" | "assembly" | "signature" | "insulator" | "ribosite" | "rnastab" | "proteasesite" | "proteinstab" | "rpromoter" | "rarrow" | "larrow" | "lpromoter" | "record";
declare type JssmArrowDirection = 'left' | 'right' | 'both';
declare type JssmArrowKind = 'none' | 'legal' | 'main' | 'forced';
declare type JssmLayout = 'dot' | 'circo' | 'twopi' | 'fdp';
declare type JssmCorner = 'regular' | 'rounded' | 'lined';
declare type JssmLineStyle = 'solid' | 'dashed' | 'dotted';
declare type FslDirection = 'up' | 'right' | 'down' | 'left';
declare type FslTheme = 'default' | 'ocean' | 'modern' | 'none';
declare type JssmTransitionPermitter<DataType> = (OldState: StateType, NewState: StateType, OldData: DataType, NewData: DataType) => boolean;
declare type JssmTransitionPermitterMaybeArray<DataType> = JssmTransitionPermitter<DataType> | Array<JssmTransitionPermitter<DataType>>;
declare type JssmTransition<DataType> = {
    from: StateType;
    to: StateType;
    name?: string;
    action?: StateType;
    check?: JssmTransitionPermitterMaybeArray<DataType>;
    probability?: number;
    kind: JssmArrowKind;
    forced_only: boolean;
    main_path: boolean;
};
declare type JssmTransitions<DataType> = Array<JssmTransition<DataType>>;
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
    edges: Array<JssmTransition<DataType>>;
};
declare type JssmStatePermitter<DataType> = (OldState: StateType, NewState: StateType, OldData: DataType, NewData: DataType) => boolean;
declare type JssmStatePermitterMaybeArray<DataType> = JssmStatePermitter<DataType> | Array<JssmStatePermitter<DataType>>;
declare type JssmGenericMachine<DataType> = {
    name?: string;
    state: StateType;
    data?: DataType;
    nodes?: Array<StateType>;
    transitions: JssmTransitions<DataType>;
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
};
declare type JssmStateDeclaration = {
    declarations: Array<JssmStateDeclarationRule>;
    shape?: JssmShape;
    color?: JssmColor;
    corners?: JssmCorner;
    linestyle?: JssmLineStyle;
    textColor?: JssmColor;
    backgroundColor?: JssmColor;
    borderColor?: JssmColor;
    state: StateType;
};
declare type JssmGenericConfig<DataType> = {
    graph_layout?: JssmLayout;
    complete?: Array<StateType>;
    transitions: JssmTransitions<DataType>;
    theme?: FslTheme;
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
    dot_preamble?: string;
    start_states: Array<StateType>;
    end_states?: Array<StateType>;
    state_declaration?: Array<Object>;
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
};
declare type JssmCompileRule = {
    agg_as: string;
    val: any;
};
declare type JssmCompileSe = {
    to: StateType;
    se: JssmCompileSe;
    kind: JssmArrow;
    l_action?: StateType;
    r_action?: StateType;
    l_probability: number;
    r_probability: number;
};
declare type JssmCompileSeStart<DataType> = {
    from: DataType;
    se: JssmCompileSe;
    key: string;
    value?: string | number;
    name?: string;
};
declare type JssmParseTree = Array<JssmCompileSeStart<StateType>>;
declare type JssmParseFunctionType = (string: any) => JssmParseTree;
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
declare type HookDescription<mDT> = BasicHookDescription<mDT> | HookDescriptionWithAction<mDT> | GlobalActionHook<mDT> | AnyActionHook<mDT> | StandardTransitionHook<mDT> | MainTransitionHook<mDT> | ForcedTransitionHook<mDT> | AnyTransitionHook<mDT> | EntryHook<mDT> | ExitHook<mDT>;
declare type HookComplexResult<mDT> = {
    pass: boolean;
    state?: StateType;
    data?: mDT;
};
declare type HookResult<mDT> = true | false | undefined | void | HookComplexResult<mDT>;
declare type HookContext<mDT> = {
    data: mDT;
};
declare type HookHandler<mDT> = (hook_context: HookContext<mDT>) => HookResult<mDT>;
declare type JssmErrorExtendedInfo = {
    requested_state?: StateType | undefined;
};
export { JssmColor, JssmTransition, JssmTransitions, JssmTransitionList, JssmTransitionRule, JssmArrow, JssmArrowKind, JssmArrowDirection, JssmGenericConfig, JssmGenericState, JssmGenericMachine, JssmParseTree, JssmCompileSe, JssmCompileSeStart, JssmCompileRule, JssmPermitted, JssmPermittedOpt, JssmResult, JssmStateDeclaration, JssmStateDeclarationRule, JssmLayout, JssmParseFunctionType, JssmMachineInternalState, JssmErrorExtendedInfo, FslDirection, FslTheme, HookDescription, HookHandler, HookContext, HookResult, HookComplexResult };
