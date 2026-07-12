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
 * Echo guard: `_observed` holds this connection's current URL segment, including
 * explicit absence, so unrelated hash changes and restore→rebuild→write cycles
 * are no-ops. Async operations share a revision: every observed segment change
 * or source write invalidates all older work, and disconnecting invalidates all
 * work. This gives cross-direction latest-operation-wins semantics without
 * allowing unrelated hash changes to cancel valid writes.
 * @example
 * // In an element's constructor:
 * new FslPermalinkSync(this); // reads <el id="k">'s #k=… on connect, writes it on edit
 */
export declare class FslPermalinkSync implements ReactiveController {
    private readonly host;
    private key;
    private _observed;
    private _timer;
    private _connected;
    private _revision;
    private readonly _onRebuilt;
    private readonly _onHashChange;
    constructor(host: SyncHost);
    /** Observe the keyed URL segment and attach synchronization listeners. */
    hostConnected(): void;
    /** Invalidate work, forget observations, detach listeners, and cancel timers. */
    hostDisconnected(): void;
    /**
     * Observe this instance's newest segment and push it into the host. A changed
     * observation supersedes older restores and writes; an unchanged observation
     * leaves them valid. Declared source is overridden only when this decode is
     * still the latest operation and the actual fragment is unchanged after
     * awaiting it, even when a corresponding hashchange handler is still queued.
     */
    private _restore;
    /** Debounce the newest rebuild and immediately supersede older restores or writes. */
    private _scheduleWrite;
    /**
     * Encode the scheduled source and merge it into the fragment only when no
     * newer source write, observed segment change, or disconnect superseded it.
     * The actual fragment must also match the observation captured before the
     * await, covering URL changes whose hashchange handler is still queued. A
     * successful write becomes the current observation, preventing echo work.
     */
    private _write;
}
export {};
