module.exports = {
  title: 'Transition logging',
  category: 'Hooks',
  tags: ['hook_any_transition', 'observability', 'replay'],
  problem: "Tap every transition with a single line. Useful in dev, essential in production for replaying user sessions.",
  blocks: [
    {
      kind: 'jssm',
      title: 'log.ts',
      code: `machine.hook_any_transition(({ from, to, action }) => {
  log.push({ t: Date.now(), from, to, action });
});

// later: replay by walking log and calling .go(name) in order
`,
    },
  ],
  note: "Because the graph rejects illegal moves, replaying a captured log either succeeds end-to-end or fails at the exact point your code drifted. Bisecting state-machine bugs becomes a mechanical exercise.",
};
