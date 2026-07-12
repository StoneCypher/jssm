// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LitElement } from 'lit';
import { FslPermalinkSync, PERMALINK_WRITE_DEBOUNCE_MS } from '../fsl_permalink_sync.js';
import { decode_machine, encode_machine } from '../fsl_permalink.js';

vi.mock('../fsl_permalink.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../fsl_permalink.js')>();
  return {
    ...actual,
    decode_machine: vi.fn(actual.decode_machine),
    encode_machine: vi.fn(actual.encode_machine),
  };
});

// Minimal host: a LitElement carrying `fsl`, firing `fsl-machine-rebuilt` on demand.
class Host extends LitElement {
  fsl = '';
  constructor() {
    super();
    new FslPermalinkSync(this as unknown as LitElement & HTMLElement & { fsl: string });
  }
  rebuilt(): void {
    this.dispatchEvent(new CustomEvent('fsl-machine-rebuilt', { bubbles: true, composed: true }));
  }
}
if (!customElements.get('plk-host')) { customElements.define('plk-host', Host); }

const tick = (ms = 0): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Poll until `cond` holds, rather than sleeping a fixed amount. The write path
// is debounced (300ms) AND then awaits an async encode, so a fixed `tick(350)`
// has almost no margin and races under full-suite CPU load — the historical
// flake. Polling waits exactly as long as needed and no longer.
const waitFor = async (cond: () => boolean, timeout = 3000, step = 10): Promise<void> => {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeout) { throw new Error(`waitFor: condition not met within ${timeout}ms`); }
    await tick(step);
  }
};

/** A promise whose completion order is controlled by its test. */
interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

/** Create a deferred promise for deterministic async race tests. */
const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(accept => { resolve = accept; });
  return { promise, resolve };
};

beforeEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  const actual = await vi.importActual<typeof import('../fsl_permalink.js')>('../fsl_permalink.js');
  vi.mocked(decode_machine).mockReset().mockImplementation(actual.decode_machine);
  vi.mocked(encode_machine).mockReset().mockImplementation(actual.encode_machine);
  history.replaceState(history.state, '', location.pathname);
});

describe('FslPermalinkSync', () => {
  it('restores fsl from the fragment on connect, overriding the declared source', async () => {
    const seg = await encode_machine('x -> y;');
    history.replaceState(history.state, '', `#k1=${seg}`);
    const el = document.createElement('plk-host') as Host;
    el.id = 'k1'; el.fsl = 'declared -> only;';
    document.body.append(el);
    await el.updateComplete;
    await tick(20);                                // let the async restore settle
    expect(el.fsl).toBe('x -> y;');
    el.remove();
  });

  it('drops an older restore when its decode finishes after a newer hash restore', async () => {
    const oldDecode = deferred<string>();
    const newDecode = deferred<string>();
    vi.mocked(decode_machine).mockImplementation(segment => {
      if (segment === 'old-segment') { return oldDecode.promise; }
      if (segment === 'new-segment') { return newDecode.promise; }
      throw new Error(`unexpected segment: ${segment}`);
    });
    history.replaceState(history.state, '', '#k8=old-segment');
    const el = document.createElement('plk-host') as Host;
    el.id = 'k8'; el.fsl = 'declared -> only;';
    document.body.appendChild(el);

    history.replaceState(history.state, '', '#k8=new-segment');
    window.dispatchEvent(new Event('hashchange'));
    expect(decode_machine).toHaveBeenCalledTimes(2);

    newDecode.resolve('new -> source;');
    await Promise.resolve();
    expect(el.fsl).toBe('new -> source;');

    oldDecode.resolve('old -> source;');
    await Promise.resolve();
    expect(el.fsl).toBe('new -> source;');
    el.remove();
  });

  it('drops a restore when the actual segment changes before hashchange dispatch', async () => {
    const pendingDecode = deferred<string>();
    vi.mocked(decode_machine).mockImplementation(segment => {
      if (segment === 'old-segment') { return pendingDecode.promise; }
      throw new Error(`unexpected segment: ${segment}`);
    });
    history.replaceState(history.state, '', '#k17=old-segment');
    const el = document.createElement('plk-host') as Host;
    el.id = 'k17'; el.fsl = 'declared -> only;';
    document.body.appendChild(el);
    expect(decode_machine).toHaveBeenCalledWith('old-segment');

    history.replaceState(history.state, '', '#k17=new-segment');
    pendingDecode.resolve('old -> source;');
    await Promise.resolve();

    expect(el.fsl).toBe('declared -> only;');
    expect(location.hash).toBe('#k17=new-segment');
    el.remove();
  });

  it('drops a restore whose decode resolves after the host disconnects', async () => {
    const seg = await encode_machine('x -> y;');
    history.replaceState(history.state, '', `#k7=${seg}`);
    const el = document.createElement('plk-host') as Host;
    el.id = 'k7'; el.fsl = 'declared -> only;';
    document.body.append(el);                 // hostConnected → _restore starts (awaits decode)
    el.remove();                                   // disconnect before the decode resolves
    await tick(20);                                // let the in-flight decode settle
    expect(el.fsl).toBe('declared -> only;');      // guard dropped it — no mutation of a detached host
  });

  it('re-observes the same segment and restores it after reconnect', async () => {
    vi.mocked(decode_machine).mockResolvedValue('url -> source;');
    history.replaceState(history.state, '', '#k13=same-segment');
    const el = document.createElement('plk-host') as Host;
    el.id = 'k13'; el.fsl = 'declared -> only;';
    document.body.appendChild(el);
    await Promise.resolve();
    expect(el.fsl).toBe('url -> source;');

    el.remove();
    el.fsl = 'detached -> edit;';
    document.body.appendChild(el);
    await Promise.resolve();

    expect(decode_machine).toHaveBeenCalledTimes(2);
    expect(el.fsl).toBe('url -> source;');
    el.remove();
  });

  it('restores a segment again when it returns after removal', async () => {
    vi.mocked(decode_machine).mockResolvedValue('url -> source;');
    history.replaceState(history.state, '', '#k14=returning-segment');
    const el = document.createElement('plk-host') as Host;
    el.id = 'k14'; el.fsl = 'declared -> only;';
    document.body.appendChild(el);
    await Promise.resolve();
    expect(el.fsl).toBe('url -> source;');

    history.replaceState(history.state, '', location.pathname);
    window.dispatchEvent(new Event('hashchange'));
    el.fsl = 'local -> edit;';
    history.replaceState(history.state, '', '#k14=returning-segment');
    window.dispatchEvent(new Event('hashchange'));
    await Promise.resolve();

    expect(decode_machine).toHaveBeenCalledTimes(2);
    expect(el.fsl).toBe('url -> source;');
    el.remove();
  });

  it('restores a valid segment again when it returns after a malformed segment', async () => {
    vi.mocked(decode_machine).mockImplementation(segment => {
      if (segment === 'valid-segment') { return Promise.resolve('url -> source;'); }
      if (segment === 'malformed-segment') { return Promise.reject(new Error('malformed permalink')); }
      throw new Error(`unexpected segment: ${segment}`);
    });
    history.replaceState(history.state, '', '#k15=valid-segment');
    const el = document.createElement('plk-host') as Host;
    el.id = 'k15'; el.fsl = 'declared -> only;';
    document.body.appendChild(el);
    await Promise.resolve();
    expect(el.fsl).toBe('url -> source;');

    history.replaceState(history.state, '', '#k15=malformed-segment');
    window.dispatchEvent(new Event('hashchange'));
    await Promise.resolve();
    el.fsl = 'local -> edit;';
    history.replaceState(history.state, '', '#k15=valid-segment');
    window.dispatchEvent(new Event('hashchange'));
    await Promise.resolve();

    expect(vi.mocked(decode_machine).mock.calls.map(([segment]) => segment)).toEqual([
      'valid-segment',
      'malformed-segment',
      'valid-segment',
    ]);
    expect(el.fsl).toBe('url -> source;');
    el.remove();
  });

  it('does not write the URL after a restore (echo guard)', async () => {
    const seg = await encode_machine('a -> b;');
    history.replaceState(history.state, '', `#k4=${seg}`);
    const spy = vi.spyOn(history, 'replaceState');
    const el = document.createElement('plk-host') as Host;
    el.id = 'k4';
    document.body.append(el);
    await el.updateComplete;
    await tick(20);                                // restore settles, _observed = seg
    el.rebuilt();                                  // the rebuild the restore would trigger
    await tick(350);                               // past the debounce
    expect(spy).not.toHaveBeenCalled();            // re-encoded segment equals _observed → no write
    el.remove();
  });

  it('cancels a pending write when disconnected before the debounce fires', async () => {
    const el = document.createElement('plk-host') as Host;
    el.id = 'k5'; el.fsl = 'x -> y;';
    document.body.append(el);
    await el.updateComplete;
    const spy = vi.spyOn(history, 'replaceState');
    el.rebuilt();                                  // schedule a write (timer starts)
    el.remove();                                   // disconnect should cancel it
    await tick(350);                               // past the debounce
    expect(spy).not.toHaveBeenCalled();
  });

  it('drops an older write when its encode finishes after a newer source write', async () => {
    const oldEncode = deferred<string>();
    const newEncode = deferred<string>();
    vi.mocked(encode_machine).mockImplementation(source => {
      if (source === 'old -> source;') { return oldEncode.promise; }
      if (source === 'new -> source;') { return newEncode.promise; }
      throw new Error(`unexpected source: ${source}`);
    });
    const el = document.createElement('plk-host') as Host;
    el.id = 'k9';
    document.body.appendChild(el);
    await el.updateComplete;
    vi.useFakeTimers();

    try {
      el.fsl = 'old -> source;';
      el.rebuilt();
      await vi.advanceTimersByTimeAsync(PERMALINK_WRITE_DEBOUNCE_MS);
      expect(encode_machine).toHaveBeenCalledWith('old -> source;');

      el.fsl = 'new -> source;';
      el.rebuilt();
      await vi.advanceTimersByTimeAsync(PERMALINK_WRITE_DEBOUNCE_MS);
      expect(encode_machine).toHaveBeenCalledWith('new -> source;');

      newEncode.resolve('new-segment');
      await Promise.resolve();
      expect(location.hash).toBe('#k9=new-segment');

      oldEncode.resolve('old-segment');
      await Promise.resolve();
      expect(location.hash).toBe('#k9=new-segment');
    } finally {
      el.remove();
      vi.useRealTimers();
    }
  });

  it('keeps a pending write valid across an unrelated hash change', async () => {
    const firstEncode = deferred<string>();
    const secondEncode = deferred<string>();
    vi.mocked(encode_machine).mockImplementation(source => {
      if (source === 'first -> source;') { return firstEncode.promise; }
      if (source === 'second -> source;') { return secondEncode.promise; }
      throw new Error(`unexpected source: ${source}`);
    });
    const el = document.createElement('plk-host') as Host;
    el.id = 'k16';
    document.body.appendChild(el);
    await el.updateComplete;
    vi.useFakeTimers();

    try {
      el.fsl = 'first -> source;';
      el.rebuilt();
      await vi.advanceTimersByTimeAsync(PERMALINK_WRITE_DEBOUNCE_MS);
      firstEncode.resolve('first-segment');
      await Promise.resolve();
      expect(location.hash).toBe('#k16=first-segment');

      el.fsl = 'second -> source;';
      el.rebuilt();
      await vi.advanceTimersByTimeAsync(PERMALINK_WRITE_DEBOUNCE_MS);
      history.replaceState(history.state, '', '#k16=first-segment&other=0ZZZ');
      window.dispatchEvent(new Event('hashchange'));

      secondEncode.resolve('second-segment');
      await Promise.resolve();
      expect(location.hash).toContain('k16=second-segment');
      expect(location.hash).toContain('other=0ZZZ');
    } finally {
      el.remove();
      vi.useRealTimers();
    }
  });

  it('drops a write when the actual segment changes before hashchange dispatch', async () => {
    const pendingEncode = deferred<string>();
    vi.mocked(encode_machine).mockImplementation(source => {
      if (source === 'local -> source;') { return pendingEncode.promise; }
      throw new Error(`unexpected source: ${source}`);
    });
    const el = document.createElement('plk-host') as Host;
    el.id = 'k18'; el.fsl = 'local -> source;';
    document.body.appendChild(el);
    await el.updateComplete;
    vi.useFakeTimers();

    try {
      el.rebuilt();
      await vi.advanceTimersByTimeAsync(PERMALINK_WRITE_DEBOUNCE_MS);
      expect(encode_machine).toHaveBeenCalledWith('local -> source;');

      history.replaceState(history.state, '', '#k18=remote-segment');
      pendingEncode.resolve('local-segment');
      await Promise.resolve();

      expect(location.hash).toBe('#k18=remote-segment');
    } finally {
      el.remove();
      vi.useRealTimers();
    }
  });

  it('drops a write whose encode finishes after the host disconnects', async () => {
    const pendingEncode = deferred<string>();
    vi.mocked(encode_machine).mockImplementation(source => {
      if (source === 'pending -> source;') { return pendingEncode.promise; }
      throw new Error(`unexpected source: ${source}`);
    });
    const el = document.createElement('plk-host') as Host;
    el.id = 'k10'; el.fsl = 'pending -> source;';
    document.body.appendChild(el);
    await el.updateComplete;
    const spy = vi.spyOn(history, 'replaceState');
    vi.useFakeTimers();

    try {
      el.rebuilt();
      await vi.advanceTimersByTimeAsync(PERMALINK_WRITE_DEBOUNCE_MS);
      expect(encode_machine).toHaveBeenCalledWith('pending -> source;');
      el.remove();

      pendingEncode.resolve('disconnected-segment');
      await Promise.resolve();
      expect(spy).not.toHaveBeenCalled();
      expect(location.hash).toBe('');
    } finally {
      el.remove();
      vi.useRealTimers();
    }
  });

  it('leaves the URL unchanged when a scheduled encode rejects', async () => {
    vi.mocked(encode_machine).mockRejectedValue(new Error('compression unavailable'));
    history.replaceState(history.state, '', '#other=0ZZZ');
    const el = document.createElement('plk-host') as Host;
    el.id = 'k19'; el.fsl = 'local -> source;';
    document.body.appendChild(el);
    await el.updateComplete;
    const spy = vi.spyOn(history, 'replaceState');
    vi.useFakeTimers();

    try {
      el.rebuilt();
      await vi.advanceTimersByTimeAsync(PERMALINK_WRITE_DEBOUNCE_MS);
      await Promise.resolve();

      expect(encode_machine).toHaveBeenCalledWith('local -> source;');
      expect(spy).not.toHaveBeenCalled();
      expect(location.hash).toBe('#other=0ZZZ');
    } finally {
      el.remove();
      vi.useRealTimers();
    }
  });

  it('lets a newer external restore supersede an older in-flight write', async () => {
    const localEncode = deferred<string>();
    const remoteDecode = deferred<string>();
    vi.mocked(encode_machine).mockImplementation(source => {
      if (source === 'local -> source;') { return localEncode.promise; }
      throw new Error(`unexpected source: ${source}`);
    });
    vi.mocked(decode_machine).mockImplementation(segment => {
      if (segment === 'remote-segment') { return remoteDecode.promise; }
      throw new Error(`unexpected segment: ${segment}`);
    });
    const el = document.createElement('plk-host') as Host;
    el.id = 'k11';
    document.body.appendChild(el);
    await el.updateComplete;
    vi.useFakeTimers();

    try {
      el.fsl = 'local -> source;';
      el.rebuilt();
      await vi.advanceTimersByTimeAsync(PERMALINK_WRITE_DEBOUNCE_MS);
      expect(encode_machine).toHaveBeenCalledWith('local -> source;');

      history.replaceState(history.state, '', '#k11=remote-segment');
      window.dispatchEvent(new Event('hashchange'));
      expect(decode_machine).toHaveBeenCalledWith('remote-segment');

      remoteDecode.resolve('remote -> source;');
      await Promise.resolve();
      expect(el.fsl).toBe('remote -> source;');

      localEncode.resolve('local-segment');
      await Promise.resolve();
      expect(location.hash).toBe('#k11=remote-segment');
    } finally {
      el.remove();
      vi.useRealTimers();
    }
  });

  it('lets a newer source write supersede an older in-flight restore', async () => {
    const remoteDecode = deferred<string>();
    const localEncode = deferred<string>();
    vi.mocked(decode_machine).mockImplementation(segment => {
      if (segment === 'remote-segment') { return remoteDecode.promise; }
      throw new Error(`unexpected segment: ${segment}`);
    });
    vi.mocked(encode_machine).mockImplementation(source => {
      if (source === 'local -> source;') { return localEncode.promise; }
      throw new Error(`unexpected source: ${source}`);
    });
    history.replaceState(history.state, '', '#k12=remote-segment');
    const el = document.createElement('plk-host') as Host;
    el.id = 'k12'; el.fsl = 'declared -> only;';
    document.body.appendChild(el);
    expect(decode_machine).toHaveBeenCalledWith('remote-segment');
    vi.useFakeTimers();

    try {
      el.fsl = 'local -> source;';
      el.rebuilt();
      await vi.advanceTimersByTimeAsync(PERMALINK_WRITE_DEBOUNCE_MS);
      expect(encode_machine).toHaveBeenCalledWith('local -> source;');

      localEncode.resolve('local-segment');
      await Promise.resolve();
      expect(location.hash).toBe('#k12=local-segment');

      remoteDecode.resolve('remote -> source;');
      await Promise.resolve();
      expect(el.fsl).toBe('local -> source;');
      expect(location.hash).toBe('#k12=local-segment');
    } finally {
      el.remove();
      vi.useRealTimers();
    }
  });

  it('writes its segment via replaceState on rebuilt, preserving siblings', async () => {
    history.replaceState(history.state, '', '#other=0ZZZ');
    const spy = vi.spyOn(history, 'replaceState');
    const el = document.createElement('plk-host') as Host;
    el.id = 'k2'; el.fsl = 'p -> q;';
    document.body.append(el);
    await el.updateComplete;
    el.rebuilt();
    await waitFor(() => spy.mock.calls.length > 0);  // debounce + async encode; wait for the write, don't race a fixed sleep
    expect(spy).toHaveBeenCalled();
    const url = spy.mock.calls.at(-1)![2] as string;
    expect(url).toContain('other=0ZZZ');           // sibling preserved
    expect(url).toContain('k2=');                  // our segment written
    el.remove();
  });

  it('restores when the fragment changes externally (hashchange)', async () => {
    const el = document.createElement('plk-host') as Host;
    el.id = 'k3'; el.fsl = 'start -> here;';
    document.body.append(el);
    await el.updateComplete;
    await tick(20);

    const seg = await encode_machine('Up -> Down;');
    history.replaceState(history.state, '', `#k3=${seg}`);
    dispatchEvent(new Event('hashchange'));
    await tick(20);
    expect(el.fsl).toBe('Up -> Down;');
    el.remove();
  });

  it('coalesces rapid rebuilds into a single debounced write', async () => {
    const el = document.createElement('plk-host') as Host;
    el.id = 'k6'; el.fsl = 'a -> b;';
    document.body.append(el);
    await el.updateComplete;
    const spy = vi.spyOn(history, 'replaceState');
    el.rebuilt();                                  // schedules a write (timer set)
    el.rebuilt();                                  // second call clears the pending timer, reschedules
    await waitFor(() => spy.mock.calls.length > 0); // wait for the single coalesced write
    await tick(350);                               // margin: an erroneous second write would land here
    expect(spy).toHaveBeenCalledTimes(1);          // the two rebuilds collapse into one write
    el.remove();
  });

  it('is inert with no id and no uhash', async () => {
    const spy = vi.spyOn(history, 'replaceState');
    const el = document.createElement('plk-host') as Host;
    el.fsl = 'p -> q;';
    document.body.append(el);
    await el.updateComplete;
    el.rebuilt();
    await tick(350);
    expect(spy).not.toHaveBeenCalled();
    el.remove();
  });
});
