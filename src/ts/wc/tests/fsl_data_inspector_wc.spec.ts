// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import '../fsl_instance_wc.define.js';
import { FslDataInspector, tokenizeJson, type JsonToken } from '../fsl_data_inspector_wc.js';
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

  it('shows no data initially, then syntax-highlighted data once an action sets it', async () => {
    const { host, insp } = await withHost("A 'go' -> B;");
    expect(insp.shadowRoot!.querySelector('.empty')).not.toBeNull();   // data() is undefined

    host.do('go', { count: 3 });
    await host.updateComplete;
    await insp.updateComplete;
    const txt = insp.shadowRoot!.textContent!;
    expect(txt).toContain('count');
    expect(txt).toContain('3');
    expect(insp.shadowRoot!.querySelector('.json')).not.toBeNull();
    // syntax highlighting: the key and the number get their own spans
    expect(insp.shadowRoot!.querySelector('.tok-key')!.textContent).toContain('count');
    expect(insp.shadowRoot!.querySelector('.tok-number')!.textContent).toBe('3');
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

describe('tokenizeJson', () => {

  it('classifies keys, strings, numbers, bools, null, and plain runs', () => {
    const json = '{"a": "x", "b": 3, "c": true, "e": false, "d": null}';
    const toks = tokenizeJson(json);
    const of = (k: JsonToken['kind']): string[] => toks.filter(t => t.kind === k).map(t => t.text);
    expect(of('key')).toEqual(['"a"', '"b"', '"c"', '"e"', '"d"']);
    expect(of('string')).toEqual(['"x"']);
    expect(of('number')).toEqual(['3']);
    expect(of('bool')).toEqual(['true', 'false']);
    expect(of('null')).toEqual(['null']);
    expect(toks.some(t => t.kind === 'plain')).toBe(true);
    expect(toks.map(t => t.text).join('')).toBe(json);   // round-trips losslessly
  });

  it('handles a bare token at offset 0 with no surrounding plain', () => {
    expect(tokenizeJson('42')).toEqual([{ text: '42', kind: 'number' }]);
  });

});
