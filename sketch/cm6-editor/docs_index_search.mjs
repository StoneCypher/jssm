// Generated Index + client-side Search for the docs browser. Installs the
// `_renderIndex` / `_renderSearch` handlers that docs_panel.mjs delegates to.

export function installIndexSearch(mountDocsPanel) {
  // Index: every non-exclude feature, grouped by surface, linked to a teaching page.
  mountDocsPanel._renderIndex = (bodyEl, manifest, pages) => {
    const teachesOf = (fid) => pages.find(p => (p.teaches || []).includes(fid));
    const bySurface = {};
    for (const f of manifest.features) {
      if (f.tier === 'exclude') continue;
      (bySurface[f.surface] ||= []).push(f);
    }
    const rows = Object.keys(bySurface).sort().map(surface => {
      const items = bySurface[surface].sort((a, b) => a.title.localeCompare(b.title)).map(f => {
        const pg = teachesOf(f.id);
        const learn = pg ? `<a href="#" data-page="${pg.id}">${f.title}</a>` : `<span>${f.title}</span>`;
        const ref = f.referenceAnchor
          ? ` <a class="docs-ref" href="../../notes/fsl-grammar-reference.md#${f.referenceAnchor}" target="_blank">ref</a>` : '';
        return `<li>${learn}${ref}</li>`;
      }).join('');
      return `<h3>${surface}</h3><ul class="docs-nav">${items}</ul>`;
    }).join('');
    bodyEl.innerHTML = `<nav class="docs-crumb"><a href="#" data-go="sections">Docs</a> / <span>Index</span></nav>${rows}`;
  };

  // Search: client-side over feature titles + indexTerms + page titles/indexTerms.
  mountDocsPanel._renderSearch = (bodyEl, manifest, pages) => {
    bodyEl.innerHTML =
      `<nav class="docs-crumb"><a href="#" data-go="sections">Docs</a> / <span>Search</span></nav>
       <input id="docs-search-input" type="search" placeholder="Search the docs…" autocomplete="off" />
       <ul id="docs-search-results" class="docs-nav"></ul>`;
    const input = bodyEl.querySelector('#docs-search-input');
    const results = bodyEl.querySelector('#docs-search-results');
    const corpus = [
      ...manifest.features.filter(f => f.tier !== 'exclude').map(f => ({
        kind: 'feature', title: f.title,
        terms: [f.title, ...(f.indexTerms || []), ...((f.footguns || []).flatMap(g => g.indexTerms || []))].join(' ').toLowerCase(),
        page: (pages.find(p => (p.teaches || []).includes(f.id)) || {}).id,
      })),
      ...pages.map(p => ({
        kind: 'page', title: p.title,
        terms: [p.title, ...(p.indexTerms || [])].join(' ').toLowerCase(), page: p.id,
      })),
    ];
    const run = () => {
      const q = input.value.trim().toLowerCase();
      const hits = q ? corpus.filter(c => c.terms.includes(q)).slice(0, 40) : [];
      results.innerHTML = hits.map(h => h.page
        ? `<li><a href="#" data-page="${h.page}">${h.title}</a> <em>${h.kind}</em></li>`
        : `<li>${h.title} <em>${h.kind}</em></li>`).join('') || (q ? '<li class="docs-empty">No matches.</li>' : '');
    };
    input.addEventListener('input', run);
    input.focus();
  };
}
