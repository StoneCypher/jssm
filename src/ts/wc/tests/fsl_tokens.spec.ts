import { describe, it, expect } from 'vitest';
import { fslTokens } from '../fsl_tokens.js';

const css = fslTokens.cssText;

describe('fslTokens appearance contract', () => {
  it('maps each public token through a fallback', () => {
    for (const t of ['--fsl-color-surface', '--fsl-color-text', '--fsl-color-accent',
                     '--fsl-color-border', '--fsl-color-muted', '--fsl-font',
                     '--fsl-font-mono', '--fsl-radius']) {
      expect(css).toContain(`var(${t},`);
    }
  });

  it('provides dark-theme defaults under [theme="dark"]', () => {
    expect(css).toMatch(/:host\(\[theme="dark"\]\)/);
    expect(css).toContain('#1e1e22');   // dark surface default
  });

  it('exposes private resolved vars for components to consume', () => {
    for (const v of ['--_fsl-surface', '--_fsl-text', '--_fsl-accent', '--_fsl-radius']) {
      expect(css).toContain(v);
    }
  });
});
