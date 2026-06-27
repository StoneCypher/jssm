// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import { FslHelp } from '../fsl_help_wc.js';

beforeAll(() => {
  if (!customElements.get('fsl-help')) { customElements.define('fsl-help', FslHelp); }
});

async function make(open: boolean, heading?: string): Promise<FslHelp> {
  const el = document.createElement('fsl-help') as FslHelp;
  el.open = open;
  if (heading !== undefined) { el.heading = heading; }
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('<fsl-help>', () => {

  it('hides the drawer when closed and shows it when open', async () => {
    const closed = await make(false);
    expect(closed.shadowRoot!.querySelector('.drawer')!.hasAttribute('hidden')).toBe(true);
    closed.remove();

    const opened = await make(true);
    expect(opened.shadowRoot!.querySelector('.drawer')!.hasAttribute('hidden')).toBe(false);
    opened.remove();
  });

  it('renders the heading and reflects open to an attribute', async () => {
    const el = await make(true, 'Guide');
    expect(el.shadowRoot!.querySelector('h2')!.textContent).toBe('Guide');
    expect(el.hasAttribute('open')).toBe(true);
    el.remove();
  });

  it('closes and emits a close event from the close button', async () => {
    const el = await make(true);
    let closed = false;
    el.addEventListener('close', () => { closed = true; });
    (el.shadowRoot!.querySelector('.close') as HTMLButtonElement).click();
    await el.updateComplete;
    expect(el.open).toBe(false);
    expect(closed).toBe(true);
    expect(el.shadowRoot!.querySelector('.drawer')!.hasAttribute('hidden')).toBe(true);
    el.remove();
  });

});
