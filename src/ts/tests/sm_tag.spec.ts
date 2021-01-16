
/* eslint-disable max-len */

import { sm } from '../jssm';





describe('sm``', () => {

    describe('simple sm`a->b;`', () => {
      it('doesn\'t throw', () =>
        expect(() => {
          const _foo = sm`a -> b;`;
        }).not.toThrow() );
    });

    describe('long and chain sm`a->b;c->d;e->f->g;h->i;`', () => {
      it('doesn\'t throw', () =>
        expect(() => {
          const _foo = sm`a->b;c->d;e->f->g;h->i;`;
        }).not.toThrow() );
    });

    describe('template tags`', () => {
      it('doesn\'t throw', () =>
        expect(() => {
          const bar = 'c->d',
                baz = 'b->h->i;f->h',
               _foo = sm`a->b;${bar};e->f->g;${baz};`;
        }).not.toThrow() );
    });

});

// stochable
