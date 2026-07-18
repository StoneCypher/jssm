import { describe, it, expect } from 'vitest';
import { sm } from '../jssm';

describe('editor: {} config block (fsl#1334)', () => {

  it('exposes both keys via editor_config()', () => {
    const m = sm`editor: { stochastic_run_count: 100000; panels: [simulation history]; }; a 'go' -> b;`;
    expect(m.editor_config()).toEqual({ stochastic_run_count: 100_000, panels: ['simulation', 'history'] });
  });

  it('parses a panels-only block', () => {
    expect(sm`editor: { panels: [history]; }; a -> b;`.editor_config())
      .toEqual({ panels: ['history'] });
  });

  it('parses a run-count-only block', () => {
    expect(sm`editor: { stochastic_run_count: 42; }; a -> b;`.editor_config())
      .toEqual({ stochastic_run_count: 42 });
  });

  it('returns undefined when no editor block is present', () => {
    expect(sm`a -> b;`.editor_config()).toBeUndefined();
  });

  it('rejects an unknown key inside the block (strict whitelist)', () => {
    expect(() => sm`editor: { panles: [a]; }; a -> b;`).toThrow();
  });

});
