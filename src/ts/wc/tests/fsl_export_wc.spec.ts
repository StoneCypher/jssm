// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import '../fsl_instance_wc.define.js';
import { FslExport, type FslExportFormat } from '../fsl_export_wc.js';
import { FslInstance } from '../fsl_instance_wc.js';

beforeAll(() => {
  if (!customElements.get('fsl-export')) { customElements.define('fsl-export', FslExport); }
});

async function withHost(fsl: string): Promise<{ host: FslInstance; exp: FslExport }> {
  const host = document.createElement('fsl-instance') as FslInstance;
  host.setAttribute('fsl', fsl);
  const exp = document.createElement('fsl-export') as FslExport;
  exp.setAttribute('slot', 'export');
  host.appendChild(exp);
  document.body.appendChild(host);
  await host.updateComplete;
  await exp.updateComplete;
  return { host, exp };
}

const btn = (exp: FslExport, label: string): HTMLButtonElement =>
  [...exp.shadowRoot!.querySelectorAll('.btn')].find(b => b.textContent === label) as HTMLButtonElement;

describe('<fsl-export>', () => {

  it('emits dot / json / fsl content from the host machine', async () => {
    const { host, exp } = await withHost("A 'go' -> B;");
    const got: Array<{ format: FslExportFormat; content: string }> = [];
    exp.addEventListener('fsl-export', e => got.push((e as CustomEvent).detail));

    btn(exp, 'DOT').click();
    btn(exp, 'JSON').click();
    btn(exp, 'FSL').click();

    expect(got.map(g => g.format)).toEqual(['dot', 'json', 'fsl']);
    expect(got[0].content).toContain('digraph');     // dot
    expect(got[0].content).toContain('A');
    expect(got[1].content).toContain('jssm_version'); // serialize()
    expect(got[2].content).toContain("A 'go' -> B");  // fsl source
    host.remove();
  });

  it('emits nothing when standalone (no fsl-instance ancestor)', async () => {
    const exp = document.createElement('fsl-export') as FslExport;
    document.body.appendChild(exp);
    await exp.updateComplete;
    let fired = false;
    exp.addEventListener('fsl-export', () => { fired = true; });
    btn(exp, 'DOT').click();
    expect(fired).toBe(false);
    exp.remove();
  });

});
