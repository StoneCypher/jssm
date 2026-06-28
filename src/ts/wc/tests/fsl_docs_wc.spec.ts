// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import { FslDocs } from '../fsl_docs_wc.js';

beforeAll(() => { if (!customElements.get('fsl-docs')) { customElements.define('fsl-docs', FslDocs); } });

async function mount(): Promise<FslDocs> {
  const el = document.createElement('fsl-docs') as FslDocs;
  document.body.appendChild(el);
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
});
