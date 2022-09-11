
/* In general, this shouldn't import anything, because this is both run and
   partially imported by other things. */

/* We make an exception for arr_uniq_p() from util */

import * as jssm      from '../jssm';
import { arr_uniq_p } from '../jssm_util';





/* constant lists for tests */

test.todo('These constants should be derived from the source and compared');

const Shapes      = jssm.shapes,
      NamedColors = jssm.named_colors;





const Themes         = ['default', 'ocean', 'none', 'modern', 'bold'],
      FlowDirections = ['up','down','left','right'],
      LineStyles     = ['solid', 'dotted', 'dashed'];





// for coverage, and because ava throws on no-test files in its test directory

describe('Constants test lists', () => {

  const testdata: [ string, string[] ][] = [
    [ 'Shapes',         Shapes         ],
    [ 'NamedColors',    NamedColors    ],
    [ 'Themes',         Themes         ],
    [ 'FlowDirections', FlowDirections ]
  ];

  testdata.map(datum => {

    test(`List "${datum[0]}" is an array`, () =>
      expect( Array.isArray(datum[1]) ).toBe(true) );

    test(`List "${datum[0]}" isn't empty`, () =>
      expect( datum[1].length > 1 ).toBe(true) );

    test(`List "${datum[0]}" contains no null, undefined, or holes`, () =>
      // eslint-disable-next-line no-eq-null, eqeqeq
      expect( datum[1].length == null ).toBe(false) );  // LEAVE THIS DOUBLE-EQUALS

    test(`List "${datum[0]}" contains no empty strings`, () =>
      expect( datum[1].every(s => s !== '') ).toBe(true) );

    test(`List "${datum[0]}" contains no repetitions`, () => {
      const deduped = datum[1].filter(arr_uniq_p);
      expect( datum[1].length ).toBe(deduped.length);
    });

  });

});





export { NamedColors, Shapes, Themes, FlowDirections, LineStyles };
