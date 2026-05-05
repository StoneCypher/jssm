
/* eslint-disable max-len */

import * as jv   from '../jssm_viz';
import * as jssm from '../jssm';

const sm = jssm.sm;





describe('jssm_viz module loads', () => {

  test('exports version as string', () =>
    expect(typeof jv.version)
      .toBe('string'));

  test('exports build_time as number', () =>
    expect(typeof jv.build_time)
      .toBe('number'));

});



describe('color8to6 helper', () => {

  test('strips alpha channel from #RRGGBBAA', () =>
    expect(jv._test.color8to6('#11223344'))
      .toBe('#112233'));

  test('throws on non-#-prefixed input', () =>
    expect(() => jv._test.color8to6('11223344'))
      .toThrow());

  test('throws on length mismatch', () =>
    expect(() => jv._test.color8to6('#1122'))
      .toThrow());

  test('u_color8to6 returns undefined for undefined input', () =>
    expect(jv._test.u_color8to6(undefined))
      .toBeUndefined());

  test('u_color8to6 delegates to color8to6 for defined input', () =>
    expect(jv._test.u_color8to6('#aabbccdd'))
      .toBe('#aabbcc'));

});



describe('vc helper', () => {

  test('returns the palette value for a known key', () =>
    expect(jv._test.vc('graph_bg_color'))
      .toBe('#eeeeee'));

  test('returns empty string for an unknown key', () =>
    expect(jv._test.vc('not_a_real_key'))
      .toBe(''));

});



describe('node_of helper', () => {

  test('returns n<index> for the first state', () =>
    expect(jv._test.node_of('a', ['a', 'b', 'c']))
      .toBe('n0'));

  test('returns n<index> for the last state', () =>
    expect(jv._test.node_of('c', ['a', 'b', 'c']))
      .toBe('n2'));

});
