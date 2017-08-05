
/* eslint-disable max-len */

import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js'),
      sm   = jssm.sm;





describe('sm``', async _parse_it => {

    describe('simple sm`a->b;`', async it => {
      it('doesn\'t throw', t => t.notThrows(() => { const _foo = sm`a -> b;`; }) );
    });

    describe('long and chain sm`a->b;c->d;e->f->g;h->i;`', async it => {
      it('doesn\'t throw', t => t.notThrows(() => { const _foo = sm`a->b;c->d;e->f->g;h->i;`; }) );
    });

    describe('template tags`', async it => {
      it('doesn\'t throw', t => t.notThrows(() => { const bar = 'c->d', baz = 'b->h->i;f->h', _foo = sm`a->b;${bar};e->f->g;${baz};`; }) );
    });

});

// stochable
