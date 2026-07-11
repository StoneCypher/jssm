// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { EditorView } from '@codemirror/view';
import { EditorState, type Extension } from '@codemirror/state';
import { lightEditorTheme, darkEditorTheme } from '../editor/cm_theme.js';

function mount(theme: Extension): EditorView {
  const parent = document.createElement('div');
  document.body.append(parent);
  return new EditorView({ state: EditorState.create({ doc: 'a -> b;', extensions: [theme] }), parent });
}

describe('editor themes', () => {
  it('light theme mounts as a valid CodeMirror extension', () => {
    const view = mount(lightEditorTheme);
    expect(view.dom.classList.contains('cm-editor')).toBe(true);
    view.destroy();
  });

  it('dark theme mounts as a valid CodeMirror extension', () => {
    const view = mount(darkEditorTheme);
    expect(view.dom.classList.contains('cm-editor')).toBe(true);
    view.destroy();
  });
});
