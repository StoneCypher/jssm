import { LitElement, type TemplateResult, type PropertyValues } from 'lit';
import type { JssmStochasticMode } from '../jssm_types.js';
/**
 * `<fsl-stochastic>` — a statistical/Monte-Carlo explorer for a parent
 * `<fsl-instance>` (fsl#1384).  Builds its own throwaway machine from the
 * host's `.fsl` source (never touching the live machine) and renders
 * aggregate run statistics in-panel.  Standalone (no host) the controls are
 * disabled.
 *
 * @element fsl-stochastic
 * @csspart controls - The control row.
 * @fires fsl-stochastic-complete - CustomEvent<JssmStochasticSummary> after a run.
 */
export declare class FslStochastic extends LitElement {
    static styles: import("lit").CSSResult;
    /** Run-count (montecarlo). Defaults from editor_config().stochastic_run_count. */
    runs: number;
    /** Per-run step cap (montecarlo) / walk length (steady_state). */
    maxSteps: number;
    /** Seed string ('' = time-based). Kept as string so the field can be blank. */
    seed: string;
    /** Run mode. */
    mode: JssmStochasticMode;
    private _summary;
    private _error;
    private _host;
    private _playing;
    connectedCallback(): void;
    disconnectedCallback(): void;
    /**
     * Read `editor_config().stochastic_run_count` after the first render so the
     * host's machine is guaranteed to be built (machine construction happens in
     * the host's connectedCallback, which may fire after the panel's own
     * connectedCallback in some environments).
     */
    firstUpdated(_changedProperties: PropertyValues): void;
    /** Execute a batch synchronously and render the aggregates. */
    run: () => void;
    /**
     * Animate the batch: accumulate runs incrementally via `requestAnimationFrame`,
     * redrawing as they land. Resolves when the batch completes or is paused-to-stop.
     *
     * Falls back to immediate (synchronous chunk) scheduling under jsdom where
     * `requestAnimationFrame` is undefined.
     *
     * @example
     * panel.runs = 100;
     * await panel.play(); // resolves when all 100 runs are done
     */
    play: () => Promise<void>;
    /**
     * Fold accumulated counters into a rendered summary. Shared by {@link play}
     * for incremental rendering during animation.
     *
     * @param state_visits     - Accumulated visit counts per state name.
     * @param edge_traversals  - Accumulated traversal counts per edge key.
     * @param path_lengths     - Lengths of completed (terminated) paths.
     * @param terminal_reached - Count of runs that reached a terminal state.
     * @param capped           - Count of runs that hit the step cap.
     * @param runs             - Total runs processed so far.
     * @param seed             - The effective RNG seed used for this batch.
     */
    private _commit;
    /** Toggle between playing and paused. Starts a new {@link play} batch when idle. */
    private _togglePlay;
    private _onMode;
    private _onRuns;
    private _onMax;
    private _onSeed;
    private _bars;
    private _panes;
    render(): TemplateResult;
}
declare global {
    interface HTMLElementTagNameMap {
        'fsl-stochastic': FslStochastic;
    }
}
