
import { Shapes, LineStyles } from './constants.spec';

import { sm } from '../jssm';





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
        const _foo = sm`machine_name: bob; a->b; state a: { linestyle: ${linestyle}; }; `;
      }).not.toThrow() );

    test(`can set transition line style to ${linestyle}`, () =>
      expect( () => {
        const _foo = sm`machine_name: bob; a{ linestyle: ${linestyle}; }->b;`;
      }).not.toThrow() );


  })



});



test.todo('Read the actual values back out');
