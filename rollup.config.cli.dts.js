import dts from 'rollup-plugin-dts';

export default [
  {
    input: 'src/ts/cli/lib.ts',
    output: { file: 'jssm.cli.d.ts', format: 'esm' },
    external: ['@viz-js/viz', '@resvg/resvg-wasm'],
    plugins: [dts({ tsconfig: './tsconfig.cli.json' })],
  },
  {
    input: 'src/ts/cli/lib.ts',
    output: { file: 'jssm.cli.d.cts', format: 'cjs' },
    external: ['@viz-js/viz', '@resvg/resvg-wasm'],
    plugins: [dts({ tsconfig: './tsconfig.cli.json' })],
  },
];
