
import { Themes }             from './constants.spec';

import { sm, compile, parse } from '../jssm';
import { FslThemes }          from '../jssm_types';





const baseline       = sm`theme: ocean; z -> q;`,
      baseline_theme = baseline.themes;

test('Themes sound like the ocean', () =>
  expect(baseline_theme).toStrictEqual(['ocean']) );



const no_baseline       = sm`z -> q;`,
      no_baseline_theme = no_baseline.themes;

test('No theme sounds like none', () =>
  expect(no_baseline_theme).toStrictEqual(['default']) );





describe('Named themes', () => {

  Themes.map(thisTheme =>
    test(`Theme "${thisTheme}" parses as a theme`, () =>
      expect( () => { const _foo = sm`theme: ${thisTheme}; a-> b;`; }).not.toThrow() ) );

  Themes.map(thisTheme =>
    test(`Theme "${thisTheme}" shows correct theme`, () =>
      expect( sm`theme: ${thisTheme}; a-> b;`.themes ).toStrictEqual([thisTheme]) ) );

  Themes.map(thisTheme =>
    test(`Missing theme shows theme "default"`, () =>
      expect( sm`a-> b;`.themes ).toStrictEqual(["default"]) ) );

  test('Fake theme throws at the parser level', () =>
    expect( () => { const _foo = sm`theme: zeghezgqqqqthirteen; a-> b;`; }).toThrow() );

  test('Fake theme throws at the VM level', () =>
    expect( () => { const _foo = compile(parse(`theme: zeghezgqqqqthirteen; a->b;`)); } ).toThrow() );

});





describe('Multiple themes', () => {

  test(`Theme "[ocean modern]" parses as a theme`, () =>
    expect( () => { const _foo = sm`theme: [ocean modern]; a-> b;`; }).not.toThrow() );

  test(`Theme "[ocean modern]" shows first theme as dominant`, () =>
    expect( sm`theme: [ocean modern]; a->b;`.themes ).toStrictEqual(['ocean','modern']) );

  test(`Theme "[ocean modern]" shows first theme as dominant`, () =>
    expect( sm`theme: [ocean modern]; a->b;`.style_for('a').backgroundColor ).toBe('deepskyblue') );

  test('Fake theme throws at the parser level', () =>
    expect( () => { const _foo = sm`theme: [ocean zeghezgqqqqthirteen]; a-> b;`; }).toThrow() );

});





describe('Check theme registration', () => {

  test('FslThemes list matches sm``.all_themes(), post-sort', () =>
    expect( sm`a->b;`.all_themes().sort() ).toStrictEqual([... FslThemes].sort()) );

});





test('Theme change', () => {

  const foo = sm`a->b;`;
  expect(foo.themes).toStrictEqual(['default']);

  foo.themes = 'ocean';
  expect(foo.themes).toStrictEqual(['ocean']);

  foo.themes = ['ocean', 'default'];
  expect(foo.themes).toStrictEqual(['ocean', 'default']);

});
