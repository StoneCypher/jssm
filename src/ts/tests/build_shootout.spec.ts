import { mkdtemp, mkdir, writeFile, copyFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

async function tmpComparables(perLibraryFiles: Record<string, unknown>): Promise<string> {
  const realRoot = path.resolve(__dirname, '..', '..', 'comparables');
  const root = await mkdtemp(path.join(os.tmpdir(), 'cmp-'));
  await copyFile(path.join(realRoot, 'schema.json'),   path.join(root, 'schema.json'));
  await copyFile(path.join(realRoot, 'machines.json'), path.join(root, 'machines.json'));
  for (const [relPath, body] of Object.entries(perLibraryFiles)) {
    const full = path.join(root, relPath);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, typeof body === 'string' ? body : JSON.stringify(body));
  }
  return root;
}

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

describe('build_shootout: validation failures', () => {
  it('rejects file whose machine field disagrees with parent directory', async () => {
    const { loadAll } = await import('../../buildjs/build_shootout.mjs');
    const dir = await tmpComparables({
      'toggle/jssm.json': {
        library: { name: 'jssm', npm: 'jssm', homepage: 'https://x.test', languages: ['javascript'] },
        machine: 'matter',
        language: 'javascript',
        official: true,
        canImplement: true,
        code: 'x',
      },
    });
    await expect(loadAll(dir)).rejects.toThrow(/machine field "matter" does not match directory "toggle"/);
  });

  it('rejects file whose language is not in library.languages', async () => {
    const { loadAll } = await import('../../buildjs/build_shootout.mjs');
    const dir = await tmpComparables({
      'toggle/jssm.json': {
        library: { name: 'jssm', npm: 'jssm', homepage: 'https://x.test', languages: ['javascript'] },
        machine: 'toggle',
        language: 'typescript',
        official: true,
        canImplement: true,
        code: 'x',
      },
    });
    await expect(loadAll(dir)).rejects.toThrow(/language "typescript" not in library.languages/);
  });

  it('rejects file with schema violation: missing required field', async () => {
    const { loadAll } = await import('../../buildjs/build_shootout.mjs');
    const dir = await tmpComparables({
      // Missing required `code` field
      'toggle/jssm.json': {
        library: { name: 'jssm', npm: 'jssm', homepage: 'https://x.test', languages: ['javascript'] },
        machine: 'toggle',
        language: 'javascript',
        official: true,
        canImplement: true,
      },
    });
    await expect(loadAll(dir)).rejects.toThrow(/schema/i);
  });

  it('rejects file with schema violation: unknown extra field', async () => {
    const { loadAll } = await import('../../buildjs/build_shootout.mjs');
    const dir = await tmpComparables({
      'toggle/jssm.json': {
        library: { name: 'jssm', npm: 'jssm', homepage: 'https://x.test', languages: ['javascript'] },
        machine: 'toggle',
        language: 'javascript',
        official: true,
        canImplement: true,
        code: 'x',
        bogusField: 'should fail',
      },
    });
    await expect(loadAll(dir)).rejects.toThrow(/schema/i);
  });
});

describe('build_shootout: renderEntry', () => {
  const baseEntry = {
    library: {
      name: 'xstate',
      npm: 'xstate',
      homepage: 'https://xstate.js.org',
      languages: ['javascript', 'typescript'],
    },
    machine: 'toggle',
    language: 'javascript',
    official: true,
    canImplement: true,
    code: 'export const x = 1;',
  };

  it('emits an official entry without the (created) prefix', async () => {
    const { renderEntry } = await import('../../buildjs/build_shootout.mjs');
    const md = renderEntry(baseEntry, { title: 'Toggle machine' });
    expect(md).toMatch(/^### `xstate` Toggle machine, 1 line/m);
    expect(md).not.toMatch(/\(created\)/);
  });

  it('emits a synthesized entry with the (created) prefix', async () => {
    const { renderEntry } = await import('../../buildjs/build_shootout.mjs');
    const md = renderEntry({ ...baseEntry, official: false }, { title: 'Toggle machine' });
    expect(md).toMatch(/^### \(created\) `xstate` Toggle machine, 1 line/m);
  });

  it('pluralizes line count in the heading', async () => {
    const { renderEntry } = await import('../../buildjs/build_shootout.mjs');
    const md1 = renderEntry(baseEntry, { title: 'Toggle machine' });
    const md5 = renderEntry({ ...baseEntry, code: 'a\nb\nc\nd\ne' }, { title: 'Toggle machine' });
    expect(md1).toMatch(/, 1 line$/m);
    expect(md5).toMatch(/, 5 lines$/m);
  });

  it('emits the source note and source url when present', async () => {
    const { renderEntry } = await import('../../buildjs/build_shootout.mjs');
    const md = renderEntry(
      { ...baseEntry, source: { url: 'https://example.test/docs', note: 'From their documentation' } },
      { title: 'Toggle machine' }
    );
    expect(md).toContain('From their documentation');
    expect(md).toContain('https://example.test/docs');
  });

  it('emits a fenced code block tagged with the entry language', async () => {
    const { renderEntry } = await import('../../buildjs/build_shootout.mjs');
    const md = renderEntry(baseEntry, { title: 'Toggle machine' });
    expect(md).toMatch(/```javascript\nexport const x = 1;\n```/);
  });
});

describe('build_shootout: renderQuickTab', () => {
  let machines: any;
  let entries: any[];

  beforeAll(async () => {
    const { loadAll } = await import('../../buildjs/build_shootout.mjs');
    const result = await loadAll();
    machines = result.machines;
    entries = result.entries;
  });

  it('opens with <span id="quicktab"> and closes with </span>', async () => {
    const { renderQuickTab } = await import('../../buildjs/build_shootout.mjs');
    const md = renderQuickTab(machines, entries);
    expect(md).toMatch(/^<span id="quicktab">/);
    expect(md.trim().endsWith('</span>')).toBe(true);
  });

  it('lists every library as a row with one cell per machine plus an Avg column', async () => {
    const { renderQuickTab } = await import('../../buildjs/build_shootout.mjs');
    const md = renderQuickTab(machines, entries);
    // `machines` is `any` (it comes from an untyped .mjs), and `Object.values`
    // over `any` falls back to `unknown[]` rather than `any[]`; naming the
    // element type restores the property access without widening to `any`.
    for (const machine of Object.values<{ title: string }>(machines)) {
      const colHead = machine.title.split(' ', 1)[0];
      expect(md).toContain(colHead);
    }
    expect(md).toContain('Avg');
    const libs = new Set<string>(entries.map(e => e.library.name));
    for (const lib of libs) {
      // The lib name appears in some cell — either plain or wrapped in <fail>
      const escaped = lib.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
      const re = new RegExp(String.raw`(\| ${escaped} \|)|(<fail>${escaped}</fail>)`);
      expect(md).toMatch(re);
    }
  });

  it('wraps a library with any canImplement:false cell in <fail>', async () => {
    const { renderQuickTab } = await import('../../buildjs/build_shootout.mjs');
    const md = renderQuickTab(machines, entries);
    // nanostate and machina both have canImplement:false on their matter entries
    expect(md).toMatch(/<fail>nanostate<\/fail>/);
    expect(md).toMatch(/<fail>machina<\/fail>/);
  });

  it('bolds official-upstream line counts', async () => {
    const { renderQuickTab } = await import('../../buildjs/build_shootout.mjs');
    const md = renderQuickTab(machines, entries);
    // jssm is official on all three machines, so jssm's row should contain **[N]
    expect(md).toMatch(/\| jssm \| \*\*\[1\]/);
  });

  it('sorts libraries by ascending average, with any-fail libraries last', async () => {
    const { renderQuickTab } = await import('../../buildjs/build_shootout.mjs');
    const md = renderQuickTab(machines, entries);
    const jssmIdx       = md.indexOf('| jssm ');
    const machinaIdx    = md.indexOf('<fail>machina</fail>');
    const nanostateIdx  = md.indexOf('<fail>nanostate</fail>');
    expect(jssmIdx).toBeGreaterThan(-1);
    expect(machinaIdx).toBeGreaterThan(-1);
    expect(nanostateIdx).toBeGreaterThan(-1);
    expect(jssmIdx).toBeLessThan(machinaIdx);
    expect(jssmIdx).toBeLessThan(nanostateIdx);
  });
});

describe('build_shootout: renderMachineSection', () => {
  let machines: any;
  let entries: any[];

  beforeAll(async () => {
    const { loadAll } = await import('../../buildjs/build_shootout.mjs');
    const result = await loadAll();
    machines = result.machines;
    entries = result.entries;
  });

  it('emits the ## title, the blurb, a per-machine table, and each entry', async () => {
    const { renderMachineSection } = await import('../../buildjs/build_shootout.mjs');
    const md = renderMachineSection('toggle', machines.toggle, entries);
    expect(md).toMatch(/^## Toggle machine/m);
    expect(md).toContain(machines.toggle.blurb.split('\n', 1)[0]);
    expect(md).toMatch(/\| lib \| length \|/);
    const toggleEntries = entries.filter(e => e.machine === 'toggle');
    for (const e of toggleEntries) {
      const re = new RegExp(`### .*\`${e.library.name}\` Toggle machine`);
      expect(md).toMatch(re);
    }
  });

  it('sorts the per-machine table rows ascending by line count, fails last', async () => {
    const { renderMachineSection } = await import('../../buildjs/build_shootout.mjs');
    const md = renderMachineSection('matter', machines.matter, entries);
    const jssmTableIdx     = md.indexOf('| jssm |');
    const machinaTableIdx  = md.indexOf('<fail>machina</fail>');
    const nanostateTableIdx = md.indexOf('<fail>nanostate</fail>');
    expect(jssmTableIdx).toBeGreaterThan(-1);
    expect(machinaTableIdx).toBeGreaterThan(-1);
    expect(nanostateTableIdx).toBeGreaterThan(-1);
    expect(jssmTableIdx).toBeLessThan(machinaTableIdx);
    expect(jssmTableIdx).toBeLessThan(nanostateTableIdx);
  });
});

describe('build_shootout: renderGenerated', () => {
  let machines: any;
  let entries: any[];

  beforeAll(async () => {
    const { loadAll } = await import('../../buildjs/build_shootout.mjs');
    const result = await loadAll();
    machines = result.machines;
    entries = result.entries;
  });

  it('emits the quicktab span, then each machine section in machines.json order', async () => {
    const { renderGenerated } = await import('../../buildjs/build_shootout.mjs');
    const md = renderGenerated(machines, entries);
    expect(md).toContain('<span id="quicktab">');
    const toggleIdx = md.indexOf('## Toggle machine');
    const trafficIdx = md.indexOf('## Traffic light');
    const matterIdx = md.indexOf('## States of Matter');
    expect(toggleIdx).toBeGreaterThan(-1);
    expect(trafficIdx).toBeGreaterThan(toggleIdx);
    expect(matterIdx).toBeGreaterThan(trafficIdx);
  });
});

describe('build_shootout: spliceMarkers', () => {
  it('replaces content between START and END markers, preserving outside text', async () => {
    const { spliceMarkers } = await import('../../buildjs/build_shootout.mjs');
    const before = [
      '# Title',
      'Intro prose',
      '',
      '<!-- COMPARABLES:GENERATED-START — annotation -->',
      '',
      'OLD CONTENT',
      '',
      '<!-- COMPARABLES:GENERATED-END -->',
      'After',
    ].join('\n');
    const out = spliceMarkers(before, 'NEW CONTENT');
    expect(out).toContain('# Title');
    expect(out).toContain('Intro prose');
    expect(out).toContain('NEW CONTENT');
    expect(out).not.toContain('OLD CONTENT');
    expect(out).toContain('After');
    // The annotation on the start marker line should be preserved verbatim
    expect(out).toContain('<!-- COMPARABLES:GENERATED-START — annotation -->');
    expect(out).toContain('<!-- COMPARABLES:GENERATED-END -->');
  });

  it('throws if the start marker is missing', async () => {
    const { spliceMarkers } = await import('../../buildjs/build_shootout.mjs');
    expect(() => spliceMarkers('no markers here', 'x')).toThrow(/markers missing/i);
  });

  it('throws if the end marker is missing', async () => {
    const { spliceMarkers } = await import('../../buildjs/build_shootout.mjs');
    const onlyStart = '<!-- COMPARABLES:GENERATED-START -->\nSomething';
    expect(() => spliceMarkers(onlyStart, 'x')).toThrow(/markers missing/i);
  });

  it('is idempotent: splicing the same generated content twice yields identical output', async () => {
    const { spliceMarkers } = await import('../../buildjs/build_shootout.mjs');
    const before = '# T\n<!-- COMPARABLES:GENERATED-START -->\nold\n<!-- COMPARABLES:GENERATED-END -->\nbye';
    const once = spliceMarkers(before, 'GENERATED');
    const twice = spliceMarkers(once, 'GENERATED');
    expect(twice).toBe(once);
  });
});
