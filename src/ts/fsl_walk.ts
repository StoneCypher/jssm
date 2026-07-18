import type { Machine } from './jssm.js';

/**
 *  Plan the frame sequence for an animated machine walk, as state names.
 *
 *  With main-path edges (FSL `=>`, `main_path === true`): start at the
 *  machine's current state — the start state for a freshly-constructed
 *  machine, which is what the fence pipeline always passes — and follow
 *  main-path edges in declaration order, stopping at the first revisited
 *  state (the animation loops, so the cycle closes visually).  Without any:
 *  tour every edge in declaration order, emitting each edge's endpoints and
 *  collapsing consecutive duplicates.
 *
 *  This is presentation, not simulation — a tour's consecutive entries need
 *  not be legal transitions, and no machine state is mutated.
 *  @example
 *  plan_walk(sm`Red => Green => Yellow => Red;`);  // ['Red', 'Green', 'Yellow']
 *  @see encode_gif
 */
export function plan_walk(machine: Machine<unknown>): string[] {

  const edges = machine.list_edges();
  const main  = edges.filter(e => e.main_path);

  if (main.length > 0) {
    const seen = new Set<string>();
    const out: string[] = [];
    let current = machine.state();
    while (!seen.has(current)) {
      seen.add(current);
      out.push(current);
      const next = main.find(e => e.from === current);
      if (next === undefined) { break; }
      current = next.to;
    }
    return out;
  }

  const out: string[] = [];
  for (const e of edges) {
    if (out[out.length - 1] !== e.from) { out.push(e.from); }
    out.push(e.to);
  }

  return out;

}
