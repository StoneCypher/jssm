
const jssm = require('../jssm');





describe('weighted_histo_key/2', () => {

  const fruit = [ { label: 'apple',  probability: 0.1 },
                  { label: 'orange', probability: 0.4 },
                  { label: 'banana', probability: 0.5 } ];

  const out = jssm.weighted_histo_key(10000, fruit, 'probability', 'label');

  test('produces a well formed probability map', () =>
    expect([... out.keys()].length).toBe(3)
  );

});

// stochable
