
/* eslint-disable max-len */

const jssm = require('../jssm'),
      sm   = jssm.sm;





describe('matter', () => {

    const matter = sm` Solid 'Heat' <-> 'Cool' Liquid 'Heat' <-> 'Cool' Gas 'Heat' <-> 'Cool' Plasma; `;

    test( 'starts Solid',    () => expect(matter.state()        ).toBe( 'Solid'  ) );
    test( 'Heat is true',    () => expect(matter.action('Heat') ).toBe( true     ) );
    test( 'is now Liquid',   () => expect(matter.state()        ).toBe( 'Liquid' ) );
    test( 'Heat is true 2',  () => expect(matter.action('Heat') ).toBe( true     ) );
    test( 'is now Gas',      () => expect(matter.state()        ).toBe( 'Gas'    ) );
    test( 'Heat is true 3',  () => expect(matter.action('Heat') ).toBe( true     ) );
    test( 'is now Plasma',   () => expect(matter.state()        ).toBe( 'Plasma' ) );
    test( 'Heat is false',   () => expect(matter.action('Heat') ).toBe( false    ) );
    test( 'is now Plasma 2', () => expect(matter.state()        ).toBe( 'Plasma' ) );
    test( 'Cool is true',    () => expect(matter.action('Cool') ).toBe( true     ) );
    test( 'is now Gas 2',    () => expect(matter.state()        ).toBe( 'Gas'    ) );
    test( 'Cool is true 2',  () => expect(matter.action('Cool') ).toBe( true     ) );
    test( 'is now Liquid 2', () => expect(matter.state()        ).toBe( 'Liquid' ) );
    test( 'Cool is true 3',  () => expect(matter.action('Cool') ).toBe( true     ) );
    test( 'is now Solid',    () => expect(matter.state()        ).toBe( 'Solid'  ) );
    test( 'Cool is false',   () => expect(matter.action('Cool') ).toBe( false    ) );
    test( 'is now Solid 2',  () => expect(matter.state()        ).toBe( 'Solid'  ) );

});
