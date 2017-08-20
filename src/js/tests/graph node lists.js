
/* eslint-disable max-len */

import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js'),
      sm   = jssm.sm;





describe('graph node lists', async it => {

  it('start nodes don\'t throw', t => t.notThrows(() => { const _a = sm`start_nodes: [a b c]; a->b->c->d;`; }) );
  it('end nodes don\'t throw',   t => t.notThrows(() => { const _a = sm`end_nodes:   [a b c]; a->b->c->d;`; }) );

// comeback whargarbl
//  const overrider = make(` a->b->c; start_nodes: [c]; `);
//  it('start nodes override initial node', t => t.is(0, () => {}) );

});
