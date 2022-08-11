
import { Shapes, LineStyles } from './constants.spec';

import { sm, state_style_condense } from '../jssm';

import {
  base_state_style,
  base_start_state_style,
  base_end_state_style,
  base_terminal_state_style,
  base_active_state_style
} from '../jssm_base_stylesheet';





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

    test(`can set regular state border line style to ${linestyle} using no-dash`, () =>
      expect( () => {
        const _foo = sm`machine_name: bob; state: { linestyle: ${linestyle}; }; a->b;`;
      }).not.toThrow() );

    test(`can set regular state border line style to ${linestyle}`, () =>
      expect( () => {
        const _foo = sm`machine_name: bob; a->b; state a: { line-style: ${linestyle}; }; `;
      }).not.toThrow() );

    test(`can set active state border line style to ${linestyle}`, () =>
      expect( () => {
        const _foo = sm`machine_name: bob; a->b; active_state: { line-style: ${linestyle}; }; `;
      }).not.toThrow() );

    test(`can set terminal state border line style to ${linestyle}`, () =>
      expect( () => {
        const _foo = sm`machine_name: bob; a->b; terminal_state: { line-style: ${linestyle}; }; `;
      }).not.toThrow() );

    test(`can set start state border line style to ${linestyle} using no-dash`, () =>
      expect( () => {
        const _foo = sm`machine_name: bob; start_state: { linestyle: ${linestyle}; }; a->b;`;
      }).not.toThrow() );

    test(`can set end state border line style to ${linestyle} using no-dash`, () =>
      expect( () => {
        const _foo = sm`machine_name: bob; end_state: { linestyle: ${linestyle}; }; a->b;`;
      }).not.toThrow() );

    test(`can set specific state border line style to ${linestyle} using no-dash notation`, () =>
      expect( () => {
        const _foo = sm`machine_name: bob; a->b; state a: { linestyle: ${linestyle}; }; `;
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

  describe(`All properties overridable from inline`, () => {

    const foo = sm`
      a->b;
      state   : { shape: circle;    background-color: red;    color: blue;   text-color: green; corners: rounded; line-style: dashed; border-color: yellow; };
      state a : { shape: rectangle; background-color: purple; color: orange; text-color: cyan;  corners: lined;   line-style: dotted; border-color: brown;  };
    `;

    const sa = foo.style_for('a');

    test('shape reads out', () => {
      expect( sa.shape ).toEqual( 'rectangle' );
    });

    test('background-color reads out', () => {
      expect( sa.backgroundColor ).toEqual( '#800080ff' );
    });

    test('color reads out', () => {
      expect( sa.color ).toEqual( '#ffa500ff' );
    });

    test('text-color reads out', () => {
      expect( sa.textColor ).toEqual( '#00ffffff' );
    });

    test('corners read out', () => {
      expect( sa.corners ).toEqual( 'lined' );
    });

    test('line-style reads out', () => {
      expect( sa.lineStyle ).toEqual( 'dotted' );
    });

    test('border-color reads out', () => {
      expect( sa.borderColor ).toEqual( '#a52a2aff' );
    });

  });

  describe(`All properties block doublings`, () => {

    test('shape blocks doublings', () => {
      expect( () => sm`a->b; state: { shape: circle; shape: circle; };` ).toThrow();
    });

    test('background-color blocks doublings', () => {
      expect( () => sm`a->b; state: { background-color: red; background-color: red; };` ).toThrow();
    });

    test('color blocks doublings', () => {
      expect( () => sm`a->b; state: { color: blue; color: blue; };` ).toThrow();
    });

    test('text-color blocks doublings', () => {
      expect( () => sm`a->b; state: { text-color: green; text-color: green; };` ).toThrow();
    });

    test('corners block doublings', () => {
      expect( () => sm`a->b; state: { corners: rounded; corners: rounded; };` ).toThrow();
    });

    test('line-style blocks doublings', () => {
      expect( () => sm`a->b; state: { line-style: dashed; line-style: dashed; };` ).toThrow();
    });

    test('label blocks doublings', () => {
      expect( () => sm`a->b; state: { label: butt; label: chunks; };` ).toThrow();
    });

    test('border-color blocks doublings', () => {
      expect( () => sm`a->b; state: { border-color: yellow; border-color: yellow; };` ).toThrow();
    });

  });

});





describe('application order', () => {

  // end state should override terminal, so e is end, but f is terminal

  // TODO doesn't cover themes
  // TODO doesn't cover hooked nodes
  const zed = sm`start_states: [a b]; end_states: [e]; [a b] -> c -> d -> [e f];`;
  zed.go('c');

  test('start states style appropriately', () => {
    expect( zed.style_for('a').backgroundColor )
      .toEqual( base_start_state_style.backgroundColor );
  });

  test('end states style appropriately', () => {
    expect( zed.style_for('e').backgroundColor )
      .toEqual( base_end_state_style.backgroundColor );
  });

  test('terminal states style appropriately', () => {
    expect( zed.style_for('f').backgroundColor )
      .toEqual( base_terminal_state_style.backgroundColor );
  });

  test('standard states style appropriately', () => {
    expect( zed.style_for('d').backgroundColor )
      .toEqual( base_state_style.backgroundColor );
  });

  test('active states style appropriately', () => {
    expect( zed.style_for('c').backgroundColor )
      .toEqual( base_active_state_style.backgroundColor );
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
