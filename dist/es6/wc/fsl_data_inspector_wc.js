var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { fslTokens } from './fsl_tokens.js';
import { closest_wc } from './wc_tag_helpers.js';
/** Host DOM events that can change the machine's data. */
const DATA_EVENTS = ['fsl-transition', 'fsl-data-change', 'fsl-machine-rebuilt'];
const JSON_TOKEN_RE = /"(?:\\.|[^"\\])*"|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
/**
 * Split a pretty-printed JSON string into classified tokens for syntax
 * highlighting. A quoted run is a `key` when the next non-space character is
 * `:`, otherwise a `string`; `true`/`false` are `bool`, `null` is `null`,
 * numbers are `number`, and everything between (braces, commas, whitespace) is
 * `plain`. Driven by the text, not a JSON parse, so it never throws.
 *
 * @param json - A JSON string (typically `JSON.stringify(value, null, 2)`).
 * @returns The tokens in source order; concatenating their `text` reproduces `json`.
 *
 * @example
 * tokenizeJson('{"a": 1}');
 * // [{text:'{',kind:'plain'}, {text:'"a"',kind:'key'}, {text:': ',kind:'plain'},
 * //  {text:'1',kind:'number'}, {text:'}',kind:'plain'}]
 */
export function tokenizeJson(json) {
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
 *
 * @element fsl-data-inspector
 * @csspart inspector - The scrollable container.
 */
export class FslDataInspector extends LitElement {
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
      </div>`;
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
__decorate([
    state()
], FslDataInspector.prototype, "_data", void 0);
