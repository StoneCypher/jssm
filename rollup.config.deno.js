
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs    from '@rollup/plugin-commonjs';
import replace     from '@rollup/plugin-replace';





const config = {

  input: 'dist/es6/jssm.js',

  output: {
    file   : 'dist/deno/jssm.deno-esm.nonmin.js',
    format : 'esm',
    name   : 'jssm'
  },

  plugins : [

    nodeResolve({
      mainFields     : ['module', 'main'],
      browser        : true,
      extensions     : [ '.js', '.json', '.ts', '.tsx' ],
      preferBuiltins : false
    }),

    commonjs(),

    replace({
      preventAssignment      : true,
      'process.env.NODE_ENV' : JSON.stringify( 'production' )
    })

  ]

};





export default config;
