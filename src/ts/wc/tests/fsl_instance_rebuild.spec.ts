/**
 * @vitest-environment jsdom
 */
import '../fsl_instance_wc.define.js';
import { FslInstance } from '../fsl_instance_wc.js';

function mount(fsl: string): FslInstance {
  const el = document.createElement('fsl-instance') as FslInstance;
  el.setAttribute('fsl', fsl);
  document.body.appendChild(el);
  return el;
}

describe('fsl-instance live rebuild (#1387)', () => {

  it('rebuilds the machine when fsl changes after connect', async () => {
    const el = mount("A 'go' -> B;");
    await el.updateComplete;          // let the initial render finish (hasUpdated → true)
    expect(el.state()).toBe('A');

    el.fsl = "X 'go' -> Y 'go' -> Z;";
    await el.updateComplete;

    expect(el.state()).toBe('X');     // fresh machine at its start state
    expect(el.do('go')).toBe(true);
    expect(el.state()).toBe('Y');
    el.remove();
  });

  it('keeps the last good machine when the new fsl is invalid', async () => {
    const el = mount("A 'go' -> B;");
    await el.updateComplete;
    el.fsl = "A 'go' -> ;";           // does not parse
    await el.updateComplete;
    expect(el.state()).toBe('A');     // unchanged
    expect(() => el.machine).not.toThrow();
    el.remove();
  });

  it('ignores an empty fsl change', async () => {
    const el = mount("A 'go' -> B;");
    await el.updateComplete;
    el.fsl = '   ';
    await el.updateComplete;
    expect(el.state()).toBe('A');
    el.remove();
  });

  it('re-emits events from the rebuilt machine', async () => {
    const el = mount("A 'go' -> B;");
    await el.updateComplete;
    el.fsl = "P 'step' -> Q;";
    await el.updateComplete;

    let fired = '';
    el.addEventListener('fsl-transition', () => { fired = el.state(); });
    el.do('step');
    await el.updateComplete;

    expect(el.state()).toBe('Q');
    expect(fired).toBe('Q');
    el.remove();
  });

  it('dispatches fsl-machine-rebuilt on a successful rebuild', async () => {
    const el = mount("A 'go' -> B;");
    await el.updateComplete;
    let rebuilt = false;
    el.addEventListener('fsl-machine-rebuilt', () => { rebuilt = true; });
    el.fsl = 'X -> Y;';
    await el.updateComplete;
    expect(rebuilt).toBe(true);
    el.remove();
  });

});
