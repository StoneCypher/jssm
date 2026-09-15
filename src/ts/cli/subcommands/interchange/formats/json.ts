import type { InterchangeModel, InterchangeEdge } from '../types';
import { InterchangeError } from '../types';

/**
 * The JSON interchange format is a direct, lossless serialization of the
 * {@link InterchangeModel}: the model *is* the wire shape. Because it carries
 * exactly the structural surface FSL export reads — states, typed edges,
 * start states — an FSL → JSON → FSL round-trip reproduces the original
 * machine's structure with zero loss. It is the reference format the other
 * (lossy) exporters are measured against.
 */

/** The on-disk JSON document shape. A thin envelope around the model. */
interface JsonDocument {
  /** Format discriminator; lets a reader reject a foreign JSON file early. */
  format: 'fsl-interchange';
  /** Schema version of this envelope, for forward compatibility. */
  version: 1;
  states: string[];
  edges: InterchangeEdge[];
  start_states?: string[];
}

/**
 * Serialize an {@link InterchangeModel} to pretty-printed interchange JSON.
 * @param model - The structural model to encode
 * @returns A two-space-indented JSON document string, newline-terminated
 * @example
 *   modelToJson({ states: ['a','b'], edges: [{from:'a',to:'b',kind:'legal'}] });
 *   // '{\n  "format": "fsl-interchange",\n  ... }\n'
 */
export function modelToJson(model: InterchangeModel): string {
  const doc: JsonDocument = {
    format:  'fsl-interchange',
    version: 1,
    states:  model.states,
    edges:   model.edges,
  };
  if (model.start_states !== undefined) {
    doc.start_states = model.start_states;
  }
  return JSON.stringify(doc, null, 2) + '\n';
}

const VALID_KINDS: ReadonlySet<string> = new Set(['legal', 'main', 'forced']);

/**
 * Parse an interchange JSON document back into an {@link InterchangeModel}.
 *
 * Validates structurally — every edge must name string `from`/`to` and a known
 * `kind` — so a malformed or foreign document fails loudly rather than
 * producing a half-built model.
 * @param text - The JSON document text
 * @returns The decoded structural model
 * @throws InterchangeError (reason `'parse'`) on invalid JSON or shape
 * @example
 *   jsonToModel('{"format":"fsl-interchange","version":1,"states":["a"],"edges":[]}');
 *   // { states: ['a'], edges: [] }
 */
export function jsonToModel(text: string): InterchangeModel {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new InterchangeError(`invalid JSON: ${(error as Error).message}`, { reason: 'parse', format: 'json' });
  }

  if (typeof raw !== 'object' || raw === null) {
    throw new InterchangeError('JSON document must be an object', { reason: 'parse', format: 'json' });
  }
  const doc = raw as Record<string, unknown>;

  if (!Array.isArray(doc.states) || doc.states.some((s) => typeof s !== 'string')) {
    throw new InterchangeError('JSON `states` must be an array of strings', { reason: 'parse', format: 'json' });
  }
  if (!Array.isArray(doc.edges)) {
    throw new InterchangeError('JSON `edges` must be an array', { reason: 'parse', format: 'json' });
  }

  const edges: InterchangeEdge[] = doc.edges.map((e, i) => {
    if (typeof e !== 'object' || e === null) {
      throw new InterchangeError(`JSON edge ${i} must be an object`, { reason: 'parse', format: 'json' });
    }
    const edge = e as Record<string, unknown>;
    if (typeof edge.from !== 'string' || typeof edge.to !== 'string') {
      throw new InterchangeError(`JSON edge ${i} requires string \`from\` and \`to\``, { reason: 'parse', format: 'json' });
    }
    if (typeof edge.kind !== 'string' || !VALID_KINDS.has(edge.kind)) {
      throw new InterchangeError(`JSON edge ${i} \`kind\` must be one of legal, main, forced`, { reason: 'parse', format: 'json' });
    }
    const out: InterchangeEdge = { from: edge.from, to: edge.to, kind: edge.kind as InterchangeEdge['kind'] };
    if (edge.action !== undefined) {
      if (typeof edge.action !== 'string') {
        throw new InterchangeError(`JSON edge ${i} \`action\` must be a string`, { reason: 'parse', format: 'json' });
      }
      out.action = edge.action;
    }
    return out;
  });

  const model: InterchangeModel = { states: doc.states, edges };
  if (Array.isArray(doc.start_states) && doc.start_states.every((s) => typeof s === 'string')) {
    model.start_states = doc.start_states;
  }
  return model;
}
