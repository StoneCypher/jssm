import type { ReactiveController, ReactiveControllerHost } from 'lit';
import {
  encode_machine, decode_machine,
  read_fragment_param, set_fragment_param,
  permalink_key_for,
} from './fsl_permalink.js';

/** Debounce before a live edit is written to the URL fragment. */
export const PERMALINK_WRITE_DEBOUNCE_MS = 300;

/** The host element this controller drives: a Lit host exposing a string `fsl`. */
type SyncHost = ReactiveControllerHost & HTMLElement & { fsl: string };

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
export class FslPermalinkSync implements ReactiveController {

  private readonly host: SyncHost;
  private key: string | null = null;
  private _last: string | null = null;
  private _timer: ReturnType<typeof setTimeout> | undefined;

  private readonly _onRebuilt    = (): void => { this._scheduleWrite(); };
  private readonly _onHashChange = (): void => { void this._restore(); };

  constructor(host: SyncHost) {
    this.host = host;
    host.addController(this);
  }

  hostConnected(): void {
    this.key = permalink_key_for(this.host);
    if (this.key === null) { return; }
    void this._restore();
    this.host.addEventListener('fsl-machine-rebuilt', this._onRebuilt);
    window.addEventListener('hashchange', this._onHashChange);
  }

  hostDisconnected(): void {
    if (this.key === null) { return; }
    this.host.removeEventListener('fsl-machine-rebuilt', this._onRebuilt);
    window.removeEventListener('hashchange', this._onHashChange);
    if (this._timer !== undefined) { clearTimeout(this._timer); this._timer = undefined; }
  }

  /** Read our segment and, if new, push it into the host (overriding declared source). */
  private async _restore(): Promise<void> {
    const segment = read_fragment_param(location.hash, this.key!);
    if (segment === null || segment === this._last) { return; }
    try {
      const fsl = await decode_machine(segment);
      // The decode is async; if the host was disconnected while it ran, drop the
      // result rather than mutating a detached element (and triggering a stray
      // rebuild on a later reconnect). A reconnect runs hostConnected → _restore
      // afresh.
      if (!this.host.isConnected) { return; }
      this._last = segment;
      this.host.fsl = fsl;
    } catch {
      // Malformed/truncated segment, or no compression support: leave the
      // declared source intact. A bad URL never bricks the page.
    }
  }

  private _scheduleWrite(): void {
    if (this._timer !== undefined) { clearTimeout(this._timer); }
    this._timer = setTimeout(() => { void this._write(); }, PERMALINK_WRITE_DEBOUNCE_MS);
  }

  /** Encode the current source and merge it into the fragment, history-silently. */
  private async _write(): Promise<void> {
    try {
      const segment = await encode_machine(this.host.fsl);
      if (segment === this._last) { return; }
      this._last = segment;
      const fragment = set_fragment_param(location.hash, this.key!, segment);
      history.replaceState(history.state, '', `#${fragment}`);
    } catch {
      // No compression support: skip the write rather than throw.
    }
  }
}
