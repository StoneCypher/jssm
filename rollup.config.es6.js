
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs    from '@rollup/plugin-commonjs';
import replace     from '@rollup/plugin-replace';
import dts         from "rollup-plugin-dts";

const pkg = require('./package.json');

const config = [{

  input: 'dist/es6/jssm.js',

  output: {
    file   : 'dist/jssm.es6.js',
    format : 'es',
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
    }),

  ]}, {

  input: 'dist/es6/jssm.d.ts',

  output: { 
    file   : './jssm.es6.d.ts',
    format : 'es'
  },

  plugins : [

    dts()
  ]}
];
  



export default config;
