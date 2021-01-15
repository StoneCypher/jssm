
import { Shapes } from './constants.spec';





const jssm = require('../jssm'),
      sm   = jssm.sm;





describe('GraphViz Shapes', () => {

  Shapes.map(shape => {

    let mach = undefined;

    test(`Shape "${shape}" parses as a shape`, () =>
      expect( () => { mach = sm`state c: { shape: ${shape}; }; a -> b;`; }).not.toThrow() );

    test(`Result shape ${shape} is what it's supposed to be`, () =>
      expect( mach.state_declaration("c").shape ).toBe( shape ) );

  });

  test('handles parse end', () =>
    expect( () => {
      const _foo = sm`state c: { shape: thisIsNotAShapeSoItShouldThrow; }; a -> b;`;
    }).toThrow() );

});





describe('Corners', () => {

  test('rounded', () =>
    expect(sm`state a: { corners: rounded; }; a->b;`.state_declaration("a").corners).toBe("rounded"));

  test('lined', () =>
    expect(sm`state a: { corners: lined; }; a->b;`.state_declaration("a").corners).toBe("lined"));

  test('regular', () =>
    expect(sm`state a: { corners: regular; }; a->b;`.state_declaration("a").corners).toBe("regular"));

});





describe('Line style', () => {

  test('solid', () =>
    expect(sm`state a: { linestyle: solid; }; a->b;`.state_declaration("a").linestyle).toBe("solid"));

  test('dashed', () =>
    expect(sm`state a: { linestyle: dashed; }; a->b;`.state_declaration("a").linestyle).toBe("dashed"));

  test('dotted', () =>
    expect(sm`state a: { linestyle: dotted; }; a->b;`.state_declaration("a").linestyle).toBe("dotted"));

});
