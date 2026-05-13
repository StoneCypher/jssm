describe('build_shootout: loadAll', () => {
  let machines: any;
  let entries: any[];

  beforeAll(async () => {
    const { loadAll } = await import('../../buildjs/build_shootout.mjs');
    const result = await loadAll();
    machines = result.machines;
    entries = result.entries;
  });

  it('loads all 30 entries across the 3 machines', () => {
    expect(Object.keys(machines)).toEqual(['toggle', 'traffic-light', 'matter']);
    expect(entries.length).toBe(30);
  });

  it('every entry has a library object with name, npm, homepage, languages', () => {
    for (const e of entries) {
      expect(typeof e.library.name).toBe('string');
      expect(typeof e.library.npm).toBe('string');
      expect(typeof e.library.homepage).toBe('string');
      expect(Array.isArray(e.library.languages)).toBe(true);
      expect(e.library.languages).toContain('javascript');
    }
  });

  it('every example currently has language "javascript"', () => {
    for (const e of entries) expect(e.language).toBe('javascript');
  });

  it('no entry has a `lines` field (it is derived, not stored)', () => {
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
