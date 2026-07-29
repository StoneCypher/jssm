import type { ConversionResult, ImportFormat, InterchangeModel } from '../interchange/types';
import { IMPORT_IMPLEMENTED, InterchangeError } from '../interchange/types';
import { modelToFsl } from '../interchange/fsl-bridge';
import { jsonToModel } from '../interchange/formats/json';
import { mermaidToModel } from '../interchange/formats/mermaid';

/** Options accepted by {@link importMachine}. */
export interface ImportOptions {
  /** The interchange format the input is written in. */
  format: ImportFormat;
}

/** Every format name `import` recognizes (implemented or documented opt-in). */
const KNOWN_FORMATS: ReadonlySet<string> = new Set<ImportFormat>([
  'json', 'mermaid', 'scxml', 'xstate', 'dot',
]);

/**
 * Convert an interchange format into FSL (megaspec §25's `import`).
 *
 * `import` is for **tool interchange** — bringing a machine *from* another
 * tool's format *into* FSL. It is emphatically **not a package fetcher**:
 * fetching a machine by name from a registry is a separate concern and never
 * `import`'s job (megaspec §25, verb-boundaries note).
 *
 * Implemented in this phase: `json` (lossless inverse of `export json`) and
 * `mermaid` (lossy — mermaid carries no arrow kind, so every transition
 * imports as a `legal` `->` edge, reported in `lossy`). The remaining §25
 * sources (`scxml`, `xstate`, `dot`) are recognized but raise an `unsupported`
 * {@link InterchangeError} until their phase lands.
 * @param source - The interchange-format source text
 * @param opts.format - The format `source` is written in
 * @returns The produced FSL plus any fidelity notes (`lossy`)
 * @throws InterchangeError (reason `'parse'`) if the source fails to parse
 * @throws InterchangeError (reason `'unknown-format'`) for an unrecognized format
 * @throws InterchangeError (reason `'unsupported'`) for a known-but-pending format
 * @example
 *   const { output } = importMachine('stateDiagram-v2\n  s0 --> s1', { format: 'mermaid' });
 *   // output is FSL: '"s0" -> "s1";\n'
 * @example
 *   importMachine('<scxml/>', { format: 'scxml' });
 *   // throws InterchangeError { reason: 'unsupported' }
 */
export function importMachine(source: string, opts: ImportOptions): ConversionResult {
  const { format } = opts;

  if (!KNOWN_FORMATS.has(format)) {
    throw new InterchangeError(`unknown import format: ${format}`, { reason: 'unknown-format', format });
  }
  if (!IMPORT_IMPLEMENTED.has(format)) {
    throw new InterchangeError(
      `import from '${format}' is a documented opt-in not yet implemented (megaspec §25)`,
      { reason: 'unsupported', format },
    );
  }

  let model: InterchangeModel;
  const lossy: string[] = [];

  // Past the guards, `format` is provably one of {json, mermaid}.
  if (format === 'json') {
    model = jsonToModel(source);
  } else {
    model = mermaidToModel(source);
    if (model.edges.length > 0) {
      lossy.push("mermaid carries no arrow kind; all transitions imported as legal '->' edges");
    }
  }

  const { fsl, isolatedStates } = modelToFsl(model);
  if (isolatedStates.length > 0) {
    lossy.push(
      `FSL cannot declare edgeless states; materialized as self-loops: ${isolatedStates.join(', ')}`,
    );
  }

  return { output: fsl, lossy };
}
