import { codegen } from '../../cli/subcommands/codegen/codegen';
import { codegenSet } from '../../cli/subcommands/codegen/codegenSet';
import { CodegenError, CodegenUndecidedError } from '../../cli/codegen-types';

const turnstile = "Locked 'coin' -> Unlocked 'push' -> Locked;";

describe('codegen', () => {

  it('generates a TypeScript artifact for native:typescript', () => {
    const art = codegen(turnstile, { target: 'native:typescript', name: 'Gate' });
    expect(art.target).toBe('native:typescript');
    expect(art.host).toBe('typescript');
    expect(art.extension).toBe('ts');
    expect(art.symbol).toBe('Gate');
    expect(art.content).toContain('export class Gate');
  });

  it('generates a JavaScript artifact for native:javascript', () => {
    const art = codegen(turnstile, { target: 'native:javascript' });
    expect(art.host).toBe('javascript');
    expect(art.extension).toBe('js');
    expect(art.symbol).toBe('Machine'); // default fallback name
    expect(art.content).toContain('export class Machine');
  });

  it('derives a PascalCase symbol from the --name value', () => {
    const art = codegen(turnstile, { target: 'native:javascript', name: 'my-gate' });
    expect(art.symbol).toBe('MyGate');
  });

  it('throws CodegenError for an unknown target', () => {
    // @ts-expect-error exercising the runtime guard
    expect(() => codegen(turnstile, { target: 'native:rust' })).toThrow(/unknown target/i);
  });

  it('throws CodegenError when the FSL fails to compile', () => {
    expect(() => codegen('not valid fsl !!', { target: 'native:typescript' })).toThrow(CodegenError);
  });

  it('refuses --certify as undecided (gated on the runtime)', () => {
    expect(() => codegen(turnstile, { target: 'native:typescript', certify: true }))
      .toThrow(CodegenUndecidedError);
  });

  it('accepts a generous budget and still generates', () => {
    const art = codegen(turnstile, { target: 'native:javascript', budgetMs: 60_000 });
    expect(art.content).toContain('export class Machine');
  });

  it('treats budgetMs of 0 as unbounded', () => {
    const art = codegen(turnstile, { target: 'native:javascript', budgetMs: 0 });
    expect(art.content).toContain('export class Machine');
  });

  it('reports undecided when the budget is exceeded', () => {
    // Deterministic via the injected clock seam: the clock advances 5ms
    // between the start stamp and the post-extract budget check, exceeding a
    // 1ms budget regardless of real wall-clock speed. (The prior version
    // relied on real compilation taking >1ms, which is flaky on fast hosts.)
    let t = 0;
    const now = () => { const v = t; t += 5; return v; };
    expect(() => codegen(turnstile, { target: 'native:javascript', budgetMs: 1, now }))
      .toThrow(/exceeded budget/i);
  });

});

describe('codegenSet', () => {

  it('generates one artifact per input, in order', () => {
    const results = codegenSet([turnstile, "a 'go' -> b;"], { target: 'native:javascript' });
    expect(results).toHaveLength(2);
    expect(results[0].ok).toBe(true);
    expect(results[1].ok).toBe(true);
    if (results[0].ok) expect(results[0].artifact.host).toBe('javascript');
  });

  it('captures per-input errors without aborting the batch', () => {
    const results = codegenSet([turnstile, 'not valid', "a 'go' -> b;"], { target: 'native:typescript' });
    expect(results[0].ok).toBe(true);
    expect(results[1].ok).toBe(false);
    expect(results[2].ok).toBe(true);
    if (!results[1].ok) expect(results[1].error).toBeInstanceOf(CodegenError);
  });

  it('returns an empty array for empty input', () => {
    expect(codegenSet([], { target: 'native:javascript' })).toEqual([]);
  });

});
