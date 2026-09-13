
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

import { JssmError } from '../jssm_error.js';
import { version }   from '../version.js';    // replaced from package.js in build

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

export function find_connected_components<mDT>(
  states : Map<StateType, JssmGenericState>,
  edges  : Array<JssmTransition<StateType, mDT>>
): Array<Array<StateType>> {

  // Build undirected adjacency list
  const adj: Map<StateType, Set<StateType>> = new Map();
  for (const name of states.keys()) {
    adj.set(name, new Set());
  }
  for (const edge of edges) {
    adj.get(edge.from).add(edge.to);
    adj.get(edge.to).add(edge.from);
  }

  const visited : Set<StateType>             = new Set();
  const result  : Array<Array<StateType>>    = [];

  for (const start of states.keys()) {
    if (visited.has(start)) { continue; }

    // BFS to collect this component
    const component : Array<StateType> = [];
    const queue     : Array<StateType> = [start];
    visited.add(start);

    const enqueue_unvisited = (neighbor: StateType): void => {
      if (visited.has(neighbor)) { return; }
      visited.add(neighbor);
      queue.push(neighbor);
    };

    // index-pointer pop: Array.shift is O(n) per pop, making the BFS O(V²)
    // worst case; reading by cursor keeps it O(V + E)
    let head = 0;
    while (head < queue.length) {
      const node      = queue[head++];
      component.push(node);
      for (const neighbor of adj.get(node)) { enqueue_unvisited(neighbor); }
    }

    result.push(component);
  }

  return result;

}





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

export function new_state<mDT>(m: Machine<mDT>, state_config: JssmGenericState): StateType {

  if (m._states.has(state_config.name)) {
    throw new JssmError(m, `state ${JSON.stringify(state_config.name)} already exists`);
  }

  m._states.set(state_config.name, state_config);
  m._state_interner.intern(state_config.name);
  return state_config.name;

}





/********
 *
 *  Serialize the current machine, including all defining state but not the
 *  machine string, to a structure.  This means you will need the machine
 *  string to recreate (to not waste repeated space;) if you want the machine
 *  string embedded, call `serialize_with_string` instead.
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

export function serialize<mDT>(m: Machine<mDT>, comment?: string  ): JssmSerialization<mDT> {

  return {

    comment,
    state            : m._state,
    data             : m._data,
    jssm_version     : version,
    history          : m._history.toArray(),
    history_capacity : m._history.capacity,
    timestamp        : m._time_source(),

  };

}





/**
 * Get the instance name of this machine, if one was assigned at creation.
 *  @param m The machine to read.
 *  @returns The instance name string, or `undefined`.
 */
export function instance_name<mDT>(m: Machine<mDT>): string | undefined {
  return m._instance_name;
}



/**
 * Get the creation date of this machine as a `Date` object.
 *  @param m The machine to read.
 *  @returns A `Date` representing when the machine was created.
 */
export function creation_date<mDT>(m: Machine<mDT>): Date {
  return new Date(Math.floor( creation_timestamp(m) ));
}



/**
 * Get the creation timestamp (milliseconds since epoch).
 *  @param m The machine to read.
 *  @returns The timestamp as a number.
 */
export function creation_timestamp<mDT>(m: Machine<mDT>): number {
  return m._created;
}



/**
 * Get the timestamp when construction began (before parsing).
 *  @param m The machine to read.
 *  @returns The start-of-construction timestamp as a number.
 */
export function create_start_time<mDT>(m: Machine<mDT>): number {
  return m._create_started;
}
