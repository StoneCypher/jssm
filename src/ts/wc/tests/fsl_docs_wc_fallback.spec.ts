// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from 'vitest';

// A completing curriculum gives every feature a page, making the "feature with no
// page" fallbacks in the Index and Search views unreachable via the real content.
// Mock the generated content with one page-less feature to exercise those branches.
vi.mock('../generated/fsl_docs_content.js', () => ({
  DOCS_PAGES: [],
  DOCS_FEATURES: [{
    id: 'orphan', surface: 'misc', title: 'Orphan Feature',
    tier: 'advanced', referenceAnchor: '', indexTerms: ['findme'],
  }],
}));

import { FslDocs } from '../fsl_docs_wc.js';

beforeAll(() => { if (!customElements.get('fsl-docs')) { customElements.define('fsl-docs', FslDocs); } });

async function mount(): Promise<FslDocs> {
  const el = document.createElement('fsl-docs') as FslDocs;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('fsl_docs_wc — page-less feature fallbacks', () => {
  it('renders an Index entry as plain text (no link) when the feature has no page', async () => {
    const el = await mount();
    (el as unknown as { _view: string })._view = 'index';
    await el.updateComplete;
    const root = el.shadowRoot!;
    expect(root.querySelector('.nav [data-page]')).toBeNull();           // no link rendered
    expect(root.querySelector('.nav span')?.textContent).toContain('Orphan Feature');
  });

  it('renders a Search hit as plain text (no link) when the matched feature has no page', async () => {
    const el = await mount();
    const s = el as unknown as { _view: string; _query: string };
    s._view = 'search';
    s._query = 'findme';
    await el.updateComplete;
    const root = el.shadowRoot!;
    expect(root.querySelector('.nav [data-page]')).toBeNull();
    expect(root.textContent).toContain('Orphan Feature');
  });
});
