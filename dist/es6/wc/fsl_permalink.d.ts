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
export declare const DEFAULT_PERMALINK_KEY = "m";
/**
 * URL-safe base64 (RFC 4648 §5) of raw bytes: standard base64 with `+`→`-`,
 * `/`→`_`, and trailing `=` padding stripped.
 * @example
 * bytes_to_base64url(new TextEncoder().encode("a")); // "YQ"
 */
export declare function bytes_to_base64url(bytes: Uint8Array): string;
/**
 * Inverse of {@link bytes_to_base64url}.
 * @example
 * new TextDecoder().decode(base64url_to_bytes("YQ")); // "a"
 */
export declare function base64url_to_bytes(text: string): Uint8Array;
/**
 * DEFLATE `bytes` (raw, headerless) via the platform `CompressionStream`.
 * @example
 * await deflate_raw(new TextEncoder().encode("aaaaaaaa")); // shorter Uint8Array of raw DEFLATE bytes
 */
export declare function deflate_raw(bytes: Uint8Array): Promise<Uint8Array>;
/**
 * Hard ceiling on the inflated size of a permalink, in bytes. A permalink rides
 * in a URL an attacker can hand a victim, and {@link inflate_raw} runs on it
 * automatically on page load, so an uncapped inflate is a decompression-bomb
 * vector (a tiny `#m=…` could expand to hundreds of MB and OOM the tab). This is
 * generous for real FSL (text — even a vast machine is well under a megabyte).
 */
export declare const MAX_PERMALINK_INFLATE_BYTES: number;
/**
 * Inverse of {@link deflate_raw}, reading the stream in chunks and aborting once
 * the inflated output would exceed {@link MAX_PERMALINK_INFLATE_BYTES} (a
 * decompression-bomb guard — see that constant).
 * @throws RangeError when the inflated output exceeds the cap.
 * @example
 * new TextDecoder().decode(await inflate_raw(await deflate_raw(new TextEncoder().encode("hi")))); // "hi"
 */
export declare function inflate_raw(bytes: Uint8Array): Promise<Uint8Array>;
/**
 * Encode FSL to a `<scheme><payload>` segment value (the part after `key=`).
 * DEFLATE is used (scheme `1`) only when it is strictly shorter than the raw
 * bytes (scheme `0`).
 * @example
 * await encode_machine("a -> b;"); // "0YSAtPiBiOw"
 */
export declare function encode_machine(fsl: string): Promise<string>;
/**
 * Inverse of {@link encode_machine}: decode a `<scheme><payload>` segment back
 * to FSL. Async because inflate is async.
 * @example
 * await decode_machine("0YSAtPiBiOw"); // "a -> b;"
 */
export declare function decode_machine(segment: string): Promise<string>;
/**
 * Read one segment's value out of a `#a=…&b=…` fragment.
 * @returns The value, or `null` if `key` is absent.
 * @example
 * read_fragment_param('#a=0AAA&b=1BBB', 'b'); // "1BBB"
 */
export declare function read_fragment_param(hash: string, key: string): string | null;
/**
 * Return a new fragment body (no leading `#`) with `key`'s segment set to
 * `value`, preserving every other segment and its order; appends if absent.
 * @example
 * set_fragment_param('#a=0AAA', 'b', '1BBB'); // "a=0AAA&b=1BBB"
 */
export declare function set_fragment_param(hash: string, key: string, value: string): string;
/**
 * The fragment key an element owns: its `uhash` attribute if set, else its
 * `id`, else `null` (does not participate in URL sync). The single source of
 * this rule, shared by the toolbar export and the sync controller.
 * @example
 * permalink_key_for(el); // "myId"  (when <el id="myId">, no uhash)
 */
export declare function permalink_key_for(host: HTMLElement): string | null;
/**
 * A shareable URL for `fsl` under `key`, merging into `currentHash` so sibling
 * machines' segments survive. Browser-defaulted (`location`) but injectable for
 * tests.
 * @returns The absolute URL carrying the merged fragment.
 * @example
 * await permalink_for('a -> b;', 'm', 'https://h/p', ''); // "https://h/p#m=0YSAtPiBiOw"
 * @see fsl_from_permalink
 */
export declare function permalink_for(fsl: string, key?: string, href?: string, currentHash?: string): Promise<string>;
/**
 * Recover the FSL for `key` from a permalink URL (or bare fragment).
 * @returns The decoded FSL, or `null` when the fragment has no `key` segment
 *          or that segment is present but malformed/undecodable.
 * @example
 * await fsl_from_permalink('https://h/p#m=0YSAtPiBiOw'); // "a -> b;"
 * @see permalink_for
 */
export declare function fsl_from_permalink(url: string, key?: string): Promise<string | null>;
