import * as path from 'node:path';

const comparablesDir = path.resolve(__dirname, '..', '..', 'comparables');

describe('build_shootout: loadAll', () => {
  it('loads all 30 entries across the 3 machines', async () => {
    const { loadAll } = await import('../../buildjs/build_shootout.mjs');
    const { machines, entries } = await loadAll(comparablesDir);
    expect(Object.keys(machines)).toEqual(['toggle', 'traffic-light', 'matter']);
    expect(entries.length).toBe(30);
  });

  it('every entry has a library object with name, npm, homepage, languages', async () => {
    const { loadAll } = await import('../../buildjs/build_shootout.mjs');
    const { entries } = await loadAll(comparablesDir);
    for (const e of entries) {
      expect(typeof e.library.name).toBe('string');
      expect(typeof e.library.npm).toBe('string');
      expect(typeof e.library.homepage).toBe('string');
      expect(Array.isArray(e.library.languages)).toBe(true);
      expect(e.library.languages).toContain('javascript');
    }
  });

  it('every example currently has language "javascript"', async () => {
    const { loadAll } = await import('../../buildjs/build_shootout.mjs');
    const { entries } = await loadAll(comparablesDir);
    for (const e of entries) expect(e.language).toBe('javascript');
  });

  it('no entry has a `lines` field (it is derived, not stored)', async () => {
    const { loadAll } = await import('../../buildjs/build_shootout.mjs');
    const { entries } = await loadAll(comparablesDir);
    for (const e of entries) {
      expect(e).not.toHaveProperty('lines');
    }
  });
});

describe('build_shootout: lineCount', () => {
  it('counts a single-line code body as 1', async () => {
    const { lineCount } = await import('../../buildjs/build_shootout.mjs');
    expect(lineCount('single line')).toBe(1);
  });

  it('counts N newlines as N+1 lines', async () => {
    const { lineCount } = await import('../../buildjs/build_shootout.mjs');
    expect(lineCount('a\nb\nc')).toBe(3);
  });

  it('counts a trailing newline as creating an extra empty line', async () => {
    const { lineCount } = await import('../../buildjs/build_shootout.mjs');
    expect(lineCount('a\n')).toBe(2);
  });
});
