# FSL Permalink URL Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make FSL permalinks live and bidirectional — each `<fsl-instance>` reads its own URL-fragment segment on load and writes it back (debounced) as it changes, so multiple machines share one URL.

**Architecture:** Extract the compressed-permalink codec (shipped in #880) out of `fsl_toolbar_wc.ts` into a shared `fsl_permalink.ts`, and add multi-segment fragment merge there. Add a Lit `ReactiveController` (`fsl_permalink_sync.ts`) that `fsl-instance` attaches: it resolves a key (`uhash` attr, else `id`), restores on connect, and writes its segment via debounced `history.replaceState` on `fsl-machine-rebuilt`. The toolbar's Export→Permalink becomes key-aware and merge-aware.

**Tech Stack:** TypeScript, Lit (web components + ReactiveController), Vitest (jsdom env for WC specs), native `CompressionStream('deflate-raw')`.

## Global Constraints

- **No new runtime dependency.** Compression is the native `CompressionStream`/`DecompressionStream` only. jssm keeps its 2 runtime deps.
- **Key resolution:** `uhash` attribute if present, else element `id`; if neither, the instance does **not** participate (no read, no write). Opt-in by identity.
- **Fragment format:** `#<key>=<scheme><payload>` segments joined by `&`; `<scheme>` is `1` (deflated) or `0` (raw); `<payload>` is URL-safe base64 (RFC 4648 §5: `+`→`-`, `/`→`_`, no padding). Default key for the toolbar's single-machine export is `m`.
- **Writes use `history.replaceState`**, never `location.hash =` (no history flooding). Debounce 300 ms.
- **Restore overrides** the declared FSL source. Malformed segments are ignored (declared source stays); never throw to the page.
- **Back-compat:** `fsl_toolbar_wc.ts` must keep exporting `permalink_for` and `fsl_from_permalink` (re-export) so #880's public surface + tests are unchanged.
- **WC specs** start with `// @vitest-environment jsdom`. Iterate a single spec with `npx vitest run --config vitest.spec.config.ts --coverage.enabled=false <name>`; run the full `npm run vitest-spec` before the final build (a single-file coverage run trips the 100% global gate).
- **Commit style:** Conventional Commits. Do not hand-bump the version; the final `/sc-commit` does that.

## File Structure

- **Create** `src/ts/wc/fsl_permalink.ts` — codec (`bytes_to_base64url`, `base64url_to_bytes`, `deflate_raw`, `inflate_raw`, `encode_machine`, `decode_machine`), fragment ops (`read_fragment_param`, `set_fragment_param`), and `location`-bound wrappers (`permalink_for`, `fsl_from_permalink`). One responsibility: the permalink wire format.
- **Create** `src/ts/wc/tests/fsl_permalink.spec.ts` — pure unit tests (no DOM needed, but jsdom is fine).
- **Create** `src/ts/wc/fsl_permalink_sync.ts` — `permalink_key_for(host)` + `FslPermalinkSync` ReactiveController. One responsibility: bind an instance to its fragment segment.
- **Create** `src/ts/wc/tests/fsl_permalink_sync.spec.ts` — jsdom tests for the controller.
- **Modify** `src/ts/wc/fsl_toolbar_wc.ts` — delete the moved codec; import from `fsl_permalink.js`; re-export `permalink_for`/`fsl_from_permalink`; make `_export('permalink')` key-aware.
- **Modify** `src/ts/wc/tests/fsl_toolbar_wc.spec.ts` — assert Export→Permalink merges rather than clobbers.
- **Modify** `src/ts/wc/fsl_instance_wc.ts` — attach the controller in the constructor.

---

### Task 1: Extract the codec + add fragment ops into `fsl_permalink.ts`

Move the #880 codec verbatim and add the two fragment functions and key-aware wrappers. The toolbar keeps working via re-export (Task 2 finishes the toolbar edits; this task leaves the toolbar importing from the new module).

**Files:**
- Create: `src/ts/wc/fsl_permalink.ts`
- Create: `src/ts/wc/tests/fsl_permalink.spec.ts`
- Modify: `src/ts/wc/fsl_toolbar_wc.ts` (replace moved functions with a re-export import)

**Interfaces:**
- Produces:
  - `DEFAULT_PERMALINK_KEY: 'm'`
  - `bytes_to_base64url(bytes: Uint8Array): string`
  - `base64url_to_bytes(text: string): Uint8Array`
  - `deflate_raw(bytes: Uint8Array): Promise<Uint8Array>`
  - `inflate_raw(bytes: Uint8Array): Promise<Uint8Array>`
  - `encode_machine(fsl: string): Promise<string>` — returns `<scheme><payload>`
  - `decode_machine(segment: string): Promise<string>`
  - `read_fragment_param(hash: string, key: string): string | null`
  - `set_fragment_param(hash: string, key: string, value: string): string` — returns the fragment body **without** a leading `#`
  - `permalink_for(fsl: string, key?: string, href?: string, currentHash?: string): Promise<string>`
  - `fsl_from_permalink(url: string, key?: string): Promise<string | null>`

- [ ] **Step 1: Write the failing test** — `src/ts/wc/tests/fsl_permalink.spec.ts`

```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  encode_machine, decode_machine,
  read_fragment_param, set_fragment_param,
  permalink_for, fsl_from_permalink,
} from '../fsl_permalink.js';

describe('fsl_permalink codec', () => {
  it('round-trips machines exactly, including Unicode and long compressible FSL', async () => {
    for (const fsl of [
      'a -> b;',
      "A 'go' -> B; B 'back' -> A;",
      'café ☕ → ★;',
      "Green 'next' -> Yellow 'next' -> Red 'next' -> Green;\nRed ~> Off;".repeat(5),
    ]) {
      const seg = await encode_machine(fsl);
      expect(seg).toMatch(/^[01][A-Za-z0-9_-]*$/);          // scheme tag + URL-safe alphabet
      expect(await decode_machine(seg)).toBe(fsl);
    }
  });

  it('tags long input compressed (1) and never grows a short one past raw', async () => {
    const big = "Green 'next' -> Yellow 'next' -> Red 'next' -> Green;\nRed ~> Off;".repeat(5);
    expect((await encode_machine(big))[0]).toBe('1');
    const small = await encode_machine('a -> b;');
    expect(small[0]).toBe('0');                              // raw beat deflate on a tiny string
  });
});

describe('fsl_permalink fragment ops', () => {
  it('reads a named segment and returns null when absent', () => {
    expect(read_fragment_param('#a=0AAA&b=1BBB', 'b')).toBe('1BBB');
    expect(read_fragment_param('a=0AAA', 'a')).toBe('0AAA');   // leading # optional
    expect(read_fragment_param('#a=0AAA', 'z')).toBeNull();
    expect(read_fragment_param('', 'a')).toBeNull();
  });

  it('sets a segment while preserving siblings and order', () => {
    expect(set_fragment_param('#a=0AAA&b=1BBB', 'b', '1CCC')).toBe('a=0AAA&b=1CCC');
    expect(set_fragment_param('#a=0AAA', 'b', '1BBB')).toBe('a=0AAA&b=1BBB');   // append
    expect(set_fragment_param('', 'a', '0AAA')).toBe('a=0AAA');
  });
});

describe('fsl_permalink location wrappers', () => {
  it('permalink_for merges into an existing fragment under the given key', async () => {
    const url = await permalink_for('a -> b;', 'b', 'https://host/p', '#a=0XXX');
    expect(url.startsWith('https://host/p#')).toBe(true);
    expect(read_fragment_param(url, 'a')).toBe('0XXX');        // sibling preserved
    expect(await fsl_from_permalink(url, 'b')).toBe('a -> b;'); // our key round-trips
  });

  it('defaults to key m and round-trips', async () => {
    const url = await permalink_for('a -> b;', undefined, 'https://host/p', '');
    expect(url).toContain('#m=');
    expect(await fsl_from_permalink(url)).toBe('a -> b;');
  });

  it('fsl_from_permalink returns null when the key is absent', async () => {
    expect(await fsl_from_permalink('https://host/p', 'm')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --config vitest.spec.config.ts --coverage.enabled=false fsl_permalink.spec`
Expected: FAIL — cannot resolve `../fsl_permalink.js`.

- [ ] **Step 3: Write the module** — `src/ts/wc/fsl_permalink.ts`

```ts
/**
 * Compressed, URL-safe permalink wire format for FSL machines, shared by the
 * toolbar's Export→Permalink and the per-instance URL sync controller.
 *
 * A machine is encoded to a `<scheme><payload>` segment: `<payload>` is URL-safe
 * base64, `<scheme>` is `1` when DEFLATE shrank the source and `0` for the raw
 * bytes when it did not (so a short machine's link never grows). Segments live in
 * a URL fragment as `#<key>=<segment>` joined by `&`, so several machines can
 * share one URL.
 */

/** Default fragment key for the single-machine case (back-compat with 5.150). */
export const DEFAULT_PERMALINK_KEY = 'm';

/**
 * URL-safe base64 (RFC 4648 §5) of raw bytes: standard base64 with `+`→`-`,
 * `/`→`_`, and trailing `=` padding stripped.
 *
 * @example
 * bytes_to_base64url(new TextEncoder().encode("a")); // "YQ"
 */
export function bytes_to_base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) { binary += String.fromCharCode(byte); }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Inverse of {@link bytes_to_base64url}.
 *
 * @example
 * new TextDecoder().decode(base64url_to_bytes("YQ")); // "a"
 */
export function base64url_to_bytes(text: string): Uint8Array {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) { bytes[i] = binary.charCodeAt(i); }
  return bytes;
}

/** DEFLATE `bytes` (raw, headerless) via the platform `CompressionStream`. */
export async function deflate_raw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new CompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  void writer.write(bytes);
  void writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

/** Inverse of {@link deflate_raw}. */
export async function inflate_raw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new DecompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  void writer.write(bytes);
  void writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

/**
 * Encode FSL to a `<scheme><payload>` segment value (the part after `key=`).
 * DEFLATE is used (scheme `1`) only when it is strictly shorter than the raw
 * bytes (scheme `0`).
 *
 * @example
 * await encode_machine("a -> b;"); // "0YSAtPiBiOw"
 */
export async function encode_machine(fsl: string): Promise<string> {
  const utf8     = new TextEncoder().encode(fsl);
  const raw      = bytes_to_base64url(utf8);
  const deflated = bytes_to_base64url(await deflate_raw(utf8));
  return deflated.length < raw.length ? `1${deflated}` : `0${raw}`;
}

/**
 * Inverse of {@link encode_machine}: decode a `<scheme><payload>` segment back
 * to FSL. Async because inflate is async.
 *
 * @example
 * await decode_machine("0YSAtPiBiOw"); // "a -> b;"
 */
export async function decode_machine(segment: string): Promise<string> {
  const scheme  = segment[0];
  const bytes   = base64url_to_bytes(segment.slice(1));
  const plain   = scheme === '1' ? await inflate_raw(bytes) : bytes;
  return new TextDecoder().decode(plain);
}

/** Split a fragment (leading `#` optional) into `[key, value]` pairs, dropping empties. */
function fragment_pairs(hash: string): Array<[string, string]> {
  const body = hash.startsWith('#') ? hash.slice(1) : hash;
  return body.split('&').filter(Boolean).map(seg => {
    const eq = seg.indexOf('=');
    return eq === -1 ? [seg, ''] as [string, string] : [seg.slice(0, eq), seg.slice(eq + 1)] as [string, string];
  });
}

/**
 * Read one segment's value out of a `#a=…&b=…` fragment.
 *
 * @returns The value, or `null` if `key` is absent.
 *
 * @example
 * read_fragment_param('#a=0AAA&b=1BBB', 'b'); // "1BBB"
 */
export function read_fragment_param(hash: string, key: string): string | null {
  const found = fragment_pairs(hash).find(([k]) => k === key);
  return found ? found[1] : null;
}

/**
 * Return a new fragment body (no leading `#`) with `key`'s segment set to
 * `value`, preserving every other segment and its order; appends if absent.
 *
 * @example
 * set_fragment_param('#a=0AAA', 'b', '1BBB'); // "a=0AAA&b=1BBB"
 */
export function set_fragment_param(hash: string, key: string, value: string): string {
  const pairs = fragment_pairs(hash);
  const at    = pairs.findIndex(([k]) => k === key);
  if (at === -1) { pairs.push([key, value]); } else { pairs[at] = [key, value]; }
  return pairs.map(([k, v]) => `${k}=${v}`).join('&');
}

/**
 * A shareable URL for `fsl` under `key`, merging into `currentHash` so sibling
 * machines' segments survive. Browser-defaulted (`location`) but injectable for
 * tests.
 *
 * @returns The absolute URL carrying the merged fragment.
 *
 * @example
 * await permalink_for('a -> b;', 'm', 'https://h/p', ''); // "https://h/p#m=0YSAtPiBiOw"
 *
 * @see fsl_from_permalink
 */
export async function permalink_for(
  fsl: string,
  key: string = DEFAULT_PERMALINK_KEY,
  href: string = location.href,
  currentHash: string = location.hash,
): Promise<string> {
  const segment  = await encode_machine(fsl);
  const fragment = set_fragment_param(currentHash, key, segment);
  return `${href.split('#')[0]}#${fragment}`;
}

/**
 * Recover the FSL for `key` from a permalink URL (or bare fragment).
 *
 * @returns The decoded FSL, or `null` if the fragment has no `key` segment.
 *
 * @example
 * await fsl_from_permalink('https://h/p#m=0YSAtPiBiOw'); // "a -> b;"
 *
 * @see permalink_for
 */
export async function fsl_from_permalink(
  url: string,
  key: string = DEFAULT_PERMALINK_KEY,
): Promise<string | null> {
  const hash    = url.includes('#') ? url.slice(url.indexOf('#')) : url;
  const segment = read_fragment_param(hash, key);
  return segment === null ? null : decode_machine(segment);
}
```

- [ ] **Step 4: Point the toolbar at the new module** — `src/ts/wc/fsl_toolbar_wc.ts`

Delete the `PERMALINK_HASH_KEY` const and the functions `bytes_to_base64url`, `base64url_to_bytes`, `deflate_raw`, `inflate_raw`, `permalink_for`, `fsl_from_permalink` (everything #880 added between the `EXPORT_FORMATS` array and `embed_snippet_for`). Replace with a re-export near the top imports:

```ts
// Permalink codec lives in its own module; re-exported so existing importers
// (and tests) keep resolving these from the toolbar.
export { permalink_for, fsl_from_permalink } from './fsl_permalink.js';
```

Leave `embed_snippet_for` and `_export`'s `await permalink_for(host.fsl)` call untouched (Task 2 makes the call key-aware).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run --config vitest.spec.config.ts --coverage.enabled=false fsl_permalink.spec fsl_toolbar_wc.spec`
Expected: PASS (new codec suite + the unchanged #880 toolbar suite via re-export).

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no output (clean).

- [ ] **Step 7: Commit**

```bash
git add src/ts/wc/fsl_permalink.ts src/ts/wc/tests/fsl_permalink.spec.ts src/ts/wc/fsl_toolbar_wc.ts
git commit -m "refactor(wc): extract permalink codec to fsl_permalink.ts and add fragment merge"
```

---

### Task 2: Make Export→Permalink key-aware and merging

The toolbar's `_export('permalink')` currently calls `permalink_for(host.fsl)` (key `m`, clobbers the fragment). Make it resolve the host instance's key and merge.

**Files:**
- Modify: `src/ts/wc/fsl_toolbar_wc.ts` (the `_export` method)
- Modify: `src/ts/wc/tests/fsl_toolbar_wc.spec.ts`

**Interfaces:**
- Consumes: `permalink_for(fsl, key?, href?, currentHash?)`, `permalink_key_for(host)` (Task 3 — but the import is added here; if Task 3 is not yet done, define `permalink_key_for` inline in `fsl_permalink_sync.ts` first, or implement the two-line resolver in Task 3 before this step). To keep tasks independent, this task uses a local resolver expression instead of importing.

- [ ] **Step 1: Write the failing test** — append to `src/ts/wc/tests/fsl_toolbar_wc.spec.ts` inside the existing `describe('<fsl-toolbar>', …)`

```ts
it('exports a permalink that merges into an existing fragment under the host key', async () => {
  history.replaceState(history.state, '', '#other=0ZZZ');   // a sibling segment already present
  const host = document.createElement('fsl-instance') as FslInstance;
  host.id = 'mykey';
  host.setAttribute('fsl', 'a -> b;');
  const vizStub = document.createElement('div'); vizStub.setAttribute('slot', 'viz');
  const toolbar = document.createElement('fsl-toolbar') as FslToolbar;
  toolbar.setAttribute('slot', 'toolbar');
  host.append(vizStub, toolbar);
  document.body.appendChild(host);
  await host.updateComplete; await toolbar.updateComplete;

  const detail = new Promise<{ content: string }>(res =>
    toolbar.addEventListener('fsl-export', e => res((e as CustomEvent).detail), { once: true }));
  byLabel(toolbar, 'Export').click();
  await toolbar.updateComplete;
  byText(toolbar, '.menu button', 'Permalink (URL)').click();
  const { content } = await detail;

  expect(content).toContain('#');
  expect(content).toContain('other=0ZZZ');   // sibling preserved
  expect(content).toContain('mykey=');        // host id used as key
  host.remove();
  history.replaceState(history.state, '', location.pathname);  // clean up
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --config vitest.spec.config.ts --coverage.enabled=false fsl_toolbar_wc.spec`
Expected: FAIL — content uses key `m` and drops `other=0ZZZ`.

- [ ] **Step 3: Make `_export` key-aware** — `src/ts/wc/fsl_toolbar_wc.ts`

Replace the permalink branch in `_export`:

```ts
    } else if (format === 'permalink') {
      const key = host.getAttribute('uhash') ?? host.getAttribute('id') ?? undefined;
      content = await permalink_for(host.fsl, key);
```

(`host` is the `HostTarget`, an `HTMLElement`, so `getAttribute` is available. Passing `undefined` falls back to `DEFAULT_PERMALINK_KEY`.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --config vitest.spec.config.ts --coverage.enabled=false fsl_toolbar_wc.spec`
Expected: PASS.

- [ ] **Step 5: Type-check, then commit**

Run: `npx tsc --noEmit -p tsconfig.json` (expect clean)

```bash
git add src/ts/wc/fsl_toolbar_wc.ts src/ts/wc/tests/fsl_toolbar_wc.spec.ts
git commit -m "feat(wc): Export→Permalink uses the instance key and merges the fragment"
```

---

### Task 3: The sync controller `fsl_permalink_sync.ts`

A `ReactiveController` that binds one instance to its fragment segment.

**Files:**
- Create: `src/ts/wc/fsl_permalink_sync.ts`
- Create: `src/ts/wc/tests/fsl_permalink_sync.spec.ts`

**Interfaces:**
- Consumes: `encode_machine`, `decode_machine`, `read_fragment_param`, `set_fragment_param` from `fsl_permalink.js`.
- Produces:
  - `permalink_key_for(host: HTMLElement): string | null`
  - `PERMALINK_WRITE_DEBOUNCE_MS: number` (300)
  - `class FslPermalinkSync implements ReactiveController` with `constructor(host)`, `hostConnected()`, `hostDisconnected()`.

- [ ] **Step 1: Write the failing test** — `src/ts/wc/tests/fsl_permalink_sync.spec.ts`

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LitElement } from 'lit';
import { permalink_key_for, FslPermalinkSync } from '../fsl_permalink_sync.js';
import { encode_machine } from '../fsl_permalink.js';

// Minimal host: a LitElement carrying `fsl`, firing `fsl-machine-rebuilt` on demand.
class Host extends LitElement {
  fsl = '';
  constructor() { super(); new FslPermalinkSync(this as unknown as HTMLElement & { fsl: string }); }
  rebuilt() { this.dispatchEvent(new CustomEvent('fsl-machine-rebuilt', { bubbles: true, composed: true })); }
}
if (!customElements.get('plk-host')) customElements.define('plk-host', Host);

beforeEach(() => { history.replaceState(history.state, '', location.pathname); vi.restoreAllMocks(); });

describe('permalink_key_for', () => {
  it('prefers uhash, falls back to id, else null', () => {
    const a = document.createElement('div'); a.id = 'i'; expect(permalink_key_for(a)).toBe('i');
    const b = document.createElement('div'); b.id = 'i'; b.setAttribute('uhash', 'u'); expect(permalink_key_for(b)).toBe('u');
    expect(permalink_key_for(document.createElement('div'))).toBeNull();
  });
});

describe('FslPermalinkSync', () => {
  it('restores fsl from the fragment on connect, overriding the declared source', async () => {
    const seg = await encode_machine('x -> y;');
    history.replaceState(history.state, '', `#k1=${seg}`);
    const el = document.createElement('plk-host') as Host;
    el.id = 'k1'; el.fsl = 'declared -> only;';
    document.body.appendChild(el);
    await el.updateComplete;
    await Promise.resolve();                       // let the async restore settle
    expect(el.fsl).toBe('x -> y;');
    el.remove();
  });

  it('writes its segment via replaceState on rebuilt, preserving siblings', async () => {
    history.replaceState(history.state, '', '#other=0ZZZ');
    const spy = vi.spyOn(history, 'replaceState');
    const el = document.createElement('plk-host') as Host;
    el.id = 'k2'; el.fsl = 'p -> q;';
    document.body.appendChild(el);
    await el.updateComplete;
    el.rebuilt();
    await new Promise(r => setTimeout(r, 350));    // past the 300ms debounce
    expect(spy).toHaveBeenCalled();
    const url = spy.mock.calls.at(-1)![2] as string;
    expect(url).toContain('other=0ZZZ');           // sibling preserved
    expect(url).toContain('k2=');                  // our segment written
    el.remove();
  });

  it('is inert with no id and no uhash', async () => {
    const spy = vi.spyOn(history, 'replaceState');
    const el = document.createElement('plk-host') as Host;
    el.fsl = 'p -> q;';
    document.body.appendChild(el);
    await el.updateComplete;
    el.rebuilt();
    await new Promise(r => setTimeout(r, 350));
    expect(spy).not.toHaveBeenCalled();
    el.remove();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --config vitest.spec.config.ts --coverage.enabled=false fsl_permalink_sync.spec`
Expected: FAIL — cannot resolve `../fsl_permalink_sync.js`.

- [ ] **Step 3: Write the controller** — `src/ts/wc/fsl_permalink_sync.ts`

```ts
import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { encode_machine, decode_machine, read_fragment_param, set_fragment_param } from './fsl_permalink.js';

/** Debounce before a live edit is written to the URL fragment. */
export const PERMALINK_WRITE_DEBOUNCE_MS = 300;

/** The host element this controller drives: a Lit host exposing a string `fsl`. */
type SyncHost = ReactiveControllerHost & HTMLElement & { fsl: string };

/**
 * The fragment key an instance owns: its `uhash` attribute if set, else its
 * `id`, else `null` (does not participate in URL sync).
 *
 * @example
 * permalink_key_for(el); // "myId"  (when <el id="myId">)
 */
export function permalink_key_for(host: HTMLElement): string | null {
  return host.getAttribute('uhash') ?? host.getAttribute('id') ?? null;
}

/**
 * Binds an `<fsl-instance>` to a segment of the URL fragment: restores from it
 * on connect and writes back (debounced, via `history.replaceState`) whenever
 * the machine is rebuilt. Inert when the host has no key.
 *
 * Echo guard: `_last` holds the segment we most recently read or wrote, so a
 * restore→rebuild→write cycle and a self-induced `hashchange` are both no-ops.
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
    if (this._timer !== undefined) { clearTimeout(this._timer); }
  }

  /** Read our segment and, if new, push it into the host (overriding declared source). */
  private async _restore(): Promise<void> {
    const segment = read_fragment_param(location.hash, this.key!);
    if (segment === null || segment === this._last) { return; }
    try {
      const fsl = await decode_machine(segment);
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --config vitest.spec.config.ts --coverage.enabled=false fsl_permalink_sync.spec`
Expected: PASS (3 cases).

- [ ] **Step 5: Type-check, then commit**

Run: `npx tsc --noEmit -p tsconfig.json` (expect clean)

```bash
git add src/ts/wc/fsl_permalink_sync.ts src/ts/wc/tests/fsl_permalink_sync.spec.ts
git commit -m "feat(wc): add FslPermalinkSync controller (read on connect, debounced replaceState writes)"
```

---

### Task 4: Wire the controller into `fsl-instance`

**Files:**
- Modify: `src/ts/wc/fsl_instance_wc.ts`
- Modify: `src/ts/wc/tests/fsl_instance_wc.spec.ts` (or the nearest existing instance spec — confirm filename with `ls src/ts/wc/tests`)

**Interfaces:**
- Consumes: `FslPermalinkSync` from `fsl_permalink_sync.js`.

- [ ] **Step 1: Write the failing integration test** — append to the existing instance spec (jsdom)

```ts
it('restores its machine from the URL fragment when given an id', async () => {
  const { encode_machine } = await import('../fsl_permalink.js');
  const seg = await encode_machine('Up -> Down;');
  history.replaceState(history.state, '', `#mach=${seg}`);
  const el = document.createElement('fsl-instance') as FslInstance;
  el.id = 'mach';
  el.setAttribute('fsl', 'Left -> Right;');        // declared source — should be overridden
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise(r => setTimeout(r, 0));
  expect(el.fsl).toBe('Up -> Down;');
  el.remove();
  history.replaceState(history.state, '', location.pathname);
});
```

(Confirm the spec's existing imports include `FslInstance`; if the file uses a different element variable, match it. If there is no instance spec yet, create `src/ts/wc/tests/fsl_instance_wc.spec.ts` with the `// @vitest-environment jsdom` pragma, the `beforeAll` define block mirroring `fsl_toolbar_wc.spec.ts`, and this test.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --config vitest.spec.config.ts --coverage.enabled=false fsl_instance_wc.spec`
Expected: FAIL — `el.fsl` is still `'Left -> Right;'` (no controller attached).

- [ ] **Step 3: Attach the controller** — `src/ts/wc/fsl_instance_wc.ts`

Add the import near the other `./` imports:

```ts
import { FslPermalinkSync } from './fsl_permalink_sync.js';
```

`FslInstance` has no explicit constructor today (confirmed: no `constructor(` match). Add one that attaches the controller; Lit calls `hostConnected` on `connectedCallback` automatically:

```ts
  constructor() {
    super();
    new FslPermalinkSync(this);
  }
```

If `tsc` complains that `this` doesn't satisfy `SyncHost` (it requires a `fsl: string`), confirm `fsl` is declared `string` on the class — it is declared `fsl … : string` elsewhere; if it is `string | undefined`, widen the controller's `SyncHost.fsl` to `string | undefined` in `fsl_permalink_sync.ts` and guard `_write` with `if (typeof this.host.fsl !== 'string') return;`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --config vitest.spec.config.ts --coverage.enabled=false fsl_instance_wc.spec`
Expected: PASS.

- [ ] **Step 5: Type-check, then commit**

Run: `npx tsc --noEmit -p tsconfig.json` (expect clean)

```bash
git add src/ts/wc/fsl_instance_wc.ts src/ts/wc/tests/fsl_instance_wc.spec.ts
git commit -m "feat(wc): fsl-instance restores from and writes to the URL fragment"
```

---

### Task 5: Full suite, README/docs regen, release commit, PR

**Files:** all generated artifacts (handled by the build); no hand edits.

- [ ] **Step 1: Run the full spec suite (coverage gate)**

Run: `npm run vitest-spec`
Expected: PASS, coverage 100% (new files fully covered by their specs). If a branch in `_restore`/`_write`'s `catch` reads as uncovered, add a spec that forces a throw (e.g. stub `decode_machine` to reject) rather than lowering coverage.

- [ ] **Step 2: Check IDE diagnostics**

Confirm no lints/deprecations on the new/changed files (the user requires this before "done").

- [ ] **Step 3: `/sc-commit`**

Invoke `/sc-commit` on `feat_26-06-28_permalink-url-sync`: it picks the level (`feat` → minor), bumps the version, runs the full `npm run build`, and commits all regenerated artifacts. If the build fails, stop and report.

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin feat_26-06-28_permalink-url-sync
gh pr create --base main --head feat_26-06-28_permalink-url-sync \
  --title "feat(wc): live, per-instance permalink URL sync" \
  --body-file <pr-body>
```

PR body: summarize the hash reader, `uhash`/`id` keying, multi-machine fragment, and link the spec. Do **not** merge (protected main = release); hand back to the user.

---

## Self-Review

**Spec coverage:**
- Hash reader → Task 3 `_restore` + Task 4 wiring. ✓
- `uhash ?? id`, inert otherwise → `permalink_key_for` (Task 3), tested. ✓
- Multi-segment merge → `set_fragment_param`/`read_fragment_param` (Task 1), used by toolbar (Task 2) and controller (Task 3). ✓
- Live bidirectional + `replaceState` + 300 ms debounce → Task 3 `_scheduleWrite`/`_write`. ✓
- Restore overrides declared source → Task 3/4 tests assert override. ✓
- Error handling (malformed segment, no compression) → `_restore`/`_write` `catch`, Task 5 Step 1 forces coverage. ✓
- `hashchange` restore → controller wires `_onHashChange`; **coverage note:** add a case in `fsl_permalink_sync.spec.ts` dispatching `window` `hashchange` after mutating the fragment and asserting `el.fsl` updates, so the listener isn't uncovered. (Add to Task 3 Step 1 if pursuing 100% before Task 5.)
- Back-compat re-export → Task 1 Step 4, verified by the unchanged #880 toolbar suite. ✓
- Toolbar export merge → Task 2. ✓

**Placeholder scan:** none — all steps carry real code/commands.

**Type consistency:** `encode_machine`/`decode_machine` return the `<scheme><payload>` string ↔ `read/set_fragment_param` operate on that same value; `permalink_key_for` returns `string | null` and both consumers handle `null`; `permalink_for(fsl, key?, href?, currentHash?)` signature matches Task 1 definition and Task 2 call (`permalink_for(host.fsl, key)`).

**One fix folded in:** the `hashchange` coverage case is called out above; include it in `fsl_permalink_sync.spec.ts` to keep the 100% gate green.
