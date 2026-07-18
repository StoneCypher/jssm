import type { ReactiveController, ReactiveControllerHost } from 'lit';
import {
  encode_machine, decode_machine,
  read_fragment_param, set_fragment_param,
  permalink_key_for,
} from './fsl_permalink.js';

/** Debounce before a live edit is written to the URL fragment. */
export const PERMALINK_WRITE_DEBOUNCE_MS = 300;

/** Marks that this connection has not observed its URL segment yet. */
const UNOBSERVED_SEGMENT: unique symbol = Symbol('unobserved permalink segment');

/** The host element this controller drives: a Lit host exposing a string `fsl`. */
type SyncHost = ReactiveControllerHost & HTMLElement & { fsl: string };

/** The current per-instance URL observation, including explicit absence. */
type ObservedSegment = string | null | typeof UNOBSERVED_SEGMENT;

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
export class FslPermalinkSync implements ReactiveController {

  private readonly host: SyncHost;
  private key: string | null = null;
  private _observed: ObservedSegment = UNOBSERVED_SEGMENT;
  private _timer: ReturnType<typeof setTimeout> | undefined;
  private _connected = false;
  private _revision = 0;

  private readonly _onRebuilt    = (): void => { this._scheduleWrite(); };
  private readonly _onHashChange = (): void => { void this._restore(); };

  constructor(host: SyncHost) {
    this.host = host;
    host.addController(this);
  }

  /** Observe the keyed URL segment and attach synchronization listeners. */
  hostConnected(): void {
    this._connected = true;
    this.key = permalink_key_for(this.host);
    if (this.key === null) { return; }
    void this._restore();
    this.host.addEventListener('fsl-machine-rebuilt', this._onRebuilt);
    addEventListener('hashchange', this._onHashChange);
  }

  /** Invalidate work, forget observations, detach listeners, and cancel timers. */
  hostDisconnected(): void {
    this._connected = false;
    this._revision += 1;
    this._observed = UNOBSERVED_SEGMENT;
    if (this.key !== null) {
      this.host.removeEventListener('fsl-machine-rebuilt', this._onRebuilt);
      removeEventListener('hashchange', this._onHashChange);
    }
    if (this._timer !== undefined) { clearTimeout(this._timer); this._timer = undefined; }
  }

  /**
   * Observe this instance's newest segment and push it into the host. A changed
   * observation supersedes older restores and writes; an unchanged observation
   * leaves them valid. Declared source is overridden only when this decode is
   * still the latest operation and the actual fragment is unchanged after
   * awaiting it, even when a corresponding hashchange handler is still queued.
   */
  private async _restore(): Promise<void> {
    const key = this.key;
    const segment = read_fragment_param(location.hash, key);
    if (segment === this._observed) { return; }
    this._observed = segment;
    this._revision += 1;
    if (segment === null) { return; }
    const revision = this._revision;
    try {
      const fsl = await decode_machine(segment);
      const currentSegment = read_fragment_param(location.hash, key);
      if (
        !this._connected ||
        revision !== this._revision ||
        key !== this.key ||
        currentSegment !== segment
      ) { return; }
      this.host.fsl = fsl;
    } catch {
      // Malformed/truncated segment, or no compression support: leave the
      // declared source intact. A bad URL never bricks the page.
    }
  }

  /** Debounce the newest rebuild and immediately supersede older restores or writes. */
  private _scheduleWrite(): void {
    const revision = this._revision += 1;
    if (this._timer !== undefined) { clearTimeout(this._timer); }
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
  private async _write(revision: number): Promise<void> {
    const key = this.key;
    const fsl = this.host.fsl;
    const observed = this._observed;
    try {
      const segment = await encode_machine(fsl);
      const currentSegment = read_fragment_param(location.hash, key);
      if (
        !this._connected ||
        revision !== this._revision ||
        key !== this.key ||
        currentSegment !== observed
      ) { return; }
      if (segment === observed) { return; }
      const fragment = set_fragment_param(location.hash, key, segment);
      history.replaceState(history.state, '', `#${fragment}`);
      this._observed = segment;
    } catch {
      // No compression support: skip the write rather than throw.
    }
  }
}
