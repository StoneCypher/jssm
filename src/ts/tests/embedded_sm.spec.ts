
const jssm = require('../jssm'),
      sm   = jssm.sm;





const testdata = [
  'a -> b;',
  'flow: right; a -> b -> c -> d -> a;'
];

const host = sm`x -> y;`;





describe('Embedded sm parses the same as regular sm', () => {

  testdata.map(code => {

    test('Self-match of `' + code + '`', () => {

      expect( sm`${code}` ).toEqual( host.sm`${code}` );

    });

  });

});

test.todo('Boy is this embedded sm matching thing ever a candidate for stochastics');
// stochable