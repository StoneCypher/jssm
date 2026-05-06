module.exports = {
  title: 'Subscribe from React',
  category: 'Composition',
  tags: ['react', 'hook', 'rendering'],
  problem: "Render off the machine's state with a tiny hook. The component re-renders on every transition; you never call setState yourself.",
  blocks: [
    {
      kind: 'react',
      title: 'useMachine.tsx',
      code: `function useMachine(m) {
  const [, tick] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => m.hook_any_transition(tick), [m]);
  return m.state();
}

function Light() {
  const at = useMachine(light);
  return <div className={at}>{at}</div>;
}
`,
    },
  ],
};
