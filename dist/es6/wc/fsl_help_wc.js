var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { fslTokens } from './fsl_tokens.js';
/**
 * `<fsl-help>` — a documentation drawer shell: a titled, scrollable panel with
 * a close button and a default slot for content (typically foldable
 * `<details>` sections). Presentational and self-contained — it owns no machine
 * binding. The reflected `open` attribute drives visibility, so embedders can
 * animate it (e.g. a width transition on the host) purely from CSS.
 *
 * @element fsl-help
 * @csspart drawer - The drawer container.
 * @csspart head - The header bar.
 * @csspart body - The scrollable content area.
 * @csspart close - The close button.
 * @slot - The documentation content.
 * @fires {CustomEvent<void>} close - When the close button is pressed.
 */
export class FslHelp extends LitElement {
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
      </aside>`;
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
__decorate([
    property({ type: Boolean, reflect: true })
], FslHelp.prototype, "open", void 0);
__decorate([
    property({ type: String })
], FslHelp.prototype, "heading", void 0);
