// jssm-iife compatibility package — the browser-global build, sequestered out
// of the main package for v6 (`esm-only-main-package`).
//
// SELF-CONTAINED ON PURPOSE, for the same reason as jssm-cjs but more starkly:
// an IIFE exists to be dropped into a `<script>` tag with no module loader and
// no resolver present at all.  There is nothing in that environment that could
// follow a dependency edge, so the bundle must carry everything it needs.
//
// This is also the build the CDN serves, so it is the one artifact whose shape
// is dictated by the consumer having no tooling whatsoever.

import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs    from '@rollup/plugin-commonjs';
import replace     from '@rollup/plugin-replace';
import dts         from 'rollup-plugin-dts';

export default [

  {
    input  : 'dist/es6/jssm.js',
    output : {
      file   : 'packages/jssm-iife/dist/jssm.iife.js',
      format : 'iife',
      //  the global a script-tag consumer reads: `jssm.sm\`a -> b;\``
      name   : 'jssm',
    },
    plugins: [
      nodeResolve({
        mainFields     : ['module', 'main'],
        browser        : true,
        extensions     : ['.js', '.json', '.ts', '.tsx'],
        preferBuiltins : false,
      }),
      commonjs(),
      replace({
        preventAssignment      : true,
        'process.env.NODE_ENV' : JSON.stringify('production'),
      }),
    ],
  },

  //  Bundlers and editors still want types even for a global build, and they
  //  ship here rather than in a separate package.
  {
    input  : 'dist/es6/jssm.d.ts',
    output : { file: 'packages/jssm-iife/dist/jssm.d.ts', format: 'es' },
    plugins: [dts()],
  },

];
