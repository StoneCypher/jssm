import type { CodegenOptions, CodegenArtifact } from '../../codegen-types';
import { CodegenError, CodegenUndecidedError } from '../../codegen-types';
import { extractSurface } from './surface';
import { toSymbol } from './emit-utils';
import { emitNativeTypescript } from './targets/native-typescript';
import { emitNativeJavascript } from './targets/native-javascript';

/** Per-target metadata: host family + conventional file extension. */
const TARGET_META: Record<CodegenOptions['target'], { host: string; extension: string }> = {
  'native:typescript': { host: 'typescript', extension: 'ts' },
  'native:javascript': { host: 'javascript', extension: 'js' },
};

/**
 * Generate executable host source from a single FSL document.
 *
 * Emits an *implementation* of the machine for the requested `host:library`
 * target — distinct from `render` (images) and `typegen` (declarations). The
 * `native:*` targets emit a self-contained class with no runtime dependency.
 *
 * @param fsl - FSL source text
 * @param opts.target - The `host:library` target coordinate
 * @param opts.name - Symbol name for the generated class (defaults to `Machine`)
 * @param opts.certify - Run conformance before returning (gated; see below)
 * @param opts.budgetMs - Soft work budget in ms; 0/omitted means unbounded
 * @param opts.now - Clock for the budget check (test seam; defaults to Date.now)
 * @returns The generated {@link CodegenArtifact}
 * @throws CodegenError if the FSL fails to compile or the target is unknown
 * @throws CodegenUndecidedError if `certify` is requested (conformance harness
 *   is gated on the runtime landing, §25 verb phasing) or the budget is exhausted
 *
 * @example
 *   const art = codegen("a 'go' -> b;", { target: 'native:typescript' });
 *   // art.extension === 'ts'
 *   // art.content contains "export class Machine"
 */
export function codegen(fsl: string, opts: CodegenOptions): CodegenArtifact {
  const meta = TARGET_META[opts.target];
  if (meta === undefined) {
    throw new CodegenError(`unknown target: ${String(opts.target)}`);
  }

  if (opts.certify) {
    throw new CodegenUndecidedError(
      `--certify is not available for ${opts.target} in this build: ` +
      `the conformance harness is gated on the certified runtime (megaspec §26)`,
    );
  }

  const clock     = opts.now ?? Date.now;
  const startedAt = clock();
  const surface   = extractSurface(fsl);

  if (opts.budgetMs !== undefined && opts.budgetMs > 0 && clock() - startedAt > opts.budgetMs) {
    throw new CodegenUndecidedError(`codegen exceeded budget of ${opts.budgetMs}ms`);
  }

  const symbol  = toSymbol(opts.name ?? '', 'Machine');
  const content = opts.target === 'native:typescript'
    ? emitNativeTypescript(surface, symbol)
    : emitNativeJavascript(surface, symbol);

  return {
    target:    opts.target,
    host:      meta.host,
    extension: meta.extension,
    content,
    symbol,
  };
}
