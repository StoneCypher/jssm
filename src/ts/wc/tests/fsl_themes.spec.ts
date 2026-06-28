import { describe, it, expect, afterEach } from 'vitest';
import {
  BUILTIN_THEMES, resolve_theme_mode, resolve_palette, palette_to_vars,
  register_palette_properties, type ThemeRegistry,
} from '../fsl_themes.js';

describe('resolve_theme_mode', () => {
  it('returns light/dark verbatim and resolves system from the OS preference', () => {
    expect(resolve_theme_mode('light', true)).toBe('light');
    expect(resolve_theme_mode('dark', false)).toBe('dark');
    expect(resolve_theme_mode('system', true)).toBe('dark');
    expect(resolve_theme_mode('system', false)).toBe('light');
  });
});

describe('BUILTIN_THEMES', () => {
  it('ships Default and Solarized, each with a light and dark palette', () => {
    expect(Object.keys(BUILTIN_THEMES)).toEqual(['Default', 'Solarized']);
    for (const name of Object.keys(BUILTIN_THEMES)) {
      for (const variant of ['light', 'dark'] as const) {
        const p = BUILTIN_THEMES[name]![variant];
        expect(p.surface).toMatch(/^#[0-9a-f]{6}$/i);
        expect(p['json-key']).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });
});

describe('resolve_palette', () => {
  it('returns the named theme + variant, falling back to Default for unknown names', () => {
    expect(resolve_palette(BUILTIN_THEMES, 'Solarized', 'light').surface).toBe('#fdf6e3');
    expect(resolve_palette(BUILTIN_THEMES, 'Solarized', 'dark').surface).toBe('#002b36');
    // unknown name → Default
    expect(resolve_palette(BUILTIN_THEMES, 'Nope', 'light').surface)
      .toBe(BUILTIN_THEMES['Default']!.light.surface);
  });

  it('honors a consumer-supplied theme in the registry', () => {
    const themes: ThemeRegistry = {
      ...BUILTIN_THEMES,
      Custom: {
        light: { surface: '#abcdef', text: '#000', accent: '#111', border: '#222', muted: '#333',
                 'json-key': '#444', 'json-string': '#555', 'json-number': '#666', 'json-atom': '#777' },
        dark:  { surface: '#123456', text: '#fff', accent: '#eee', border: '#ddd', muted: '#ccc',
                 'json-key': '#bbb', 'json-string': '#aaa', 'json-number': '#999', 'json-atom': '#888' },
      },
    };
    expect(resolve_palette(themes, 'Custom', 'light').surface).toBe('#abcdef');
  });
});

describe('palette_to_vars', () => {
  it('maps a palette to --fsl-color-* property/value pairs', () => {
    const vars = palette_to_vars(BUILTIN_THEMES['Default']!.dark);
    expect(vars).toContainEqual(['--fsl-color-surface', '#1e1e22']);
    expect(vars).toContainEqual(['--fsl-color-json-atom', '#c792ea']);
  });
});

describe('register_palette_properties', () => {
  const saved = (globalThis as { CSS?: unknown }).CSS;
  const setCSS = (v: unknown): void => { (globalThis as { CSS?: unknown }).CSS = v; };
  afterEach(() => { setCSS(saved); });

  it('no-ops when CSS is unavailable', () => {
    setCSS(undefined);
    expect(() => register_palette_properties()).not.toThrow();
  });

  it('no-ops when CSS.registerProperty is missing', () => {
    setCSS({});
    expect(() => register_palette_properties()).not.toThrow();
  });

  it('registers each token as an inheriting <color> and ignores re-registration', () => {
    const calls: Array<{ name: string; syntax: string; inherits: boolean }> = [];
    let fail = false;
    setCSS({
      registerProperty: (d: { name: string; syntax: string; inherits: boolean }): void => {
        if (fail) { throw new Error('already registered'); }
        calls.push(d);
      },
    });
    register_palette_properties();
    expect(calls).toHaveLength(9);
    expect(calls.map(c => c.name)).toContain('--fsl-color-surface');
    expect(calls.every(c => c.syntax === '<color>' && c.inherits === true)).toBe(true);
    fail = true;
    expect(() => register_palette_properties()).not.toThrow();   // catch swallows re-registration
  });
});
