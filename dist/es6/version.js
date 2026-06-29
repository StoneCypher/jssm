/**
 *  The published semantic version of the jssm package this build was cut from.
 *  Mirrored from `package.json` by `src/buildjs/makever.cjs` at build time.
 *  Useful for runtime diagnostics and for embedding in serialized machine
 *  snapshots so that deserializers can detect version-skew.
 */
const version = "5.155.1";
/**
 *  The Unix epoch timestamp (in milliseconds) at which this build was produced,
 *  written by `src/buildjs/makever.cjs`.  Useful for distinguishing builds
 *  with the same `version` string during development, and for diagnostic logs.
 */
const build_time = 1782701335633;
export { version, build_time };
