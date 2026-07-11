 

// The helper is pure (no imports of its own); inject the TS-source parse/compile.
import { diagnosticsFor } from '../../../sketch/cm6-editor/diagnostics.mjs';
import { parse }   from '../fsl_parser';
import { compile } from '../jssm_compiler';

const run = (src: string) => diagnosticsFor(src, parse, compile);

describe('diagnosticsFor', () => {

  test('clean machine yields no diagnostics', () => {
    const { diagnostics, ok } = run('a -> b;');
    expect(ok).toBe(true);
    expect(diagnostics).toEqual([]);
  });

  test('syntax error yields a positioned diagnostic', () => {
    const { diagnostics, ok } = run('a -> ;');   // missing target
    expect(ok).toBe(false);
    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0].severity).toBe('error');
    expect(typeof diagnostics[0].from).toBe('number');
    expect(diagnostics[0].to).toBeGreaterThan(diagnostics[0].from);
  });

  test('semantic error is positioned at the offending statement', () => {
    const src = 'fsl_version: 1.0.0;\nfsl_version: 2.0.0;\na -> b;';
    const { diagnostics, ok } = run(src);
    expect(ok).toBe(false);
    expect(diagnostics.length).toBe(1);
    const d = diagnostics[0];
    expect(src.slice(d.from, d.to)).toContain('fsl_version: 2.0.0;');
  });

});
