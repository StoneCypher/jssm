import { LitElement, html, css, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { fslTokens } from './fsl_tokens.js';
import { closest_wc } from './wc_tag_helpers.js';
import { machine_to_dot, machine_to_svg_string } from '../jssm_viz.js';
import type { FslLayout } from './fsl_instance_wc.js';
import type { Machine } from '../jssm.js';
import type { ThemeMode, ThemeRegistry } from './fsl_themes.js';

/** Host whose theme, layout, panel visibility, and export source the toolbar drives. */
interface HostTarget extends HTMLElement {
  layout: FslLayout;
  theme: ThemeMode;
  themeName: string;
  themes: ThemeRegistry;
  fsl: string;
  machine: Machine<unknown>;
  isPanelHidden(slot: string): boolean;
  togglePanel(slot: string): void;
}

/** Theme modes offered by the Theme pulldown. */
const THEME_MODES: ReadonlyArray<{ value: ThemeMode; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light',  label: 'Light' },
  { value: 'dark',   label: 'Dark' },
];

/** Which dropdown menu is open (at most one). */
type OpenMenu = '' | 'layout' | 'export' | 'theme';

/** A format the Export pulldown can produce. */
type ExportFormat = 'dot' | 'json' | 'fsl' | 'svg' | 'permalink' | 'embed';

/** Where an export goes. `lastdir` reuses the last chosen directory; `pick`
 *  prompts for a new one. The embedder performs the actual clipboard / file save. */
type ExportDest = 'clipboard' | 'lastdir' | 'pick';

/** Export formats offered by the Export pulldown. */
const EXPORT_FORMATS: ReadonlyArray<{ value: ExportFormat; label: string }> = [
  { value: 'dot',       label: 'Graphviz DOT' },
  { value: 'json',      label: 'JSON (serialized)' },
  { value: 'fsl',       label: 'FSL source' },
  { value: 'svg',       label: 'SVG' },
  { value: 'permalink', label: 'Permalink (URL)' },
  { value: 'embed',     label: 'Embed snippet' },
];

/**
 * A shareable URL for the given FSL: the current page URL with the source
 * encoded in the hash (`#fsl=...`). A page that reads the hash on load can
 * restore the machine. Falls back to a bare hash when there is no `location`.
 *
 * @example
 * permalink_for("a -> b;"); // "https://host/path#fsl=a%20-%3E%20b%3B"
 */
export function permalink_for(fsl: string): string {
  const base = typeof location === 'undefined' ? '' : location.href.split('#')[0];
  return `${base}#fsl=${encodeURIComponent(fsl)}`;
}

/**
 * A paste-able HTML snippet that renders the given FSL from the CDN builds: an
 * `<fsl-instance>` reading its source from a `<script type="text/fsl">` child,
 * with a slotted `<fsl-viz>` for the graph.
 *
 * @example
 * embed_snippet_for("a -> b;"); // "<script …instance.js …><fsl-instance>…</fsl-instance>"
 */
export function embed_snippet_for(fsl: string): string {
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
const ICON_VIZ     = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M2 12c0-4.714 0-7.071 1.464-8.536C4.93 2 7.286 2 12 2s7.071 0 8.535 1.464C22 4.93 22 7.286 22 12s0 7.071-1.465 8.535C19.072 22 16.714 22 12 22s-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12" opacity=".5"/><path fill="currentColor" d="M17.576 10.48a.75.75 0 0 0-1.152-.96l-1.797 2.156c-.37.445-.599.716-.786.885a.8.8 0 0 1-.163.122l-.011.005l-.008-.004l-.003-.001a.8.8 0 0 1-.164-.122c-.187-.17-.415-.44-.786-.885l-.292-.35c-.328-.395-.625-.75-.901-1c-.301-.272-.68-.514-1.18-.514s-.878.242-1.18.514c-.276.25-.572.605-.9 1l-1.83 2.194a.75.75 0 0 0 1.153.96l1.797-2.156c.37-.445.599-.716.786-.885a.8.8 0 0 1 .163-.122l.007-.003l.004-.001q.004 0 .011.004a.8.8 0 0 1 .164.122c.187.17.415.44.786.885l.292.35c.329.395.625.75.901 1c.301.272.68.514 1.18.514s.878-.242 1.18-.514c.276-.25.572-.605.9-1z"/></svg>`;
const ICON_CODE    = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8.502 5.387A.75.75 0 0 0 7.5 4.272L5.76 5.836c-.736.663-1.347 1.212-1.766 1.71c-.441.525-.755 1.088-.755 1.784c0 .695.314 1.258.755 1.782c.42.499 1.03 1.049 1.766 1.711l1.74 1.564a.75.75 0 1 0 1.003-1.115l-1.696-1.527c-.788-.709-1.32-1.19-1.663-1.598c-.33-.393-.403-.622-.403-.817c0-.196.072-.425.403-.818c.344-.409.875-.889 1.663-1.598zm6.941 5.111a.75.75 0 0 1 1.06-.055l1.737 1.563c.736.663 1.347 1.213 1.766 1.711c.441.524.755 1.088.755 1.783s-.314 1.259-.755 1.783c-.42.498-1.03 1.048-1.766 1.71l-1.738 1.565a.75.75 0 1 1-1.003-1.116l1.696-1.526c.788-.71 1.32-1.19 1.663-1.599c.33-.392.403-.622.403-.817s-.072-.425-.403-.817c-.344-.41-.875-.89-1.663-1.599L15.5 11.557a.75.75 0 0 1-.056-1.059"/><path fill="currentColor" d="M14.18 4.275a.75.75 0 0 1 .532.918l-3.987 15a.75.75 0 0 1-1.45-.386l3.987-15a.75.75 0 0 1 .918-.532" opacity=".5"/></svg>`;
const ICON_HISTORY = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M5.079 5.069c3.795-3.79 9.965-3.75 13.783.069c3.82 3.82 3.86 9.993.064 13.788s-9.968 3.756-13.788-.064a9.81 9.81 0 0 1-2.798-8.28a.75.75 0 1 1 1.487.203a8.31 8.31 0 0 0 2.371 7.017c3.245 3.244 8.468 3.263 11.668.064c3.199-3.2 3.18-8.423-.064-11.668c-3.243-3.242-8.463-3.263-11.663-.068l.748.003a.75.75 0 1 1-.007 1.5l-2.546-.012a.75.75 0 0 1-.746-.747L3.575 4.33a.75.75 0 1 1 1.5-.008z" clip-rule="evenodd"/><path fill="currentColor" d="M12 7.25a.75.75 0 0 1 .75.75v3.69l2.28 2.28a.75.75 0 1 1-1.06 1.06l-2.427-2.426a1 1 0 0 1-.293-.708V8a.75.75 0 0 1 .75-.75" opacity=".5"/></svg>`;
const ICON_DATA    = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 10c4.418 0 8-1.79 8-4s-3.582-4-8-4s-8 1.79-8 4s3.582 4 8 4"/><path fill="currentColor" d="M4 12v6c0 2.21 3.582 4 8 4s8-1.79 8-4v-6c0 2.21-3.582 4-8 4s-8-1.79-8-4" opacity=".5"/><path fill="currentColor" d="M4 6v6c0 2.21 3.582 4 8 4s8-1.79 8-4V6c0 2.21-3.582 4-8 4S4 8.21 4 6" opacity=".7"/></svg>`;
const ICON_HOOKS   = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M8.732 5.771L5.67 9.914c-1.285 1.739-1.928 2.608-1.574 3.291l.018.034c.375.673 1.485.673 3.704.673c1.233 0 1.85 0 2.236.363l.02.02l3.872-4.57l-.02-.02c-.379-.371-.379-.963-.379-2.148v-.31c0-3.285 0-4.927-.923-5.21s-1.913 1.056-3.892 3.734" clip-rule="evenodd"/><path fill="currentColor" d="M10.453 16.443v.31c0 3.284 0 4.927.923 5.21s1.913-1.056 3.893-3.734l3.062-4.143c1.284-1.739 1.927-2.608 1.573-3.291l-.018-.034c-.375-.673-1.485-.673-3.704-.673c-1.233 0-1.85 0-2.236-.363l-3.872 4.57c.379.371.379.963.379 2.148" opacity=".5"/></svg>`;
const ICON_INFO    = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2s10 4.477 10 10" opacity=".5"/><path fill="currentColor" d="M12 17.75a.75.75 0 0 0 .75-.75v-6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75M12 7a1 1 0 1 1 0 2a1 1 0 0 1 0-2"/></svg>`;
const ICON_PROPS   = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.25 14a3 3 0 1 1 0 6a3 3 0 0 1 0-6m5-10a3 3 0 1 0 0 6a3 3 0 0 0 0-6"/><path fill="currentColor" d="M17.166 7.709a3 3 0 0 0-.021-1.5h4.605a.75.75 0 0 1 0 1.5zm-5.81-1.5a3 3 0 0 0-.022 1.5H1.75a.75.75 0 0 1 0-1.5zm-5 10H1.75a.75.75 0 0 0 0 1.5h4.584a3 3 0 0 1 .022-1.5m5.81 1.5h9.584a.75.75 0 0 0 0-1.5h-9.605a3 3 0 0 1 .02 1.5" opacity=".5"/></svg>`;
const ICON_SIM     = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M23 12c0-1.035-.53-2.07-1.591-2.647L8.597 2.385C6.534 1.264 4 2.724 4 5.033V12z" clip-rule="evenodd"/><path fill="currentColor" d="m8.597 21.615l12.812-6.968A2.99 2.99 0 0 0 23 12H4v6.967c0 2.31 2.534 3.769 4.597 2.648" opacity=".5"/></svg>`;
const ICON_EXPORT  = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.536 20.536C19.07 22 16.714 22 12 22s-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12s0-7.071 1.464-8.536C4.93 2 7.286 2 12 2s7.071 0 8.535 1.464C22 4.93 22 7.286 22 12s0 7.071-1.465 8.535" opacity=".5"/><path fill="currentColor" d="M15.579 14.828a.75.75 0 0 1-.75.75h-4.243a.75.75 0 0 1 0-1.5h2.432L8.642 9.7a.75.75 0 0 1 1.06-1.06l4.377 4.376v-2.432a.75.75 0 0 1 1.5 0z"/></svg>`;

const ICON_LR       = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="8" height="14" rx="1.5" fill="currentColor"/><rect x="13" y="5" width="8" height="14" rx="1.5" fill="currentColor" opacity=".4"/></svg>`;
const ICON_RL       = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="8" height="14" rx="1.5" fill="currentColor" opacity=".4"/><rect x="13" y="5" width="8" height="14" rx="1.5" fill="currentColor"/></svg>`;
const ICON_TB       = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="7" rx="1.5" fill="currentColor"/><rect x="3" y="13" width="18" height="7" rx="1.5" fill="currentColor" opacity=".4"/></svg>`;
const ICON_BT       = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="7" rx="1.5" fill="currentColor" opacity=".4"/><rect x="3" y="13" width="18" height="7" rx="1.5" fill="currentColor"/></svg>`;
const ICON_M_EDITOR = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor"/></svg>`;
const ICON_M_VIEWER = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" opacity=".4"/></svg>`;
const ICON_TABS     = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="8" width="18" height="12" rx="1.5" fill="currentColor" opacity=".4"/><rect x="3" y="4" width="8" height="3.6" rx="1" fill="currentColor"/></svg>`;
const ICON_AUTO     = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" opacity=".4"/><path d="M5 19L19 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>`;

/* Solar bolt-bold-duotone — the actions panel. */
const ICON_ACTIONS  = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M8.732 5.771L5.67 9.914c-1.285 1.739-1.928 2.608-1.574 3.291l.018.034c.375.673 1.485.673 3.704.673c1.233 0 1.85 0 2.236.363l.02.02l3.872-4.57l-.02-.02c-.379-.371-.379-.963-.379-2.148v-.31c0-3.285 0-4.927-.923-5.21s-1.913 1.056-3.892 3.734" clip-rule="evenodd"/><path fill="currentColor" d="M10.453 16.443v.31c0 3.284 0 4.927.923 5.21s1.913-1.056 3.893-3.734l3.062-4.143c1.284-1.739 1.927-2.608 1.573-3.291l-.018-.034c-.375-.673-1.485-.673-3.704-.673c-1.233 0-1.85 0-2.236-.363l-3.872 4.57c.379.371.379.963.379 2.148" opacity=".5"/></svg>`;

/* Solar palette-round-bold-duotone — the theme pulldown. */
const ICON_THEME    = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 18a1 1 0 1 1-2 0a1 1 0 0 1 2 0"/><path fill="currentColor" d="M10 6v12a4 4 0 0 1-8 0V6a4 4 0 1 1 8 0" opacity=".4"/><path fill="currentColor" d="m9.248 20.336l3.974-3.975l5.838-6.09a4.042 4.042 0 0 0-5.776-5.655L10 7.9V18c0 .872-.279 1.679-.752 2.336" opacity=".7"/><path fill="currentColor" d="m13.222 16.362l-3.974 3.974A4 4 0 0 1 6 22h11.9a4 4 0 1 0 0-8h-2.414z"/></svg>`;

/* Validate — a duotone check-circle. Lint — a duotone document with rule lines. */
const ICON_VALIDATE = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2s10 4.477 10 10" opacity=".4"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="m8.5 12.5l2.5 2.5l4.5-5.5"/></svg>`;
const ICON_LINT     = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 10c0-3.771 0-5.657 1.172-6.828S7.229 2 11 2h2c3.771 0 5.657 0 6.828 1.172S21 6.229 21 10v4c0 3.771 0 5.657-1.172 6.828S16.771 22 13 22h-2c-3.771 0-5.657 0-6.828-1.172S3 17.771 3 14z" opacity=".4"/><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M7.5 8.5h9M7.5 12h6M7.5 15.5h3"/></svg>`;

/** Panel slot → label + icon. The toolbar shows a toggle for each panel present. */
interface PanelDef { slot: string; label: string; icon: TemplateResult; }
const PANELS: ReadonlyArray<PanelDef> = [
  { slot: 'actions',              label: 'Actions',    icon: ICON_ACTIONS },
  { slot: 'viz',                  label: 'Renderer',   icon: ICON_VIZ },
  { slot: 'editor',               label: 'Code',       icon: ICON_CODE },
  { slot: 'history',              label: 'History',    icon: ICON_HISTORY },
  { slot: 'data-inspector',       label: 'Data',       icon: ICON_DATA },
  { slot: 'hook-log',             label: 'Events',     icon: ICON_HOOKS },
  { slot: 'info-panel',           label: 'Info',       icon: ICON_INFO },
  { slot: 'effective-properties', label: 'Properties', icon: ICON_PROPS },
  { slot: 'simulation',           label: 'Simulation', icon: ICON_SIM },
];

/** Layout menu entries (icon + label), in the sketch's order. */
const LAYOUTS: ReadonlyArray<{ value: FslLayout; label: string; icon: TemplateResult }> = [
  { value: 'auto',   label: 'Auto · by aspect ratio',       icon: ICON_AUTO },
  { value: 'lr',     label: 'Side by side · editor left',   icon: ICON_LR },
  { value: 'rl',     label: 'Side by side · editor right',  icon: ICON_RL },
  { value: 'tb',     label: 'Top & bottom · editor top',    icon: ICON_TB },
  { value: 'bt',     label: 'Top & bottom · editor bottom', icon: ICON_BT },
  { value: 'editor', label: 'Just editor',                  icon: ICON_M_EDITOR },
  { value: 'viewer', label: 'Just viewer',                  icon: ICON_M_VIEWER },
  { value: 'tabs',   label: 'Tabbed',                       icon: ICON_TABS },
];

/**
 * `<fsl-toolbar>` — a control bar for a parent `<fsl-instance>`. Validate + Lint
 * action buttons (fired as `fsl-validate` / `fsl-lint` events for the embedder
 * to fulfill, each suppressible via `no-validate` / `no-lint`); an icon toggle
 * to show/hide each panel present in the host (renderer, code, history, …); and
 * Layout / Export / Theme pulldowns (the Layout button shows the current
 * layout's icon). Standalone (no host) the host-dependent controls disappear.
 * A trailing slot carries extra buttons.
 *
 * @element fsl-toolbar
 * @csspart toolbar - The bar container.
 * @slot - Trailing custom controls.
 */
export class FslToolbar extends LitElement {

  static styles = css`
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

  @state() private _openMenu: OpenMenu = '';
  /** Active export destination; the next format click targets it. */
  @state() private _dest: ExportDest = 'clipboard';
  /**
   * The last directory an export was saved to this session (its final path
   * segment). When non-empty, the Export menu offers a `to <name>` destination.
   * The embedder sets this after fulfilling a `pick` export.
   */
  @property({ attribute: false }) lastDirectory = '';
  /** Hide the Validate button (e.g. when the consumer validates inline). */
  @property({ type: Boolean, attribute: 'no-validate' }) noValidate = false;
  /** Hide the Lint button. */
  @property({ type: Boolean, attribute: 'no-lint' }) noLint = false;
  private _host: HostTarget | null = null;
  /** Panels actually present in the host — one toggle each. */
  private _present: ReadonlyArray<PanelDef> = [];

  connectedCallback(): void {
    super.connectedCallback();
    const host = closest_wc(this, 'instance') as HostTarget | null;
    this._host = host;
    this._present = host === null ? [] : PANELS.filter(p => host.querySelector(`[slot="${p.slot}"]`) !== null);
  }

  /** Set the theme mode (System/Light/Dark). The host applies the palette + drives
   *  the editor; the menu stays open so a theme can be picked in the same trip. */
  private _setMode(mode: ThemeMode): void {
    if (this._host !== null) { this._host.theme = mode; }
    this.requestUpdate();
  }

  /** Select a named theme from the host's registry. The theme-name buttons only
   *  render when a host exists, so `_host` is non-null here. */
  private _setThemeName(name: string): void {
    this._host!.themeName = name;
    this.requestUpdate();
  }

  private _setLayout(layout: FslLayout): void {
    if (this._host !== null) { this._host.layout = layout; }
    this._openMenu = '';
  }

  /** Set the active export destination; the menu stays open so a format can be
   *  chosen next. */
  private _setDest(dest: ExportDest): void { this._dest = dest; }

  /** Emit `fsl-export` with the chosen format's content + the active destination.
   *  The embedder performs the actual clipboard / file save. */
  private async _export(format: ExportFormat): Promise<void> {
    const host = this._host;
    const destination = this._dest;
    this._openMenu = '';
    if (host === null) { return; }
    let content: string;
    if (format === 'dot') {
      content = machine_to_dot(host.machine);
    } else if (format === 'json') {
      content = JSON.stringify(host.machine.serialize(), null, 2);
    } else if (format === 'svg') {
      content = await machine_to_svg_string(host.machine);
    } else if (format === 'permalink') {
      content = permalink_for(host.fsl);
    } else if (format === 'embed') {
      content = embed_snippet_for(host.fsl);
    } else {
      content = host.fsl;
    }
    this.dispatchEvent(new CustomEvent('fsl-export', { detail: { format, content, destination }, bubbles: true, composed: true }));
  }

  /** Fire a workspace-action intent (validate / lint) for the consumer to
   *  fulfill — the toolbar presents the action; the embedder runs it. The
   *  current machine source rides along in the detail as a convenience. The
   *  buttons only render with a host, so `_host` is non-null here. */
  private _fireAction(type: 'fsl-validate' | 'fsl-lint'): void {
    this.dispatchEvent(new CustomEvent(type, { detail: { fsl: this._host!.fsl }, bubbles: true, composed: true }));
  }

  private _toggleMenu(which: OpenMenu): void { this._openMenu = this._openMenu === which ? '' : which; }

  render(): TemplateResult {
    const host       = this._host;
    const mode       = host?.theme ?? 'light';
    const themeName  = host?.themeName ?? 'Default';
    const themeNames = host ? Object.keys(host.themes) : [];
    const layout     = host?.layout ?? '';
    const layoutIcon = LAYOUTS.find(l => l.value === layout)?.icon ?? ICON_LR;

    return html`
      <div class="toolbar" part="toolbar" role="toolbar" aria-label="Workbench controls">
        <span class="spacer"></span>
        ${host ? html`
          <div class="grp">
            ${this.noValidate ? '' : html`
              <button class="tb icon" aria-label="Validate" title="Validate" @click=${() => this._fireAction('fsl-validate')}>${ICON_VALIDATE}</button>`}
            ${this.noLint ? '' : html`
              <button class="tb icon" aria-label="Lint" title="Lint" @click=${() => this._fireAction('fsl-lint')}>${ICON_LINT}</button>`}
          </div>` : ''}
        <div class="grp">
          ${host
            ? this._present.map(p => html`
                <button class="tb icon" aria-pressed=${!host.isPanelHidden(p.slot)} aria-label=${p.label} title=${p.label}
                        @click=${() => { host.togglePanel(p.slot); this.requestUpdate(); }}>${p.icon}</button>`)
            : ''}
        </div>
        <div class="grp">
          <button class="tb layout" aria-haspopup="true" aria-expanded=${this._openMenu === 'layout'} aria-label="Layout" title="Layout" @click=${() => this._toggleMenu('layout')}>${layoutIcon}<span class="caret">▾</span></button>
          ${this._openMenu === 'layout' ? html`
            <div class="menu" role="menu">
              ${LAYOUTS.map(o => html`
                <button role="menuitemradio" aria-checked=${layout === o.value} @click=${() => this._setLayout(o.value)}>${o.icon}${o.label}</button>`)}
            </div>` : ''}
        </div>
        <div class="grp">
          <button class="tb icon" aria-haspopup="true" aria-expanded=${this._openMenu === 'export'} aria-label="Export" title="Export" @click=${() => this._toggleMenu('export')}>${ICON_EXPORT}</button>
          ${this._openMenu === 'export' ? html`
            <div class="menu" role="menu">
              <button role="menuitemradio" aria-checked=${this._dest === 'clipboard'} @click=${() => this._setDest('clipboard')}>to clipboard</button>
              ${this.lastDirectory ? html`
                <button role="menuitemradio" aria-checked=${this._dest === 'lastdir'} @click=${() => this._setDest('lastdir')}>to ${this.lastDirectory}</button>` : ''}
              <button role="menuitemradio" aria-checked=${this._dest === 'pick'} @click=${() => this._setDest('pick')}>choose directory…</button>
              <div class="divider" role="separator"></div>
              ${EXPORT_FORMATS.map(f => html`
                <button role="menuitem" @click=${() => this._export(f.value)}>${f.label}</button>`)}
            </div>` : ''}
        </div>
        <div class="grp">
          <button class="tb icon" aria-haspopup="true" aria-expanded=${this._openMenu === 'theme'} aria-label="Theme" title="Theme" @click=${() => this._toggleMenu('theme')}>${ICON_THEME}</button>
          ${this._openMenu === 'theme' ? html`
            <div class="menu" role="menu">
              ${THEME_MODES.map(m => html`
                <button role="menuitemradio" aria-checked=${mode === m.value} @click=${() => this._setMode(m.value)}>${m.label}</button>`)}
              <div class="divider" role="separator"></div>
              ${themeNames.map(n => html`
                <button role="menuitemradio" aria-checked=${themeName === n} @click=${() => this._setThemeName(n)}>${n}</button>`)}
            </div>` : ''}
        </div>
        <slot></slot>
      </div>`;
  }

}

declare global {
  interface HTMLElementTagNameMap { 'fsl-toolbar': FslToolbar; }
}
