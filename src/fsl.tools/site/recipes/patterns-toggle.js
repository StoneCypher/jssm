module.exports = {
  title: 'Toggle',
  category: 'Patterns',
  tags: ['boolean', 'two-state', 'beginner'],
  problem: "Two states, one verb. The smallest useful machine — and the one you reach for whenever a boolean has started growing edge cases.",
  blocks: [
    {
      kind: 'fsl',
      title: 'panel.fsl',
      code: `import { sm } from 'jssm';

const panel = sm\`
  closed 'toggle' → open;
  open   'toggle' → closed;
\`;

panel.go('toggle');
panel.state(); // → 'open'
`,
    },
  ],
  graph: {
    width: 520, height: 140, accentNode: 'closed',
    nodes: [
      { id: 'closed', x: 150, y: 70 },
      { id: 'open',   x: 370, y: 70 },
    ],
    edges: [
      { from: 'closed', to: 'open',   label: 'toggle', curve: 'arc-up', arcOffset: 28 },
      { from: 'open',   to: 'closed', label: 'toggle', curve: 'arc',    arcOffset: 28 },
    ],
  },
  note: "Reach for this whenever you find yourself adding a third boolean to a component. `open / opening / closed` is a different machine — and once you write it as one, the bugs go away.",
};
