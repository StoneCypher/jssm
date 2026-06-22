import type { ConversionResult, ExportFormat } from '../interchange/types';
import { EXPORT_IMPLEMENTED, InterchangeError } from '../interchange/types';
import { fslToModel } from '../interchange/fsl-bridge';
import { modelToJson } from '../interchange/formats/json';
import { modelToMermaid } from '../interchange/formats/mermaid';

/** Options accepted by {@link exportMachine}. */
export interface ExportOptions {
  /** The interchange format to produce. */
  format: ExportFormat;
}

/** Every format name `export` recognizes (implemented or documented opt-in). */
const KNOWN_FORMATS: ReadonlySet<string> = new Set<ExportFormat>([
  'json', 'mermaid', 'scxml', 'xstate', 'dot',
  'tla+', 'alloy', 'smv', 'promela', 'gbnf', 'lark', 'ebnf',
]);

/**
 * Convert FSL source to an interchange format (megaspec §25's `export`).
 *
 * `export` is for **tool interchange** — handing an FSL machine to another
 * state-machine tool, a formal-methods checker, or a constrained-decoding
 * grammar consumer. It is not a code generator (`codegen` emits an
 * implementation) and not an image renderer (`render` does that).
 *
 * Implemented in this phase: `json` (lossless) and `mermaid` (lossy — folds
 * arrow kinds). The remaining §25 targets (SCXML, xstate, dot, the
 * formal-methods bridges `tla+`/`alloy`/`smv`/`promela`, and the grammar
 * artifacts `gbnf`/`lark`/`ebnf`) are recognized but raise an `unsupported`
 * {@link InterchangeError} until their own phase lands — so the flag surface
 * is discoverable and stable now.
 *
 * @param fsl - FSL source text
 * @param opts.format - The target interchange format
 * @returns The produced text plus any fidelity notes (`lossy`)
 * @throws InterchangeError (reason `'parse'`) if the FSL fails to compile
 * @throws InterchangeError (reason `'unknown-format'`) for an unrecognized format
 * @throws InterchangeError (reason `'unsupported'`) for a known-but-pending format
 *
 * @example
 *   const { output } = exportMachine("a -> b;", { format: 'json' });
 *   // output is a JSON document describing states ['a','b'] and one edge
 *
 * @example
 *   exportMachine("a -> b;", { format: 'scxml' });
 *   // throws InterchangeError { reason: 'unsupported' }
 */
export function exportMachine(fsl: string, opts: ExportOptions): ConversionResult {
  const { format } = opts;

  if (!KNOWN_FORMATS.has(format)) {
    throw new InterchangeError(`unknown export format: ${format}`, { reason: 'unknown-format', format });
  }
  if (!EXPORT_IMPLEMENTED.has(format)) {
    throw new InterchangeError(
      `export to '${format}' is a documented opt-in not yet implemented (megaspec §25)`,
      { reason: 'unsupported', format },
    );
  }

  const model = fslToModel(fsl);

  // Past the guards above, `format` is provably one of the implemented set
  // {json, mermaid} — so this two-way branch is total with no dead arm.
  if (format === 'json') {
    return { output: modelToJson(model), lossy: [] };
  }

  const lossy: string[] = [];
  if (model.edges.some((e) => e.kind !== 'legal')) {
    lossy.push("mermaid has no arrow-kind distinction; 'main' and 'forced' edges export as plain transitions");
  }
  return { output: modelToMermaid(model), lossy };
}
