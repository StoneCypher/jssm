module.exports = {
  title: 'Data fetch',
  category: 'Patterns',
  tags: ['async', 'loading', 'error', 'react'],
  problem: "The four-state shape every data hook actually has: idle / loading / ready / failed. Once you write it down as a machine, the impossible loading-and-error states stop happening.",
  blocks: [
    {
      kind: 'fsl',
      title: 'fetch.fsl',
      code: `const req = sm\`
  idle    'fetch'   → loading;
  loading 'resolve' → ready;
  loading 'reject'  → failed;
  ready   'fetch'   → loading;   // refresh
  failed  'fetch'   → loading;   // retry
\`;
`,
    },
    {
      kind: 'react',
      title: 'useReq.tsx',
      code: `function useReq(url) {
  const [machine] = React.useState(() => req);
  const [, force] = React.useReducer(x => x + 1, 0);

  React.useEffect(() => {
    if (machine.state() !== 'idle') return;
    machine.go('fetch'); force();
    fetch(url)
      .then(r => r.json())
      .then(  () => { machine.go('resolve'); force(); },
              () => { machine.go('reject');  force(); });
  }, [url]);

  return machine.state();
}
`,
    },
  ],
  note: "The classic bug: `loading=true` and `error='...'` at the same time. Modeled as a machine, it cannot happen — `loading` and `failed` are different states.",
};
