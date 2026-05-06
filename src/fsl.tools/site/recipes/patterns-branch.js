module.exports = {
  title: 'Optional branch',
  category: 'Patterns',
  tags: ['fork', 'review', 'publish'],
  problem: "A pipeline with one optional fork — review-then-publish, or skip-and-publish. The branch lives in the graph, not in a flag you have to remember to set.",
  blocks: [
    {
      kind: 'fsl',
      title: 'post.fsl',
      code: `const post = sm\`
  draft      'submit'   → reviewing;
  draft      'publish'  → live;       // admin shortcut
  reviewing  'approve'  → live;
  reviewing  'reject'   → draft;
\`;
`,
    },
  ],
  graph: {
    width: 560, height: 200, accentNode: 'draft',
    nodes: [
      { id: 'draft',     x: 100, y: 100 },
      { id: 'reviewing', x: 290, y: 100 },
      { id: 'live',      x: 480, y: 100 },
    ],
    edges: [
      { from: 'draft',     to: 'reviewing', label: 'submit' },
      { from: 'reviewing', to: 'live',      label: 'approve' },
      { from: 'reviewing', to: 'draft',     label: 'reject', curve: 'arc-up', arcOffset: 50 },
      { from: 'draft',     to: 'live',      label: 'publish', curve: 'arc',  arcOffset: 60 },
    ],
  },
};
