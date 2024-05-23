
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs    from '@rollup/plugin-commonjs';
import replace     from '@rollup/plugin-replace';
import dts         from "rollup-plugin-dts";

const pkg = require('./package.json');

const config = [{

  input: 'dist/es6/jssm.js',

  output: {
    file   : 'dist/jssm.es5.cjs.js',
    format : 'cjs',
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
    file   : './jssm.es5.d.cts',
    format : 'cjs'
  },

  plugins : [

    dts()
  ]}
];

export default config;
