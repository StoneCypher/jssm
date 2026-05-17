// Merged CLI rollup config — one `rollup -c` invocation builds every CLI
// artifact in a single process. Previously this was three separate config
// files (cjs / esm / dts) and three `rollup` invocations; consolidating
// also lets `lib` emit both module formats from one build (one tsc pass)
// and the type declarations emit both formats from one dts build.

import typescript from '@rollup/plugin-typescript';
import resolve    from '@rollup/plugin-node-resolve';
import commonjs   from '@rollup/plugin-commonjs';
import replace    from '@rollup/plugin-replace';
import dts        from 'rollup-plugin-dts';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

const external = [
  '@viz-js/viz',
  '@resvg/resvg-wasm',
  'fs', 'path', 'os', 'child_process', 'util', 'stream',
  'module',
];

// Fresh plugin instances per build — @rollup/plugin-typescript holds
// per-build compiler state, so array entries must not share instances.
const jsPlugins = () => [
  typescript({ tsconfig: './tsconfig.cli.json', outputToFilesystem: false }),
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
