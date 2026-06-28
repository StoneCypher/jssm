import nodeResolve from '@rollup/plugin-node-resolve';

/**
 * ESM build for the `jssm/cm6` subpath (FSL CodeMirror 6 language support).
 *
 * The `@codemirror/*` and `@lezer/*` packages are externalized — they are
 * optional peer dependencies the consumer already has when they use a
 * CodeMirror editor, so bundling them here would risk a duplicate
 * `@codemirror/state` (breaking `instanceof Extension` checks) and bloat. The
 * emitted module therefore imports the bare specifiers, resolved at the
 * consumer's `node_modules`.
 */
const external = (id) => id.startsWith('@codemirror/') || id.startsWith('@lezer/');

export default [{
  input  : 'dist/es6/cm6/fsl_language.js',
  output : {
    file   : 'dist/cm6/fsl_language.js',
    format : 'es',
    name   : 'fsl_cm6',
  },
  external,
  plugins : [ nodeResolve({ extensions: ['.js', '.json'] }) ],
}];
