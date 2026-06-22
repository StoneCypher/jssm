import { from } from '../../../jssm';
import type { InterchangeModel, InterchangeEdge } from './types';
import { InterchangeError } from './types';

/**
 * Map jssm's internal arrow-kind vocabulary onto the interchange model's.
 *
 * jssm uses `'none' | 'legal' | 'main' | 'forced'`; `'none'` is an internal
 * placeholder that never appears on a real edge, so it folds to `'legal'`
 * (the default visible transition) for interchange purposes.
 */
const kindToInterchange = (kind: string): InterchangeEdge['kind'] =>
  kind === 'main' || kind === 'forced' ? kind : 'legal';

/** The FSL arrow token for each interchange edge kind. */
const ARROW: Record<InterchangeEdge['kind'], string> = {
  legal:  '->',
  main:   '=>',
  forced: '~>',
};

/**
 * Quote a state name as an FSL double-quoted `String` label.
 *
 * FSL state names may be bare atoms or double-quoted strings (`Label = Atom /
 * String` in the grammar). The quoted form accepts every character except a
 * bare `"` or `\`, both of which are backslash-escaped here — so quoting is
 * *always* safe regardless of the name's contents (spaces, punctuation,
 * Unicode). Always quoting keeps the emitter simple and the output uniform.
 *
 * @param name - The state name to quote
 * @returns The name as a double-quoted FSL label
 *
 * @example
 *   quoteState('Red Light');   // '"Red Light"'
 *   quoteState('a"b');         // '"a\\"b"'
 */
export function quoteState(name: string): string {
  const escaped = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}

/**
 * Quote an action label as an FSL single-quoted action label.
 *
 * FSL action labels are single-quoted (`'Proceed'`); the grammar omits a bare
 * `'` and a bare `\` from the unescaped set, so both are backslash-escaped.
 *
 * @param action - The action label to quote
 * @returns The action as a single-quoted FSL action label
 *
 * @example
 *   quoteAction('Shut down');  // "'Shut down'"
 *   quoteAction("o'clock");    // "'o\\'clock'"
 */
export function quoteAction(action: string): string {
  const escaped = action.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `'${escaped}'`;
}

/**
 * Parse FSL source into the format-neutral {@link InterchangeModel}.
 *
 * This is the read side every `export` target shares: it compiles the FSL once
 * (via jssm's `from`) and projects the resulting machine's states and edges
 * onto the small interchange surface. Construction details FSL carries but the
 * interchange model does not (hooks, contracts, vals, themes) are simply not
 * read here — `export` targets that care report them as lossy.
 *
 * @param fsl - FSL source text
 * @returns The structural model: states, edges, and start states
 * @throws InterchangeError (reason `'parse'`) if the FSL fails to compile
 *
 * @example
 *   const m = fslToModel("a -> b;");
 *   // m.states === ['a', 'b']; m.edges[0] === { from: 'a', to: 'b', kind: 'legal' }
 */
export function fslToModel(fsl: string): InterchangeModel {
  let machine: ReturnType<typeof from>;
  try {
    machine = from(fsl);
  } catch (e) {
    throw new InterchangeError(`cannot parse FSL: ${(e as Error).message ?? String(e)}`, {
      reason: 'parse',
      format: 'fsl',
    });
  }

  const states = machine.states();
  const edges: InterchangeEdge[] = machine.list_edges().map((tr) => {
    const edge: InterchangeEdge = {
      from: String(tr.from),
      to:   String(tr.to),
      kind: kindToInterchange(tr.kind),
    };
    if (tr.action !== undefined && tr.action !== null) {
      edge.action = String(tr.action);
    }
    return edge;
  });

  return { states, edges, start_states: [String(machine.state())] };
}

/**
 * The result of rendering an {@link InterchangeModel} to FSL.
 *
 * `isolatedStates` names every state that had no incident edge in the model.
 * FSL has no way to declare a node that participates in no transition, so each
 * is materialized as a self-loop (`"x" -> "x";`) to keep it in the machine —
 * an *added* edge the source did not contain. Callers surface these as lossy.
 */
export interface FslRenderResult {
  fsl: string;
  isolatedStates: string[];
}

/**
 * Render an {@link InterchangeModel} back to canonical FSL source.
 *
 * This is the write side every `import` source shares: once a foreign format
 * has been projected onto the interchange model, this turns it into FSL. Every
 * edge becomes one `from arrow to;` line, with the action label (when present)
 * placed before the arrow per FSL syntax (`a 'act' -> b;`).
 *
 * FSL cannot declare a node that takes part in no transition — there is no
 * edgeless state statement that jssm will compile into a present-but-isolated
 * state. So any state with no incident edge is materialized as a **self-loop**
 * (`"x" -> "x";`), the minimal construct that registers the node. That self-loop
 * is an edge the source did not have, so the returned {@link FslRenderResult}
 * names every such state in `isolatedStates` for the caller to mark lossy.
 *
 * @param model - The structural model to render
 * @returns The FSL source plus the list of states materialized as self-loops
 *
 * @example
 *   modelToFsl({ states: ['a','b'], edges: [{from:'a',to:'b',kind:'legal'}] });
 *   // { fsl: '"a" -> "b";\n', isolatedStates: [] }
 *
 * @example
 *   modelToFsl({ states: ['lonely'], edges: [] });
 *   // { fsl: '"lonely" -> "lonely";\n', isolatedStates: ['lonely'] }
 */
export function modelToFsl(model: InterchangeModel): FslRenderResult {
  const lines: string[] = [];

  const connected = new Set<string>();
  for (const edge of model.edges) {
    connected.add(edge.from);
    connected.add(edge.to);
    const action = edge.action !== undefined ? ` ${quoteAction(edge.action)}` : '';
    lines.push(`${quoteState(edge.from)}${action} ${ARROW[edge.kind]} ${quoteState(edge.to)};`);
  }

  // States with no incident edge cannot otherwise survive: FSL has no edgeless
  // node statement. Materialize each as a self-loop so it registers, and report
  // it so the conversion's added-edge cost stays visible.
  const isolatedStates: string[] = [];
  for (const state of model.states) {
    if (!connected.has(state)) {
      isolatedStates.push(state);
      lines.push(`${quoteState(state)} ${ARROW.legal} ${quoteState(state)};`);
    }
  }

  return { fsl: lines.join('\n') + (lines.length > 0 ? '\n' : ''), isolatedStates };
}
