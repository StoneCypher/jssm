
import { sm } from '../jssm';





const testdata = [
  'a -> b;',
  'a-> b;',
  'a ->b;',
  'a->b;',
  'a ~> b;',
  'a => b;',
  'a <- b;',
  'a <-> b;',
  'a -> b -> c;',
  'a -> b -> a;',
  'flow: right; a -> b -> c -> d -> a;'
];

const host = sm`x -> y;`;





describe(`Embedded sm parses the same as regular sm, ${testdata.length} items`, () => {

  for (const code of testdata) {

    const a = sm`${code}`,
          b = host.sm`${code}`;

    // they will legitimately vary because the RNG seed is clock-set.
    // manually suppress that difference
    a.rng_seed = 1;
    b.rng_seed = 1;


    test(`Self-match of \`${code}\``, () => {

      expect( String(a) )
        .toStrictEqual( String(b) );

    });

  }

});





test.todo('Boy is this embedded sm matching thing ever a candidate for stochastics');
// stochable
