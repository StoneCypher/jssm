/**
 * Finds a differentiating trace between candidate machines.
 * Strategy 1: Bounded BFS (shortest path, memory intensive)
 * Strategy 2: Random Walk with Stochastic Reduction (deep paths, memory efficient)
 */
export function find_differentiating_trace(machines, maxBfsDepth = 6, maxRandomWalkDepth = 50, randomWalks = 100) {
    if (machines.length < 2)
        return null;
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
function get_actions(state, edges) {
    const actions = new Map(); // action_name -> target_state
    for (const e of edges) {
        if (e.from === state && e.action) {
            actions.set(e.action, e.to);
        }
    }
    return actions;
}
function compare_bfs(mA, mB, maxDepth) {
    const edgesA = mA.list_edges();
    const edgesB = mB.list_edges();
    const queue = [];
    const visited = new Set();
    queue.push({ stateA: mA.state(), stateB: mB.state(), trace: [] });
    visited.add(`${mA.state()}|${mB.state()}`);
    while (queue.length > 0) {
        const curr = queue.shift();
        if (curr.trace.length >= maxDepth)
            continue;
        const actionsA = get_actions(curr.stateA, edgesA);
        const actionsB = get_actions(curr.stateB, edgesB);
        // Check for divergence
        for (const [action] of actionsA.entries()) {
            if (!actionsB.has(action))
                return [...curr.trace, action];
        }
        for (const [action] of actionsB.entries()) {
            if (!actionsA.has(action))
                return [...curr.trace, action];
        }
        // Continue BFS
        for (const [action, nextA] of actionsA.entries()) {
            const nextB = actionsB.get(action);
            const key = `${nextA}|${nextB}`;
            if (!visited.has(key)) {
                visited.add(key);
                queue.push({ stateA: nextA, stateB: nextB, trace: [...curr.trace, action] });
            }
        }
    }
    return null;
}
function compare_random_walk(mA, mB, maxDepth, iterations) {
    const edgesA = mA.list_edges();
    const edgesB = mB.list_edges();
    for (let i = 0; i < iterations; i++) {
        let currA = mA.state();
        let currB = mB.state();
        const trace = [];
        for (let depth = 0; depth < maxDepth; depth++) {
            const actionsA = get_actions(currA, edgesA);
            const actionsB = get_actions(currB, edgesB);
            // Check divergence
            const diffA = Array.from(actionsA.keys()).find(a => !actionsB.has(a));
            if (diffA)
                return [...trace, diffA];
            const diffB = Array.from(actionsB.keys()).find(a => !actionsA.has(a));
            if (diffB)
                return [...trace, diffB];
            // If no divergence and no actions, dead end
            const sharedActions = Array.from(actionsA.keys());
            if (sharedActions.length === 0)
                break;
            // Pick random action
            const randomAction = sharedActions[Math.floor(Math.random() * sharedActions.length)];
            trace.push(randomAction);
            currA = actionsA.get(randomAction);
            currB = actionsB.get(randomAction);
        }
    }
    return null;
}
function is_differentiating_trace(mA, mB, trace) {
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
        if (hasA !== hasB)
            return true; // It diverges!
        if (!hasA && !hasB)
            return false; // Both reject early, not differentiating
        currA = actionsA.get(action);
        currB = actionsB.get(action);
    }
    return false;
}
// Stochastic Shrinking: Iteratively tries to remove actions (single or chunks) from the trace
// while keeping it a valid differentiating trace. Falls back to a deterministic sweep at the end.
function reduce_trace(mA, mB, trace, max_failures = 100) {
    let currentTrace = [...trace];
    let failures = 0;
    while (failures < max_failures && currentTrace.length > 1) {
        const shrunk = [...currentTrace];
        // 50% chance to drop a single element, 50% chance to drop a random chunk
        const dropChunk = Math.random() > 0.5 && currentTrace.length > 2;
        // We can never drop the final action (index: length - 1) as it's the divergence point
        const maxIdx = currentTrace.length - 2;
        const i = Math.floor(Math.random() * (maxIdx + 1));
        if (dropChunk) {
            // Pick a random length between 2 and the remaining elements before the end
            const maxLen = currentTrace.length - 1 - i;
            const len = Math.floor(Math.random() * (maxLen - 1)) + 2;
            shrunk.splice(i, len);
        }
        else {
            shrunk.splice(i, 1);
        }
        if (is_differentiating_trace(mA, mB, shrunk)) {
            currentTrace = shrunk;
            failures = 0; // Reset failures on success
        }
        else {
            failures++;
        }
    }
    // Final deterministic left-to-right sweep to guarantee 1-minimality
    return final_deterministic_sweep(mA, mB, currentTrace);
}
function final_deterministic_sweep(mA, mB, trace) {
    let currentTrace = [...trace];
    let i = 0;
    while (i < currentTrace.length - 1) {
        const shrunk = [...currentTrace];
        shrunk.splice(i, 1);
        if (is_differentiating_trace(mA, mB, shrunk)) {
            currentTrace = shrunk;
        }
        else {
            i++;
        }
    }
    return currentTrace;
}
