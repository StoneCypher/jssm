// Manifest-driven, drill-in docs browser for the cm6-editor help panel.
// Sections -> pages -> page content, fed by teaching-surface.json + pages.json.
import { renderMarkdown, stripFrontMatter } from './markdown_mini.mjs';
import { installIndexSearch } from './docs_index_search.mjs';

const SECTIONS = [
  ['getting-started', 'Getting Started'],
  ['about-state-machines', 'About State Machines'],
  ['tutorials', 'Tutorials'],
  ['example-machines', 'Example Machines'],
  ['index', 'Index'],
  ['search', 'Search'],
];

export function mountDocsPanel({ bodyEl, manifestUrl, pagesUrl, helpBase, onLoadExample }) {
  let manifest = { features: [] };
  let pages = [];
  const state = { view: 'sections', section: null };

  const load = async () => {
    manifest = await fetch(manifestUrl).then(r => r.json());
    pages = (await fetch(pagesUrl).then(r => r.json())).pages;
    renderSections();
  };

  const el = (html) => { bodyEl.innerHTML = html; };
  const crumb = (...parts) =>
    `<nav class="docs-crumb">${parts.map(p => p.href
      ? `<a href="#" data-go="${p.href}">${p.label}</a>` : `<span>${p.label}</span>`).join(' / ')}</nav>`;

  function renderSections() {
    state.view = 'sections';
    el(crumb({ label: 'Docs' }) +
      '<ul class="docs-nav">' +
      SECTIONS.map(([id, label]) => `<li><a href="#" data-section="${id}">${label}</a></li>`).join('') +
      '</ul>');
  }

  function pagesIn(section) {
    const list = pages.filter(p => p.section === section);
    if (section === 'tutorials') list.sort(byTutorialOrder);
    else list.sort((a, b) => a.order - b.order);
    return list;
  }

  // tutorials ordered by tier (core->advanced) then page order
  function byTutorialOrder(a, b) {
    const rank = (p) => {
      const f = manifest.features.find(x => (p.teaches || []).includes(x.id));
      const tierRank = { core: 0, intermediate: 1, advanced: 2 };
      return (f ? (tierRank[f.tier] ?? 3) : 3) * 1000 + p.order;
    };
    return rank(a) - rank(b);
  }

  function renderSection(section) {
    state.view = 'pages'; state.section = section;
    const label = (SECTIONS.find(s => s[0] === section) || [])[1] || section;
    if (section === 'index') return renderIndex();
    if (section === 'search') return renderSearch();
    const list = pagesIn(section);
    el(crumb({ label: 'Docs', href: 'sections' }, { label }) +
      '<ul class="docs-nav">' +
      (list.length ? list.map(p => `<li><a href="#" data-page="${p.id}">${p.title}</a></li>`).join('')
                   : '<li class="docs-empty">No pages yet.</li>') +
      '</ul>');
  }

  async function renderPage(id) {
    state.view = 'page';
    const p = pages.find(x => x.id === id);
    if (!p) return;
    const md = await fetch(helpBase + '/' + p.source.replace(/^src\/help\//, '')).then(r => r.text());
    const html = renderMarkdown(stripFrontMatter(md));
    const label = (SECTIONS.find(s => s[0] === p.section) || [])[1] || p.section;
    el(crumb({ label: 'Docs', href: 'sections' }, { label, href: 'section:' + p.section }, { label: p.title }) +
      `<article class="docs-page">${html}</article>`);
    wireExamples();
  }

  function wireExamples() {
    for (const pre of bodyEl.querySelectorAll('pre[data-fsl-example][data-run="true"]')) {
      const btn = document.createElement('button');
      btn.className = 'docs-load-example'; btn.textContent = 'Load into editor';
      btn.addEventListener('click', () => onLoadExample(pre.querySelector('code').textContent));
      pre.appendChild(btn);
    }
  }

  // _renderIndex / _renderSearch are installed by docs_index_search.mjs (Task 6)
  function renderIndex()  { (mountDocsPanel._renderIndex || (() => {}))(bodyEl, manifest, pages, go); }
  function renderSearch() { (mountDocsPanel._renderSearch || (() => {}))(bodyEl, manifest, pages, go); }

  function go(target) {
    if (target === 'sections') return renderSections();
    if (target.startsWith('section:')) return renderSection(target.slice(8));
    if (target.startsWith('page:')) return renderPage(target.slice(5));
  }

  bodyEl.addEventListener('click', (e) => {
    const a = e.target.closest('[data-section],[data-page],[data-go]');
    if (!a) return;
    e.preventDefault();
    if (a.dataset.section) renderSection(a.dataset.section);
    else if (a.dataset.page) renderPage(a.dataset.page);
    else if (a.dataset.go) go(a.dataset.go);
  });

  load();
  return { go };
}

installIndexSearch(mountDocsPanel);
