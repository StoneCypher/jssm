import type { InterchangeModel, InterchangeEdge } from '../types';
import { InterchangeError } from '../types';

/**
 * Mermaid `stateDiagram-v2` interchange.
 *
 * Mermaid is a widely-supported diagram syntax (GitHub, GitLab, many docs
 * tools render it inline), which makes it a high-value interchange target.
 * Its state-diagram dialect carries states, directed transitions, and edge
 * labels — enough to express FSL's structural surface — but it has **no
 * notion of FSL's arrow *kinds*** (`legal` / `main` / `forced` are all just
 * `-->`). Export therefore folds every kind to a plain arrow and reports the
 * loss; import reads every arrow back as `legal`. The transition *label* (when
 * present) carries the action both ways, so action-bearing machines round-trip
 * their actions even though the arrow kind does not.
 */

/**
 * Escape a state name for use as a mermaid display label inside `s["..."]`.
 *
 * Mermaid uses bracketed quoted labels for names that are not bare
 * identifiers; the `"` is the only character that must be escaped inside one
 * (mermaid accepts `#quot;` as the entity). We always emit the quoted-label
 * form keyed by a stable generated id, so any name — spaces, punctuation,
 * Unicode — survives without colliding with mermaid syntax.
 */
const escapeLabel = (name: string): string => name.replace(/"/g, '#quot;');

/**
 * Build a deterministic, mermaid-safe node id for each state.
 *
 * Mermaid node ids must be bare identifiers, so state names (which may contain
 * spaces or punctuation) cannot be used directly. We assign `s0`, `s1`, … in
 * declaration order and carry the real name in the display label. The mapping
 * is deterministic, so export output is stable across runs.
 */
const buildIdMap = (states: string[]): Map<string, string> => {
  const map = new Map<string, string>();
  states.forEach((s, i) => map.set(s, `s${i}`));
  return map;
};

/**
 * Serialize an {@link InterchangeModel} to a mermaid `stateDiagram-v2` block.
 *
 * @param model - The structural model to encode
 * @returns The mermaid diagram text, newline-terminated
 *
 * @example
 *   modelToMermaid({ states: ['a','b'], edges: [{from:'a',to:'b',kind:'legal'}] });
 *   // 'stateDiagram-v2\n  s0: a\n  s1: b\n  s0 --> s1\n'
 */
export function modelToMermaid(model: InterchangeModel): string {
  const ids = buildIdMap(model.states);
  const lines: string[] = ['stateDiagram-v2'];

  for (const state of model.states) {
    lines.push(`  ${ids.get(state)}: ${escapeLabel(state)}`);
  }

  for (const edge of model.edges) {
    const fromId = ids.get(edge.from) ?? edge.from;
    const toId   = ids.get(edge.to) ?? edge.to;
    const label  = edge.action !== undefined ? ` : ${escapeLabel(edge.action)}` : '';
    lines.push(`  ${fromId} --> ${toId}${label}`);
  }

  return lines.join('\n') + '\n';
}

/** Reverse of {@link escapeLabel}. */
const unescapeLabel = (label: string): string => label.replace(/#quot;/g, '"');

const TRANSITION_RE = /^([A-Za-z0-9_]+)\s*-->\s*([A-Za-z0-9_]+)(?:\s*:\s*(.*))?$/;
const NODE_RE       = /^([A-Za-z0-9_]+)\s*:\s*(.*)$/;

/**
 * Parse a mermaid `stateDiagram-v2` block into an {@link InterchangeModel}.
 *
 * Recognizes the two line shapes export emits — `id: Display Label` node
 * declarations and `id --> id : label` transitions — plus blank lines and the
 * `stateDiagram-v2` / `stateDiagram` header. Node-declaration labels rename
 * their id to the human name; ids never declared keep their raw id as the
 * state name. Because mermaid carries no arrow kind, every transition decodes
 * as `legal` — the documented, reported loss of the export direction.
 *
 * @param text - The mermaid diagram text
 * @returns The decoded structural model
 * @throws InterchangeError (reason `'parse'`) if no diagram header is present
 *   or a non-blank line matches none of the recognized shapes
 *
 * @example
 *   mermaidToModel('stateDiagram-v2\n  s0 --> s1');
 *   // { states: ['s0','s1'], edges: [{from:'s0',to:'s1',kind:'legal'}] }
 */
export function mermaidToModel(text: string): InterchangeModel {
  const rawLines = text.split(/\r?\n/);
  const labelOf = new Map<string, string>();      // id -> display name
  const order: string[] = [];                     // ids in first-seen order
  const edges: InterchangeEdge[] = [];
  let sawHeader = false;

  const note = (id: string): void => {
    if (!labelOf.has(id)) {
      labelOf.set(id, id);
      order.push(id);
    }
  };

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (line === '') continue;
    if (line === 'stateDiagram-v2' || line === 'stateDiagram') { sawHeader = true; continue; }

    const tr = TRANSITION_RE.exec(line);
    if (tr) {
      const [, from, to, label] = tr;
      note(from);
      note(to);
      const edge: InterchangeEdge = { from, to, kind: 'legal' };
      if (label !== undefined && label.trim() !== '') {
        edge.action = unescapeLabel(label.trim());
      }
      edges.push(edge);
      continue;
    }

    const nd = NODE_RE.exec(line);
    if (nd) {
      const [, id, label] = nd;
      note(id);
      labelOf.set(id, unescapeLabel(label.trim()));
      continue;
    }

    throw new InterchangeError(`unrecognized mermaid line: ${line}`, { reason: 'parse', format: 'mermaid' });
  }

  if (!sawHeader) {
    throw new InterchangeError('not a mermaid state diagram (missing `stateDiagram-v2` header)', {
      reason: 'parse',
      format: 'mermaid',
    });
  }

  // Re-key states and edges by display name so the produced FSL uses human
  // names, not mermaid ids.
  // Every id reaching here was registered by note() (which seeds labelOf with
  // the id itself), so the lookup is always defined.
  const nameOf = (id: string): string => labelOf.get(id) as string;
  return {
    states: order.map(nameOf),
    edges:  edges.map((e) => ({ ...e, from: nameOf(e.from), to: nameOf(e.to) })),
  };
}
