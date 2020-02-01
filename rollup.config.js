
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs    from 'rollup-plugin-commonjs';
import replace     from 'rollup-plugin-replace';

const pkg = require('./package.json');




const gen_config = (file, format) => ({

  input: 'build/es6/jssm.js',

  output: {
    file,
    format,
    name      : 'jssm',
    sourcemap : true,
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
      'process.env.NODE_ENV' : JSON.stringify( 'production' )
    })

  ]

});




const // es6config  = gen_config('build/jssm.es6.js',     'es'),
      cjsconfig  = gen_config('build/jssm.es5.cjs.js', 'cjs'),
      iifeconfig = gen_config('build/jssm.iife.js',    'iife');





export default [ /* es6config, */ cjsconfig, iifeconfig ];
