
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { carryingSources, median, collectCarrying, injectCarryingRows } = require('../benchmark_scaling_carrying.cjs');



describe('carryingSources', () => {

  test('variants add ONLY the unused declaration on the identical chain', () => {
    const s = carryingSources(3);
    expect(s.plain).toBe('s0 -> s1;\ns1 -> s2;');
    expect(s.groups).toBe(`&Unused: [s0 s1];\n${s.plain}`);
    expect(s.property).toBe(`property pcarry default "x";\n${s.plain}`);
  });

  test('rejects chains too short to carry an edge', () => {
    expect(() => carryingSources(1)).toThrow(/n must be an integer >= 2/);
    expect(() => carryingSources(2.5)).toThrow(/n must be an integer >= 2/);
  });

});



describe('collectCarrying', () => {

  test('returns [] gracefully when the GC is not exposed', () => {
    const rows = collectCarrying(() => ({}), [10], { gc: null, heapUsed: () => 0 });
    expect(rows).toEqual([]);
  });

  test('computes variant-minus-plain deltas through a deterministic seam (k=1)', () => {
    // heapUsed sequence per measureRetainedBytes call: base, after.  Feed a
    // fixed schedule: plain retains 100, groups 160, property 130.  The three
    // warmup constructions consume no seam reads.
    const reads = [0, 100,   0, 160,   0, 130];
    let i = 0;
    let built = 0;
    const seam = { gc: () => {}, heapUsed: () => reads[i++] };
    const rows = collectCarrying(() => { built += 1; return { a: 1 }; }, [10], seam, 1);
    expect(rows.length).toBe(2);
    expect(rows[0]).toEqual({ name: 'carrying groups n=10',   deltaBytes: 60, variantBytes: 160, plainBytes: 100, samples: 1 });
    expect(rows[1]).toEqual({ name: 'carrying property n=10', deltaBytes: 30, variantBytes: 130, plainBytes: 100, samples: 1 });
    expect(built).toBe(6);   // 3 warmups + 3 measured constructions
  });

  test('a single GC hiccup cannot set the row: medians over k samples', () => {
    // k=3 per variant; plain samples 100,100,100; groups 160,9999,160 (one
    // hiccup); property 130,130,130 -> medians land as if the run were clean.
    const retained = [100, 100, 100,   160, 9999, 160,   130, 130, 130];
    const reads: number[] = [];
    for (const r of retained) { reads.push(0, r); }
    let i = 0;
    const seam = { gc: () => {}, heapUsed: () => reads[i++] };
    const rows = collectCarrying(() => ({ a: 1 }), [10], seam, 3);
    expect(rows[0].variantBytes).toBe(160);
    expect(rows[0].deltaBytes).toBe(60);
    expect(rows[1].variantBytes).toBe(130);
  });

  test('median handles odd and even counts', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });

  test('the real FSL variants actually construct (smoke, sizes small)', async () => {
    // library SOURCE, not dist: the ci-lite CI profile cleans dist/ and does
    // not rebuild the es5 core bundle, so a dist require breaks every matrix
    // leg; the assertion here is only that the variant FSL sources are valid
    const jssm = await import('../../ts/jssm');
    const s = carryingSources(4);
    for (const src of [s.plain, s.groups, s.property]) {
      const m = jssm.sm([src] as unknown as TemplateStringsArray);
      expect(m.state()).toBe('s0');
    }
  });

});



describe('injectCarryingRows', () => {

  test('appends rows additively and leaves existing rows untouched', () => {
    const data = { results: [ { name: 'existing', ops: 1 } ] };
    injectCarryingRows(data, [ { name: 'carrying groups n=10', deltaBytes: 5, variantBytes: 6, plainBytes: 1 } ]);
    expect(data.results.length).toBe(2);
    expect(data.results[0]).toEqual({ name: 'existing', ops: 1 });
    expect(data.results[1].name).toBe('carrying groups n=10');
  });

  test('an empty row set changes nothing', () => {
    const data = { results: [ { name: 'existing', ops: 1 } ] };
    injectCarryingRows(data, []);
    expect(data.results.length).toBe(1);
  });

});
