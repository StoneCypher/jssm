module.exports = {
  title: 'Cycle',
  category: 'Patterns',
  tags: ['loop', 'shared-action', 'beginner'],
  problem: "A linear loop with one shared verb. Every state is reachable from every other state, in order, by repeatedly firing the same action.",
  blocks: [
    {
      kind: 'fsl',
      title: 'light.fsl',
      code: `const light = sm\`
  red    'next' → green;
  green  'next' → yellow;
  yellow 'next' → red;
\`;
`,
    },
  ],
  graph: {
    width: 560, height: 180, accentNode: 'red',
    nodes: [
      { id: 'red',    x: 100, y: 70 },
      { id: 'green',  x: 280, y: 70 },
      { id: 'yellow', x: 460, y: 70 },
    ],
    edges: [
      { from: 'red',    to: 'green',  label: 'next' },
      { from: 'green',  to: 'yellow', label: 'next' },
      { from: 'yellow', to: 'red',    label: 'next', curve: 'arc', arcOffset: 70 },
    ],
  },
  note: "Cycles fall apart when you reach for an enum and a counter. Modeled this way, the machine guarantees you can't skip a state — and adding a fourth phase is a one-line edit.",
};
