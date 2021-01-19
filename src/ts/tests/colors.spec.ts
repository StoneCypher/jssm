
import { NamedColors } from './constants.spec';
import { sm }          from '../jssm';





describe('Colors', () => {

/* eslint-disable max-nested-callbacks */

  const ColorSets = [
    { label: "Named colors",  dataset: NamedColors },
    { label: "Direct colors", dataset: [ '#ABC', '#ABCF', '#AABBCC', '#AABBCCFF' ] }
  ];

  ColorSets.map( ({label, dataset}) =>

    dataset.map(col => {

      // edge things
      ['edge_color'].map(prop =>
        [col, col.toLowerCase()].map(repres =>
          test(`${label} - Color "${repres}" parses as ${prop}`, () =>

            expect( () => {
              const _foo = sm`machine_name: bob; a-> { ${prop}: ${repres}; } b;`;
            }).not.toThrow()

          )
        )
      );

      // state things
      ['color', 'background-color', 'text-color', 'border-color'].map(prop =>
        [col, col.toLowerCase()].map(repres =>
          test(`${label} - Color "${repres}" parses as ${prop}`, () =>

            expect( () => {
              const _foo = sm`machine_name: bob; state a: { ${prop}: ${repres}; }; a -> b;`;
            }).not.toThrow()

          )
        )
      );

    })
  );

/* eslint-enable max-nested-callbacks */

});

// TODO FIXME COMEBACK tests for the other color types
// TODO FIXME COMEBACK check that the named colors are coming out sensibly

// TODO FIXME COMEBACK STOCHABLE assert that #f00, #ff0000, #f00f, #ff0000ff, and red all parse as the same color
