import { describe, it, expect } from 'vitest';
import { sm } from '../jssm';
import { find_differentiating_trace } from '../jssm_pick';

describe('jssm_pick', () => {
  it('should return null for identical machines', () => {
    const m1 = sm`a 'next' -> b;`;
    const m2 = sm`a 'next' -> b;`;
    expect(find_differentiating_trace([m1, m2])).toBeNull();
  });

  it('should find the difference in a basic branching path', () => {
    const m1 = sm`
      a 'next' -> b;
      b 'finish' -> c;
    `;
    const m2 = sm`
      a 'next' -> b;
      b 'cancel' -> d;
    `;
    
    const result = find_differentiating_trace([m1, m2]);
    expect(result).not.toBeNull();
    
    // The divergence happens at state 'b'. Both machines can reach 'b' via 'next'.
    // Then m1 allows 'finish', but m2 does not.
    expect(result?.trace).toEqual(['next', 'finish']);
  });

  it('should find divergence when one allows an extra action', () => {
    const m1 = sm`a 'next' -> b 'finish' -> c; b 'cancel' -> d;`;
    const m2 = sm`a 'next' -> b 'finish' -> c;`; // missing cancel

    const result = find_differentiating_trace([m1, m2]);
    expect(result).not.toBeNull();
    expect(result?.trace).toEqual(['next', 'cancel']);
  });
});
