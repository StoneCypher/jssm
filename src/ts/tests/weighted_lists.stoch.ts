import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import * as jssm from '../jssm';

const list_target_probabilities = (m: any) =>
  m.list_edges().filter((e: any) => e.from === 'a').map((e: any) => e.probability);

describe('list weights — generative', () => {

  test('compiled list-target probabilities sum to the outer probability', () => {
    fc.assert(fc.property(
      fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 6 }),
      fc.integer({ min: 1, max: 100 }),
      (weights, outer) => {
        const names = weights.map((_, i) => `s${i}`);
        const list  = names.map((n, i) => `${n} ${weights[i]}%`).join(' ');
        const m     = jssm.sm`${`a ${outer}% -> [${list}]; [${names.join(' ')}] -> a;`}`;
        const total = m.list_edges().filter(e => e.from === 'a').reduce((acc, e) => acc + (e.probability ?? 0), 0);
        expect(Math.abs(total - outer)).toBeLessThan(1e-9);
      }
    ), { numRuns: 200 });
  });

  test('shares of an unweighted transition onto a weighted list sum to 1', () => {
    fc.assert(fc.property(
      fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 2, maxLength: 6 }),
      (weights) => {
        const names = weights.map((_, i) => `s${i}`);
        const list  = names.map((n, i) => `${n} ${weights[i]}%`).join(' ');
        const m     = jssm.sm`${`a -> [${list}]; [${names.join(' ')}] -> a;`}`;
        const total = m.list_edges().filter(e => e.from === 'a').reduce((acc, e) => acc + (e.share ?? 0), 0);
        expect(Math.abs(total - 1)).toBeLessThan(1e-9);
      }
    ), { numRuns: 200 });
  });

  test('a uniform list and an explicitly equal-weighted list compile identically', () => {
    fc.assert(fc.property(
      fc.integer({ min: 2, max: 6 }), fc.integer({ min: 1, max: 100 }),
      (n, outer) => {
        const names = Array.from({ length: n }, (_, i) => `s${i}`);
        const plain = jssm.sm`${`a ${outer}% -> [${names.join(' ')}]; [${names.join(' ')}] -> a;`}`;
        const equal = jssm.sm`${`a ${outer}% -> [${names.map(x => `${x} 5%`).join(' ')}]; [${names.join(' ')}] -> a;`}`;
        expect(list_target_probabilities(equal)).toEqual(list_target_probabilities(plain));
      }
    ), { numRuns: 100 });
  });

});
