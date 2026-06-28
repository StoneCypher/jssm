'use strict';

const zlib = require('zlib');

/**
 *  Bundle-size measurement for the jssm scaling benchmark.  Records the raw,
 *  gzip, and brotli byte sizes of the published dist artifacts — the
 *  package-level echo of "the machine got heavier" that per-op timing can't see.
 *
 *  @see src/buildjs/benchmark_scaling.cjs (the consumer)
 */

/**
 *  Raw, gzip, and brotli byte sizes of one artifact's bytes.  Gzip/brotli are
 *  what users actually download over the wire, so both are reported alongside
 *  the raw on-disk size.
 *
 *  @param buf The artifact's bytes.
 *  @returns `{ raw, gzip, brotli }` in bytes.
 *
 *  @example measureBundle(fs.readFileSync('dist/jssm.es5.cjs'))
 */
function measureBundle(buf) {
  return {
    raw    : buf.length,
    gzip   : zlib.gzipSync(buf).length,
    brotli : zlib.brotliCompressSync(buf).length,
  };
}

/**
 *  Measure a list of artifact files, keyed by basename.  Reading goes through an
 *  injectable `readFile` seam (so tests need no fixtures on disk); a file that
 *  fails to read is skipped rather than crashing the pass.
 *
 *  @param files Absolute artifact paths.
 *  @param readFile `(path) => Buffer`; defaults to `fs.readFileSync`.
 *  @returns `{ [basename]: { raw, gzip, brotli } }` for every readable file.
 *
 *  @example collectBundleSizes(['/r/dist/jssm.es5.cjs'])
 */
function collectBundleSizes(files, readFile = require('fs').readFileSync) {
  const path = require('path');
  const out  = {};
  for (const file of files) {
    let buf;
    try { buf = readFile(file); } catch (e) { continue; }
    out[path.basename(file)] = measureBundle(buf);
  }
  return out;
}

module.exports = { measureBundle, collectBundleSizes };
