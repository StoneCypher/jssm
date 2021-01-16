
import { Themes } from './constants.spec';

import { sm } from '../jssm';





const baseline       = sm`theme: ocean; z -> q;`,
      baseline_theme = baseline.theme();

test('Themes sound like the ocean', () =>
  expect(baseline_theme).toBe('ocean') );



const no_baseline       = sm`z -> q;`,
      no_baseline_theme = no_baseline.theme();

test('No theme sounds like none', () =>
  expect(no_baseline_theme).toBe('default') );





describe('Named themes', () => {

  Themes.map(thisTheme =>
    test(`Theme "${thisTheme}" parses as a theme`, () =>
      expect( () => { const _foo = sm`theme: ${thisTheme}; a-> b;`; }).not.toThrow() ) );

  Themes.map(thisTheme =>
    test(`Theme "${thisTheme}" shows correct theme`, () =>
      expect( sm`theme: ${thisTheme}; a-> b;`.theme() ).toBe(thisTheme) ) );

  test('Fake theme throws', () =>
    expect( () => { const _foo = sm`theme: zeghezgqqqqthirteen; a-> b;`; }).toThrow() );

});
