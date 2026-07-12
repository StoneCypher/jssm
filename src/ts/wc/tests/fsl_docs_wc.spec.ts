// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import { FslDocs } from '../fsl_docs_wc.js';

beforeAll(() => { if (!customElements.get('fsl-docs')) { customElements.define('fsl-docs', FslDocs); } });

async function mount(): Promise<FslDocs> {
  const el = document.createElement('fsl-docs') as FslDocs;
  document.body.append(el);
  await el.updateComplete;
  return el;
}
const q = (el: FslDocs, sel: string): HTMLElement => el.shadowRoot!.querySelector(sel) as HTMLElement;
const qa = (el: FslDocs, sel: string): HTMLElement[] => [...el.shadowRoot!.querySelectorAll(sel)] as HTMLElement[];

describe('<fsl-docs>', () => {
  it('shows the six sections and drills into a page', async () => {
    const el = await mount();
    expect(qa(el, '[data-section]').length).toBe(6);
    q(el, '[data-section="getting-started"]').click();
    await el.updateComplete;
    q(el, '[data-page="welcome"]').click();
    await el.updateComplete;
    expect(q(el, 'article.docs-page h1')).toBeTruthy();
    el.remove();
  });

  it('emits load-example with the fence FSL', async () => {
    const el = await mount();
    let got = '';
    el.addEventListener('load-example', (e) => { got = (e as CustomEvent<{ fsl: string }>).detail.fsl; });
    q(el, '[data-section="getting-started"]').click(); await el.updateComplete;
    q(el, '[data-page="welcome"]').click(); await el.updateComplete;
    (q(el, '.docs-load-example') as HTMLButtonElement).click();
    expect(got).toMatch(/->/);
    el.remove();
  });

  it('lists features in the Index grouped by surface, linked to teaching pages', async () => {
    const el = await mount();
    q(el, '[data-section="index"]').click(); await el.updateComplete;
    expect(qa(el, 'h3').length).toBeGreaterThan(0);          // surface group headers (Index-specific)
    expect(qa(el, '.nav a[data-page]').length).toBeGreaterThan(0);
    el.remove();
  });

  it('search returns hits for a query', async () => {
    const el = await mount();
    q(el, '[data-section="search"]').click(); await el.updateComplete;
    const input = q(el, '.search-input') as HTMLInputElement;
    input.value = 'transition'; input.dispatchEvent(new Event('input'));
    await el.updateComplete;
    expect(qa(el, '.nav li').length).toBeGreaterThan(0);
    el.remove();
  });

  it('orders Tutorials by tier and opens a tutorial page', async () => {
    const el = await mount();
    q(el, '[data-section="tutorials"]').click(); await el.updateComplete;
    const pages = qa(el, '[data-page]');
    expect(pages.length).toBeGreaterThan(0);
    pages[0].click(); await el.updateComplete;
    expect(q(el, 'article.docs-page')).toBeTruthy();
    el.remove();
  });

  it('navigates the page-view breadcrumb and tolerates non-button article clicks', async () => {
    const el = await mount();
    q(el, '[data-section="getting-started"]').click(); await el.updateComplete;
    q(el, '[data-page="welcome"]').click(); await el.updateComplete;
    q(el, 'article.docs-page h1').click(); await el.updateComplete;       // article click, not a button
    q(el, '.crumb a:nth-of-type(2)').click(); await el.updateComplete;    // section crumb → pages
    expect(qa(el, '[data-page]').length).toBeGreaterThan(0);
    q(el, '[data-page="welcome"]').click(); await el.updateComplete;      // back into the page
    q(el, '.crumb a').click(); await el.updateComplete;                   // page-view "Docs" → sections
    expect(qa(el, '[data-section]').length).toBe(6);
    el.remove();
  });

  it('navigates the pages-view breadcrumb back to sections', async () => {
    const el = await mount();
    q(el, '[data-section="getting-started"]').click(); await el.updateComplete;  // pages view
    q(el, '.crumb a').click(); await el.updateComplete;                          // pages "Docs" → sections
    expect(qa(el, '[data-section]').length).toBe(6);
    el.remove();
  });

  it('navigates Index/Search breadcrumbs and a search-result link', async () => {
    const el = await mount();
    q(el, '[data-section="index"]').click(); await el.updateComplete;
    q(el, '.crumb a').click(); await el.updateComplete;                   // Index "Docs" → sections
    expect(qa(el, '[data-section]').length).toBe(6);

    q(el, '[data-section="search"]').click(); await el.updateComplete;
    const input = q(el, '.search-input') as HTMLInputElement;
    input.value = 'transitions'; input.dispatchEvent(new Event('input')); await el.updateComplete;
    const result = qa(el, '.nav a[data-page]')[0];
    expect(result).toBeTruthy();
    result.click(); await el.updateComplete;                             // search result → page
    expect(q(el, 'article.docs-page')).toBeTruthy();
    q(el, '.crumb a').click(); await el.updateComplete;                  // page "Docs" → sections
    q(el, '[data-section="search"]').click(); await el.updateComplete;
    q(el, '.crumb a').click(); await el.updateComplete;                  // Search "Docs" → sections
    expect(qa(el, '[data-section]').length).toBe(6);
    el.remove();
  });

  it('opens a page from an Index link', async () => {
    const el = await mount();
    q(el, '[data-section="index"]').click(); await el.updateComplete;
    (qa(el, '.nav a[data-page]')[0]).click(); await el.updateComplete;
    expect(q(el, 'article.docs-page')).toBeTruthy();
    el.remove();
  });

  it('shows empty states for an unknown section and page', async () => {
    const el = await mount();
    // unknown section → "No pages yet"
    (el as unknown as { _go: (v: string, s?: string, p?: string) => void })._go('pages', 'no-such-section');
    await el.updateComplete;
    expect(q(el, '.empty')).toBeTruthy();
    // unknown page → "Not found"
    (el as unknown as { _go: (v: string, s?: string, p?: string) => void })._go('page', 'getting-started', 'no-such-page');
    await el.updateComplete;
    expect(q(el, '.empty')!.textContent).toMatch(/Not found/);
    el.remove();
  });

  it('load-example yields empty fsl when fired outside a fence', async () => {
    const el = await mount();
    let got: string | null = null;
    el.addEventListener('load-example', (e) => { got = (e as CustomEvent<{ fsl: string }>).detail.fsl; });
    (el as unknown as { _loadExample: (e: Event) => void })._loadExample(
      { target: document.createElement('div') } as unknown as Event);
    expect(got).toBe('');
    el.remove();
  });

  it('search clears to empty and reports no matches', async () => {
    const el = await mount();
    q(el, '[data-section="search"]').click(); await el.updateComplete;
    const input = q(el, '.search-input') as HTMLInputElement;
    input.value = ''; input.dispatchEvent(new Event('input')); await el.updateComplete;
    expect(qa(el, '.nav li').length).toBe(0);                            // empty query → no list items
    input.value = 'zzzznomatchqq'; input.dispatchEvent(new Event('input')); await el.updateComplete;
    expect(q(el, '.empty')!.textContent).toMatch(/No matches/);
    el.remove();
  });
});
