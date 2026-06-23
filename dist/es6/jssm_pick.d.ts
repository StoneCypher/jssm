import { Machine } from './jssm';
export declare type PickTrace = string[];
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
export declare function find_differentiating_trace(machines: Machine<any>[], maxBfsDepth?: number, maxRandomWalkDepth?: number, randomWalks?: number): PickResult | null;
