
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs    from 'rollup-plugin-commonjs';
import typescript  from 'rollup-plugin-typescript2';
import replace     from 'rollup-plugin-replace';





const es6config = {

  input     : 'src/js/jssm.ts',

  output    : {
    file      : 'build/jssm.es6.js',
    format    : 'es',
    name      : 'jssm',
    sourcemap : true,
  },

  plugins   : [

    nodeResolve({
      mainFields     : ['module', 'main'],
      browser        : true,
      extensions     : [ '.js', '.json', '.ts', '.tsx' ],
      preferBuiltins : false
    }),

    commonjs(),

    typescript(),

    replace({
      'process.env.NODE_ENV': JSON.stringify( 'production' )
    })

  ]

};





const cjsconfig = {

  input     : 'src/js/jssm.ts',

  output    : {
    file      : 'build/jssm.cjs.js',
    format    : 'cjs',
    name      : 'jssm',
    sourcemap : true,
  },

  plugins   : [

    nodeResolve({
      mainFields     : ['module', 'main'],
      browser        : true,
      extensions     : [ '.js', '.json', '.ts', '.tsx' ],
      preferBuiltins : false
    }),

    commonjs(),

    typescript(),

    replace({
      'process.env.NODE_ENV': JSON.stringify( 'production' )
    })

  ]

};





const iifeconfig = {

  input     : 'src/js/jssm.ts',

  output    : {
    file      : 'build/jssm.iife.js',
    format    : 'iife',
    name      : 'jssm',
    sourcemap : true,
  },

  plugins   : [

    nodeResolve({
      mainFields     : ['module', 'main'],
      browser        : true,
      extensions     : [ '.js', '.json', '.ts', '.tsx' ],
      preferBuiltins : false
    }),

    commonjs(),

    typescript(),

    replace({
      'process.env.NODE_ENV': JSON.stringify( 'production' )
    })

  ]

};





export default [ es6config, cjsconfig, iifeconfig ];
