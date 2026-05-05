
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs    from '@rollup/plugin-commonjs';
import replace     from '@rollup/plugin-replace';
import dts         from "rollup-plugin-dts";


const config = [{

  input: 'dist/es6/jssm_viz.js',

  output: {
    file   : 'dist/jssm_viz.es5.cjs.js',
    format : 'cjs',
    name   : 'jssm_viz'
  },

  external : ['@viz-js/viz'],

  plugins : [
    nodeResolve({
      mainFields     : ['module', 'main'],
      browser        : false,
      extensions     : ['.js', '.json', '.ts', '.tsx'],
      preferBuiltins : false
    }),
    commonjs(),
    replace({
      preventAssignment      : true,
      'process.env.NODE_ENV' : JSON.stringify('production')
    })
  ]
}, {

  input: 'dist/es6/jssm_viz.d.ts',

  output: {
    file   : './jssm_viz.es5.d.cts',
    format : 'es'
  },

  plugins : [dts()]
}];


export default config;
