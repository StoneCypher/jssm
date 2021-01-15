
import { Themes } from './constants.spec';

const jssm = require('../../../build/jssm.es5.cjs.js'),
      sm   = jssm.sm;





describe('Named themes', () => {

  Themes.map(thisTheme =>
    it(`Theme "${thisTheme}" parses as a theme`, () =>
      expect( () => { const _foo = sm`theme: ${thisTheme}; a-> b;`; }).not.toThrow() ) );

  Themes.map(thisTheme =>
    it(`Theme "${thisTheme}" shows correct theme`, () =>
      expect( sm`theme: ${thisTheme}; a-> b;`.theme() ).toBe(thisTheme) ) );

  it('Fake theme throws', () =>
    expect( () => { const _foo = sm`theme: zeghezgqqqqthirteen; a-> b;`; }).toThrow() );

});
