// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import '../fsl_instance_wc.define.js';
import { FslDataInspector } from '../fsl_data_inspector_wc.js';
import { FslInstance } from '../fsl_instance_wc.js';

beforeAll(() => {
  if (!customElements.get('fsl-data-inspector')) { customElements.define('fsl-data-inspector', FslDataInspector); }
});

async function withHost(fsl: string): Promise<{ host: FslInstance; insp: FslDataInspector }> {
  const host = document.createElement('fsl-instance') as FslInstance;
  host.setAttribute('fsl', fsl);
  const insp = document.createElement('fsl-data-inspector') as FslDataInspector;
  insp.setAttribute('slot', 'data-inspector');
  host.appendChild(insp);
  document.body.appendChild(host);
  await host.updateComplete;
  await insp.updateComplete;
  return { host, insp };
}

describe('<fsl-data-inspector>', () => {

  it('shows no data initially, then the data once an action sets it', async () => {
    const { host, insp } = await withHost("A 'go' -> B;");
    expect(insp.shadowRoot!.querySelector('.empty')).not.toBeNull();   // data() is undefined

    host.do('go', { count: 3 });
    await host.updateComplete;
    await insp.updateComplete;
    const txt = insp.shadowRoot!.textContent!;
    expect(txt).toContain('count');
    expect(txt).toContain('3');
    expect(insp.shadowRoot!.querySelector('.json')).not.toBeNull();
    host.remove();
  });

  it('renders empty when standalone (no fsl-instance ancestor)', async () => {
    const insp = document.createElement('fsl-data-inspector') as FslDataInspector;
    document.body.appendChild(insp);
    await insp.updateComplete;
    expect(insp.shadowRoot!.querySelector('.empty')).not.toBeNull();
    insp.remove();
  });

});
