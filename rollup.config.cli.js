// Merged CLI rollup config — one `rollup -c` invocation builds every CLI
// artifact in a single process. Previously this was three separate config
// files (cjs / esm / dts) and three `rollup` invocations; consolidating
// also lets `lib` emit both module formats from one build (one tsc pass)
// and the type declarations emit both formats from one dts build.

import esbuild    from 'rollup-plugin-esbuild';
import resolve    from '@rollup/plugin-node-resolve';
import commonjs   from '@rollup/plugin-commonjs';
import replace    from '@rollup/plugin-replace';
import dts        from 'rollup-plugin-dts';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

const external = [
  '@viz-js/viz',
  '@resvg/resvg-wasm',
  // ajv is left external because its package ships JSON files
  // (meta-schemas under dist/refs/*.json) that rollup cannot consume
  // without @rollup/plugin-json. Keeping it external means the CLI dist
  // require()s ajv at runtime from node_modules instead of bundling it.
  // ajv is already declared in package.json `dependencies` so it ships
  // alongside the CLI.
  'ajv',
  'fs', 'path', 'os', 'child_process', 'util', 'stream',
  'fs/promises',
  'module',
];

// The JS builds transpile only — esbuild strips TypeScript types per-file
// without whole-program type-checking. Type-checking is done once by
// `npm run typecheck_cli` (tsc --noEmit) rather than three times here, one
// per build. esbuild reads tsconfig.cli.json for target / decorator config.
const jsPlugins = () => [
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
    output: { file: 'dist/cli/fsl.cjs', format: 'cjs', banner: '#!/usr/bin/env node', sourcemap: false },
    external,
    plugins: jsPlugins(),
  },

  // fsl-render binary
  {
    input: 'src/ts/cli/fsl-render.ts',
    output: { file: 'dist/cli/fsl-render.cjs', format: 'cjs', banner: '#!/usr/bin/env node', sourcemap: false },
    external,
    plugins: jsPlugins(),
  },

  // jssm/cli library — one build, both module formats
  {
    input: 'src/ts/cli/lib.ts',
    output: [
      { file: 'dist/cli/lib.cjs', format: 'cjs', sourcemap: false },
      { file: 'dist/cli/lib.mjs', format: 'esm', sourcemap: false },
    ],
    external,
    plugins: jsPlugins(),
  },

  // jssm/cli type declarations — one build, both module formats
  {
    input: 'src/ts/cli/lib.ts',
    output: [
      { file: 'jssm.cli.d.ts',  format: 'esm' },
      { file: 'jssm.cli.d.cts', format: 'cjs' },
    ],
    external: ['@viz-js/viz', '@resvg/resvg-wasm'],
    plugins: [dts({ tsconfig: './tsconfig.cli.json' })],
  },

];
