import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';

const external = [
  '@viz-js/viz',
  '@resvg/resvg-wasm',
  'fs', 'path', 'os', 'child_process', 'util', 'stream',
  'module',
];

const binaryConfig = (input, output) => ({
  input,
  output: {
    file: output,
    format: 'cjs',
    banner: '#!/usr/bin/env node',
    sourcemap: false,
  },
  external,
  plugins: [
    typescript({
      tsconfig: './tsconfig.cli.json',
      outputToFilesystem: false,
    }),
    resolve({ preferBuiltins: true, extensions: ['.ts', '.js', '.json'] }),
    commonjs(),
    replace({
      preventAssignment: true,
      values: {},
    }),
  ],
});

export default [
  binaryConfig('src/ts/cli/fsl.ts',        'dist/cli/fsl.cjs'),
  binaryConfig('src/ts/cli/fsl-render.ts', 'dist/cli/fsl-render.cjs'),
  {
    input: 'src/ts/cli/lib.ts',
    output: { file: 'dist/cli/lib.cjs', format: 'cjs', sourcemap: false },
    external,
    plugins: [
      typescript({ tsconfig: './tsconfig.cli.json', outputToFilesystem: false }),
      resolve({ preferBuiltins: true, extensions: ['.ts', '.js', '.json'] }),
      commonjs(),
    ],
  },
];
