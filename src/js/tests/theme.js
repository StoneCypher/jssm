
import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.cjs.js'),
      sm   = jssm.sm;

const NamedThemes = ["default", "ocean", "none", "modern"];





describe('Named themes', async it => {

  NamedThemes.map(thisTheme =>
    it(`Theme "${thisTheme}" parses as a theme`, t =>
      t.notThrows( () => { const _foo = sm`theme: ${thisTheme}; a-> b;`; }) ) );

  NamedThemes.map(thisTheme =>
    it(`Theme "${thisTheme}" shows correct theme`, t =>
      t.is( thisTheme, sm`theme: ${thisTheme}; a-> b;`.theme() ) ) );

  it('Fake theme throws', t =>
    t.throws( () => { const _foo = sm`theme: zeghezgqqqqthirteen; a-> b;`; }) );

});
