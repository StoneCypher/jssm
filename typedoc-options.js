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
        { title: 'What are state machines?', source: 'WhatAreStateMachines.md' },
        { title: '☕ Quick Start', source: 'GettingStarted.md' },
        { title: 'Language reference', source: 'LanguageReference.md' },
        { title: 'API reference',      source: 'todo.md' },
        { title: 'Example machines',   source: 'ExampleMachines.md' },
        { title: 'Howtos and Recipes', childrenDir: './', children: [
          { title: 'Frameworks', childrenDir: './', children: [
            { title: 'React',   source: 'todo.md' },
            { title: 'Vue',     source: 'todo.md' },
            { title: 'Angular', source: 'todo.md' },
            { title: 'Node',    source: 'todo.md' },
          ] },
          { title: 'Environments', childrenDir: './', children: [
            { title: 'Node',        source: 'todo.md' },
            { title: 'Typescript',  source: 'todo.md' },
            { title: 'The browser', source: 'todo.md' },
//          { title: 'Deno',        source: 'todo.md' },
            { title: 'AWS Lambda',  source: 'todo.md' },
            { title: 'SQL',         source: 'todo.md' },
          ] },
          { title: 'Bundling', childrenDir: './', children: [
            { title: 'Rollup',      source: 'todo.md' },
            { title: 'Webpack',     source: 'todo.md' },
            { title: 'CDN',         source: 'todo.md' },
            { title: 'Local files', source: 'todo.md' },
          ] },
          { title: "Let's make a large machine", source: 'todo.md' },
          { title: 'Publishing',                 source: 'todo.md' },
          { title: 'Theme, style, color',        source: 'Styling.md' }
        ] },
        { title: 'Comparisons', childrenDir: './', children: [
          { title: 'Feature comparison', source: 'FeatureComparison.md' },
          { title: 'LOC Shootout',       source: 'Shootout.md' }
        ] },
      ] },
      { title: 'Tools', childrenDir: './', children: [
        { title: 'Live Editor',   source: 'live_editor.md' },
        { title: 'Github Action', source: 'todo.md' },
        { title: 'CLI',           source: 'todo.md' },
      ] },
      { title: 'VIRTUAL', childrenDir: './', children: [
        { title: 'Community', source: 'community.md' }
      ] },
      { title: 'VIRTUAL', childrenDir: './', children: [
        { title: 'Changelog', source: 'CHANGELOG.long.md' }
      ] },
      { title: 'VIRTUAL', source: 'ExampleMachines_TrafficLight.md' }
      // { title: '@knodes/typedoc-plugin-code-blocks', source: 'readme-extras.md', children: [
      //   { title: 'Using options', source: 'options.md' },
      // ] },
    ]
  },
  // pluginCodeBlocks: { source: '__tests__/mock-fs' },
  excludePrivate: true
};