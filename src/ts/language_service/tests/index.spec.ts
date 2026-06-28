import { describe, it, expect } from 'vitest';
import * as ls from '../index.js';

describe('language_service barrel', () => {
  it('re-exports the three service functions', () => {
    expect(typeof ls.fslDiagnostics).toBe('function');
    expect(typeof ls.fslCompletions).toBe('function');
    expect(typeof ls.fslSemanticSpans).toBe('function');
  });
});
