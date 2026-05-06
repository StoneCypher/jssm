module.exports = {
  title: 'Fetch with retry',
  category: 'Real world',
  tags: ['async', 'retry', 'network'],
  problem: "A request that can succeed, fail, or be retried — without a tangle of nested if-statements. The graph names every legal transition; the calling code stays flat.",
  blocks: [
    {
      kind: 'fsl',
      title: 'request.fsl',
      code: `const req = sm\`
  idle     'fetch'   → loading;
  loading  'resolve' → success;
  loading  'reject'  → error;
  error    'retry'   → loading;
  success  'reset'   → idle;
\`;
`,
    },
    {
      kind: 'jssm',
      title: 'run.ts',
      code: `async function run() {
  req.go('fetch');
  try { const data = await api.get(); req.go('resolve', { data }); }
  catch { req.go('reject'); }
}
`,
    },
  ],
  graph: {
    width: 620, height: 260, accentNode: 'loading',
    nodes: [
      { id: 'idle',    x: 90,  y: 130 },
      { id: 'loading', x: 300, y: 130 },
      { id: 'success', x: 510, y: 60  },
      { id: 'error',   x: 510, y: 200 },
    ],
    edges: [
      { from: 'idle',    to: 'loading', label: 'fetch' },
      { from: 'loading', to: 'success', label: 'resolve' },
      { from: 'loading', to: 'error',   label: 'reject' },
      { from: 'error',   to: 'loading', label: 'retry', curve: 'arc',    arcOffset: 55 },
      { from: 'success', to: 'idle',    label: 'reset', curve: 'arc-up', arcOffset: 55 },
    ],
  },
};
