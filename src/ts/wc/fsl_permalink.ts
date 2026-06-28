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
  const scheme = segment[0];
  const bytes  = base64url_to_bytes(segment.slice(1));
  const plain  = scheme === '1' ? await inflate_raw(bytes) : bytes;
  return new TextDecoder().decode(plain);
}

/** Split a fragment (leading `#` optional) into `[key, value]` pairs, dropping empties. */
function fragment_pairs(hash: string): Array<[string, string]> {
  const body = hash.startsWith('#') ? hash.slice(1) : hash;
  return body.split('&').filter(Boolean).map(seg => {
    const eq = seg.indexOf('=');
    return eq === -1
      ? ([seg, ''] as [string, string])
      : ([seg.slice(0, eq), seg.slice(eq + 1)] as [string, string]);
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
 * The fragment key an element owns: its `uhash` attribute if set, else its
 * `id`, else `null` (does not participate in URL sync). The single source of
 * this rule, shared by the toolbar export and the sync controller.
 *
 * @example
 * permalink_key_for(el); // "myId"  (when <el id="myId">, no uhash)
 */
export function permalink_key_for(host: HTMLElement): string | null {
  return host.getAttribute('uhash') ?? host.getAttribute('id') ?? null;
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
