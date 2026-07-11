// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import '../fsl_instance_wc.define.js';
import { FslHookLog } from '../fsl_hook_log_wc.js';
import { FslInstance } from '../fsl_instance_wc.js';

beforeAll(() => {
  if (!customElements.get('fsl-hook-log')) { customElements.define('fsl-hook-log', FslHookLog); }
});

async function withHost(fsl: string): Promise<{ host: FslInstance; log: FslHookLog }> {
  const host = document.createElement('fsl-instance') as FslInstance;
  host.setAttribute('fsl', fsl);
  const log = document.createElement('fsl-hook-log') as FslHookLog;
  log.setAttribute('slot', 'hook-log');
  host.append(log);
  document.body.append(host);
  await host.updateComplete;
  await log.updateComplete;
  return { host, log };
}

describe('<fsl-hook-log>', () => {

  it('logs machine events re-emitted by the host', async () => {
    const { host, log } = await withHost("A 'go' -> B;");
    expect(log.shadowRoot!.querySelector('.empty')).not.toBeNull();   // no events yet

    host.do('go');
    await host.updateComplete;
    await log.updateComplete;
    expect(log.shadowRoot!.querySelector('.empty')).toBeNull();
    expect(log.shadowRoot!.textContent).toContain('transition');
    expect(log.shadowRoot!.querySelectorAll('.entry').length).toBeGreaterThan(0);
    host.remove();
  });

  it('renders empty when standalone (no fsl-instance ancestor)', async () => {
    const log = document.createElement('fsl-hook-log') as FslHookLog;
    document.body.append(log);
    await log.updateComplete;
    expect(log.shadowRoot!.querySelector('.empty')).not.toBeNull();
    log.remove();
  });

});
