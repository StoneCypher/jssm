
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
