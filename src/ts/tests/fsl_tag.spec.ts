


import { sm, fsl, Machine } from '../jssm';




describe('fsl``', () => {

    describe('simple fsl`a->b;`', () => {
      it('doesn\'t throw', () =>
        expect(() => {
          const _foo = fsl`a -> b;`;
        }).not.toThrow() );
    });

    describe('long and chain fsl`a->b;c->d;e->f->g;h->i;`', () => {
      it('doesn\'t throw', () =>
        expect(() => {
          const _foo = fsl`a->b;c->d;e->f->g;h->i;`;
        }).not.toThrow() );
    });

    describe('template tags', () => {
      it('doesn\'t throw', () =>
        expect(() => {
          const bar = 'c->d',
                baz = 'b->h->i;f->h',
               _foo = fsl`a->b;${bar};e->f->g;${baz};`;
        }).not.toThrow() );
    });

    describe('builds a real machine', () => {
      it('starts in the start state', () =>
        expect(fsl`on <=> off;`.state()).toBe('on') );
      it('transitions', () => {
        const light = fsl`on <=> off;`;
        light.transition('off');
        expect(light.state()).toBe('off');
      });
      it('is a Machine', () =>
        expect(fsl`a -> b;`).toBeInstanceOf(Machine) );
    });

    // `serialize()` stamps a wall-clock `timestamp` at build time, so two
    // machines built microseconds apart differ on that field alone and never
    // compare equal as-is.  Pin it to a constant rather than deleting it, so
    // the field still participates in the comparison — a serialize() that
    // stopped emitting `timestamp`, or emitted it under another name, would
    // still fail these tests.  The VALUE is what is untestable here, not the
    // field's presence or type.
    const PINNED_TIMESTAMP = 0;

    const pin_timestamp = (machine: Machine<unknown>) => {
      const serialized = machine.serialize();
      serialized.timestamp = PINNED_TIMESTAMP;
      return serialized;
    };

    describe('is an exact alias of sm', () => {
      it('agrees on the compiled machine', () =>
        expect(pin_timestamp(fsl`a -> b; b -> c;`))
          .toStrictEqual(pin_timestamp(sm`a -> b; b -> c;`)) );
      it('agrees on interpolated source', () => {
        const mid = 'b -> c';
        expect(pin_timestamp(fsl`a -> b; ${mid};`))
          .toStrictEqual(pin_timestamp(sm`a -> b; ${mid};`));
      });
      it('throws the same way on bad source', () =>
        expect(() => fsl`this is not fsl at all &&&`).toThrow() );
    });

    describe('method form', () => {
      it('exists and builds a machine', () =>
        expect(sm`a -> b;`.fsl`on <=> off;`.state()).toBe('on') );
      it('agrees with the method form of sm', () =>
        expect(pin_timestamp(sm`a -> b;`.fsl`x -> y;`))
          .toStrictEqual(pin_timestamp(sm`a -> b;`.sm`x -> y;`)) );
    });

    // The pin above hides the timestamp's value, so check separately that both
    // spellings actually stamp one.
    // 2023-11-14, comfortably before any machine this test could build.
    const A_PAST_EPOCH_MS = 1_700_000_000_000;

    describe('both spellings stamp a real timestamp', () => {
      it('fsl stamps a plausible epoch millisecond', () => {
        const stamped = fsl`a -> b;`.serialize().timestamp;
        expect(typeof stamped).toBe('number');
        expect(stamped).toBeGreaterThan(A_PAST_EPOCH_MS);
      });
      it('sm stamps one too', () =>
        expect(sm`a -> b;`.serialize().timestamp).toBeGreaterThan(A_PAST_EPOCH_MS) );
    });

});

// stochable
