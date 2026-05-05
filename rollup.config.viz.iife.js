
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs    from '@rollup/plugin-commonjs';
import replace     from '@rollup/plugin-replace';


const config = [{

  input: 'dist/es6/jssm_viz.js',

  output: {
    file                : 'dist/jssm_viz.es5.iife.js',
    format              : 'iife',
    name                : 'jssm_viz',
    inlineDynamicImports: false
  },

  external : ['@viz-js/viz'],

  plugins : [
    nodeResolve({
      mainFields     : ['module', 'main'],
      browser        : true,
      extensions     : ['.js', '.json', '.ts', '.tsx'],
      preferBuiltins : false
    }),
    commonjs(),
    replace({
      preventAssignment      : true,
      'process.env.NODE_ENV' : JSON.stringify('production')
    })
  ]
}];


export default config;
