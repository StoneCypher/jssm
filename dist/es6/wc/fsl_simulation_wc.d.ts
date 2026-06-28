import { LitElement, type TemplateResult } from 'lit';
/**
 * `<fsl-simulation>` — a random-walk driver for a parent `<fsl-instance>`.
 *
 * `Step` fires one uniformly-random legal action; `Play` auto-steps every
 * {@link FslSimulation.interval} ms and stops automatically when the machine
 * reaches a terminal state (no legal actions). Standalone (no host ancestor)
 * the controls are disabled.
 *
 * @element fsl-simulation
 * @csspart sim - The control row.
 * @attr {number} interval - Auto-step period in milliseconds (default 600).
 */
export declare class FslSimulation extends LitElement {
    static styles: import("lit").CSSResult;
    /** Auto-step period in milliseconds. */
    interval: number;
    private _running;
    private _steps;
    private _host;
    private _timer;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private _step;
    private _toggle;
    private _start;
    private _stop;
    render(): TemplateResult;
}
declare global {
    interface HTMLElementTagNameMap {
        'fsl-simulation': FslSimulation;
    }
}
