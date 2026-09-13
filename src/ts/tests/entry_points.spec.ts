/*******
 *
 *  Contract of the two package entry points after the 6.0 bare-functions
 *  split (decision 3 of the bare-functions design): the default `jssm` entry
 *  exports the factories and functions but no `Machine` value; `jssm/compat`
 *  exports the class plus everything the default entry has; and the record
 *  every factory returns IS a `Machine` instance, so the two entries
 *  interoperate on the same object.
 *
 */

import { describe, test, expect } from 'vitest';
import * as jssm   from '../jssm';
import * as compat from '../compat';



/** A one-edge machine config in the real `JssmGenericConfig` shape. */
const ONE_EDGE_CONFIG = {
  start_states : ['a'],
  transitions  : [ { from: 'a', to: 'b', kind: 'legal' as const, forced_only: false, main_path: false } ],
};



describe('package entry points (decision 3: the record is a Machine instance)', () => {

  test('the default entry exports no Machine value', () => {
    expect((jssm as Record<string, unknown>).Machine).toBeUndefined();
  });

  test('the compat entry exports the Machine class and everything the default entry has', () => {
    expect(typeof compat.Machine).toBe('function');
    expect(Object.keys(compat)).toEqual(expect.arrayContaining(Object.keys(jssm)));
    expect(Object.keys(jssm)).not.toContain('Machine');
    expect(Object.keys(compat)).toContain('Machine');
  });

  test('create, sm, and from return Machine instances', () => {
    expect(jssm.sm`a -> b;`).toBeInstanceOf(compat.Machine);
    expect(jssm.from('a -> b;')).toBeInstanceOf(compat.Machine);
    expect(jssm.create(ONE_EDGE_CONFIG)).toBeInstanceOf(compat.Machine);
  });

  test('create builds the same machine as the class constructor', () => {
    const via_create = jssm.create(ONE_EDGE_CONFIG);
    const via_class  = new compat.Machine(ONE_EDGE_CONFIG);
    expect(via_create.states()).toEqual(via_class.states());
    expect(via_create.state()).toBe('a');
    expect(via_class.state()).toBe('a');
    expect(via_create.list_exits('a')).toEqual(['b']);
  });

  test('the compat entry is the same module graph, not a copy: its factories return its own Machine', () => {
    expect(compat.sm`a -> b;`).toBeInstanceOf(compat.Machine);
    expect(compat.create(ONE_EDGE_CONFIG)).toBeInstanceOf(compat.Machine);
  });

});
