module.exports = {
  name: 'JSSM, a JavaScript state machine - the FSM for FSL',
  readme: './src/doc_md/DocLandingPage.md',
  out: 'docs/docs',
  // entryPoints: [
  //   'packages/*',
  // ],
  customCss: './src/site/typedoc-addon.css',
  // entryPointStrategy: 'packages',
  // typedoc 0.23+ no longer auto-loads plugins from node_modules; declare the
  // one we keep (missing-exports surfaces referenced-but-unexported types under
  // an <internal> module, matching the pre-upgrade docs).
  plugin: ['typedoc-plugin-missing-exports'],
  excludePrivate: true,
  // Internal-only surfaces (the `@internal` `_test` helper bag and private
  // `Machine._*` members) are not public API; excluding them keeps them out of
  // the reference AND drops their internal cross-links, which would otherwise
  // warn as "resolved but not included".
  excludeInternal: true
};
