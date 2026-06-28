import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { buildHelpContent } from '../build_help_content.cjs';

const root = path.join(__dirname, '..', '..', '..');

describe('build_help_content', () => {
  it('compiles src/help pages with bodies and trimmed features', () => {
    const { pages, features } = buildHelpContent(
      path.join(root, 'src', 'help'),
      path.join(root, 'src', 'data', 'teaching-surface.json'),
    );
    const welcome = pages.find(p => p.id === 'welcome');
    expect(welcome).toBeTruthy();
    expect(welcome!.body).toMatch(/# Welcome to FSL/);
    expect(welcome!.body).not.toMatch(/^---/);            // front-matter stripped
    const t = features.find(f => f.id === 'transitions');
    expect(t).toBeTruthy();
    expect(t).not.toHaveProperty('units');                // trimmed
    expect(t!.title.length).toBeGreaterThan(0);
  });
});
