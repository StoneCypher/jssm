
import { Themes }             from './constants.spec';

import { sm, compile, parse } from '../jssm';
import { FslThemes }          from '../jssm_types';
import type { JssmTheme }     from '../jssm_types';
import { theme_mapping }      from '../jssm_theme';

/** Code-unit string comparator, reproducing Array#sort's default ordering explicitly. */
const code_unit_compare = (a: string, b: string): number => (a < b ? -1 : (a > b ? 1 : 0));





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

  test(`Theme "[ocean modern]" applies the dominant theme's background color`, () =>
    expect( sm`theme: [ocean modern]; a->b;`.style_for('a').backgroundColor ).toBe('deepskyblue') );

  test('Fake theme throws at the parser level', () =>
    expect( () => { const _foo = sm`theme: [ocean zeghezgqqqqthirteen]; a-> b;`; }).toThrow() );

});





describe('Check theme registration', () => {

  test('FslThemes list matches sm``.all_themes(), post-sort', () =>
    expect( sm`a->b;`.all_themes().sort(code_unit_compare) ).toStrictEqual([... FslThemes].sort(code_unit_compare)) );

});





test('Theme change', () => {

  const foo = sm`a->b;`;
  expect(foo.themes).toStrictEqual(['default']);

  foo.themes = 'ocean';
  expect(foo.themes).toStrictEqual(['ocean']);

  foo.themes = ['ocean', 'default'];
  expect(foo.themes).toStrictEqual(['ocean', 'default']);

});





describe('theme change invalidates memoized state configs', () => {

  // Regression pin: `resolve_state_config` memoizes the static tiers per
  // state, and themes feed tier 1 — so assigning `machine.themes` after a
  // state's config has already been resolved must not keep serving the
  // old theme's resolution from the cache.

  test('a style resolved before a theme change re-resolves under the new theme', () => {

    // what the ocean theme resolves to when set from birth
    const expected = sm`theme: ocean; a -> b -> c;`.style_for('b');

    const changed = sm`a -> b -> c;`;
    changed.style_for('b');                       // memoizes the default-theme resolution
    changed.themes = 'ocean';

    expect( changed.style_for('b') ).toStrictEqual(expected);

  });

  test('a style resolved before a theme change back to default matches a never-themed twin', () => {

    const expected = sm`a -> b -> c;`.style_for('b');

    const changed = sm`theme: modern; a -> b -> c;`;
    changed.style_for('b');                       // memoizes the modern-theme resolution
    changed.themes = 'default';

    expect( changed.style_for('b') ).toStrictEqual(expected);

  });

});





/* Regression: fsl#1328 — the grammar formerly listed `none` and lacked
   `plain`, so `theme: plain;` was rejected and `theme: none;` slipped past
   the parser only to vanish at `theme_mapping.get('none') === undefined`.
   The grammar now matches `FslThemes` exactly. */

describe('fsl#1328 — grammar and theme_mapping agree', () => {

  test('`theme: plain;` parses', () =>
    expect( () => { const _foo = sm`theme: plain; a -> b;`; } ).not.toThrow() );

  test('`theme: plain;` puts "plain" into the machine themes list', () =>
    expect( sm`theme: plain; a -> b;`.themes ).toStrictEqual(['plain']) );

  test('`theme_mapping.get("plain")` is defined', () =>
    expect( theme_mapping.get('plain') ).toBeDefined() );

  test('`theme: none;` is rejected by the parser', () =>
    expect( () => { const _foo = sm`theme: none; a -> b;`; } ).toThrow() );

  for (const themeName of FslThemes) {
    test(`FslTheme "${themeName}" resolves to a defined theme_mapping entry`, () =>
      expect( theme_mapping.get(themeName) ).toBeDefined() );
  }

  for (const themeName of FslThemes) {
    test(`FslTheme "${themeName}" parses and lands in machine.themes`, () =>
      expect( sm`theme: ${themeName}; a -> b;`.themes ).toStrictEqual([themeName]) );
  }

});

describe('style_for theme layering edge cases', () => {

  // style_for() walks `_themes`, looks each name up in `theme_mapping`, and
  // for every registered theme conditionally pushes its per-category
  // sub-styles. These tests exercise the *false* arms of those guards:
  //
  //  - a theme name set on the machine that is NOT in theme_mapping
  //  - a registered theme object that omits a per-category sub-style
  //
  // theme_mapping.set(name, theme) is the documented theme-registration
  // mechanism (see jssm_theme.ts). The partial theme registered below is a
  // genuine JssmTheme (Partial<JssmBaseTheme>) — themes are allowed to omit
  // slots so they fall through to the base theme.

  test('an unregistered theme name is silently skipped during layering', () => {
    // `themes` setter does no validation, so a name absent from theme_mapping
    // can land in `_themes`. style_for must look it up, get undefined, and
    // skip it — never throwing. The resulting style still resolves from the
    // base theme.
    const foo = sm`start_states: [a]; a -> b;`;
    foo.themes = ['this-theme-is-not-registered'] as any;

    expect( () => foo.style_for('a') ).not.toThrow();
    const style = foo.style_for('a');
    expect(typeof style).toBe('object');
    // The unregistered name contributes no layer; styling still resolves
    // from the base theme (start state 'a' is also the active state, so its
    // background is the base active color).
    expect(style.backgroundColor).toBe('dodgerblue4');
  });


  describe('a registered theme that omits per-category sub-styles', () => {

    // A deliberately minimal theme: it carries a `name` only, omitting
    // `state`, `terminal`, `start`, `end`, and `active`. Each omission
    // exercises the false arm of the matching `if (theme.X)` guard in
    // style_for.
    const sparse_theme_name = 'spec-sparse-theme';
    const sparse_theme: JssmTheme = { name: sparse_theme_name };

    beforeAll(() => {
      theme_mapping.set(sparse_theme_name as any, sparse_theme as any);
    });

    afterAll(() => {
      theme_mapping.delete(sparse_theme_name as any);
    });

    test('omitted .state sub-style is skipped for a standard state', () => {
      const foo = sm`start_states: [a]; end_states: [d]; a -> b -> c -> d;`;
      foo.themes = [sparse_theme_name] as any;
      // 'b' is a plain standard state; the sparse theme contributes no
      // .state layer, so styling falls through to the base theme.
      expect( () => foo.style_for('b') ).not.toThrow();
      expect(foo.style_for('b').backgroundColor).toBe('white');
    });

    test('omitted .start sub-style is skipped for a start state', () => {
      // Start at 'a', advance to 'c' so 'a' is a start state that is NOT the
      // active state — its background reflects start styling, not active.
      const foo = sm`start_states: [a b]; [a b] -> c;`;
      foo.themes = [sparse_theme_name] as any;
      foo.go('c');
      expect( () => foo.style_for('a') ).not.toThrow();
      expect(foo.style_for('a').backgroundColor).toBe('yellow');
    });

    test('omitted .end sub-style is skipped for an end state', () => {
      const foo = sm`start_states: [a]; end_states: [b]; a -> b;`;
      foo.themes = [sparse_theme_name] as any;
      expect( () => foo.style_for('b') ).not.toThrow();
      expect(foo.style_for('b').backgroundColor).toBe('darkolivegreen');
    });

    test('omitted .terminal sub-style is skipped for a terminal state', () => {
      // 'b' has no outbound edges and is not declared an end state, so it is
      // terminal.
      const foo = sm`start_states: [a]; a -> b;`;
      foo.themes = [sparse_theme_name] as any;
      expect( () => foo.style_for('b') ).not.toThrow();
      expect(foo.style_for('b').backgroundColor).toBe('crimson');
    });

    test('omitted .active sub-style is skipped for the active state', () => {
      const foo = sm`start_states: [a]; a -> b -> c;`;
      foo.themes = [sparse_theme_name] as any;
      foo.go('b');
      // 'b' is the current (active) state; the sparse theme contributes no
      // .active layer.
      expect( () => foo.style_for('b') ).not.toThrow();
      expect(foo.style_for('b').backgroundColor).toBe('dodgerblue4');
    });

  });

});
