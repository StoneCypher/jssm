
import * as jssm from '../jssm';
const sm = jssm.sm;





describe('Shapes list length', () => {

  test('Shapes list is gviz shapes plus nothing in length', () =>
    expect(jssm.shapes.length).toBe(jssm.gviz_shapes.length) )

});





describe('GraphViz Shapes', () => {

  jssm.shapes.map(shape => {

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





describe('Named colors', () => {

  jssm.named_colors.map(color =>

    test(`Color "${color}" parses as a color`, () =>
      expect( () => { const mach = sm`state b: { background-color: ${color}; }; a -> b;`; }).not.toThrow() )

  );

  jssm.named_colors.map(color =>

    test(`Color "${color.toLowerCase()}" (${color} lowercased) parses as a color`, () =>
      expect( () => { const mach = sm`state b: { background-color: ${color.toLowerCase()}; }; a -> b;`; }).not.toThrow() )

  );

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
