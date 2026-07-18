/**
 * Evaluates whether a trace is valid according to a natural language rubric.
 * Returns true if the trace is valid, false if it contradicts the rubric.
 */
export declare function evaluate_trace(trace: string[], rubric: string): Promise<boolean>;
