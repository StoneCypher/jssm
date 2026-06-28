import { LitElement, html, css, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { DOCS_PAGES, DOCS_FEATURES, type DocsPage } from './generated/fsl_docs_content.js';
import { renderMarkdown } from './fsl_docs_markdown.js';
import { fslTokens } from './fsl_tokens.js';

/** `load-example` detail: the FSL a tutorial fence wants loaded into an editor. */
export interface FslDocsLoadExampleDetail { fsl: string; }

type DocsView = 'sections' | 'pages' | 'page' | 'index' | 'search';

const SECTIONS: ReadonlyArray<readonly [string, string]> = [
  ['getting-started', 'Getting Started'], ['about-state-machines', 'About State Machines'],
  ['tutorials', 'Tutorials'], ['example-machines', 'Example Machines'],
  ['index', 'Index'], ['search', 'Search'],
];
const TIER_RANK: Record<string, number> = { core: 0, intermediate: 1, advanced: 2 };

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

  static styles = css`
    :host { display: block; color: var(--_fsl-text); }
    .crumb { font-size: 0.7rem; color: var(--_fsl-muted); margin: 0.3rem 0 0.5rem; }
    .crumb a, .nav a { color: var(--_fsl-accent, #6a4cd6); text-decoration: none; cursor: pointer; }
    .nav { list-style: none; margin: 0.3rem 0; padding: 0; }
    .nav li { margin: 0.1rem 0; }
    .nav a { display: block; padding: 0.35rem 0.25rem; border-radius: 4px; }
    .nav a:hover { background: rgba(127,127,127,0.14); }
    .docs-page { font-size: 0.82rem; line-height: 1.55; }
    .docs-page pre { background: var(--_fsl-surface-alt, rgba(127,127,127,0.1)); padding: 0.5rem 0.6rem; border-radius: 6px; overflow-x: auto; }
    .docs-load-example { display: block; margin-top: 0.4rem; font: inherit; font-size: 0.7rem; cursor: pointer; }
    .search-input { width: 100%; box-sizing: border-box; padding: 0.35rem 0.5rem; margin: 0.25rem 0 0.5rem;
      background: var(--_fsl-surface); color: var(--_fsl-text); border: 1px solid var(--_fsl-border); border-radius: 4px; }
    .empty { color: var(--_fsl-muted); }
    ${fslTokens}
  `;

  /** Color theme; reflected so it drives the `--fsl-*` token defaults. */
  @property({ type: String, reflect: true }) theme: 'light' | 'dark' = 'light';

  @state() private _view: DocsView = 'sections';
  @state() private _section = '';
  @state() private _pageId = '';
  @state() private _query = '';

  private _pagesIn(section: string): DocsPage[] {
    const list = DOCS_PAGES.filter(p => p.section === section);
    if (section === 'tutorials') {
      const rank = (p: DocsPage): number => {
        const f = DOCS_FEATURES.find(x => p.teaches.includes(x.id));
        return (f ? (TIER_RANK[f.tier] ?? 3) : 3) * 1000 + p.order;
      };
      return [...list].sort((a, b) => rank(a) - rank(b));
    }
    return [...list].sort((a, b) => a.order - b.order);
  }

  private _go = (view: DocsView, section = '', pageId = ''): void => {
    this._view = view; this._section = section; this._pageId = pageId;
  };

  private _loadExample = (e: Event): void => {
    const pre = (e.target as HTMLElement).closest('pre[data-fsl-example]');
    const fsl = pre?.querySelector('code')?.textContent ?? '';
    this.dispatchEvent(new CustomEvent<FslDocsLoadExampleDetail>('load-example', {
      detail: { fsl }, bubbles: true, composed: true,
    }));
  };

  private _renderSections(): TemplateResult {
    return html`
      <nav class="crumb"><span>Docs</span></nav>
      <ul class="nav">${SECTIONS.map(([id, label]) => html`
        <li><a data-section=${id} @click=${() =>
          id === 'index' ? this._go('index') : id === 'search' ? this._go('search') : this._go('pages', id)
        }>${label}</a></li>`)}</ul>`;
  }

  private _renderPages(): TemplateResult {
    const label = SECTIONS.find(s => s[0] === this._section)?.[1] ?? this._section;
    const list = this._pagesIn(this._section);
    return html`
      <nav class="crumb"><a @click=${() => this._go('sections')}>Docs</a> / <span>${label}</span></nav>
      <ul class="nav">${list.length
        ? list.map(p => html`<li><a data-page=${p.id} @click=${() => this._go('page', this._section, p.id)}>${p.title}</a></li>`)
        : html`<li class="empty">No pages yet.</li>`}</ul>`;
  }

  private _renderPage(): TemplateResult {
    const p = DOCS_PAGES.find(x => x.id === this._pageId);
    if (!p) { return html`<p class="empty">Not found.</p>`; }
    const label = SECTIONS.find(s => s[0] === p.section)?.[1] ?? p.section;
    return html`
      <nav class="crumb"><a @click=${() => this._go('sections')}>Docs</a> /
        <a @click=${() => this._go('pages', p.section)}>${label}</a> / <span>${p.title}</span></nav>
      <article class="docs-page" @click=${(e: Event) => {
        if ((e.target as HTMLElement).classList.contains('docs-load-example')) { this._loadExample(e); }
      }}>${unsafeHTML(this._withButtons(renderMarkdown(p.body)))}</article>`;
  }

  /** Append a "Load into editor" button to every runnable fsl fence. */
  private _withButtons(htmlStr: string): string {
    return htmlStr.replace(/(<pre data-fsl-example[^>]*data-run="true"[^>]*>[\s\S]*?<\/pre>)/g,
      (m) => m.replace('</pre>', '<button class="docs-load-example">Load into editor</button></pre>'));
  }

  render(): TemplateResult {
    switch (this._view) {
      case 'pages':  return this._renderPages();
      case 'page':   return this._renderPage();
      case 'index':  return this._renderIndex();
      case 'search': return this._renderSearch();
      default:       return this._renderSections();
    }
  }

  // Index/Search implemented in Task 4.
  protected _renderIndex(): TemplateResult { return this._renderSections(); }
  protected _renderSearch(): TemplateResult { return this._renderSections(); }
}

declare global {
  interface HTMLElementTagNameMap { 'fsl-docs': FslDocs; }
}
