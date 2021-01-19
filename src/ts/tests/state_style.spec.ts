
import { Shapes } from './constants.spec';

import { sm } from '../jssm';





describe('State style', () => {

  Shapes.map(shape => {

    describe(shape, () => {

      test(`can set regular state to ${shape}`, () =>
        expect( () => {
          const _foo = sm`machine_name: bob; state: { shape: ${shape}; }; a-> b;`;
        }).not.toThrow() );

      test(`can set start state to ${shape}`, () =>
        expect( () => {
          const _foo = sm`machine_name: bob; start_state: { shape: ${shape}; }; a-> b;`;
        }).not.toThrow() );

      test(`can set end state to ${shape}`, () =>
        expect( () => {
          const _foo = sm`machine_name: bob; end_state: { shape: ${shape}; }; a-> b;`;
        }).not.toThrow() );

    });

  });

});



test.todo('Read the actual values back out');
