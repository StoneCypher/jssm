import { css, html, LitElement } from 'lit';
import { state, property } from 'lit/decorators.js';
import { machine_to_svg_string, machine_to_dot } from 'jssm/viz';
import { STOCHASTIC_DEFAULT_RUNS, STOCHASTIC_DEFAULT_MAX_STEPS, sm } from 'jssm';

/**
 * Shared FSL appearance contract — the `--fsl-*` design-token vocabulary.
 *
 * Components include this in `static styles` and consume the **private**
 * `--_fsl-*` vars, which resolve: embedder's public `--fsl-*` token →
 * `[theme="dark"]` default → built-in light fallback. White-label by setting
 * `--fsl-*` on any ancestor (custom properties inherit through shadow DOM);
 * flip the built-in default with the host's `theme="dark"` attribute.
 *
 * Companion conventions (declared per-component): expose structural elements as
 * `::part(...)` (e.g. `part="toolbar"`, `"gutter"`, `"editor"`) and forward
 * child parts with `exportparts`; chrome components carry brand slots
 * (`<slot name="brand">` / `"logo">`).
 */
const fslTokens = css `
  :host {
    --_fsl-surface: var(--fsl-color-surface, #ffffff);
    --_fsl-text:    var(--fsl-color-text,    #222222);
    --_fsl-accent:  var(--fsl-color-accent,  #5b9dff);
    --_fsl-border:  var(--fsl-color-border,  #e5e5e5);
    --_fsl-muted:   var(--fsl-color-muted,   #9aa0a6);
    --_fsl-font:      var(--fsl-font,      system-ui, -apple-system, "Segoe UI", sans-serif);
    --_fsl-font-mono: var(--fsl-font-mono, ui-monospace, Consolas, monospace);
    --_fsl-radius:  var(--fsl-radius, 6px);
    --_fsl-space-1: var(--fsl-space-1, 4px);
    --_fsl-space-2: var(--fsl-space-2, 8px);
    --_fsl-space-3: var(--fsl-space-3, 12px);
    --_fsl-space-4: var(--fsl-space-4, 16px);
  }
  :host([theme="dark"]) {
    --_fsl-surface: var(--fsl-color-surface, #1e1e22);
    --_fsl-text:    var(--fsl-color-text,    #d6d6d6);
    --_fsl-accent:  var(--fsl-color-accent,  #82aaff);
    --_fsl-border:  var(--fsl-color-border,  #2a2a2e);
    --_fsl-muted:   var(--fsl-color-muted,   #5a5f66);
  }
`;

/**
 * Shared helpers for the dual-prefix (`fsl-` canonical, `jssm-` synonym)
 * web-component naming convention.  Centralizes the "match either prefix"
 * rule so it lives in exactly one place.
 */
/**
 * Returns true when `tag_name` is exactly `fsl-<suffix>` or `jssm-<suffix>`
 * (case-insensitive).
 * @param tag_name - The element tag name to test (e.g. `"FSL-VIZ"`, `"jssm-viz"`).
 * @param suffix   - The suffix to match after the prefix (e.g. `"viz"`).
 * @returns `true` when `tag_name` is `fsl-<suffix>` or `jssm-<suffix>`.
 * @example
 * wc_suffix_matches('FSL-VIZ', 'viz');   // true
 * wc_suffix_matches('jssm-viz', 'viz');  // true
 * wc_suffix_matches('div', 'viz');       // false
 * wc_suffix_matches('fsl-vizard', 'viz'); // false — suffix must match exactly
 */
/**
 * Returns the nearest ancestor of `el` (or `el` itself) whose tag is
 * `fsl-<suffix>` or `jssm-<suffix>`, or `null` if none exists.
 * @param el     - The element to start the search from.
 * @param suffix - The suffix to match (e.g. `"instance"`).
 * @returns The closest matching ancestor element, or `null`.
 * @example
 * // <fsl-instance><div id="k"></div></fsl-instance>
 * closest_wc(document.getElementById('k'), 'instance'); // <fsl-instance>
 * @see wc_suffix_matches
 */
function closest_wc(el, suffix) {
    return el.closest(`fsl-${suffix}, jssm-${suffix}`);
}

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
const DEFAULT_PERMALINK_KEY = 'm';
/**
 * URL-safe base64 (RFC 4648 §5) of raw bytes: standard base64 with `+`→`-`,
 * `/`→`_`, and trailing `=` padding stripped.
 * @example
 * bytes_to_base64url(new TextEncoder().encode("a")); // "YQ"
 */
function bytes_to_base64url(bytes) {
    let binary = '';
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
/**
 * DEFLATE `bytes` (raw, headerless) via the platform `CompressionStream`.
 * @example
 * await deflate_raw(new TextEncoder().encode("aaaaaaaa")); // shorter Uint8Array of raw DEFLATE bytes
 */
async function deflate_raw(bytes) {
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
 * Encode FSL to a `<scheme><payload>` segment value (the part after `key=`).
 * DEFLATE is used (scheme `1`) only when it is strictly shorter than the raw
 * bytes (scheme `0`).
 * @example
 * await encode_machine("a -> b;"); // "0YSAtPiBiOw"
 */
async function encode_machine(fsl) {
    const utf8 = new TextEncoder().encode(fsl);
    const raw = bytes_to_base64url(utf8);
    const deflated = bytes_to_base64url(await deflate_raw(utf8));
    return deflated.length < raw.length ? `1${deflated}` : `0${raw}`;
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
 * Return a new fragment body (no leading `#`) with `key`'s segment set to
 * `value`, preserving every other segment and its order; appends if absent.
 * @example
 * set_fragment_param('#a=0AAA', 'b', '1BBB'); // "a=0AAA&b=1BBB"
 */
function set_fragment_param(hash, key, value) {
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
function permalink_key_for(host) {
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
async function permalink_for(fsl, key = DEFAULT_PERMALINK_KEY, href = location.href, currentHash = location.hash) {
    const segment = await encode_machine(fsl);
    const fragment = set_fragment_param(currentHash, key, segment);
    return `${href.split('#', 1)[0]}#${fragment}`;
}

var __decorate$8 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
/** Theme modes offered by the Theme pulldown. */
const THEME_MODES = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
];
/** Export formats offered by the Export pulldown. */
const EXPORT_FORMATS = [
    { value: 'dot', label: 'Graphviz DOT' },
    { value: 'json', label: 'JSON (serialized)' },
    { value: 'fsl', label: 'FSL source' },
    { value: 'svg', label: 'SVG' },
    { value: 'permalink', label: 'Permalink (URL)' },
    { value: 'embed', label: 'Embed snippet' },
];
// The permalink codec lives in its own module (`fsl_permalink.ts`); re-export so
// existing importers — and the 5.151 toolbar tests — keep resolving these here.
/**
 * A paste-able HTML snippet that renders the given FSL from the CDN builds: an
 * `<fsl-instance>` reading its source from a `<script type="text/fsl">` child,
 * with a slotted `<fsl-viz>` for the graph.
 * @example
 * embed_snippet_for("a -> b;"); // "<script …instance.js …><fsl-instance>…</fsl-instance>"
 */
function embed_snippet_for(fsl) {
    const CDN = 'https://cdn.jsdelivr.net/npm/jssm/dist/cdn';
    return [
        `<script type="module" src="${CDN}/instance.js"></script>`,
        `<script type="module" src="${CDN}/viz.js"></script>`,
        '<fsl-instance>',
        '  <fsl-viz slot="viz"></fsl-viz>',
        '  <script type="text/fsl">',
        fsl,
        '  </script>',
        '</fsl-instance>',
    ].join('\n');
}
/* Panel icons — Solar (CC BY 4.0) bold-duotone. Layout icons — hand-drawn
   duotone split-rects. All use currentColor (+ baked opacity on the secondary
   tone), so they theme with the button's text color and pressed state. Each is
   a static html`` literal (Lit needs compile-time template strings). */
const ICON_VIZ = html `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M2 12c0-4.714 0-7.071 1.464-8.536C4.93 2 7.286 2 12 2s7.071 0 8.535 1.464C22 4.93 22 7.286 22 12s0 7.071-1.465 8.535C19.072 22 16.714 22 12 22s-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12" opacity=".5"/><path fill="currentColor" d="M17.576 10.48a.75.75 0 0 0-1.152-.96l-1.797 2.156c-.37.445-.599.716-.786.885a.8.8 0 0 1-.163.122l-.011.005l-.008-.004l-.003-.001a.8.8 0 0 1-.164-.122c-.187-.17-.415-.44-.786-.885l-.292-.35c-.328-.395-.625-.75-.901-1c-.301-.272-.68-.514-1.18-.514s-.878.242-1.18.514c-.276.25-.572.605-.9 1l-1.83 2.194a.75.75 0 0 0 1.153.96l1.797-2.156c.37-.445.599-.716.786-.885a.8.8 0 0 1 .163-.122l.007-.003l.004-.001q.004 0 .011.004a.8.8 0 0 1 .164.122c.187.17.415.44.786.885l.292.35c.329.395.625.75.901 1c.301.272.68.514 1.18.514s.878-.242 1.18-.514c.276-.25.572-.605.9-1z"/></svg>`;
const ICON_CODE = html `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8.502 5.387A.75.75 0 0 0 7.5 4.272L5.76 5.836c-.736.663-1.347 1.212-1.766 1.71c-.441.525-.755 1.088-.755 1.784c0 .695.314 1.258.755 1.782c.42.499 1.03 1.049 1.766 1.711l1.74 1.564a.75.75 0 1 0 1.003-1.115l-1.696-1.527c-.788-.709-1.32-1.19-1.663-1.598c-.33-.393-.403-.622-.403-.817c0-.196.072-.425.403-.818c.344-.409.875-.889 1.663-1.598zm6.941 5.111a.75.75 0 0 1 1.06-.055l1.737 1.563c.736.663 1.347 1.213 1.766 1.711c.441.524.755 1.088.755 1.783s-.314 1.259-.755 1.783c-.42.498-1.03 1.048-1.766 1.71l-1.738 1.565a.75.75 0 1 1-1.003-1.116l1.696-1.526c.788-.71 1.32-1.19 1.663-1.599c.33-.392.403-.622.403-.817s-.072-.425-.403-.817c-.344-.41-.875-.89-1.663-1.599L15.5 11.557a.75.75 0 0 1-.056-1.059"/><path fill="currentColor" d="M14.18 4.275a.75.75 0 0 1 .532.918l-3.987 15a.75.75 0 0 1-1.45-.386l3.987-15a.75.75 0 0 1 .918-.532" opacity=".5"/></svg>`;
const ICON_HISTORY = html `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M5.079 5.069c3.795-3.79 9.965-3.75 13.783.069c3.82 3.82 3.86 9.993.064 13.788s-9.968 3.756-13.788-.064a9.81 9.81 0 0 1-2.798-8.28a.75.75 0 1 1 1.487.203a8.31 8.31 0 0 0 2.371 7.017c3.245 3.244 8.468 3.263 11.668.064c3.199-3.2 3.18-8.423-.064-11.668c-3.243-3.242-8.463-3.263-11.663-.068l.748.003a.75.75 0 1 1-.007 1.5l-2.546-.012a.75.75 0 0 1-.746-.747L3.575 4.33a.75.75 0 1 1 1.5-.008z" clip-rule="evenodd"/><path fill="currentColor" d="M12 7.25a.75.75 0 0 1 .75.75v3.69l2.28 2.28a.75.75 0 1 1-1.06 1.06l-2.427-2.426a1 1 0 0 1-.293-.708V8a.75.75 0 0 1 .75-.75" opacity=".5"/></svg>`;
const ICON_DATA = html `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 10c4.418 0 8-1.79 8-4s-3.582-4-8-4s-8 1.79-8 4s3.582 4 8 4"/><path fill="currentColor" d="M4 12v6c0 2.21 3.582 4 8 4s8-1.79 8-4v-6c0 2.21-3.582 4-8 4s-8-1.79-8-4" opacity=".5"/><path fill="currentColor" d="M4 6v6c0 2.21 3.582 4 8 4s8-1.79 8-4V6c0 2.21-3.582 4-8 4S4 8.21 4 6" opacity=".7"/></svg>`;
const ICON_HOOKS = html `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M8.732 5.771L5.67 9.914c-1.285 1.739-1.928 2.608-1.574 3.291l.018.034c.375.673 1.485.673 3.704.673c1.233 0 1.85 0 2.236.363l.02.02l3.872-4.57l-.02-.02c-.379-.371-.379-.963-.379-2.148v-.31c0-3.285 0-4.927-.923-5.21s-1.913 1.056-3.892 3.734" clip-rule="evenodd"/><path fill="currentColor" d="M10.453 16.443v.31c0 3.284 0 4.927.923 5.21s1.913-1.056 3.893-3.734l3.062-4.143c1.284-1.739 1.927-2.608 1.573-3.291l-.018-.034c-.375-.673-1.485-.673-3.704-.673c-1.233 0-1.85 0-2.236-.363l-3.872 4.57c.379.371.379.963.379 2.148" opacity=".5"/></svg>`;
const ICON_INFO = html `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2s10 4.477 10 10" opacity=".5"/><path fill="currentColor" d="M12 17.75a.75.75 0 0 0 .75-.75v-6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75M12 7a1 1 0 1 1 0 2a1 1 0 0 1 0-2"/></svg>`;
const ICON_PROPS = html `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.25 14a3 3 0 1 1 0 6a3 3 0 0 1 0-6m5-10a3 3 0 1 0 0 6a3 3 0 0 0 0-6"/><path fill="currentColor" d="M17.166 7.709a3 3 0 0 0-.021-1.5h4.605a.75.75 0 0 1 0 1.5zm-5.81-1.5a3 3 0 0 0-.022 1.5H1.75a.75.75 0 0 1 0-1.5zm-5 10H1.75a.75.75 0 0 0 0 1.5h4.584a3 3 0 0 1 .022-1.5m5.81 1.5h9.584a.75.75 0 0 0 0-1.5h-9.605a3 3 0 0 1 .02 1.5" opacity=".5"/></svg>`;
const ICON_SIM = html `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M23 12c0-1.035-.53-2.07-1.591-2.647L8.597 2.385C6.534 1.264 4 2.724 4 5.033V12z" clip-rule="evenodd"/><path fill="currentColor" d="m8.597 21.615l12.812-6.968A2.99 2.99 0 0 0 23 12H4v6.967c0 2.31 2.534 3.769 4.597 2.648" opacity=".5"/></svg>`;
const ICON_EXPORT = html `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.536 20.536C19.07 22 16.714 22 12 22s-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12s0-7.071 1.464-8.536C4.93 2 7.286 2 12 2s7.071 0 8.535 1.464C22 4.93 22 7.286 22 12s0 7.071-1.465 8.535" opacity=".5"/><path fill="currentColor" d="M15.579 14.828a.75.75 0 0 1-.75.75h-4.243a.75.75 0 0 1 0-1.5h2.432L8.642 9.7a.75.75 0 0 1 1.06-1.06l4.377 4.376v-2.432a.75.75 0 0 1 1.5 0z"/></svg>`;
const ICON_LR = html `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="8" height="14" rx="1.5" fill="currentColor"/><rect x="13" y="5" width="8" height="14" rx="1.5" fill="currentColor" opacity=".4"/></svg>`;
const ICON_RL = html `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="8" height="14" rx="1.5" fill="currentColor" opacity=".4"/><rect x="13" y="5" width="8" height="14" rx="1.5" fill="currentColor"/></svg>`;
const ICON_TB = html `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="7" rx="1.5" fill="currentColor"/><rect x="3" y="13" width="18" height="7" rx="1.5" fill="currentColor" opacity=".4"/></svg>`;
const ICON_BT = html `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="7" rx="1.5" fill="currentColor" opacity=".4"/><rect x="3" y="13" width="18" height="7" rx="1.5" fill="currentColor"/></svg>`;
const ICON_M_EDITOR = html `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor"/></svg>`;
const ICON_M_VIEWER = html `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" opacity=".4"/></svg>`;
const ICON_TABS = html `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="8" width="18" height="12" rx="1.5" fill="currentColor" opacity=".4"/><rect x="3" y="4" width="8" height="3.6" rx="1" fill="currentColor"/></svg>`;
const ICON_AUTO = html `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" opacity=".4"/><path d="M5 19L19 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>`;
/* Solar bolt-bold-duotone — the actions panel. */
const ICON_ACTIONS = html `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M8.732 5.771L5.67 9.914c-1.285 1.739-1.928 2.608-1.574 3.291l.018.034c.375.673 1.485.673 3.704.673c1.233 0 1.85 0 2.236.363l.02.02l3.872-4.57l-.02-.02c-.379-.371-.379-.963-.379-2.148v-.31c0-3.285 0-4.927-.923-5.21s-1.913 1.056-3.892 3.734" clip-rule="evenodd"/><path fill="currentColor" d="M10.453 16.443v.31c0 3.284 0 4.927.923 5.21s1.913-1.056 3.893-3.734l3.062-4.143c1.284-1.739 1.927-2.608 1.573-3.291l-.018-.034c-.375-.673-1.485-.673-3.704-.673c-1.233 0-1.85 0-2.236-.363l-3.872 4.57c.379.371.379.963.379 2.148" opacity=".5"/></svg>`;
/* Solar palette-round-bold-duotone — the theme pulldown. */
const ICON_THEME = html `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 18a1 1 0 1 1-2 0a1 1 0 0 1 2 0"/><path fill="currentColor" d="M10 6v12a4 4 0 0 1-8 0V6a4 4 0 1 1 8 0" opacity=".4"/><path fill="currentColor" d="m9.248 20.336l3.974-3.975l5.838-6.09a4.042 4.042 0 0 0-5.776-5.655L10 7.9V18c0 .872-.279 1.679-.752 2.336" opacity=".7"/><path fill="currentColor" d="m13.222 16.362l-3.974 3.974A4 4 0 0 1 6 22h11.9a4 4 0 1 0 0-8h-2.414z"/></svg>`;
/* Validate — a duotone check-circle. Lint — a duotone document with rule lines. */
const ICON_VALIDATE = html `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2s10 4.477 10 10" opacity=".4"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="m8.5 12.5l2.5 2.5l4.5-5.5"/></svg>`;
const ICON_LINT = html `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 10c0-3.771 0-5.657 1.172-6.828S7.229 2 11 2h2c3.771 0 5.657 0 6.828 1.172S21 6.229 21 10v4c0 3.771 0 5.657-1.172 6.828S16.771 22 13 22h-2c-3.771 0-5.657 0-6.828-1.172S3 17.771 3 14z" opacity=".4"/><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M7.5 8.5h9M7.5 12h6M7.5 15.5h3"/></svg>`;
const PANELS = [
    { slot: 'actions', label: 'Actions', icon: ICON_ACTIONS },
    { slot: 'viz', label: 'Renderer', icon: ICON_VIZ },
    { slot: 'editor', label: 'Code', icon: ICON_CODE },
    { slot: 'history', label: 'History', icon: ICON_HISTORY },
    { slot: 'data-inspector', label: 'Data', icon: ICON_DATA },
    { slot: 'hook-log', label: 'Events', icon: ICON_HOOKS },
    { slot: 'info-panel', label: 'Info', icon: ICON_INFO },
    { slot: 'effective-properties', label: 'Properties', icon: ICON_PROPS },
    { slot: 'simulation', label: 'Simulation', icon: ICON_SIM },
];
/** Layout menu entries (icon + label), in the sketch's order. */
const LAYOUTS = [
    { value: 'auto', label: 'Auto · by aspect ratio', icon: ICON_AUTO },
    { value: 'lr', label: 'Side by side · editor left', icon: ICON_LR },
    { value: 'rl', label: 'Side by side · editor right', icon: ICON_RL },
    { value: 'tb', label: 'Top & bottom · editor top', icon: ICON_TB },
    { value: 'bt', label: 'Top & bottom · editor bottom', icon: ICON_BT },
    { value: 'editor', label: 'Just editor', icon: ICON_M_EDITOR },
    { value: 'viewer', label: 'Just viewer', icon: ICON_M_VIEWER },
    { value: 'tabs', label: 'Tabbed', icon: ICON_TABS },
];
/**
 * `<fsl-toolbar>` — a control bar for a parent `<fsl-instance>`. Validate + Lint
 * action buttons (fired as `fsl-validate` / `fsl-lint` events for the embedder
 * to fulfill, each suppressible via `no-validate` / `no-lint`); an icon toggle
 * to show/hide each panel present in the host (renderer, code, history, …); and
 * Layout / Export / Theme pulldowns (the Layout button shows the current
 * layout's icon). Standalone (no host) the host-dependent controls disappear.
 * A trailing slot carries extra buttons.
 * @element fsl-toolbar
 * @csspart toolbar - The bar container.
 * @slot - Trailing custom controls.
 */
class FslToolbar extends LitElement {
    constructor() {
        super(...arguments);
        this._openMenu = '';
        /** Active export destination; the next format click targets it. */
        this._dest = 'clipboard';
        /**
         * The last directory an export was saved to this session (its final path
         * segment). When non-empty, the Export menu offers a `to <name>` destination.
         * The embedder sets this after fulfilling a `pick` export.
         */
        this.lastDirectory = '';
        /** Hide the Validate button (e.g. when the consumer validates inline). */
        this.noValidate = false;
        /** Hide the Lint button. */
        this.noLint = false;
        this._host = null;
        /** Panels actually present in the host — one toggle each. */
        this._present = [];
    }
    connectedCallback() {
        super.connectedCallback();
        const host = closest_wc(this, 'instance');
        this._host = host;
        // eslint-disable-next-line unicorn/require-css-escape -- jsdom provides no CSS global at all and this component must run there; PANELS slot names are static identifiers needing no escaping
        this._present = host === null ? [] : PANELS.filter(p => host.querySelector(`[slot="${p.slot}"]`) !== null);
    }
    /**
     * Set the theme mode (System/Light/Dark). The host applies the palette + drives
     *  the editor; the menu stays open so a theme can be picked in the same trip.
     */
    _setMode(mode) {
        if (this._host !== null) {
            this._host.theme = mode;
        }
        this.requestUpdate();
    }
    /**
     * Select a named theme from the host's registry. The theme-name buttons only
     *  render when a host exists, so `_host` is non-null here.
     */
    _setThemeName(name) {
        this._host.themeName = name;
        this.requestUpdate();
    }
    _setLayout(layout) {
        if (this._host !== null) {
            this._host.layout = layout;
        }
        this._openMenu = '';
    }
    /**
     * Set the active export destination; the menu stays open so a format can be
     *  chosen next.
     */
    _setDest(dest) { this._dest = dest; }
    /**
     * Emit `fsl-export` with the chosen format's content + the active destination.
     *  The embedder performs the actual clipboard / file save.
     */
    async _export(format) {
        var _a;
        const host = this._host;
        const destination = this._dest;
        this._openMenu = '';
        if (host === null) {
            return;
        }
        let content;
        switch (format) {
            case 'dot': {
                content = machine_to_dot(host.machine);
                break;
            }
            case 'json': {
                content = JSON.stringify(host.machine.serialize(), null, 2);
                break;
            }
            case 'svg': {
                content = await machine_to_svg_string(host.machine);
                break;
            }
            case 'permalink': {
                content = await permalink_for(host.fsl, (_a = permalink_key_for(host)) !== null && _a !== void 0 ? _a : undefined);
                break;
            }
            case 'embed': {
                content = embed_snippet_for(host.fsl);
                break;
            }
            default: {
                content = host.fsl;
            }
        }
        this.dispatchEvent(new CustomEvent('fsl-export', { detail: { format, content, destination }, bubbles: true, composed: true }));
    }
    /**
     * Fire a workspace-action intent (validate / lint) for the consumer to
     *  fulfill — the toolbar presents the action; the embedder runs it. The
     *  current machine source rides along in the detail as a convenience. The
     *  buttons only render with a host, so `_host` is non-null here.
     */
    _fireAction(type) {
        this.dispatchEvent(new CustomEvent(type, { detail: { fsl: this._host.fsl }, bubbles: true, composed: true }));
    }
    _toggleMenu(which) { this._openMenu = this._openMenu === which ? '' : which; }
    render() {
        var _a, _b, _c, _d, _e;
        const host = this._host;
        const mode = (_a = host === null || host === void 0 ? void 0 : host.theme) !== null && _a !== void 0 ? _a : 'light';
        const themeName = (_b = host === null || host === void 0 ? void 0 : host.themeName) !== null && _b !== void 0 ? _b : 'Default';
        const themeNames = host ? Object.keys(host.themes) : [];
        const layout = (_c = host === null || host === void 0 ? void 0 : host.layout) !== null && _c !== void 0 ? _c : '';
        const layoutIcon = (_e = (_d = LAYOUTS.find(l => l.value === layout)) === null || _d === void 0 ? void 0 : _d.icon) !== null && _e !== void 0 ? _e : ICON_LR;
        return html `
      <div class="toolbar" part="toolbar" role="toolbar" aria-label="Workbench controls">
        <span class="spacer"></span>
        <div class="grp">
          ${host
            ? this._present.map(p => html `
              <button class="tb icon" aria-pressed=${!host.isPanelHidden(p.slot)} aria-label=${p.label} title=${p.label}
                      @click=${() => { host.togglePanel(p.slot); this.requestUpdate(); }}>${p.icon}</button>
            `)
            : ''}
        </div>
        ${host ? html `
          <div class="grp">
            ${this.noValidate ? '' : html `
              <button class="tb icon" aria-label="Validate" title="Validate" @click=${() => this._fireAction('fsl-validate')}>${ICON_VALIDATE}</button>
            `}
            ${this.noLint ? '' : html `
              <button class="tb icon" aria-label="Lint" title="Lint" @click=${() => this._fireAction('fsl-lint')}>${ICON_LINT}</button>
            `}
          </div>
        ` : ''}
        <div class="grp">
          <button class="tb layout" aria-haspopup="true" aria-expanded=${this._openMenu === 'layout'} aria-label="Layout" title="Layout" @click=${() => this._toggleMenu('layout')}>${layoutIcon}<span class="caret">▾</span></button>
          ${this._openMenu === 'layout' ? html `
            <div class="menu" role="menu">
              ${LAYOUTS.map(o => html `
                <button role="menuitemradio" aria-checked=${layout === o.value} @click=${() => this._setLayout(o.value)}>${o.icon}${o.label}</button>
              `)}
            </div>
          ` : ''}
        </div>
        <div class="grp">
          <button class="tb icon" aria-haspopup="true" aria-expanded=${this._openMenu === 'export'} aria-label="Export" title="Export" @click=${() => this._toggleMenu('export')}>${ICON_EXPORT}</button>
          ${this._openMenu === 'export' ? html `
            <div class="menu" role="menu">
              <button role="menuitemradio" aria-checked=${this._dest === 'clipboard'} @click=${() => this._setDest('clipboard')}>to clipboard</button>
              ${this.lastDirectory ? html `
                <button role="menuitemradio" aria-checked=${this._dest === 'lastdir'} @click=${() => this._setDest('lastdir')}>to ${this.lastDirectory}</button>
              ` : ''}
              <button role="menuitemradio" aria-checked=${this._dest === 'pick'} @click=${() => this._setDest('pick')}>choose directory…</button>
              <div class="divider" role="separator"></div>
              ${EXPORT_FORMATS.map(f => html `
                <button role="menuitem" @click=${() => this._export(f.value)}>${f.label}</button>
              `)}
            </div>
          ` : ''}
        </div>
        <div class="grp">
          <button class="tb icon" aria-haspopup="true" aria-expanded=${this._openMenu === 'theme'} aria-label="Theme" title="Theme" @click=${() => this._toggleMenu('theme')}>${ICON_THEME}</button>
          ${this._openMenu === 'theme' ? html `
            <div class="menu" role="menu">
              ${THEME_MODES.map(m => html `
                <button role="menuitemradio" aria-checked=${mode === m.value} @click=${() => this._setMode(m.value)}>${m.label}</button>
              `)}
              <div class="divider" role="separator"></div>
              ${themeNames.map(n => html `
                <button role="menuitemradio" aria-checked=${themeName === n} @click=${() => this._setThemeName(n)}>${n}</button>
              `)}
            </div>
          ` : ''}
        </div>
        <slot></slot>
      </div>
    `;
    }
}
FslToolbar.styles = css `
    :host { display: block; }
    .toolbar {
      display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
      padding: 0.4rem 0.5rem; background: var(--_fsl-surface);
      border-bottom: 1px solid var(--_fsl-border); font: 0.8rem var(--_fsl-font);
    }
    .grp { display: inline-flex; position: relative; }
    .grp .tb { margin-left: -1px; } .grp .tb:first-child { margin-left: 0; }
    .tb {
      min-width: 2rem; height: 1.9rem; padding: 0 0.5rem; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; gap: 0.3rem;
      border: 1px solid var(--_fsl-border); background: var(--_fsl-surface); color: var(--_fsl-text);
      font: 600 0.8rem var(--_fsl-font);
    }
    .tb:hover { background: color-mix(in srgb, var(--_fsl-text) 8%, var(--_fsl-surface)); }
    .tb[aria-pressed="true"], .tb[aria-expanded="true"] {
      /* lift the active button above its -1px-overlapped neighbours so its full
         accent border paints on top (its right edge isn't covered by the next,
         unpressed, button's left border). */
      position: relative; z-index: 1;
      background: color-mix(in srgb, var(--_fsl-accent) 20%, var(--_fsl-surface));
      color: var(--_fsl-text);   /* keep the symbol readable; the tint + border mark "selected" */
      border-color: color-mix(in srgb, var(--_fsl-accent) 55%, var(--_fsl-border));
    }
    .tb.icon { width: 1.9rem; min-width: 1.9rem; padding: 0; }
    .tb.layout { padding: 0 0.35rem; gap: 0.12rem; }
    .tb .ico { width: 1.15rem; height: 1.15rem; display: block; }
    .tb.layout .ico { width: 1.1rem; height: 1.1rem; }
    .caret { font-size: 0.6rem; line-height: 1; color: var(--_fsl-muted); }
    .tb[aria-expanded="true"] .caret { color: inherit; }
    .menu {
      position: absolute; top: calc(100% + 4px); right: 0; z-index: 20; min-width: 220px;
      background: var(--_fsl-surface); border: 1px solid var(--_fsl-border); border-radius: 6px;
      padding: 5px; box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    }
    .menu button {
      display: flex; align-items: center; width: 100%; box-sizing: border-box;
      background: none; border: 0; border-radius: 4px; padding: 6px 9px; gap: 8px;
      color: var(--_fsl-text); cursor: pointer; text-align: left; font: 0.82rem var(--_fsl-font);
    }
    .menu button:hover { background: color-mix(in srgb, var(--_fsl-text) 12%, transparent); }
    .menu button[aria-checked="true"] { font-weight: 700; }
    .menu button[aria-checked="true"]::after { content: "✓"; margin-left: auto; color: var(--_fsl-accent); }
    .menu .ico { width: 1.05rem; height: 1.05rem; display: block; flex: 0 0 auto; }
    .menu .divider { height: 1px; background: var(--_fsl-border); margin: 5px 4px; }
    .spacer { flex: 1; }
    ${fslTokens}
  `;
__decorate$8([
    state()
], FslToolbar.prototype, "_openMenu", void 0);
__decorate$8([
    state()
], FslToolbar.prototype, "_dest", void 0);
__decorate$8([
    property({ attribute: false })
], FslToolbar.prototype, "lastDirectory", void 0);
__decorate$8([
    property({ type: Boolean, attribute: 'no-validate' })
], FslToolbar.prototype, "noValidate", void 0);
__decorate$8([
    property({ type: Boolean, attribute: 'no-lint' })
], FslToolbar.prototype, "noLint", void 0);

var __decorate$7 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
/** Host events that can change which actions / transitions are currently legal. */
const ACTION_EVENTS = ['fsl-transition', 'fsl-machine-rebuilt'];
/**
 * `<fsl-actions>` — interactive controls derived from a parent `<fsl-instance>`'s
 * machine. Renders a button for every currently-legal named **action** and, split
 * into three groups, every reachable transition target by edge kind: **main**
 * (`=>`) first, plain **transitions** (`->`) next, and **forced** (`~>`) last.
 * Legal targets fire with `transition`, forced-only ones with `force_transition`.
 * Re-derives on the host's transition / rebuild events; only firable controls
 * appear, and each group is omitted when empty, so a self-loop-only state shows
 * just its actions and a terminal state shows `no actions available`. Standalone
 * (no host ancestor) renders empty.
 * @element fsl-actions
 * @csspart actions - The container.
 * @example
 * // For `A 'x' -> B; A 'y' => C; A ~> D;` while in A:
 * //   Actions:      [ x ] [ y ]
 * //   Main:         [ → C ]
 * //   Transitions:  [ → B ]
 * //   Forced:       [ → D ]
 */
class FslActions extends LitElement {
    constructor() {
        super(...arguments);
        this._actions = [];
        this._main = [];
        this._regular = [];
        this._forced = [];
        this._host = null;
        this._unbind = null;
    }
    connectedCallback() {
        super.connectedCallback();
        const host = closest_wc(this, 'instance');
        this._host = host;
        if (host === null) {
            return;
        }
        const sync = () => { this._derive(host); };
        for (const ev of ACTION_EVENTS) {
            host.addEventListener(ev, sync);
        }
        this._unbind = () => { for (const ev of ACTION_EVENTS) {
            host.removeEventListener(ev, sync);
        } };
        this._derive(host);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._unbind !== null) {
            this._unbind();
            this._unbind = null;
        }
    }
    /** Recompute the legal actions and the three transition groups from the host. */
    _derive(host) {
        const current = host.machine.state();
        this._actions = host.machine.list_exit_actions();
        const main = new Set(), regular = new Set(), forced = new Set();
        for (const e of host.machine.list_edges()) {
            if (e.from !== current || e.to === current) {
                continue;
            } // only non-self exits from here
            const to = e.to;
            if (e.main_path) {
                main.add(to);
            }
            else if (e.forced_only) {
                forced.add(to);
            }
            else {
                regular.add(to);
            }
        }
        this._main = [...main];
        this._regular = [...regular];
        this._forced = [...forced];
    }
    /** A transition group, or `''` when empty. Forced targets fire via force. */
    _group(host, label, targets, forced) {
        if (targets.length === 0) {
            return '';
        }
        return html `
      <div class="group">
        <div class="label">${label}</div>
        ${targets.map(to => html `
          <button class="trn" @click=${() => { if (forced) {
            host.force_transition(to);
        }
        else {
            host.transition(to);
        } }}>→ ${to}</button>
        `)}
      </div>
    `;
    }
    render() {
        const host = this._host;
        if (host === null) {
            return html `<div class="actions" part="actions"><span class="empty">no machine</span></div>`;
        }
        if (this._actions.length === 0 && this._main.length === 0
            && this._regular.length === 0 && this._forced.length === 0) {
            return html `<div class="actions" part="actions"><span class="empty">no actions available</span></div>`;
        }
        return html `
      <div class="actions" part="actions">
        ${this._actions.length === 0 ? '' : html `
          <div class="group">
            <div class="label">Actions</div>
            ${this._actions.map(a => html `
              <button class="act" @click=${() => host.do(a)}>${a}</button>
            `)}
          </div>
        `}
        ${this._group(host, 'Main', this._main, false)}
        ${this._group(host, 'Transitions', this._regular, false)}
        ${this._group(host, 'Forced', this._forced, true)}
      </div>
    `;
    }
}
FslActions.styles = css `
    :host { display: block; }
    /* Horizontal bar: groups flow left-to-right and wrap; within a group the
       label sits inline before its buttons. Suits the panel's home below the
       workbench rather than a tall side dock. */
    .actions {
      display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 0.4rem 1.1rem;
      padding: 0.55rem 0.65rem; background: var(--_fsl-surface);
      color: var(--_fsl-text); font: 0.8rem var(--_fsl-font);
    }
    .group { display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 0.3rem; }
    .label {
      font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em;
      color: var(--_fsl-muted); white-space: nowrap;
    }
    button {
      text-align: center; padding: 0.4rem 0.6rem; cursor: pointer; border-radius: 4px;
      border: 1px solid var(--_fsl-border); background: var(--_fsl-surface);
      color: var(--_fsl-text); font: 600 0.8rem var(--_fsl-font);
    }
    button:hover { background: color-mix(in srgb, var(--_fsl-text) 8%, var(--_fsl-surface)); }
    .empty { color: var(--_fsl-muted); font-style: italic; }
    ${fslTokens}
  `;
__decorate$7([
    state()
], FslActions.prototype, "_actions", void 0);
__decorate$7([
    state()
], FslActions.prototype, "_main", void 0);
__decorate$7([
    state()
], FslActions.prototype, "_regular", void 0);
__decorate$7([
    state()
], FslActions.prototype, "_forced", void 0);

var __decorate$6 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
/** `<n> word`, with a regular plural `s` unless `n === 1`. */
function plural(n, word) {
    return `${n} ${word}${n === 1 ? '' : 's'}`;
}
/**
 * `<fsl-footer>` — a status bar for a parent `<fsl-instance>`.
 *
 * Shows the current state with both **local** counts (actions firable from
 * here + transitions out of here) and **global** machine counts: distinct
 * action *names*, **action-starts** (action-bearing edges — each place an
 * action fires from), and total transitions. Plus terminal/complete badges.
 *
 * Local counts track transitions by observing the host's reflected
 * `current-state` / `legal-actions` attributes; the global counts refresh on
 * `fsl-machine-rebuilt`, so the footer survives a live rebuild (#1387). A
 * default slot carries embedder status. Standalone (no `<fsl-instance>`
 * ancestor) it renders just the slot.
 * @element fsl-footer
 * @csspart bar - The footer bar container.
 * @slot - Trailing custom status, right-aligned.
 */
class FslFooter extends LitElement {
    constructor() {
        super(...arguments);
        this._state = '';
        this._actions = 0; // local: actions firable from the current state
        this._transitions = 0; // local: transitions out of the current state
        this._terminal = false;
        this._complete = false;
        this._gActions = 0; // global: distinct action names
        this._gStarts = 0; // global: action-starts (action-bearing edges)
        this._gTransitions = 0; // global: total transitions (all edges)
        this._observer = null;
        this._host = null;
        this._onRebuilt = () => { this._syncMachine(); };
    }
    connectedCallback() {
        super.connectedCallback();
        const host = closest_wc(this, 'instance');
        this._host = host;
        if (host === null) {
            return;
        }
        const sync = () => {
            var _a, _b;
            this._state = (_a = host.getAttribute('current-state')) !== null && _a !== void 0 ? _a : '';
            const la = ((_b = host.getAttribute('legal-actions')) !== null && _b !== void 0 ? _b : '').trim();
            this._actions = la === '' ? 0 : la.split(/\s+/).length;
            this._terminal = host.hasAttribute('terminal');
            this._complete = host.hasAttribute('complete');
            this._syncMachine();
        };
        this._observer = new MutationObserver(sync);
        this._observer.observe(host, {
            attributes: true,
            attributeFilter: ['current-state', 'legal-actions', 'terminal', 'complete'],
        });
        host.addEventListener('fsl-machine-rebuilt', this._onRebuilt);
        sync();
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._observer !== null) {
            this._observer.disconnect();
            this._observer = null;
        }
        if (this._host !== null) {
            this._host.removeEventListener('fsl-machine-rebuilt', this._onRebuilt);
            this._host = null;
        }
    }
    /**
     * Recompute the machine-derived counts: local transitions out of the current
     *  state, and the global action / action-start / transition totals. Only
     *  called while a host is attached, so `_host` is non-null here.
     */
    _syncMachine() {
        var _a;
        const host = this._host;
        const current = (_a = host.getAttribute('current-state')) !== null && _a !== void 0 ? _a : '';
        const edges = host.machine.list_edges();
        this._transitions = edges.filter(e => e.from === current).length;
        const actionEdges = edges.filter(e => typeof e.action === 'string');
        this._gStarts = actionEdges.length;
        this._gActions = new Set(actionEdges.map(e => e.action)).size;
        this._gTransitions = edges.length;
    }
    render() {
        return html `
      <div class="bar" part="bar">
        <span>${this._state ? html `<span class="state">${this._state}</span>, ` : ''}${plural(this._actions, 'action')}, ${plural(this._transitions, 'transition')}; globally ${plural(this._gActions, 'action')}, ${plural(this._gStarts, 'start')}, ${plural(this._gTransitions, 'transition')}</span>
        ${this._terminal ? html `<span class="badge">terminal</span>` : ''}
        ${this._complete ? html `<span class="badge">complete</span>` : ''}
        <span class="spacer"></span>
        <slot></slot>
      </div>
    `;
    }
}
FslFooter.styles = css `
    :host { display: block; }
    .bar {
      display: flex; align-items: center; gap: 0.6rem;
      font: 12px var(--_fsl-font-mono); color: var(--_fsl-muted);
      padding: 0.3rem 0.7rem; background: var(--_fsl-surface);
      border-top: 1px solid var(--_fsl-border);
    }
    .state { color: var(--_fsl-text); font-weight: 600; }
    .badge { padding: 0 0.4rem; border-radius: 3px; background: var(--_fsl-accent); color: #06101f; font-weight: 600; }
    .spacer { flex: 1; }
    ${fslTokens}
  `;
__decorate$6([
    state()
], FslFooter.prototype, "_state", void 0);
__decorate$6([
    state()
], FslFooter.prototype, "_actions", void 0);
__decorate$6([
    state()
], FslFooter.prototype, "_transitions", void 0);
__decorate$6([
    state()
], FslFooter.prototype, "_terminal", void 0);
__decorate$6([
    state()
], FslFooter.prototype, "_complete", void 0);
__decorate$6([
    state()
], FslFooter.prototype, "_gActions", void 0);
__decorate$6([
    state()
], FslFooter.prototype, "_gStarts", void 0);
__decorate$6([
    state()
], FslFooter.prototype, "_gTransitions", void 0);

var __decorate$5 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
/**
 * `<fsl-help>` — a documentation drawer shell: a titled, scrollable panel with
 * a close button and a default slot for content (typically foldable
 * `<details>` sections). Presentational and self-contained — it owns no machine
 * binding. The reflected `open` attribute drives visibility, so embedders can
 * animate it (e.g. a width transition on the host) purely from CSS.
 * @element fsl-help
 * @csspart drawer - The drawer container.
 * @csspart head - The header bar.
 * @csspart body - The scrollable content area.
 * @csspart close - The close button.
 * @slot - The documentation content.
 * @fires {CustomEvent<void>} close - When the close button is pressed.
 */
class FslHelp extends LitElement {
    constructor() {
        super(...arguments);
        /** Whether the drawer is shown. Reflected so embedders can animate off it. */
        this.open = false;
        /** Heading shown in the drawer's header. */
        this.heading = 'Documentation';
        /** Close the drawer and emit `close`. */
        this._onClose = () => {
            this.open = false;
            this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
        };
    }
    render() {
        return html `
      <aside class="drawer" part="drawer" ?hidden=${!this.open}>
        <div class="head" part="head">
          <h2>${this.heading}</h2>
          <button class="close" part="close" @click=${this._onClose} aria-label="Close documentation" title="Close">&times;</button>
        </div>
        <div class="body" part="body"><slot></slot></div>
      </aside>
    `;
    }
}
FslHelp.styles = css `
    :host { display: block; }
    :host([open]) { /* embedders animate the host (e.g. width) off this attribute */ }
    .drawer {
      display: flex; flex-direction: column; height: 100%; overflow: hidden;
      background: var(--_fsl-surface); color: var(--_fsl-text);
      border-left: 1px solid var(--_fsl-border);
    }
    .head {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.7rem 0.9rem; border-bottom: 1px solid var(--_fsl-border);
    }
    .head h2 {
      margin: 0; font-size: 0.7rem; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--_fsl-muted);
    }
    .close {
      margin-left: auto; width: 1.6rem; height: 1.6rem; display: grid; place-items: center;
      background: none; border: 0; border-radius: 4px; color: inherit; cursor: pointer; font-size: 1.1rem; line-height: 1;
    }
    .close:hover { background: rgba(127, 127, 127, 0.18); }
    .body { overflow-y: auto; padding: 0.5rem 0.9rem; font-size: 0.86rem; line-height: 1.5; }
    ${fslTokens}
  `;
__decorate$5([
    property({ type: Boolean, reflect: true })
], FslHelp.prototype, "open", void 0);
__decorate$5([
    property({ type: String })
], FslHelp.prototype, "heading", void 0);

var __decorate$4 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
/**
 * `<fsl-history>` — the visited-state timeline for a parent `<fsl-instance>`.
 *
 * Listens to the host's `fsl-transition` DOM events (re-emitted once per
 * transition, #639) and records the host's reflected `current-state`, so it
 * captures every transition and survives a live machine rebuild without a
 * machine subscription. Standalone (no host ancestor) renders empty.
 * @element fsl-history
 * @csspart timeline - The timeline container.
 */
class FslHistory extends LitElement {
    constructor() {
        super(...arguments);
        this._history = [];
        this._unbind = null;
    }
    connectedCallback() {
        super.connectedCallback();
        const host = closest_wc(this, 'instance');
        if (host === null) {
            return;
        }
        const push = () => {
            const s = host.getAttribute('current-state');
            if (s !== null && s !== this._history[this._history.length - 1]) {
                this._history = [...this._history, s];
            }
        };
        host.addEventListener('fsl-transition', push);
        this._unbind = () => { host.removeEventListener('fsl-transition', push); };
        push(); // seed with the initial state
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._unbind !== null) {
            this._unbind();
            this._unbind = null;
        }
    }
    render() {
        if (this._history.length === 0) {
            return html `<div class="timeline" part="timeline"><span class="empty">no history</span></div>`;
        }
        const last = this._history.length - 1;
        return html `
      <div class="timeline" part="timeline">
        ${this._history.map((s, i) => html `${i > 0 ? html `<span class="arrow">→</span>` : ''}<span class="state ${i === last ? 'current' : ''}">${s}</span>`)}
      </div>
    `;
    }
}
FslHistory.styles = css `
    :host { display: block; }
    .timeline {
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem;
      padding: 0.5rem 0.7rem; font: 0.82rem var(--_fsl-font);
      color: var(--_fsl-text); background: var(--_fsl-surface);
    }
    .state {
      padding: 0.1rem 0.45rem; border-radius: 4px; border: 1px solid var(--_fsl-border);
      background: color-mix(in srgb, var(--_fsl-accent) 14%, transparent);
    }
    .state.current { background: var(--_fsl-accent); color: #06101f; font-weight: 600; }
    .arrow { color: var(--_fsl-muted); }
    .empty { color: var(--_fsl-muted); font-style: italic; padding: 0.5rem 0.7rem; }
    ${fslTokens}
  `;
__decorate$4([
    state()
], FslHistory.prototype, "_history", void 0);

var __decorate$3 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
/** Host DOM events that can change the machine's data. */
const DATA_EVENTS = ['fsl-transition', 'fsl-data-change', 'fsl-machine-rebuilt'];
const JSON_TOKEN_RE = /"(?:\\.|[^"\\])*"|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
/**
 * Split a pretty-printed JSON string into classified tokens for syntax
 * highlighting. A quoted run is a `key` when the next non-space character is
 * `:`, otherwise a `string`; `true`/`false` are `bool`, `null` is `null`,
 * numbers are `number`, and everything between (braces, commas, whitespace) is
 * `plain`. Driven by the text, not a JSON parse, so it never throws.
 * @param json - A JSON string (typically `JSON.stringify(value, null, 2)`).
 * @returns The tokens in source order; concatenating their `text` reproduces `json`.
 * @example
 * tokenizeJson('{"a": 1}');
 * // [{text:'{',kind:'plain'}, {text:'"a"',kind:'key'}, {text:': ',kind:'plain'},
 * //  {text:'1',kind:'number'}, {text:'}',kind:'plain'}]
 */
function tokenizeJson(json) {
    const out = [];
    let last = 0;
    let m;
    JSON_TOKEN_RE.lastIndex = 0;
    while ((m = JSON_TOKEN_RE.exec(json)) !== null) {
        if (m.index > last) {
            out.push({ text: json.slice(last, m.index), kind: 'plain' });
        }
        const s = m[0];
        let kind;
        if (s[0] === '"') {
            kind = /^\s*:/.test(json.slice(m.index + s.length)) ? 'key' : 'string';
        }
        else if (s === 'true' || s === 'false') {
            kind = 'bool';
        }
        else if (s === 'null') {
            kind = 'null';
        }
        else {
            kind = 'number';
        }
        out.push({ text: s, kind });
        last = m.index + s.length;
    }
    if (last < json.length) {
        out.push({ text: json.slice(last), kind: 'plain' });
    }
    return out;
}
/**
 * `<fsl-data-inspector>` — a syntax-highlighted view of a parent
 * `<fsl-instance>`'s extended-state data. Re-reads `host.machine.data()` on the
 * host's transition / data-change / rebuild DOM events. The panel is bounded and
 * scrolls internally (a self-contained vertical column). Renders `no data` when
 * the machine carries none; standalone (no host) renders empty.
 * @element fsl-data-inspector
 * @csspart inspector - The scrollable container.
 */
class FslDataInspector extends LitElement {
    constructor() {
        super(...arguments);
        this._data = undefined;
        this._unbind = null;
    }
    connectedCallback() {
        super.connectedCallback();
        const host = closest_wc(this, 'instance');
        if (host === null) {
            return;
        }
        const sync = () => { this._data = host.machine.data(); };
        for (const ev of DATA_EVENTS) {
            host.addEventListener(ev, sync);
        }
        this._unbind = () => { for (const ev of DATA_EVENTS) {
            host.removeEventListener(ev, sync);
        } };
        sync();
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._unbind !== null) {
            this._unbind();
            this._unbind = null;
        }
    }
    render() {
        return html `
      <div class="inspector" part="inspector">
        ${this._data === undefined
            ? html `<span class="empty">no data</span>`
            : html `<pre class="json">${tokenizeJson(JSON.stringify(this._data, null, 2)).map(t => t.kind === 'plain' ? t.text : html `<span class="tok-${t.kind}">${t.text}</span>`)}</pre>`}
      </div>
    `;
    }
}
FslDataInspector.styles = css `
    :host { display: block; }
    .inspector {
      padding: 0.5rem 0.7rem; font: 0.8rem var(--_fsl-font-mono);
      color: var(--_fsl-text); background: var(--_fsl-surface);
      /* Bounded + scrollable so a large data tree stays a self-contained panel. */
      max-height: var(--fsl-data-inspector-max-height, 16em); overflow: auto;
    }
    .json { margin: 0; white-space: pre-wrap; }
    .empty { color: var(--_fsl-muted); font-style: italic; }
    /* JSON syntax colors — token-overridable, with light defaults; the host's
       theme cascades dark values through --fsl-color-json-*. */
    .tok-key    { color: var(--fsl-color-json-key,    #5b3da8); }
    .tok-string { color: var(--fsl-color-json-string, #2e7d32); }
    .tok-number { color: var(--fsl-color-json-number, #b8860b); }
    .tok-bool, .tok-null { color: var(--fsl-color-json-atom, #c2185b); }
    ${fslTokens}
  `;
__decorate$3([
    state()
], FslDataInspector.prototype, "_data", void 0);

var __decorate$2 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
/** Machine events (re-emitted by the host as `fsl-<name>`, #639) the log shows. */
const LOGGED_EVENTS = [
    'transition', 'entry', 'exit', 'terminal', 'complete',
    'action', 'rejection', 'override', 'data-change', 'timeout', 'error',
];
/**
 * `<fsl-hook-log>` — a running log of a parent `<fsl-instance>`'s machine
 * events, listening to the host's re-emitted `fsl-*` DOM events (#639). Keeps
 * the most recent {@link MAX_ENTRIES}. Standalone (no host ancestor) is empty.
 * @element fsl-hook-log
 * @csspart log - The log container.
 */
class FslHookLog extends LitElement {
    constructor() {
        super(...arguments);
        this._log = [];
        this._unbind = null;
    }
    connectedCallback() {
        super.connectedCallback();
        const host = closest_wc(this, 'instance');
        if (host === null) {
            return;
        }
        const offs = LOGGED_EVENTS.map(name => {
            const handler = () => { this._log = [...this._log.slice(-49), name]; };
            host.addEventListener(`fsl-${name}`, handler);
            return () => { host.removeEventListener(`fsl-${name}`, handler); };
        });
        this._unbind = () => { for (const off of offs) {
            off();
        } };
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._unbind !== null) {
            this._unbind();
            this._unbind = null;
        }
    }
    render() {
        return html `
      <div class="log" part="log">
        ${this._log.length === 0
            ? html `<span class="empty">no events</span>`
            : this._log.map(name => html `<div class="entry">${name}</div>`)}
      </div>
    `;
    }
}
FslHookLog.styles = css `
    :host { display: block; }
    .log {
      padding: 0.4rem 0.6rem; font: 0.78rem var(--_fsl-font-mono);
      color: var(--_fsl-text); background: var(--_fsl-surface);
      /* Bounded + scrollable so the running log stays a self-contained panel
         instead of growing without limit and crowding sibling panels out. */
      max-height: var(--fsl-hook-log-max-height, 12em); overflow-y: auto;
    }
    .entry { padding: 0.05rem 0; color: var(--_fsl-text); }
    .entry::before { content: "▸ "; color: var(--_fsl-accent); }
    .empty { color: var(--_fsl-muted); font-style: italic; }
    ${fslTokens}
  `;
__decorate$2([
    state()
], FslHookLog.prototype, "_log", void 0);

var __decorate$1 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
/**
 * `<fsl-simulation>` — a random-walk driver for a parent `<fsl-instance>`.
 *
 * `Step` fires one uniformly-random legal action; `Play` auto-steps every
 * {@link FslSimulation.interval} ms and stops automatically when the machine
 * reaches a terminal state (no legal actions). Standalone (no host ancestor)
 * the controls are disabled.
 * @element fsl-simulation
 * @csspart sim - The control row.
 * @attr {number} interval - Auto-step period in milliseconds (default 600).
 */
class FslSimulation extends LitElement {
    constructor() {
        super(...arguments);
        /** Auto-step period in milliseconds. */
        this.interval = 600;
        this._running = false;
        this._steps = 0;
        this._host = null;
        this._timer = null;
        this._step = () => {
            if (this._host === null) {
                return;
            }
            const actions = this._host.machine.list_exit_actions();
            if (actions.length === 0) {
                this._stop();
                return;
            } // terminal — nothing to do
            this._host.do(actions[Math.floor(Math.random() * actions.length)]);
            this._steps += 1;
        };
        this._toggle = () => { if (this._running) {
            this._stop();
        }
        else {
            this._start();
        } };
    }
    connectedCallback() {
        super.connectedCallback();
        this._host = closest_wc(this, 'instance');
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this._stop();
    }
    _start() {
        if (this._host === null) {
            return;
        }
        this._running = true;
        this._timer = setInterval(this._step, this.interval);
    }
    _stop() {
        this._running = false;
        if (this._timer !== null) {
            clearInterval(this._timer);
            this._timer = null;
        }
    }
    render() {
        return html `
      <div class="sim" part="sim">
        <button class="btn" @click=${this._step}>Step</button>
        <button class="btn" @click=${this._toggle}>${this._running ? 'Pause' : 'Play'}</button>
        <span class="count ${this._host === null ? 'idle' : ''}">${this._steps} step${this._steps === 1 ? '' : 's'}</span>
      </div>
    `;
    }
}
FslSimulation.styles = css `
    :host { display: block; }
    .sim {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.4rem 0.6rem; background: var(--_fsl-surface);
      border-top: 1px solid var(--_fsl-border); font: 0.8rem var(--_fsl-font);
    }
    .btn {
      height: 1.8rem; padding: 0 0.7rem; cursor: pointer; border-radius: 4px;
      border: 1px solid var(--_fsl-border); background: var(--_fsl-surface); color: var(--_fsl-text);
      font: 600 0.8rem var(--_fsl-font);
    }
    .btn:hover { background: color-mix(in srgb, var(--_fsl-text) 8%, var(--_fsl-surface)); }
    .count { color: var(--_fsl-muted); }
    .count.idle { font-style: italic; }
    ${fslTokens}
  `;
__decorate$1([
    property({ type: Number })
], FslSimulation.prototype, "interval", void 0);
__decorate$1([
    state()
], FslSimulation.prototype, "_running", void 0);
__decorate$1([
    state()
], FslSimulation.prototype, "_steps", void 0);

/**
 * `<fsl-export>` — export buttons for a parent `<fsl-instance>`. Each produces a
 * string from the host's machine and fires `fsl-export` with `{ format,
 * content }`; the embedder decides what to do with it (copy, download, show).
 * Formats: Graphviz `dot` (via `machine_to_dot`), `json` (the machine's
 * `serialize()`), and `fsl` (the source). Standalone is inert.
 * @element fsl-export
 * @csspart export - The button row.
 * @fires {CustomEvent<{format: FslExportFormat, content: string}>} fsl-export
 */
class FslExport extends LitElement {
    constructor() {
        super(...arguments);
        this._host = null;
    }
    connectedCallback() {
        super.connectedCallback();
        this._host = closest_wc(this, 'instance');
    }
    _emit(format) {
        if (this._host === null) {
            return;
        }
        let content;
        if (format === 'dot') {
            content = machine_to_dot(this._host.machine);
        }
        else if (format === 'json') {
            content = JSON.stringify(this._host.machine.serialize(), null, 2);
        }
        else {
            content = this._host.fsl;
        }
        this.dispatchEvent(new CustomEvent('fsl-export', { detail: { format, content }, bubbles: true, composed: true }));
    }
    render() {
        return html `
      <div class="export" part="export">
        <span class="label">export</span>
        <button class="btn" @click=${() => this._emit('dot')}>DOT</button>
        <button class="btn" @click=${() => this._emit('json')}>JSON</button>
        <button class="btn" @click=${() => this._emit('fsl')}>FSL</button>
      </div>
    `;
    }
}
FslExport.styles = css `
    :host { display: block; }
    .export {
      display: flex; align-items: center; gap: 0.4rem;
      padding: 0.4rem 0.6rem; background: var(--_fsl-surface);
      border-top: 1px solid var(--_fsl-border);
    }
    .btn {
      height: 1.8rem; padding: 0 0.7rem; cursor: pointer; border-radius: 4px;
      border: 1px solid var(--_fsl-border); background: var(--_fsl-surface); color: var(--_fsl-text);
      font: 600 0.78rem var(--_fsl-font);
    }
    .btn:hover { background: color-mix(in srgb, var(--_fsl-text) 8%, var(--_fsl-surface)); }
    .label { color: var(--_fsl-muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.07em; }
    ${fslTokens}
  `;

var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
/**
 * `<fsl-stochastic>` — a statistical/Monte-Carlo explorer for a parent
 * `<fsl-instance>` (fsl#1384).  Builds its own throwaway machine from the
 * host's `.fsl` source (never touching the live machine) and renders
 * aggregate run statistics in-panel.  Standalone (no host) the controls are
 * disabled.
 * @element fsl-stochastic
 * @csspart controls - The control row.
 * @fires fsl-stochastic-complete - CustomEvent<JssmStochasticSummary> after a run.
 */
class FslStochastic extends LitElement {
    constructor() {
        super(...arguments);
        /** Run-count (montecarlo). Defaults from editor_config().stochastic_run_count. */
        this.runs = STOCHASTIC_DEFAULT_RUNS;
        /** Per-run step cap (montecarlo) / walk length (steady_state). */
        this.maxSteps = STOCHASTIC_DEFAULT_MAX_STEPS;
        /** Seed string ('' = time-based). Kept as string so the field can be blank. */
        this.seed = '';
        /** Run mode. */
        this.mode = 'montecarlo';
        this._summary = null;
        this._error = null;
        this._host = null;
        this._playing = false;
        /** Execute a batch synchronously and render the aggregates. */
        this.run = () => {
            if (this._host === null) {
                return;
            }
            let machine;
            try {
                machine = sm `${this._host.fsl}`;
            }
            catch (_a) {
                this._error = 'Cannot run on invalid FSL source.';
                this._summary = null;
                return;
            }
            this._error = null;
            const seedNum = this.seed.trim() === '' ? undefined : Number(this.seed);
            this._summary = machine.stochastic_summary({
                mode: this.mode, runs: this.runs, max_steps: this.maxSteps, seed: seedNum,
            });
            this.dispatchEvent(new CustomEvent('fsl-stochastic-complete', {
                detail: this._summary, bubbles: true, composed: true,
            }));
        };
        /**
         * Animate the batch: accumulate runs incrementally via `requestAnimationFrame`,
         * redrawing as they land. Resolves when the batch completes or is paused-to-stop.
         *
         * Falls back to immediate (synchronous chunk) scheduling under jsdom where
         * `requestAnimationFrame` is undefined.
         * @example
         * panel.runs = 100;
         * await panel.play(); // resolves when all 100 runs are done
         */
        this.play = () => new Promise((resolve) => {
            if (this._host === null) {
                resolve();
                return;
            }
            let machine;
            try {
                machine = sm `${this._host.fsl}`;
            }
            catch (_a) {
                this._error = 'Cannot run on invalid FSL source.';
                this._summary = null;
                resolve();
                return;
            }
            this._error = null;
            if (this.seed.trim() !== '') {
                machine.rng_seed = Number(this.seed);
            }
            const effective_seed = machine.rng_seed;
            const state_visits = new Map();
            const edges = new Map();
            const path_lengths = [];
            let reached = 0;
            let capped = 0;
            let runs = 0;
            const iter = machine.stochastic_runs({ mode: this.mode, runs: this.runs, max_steps: this.maxSteps });
            this._playing = true;
            const CHUNK = 50;
            const schedule = (fn) => {
                if (typeof requestAnimationFrame === 'function') {
                    requestAnimationFrame(fn);
                }
                else {
                    fn();
                }
            };
            const tick = () => {
                var _a, _b;
                if (!this._playing) {
                    resolve();
                    return;
                }
                for (let i = 0; i < CHUNK; i++) {
                    const next = iter.next();
                    if (next.done) {
                        this._commit(state_visits, edges, path_lengths, reached, capped, runs, effective_seed);
                        this._playing = false;
                        resolve();
                        return;
                    }
                    const r = next.value;
                    runs += 1;
                    for (const s of r.states) {
                        state_visits.set(s, ((_a = state_visits.get(s)) !== null && _a !== void 0 ? _a : 0) + 1);
                    }
                    for (const e of r.edges) {
                        edges.set(e, ((_b = edges.get(e)) !== null && _b !== void 0 ? _b : 0) + 1);
                    }
                    if (this.mode === 'montecarlo') {
                        if (r.terminated) {
                            reached += 1;
                            path_lengths.push(r.length);
                        }
                        else {
                            capped += 1;
                        }
                    }
                }
                this._commit(state_visits, edges, path_lengths, reached, capped, runs, effective_seed);
                schedule(tick);
            };
            schedule(tick);
        });
        /** Toggle between playing and paused. Starts a new {@link play} batch when idle. */
        this._togglePlay = () => { if (this._playing) {
            this._playing = false;
        }
        else {
            void this.play();
        } };
        this._onMode = (e) => { this.mode = e.target.value; };
        this._onRuns = (e) => { this.runs = Number(e.target.value); };
        this._onMax = (e) => { this.maxSteps = Number(e.target.value); };
        this._onSeed = (e) => { this.seed = e.target.value; };
    }
    connectedCallback() {
        super.connectedCallback();
        this._host = closest_wc(this, 'instance');
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this._host = null;
    }
    /**
     * Read `editor_config().stochastic_run_count` after the first render so the
     * host's machine is guaranteed to be built (machine construction happens in
     * the host's connectedCallback, which may fire after the panel's own
     * connectedCallback in some environments).
     */
    firstUpdated(_changedProperties) {
        var _a, _b, _c, _d;
        super.firstUpdated(_changedProperties);
        try {
            const declared = (_d = (_c = (_b = (_a = this._host) === null || _a === void 0 ? void 0 : _a.machine) === null || _b === void 0 ? void 0 : _b.editor_config) === null || _c === void 0 ? void 0 : _c.call(_b)) === null || _d === void 0 ? void 0 : _d.stochastic_run_count;
            if (typeof declared === 'number') {
                this.runs = declared;
            }
        }
        catch ( /* machine not ready — leave default */_e) { /* machine not ready — leave default */ }
    }
    /**
     * Fold accumulated counters into a rendered summary. Shared by {@link play}
     * for incremental rendering during animation.
     * @param state_visits     - Accumulated visit counts per state name.
     * @param edge_traversals  - Accumulated traversal counts per edge key.
     * @param path_lengths     - Lengths of completed (terminated) paths.
     * @param terminal_reached - Count of runs that reached a terminal state.
     * @param capped           - Count of runs that hit the step cap.
     * @param runs             - Total runs processed so far.
     * @param seed             - The effective RNG seed used for this batch.
     */
    _commit(state_visits, edge_traversals, path_lengths, terminal_reached, capped, runs, seed) {
        const total = [...state_visits.values()].reduce((a, b) => a + b, 0);
        const frac = new Map();
        for (const [s, c] of state_visits) {
            frac.set(s, c / total);
        }
        const summary = {
            mode: this.mode, runs, seed,
            state_visits, state_visit_fraction: frac, edge_traversals,
        };
        if (this.mode === 'montecarlo') {
            summary.path_lengths = path_lengths;
            summary.terminal_reached = terminal_reached;
            summary.capped = capped;
        }
        this._summary = summary;
    }
    _bars() {
        const frac = this._summary.state_visit_fraction;
        const rows = [...frac].sort((a, b) => b[1] - a[1]);
        return html `${rows.map(([name, f]) => html `
      <div class="bar-row">
        <span>${name}</span>
        <span class="track"><span class="bar" style="width:${(f * 100).toFixed(1)}%"></span></span>
        <span>${(f * 100).toFixed(1)}%</span>
      </div>
    `)}`;
    }
    _panes() {
        const s = this._summary;
        const mc = s.mode === 'montecarlo';
        const reached = mc && s.runs > 0 ? Math.round((s.terminal_reached / s.runs) * 100) : 0;
        const capped = mc && s.runs > 0 ? Math.round((s.capped / s.runs) * 100) : 0;
        return html `
      <div class="panes">
        <div><strong>State visits</strong></div>
        ${this._bars()}
        ${mc ? html `<div>Reached terminal: ${reached}% · Hit cap: ${capped}%</div>` : html `<div class="muted">steady-state distribution</div>`}
      </div>
    `;
    }
    render() {
        const disabled = this._host === null;
        return html `
      <div class="controls" part="controls">
        <select @change=${this._onMode} .value=${this.mode}>
          <option value="montecarlo">Monte Carlo</option>
          <option value="steady_state">Steady-state</option>
        </select>
        ${this.mode === 'montecarlo'
            ? html `<label>runs <input type="number" .value=${String(this.runs)} @change=${this._onRuns}></label>`
            : ''}
        <label>max steps <input type="number" .value=${String(this.maxSteps)} @change=${this._onMax}></label>
        <label>seed <input type="text" .value=${this.seed} @change=${this._onSeed}></label>
        <button class="run" ?disabled=${disabled} @click=${this.run}>Run</button>
        <button class="btn" ?disabled=${disabled} @click=${this._togglePlay}>${this._playing ? 'Pause' : 'Play'}</button>
      </div>
      ${this._error ? html `<div class="error">${this._error}</div>` : ''}
      ${this._summary && !this._error ? this._panes() : html `<div class="panes muted">No run yet.</div>`}
    `;
    }
}
FslStochastic.styles = css `
    :host { display: block; font: 0.8rem var(--_fsl-font); color: var(--_fsl-text); }
    .controls {
      display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
      padding: 0.4rem 0.6rem; background: var(--_fsl-surface);
      border-top: 1px solid var(--_fsl-border);
    }
    .btn, .run {
      height: 1.8rem; padding: 0 0.7rem; cursor: pointer; border-radius: 4px;
      border: 1px solid var(--_fsl-border); background: var(--_fsl-surface);
      color: var(--_fsl-text); font: 600 0.8rem var(--_fsl-font);
    }
    .btn:disabled, .run:disabled { opacity: 0.5; cursor: not-allowed; }
    input { width: 4.5rem; height: 1.6rem; background: var(--_fsl-surface);
            color: var(--_fsl-text); border: 1px solid var(--_fsl-border); border-radius: 4px; }
    .panes { padding: 0.4rem 0.6rem; display: grid; gap: 0.5rem; }
    .bar-row { display: grid; grid-template-columns: 4rem 1fr 3rem; align-items: center; gap: 0.4rem; }
    .track { background: color-mix(in srgb, var(--_fsl-text) 8%, var(--_fsl-surface)); border-radius: 3px; height: 0.9rem; }
    .bar { background: var(--_fsl-accent); height: 0.9rem; border-radius: 3px; }
    .muted { color: var(--_fsl-muted); }
    .error { color: var(--_fsl-danger, #c0392b); padding: 0.4rem 0.6rem; }
    ${fslTokens}
  `;
__decorate([
    property({ type: Number })
], FslStochastic.prototype, "runs", void 0);
__decorate([
    property({ type: Number })
], FslStochastic.prototype, "maxSteps", void 0);
__decorate([
    property({ type: String })
], FslStochastic.prototype, "seed", void 0);
__decorate([
    property({ type: String })
], FslStochastic.prototype, "mode", void 0);
__decorate([
    state()
], FslStochastic.prototype, "_summary", void 0);
__decorate([
    state()
], FslStochastic.prototype, "_error", void 0);
__decorate([
    state()
], FslStochastic.prototype, "_host", void 0);
__decorate([
    state()
], FslStochastic.prototype, "_playing", void 0);

export { FslActions, FslDataInspector, FslExport, FslFooter, FslHelp, FslHistory, FslHookLog, FslSimulation, FslStochastic, FslToolbar };
