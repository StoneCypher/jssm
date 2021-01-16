
const jssm = require('../jssm'),
      sm   = jssm.sm;





describe('weighted_sample_select/1', () => {

  test.todo('wow is this hard to meaningfully test');
  it('(0) generates []', () =>
    expect( jssm.weighted_sample_select(0, [{item:'a',probability:2},{item:'a',probability:3}]) )
      .toEqual( [] )
  );



  describe('has reasonable unweighted distribution', () => {

    const unweighted = new jssm.Machine({

      start_states: ['a'],

      transitions: [

        { from: 'a', to: 'b' },
        { from: 'a', to: 'c' },

        { from: 'b', to: 'a' },
        { from: 'b', to: 'c' },

        { from: 'c', to: 'a' },
        { from: 'c', to: 'b' }

      ]

    });

    const res = unweighted.probabilistic_histo_walk(1500);

    // statistically each should be around 500.  raise alarms if they aren't 300.
    test('a expects 500 requires 300', () =>
      expect(res.get('a') >= 300)
        .toBe(true) );

    test('b expects 500 requires 300', () =>
      expect(res.get('b') >= 300)
        .toBe(true) );

    test('c expects 500 requires 300', () =>
      expect(res.get('c') >= 300)
        .toBe(true) );

  });



  describe('has reasonable weighted distribution', () => {

    const weighted = new jssm.Machine({

      start_states: ['a'],

      transitions: [

        { from: 'a', to: 'b', probability: 0.5 },
        { from: 'a', to: 'c', probability: 4 },
        { from: 'a', to: 'd', probability: 0.5 },
        { from: 'a', to: 'e', probability: 0.5 },

        { from: 'b', to: 'a', probability: 0.5 },
        { from: 'b', to: 'c', probability: 4 },
        { from: 'b', to: 'd', probability: 0.5 },
        { from: 'b', to: 'e', probability: 0.5 },

        { from: 'c', to: 'a', probability: 0.5 },
        { from: 'c', to: 'b', probability: 0.5 },
        { from: 'c', to: 'd', probability: 0.5 },
        { from: 'c', to: 'e', probability: 0.5 },

        { from: 'd', to: 'a', probability: 0.5 },
        { from: 'd', to: 'b', probability: 0.5 },
        { from: 'd', to: 'c', probability: 4 },
        { from: 'd', to: 'e', probability: 0.5 },

        { from: 'e', to: 'a', probability: 0.5 },
        { from: 'e', to: 'b', probability: 0.5 },
        { from: 'e', to: 'c', probability: 4 },
        { from: 'e', to: 'd', probability: 0.5 }

      ]

    });

    const res = weighted.probabilistic_histo_walk(2500);

    // statistically each should be around 375, or 1050 for c.  raise alarms if they aren't 250, or 800 for c.
    test('a expects 375 requires 250',  () =>
      expect(res.get('a') >= 250)
        .toBe(true) );

    test('b expects 375 requires 250',  () =>
      expect(res.get('b') >= 250)
        .toBe(true) );

    test('c expects 1050 requires 800', () =>
      expect(res.get('c') >= 800)
        .toBe(true) );

    test('d expects 375 requires 250',  () =>
      expect(res.get('c') >= 250)
        .toBe(true) );

    test('e expects 375 requires 250',  () =>
      expect(res.get('c') >= 250)
        .toBe(true) );

  });





  describe('has reasonable weighted distribution in DSL', () => {

    const weighted = sm`
      a 0.5% -> [b d e];
      b 0.5% -> [a d e];
      c 0.5% -> [a b d e];
      d 0.5% -> [a b e];
      [a b d] <- 0.5% e;
      [a b d e] 4% -> c;
    `;

    const res = weighted.probabilistic_histo_walk(2500);

    // statistically each should be around 375, or 1050 for c.  raise alarms if they aren't 250, or 800 for c.
    test('a expects 375 requires 250',  () =>
      expect(res.get('a') >= 250)
        .toBe(true) );

    test('b expects 375 requires 250',  () =>
      expect(res.get('b') >= 250)
        .toBe(true) );

    test('c expects 1050 requires 800', () =>
      expect(res.get('c') >= 800)
        .toBe(true) );

    test('d expects 375 requires 250',  () =>
      expect(res.get('c') >= 250)
        .toBe(true) );

    test('e expects 375 requires 250',  () =>
      expect(res.get('c') >= 250)
        .toBe(true) );

  });

  // stochastics would help, eg "every returned item is a member" and "in a
  // sufficient list any positive sample size is reasonable" and "always
  // returns the right sample size" - whargarbl todo


});





// stochable
