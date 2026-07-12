/**
 * Ambient types for the globals the test harness installs at runtime.
 *
 * `vitest.setup.ts` assigns `globalThis.jest = vi` so the legacy spec suite can
 * keep calling `jest.fn(...)` under vitest.  That assignment is untyped, so
 * without this declaration every `jest.fn` call is a type error (TS2708) even
 * though it runs correctly.  Declaring it here lets `tsconfig.test.json`
 * type-check the suite without rewriting ~100 call sites.
 */

import type { vi } from 'vitest';

declare global {
  var jest: typeof vi;
}

export {};
