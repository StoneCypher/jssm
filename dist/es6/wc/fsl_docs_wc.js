var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { DOCS_PAGES, DOCS_FEATURES } from './generated/fsl_docs_content.js';
import { renderMarkdown } from './fsl_docs_markdown.js';
import { fslTokens } from './fsl_tokens.js';
const SECTIONS = [
    ['getting-started', 'Getting Started'], ['about-state-machines', 'About State Machines'],
    ['tutorials', 'Tutorials'], ['example-machines', 'Example Machines'],
    ['index', 'Index'], ['search', 'Search'],
];
/**
 * `<fsl-docs>` — the language-docs content engine: drill-in nav over the bundled
 * curriculum (Getting Started / About State Machines / Tutorials / Example
 * Machines / Index / Search), a markdown page renderer, and "load into editor"
 * for tagged FSL examples. Content-only; slot it into `<fsl-help>`.
 *
 * @element fsl-docs
 * @fires {CustomEvent<FslDocsLoadExampleDetail>} load-example - When a fence's "Load into editor" is clicked.
 */
export class FslDocs extends LitElement {
    constructor() {
        super(...arguments);
        /** Color theme; reflected so it drives the `--fsl-*` token defaults. */
        this.theme = 'light';
        this._view = 'sections';
        this._section = '';
        this._pageId = '';
        this._query = '';
        this._go = (view, section = '', pageId = '') => {
            this._view = view;
            this._section = section;
            this._pageId = pageId;
        };
        this._loadExample = (e) => {
            var _a, _b;
            const pre = e.target.closest('pre[data-fsl-example]');
            const fsl = (_b = (_a = pre === null || pre === void 0 ? void 0 : pre.querySelector('code')) === null || _a === void 0 ? void 0 : _a.textContent) !== null && _b !== void 0 ? _b : '';
            this.dispatchEvent(new CustomEvent('load-example', {
                detail: { fsl }, bubbles: true, composed: true,
            }));
        };
    }
    _pagesIn(section) {
        // Page `order` already encodes the intended tier/dependency ordering (the
        // teaching-surface dependency-order check enforces it), so a plain sort suffices.
        return DOCS_PAGES.filter(p => p.section === section).sort((a, b) => a.order - b.order);
    }
    /** Display label for a section id (falls back to the id for unknown sections). */
    _sectionLabel(id) {
        var _a, _b;
        return (_b = (_a = SECTIONS.find(s => s[0] === id)) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : id;
    }
    _renderSections() {
        return html `
      <nav class="crumb"><span>Docs</span></nav>
      <ul class="nav">${SECTIONS.map(([id, label]) => html `
        <li><a data-section=${id} @click=${() => id === 'index' ? this._go('index') : id === 'search' ? this._go('search') : this._go('pages', id)}>${label}</a></li>`)}</ul>`;
    }
    _renderPages() {
        const label = this._sectionLabel(this._section);
        const list = this._pagesIn(this._section);
        return html `
      <nav class="crumb"><a @click=${() => this._go('sections')}>Docs</a> / <span>${label}</span></nav>
      <ul class="nav">${list.length
            ? list.map(p => html `<li><a data-page=${p.id} @click=${() => this._go('page', this._section, p.id)}>${p.title}</a></li>`)
            : html `<li class="empty">No pages yet.</li>`}</ul>`;
    }
    _renderPage() {
        const p = DOCS_PAGES.find(x => x.id === this._pageId);
        if (!p) {
            return html `<p class="empty">Not found.</p>`;
        }
        const label = this._sectionLabel(p.section);
        return html `
      <nav class="crumb"><a @click=${() => this._go('sections')}>Docs</a> /
        <a @click=${() => this._go('pages', p.section)}>${label}</a> / <span>${p.title}</span></nav>
      <article class="docs-page" @click=${(e) => {
            if (e.target.classList.contains('docs-load-example')) {
                this._loadExample(e);
            }
        }}>${unsafeHTML(this._withButtons(renderMarkdown(p.body)))}</article>`;
    }
    /** Append a "Load into editor" button to every runnable fsl fence. */
    _withButtons(htmlStr) {
        return htmlStr.replace(/(<pre data-fsl-example[^>]*data-run="true"[^>]*>[\s\S]*?<\/pre>)/g, (m) => m.replace('</pre>', '<button class="docs-load-example">Load into editor</button></pre>'));
    }
    render() {
        switch (this._view) {
            case 'pages': return this._renderPages();
            case 'page': return this._renderPage();
            case 'index': return this._renderIndex();
            case 'search': return this._renderSearch();
            default: return this._renderSections();
        }
    }
    _renderIndex() {
        var _a;
        const teachesOf = (id) => DOCS_PAGES.find(p => p.teaches.includes(id));
        const bySurface = {};
        for (const f of DOCS_FEATURES) {
            (bySurface[_a = f.surface] || (bySurface[_a] = [])).push(f);
        }
        return html `
      <nav class="crumb"><a @click=${() => this._go('sections')}>Docs</a> / <span>Index</span></nav>
      ${Object.keys(bySurface).sort().map(surface => html `
        <h3>${surface}</h3>
        <ul class="nav">${[...bySurface[surface]].sort((a, b) => a.title.localeCompare(b.title)).map(f => {
            const pg = teachesOf(f.id);
            return html `<li>${pg
                ? html `<a data-page=${pg.id} @click=${() => this._go('page', pg.section, pg.id)}>${f.title}</a>`
                : html `<span>${f.title}</span>`}</li>`;
        })}</ul>`)}`;
    }
    _renderSearch() {
        const q = this._query.trim().toLowerCase();
        const corpus = [
            ...DOCS_FEATURES.map(f => {
                var _a;
                return ({ title: f.title, kind: 'feature',
                    terms: [f.title, ...f.indexTerms].join(' ').toLowerCase(),
                    page: (_a = DOCS_PAGES.find(p => p.teaches.includes(f.id))) === null || _a === void 0 ? void 0 : _a.id });
            }),
            ...DOCS_PAGES.map(p => ({ title: p.title, kind: 'page',
                terms: [p.title, ...p.indexTerms].join(' ').toLowerCase(), page: p.id })),
        ];
        const hits = q ? corpus.filter(c => c.terms.includes(q)).slice(0, 40) : [];
        return html `
      <nav class="crumb"><a @click=${() => this._go('sections')}>Docs</a> / <span>Search</span></nav>
      <input class="search-input" type="search" placeholder="Search the docs…"
        .value=${this._query} @input=${(e) => { this._query = e.target.value; }}>
      <ul class="nav">${hits.length
            ? hits.map(h => html `<li>${h.page
                ? html `<a data-page=${h.page} @click=${() => { const p = DOCS_PAGES.find(x => x.id === h.page); this._go('page', p.section, p.id); }}>${h.title}</a>`
                : html `<span>${h.title}</span>`} <em>${h.kind}</em></li>`)
            : (q ? html `<li class="empty">No matches.</li>` : html ``)}</ul>`;
    }
}
FslDocs.styles = css `
    :host { display: block; color: var(--_fsl-text); }
    .crumb { font-size: 0.7rem; color: var(--_fsl-muted); margin: 0.3rem 0 0.5rem; }
    .crumb a, .nav a { color: var(--_fsl-accent, #6a4cd6); text-decoration: none; cursor: pointer; }
    .nav { list-style: none; margin: 0.3rem 0; padding: 0; }
    .nav li { margin: 0.1rem 0; }
    .nav a { display: block; padding: 0.35rem 0.25rem; border-radius: 4px; }
    .nav a:hover { background: rgba(127,127,127,0.14); }
    .docs-page { font-size: 0.82rem; line-height: 1.55; }
    .docs-page pre { background: var(--_fsl-surface-alt, rgba(127,127,127,0.1)); padding: 0.5rem 0.6rem; border-radius: 6px; overflow-x: auto; }
    .docs-page pre code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.78rem; }
    .docs-page .fsl-tok-comment { color: var(--fsl-tok-comment, #7d8590); font-style: italic; }
    .docs-page .fsl-tok-string  { color: var(--fsl-tok-string,  #2e9e5b); }
    .docs-page .fsl-tok-action  { color: var(--fsl-tok-action,  #c2710c); }
    .docs-page .fsl-tok-arrow   { color: var(--fsl-tok-arrow, var(--_fsl-accent, #6a4cd6)); font-weight: 600; }
    .docs-page .fsl-tok-number  { color: var(--fsl-tok-number,  #3b82f6); }
    .docs-page .fsl-tok-keyword { color: var(--fsl-tok-keyword, #a371f7); font-weight: 600; }
    .docs-page .fsl-tok-key     { color: var(--fsl-tok-key,     #0e7490); }
    .docs-page .fsl-swatch {
      display: inline-block; width: 0.72em; height: 0.72em; margin-right: 0.3em; vertical-align: baseline;
      border: 1px solid var(--_fsl-border, rgba(127,127,127,0.5)); border-radius: 2px;
    }
    .docs-load-example { display: block; margin-top: 0.4rem; font: inherit; font-size: 0.7rem; cursor: pointer; }
    .search-input { width: 100%; box-sizing: border-box; padding: 0.35rem 0.5rem; margin: 0.25rem 0 0.5rem;
      background: var(--_fsl-surface); color: var(--_fsl-text); border: 1px solid var(--_fsl-border); border-radius: 4px; }
    .empty { color: var(--_fsl-muted); }
    ${fslTokens}
  `;
__decorate([
    property({ type: String, reflect: true })
], FslDocs.prototype, "theme", void 0);
__decorate([
    state()
], FslDocs.prototype, "_view", void 0);
__decorate([
    state()
], FslDocs.prototype, "_section", void 0);
__decorate([
    state()
], FslDocs.prototype, "_pageId", void 0);
__decorate([
    state()
], FslDocs.prototype, "_query", void 0);
