import { from } from '../../../jssm';
import { CodegenError } from '../../codegen-types';

/**
 * One named transition in the extracted surface: firing `action` while in
 * `from` moves the machine to `to`.
 */
export interface SurfaceTransition {
  from: string;
  action: string;
  to: string;
}

/**
 * A host-language-neutral description of a compiled machine — exactly the
 * facts a `native:*` target needs to emit an implementation. Extracted once,
 * consumed by every target, and trivially serializable (so it is itself
 * test-inspectable without rendering source).
 */
export interface MachineSurface {
  /** Every state name, declaration order. */
  states: string[];
  /** The start state (the machine's state immediately after construction). */
  initial: string;
  /** Every distinct action name (the input alphabet). */
  actions: string[];
  /** Every state that is final (terminal or complete). */
  finals: string[];
  /** Every action-bearing transition. */
  transitions: SurfaceTransition[];
  /** Every eventless/unnamed edge (an automatic transition with no action). */
  eventless: { from: string; to: string }[];
}

/**
 * Compile FSL source and extract its host-agnostic {@link MachineSurface}.
 *
 * Named transitions (edges carrying an action) populate `transitions` — the
 * ones a generated `action(name)` dispatcher can fire. Eventless / unnamed
 * edges (automatic transitions with no caller-visible trigger) are surfaced
 * separately in `eventless`, which a target emits as a `step()` transition.
 *
 * @param fsl - FSL source text
 * @returns The extracted surface
 * @throws CodegenError if the FSL fails to parse or compile
 *
 * @example
 *   const s = extractSurface("a 'go' -> b;");
 *   // s.states  === ['a', 'b']
 *   // s.initial === 'a'
 *   // s.actions === ['go']
 *   // s.finals  === ['b']
 *   // s.transitions === [{ from: 'a', action: 'go', to: 'b' }]
 *   // s.eventless === []
 */
export function extractSurface(fsl: string): MachineSurface {
  let machine;
  try {
    machine = from(fsl);
  } catch (e) {
    throw new CodegenError(`codegen failed to compile FSL: ${(e as Error).message}`);
  }

  const states  = machine.states().map(s => String(s));
  const initial = String(machine.state());
  const actions = machine.list_actions().map(a => String(a));
  const finals  = states.filter(s => machine.state_is_final(s));

  const transitions: SurfaceTransition[] = [];
  const eventless: { from: string; to: string }[] = [];
  for (const edge of machine.list_edges()) {
    if (edge.action === undefined) {
      eventless.push({ from: String(edge.from), to: String(edge.to) });
      continue;
    }
    transitions.push({
      from:   String(edge.from),
      action: String(edge.action),
      to:     String(edge.to),
    });
  }

  return { states, initial, actions, finals, transitions, eventless };
}
