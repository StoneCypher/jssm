
import { Themes } from './constants.spec';

import { sm, compile, parse } from '../jssm';





const baseline       = sm`theme: ocean; z -> q;`,
      baseline_theme = baseline.themes();

test('Themes sound like the ocean', () =>
  expect(baseline_theme).toStrictEqual(['ocean']) );



const no_baseline       = sm`z -> q;`,
      no_baseline_theme = no_baseline.themes();

test('No theme sounds like none', () =>
  expect(no_baseline_theme).toStrictEqual(['default']) );





describe('Named themes', () => {

  Themes.map(thisTheme =>
    test(`Theme "${thisTheme}" parses as a theme`, () =>
      expect( () => { const _foo = sm`theme: ${thisTheme}; a-> b;`; }).not.toThrow() ) );

  Themes.map(thisTheme =>
    test(`Theme "${thisTheme}" shows correct theme`, () =>
      expect( sm`theme: ${thisTheme}; a-> b;`.themes() ).toStrictEqual([thisTheme]) ) );

  Themes.map(thisTheme =>
    test(`Missing theme shows theme "default"`, () =>
      expect( sm`a-> b;`.themes() ).toStrictEqual(["default"]) ) );

  test('Fake theme throws at the parser level', () =>
    expect( () => { const _foo = sm`theme: zeghezgqqqqthirteen; a-> b;`; }).toThrow() );

  test('Fake theme throws at the VM level', () =>
    expect( () => { const _foo = compile(parse(`theme: zeghezgqqqqthirteen; a->b;`)); } ).toThrow() );

});
