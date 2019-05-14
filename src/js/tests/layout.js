
/* eslint-disable max-len */

import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.cjs.js'),
      sm   = jssm.sm;





describe('graph attributes don\'t throw', async it => {
  const machine = sm`graph_layout: circo; a->b->c->d->e->f->a;`;
  it('layout is circo', t => t.is('circo', machine.graph_layout() ));
});





describe('error catchery', async _parse_it => {

  describe('double graph_layout', async it => {
    it('throws', t => t.throws( () => {
      const _machine = sm`graph_layout: circo; graph_layout: circo; a->b->c->d->e->f->a;`;
    } ));
  });

});
