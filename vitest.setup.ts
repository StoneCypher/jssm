
/**
 * Vitest setup file.
 *
 * Provides a `jest` global compatible with the subset of the Jest API the
 * legacy spec suite uses (`jest.fn`).  This lets existing `*.spec.ts` files
 * keep referring to `jest.fn(...)` without modification while running under
 * vitest.
 */

import { vi } from 'vitest';

if (typeof (globalThis as any).jest === 'undefined') {
  (globalThis as any).jest = vi;
}
