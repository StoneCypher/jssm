import { Machine } from './jssm';
import { JssmTransition } from './jssm_types';

export type PickTrace = string[];

export interface PickResult {
  trace: PickTrace;
  machine_a_index: number;
  machine_b_index: number;
}

/**
 * Finds a differentiating trace between candidate machines.
 * Strategy 1: Bounded BFS (shortest path, memory intensive)
 * Strategy 2: Random Walk with Stochastic Reduction (deep paths, memory efficient)
 */
export function find_differentiating_trace(
  machines: Machine<any>[],
  maxBfsDepth = 6,
  maxRandomWalkDepth = 50,
  randomWalks = 100
): PickResult | null {
  if (machines.length < 2) return null;

  const mA = machines[0];
  
  for (let i = 1; i < machines.length; i++) {
    const mB = machines[i];
    
    // Strategy 1: Bounded BFS
    let trace = compare_bfs(mA, mB, maxBfsDepth);
    
    // Strategy 2: Random Walk Fallback
    if (!trace) {
      trace = compare_random_walk(mA, mB, maxRandomWalkDepth, randomWalks);
      if (trace) {
        // Apply Stochastic Reduction (Shrinking) to find a minimal sub-trace
        trace = reduce_trace(mA, mB, trace);
      }
    }

    if (trace !== null) {
      return { trace, machine_a_index: 0, machine_b_index: i };
    }
  }

  return null;
}

function get_actions(state: string, edges: JssmTransition<string, any>[]) {
  const actions = new Map<string, string>(); // action_name -> target_state
  for (const e of edges) {
    if (e.from === state && e.action) {
      actions.set(e.action, e.to);
    }
  }
  return actions;
}

function compare_bfs(mA: Machine<any>, mB: Machine<any>, maxDepth: number): PickTrace | null {
  const edgesA = mA.list_edges();
  const edgesB = mB.list_edges();

  const queue: { stateA: string, stateB: string, trace: string[] }[] = [];
  const visited = new Set<string>();

  queue.push({ stateA: mA.state(), stateB: mB.state(), trace: [] });
  visited.add(`${mA.state()}|${mB.state()}`);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr.trace.length >= maxDepth) continue;

    const actionsA = get_actions(curr.stateA, edgesA);
    const actionsB = get_actions(curr.stateB, edgesB);

    // Check for divergence
    for (const [action] of actionsA.entries()) {
      if (!actionsB.has(action)) return [...curr.trace, action];
    }
    for (const [action] of actionsB.entries()) {
      if (!actionsA.has(action)) return [...curr.trace, action];
    }

    // Continue BFS
    for (const [action, nextA] of actionsA.entries()) {
      const nextB = actionsB.get(action)!;
      const key = `${nextA}|${nextB}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ stateA: nextA, stateB: nextB, trace: [...curr.trace, action] });
      }
    }
  }
  return null;
}

function compare_random_walk(mA: Machine<any>, mB: Machine<any>, maxDepth: number, iterations: number): PickTrace | null {
  const edgesA = mA.list_edges();
  const edgesB = mB.list_edges();

  for (let i = 0; i < iterations; i++) {
    let currA = mA.state();
    let currB = mB.state();
    const trace: string[] = [];

    for (let depth = 0; depth < maxDepth; depth++) {
      const actionsA = get_actions(currA, edgesA);
      const actionsB = get_actions(currB, edgesB);

      // Check divergence
      const diffA = Array.from(actionsA.keys()).find(a => !actionsB.has(a));
      if (diffA) return [...trace, diffA];
      
      const diffB = Array.from(actionsB.keys()).find(a => !actionsA.has(a));
      if (diffB) return [...trace, diffB];

      // If no divergence and no actions, dead end
      const sharedActions = Array.from(actionsA.keys());
      if (sharedActions.length === 0) break;

      // Pick random action
      const randomAction = sharedActions[Math.floor(Math.random() * sharedActions.length)];
      trace.push(randomAction);
      currA = actionsA.get(randomAction)!;
      currB = actionsB.get(randomAction)!;
    }
  }
  return null;
}

function is_differentiating_trace(mA: Machine<any>, mB: Machine<any>, trace: string[]): boolean {
  let currA = mA.state();
  let currB = mB.state();
  const edgesA = mA.list_edges();
  const edgesB = mB.list_edges();

  for (let i = 0; i < trace.length; i++) {
    const action = trace[i];
    const actionsA = get_actions(currA, edgesA);
    const actionsB = get_actions(currB, edgesB);
    
    const hasA = actionsA.has(action);
    const hasB = actionsB.has(action);

    if (hasA !== hasB) return true; // It diverges!
    if (!hasA && !hasB) return false; // Both reject early, not differentiating

    currA = actionsA.get(action)!;
    currB = actionsB.get(action)!;
  }
  return false;
}

// Stochastic Shrinking: Iteratively tries to remove actions from the trace while keeping it a valid differentiating trace.
function reduce_trace(mA: Machine<any>, mB: Machine<any>, trace: string[]): string[] {
  let currentTrace = [...trace];
  let i = 0;
  
  while (i < currentTrace.length - 1) { // We can't remove the final diverging action
    const shrunk = [...currentTrace];
    shrunk.splice(i, 1); // remove 1 step
    
    if (is_differentiating_trace(mA, mB, shrunk)) {
      currentTrace = shrunk; // Keep the shorter trace, don't increment i (try index i again)
    } else {
      i++;
    }
  }
  
  return currentTrace;
}
