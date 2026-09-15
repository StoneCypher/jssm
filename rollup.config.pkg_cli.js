// Externalized jssm-cli package bundles — same inputs and plugin stack as
// rollup.config.cli.js, emitted into packages/jssm-cli/dist with the
// upstream workspace packages left external: relative imports that resolve
// to core (`src/ts/jssm.ts`), viz (`src/ts/jssm_viz.ts`), or fence
// (`src/ts/fsl_fence_render.ts`) are rewritten to the package ids `jssm`,
// `jssm-viz`, and `jssm-fence`, so the emitted binaries resolve against the
// consumer's installed copies at runtime instead of inlining them.

import esbuild    from 'rollup-plugin-esbuild';
import resolve    from '@rollup/plugin-node-resolve';
import commonjs   from '@rollup/plugin-commonjs';
import replace    from '@rollup/plugin-replace';
import { readFileSync } from 'fs';
import path from 'path';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

const external = [
  '@viz-js/viz',
  '@resvg/resvg-wasm',
  // ajv is left external because its package ships JSON files
  // (meta-schemas under dist/refs/*.json) that rollup cannot consume
  // without @rollup/plugin-json. Keeping it external means the CLI dist
  // require()s ajv at runtime from node_modules instead of bundling it.
  'ajv',
  'fs', 'path', 'os', 'child_process', 'util', 'stream',
  'fs/promises',
  'module',
  'jssm',
  'jssm-viz',
  'jssm-fence',
];

/**
 * src/ts module basenames (extension stripped) that rewrite to an external
 * workspace package id when a CLI source imports them across the package
 * boundary.  Every module here has its needed symbols re-exported from the
 * owning package's public surface (`src/ts/jssm.ts` for core,
 * `src/ts/fence.ts` for jssm-fence).
 */
const BOUNDARY_REWRITES = new Map([
  ['jssm',                 'jssm'],
  ['fsl_replay',           'jssm'],
  ['fsl_stimulus_tape',    'jssm'],
  ['jssm_viz',             'jssm-viz'],
  ['fsl_fence_render',     'jssm-fence'],
  ['fsl_rasterize',        'jssm-fence'],
  ['fsl_rasterize_errors', 'jssm-fence'],
  ['fsl_rasterize_font',   'jssm-fence'],
]);

const SRC_TS_DIR = path.resolve('src/ts');

/**
 * Rollup plugin that resolves each relative import against its importer and,
 * when the target is a `src/ts` module owned by an upstream package (per
 * BOUNDARY_REWRITES), marks it external under the owning package's id.
 * Imports that stay inside `src/ts/cli` fall through to the normal resolver.
 *
 * @returns {import('rollup').Plugin}
 */
function externalize_upstream_packages() {
  return {
    name: 'externalize-upstream-packages',
    resolveId(source, importer) {
      if (!importer || !source.startsWith('.')) { return null; }
      const resolved = path.resolve(path.dirname(importer), source.replace(/\.js$/, ''));
      if (path.dirname(resolved) !== SRC_TS_DIR) { return null; }
      const target = BOUNDARY_REWRITES.get(path.basename(resolved));
      if (target !== undefined) { return { id: target, external: true }; }
      return null;
    },
  };
}

// The JS builds transpile only — esbuild strips TypeScript types per-file
// without whole-program type-checking (tsc runs once in `typecheck_cli`).
const jsPlugins = () => [
  externalize_upstream_packages(),
  esbuild({ tsconfig: './tsconfig.cli.json' }),
  resolve({ preferBuiltins: true, extensions: ['.ts', '.js', '.json'] }),
  commonjs(),
  replace({
    preventAssignment: true,
    values: { '__JSSM_VERSION__': pkg.version },
  }),
];

export default [

  // fsl binary
  {
    input: 'src/ts/cli/fsl.ts',
    output: { file: 'packages/jssm-cli/dist/fsl.cjs', format: 'cjs', banner: '#!/usr/bin/env node', sourcemap: false },
    external,
    plugins: jsPlugins(),
  },

  // fsl-render binary
  {
    input: 'src/ts/cli/fsl-render.ts',
    output: { file: 'packages/jssm-cli/dist/fsl-render.cjs', format: 'cjs', banner: '#!/usr/bin/env node', sourcemap: false },
    external,
    plugins: jsPlugins(),
  },

  // fsl-export-system-prompt binary
  {
    input: 'src/ts/cli/fsl-export-system-prompt.ts',
    output: { file: 'packages/jssm-cli/dist/fsl-export-system-prompt.cjs', format: 'cjs', banner: '#!/usr/bin/env node', sourcemap: false },
    external,
    plugins: jsPlugins(),
  },

  // jssm-cli library — one build, both module formats
  {
    input: 'src/ts/cli/lib.ts',
    output: [
      { file: 'packages/jssm-cli/dist/lib.cjs', format: 'cjs', sourcemap: false },
      { file: 'packages/jssm-cli/dist/lib.mjs', format: 'esm', sourcemap: false },
    ],
    external,
    plugins: jsPlugins(),
  },

];
