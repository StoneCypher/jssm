
import nodeResolve from 'rollup-plugin-node-resolve';
import typescript  from 'rollup-plugin-typescript2';
import replace     from 'rollup-plugin-replace';





const es6config = {

  input     : 'src/js/jssm_types.ts',

  output    : {
    file      : 'build/jssm_types.es6.js',
    format    : 'es',
    name      : 'jssm_types',
    sourcemap : true,
  },

  plugins   : [

    typescript(),

    nodeResolve({
      mainFields     : ['module', 'main'],
      browser        : true,
      extensions     : [ '.js', '.json', '.ts', '.tsx' ],
      preferBuiltins : false
    }),

    replace({
      'process.env.NODE_ENV': JSON.stringify( 'production' )
    })

  ]

};





const cjsconfig = {

  input     : 'src/js/jssm_types.ts',

  output    : {
    file      : 'build/jssm_types.cjs.js',
    format    : 'cjs',
    name      : 'jssm_types',
    sourcemap : true,
  },

  plugins   : [

    typescript(),

    nodeResolve({
      mainFields     : ['module', 'main'],
      browser        : true,
      extensions     : [ '.js', '.json', '.ts', '.tsx' ],
      preferBuiltins : false
    }),

    replace({
      'process.env.NODE_ENV': JSON.stringify( 'production' )
    })

  ]

};





const iifeconfig = {

  input     : 'src/js/jssm_types.ts',

  output    : {
    file      : 'build/jssm_types.iife.js',
    format    : 'iife',
    name      : 'jssm_types',
    sourcemap : true,
  },

  plugins   : [

    typescript(),

    nodeResolve({
      mainFields     : ['module', 'main'],
      browser        : true,
      extensions     : [ '.js', '.json', '.ts', '.tsx' ],
      preferBuiltins : false
    }),

    replace({
      'process.env.NODE_ENV': JSON.stringify( 'production' )
    })

  ]

};





export default [ es6config, cjsconfig, iifeconfig ];