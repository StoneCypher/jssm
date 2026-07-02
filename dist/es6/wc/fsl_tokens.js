import { css } from 'lit';
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
export const fslTokens = css `
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
