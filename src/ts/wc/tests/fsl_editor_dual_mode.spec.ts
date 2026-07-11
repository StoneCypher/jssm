// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import '../fsl_instance_wc.define.js';
import { FslEditor } from '../fsl_editor_wc.js';
import { FslInstance } from '../fsl_instance_wc.js';

beforeAll(() => {
  if (!customElements.get('fsl-editor')) { customElements.define('fsl-editor', FslEditor); }
});

describe('<fsl-editor> dual-mode (bound to <fsl-instance>)', () => {

  it('seeds from the host and writes edits back (host machine rebuilds)', async () => {
    const host = document.createElement('fsl-instance') as FslInstance;
    host.setAttribute('fsl', "A 'go' -> B;");
    const ed = document.createElement('fsl-editor') as FslEditor;
    ed.setAttribute('slot', 'editor');
    host.append(ed);
    document.body.append(host);
    await host.updateComplete;
    await ed.updateComplete;

    expect(ed.view!.state.doc.toString()).toBe("A 'go' -> B;");   // seeded from host

    // A user edit writes back to the host, which rebuilds its machine.
    ed.view!.dispatch({ changes: { from: 0, to: ed.view!.state.doc.length, insert: "X 'go' -> Y;" } });
    await host.updateComplete;

    expect(host.state()).toBe('X');
    expect(host.do('go')).toBe(true);
    expect(host.state()).toBe('Y');
    host.remove();
  });

  it('does not seed when the host exposes no fsl property (text-content source)', async () => {
    const host = document.createElement('fsl-instance') as FslInstance;
    const ed = document.createElement('fsl-editor') as FslEditor;
    ed.setAttribute('slot', 'editor');
    host.append(ed);
    host.append(document.createTextNode("M 'go' -> N;"));   // host builds from text content
    document.body.append(host);
    await host.updateComplete;
    await ed.updateComplete;

    expect(host.machine).toBeDefined();   // host built from its text content
    expect(ed.fsl).toBe('');              // host.fsl property is '', so the editor isn't seeded
    host.remove();
  });

});
