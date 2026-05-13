import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

const external = [
  '@viz-js/viz',
  '@resvg/resvg-wasm',
  'fs', 'path', 'os', 'child_process', 'util', 'stream',
  'module',
];

export default {
  input: 'src/ts/cli/lib.ts',
  output: { file: 'dist/cli/lib.mjs', format: 'esm', sourcemap: false },
  external,
  plugins: [
    typescript({ tsconfig: './tsconfig.cli.json', outputToFilesystem: false }),
    resolve({ preferBuiltins: true, extensions: ['.ts', '.js', '.json'] }),
  ],
};
