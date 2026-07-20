import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

const require = createRequire(import.meta.url);
const cps = require('../collect_package_sizes.cjs');

// These tests exercise the PURE, network-free logic only: flag parsing, the
// octal header-field decoder, and the tar reader (against hand-built tar
// buffers). No fetch, registry, or filesystem call is reachable from any test
// here. The tar reader is additionally validated end-to-end against a real npm
// tarball during development (61/61 files, total == packument unpackedSize).

const { parseArgs, octalField, parseTar, runPool, deprecationOf, makeRecord, syncDeprecations } = cps;


/**
 *  Build one 512-byte ustar header + padded data for `name`/`content`, so the
 *  tests can assemble real tar buffers without a tar dependency. Only the
 *  fields the reader consults (name, size octal, typeflag) are populated; the
 *  reader does not verify the checksum.
 */
function tarEntry(name: string, content: Buffer, typeflag = '0'): Buffer {
  const header = Buffer.alloc(512, 0);
  header.write(name, 0, 'utf8');
  header.write(content.length.toString(8).padStart(11, '0') + '\0', 124, 'ascii');
  header.write(typeflag, 156, 'ascii');
  const padded = Buffer.alloc(Math.ceil(content.length / 512) * 512, 0);
  content.copy(padded);
  return Buffer.concat([header, padded]);
}

const TAR_END = Buffer.alloc(1024, 0);   // two zero blocks terminate an archive


describe('parseArgs', () => {

  it('requires --out', () => {
    expect(() => parseArgs([])).toThrow(/--out/);
  });

  it('rejects an unknown flag rather than ignoring it', () => {
    expect(() => parseArgs(['--out', 'd', '--frce'])).toThrow(/unknown flag/);
  });

  it('defaults to the jssm family, no limit, and a sane concurrency', () => {
    const o = parseArgs(['--out', 'data']);
    expect(o.outDir).toBe('data');
    expect(o.packages).toEqual(['jssm', 'jssm-viz', 'jssm-fence', 'jssm-cli']);
    expect(o.limit).toBe(Infinity);
    expect(o.concurrency).toBe(12);
    expect(o.force).toBe(false);
    expect(o.dryRun).toBe(false);
  });

  it('parses --concurrency and rejects a non-positive one', () => {
    expect(parseArgs(['--out', 'd', '--concurrency', '8']).concurrency).toBe(8);
    expect(() => parseArgs(['--out', 'd', '--concurrency', '0'])).toThrow(/concurrency/);
  });

  it('parses --packages, --limit, --force, --dry-run', () => {
    const o = parseArgs(['--out', 'd', '--packages', 'jssm, jssm-viz ', '--limit', '5', '--force', '--dry-run']);
    expect(o.packages).toEqual(['jssm', 'jssm-viz']);   // trimmed, blanks dropped
    expect(o.limit).toBe(5);
    expect(o.force).toBe(true);
    expect(o.dryRun).toBe(true);
  });

});


describe('octalField', () => {

  it('decodes a NUL-terminated octal size field', () => {
    const buf = Buffer.alloc(512, 0);
    buf.write('00000000144\0', 124, 'ascii');     // octal 144 == 100
    expect(octalField(buf, 124, 12)).toBe(100);
  });

  it('reads a blank field as zero', () => {
    const buf = Buffer.alloc(512, 0);
    expect(octalField(buf, 124, 12)).toBe(0);
  });

});


describe('parseTar', () => {

  it('lists regular files with their byte sizes and strips the package/ prefix', () => {
    const tar = Buffer.concat([
      tarEntry('package/package.json', Buffer.alloc(100, 0x78)),
      tarEntry('package/dist/a.js',    Buffer.alloc(3000, 0x79)),   // spans multiple blocks
      TAR_END,
    ]);
    const files = parseTar(tar);
    expect(files).toEqual({ 'package.json': 100, 'dist/a.js': 3000 });
  });

  it('excludes directory entries', () => {
    const tar = Buffer.concat([
      tarEntry('package/dist/', Buffer.alloc(0), '5'),   // directory typeflag
      tarEntry('package/dist/only.js', Buffer.alloc(42, 0x7a)),
      TAR_END,
    ]);
    const files = parseTar(tar);
    expect(files).toEqual({ 'dist/only.js': 42 });
    expect(files['dist/']).toBeUndefined();
  });

  it('stops cleanly at the zero-block terminator', () => {
    const tar = Buffer.concat([tarEntry('package/x', Buffer.alloc(1, 1)), TAR_END, Buffer.alloc(4096, 0)]);
    expect(Object.keys(parseTar(tar))).toEqual(['x']);
  });

});


describe('runPool', () => {

  it('never exceeds the concurrency bound and delivers every result', async () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    let inFlight = 0;
    let maxInFlight = 0;
    const got: number[] = [];
    await runPool(
      items,
      4,
      async (i: number) => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise(r => setTimeout(r, 3));
        inFlight--;
        return i * 2;
      },
      (_item: number, val: number) => got.push(val),
      () => {},
    );
    expect(maxInFlight).toBeLessThanOrEqual(4);
    expect(got.sort((a, b) => a - b)).toEqual(items.map(i => i * 2));
  });

  it('routes a throwing worker to onError without sinking its siblings', async () => {
    const ok: number[] = [];
    const errs: Array<[number, string]> = [];
    await runPool(
      [1, 2, 3, 4],
      2,
      async (i: number) => { if (i === 2) { throw new Error('boom'); } return i; },
      (_item: number, val: number) => ok.push(val),
      (item: number, err: Error) => errs.push([item, err.message]),
    );
    expect(ok.sort((a, b) => a - b)).toEqual([1, 3, 4]);
    expect(errs).toEqual([[2, 'boom']]);
  });

});


describe('deprecation', () => {

  const packument = {
    versions: {
      '1.0.0': { deprecated: 'use 2.x' },
      '1.1.0': { deprecated: '' },          // empty string == un-deprecated
      '2.0.0': {},                           // never deprecated
    },
  };

  it('deprecationOf reads the message, treating empty string as not-deprecated', () => {
    expect(deprecationOf(packument, '1.0.0')).toBe('use 2.x');
    expect(deprecationOf(packument, '1.1.0')).toBeNull();
    expect(deprecationOf(packument, '2.0.0')).toBeNull();
    expect(deprecationOf(packument, '9.9.9')).toBeNull();   // unknown version
  });

  it('makeRecord omits deprecated unless set, in canonical key order', () => {
    expect(makeRecord('t', null, { a: 1 })).toEqual({ published: 't', files: { a: 1 } });
    expect(Object.keys(makeRecord('t', 'x', { a: 1 }))).toEqual(['published', 'deprecated', 'files']);
  });

  it('syncDeprecations adds, clears, and leaves records, reporting the change count', () => {
    const archive = {
      versions: {
        '1.0.0': { published: 't0', files: { a: 1 } },                       // will gain deprecation
        '1.1.0': { published: 't1', deprecated: 'stale', files: { a: 1 } },  // will lose deprecation
        '2.0.0': { published: 't2', files: { a: 1 } },                       // unchanged
      },
    };
    const changed = syncDeprecations(archive, packument);
    expect(changed).toBe(2);
    expect(archive.versions['1.0.0'].deprecated).toBe('use 2.x');
    expect(archive.versions['1.1.0'].deprecated).toBeUndefined();
    expect(archive.versions['2.0.0']).toEqual({ published: 't2', files: { a: 1 } });
    // idempotent: a second sync changes nothing
    expect(syncDeprecations(archive, packument)).toBe(0);
  });

});
