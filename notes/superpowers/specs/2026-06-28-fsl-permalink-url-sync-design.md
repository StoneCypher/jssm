# FSL permalink URL sync — design

**Date:** 2026-06-28
**Branch context:** builds on `feat_26-06-28_permalink-compress` (PR #880), which added the
compressed, URL-safe `#m=<scheme><payload>` permalink codec (`permalink_for` /
`fsl_from_permalink`) to `fsl_toolbar_wc.ts`.

## Purpose

PR #880 made a permalink *encode and decode* correctly, but nothing reads it back: opening a
`#m=…` link in a fresh page does nothing, because no code inspects `location` on load. This
design adds the missing **hash reader** and turns the permalink into a **live, bidirectional,
per-instance URL binding**, so that:

- opening a permalink restores the machine into its instance, and
- multiple `<fsl-instance>` elements on one page can each own a named segment of the same
  URL fragment, so a single shared URL round-trips every machine on the page.

## Decisions (settled in brainstorming)

1. **Sync model: live, bidirectional.** Each participating instance reads its segment on
   load and rewrites it as its machine changes, via debounced `history.replaceState` (not
   `location.hash =`, which would flood browser history). Copying the URL bar shares all
   machines.
2. **Key resolution: `uhash` attribute, else the element `id`.** An instance with **neither
   `id` nor `uhash` does not participate** — no auto-read, no auto-write. Opt-in is by giving
   the element an identity; a component must not silently hijack `location`.
3. **Fragment is multi-segment:** `#a=<scheme><payload>&b=<scheme><payload>`. Writing one
   segment merges into the existing fragment, never clobbering siblings. (The PR #880 decoder
   regex `(?:^|&)<key>=…` already anticipates this shape.)
4. **Restore overrides the declared source.** When a segment is present for an instance's key,
   its decoded FSL replaces whatever the markup declared (`fsl=` attr / `<script>` / text). A
   permalink is the edited/shared machine; it wins over the page's default.

## Architecture

Three units, each independently testable.

### 1. `src/ts/wc/fsl_permalink.ts` — shared codec + fragment ops (new)

Extracted from `fsl_toolbar_wc.ts` (which re-exports for back-compat) so the toolbar export and
the instance sync share one implementation.

- `bytes_to_base64url(bytes) / base64url_to_bytes(text)` — URL-safe base64 (moved).
- `deflate_raw(bytes) / inflate_raw(bytes)` — native `CompressionStream('deflate-raw')` (moved).
- `encode_machine(fsl): Promise<string>` — produce the `<scheme><payload>` segment value (the
  part after `key=`): DEFLATE when smaller (scheme `1`), else raw (scheme `0`). Pure of
  `location`.
- `decode_machine(segment): Promise<string>` — inverse of `encode_machine`. Async, because
  `inflate_raw` is async; the restore path awaits it (`hostConnected` is async-friendly).
- `read_fragment_param(hash, key): string | null` — pull one segment's value out of a
  `#a=…&b=…` fragment (leading `#` optional).
- `set_fragment_param(hash, key, value): string` — return a new fragment string with `key`'s
  segment set/replaced and all other segments preserved, in stable order.
- `permalink_for(fsl, key?, baseHref?)` and `fsl_from_permalink(url, key?)` — thin wrappers that
  compose the above against `location` (or an injected base), now **key-aware** and
  **merge-aware**. `key` defaults to `m` for back-compat with the shipped single-segment form.

`fsl_toolbar_wc.ts` keeps exporting `permalink_for` / `fsl_from_permalink` (re-export) so PR
#880's public surface and tests are unchanged.

### 2. `src/ts/wc/fsl_permalink_sync.ts` — the sync controller (new)

A Lit `ReactiveController` attached by `fsl-instance`, holding all `location`/`history`/event
wiring so the large `fsl_instance_wc.ts` doesn't grow a new responsibility inline.

- **key** = `host.getAttribute('uhash') ?? host.getAttribute('id')`; if `null`, the controller
  is inert (registers nothing).
- **hostConnected:** read `read_fragment_param(location.hash, key)`; if non-null, `decode_machine`
  it and assign `host.fsl` (triggering the existing `_rebuild_machine`). Wrap in try/catch — a
  malformed segment is ignored, leaving the declared source intact (see Error handling).
- **write:** subscribe to the host's `fsl-machine-rebuilt` event; on fire, debounce (~300 ms)
  then `encode_machine(host.fsl)` and `history.replaceState(history.state, '',
  '#' + set_fragment_param(location.hash, key, segment))`. Guard against echo: don't write a
  value equal to what we last read/wrote.
- **hashchange:** listen on `window`; when our `key`'s segment changes from outside (hand-edited
  URL, a link, back/forward to a non-replaceState entry), re-read and restore.
- **hostDisconnected:** remove all listeners; cancel any pending debounce.

### 3. `fsl_instance_wc.ts` — wire the controller (edit)

`addController(new FslPermalinkSync(this))` in the constructor/`connectedCallback`. No other
behavior change; when the instance has no `id`/`uhash`, the controller is inert and the
component behaves exactly as today.

### 4. `fsl_toolbar_wc.ts` — key-aware export (edit)

`_export('permalink')` resolves the host instance's key (`uhash ?? id ?? 'm'`) and calls the
merge-aware `permalink_for(host.fsl, key)`, so an exported link includes the instance's segment
**merged** into the current fragment rather than replacing it.

## Data flow

```
LOAD:    location.hash  ──read_fragment_param(key)──►  decode_machine  ──►  host.fsl  ──►  _rebuild_machine
EDIT:    editor ► host.fsl ► _rebuild_machine ► 'fsl-machine-rebuilt' ─debounce─► encode_machine ─► set_fragment_param(key) ─► history.replaceState
SHARE:   copy URL bar  ──►  fragment already carries every keyed instance's current state
EXTERNAL: window 'hashchange' ─(our key changed)─► decode_machine ─► host.fsl ─► _rebuild_machine
```

## Error handling

- **Malformed / truncated segment:** `decode_machine` throws → controller swallows, logs nothing
  user-facing, leaves the declared source. A bad URL never bricks the page.
- **`CompressionStream` absent** (very old engine): encode/decode reject. The controller catches;
  reads fall back to declared source, writes are skipped. (This is the same platform floor PR
  #880 already adopted.)
- **Two instances resolving the same key** (duplicate `id`/`uhash`): last writer wins the
  segment; we `console.warn` once per duplicate key at connect. Not an exception — invalid markup
  degrades, doesn't crash.
- **Echo loop:** the last-written-value guard prevents write→hashchange→write cycles.

## Testing

- **`fsl_permalink.spec.ts`** (new, pure): round-trip `encode_machine`/`decode_machine` across
  short/quoted/Unicode/long FSL; `set_fragment_param` preserves siblings and stable order;
  `read_fragment_param` returns `null` for absent keys; multi-segment `#a=…&b=…` parses each key
  independently.
- **`fsl_permalink_sync.spec.ts`** (new, jsdom): given `location.hash` with the instance's key,
  the instance restores on connect; an edit writes the segment (assert `location.hash` via a
  stubbed `history.replaceState`); a sibling key in the fragment is untouched by a write;
  no `id`/`uhash` ⇒ controller inert (no read, no write); `hashchange` restores.
- **`fsl_toolbar_wc.spec.ts`** (extend): Export→Permalink for a keyed host merges into an existing
  fragment instead of clobbering it.
- Existing PR #880 toolbar tests stay green via the re-export.

## Out of scope (YAGNI)

- No `<fsl-permalink>` companion element.
- No compression of the *whole* fragment as a unit (each segment is independently decodable so a
  human can see the key boundaries; per-segment is enough).
- No server-side rendering of permalinks (the fragment is client-only by design — that is the
  whole reason it's a `#`, not a `?`).
- No history *entries* per edit (replaceState only); no undo-via-back.

## Open questions

- **O1 — delivery.** Land this on the same branch (grow PR #880 into "compress + sync") or stack
  a second PR on top of #880? *Leaning: stack a focused follow-up PR so #880 stays a clean,
  reviewable codec unit; merge #880 first, rebase the sync PR onto main.*

## Definition of done

`npm run build` green; new pure + jsdom specs pass; opening a two-machine permalink restores both
instances; editing either updates only its own segment; an anonymous `fsl-instance` is byte-for-byte
unaffected.
