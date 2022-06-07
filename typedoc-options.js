module.exports = {
  name: 'JSSM, a JavaScript state machine - the FSM for FSL',
  readme: './src/doc_md/DocLandingPage.md',
  out: 'docs/docs',
  // entryPoints: [
  //   'packages/*',
  // ],
  customCss: './src/site/typedoc-addon.css',
  // entryPointStrategy: 'packages',
  pluginPages: {
    source: './src/doc_md/',
    pages: [
      { title: 'Tutorials', childrenDir: './', children: [
        { title: '☕ Quick Start', source: 'GettingStarted.md' },
        { title: 'What are state machines?', source: 'todo.md' },
        { title: 'Language reference', source: 'todo.md' },
        { title: 'API reference',      source: 'todo.md' },
        { title: 'Example machines',   source: 'todo.md' },
        { title: 'Howtos and Recipes', childrenDir: './', children: [
          { title: 'Environments', source: 'todo.md' },
          { title: 'Bundling',     source: 'todo.md' },
          { title: 'Publishing',   source: 'todo.md' }
        ] },
        { title: 'Comparisons', childrenDir: './', children: [
          { title: 'Feature comparison', source: 'FeatureComparison.md' },
          { title: 'LOC Shootout',       source: 'Shootout.md' }
        ] },
      ] },
      { title: 'Tools', childrenDir: './', children: [
        { title: 'Live Editor',   source: 'live_editor.md' },
        { title: 'Github Action', source: 'todo.md' }
      ] },
      { title: 'VIRTUAL', childrenDir: './', children: [
        { title: 'Community', source: 'community.md' }
      ] },
      { title: 'VIRTUAL', childrenDir: './', children: [
        { title: 'Changelog', source: 'CHANGELOG.md' }
      ] },
      // { title: '@knodes/typedoc-plugin-code-blocks', source: 'readme-extras.md', children: [
      //   { title: 'Using options', source: 'options.md' },
      // ] },
      // { title: '@knodes/typedoc-plugin-monorepo-readmes', children: [
      //   { title: 'Using options', source: 'options.md' },
      // ] },
      // { title: '@knodes/typedoc-plugin-pages', source: 'readme-extras.md', children: [
      //   { title: 'Using options', source: 'options.md' },
      //   { title: 'Pages tree', source: 'pages-tree.md' },
      // ] },
      // { title: '@knodes/typedoc-pluginutils', children: [
      //   { title: 'Providing options', source: 'providing-options.md' },
      // ] },
    ]
  },
  // pluginCodeBlocks: { source: '__tests__/mock-fs' },
  excludePrivate: true
};