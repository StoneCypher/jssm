
import { Shapes, LineStyles } from './constants.spec';

import { sm, state_style_condense } from '../jssm';





describe('State style', () => {



  Shapes.map(shape => {

    describe(shape, () => {

      test(`can set regular state to ${shape}`, () =>
        expect( () => {
          const _foo = sm`machine_name: bob; state: { shape: ${shape}; }; a->b;`;
        }).not.toThrow() );

      test(`can set start state to ${shape}`, () =>
        expect( () => {
          const _foo = sm`machine_name: bob; start_state: { shape: ${shape}; }; a->b;`;
        }).not.toThrow() );

      test(`can set end state to ${shape}`, () =>
        expect( () => {
          const _foo = sm`machine_name: bob; end_state: { shape: ${shape}; }; a->b;`;
        }).not.toThrow() );

      test(`can set specific state to ${shape}`, () =>
        expect( () => {
          const _foo = sm`machine_name: bob; a->b; state a: { shape: ${shape}; };`;
        }).not.toThrow() );

    });

  });



  LineStyles.map(linestyle => {

    // TODO FIXME it turns out state: , start_state: , and end_state: are on vestigial productions.  fix it

    // test(`can set regular state border line style to ${linestyle}`, () =>
    //   expect( () => {
    //     const _foo = sm`machine_name: bob; state: { linestyle: ${linestyle}; }; a->b;`;
    //   }).not.toThrow() );

    // test(`can set start state border line style to ${linestyle}`, () =>
    //   expect( () => {
    //     const _foo = sm`machine_name: bob; start_state: { linestyle: ${linestyle}; }; a->b;`;
    //   }).not.toThrow() );

    // test(`can set end state border line style to ${linestyle}`, () =>
    //   expect( () => {
    //     const _foo = sm`machine_name: bob; end_state: { linestyle: ${linestyle}; }; a->b;`;
    //   }).not.toThrow() );

    test(`can set specific state border line style to ${linestyle}`, () =>
      expect( () => {
        const _foo = sm`machine_name: bob; a->b; state a: { line-style: ${linestyle}; }; `;
      }).not.toThrow() );

    test(`can set transition line style to ${linestyle}`, () =>
      expect( () => {
        const _foo = sm`machine_name: bob; a{ line-style: ${linestyle}; }->b;`;
      }).not.toThrow() );


  })



});





describe('Default state style', () => {

  test(`can set default state style`, () =>
    expect( () => {
      const _foo = sm`state: { shape: circle; }; a->b;`;
    }).not.toThrow() );

  test(`can set hooked state style`, () =>
    expect( () => {
      const _foo = sm`hooked_state: { shape: circle; }; a->b;`;
    }).not.toThrow() );

  test(`can set active state style`, () =>
    expect( () => {
      const _foo = sm`active_state: { shape: circle; }; a->b;`;
    }).not.toThrow() );

  test(`can set terminal state style`, () =>
    expect( () => {
      const _foo = sm`terminal_state: { shape: circle; }; a->b;`;
    }).not.toThrow() );

  test(`can set start state style`, () =>
    expect( () => {
      const _foo = sm`start_state: { shape: circle; }; a->b;`;
    }).not.toThrow() );

  test(`can set end state style`, () =>
    expect( () => {
      const _foo = sm`end_state: { shape: circle; }; a->b;`;
    }).not.toThrow() );

  describe(`All style sets read back out`, () => {

    const foo = sm`
      a->b;
      state: { shape: circle; background-color: red; };
      active_state: { shape: ellipse; };
      start_state: { shape: box; };
      end_state: { shape: box3d; };
      terminal_state: { shape: house; };
      hooked_state: { shape: plain; };
    `;

    test('standard reads out', () => {
      expect( foo.standard_state_style ).toStrictEqual( { shape: 'circle', backgroundColor: '#ff0000ff' } );
    });

    test('active reads out', () => {
      expect( foo.active_state_style ).toStrictEqual( { shape: 'ellipse' } );
    });

    test('start reads out', () => {
      expect( foo.start_state_style ).toStrictEqual( { shape: 'box' } );
    });

    test('end reads out', () => {
      expect( foo.end_state_style ).toStrictEqual( { shape: 'box3d' } );
    });

    test('terminal reads out', () => {
      expect( foo.terminal_state_style ).toStrictEqual( { shape: 'house' } );
    });

    test('hooked reads out', () => {
      expect( foo.hooked_state_style ).toStrictEqual( { shape: 'plain' } );
    });

  });

  describe(`All properties read back out`, () => {

    const foo = sm`
      a->b;
      state: { shape: circle; background-color: red; color: blue; text-color: green; corners: rounded; line-style: dashed; border-color: yellow; };
    `;

    test('shape reads out', () => {
      expect( foo.standard_state_style.shape ).toEqual( 'circle' );
    });

    test('background-color reads out', () => {
      expect( foo.standard_state_style.backgroundColor ).toEqual( '#ff0000ff' );
    });

    test('color reads out', () => {
      expect( foo.standard_state_style.color ).toEqual( '#0000ffff' );
    });

    test('text-color reads out', () => {
      expect( foo.standard_state_style.textColor ).toEqual( '#008000ff' );
    });

    test('corners read out', () => {
      expect( foo.standard_state_style.corners ).toEqual( 'rounded' );
    });

    test('line-style reads out', () => {
      expect( foo.standard_state_style.lineStyle ).toEqual( 'dashed' );
    });

    test('border-color reads out', () => {
      expect( foo.standard_state_style.borderColor ).toEqual( '#ffff00ff' );
    });

  });

  describe(`All properties block doublings`, () => {


    test('shape reads out', () => {
      expect( () => sm`a->b; state: { shape: circle; shape: circle; };` ).toThrow();
    });

    test('background-color reads out', () => {
      expect( () => sm`a->b; state: { background-color: red; background-color: red; };` ).toThrow();
    });

    test('color reads out', () => {
      expect( () => sm`a->b; state: { color: blue; color: blue; };` ).toThrow();
    });

    test('text-color reads out', () => {
      expect( () => sm`a->b; state: { text-color: green; text-color: green; };` ).toThrow();
    });

    test('corners read out', () => {
      expect( () => sm`a->b; state: { corners: rounded; corners: rounded; };` ).toThrow();
    });

    test('line-style reads out', () => {
      expect( () => sm`a->b; state: { line-style: dashed; line-style: dashed; };` ).toThrow();
    });

    test('border-color reads out', () => {
      expect( () => sm`a->b; state: { border-color: yellow; border-color: yellow; };` ).toThrow();
    });

  });

});





describe('state_style_condense is immune to nonsense properties', () => {

  test('failed key', () => {

    expect(

      () =>
        state_style_condense([{key: 'this is not a valid key'}] as any)

    ).toThrow();

  });

  test('missing key', () => {

    expect(

      () =>
        state_style_condense([{there_is_no_key: 'there is no spoon'}] as any)

    ).toThrow();

  });

  test('not an object item', () => {

    expect(

      () =>
        state_style_condense([false] as any)

    ).toThrow();

  });

  test('not an array', () => {

    expect(

      () =>
        state_style_condense(false as any)

    ).toThrow();

  });

});
