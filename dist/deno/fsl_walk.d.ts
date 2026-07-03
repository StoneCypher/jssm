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
 *
 *  @example
 *  plan_walk(sm`Red => Green => Yellow => Red;`);  // ['Red', 'Green', 'Yellow']
 *
 *  @see encode_gif
 */
export declare function plan_walk(machine: Machine<unknown>): string[];
