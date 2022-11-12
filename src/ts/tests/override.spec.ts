
import * as jssm from '../jssm';
const sm = jssm.sm;





describe('.allows_override', () => {

  test('undefined in code, missing in config reads out false', () => {
    const machine = sm`a -> b;`;
    expect(machine.allows_override).toBe(false);
  });

  // test('undefined in code, undefined in config reads out false', () => {

  // });

  // test('undefined in code, allowed in config reads out true', () => {

  // });

  // test('undefined in code, disallowed in config reads out false', () => {

  // });



  // test('allowed in code, missing in config reads out true', () => {
  //   const machine = sm`allows_override: true; a -> b;`;
  //   expect(machine.allows_override).toBe(true);
  // });

  // test('allowed in code, undefined in config reads out true', () => {

  // });

  // test('allowed in code, allowed in config reads out true', () => {

  // });

  // test('allowed in code, disallowed in config reads out false', () => {

  // });



  // test('disallowed in code, missing in config reads out false', () => {
  //   const machine = sm`allows_override: false; a -> b;`;
  //   expect(machine.allows_override).toBe(false);
  // });

  // test('disallowed in code, undefined in config reads out false', () => {

  // });

  // test('disallowed in code, allowed in config throws an error', () => {

  // });

  // test('disallowed in code, disallowed in config reads out false', () => {

  // });

});
