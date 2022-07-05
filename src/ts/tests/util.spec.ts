
import { seq, make_mulberry_rand } from '../jssm_util';





describe('make_mulberry_rand', () => {

  seq(3).map(n =>

    test(`Seed ${n} - Generates 500 numbers [0,1)`, () => {
      const rnd  = make_mulberry_rand(n);
      let   fail = false;
      seq(500).forEach(_ => {
        const r = rnd();
        if (typeof r !== 'number') { fail = true; }
        if (r < 0)                 { fail = true; }
        if (r >= 1)                { fail = true; }
      });
      expect(fail).toBe(false);
    })

  );

  const rnd = () => Math.floor(make_mulberry_rand( new Date().getTime() )() * Number.MAX_SAFE_INTEGER );

  [ rnd(), rnd(), rnd(), rnd(), rnd() ].map( n => {

    test(`Seed ${n} - Generates 500 numbers [0,1)`, () => {
      const rnd  = make_mulberry_rand(n);
      let   fail = false;
      seq(500).forEach(_ => {
        const r = rnd();
        if (typeof r !== 'number') { fail = true; }
        if (r < 0)                 { fail = true; }
        if (r >= 1)                { fail = true; }
      });
      expect(fail).toBe(false);
    });

  });

  test(`Seed undefined - Generates 500 numbers [0,1)`, () => {
    const rnd  = make_mulberry_rand();
    let   fail = false;
    seq(500).forEach(_ => {
      const r = rnd();
      if (typeof r !== 'number') { fail = true; }
      if (r < 0)                 { fail = true; }
      if (r >= 1)                { fail = true; }
    });
    expect(fail).toBe(false);
  });


});
