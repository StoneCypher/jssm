module.exports = {
  title: 'Acyclic flow',
  category: 'Patterns',
  tags: ['pipeline', 'terminal', 'orders'],
  problem: "A one-way pipeline with a terminal state. Once you've shipped, you've shipped — there's no going back.",
  blocks: [
    {
      kind: 'fsl',
      title: 'order.fsl',
      code: `const order = sm\`
  cart     'checkout'  → paying;
  paying   'authorize' → packed;
  packed   'ship'      → shipped;
  shipped  'deliver'   → delivered;
\`;

// no edge leaves \`delivered\` — terminal by construction.
`,
    },
  ],
  note: "Audit the receipts later by walking the hook log; you'll never see a delivered order rewind, because there's no syntax for it.",
};
