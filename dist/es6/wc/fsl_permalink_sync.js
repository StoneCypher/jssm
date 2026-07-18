import { encode_machine, decode_machine, read_fragment_param, set_fragment_param, permalink_key_for, } from './fsl_permalink.js';
/** Debounce before a live edit is written to the URL fragment. */
export const PERMALINK_WRITE_DEBOUNCE_MS = 300;
/** Marks that this connection has not observed its URL segment yet. */
const UNOBSERVED_SEGMENT = Symbol('unobserved permalink segment');
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
export class FslPermalinkSync {
    constructor(host) {
        this.key = null;
        this._observed = UNOBSERVED_SEGMENT;
        this._connected = false;
        this._revision = 0;
        this._onRebuilt = () => { this._scheduleWrite(); };
        this._onHashChange = () => { void this._restore(); };
        this.host = host;
        host.addController(this);
    }
    /** Observe the keyed URL segment and attach synchronization listeners. */
    hostConnected() {
        this._connected = true;
        this.key = permalink_key_for(this.host);
        if (this.key === null) {
            return;
        }
        void this._restore();
        this.host.addEventListener('fsl-machine-rebuilt', this._onRebuilt);
        addEventListener('hashchange', this._onHashChange);
    }
    /** Invalidate work, forget observations, detach listeners, and cancel timers. */
    hostDisconnected() {
        this._connected = false;
        this._revision += 1;
        this._observed = UNOBSERVED_SEGMENT;
        if (this.key !== null) {
            this.host.removeEventListener('fsl-machine-rebuilt', this._onRebuilt);
            removeEventListener('hashchange', this._onHashChange);
        }
        if (this._timer !== undefined) {
            clearTimeout(this._timer);
            this._timer = undefined;
        }
    }
    /**
     * Observe this instance's newest segment and push it into the host. A changed
     * observation supersedes older restores and writes; an unchanged observation
     * leaves them valid. Declared source is overridden only when this decode is
     * still the latest operation and the actual fragment is unchanged after
     * awaiting it, even when a corresponding hashchange handler is still queued.
     */
    async _restore() {
        const key = this.key;
        const segment = read_fragment_param(location.hash, key);
        if (segment === this._observed) {
            return;
        }
        this._observed = segment;
        this._revision += 1;
        if (segment === null) {
            return;
        }
        const revision = this._revision;
        try {
            const fsl = await decode_machine(segment);
            const currentSegment = read_fragment_param(location.hash, key);
            if (!this._connected ||
                revision !== this._revision ||
                key !== this.key ||
                currentSegment !== segment) {
                return;
            }
            this.host.fsl = fsl;
        }
        catch (_a) {
            // Malformed/truncated segment, or no compression support: leave the
            // declared source intact. A bad URL never bricks the page.
        }
    }
    /** Debounce the newest rebuild and immediately supersede older restores or writes. */
    _scheduleWrite() {
        const revision = this._revision += 1;
        if (this._timer !== undefined) {
            clearTimeout(this._timer);
        }
        this._timer = setTimeout(() => {
            this._timer = undefined;
            void this._write(revision);
        }, PERMALINK_WRITE_DEBOUNCE_MS);
    }
    /**
     * Encode the scheduled source and merge it into the fragment only when no
     * newer source write, observed segment change, or disconnect superseded it.
     * The actual fragment must also match the observation captured before the
     * await, covering URL changes whose hashchange handler is still queued. A
     * successful write becomes the current observation, preventing echo work.
     */
    async _write(revision) {
        const key = this.key;
        const fsl = this.host.fsl;
        const observed = this._observed;
        try {
            const segment = await encode_machine(fsl);
            const currentSegment = read_fragment_param(location.hash, key);
            if (!this._connected ||
                revision !== this._revision ||
                key !== this.key ||
                currentSegment !== observed) {
                return;
            }
            if (segment === observed) {
                return;
            }
            const fragment = set_fragment_param(location.hash, key, segment);
            history.replaceState(history.state, '', `#${fragment}`);
            this._observed = segment;
        }
        catch (_a) {
            // No compression support: skip the write rather than throw.
        }
    }
}
