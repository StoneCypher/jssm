import type { ReactiveController, ReactiveControllerHost } from 'lit';
/** Debounce before a live edit is written to the URL fragment. */
export declare const PERMALINK_WRITE_DEBOUNCE_MS = 300;
/** The host element this controller drives: a Lit host exposing a string `fsl`. */
type SyncHost = ReactiveControllerHost & HTMLElement & {
    fsl: string;
};
/**
 * Binds an `<fsl-instance>` to a segment of the URL fragment: restores from it
 * on connect and writes back (debounced, via `history.replaceState`) whenever
 * the machine is rebuilt. Inert when the host has no key ({@link permalink_key_for}
 * returns `null`), so an `fsl-instance` without an `id`/`uhash` never touches
 * `location`.
 *
 * Echo guard: `_last` holds the segment most recently read or written, so a
 * restore→rebuild→write cycle and a self-induced `hashchange` are both no-ops.
 *
 * @example
 * // In an element's constructor:
 * new FslPermalinkSync(this); // reads <el id="k">'s #k=… on connect, writes it on edit
 */
export declare class FslPermalinkSync implements ReactiveController {
    private readonly host;
    private key;
    private _last;
    private _timer;
    private readonly _onRebuilt;
    private readonly _onHashChange;
    constructor(host: SyncHost);
    hostConnected(): void;
    hostDisconnected(): void;
    /** Read our segment and, if new, push it into the host (overriding declared source). */
    private _restore;
    private _scheduleWrite;
    /** Encode the current source and merge it into the fragment, history-silently. */
    private _write;
}
export {};
