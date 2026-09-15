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
import type { Machine } from './machine.js';
import type { JssmGenericState, JssmTransition, JssmSerialization } from '../jssm_types.js';
type StateType = string;
/*********
 *
 *  Partition a state graph into its connected components using an undirected
 *  BFS over state names.  Each edge (from, to) is treated as bidirectional so
 *  that island membership is topology-based rather than flow-based.
 *
 *  Used at construction time to enforce the `allow_islands` constraint.
 *
 *  @param states  The machine's state map (keys are state names).
 *  @param edges   The machine's edge list; only `from` and `to` are used.
 *  @returns       An array of components, each component an array of state names.
 *
 */
export declare function find_connected_components<mDT>(states: Map<StateType, JssmGenericState>, edges: Array<JssmTransition<StateType, mDT>>): Array<Array<StateType>>;
/********
 *
 *  Internal method for fabricating states.  Not meant for external use.
 *
 *  @param m The machine to add the state to.
 *  @param state_config The state record to install; its `name` must be new.
 *  @returns The name of the state just added.
 *  @throws {JssmError} If a state of that name already exists.
 *
 *  @internal
 *
 */
export declare function new_state<mDT>(m: Machine<mDT>, state_config: JssmGenericState): StateType;
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
export declare function serialize<mDT>(m: Machine<mDT>, comment?: string): JssmSerialization<mDT>;
/**
 * Get the instance name of this machine, if one was assigned at creation.
 *  @param m The machine to read.
 *  @returns The instance name string, or `undefined`.
 *  @example
 *  import { from, instance_name } from 'jssm';
 *  instance_name(from('a -> b;'));                                   // => undefined
 *  instance_name(from('a -> b;', { instance_name: 'lamp' }));        // => 'lamp'
 */
export declare function instance_name<mDT>(m: Machine<mDT>): string | undefined;
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
export declare function creation_date<mDT>(m: Machine<mDT>): Date;
/**
 * Get the creation timestamp (milliseconds since epoch).
 *  @param m The machine to read.
 *  @returns The timestamp as a number.
 */
export declare function creation_timestamp<mDT>(m: Machine<mDT>): number;
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
export declare function create_start_time<mDT>(m: Machine<mDT>): number;
export {};
