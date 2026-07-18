// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { EditorView } from '@codemirror/view';
import { EditorState, type Extension } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import {
  fslLintSource, fslLintExtension,
  fslCompletionSource, fslCompletionExtension,
  buildFslDecorations, fslOverlayExtension,
} from '../editor/cm_adapters.js';

function mount(doc: string, ext: Extension): EditorView {
  const parent = document.createElement('div');
  document.body.append(parent);
  return new EditorView({ state: EditorState.create({ doc, extensions: [ext] }), parent });
}
function ctxFor(doc: string): CompletionContext {
  return new CompletionContext(EditorState.create({ doc }), doc.length, true);
}

describe('diagnostics adapter', () => {
  it('maps an FSL parse error to a CM diagnostic', () => {
    const view = mount('a -> ;', []);
    const out = fslLintSource(view);
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('error');
    expect(out[0].to).toBeGreaterThan(out[0].from);
    view.destroy();
  });
  it('fslLintExtension builds a valid extension', () => {
    const view = mount('a -> b;', fslLintExtension());
    expect(view.state.doc.toString()).toBe('a -> b;');
    view.destroy();
  });
});

describe('completion adapter', () => {
  it('offers color values (kind enum) after a color key', () => {
    const r = fslCompletionSource(ctxFor('state s : { color: '));
    expect(r).not.toBeNull();
    expect(r!.options.map(o => o.label)).toContain('Crimson');
    expect(r!.options[0].type).toBe('enum');
  });
  it('offers keys (kind property) at a line start', () => {
    const r = fslCompletionSource(ctxFor('mac'));
    expect(r!.options.some(o => o.label === 'machine_name' && o.type === 'property')).toBe(true);
  });
  it('returns null in a non-completable position', () => {
    expect(fslCompletionSource(ctxFor('a -> b'))).toBeNull();
  });
  it('fslCompletionExtension builds a valid extension', () => {
    const view = mount('', fslCompletionExtension());
    expect(view.state.doc.toString()).toBe('');
    view.destroy();
  });
});

describe('semantic overlay adapter', () => {
  it('builds decorations for colors and states', () => {
    const set = buildFslDecorations('state Red : { color: crimson; };\nRed -> Green;');
    expect(set.size).toBeGreaterThanOrEqual(3);   // color + Red + Green
  });
  it('puts chip attributes on color marks only — state values are names, not paints', () => {
    const set = buildFslDecorations('state Red : { color: crimson; };\nRed -> Green;');
    const marks: Array<{ cls: string; style?: string }> = [];
    const cursor = set.iter();
    while (cursor.value !== null) {
      const spec = (cursor.value as unknown as { spec: { class: string; attributes: Record<string, string> } }).spec;
      marks.push({ cls: spec.class, style: spec.attributes.style });
      cursor.next();
    }
    for (const mark of marks) {
      if (mark.cls !== 'fsl-color') { continue; }
      expect(mark.style).toContain('--fsl-chip:');
    }
    // state spans carry AST-resolved name values since the fence work, but a
    // name must never become a chip paint — this pins the kind gate.
    for (const mark of marks) {
      if (mark.cls !== 'fsl-state') { continue; }
      expect(mark.style).toBeUndefined();
    }
    expect(marks.some(m => m.cls === 'fsl-color')).toBe(true);
    expect(marks.some(m => m.cls === 'fsl-state')).toBe(true);
  });
  it('fslOverlayExtension survives doc and selection updates', () => {
    const view = mount('state Red : { color: crimson; };', fslOverlayExtension());
    view.dispatch({ changes: { from: view.state.doc.length, insert: '\nRed -> Green;' } });  // docChanged
    view.dispatch({ selection: { anchor: 0 } });                                              // not docChanged
    expect(view.state.doc.toString()).toContain('Red -> Green;');
    view.destroy();
  });
});
