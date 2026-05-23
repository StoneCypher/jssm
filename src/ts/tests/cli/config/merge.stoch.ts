import * as fc from 'fast-check';
import { mergeConfigs } from '../../../cli/config/merge';
import type { PartialConfig } from '../../../cli/config/types';

// Generator: random plausible PartialConfig.
const arbConfig = (): fc.Arbitrary<PartialConfig> =>
  fc.record({
    include:  fc.option(fc.array(fc.string(), { maxLength: 5 }), { nil: undefined }),
    exclude:  fc.option(fc.array(fc.string(), { maxLength: 5 }), { nil: undefined }),
    render:   fc.option(fc.record({
      defaultTarget: fc.option(fc.constantFrom('svg', 'dot', 'png', 'jpeg', 'html') as fc.Arbitrary<'svg' | 'dot' | 'png' | 'jpeg' | 'html'>, { nil: undefined }),
      scale: fc.option(fc.integer({ min: 1, max: 10 }), { nil: undefined }),
      quality: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
      outDir: fc.option(fc.string(), { nil: undefined }),
    }, { requiredKeys: [] }), { nil: undefined }),
  }, { requiredKeys: [] }) as fc.Arbitrary<PartialConfig>;

describe('mergeConfigs — algebraic invariants', () => {

  it('identity: merging a single layer equals that layer', () => {
    fc.assert(fc.property(arbConfig(), (x) => {
      expect(mergeConfigs([x])).toEqual(x);
    }), { numRuns: 200 });
  });

  it('idempotent on equal layers: merge([x, x]) deep-equals x', () => {
    fc.assert(fc.property(arbConfig(), (x) => {
      expect(mergeConfigs([x, x])).toEqual(x);
    }), { numRuns: 200 });
  });

  it('right-bias on scalar leaves: merge([{render:{scale:a}}, {render:{scale:b}}]).render.scale === b', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 10 }), fc.integer({ min: 1, max: 10 }), (a, b) => {
      const merged = mergeConfigs([
        { render: { scale: a } },
        { render: { scale: b } },
      ]);
      expect(merged.render?.scale).toBe(b);
    }), { numRuns: 200 });
  });

  it('associativity: merge([a,b,c]) deep-equals merge([merge([a,b]), c])', () => {
    fc.assert(fc.property(arbConfig(), arbConfig(), arbConfig(), (a, b, c) => {
      const left = mergeConfigs([a, b, c]);
      const right = mergeConfigs([mergeConfigs([a, b]), c]);
      expect(left).toEqual(right);
    }), { numRuns: 200 });
  });

});
