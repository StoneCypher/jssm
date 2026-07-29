
/*******
 *
 *  Boundary guard for the externalized package bundles under
 *  `packages/*\/dist` (the v6 workspace split).  The three
 *  `rollup.config.pkg_*.js` resolveId plugins are externalization
 *  ALLOWLISTS: a module the plugin does not recognize silently bundles IN,
 *  so a future cross-boundary import would quietly reintroduce
 *  cross-package duplication (and its instanceof hazards) with no failing
 *  signal.  This spec is that signal.  It reads the BUILT bundles and
 *  asserts two invariants:
 *
 *   1. each bundle's external reach — the bare specifiers in its emitted
 *      requires / imports — is EXACTLY the expected id set, so a new
 *      external appears loudly and a lost external (something that began
 *      bundling in) shrinks the set loudly; and
 *
 *   2. ownership markers — distinctive string literals owned by exactly one
 *      package's source — appear only in the bundle that owns them, so
 *      silently-inlined upstream code is caught even when the external set
 *      is unchanged.  String literals (plus one top-level class declaration,
 *      which the repo's terser flags never mangle) survive minification, so
 *      the assertions hold whether the DAG has run `min_pkg_*` yet or not.
 *
 *  The cdn bundles are exempt from upstream-marker ABSENCE checks: they are
 *  self-contained single files by design (core and viz inline there on
 *  purpose, mirroring the embedded cdn posture).
 *
 *  Skips (rather than fails) when the package bundles have not been built
 *  yet — fresh clone before `make`, or a ci-lite leg — same self-skip
 *  precedent as `src/ts/tests/published_files.spec.ts`.
 *
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve }                  from 'node:path';

const root = resolve(__dirname, '../../..');



/*******
 *
 *  Every externalized package bundle under test, with the exact bare
 *  specifier set its emitted code may reach.  Derived from (and verified
 *  against) the boundary design in the `rollup.config.pkg_*.js` headers:
 *  jssm-viz reaches core only; jssm-fence reaches core + viz (+ the
 *  optional resvg backend and node builtins for its rasterizer); jssm-cli
 *  reaches all three packages plus ajv (a declared dependency of jssm-cli
 *  and root) and node builtins.
 *
 */

const EXPECTED_EXTERNALS: Record<string, string[]> = {

  'packages/jssm-viz/dist/jssm_viz.cjs'                 : ['@viz-js/viz', 'jssm'],
  'packages/jssm-viz/dist/jssm_viz.mjs'                 : ['@viz-js/viz', 'jssm'],
  'packages/jssm-viz/dist/wc/viz.js'                    : ['jssm-viz', 'lit', 'lit/decorators.js', 'lit/directives/unsafe-html.js'],
  'packages/jssm-viz/dist/wc/viz.define.js'             : [],
  'packages/jssm-viz/dist/wc/instance.js'               : ['jssm', 'lit'],
  'packages/jssm-viz/dist/wc/instance.define.js'        : [],
  'packages/jssm-viz/dist/wc/editor.js'                 : ['@codemirror/autocomplete', '@codemirror/commands', '@codemirror/language', '@codemirror/lint', '@codemirror/state', '@codemirror/view', '@lezer/highlight', 'jssm', 'lit', 'lit/decorators.js'],
  'packages/jssm-viz/dist/wc/editor.define.js'          : [],
  'packages/jssm-viz/dist/wc/widgets.js'                : ['jssm', 'jssm-viz', 'lit', 'lit/decorators.js'],
  'packages/jssm-viz/dist/wc/widgets.define.js'         : [],
  'packages/jssm-viz/dist/wc/docs.js'                   : ['lit', 'lit/decorators.js', 'lit/directives/unsafe-html.js'],
  'packages/jssm-viz/dist/wc/docs.define.js'            : [],
  'packages/jssm-viz/dist/cdn/viz.js'                   : ['@viz-js/viz'],
  'packages/jssm-viz/dist/cdn/instance.js'              : [],
  'packages/jssm-fence/dist/fence.js'                   : ['@resvg/resvg-wasm', 'jssm', 'jssm-viz', 'node:fs', 'node:module', 'node:path'],
  'packages/jssm-cli/dist/fsl.cjs'                      : ['node:child_process', 'node:fs', 'node:path'],
  'packages/jssm-cli/dist/fsl-render.cjs'               : ['ajv', 'jssm-fence', 'jssm-viz', 'node:fs', 'node:fs/promises', 'node:os', 'node:path'],
  'packages/jssm-cli/dist/fsl-export-system-prompt.cjs' : [],
  'packages/jssm-cli/dist/lib.cjs'                      : ['ajv', 'jssm', 'jssm-fence', 'jssm-viz', 'node:fs/promises', 'node:os', 'node:path'],
  'packages/jssm-cli/dist/lib.mjs'                      : ['ajv', 'jssm', 'jssm-fence', 'jssm-viz', 'node:fs/promises', 'node:os', 'node:path'],

};

const ALL_BUNDLES = Object.keys(EXPECTED_EXTERNALS);

/** The self-contained-by-design bundles, exempt from upstream-marker absence. */
const CDN_BUNDLES = ALL_BUNDLES.filter(b => b.includes('/cdn/'));



/*******
 *
 *  Ownership markers: each is a string distinctive to exactly one source
 *  module, chosen to survive minification (five are string literals; the
 *  `class JssmError` declaration is top-level in every flat bundle and the
 *  repo's terser invocations never mangle top-level names).  `owner` names
 *  the sole package bundle set the marker may appear in.
 *
 */

const MARKERS: Record<string, { text: string, source: string, owner: 'core' | 'viz' | 'fence' }> = {

  core_entry      : { text: 'Code specifies no override',                          source: 'src/ts/jssm.ts',           owner: 'core'  },
  core_error      : { text: 'class JssmError',                                     source: 'src/ts/jssm_error.ts',     owner: 'core'  },
  core_replay     : { text: 'timer with no pending timeout',                       source: 'src/ts/fsl_replay.ts',     owner: 'core'  },
  viz_entry       : { text: 'Use *_svg_string in Node',                            source: 'src/ts/jssm_viz.ts',       owner: 'viz'   },
  fence_gif       : { text: 'quantize: max_colors must be 2..256',                 source: 'src/ts/fsl_gif.ts',        owner: 'fence' },
  fence_rasterize : { text: 'OffscreenCanvas present but Image constructor is not', source: 'src/ts/fsl_rasterize.ts', owner: 'fence' },

};

/** Which bundles legitimately CONTAIN each owner's code (vs importing it). */
const OWNER_BUNDLES: Record<'core' | 'viz' | 'fence', string[]> = {
  core  : [],  // core's bundle lives at root dist/, not under packages/
  viz   : ['packages/jssm-viz/dist/jssm_viz.cjs', 'packages/jssm-viz/dist/jssm_viz.mjs'],
  fence : ['packages/jssm-fence/dist/fence.js'],
};



/*******
 *
 *  Extracts the bare (non-relative) module specifiers a bundle's emitted
 *  code reaches: `require('x')`, dynamic `import('x')`, statement-anchored
 *  static `import`/`export ... from 'x'`, and side-effect `import 'x'`.
 *  Statement anchoring (start-of-line, `;`, or `}`) keeps doc-comment
 *  examples and prose inside template literals — which the unminified
 *  bundles carry in quantity — from registering as imports.
 *
 */

function bare_specifiers(src: string): string[] {

  const out = new Set<string>();

  const pats = [
    /\brequire\(\s*["']([^"']+)["']\s*\)/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
    /(?:^|[;}])\s*(?:import|export)\b[^"'`;()]*?\bfrom\s*["']([^"']+)["']/gm,
    /(?:^|[;}])\s*import\s*["']([^"']+)["']/gm,
  ];

  for (const pat of pats) {
    for (const m of src.matchAll(pat)) {
      const id = m[1];
      if (!id.startsWith('.') && !id.startsWith('/')) { out.add(id); }
    }
  }

  return [...out].sort();

}



/*******
 *
 *  Manifest reconciliation: EXPECTED_EXTERNALS is a hand-maintained
 *  allowlist of what each bundle MAY reach, but nothing above checks that
 *  reach is actually installable — the ajv-missing-from-jssm-cli and
 *  lit/@codemirror-missing-from-jssm-viz gaps were both externals the
 *  allowlist already expected, with no npm dependency backing them, so a
 *  consumer's `require`/`import` would 404 at runtime with every assertion
 *  above green. The functions and test below close that gap by reading each
 *  published package's OWN package.json at test time and asserting every
 *  external its bundles reach is either a node builtin, the package itself
 *  (a bundle importing its own published entry point), or declared under
 *  `dependencies`/`optionalDependencies`/`peerDependencies`.
 *
 */

/**
 * Node builtin module names accepted as externals with no manifest
 * declaration required. The built bundles emit these with a `node:` prefix
 * (Node's module resolution reserves that scheme for core modules, so the
 * prefix alone is authoritative); the bare, unprefixed form is accepted too
 * as a defensive fallback should a future bundle emit one without it.
 */
const NODE_BUILTINS = new Set([
  'assert', 'buffer', 'child_process', 'crypto', 'events', 'fs', 'fs/promises',
  'module', 'os', 'path', 'process', 'stream', 'url', 'util',
]);

/**
 * Extracts the npm package name a bare import specifier resolves against,
 * stripping any subpath: `lit/decorators.js` -> `lit`, `@codemirror/view` ->
 * `@codemirror/view` (a scoped package's own name already has a slash, so
 * only a THIRD segment is a subpath), `@lezer/highlight` -> `@lezer/highlight`.
 *
 * @param specifier - a bare (non-relative) module specifier
 * @returns the package name the specifier is imported from
 *
 * @example
 * package_name_of('lit/decorators.js'); // => 'lit'
 * @example
 * package_name_of('@codemirror/view'); // => '@codemirror/view'
 */
function package_name_of(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/**
 * Builds the set of dependency names one package.json declares across
 * `dependencies`, `optionalDependencies`, and `peerDependencies` — the full
 * closure of names a consumer installing the package (with its optional and
 * peer deps satisfied) is guaranteed to have resolvable.
 *
 * @param pkg_json - a parsed package.json object
 * @returns the union of declared dependency names across the three sections
 *
 * @example
 * declared_dependency_closure({ dependencies: { jssm: 'file:../..' }, peerDependencies: { lit: '>=3' } });
 * // => Set(['jssm', 'lit'])
 */
function declared_dependency_closure(pkg_json: Record<string, unknown>): Set<string> {
  const sections = ['dependencies', 'optionalDependencies', 'peerDependencies'] as const;
  const names = new Set<string>();
  for (const section of sections) {
    const map = pkg_json[section] as Record<string, string> | undefined;
    if (map) { for (const name of Object.keys(map)) { names.add(name); } }
  }
  return names;
}

/** The three packages published from `packages/*`, checked against their own manifests below. */
const PUBLISHED_PACKAGES: string[] = ['jssm-viz', 'jssm-fence', 'jssm-cli'];

const packages_built = ALL_BUNDLES.every(b => existsSync(resolve(root, b)));

describe.skipIf(!packages_built)('externalized package bundle boundaries (requires built packages/*/dist — run make)', () => {

  // Guarded: describe.skipIf skips the TESTS but still executes this body at
  // collection time, so the reads must not run against a missing dist.
  const contents = new Map<string, string>(
    packages_built ? ALL_BUNDLES.map(b => [b, readFileSync(resolve(root, b), 'utf8')] as const) : [],
  );

  describe('external reach is exactly the expected bare specifier set', () => {
    test.each(ALL_BUNDLES)('%s', (bundle: string) => {
      expect(bare_specifiers(contents.get(bundle)!)).toEqual(EXPECTED_EXTERNALS[bundle]);
    });
  });

  describe('every expected external is backed by a real dependency declaration', () => {
    test.each(PUBLISHED_PACKAGES)('%s: bundle externals reconcile against package.json', (pkg_name: string) => {

      const pkg_json_path = resolve(root, 'packages', pkg_name, 'package.json');
      const pkg_json       = JSON.parse(readFileSync(pkg_json_path, 'utf8')) as Record<string, unknown>;
      const declared       = declared_dependency_closure(pkg_json);

      const own_bundles = ALL_BUNDLES.filter(b => b.startsWith(`packages/${pkg_name}/`));
      const externals    = new Set<string>();
      for (const bundle of own_bundles) {
        for (const ext of EXPECTED_EXTERNALS[bundle]) { externals.add(ext); }
      }

      for (const ext of externals) {

        const bare_form       = ext.startsWith('node:') ? ext.slice('node:'.length) : ext;
        const is_node_builtin = ext.startsWith('node:') || NODE_BUILTINS.has(bare_form);
        const is_self         = ext === pkg_name;
        const is_declared     = declared.has(ext) || declared.has(package_name_of(ext));

        expect(
          is_node_builtin || is_self || is_declared,
          `${pkg_name} bundles externalize "${ext}", but it is not a node builtin, the package itself, or declared ` +
          `under dependencies/optionalDependencies/peerDependencies in packages/${pkg_name}/package.json — the ` +
          'boundary allowlist expects a module that the published manifest never promises to install',
        ).toBe(true);

      }

    });
  });

  describe('ownership markers appear only in their owning bundle', () => {

    for (const [name, marker] of Object.entries(MARKERS)) {

      const owners = OWNER_BUNDLES[marker.owner];

      test(`${name} ("${marker.text}" from ${marker.source})`, () => {

        for (const bundle of ALL_BUNDLES) {

          const legitimate = owners.includes(bundle) || CDN_BUNDLES.includes(bundle);
          const found      = contents.get(bundle)!.includes(marker.text);

          if (legitimate) {
            if (owners.includes(bundle)) {
              expect(found, `${marker.source} must be inlined in its owner ${bundle}`).toBe(true);
            }
            // cdn bundles are self-contained by design; presence there is
            // legitimate but not required (tree-shaking may drop the path)
          } else {
            expect(found, `${marker.source} leaked into ${bundle} — a boundary allowlist miss is bundling upstream code in`).toBe(false);
          }

        }

      });

    }

  });

  // The core markers must also actually exist somewhere, or the absence
  // checks above would pass vacuously against renamed/retired strings.
  // Root dist is the core bundle's home; gate on its presence (ci-lite
  // legs clean dist/ and skip the core bundle).
  const core_bundle       = 'dist/jssm.es5.cjs';
  const core_dist_present = existsSync(resolve(root, core_bundle));

  test.skipIf(!core_dist_present)('core markers are present in the core bundle (non-vacuity)', () => {
    const core = readFileSync(resolve(root, core_bundle), 'utf8');
    for (const marker of Object.values(MARKERS)) {
      if (marker.owner === 'core') {
        expect(core.includes(marker.text), `${marker.source} marker missing from ${core_bundle} — update MARKERS if the string changed`).toBe(true);
      }
    }
  });

  // Same non-vacuity pin for the viz and fence markers, against their
  // package-owner bundles (always present when this suite runs at all).
  test('viz and fence markers are present in their owner bundles (non-vacuity)', () => {
    for (const marker of Object.values(MARKERS)) {
      for (const owner of OWNER_BUNDLES[marker.owner]) {
        expect(contents.get(owner)!.includes(marker.text), `${marker.source} marker missing from ${owner} — update MARKERS if the string changed`).toBe(true);
      }
    }
  });

});
