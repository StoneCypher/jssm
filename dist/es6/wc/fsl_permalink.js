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
/**
 * Default fragment key for the single-machine case (back-compat with 5.150).
 * @example
 * DEFAULT_PERMALINK_KEY; // 'm'
 */
export const DEFAULT_PERMALINK_KEY = 'm';
/**
 * URL-safe base64 (RFC 4648 §5) of raw bytes: standard base64 with `+`→`-`,
 * `/`→`_`, and trailing `=` padding stripped.
 * @example
 * bytes_to_base64url(new TextEncoder().encode("a")); // "YQ"
 */
export function bytes_to_base64url(bytes) {
    let binary = '';
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
/**
 * Inverse of {@link bytes_to_base64url}.
 * @example
 * new TextDecoder().decode(base64url_to_bytes("YQ")); // "a"
 */
export function base64url_to_bytes(text) {
    const standard = text.replace(/-/g, '+').replace(/_/g, '/');
    const padded = standard + '='.repeat((4 - (standard.length % 4)) % 4); // atob wants 4-aligned input
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
/**
 * DEFLATE `bytes` (raw, headerless) via the platform `CompressionStream`.
 * @example
 * await deflate_raw(new TextEncoder().encode("aaaaaaaa")); // shorter Uint8Array of raw DEFLATE bytes
 */
export async function deflate_raw(bytes) {
    const stream = new CompressionStream('deflate-raw');
    const writer = stream.writable.getWriter();
    // 6.0.3 made typed arrays generic over their backing buffer; the DOM
    // `BufferSource` wants `Uint8Array<ArrayBuffer>` specifically, so narrow the
    // ArrayBufferLike-backed input at the stream boundary. Runtime is unchanged.
    void writer.write(bytes);
    void writer.close();
    return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}
/**
 * Hard ceiling on the inflated size of a permalink, in bytes. A permalink rides
 * in a URL an attacker can hand a victim, and {@link inflate_raw} runs on it
 * automatically on page load, so an uncapped inflate is a decompression-bomb
 * vector (a tiny `#m=…` could expand to hundreds of MB and OOM the tab). This is
 * generous for real FSL (text — even a vast machine is well under a megabyte).
 */
export const MAX_PERMALINK_INFLATE_BYTES = 5 * 1024 * 1024;
/**
 * Inverse of {@link deflate_raw}, reading the stream in chunks and aborting once
 * the inflated output would exceed {@link MAX_PERMALINK_INFLATE_BYTES} (a
 * decompression-bomb guard — see that constant).
 * @throws RangeError when the inflated output exceeds the cap.
 * @example
 * new TextDecoder().decode(await inflate_raw(await deflate_raw(new TextEncoder().encode("hi")))); // "hi"
 */
export async function inflate_raw(bytes) {
    const stream = new DecompressionStream('deflate-raw');
    const writer = stream.writable.getWriter();
    // See deflate_raw: narrow the ArrayBufferLike-backed input to the
    // ArrayBuffer-backed Uint8Array the DOM BufferSource wants under 6.0.3.
    void writer.write(bytes);
    void writer.close();
    // Read incrementally; stopping past the cap leaves the stream half-drained, so
    // backpressure halts further inflation and the abandoned stream is GC'd. We do
    // not cancel (which would abort the writable and leak an unhandled rejection).
    const reader = stream.readable.getReader();
    const chunks = [];
    let total = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        total += value.length;
        if (total > MAX_PERMALINK_INFLATE_BYTES) {
            throw new RangeError(`permalink inflate exceeded ${MAX_PERMALINK_INFLATE_BYTES} bytes`);
        }
        chunks.push(value);
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.length;
    }
    return out;
}
/**
 * Encode FSL to a `<scheme><payload>` segment value (the part after `key=`).
 * DEFLATE is used (scheme `1`) only when it is strictly shorter than the raw
 * bytes (scheme `0`).
 * @example
 * await encode_machine("a -> b;"); // "0YSAtPiBiOw"
 */
export async function encode_machine(fsl) {
    const utf8 = new TextEncoder().encode(fsl);
    const raw = bytes_to_base64url(utf8);
    const deflated = bytes_to_base64url(await deflate_raw(utf8));
    return deflated.length < raw.length ? `1${deflated}` : `0${raw}`;
}
/**
 * Inverse of {@link encode_machine}: decode a `<scheme><payload>` segment back
 * to FSL. Async because inflate is async.
 * @example
 * await decode_machine("0YSAtPiBiOw"); // "a -> b;"
 */
export async function decode_machine(segment) {
    const scheme = segment[0];
    const bytes = base64url_to_bytes(segment.slice(1));
    const plain = scheme === '1' ? await inflate_raw(bytes) : bytes;
    return new TextDecoder().decode(plain);
}
/**
 * `decodeURIComponent` that returns its input untouched on a malformed escape,
 *  so a hand-mangled fragment never throws out of {@link read_fragment_param}.
 */
function safe_decode(text) {
    try {
        return decodeURIComponent(text);
    }
    catch (_a) {
        return text;
    }
}
/**
 * Split a fragment (leading `#` optional) into `[key, value]` pairs, dropping
 * empties. Keys are percent-decoded (they are percent-encoded on write by
 * {@link set_fragment_param}); values are the URL-safe base64 payload as-is.
 */
function fragment_pairs(hash) {
    const body = hash.startsWith('#') ? hash.slice(1) : hash;
    return body.split('&').filter(Boolean).map(seg => {
        const eq = seg.indexOf('=');
        return eq === -1
            ? [safe_decode(seg), '']
            : [safe_decode(seg.slice(0, eq)), seg.slice(eq + 1)];
    });
}
/**
 * Read one segment's value out of a `#a=…&b=…` fragment.
 * @returns The value, or `null` if `key` is absent.
 * @example
 * read_fragment_param('#a=0AAA&b=1BBB', 'b'); // "1BBB"
 */
export function read_fragment_param(hash, key) {
    const found = fragment_pairs(hash).find(([k]) => k === key);
    return found ? found[1] : null;
}
/**
 * Return a new fragment body (no leading `#`) with `key`'s segment set to
 * `value`, preserving every other segment and its order; appends if absent.
 * @example
 * set_fragment_param('#a=0AAA', 'b', '1BBB'); // "a=0AAA&b=1BBB"
 */
export function set_fragment_param(hash, key, value) {
    const pairs = fragment_pairs(hash);
    const at = pairs.findIndex(([k]) => k === key);
    if (at === -1) {
        pairs.push([key, value]);
    }
    else {
        pairs[at] = [key, value];
    }
    // Percent-encode the key so an `id`/`uhash` containing `=`, `&`, or `#` cannot
    // break segmentation or collide with a sibling. Values are URL-safe base64.
    return pairs.map(([k, v]) => `${encodeURIComponent(k)}=${v}`).join('&');
}
/**
 * The fragment key an element owns: its `uhash` attribute if set, else its
 * `id`, else `null` (does not participate in URL sync). The single source of
 * this rule, shared by the toolbar export and the sync controller.
 * @example
 * permalink_key_for(el); // "myId"  (when <el id="myId">, no uhash)
 */
export function permalink_key_for(host) {
    var _a, _b;
    return (_b = (_a = host.getAttribute('uhash')) !== null && _a !== void 0 ? _a : host.getAttribute('id')) !== null && _b !== void 0 ? _b : null;
}
/**
 * A shareable URL for `fsl` under `key`, merging into `currentHash` so sibling
 * machines' segments survive. Browser-defaulted (`location`) but injectable for
 * tests.
 * @returns The absolute URL carrying the merged fragment.
 * @example
 * await permalink_for('a -> b;', 'm', 'https://h/p', ''); // "https://h/p#m=0YSAtPiBiOw"
 * @see fsl_from_permalink
 */
export async function permalink_for(fsl, key = DEFAULT_PERMALINK_KEY, href = location.href, currentHash = location.hash) {
    const segment = await encode_machine(fsl);
    const fragment = set_fragment_param(currentHash, key, segment);
    return `${href.split('#', 1)[0]}#${fragment}`;
}
/**
 * Recover the FSL for `key` from a permalink URL (or bare fragment).
 * @returns The decoded FSL, or `null` when the fragment has no `key` segment
 *          or that segment is present but malformed/undecodable.
 * @example
 * await fsl_from_permalink('https://h/p#m=0YSAtPiBiOw'); // "a -> b;"
 * @see permalink_for
 */
export async function fsl_from_permalink(url, key = DEFAULT_PERMALINK_KEY) {
    const hash = url.includes('#') ? url.slice(url.indexOf('#')) : url;
    const segment = read_fragment_param(hash, key);
    if (segment === null) {
        return null;
    }
    try {
        return await decode_machine(segment);
    }
    catch (_a) {
        return null; // present but malformed/undecodable segment → null, not a throw
    }
}
