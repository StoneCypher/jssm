module.exports = {
  title: 'Optimistic UI',
  category: 'Real world',
  tags: ['async', 'rollback', 'ux'],
  problem: "Show success immediately, roll back on failure. The machine carries the optimistic state explicitly, so the rollback path is just another arrow.",
  blocks: [
    {
      kind: 'fsl',
      title: 'like.fsl',
      code: `const like = sm\`
  off              'click'    → optimistic_on;
  optimistic_on    'confirm'  → on;
  optimistic_on    'rollback' → off;
  on               'click'    → optimistic_off;
  optimistic_off   'confirm'  → off;
  optimistic_off   'rollback' → on;
\`;
`,
    },
  ],
  note: "Treat `optimistic_*` states as *in flight* in your UI — show a heart icon, but slightly faded. The dual edges out of each one mean rollback can never land you somewhere illegal.",
};
