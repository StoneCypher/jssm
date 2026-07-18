
import { NamedColors } from './constants.spec';
import { sm }          from '../jssm';





describe('Colors', () => {

 

  const ColorSets = [
    { label: "Named colors",  dataset: NamedColors },
    { label: "Direct colors", dataset: [ '#ABC', '#ABCF', '#AABBCC', '#AABBCCFF' ] }
  ];

  for (const {label, dataset} of ColorSets) {

    for (const col of dataset) {

      // edge things
      for (const prop of ['edge_color']) {
        for (const repres of [col, col.toLowerCase()]) {
          test(`${label} - Color "${repres}" parses as ${prop}`, () =>

            expect( () => {
              const _foo = sm`machine_name: bob; a-> { ${prop}: ${repres}; } b;`;
            }).not.toThrow()

          );
        }
      }

      // state things
      for (const prop of ['color', 'background-color', 'text-color', 'border-color']) {
        for (const repres of [col, col.toLowerCase()]) {
          test(`${label} - Color "${repres}" parses as ${prop}`, () =>

            expect( () => {
              const _foo = sm`machine_name: bob; state a: { ${prop}: ${repres}; }; a -> b;`;
            }).not.toThrow()

          );
        }
      }

    }
  }

 

});

// TODO FIXME COMEBACK tests for the other color types
// TODO FIXME COMEBACK check that the named colors are coming out sensibly

// TODO FIXME COMEBACK STOCHABLE assert that #f00, #ff0000, #f00f, #ff0000ff, and red all parse as the same color
