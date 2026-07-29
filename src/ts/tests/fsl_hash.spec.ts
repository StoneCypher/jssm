import { describe, it, expect } from 'vitest';
import { source_hash } from '../fsl_hash';

describe('source_hash (provisional)', () => {
  it('is deterministic and tagged', () => {
    expect(source_hash('a -> b;')).toBe(source_hash('a -> b;'));
    expect(source_hash('a -> b;')).toMatch(/^provisional:[0-9a-f]{16}$/);
  });
  it('differs for different sources', () => {
    expect(source_hash('a -> b;')).not.toBe(source_hash('a -> c;'));
  });
});
