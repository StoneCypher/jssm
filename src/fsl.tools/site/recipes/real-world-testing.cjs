module.exports = {
  title: 'Testing transitions',
  category: 'Real world',
  tags: ['testing', 'vitest', 'coverage'],
  problem: "Walk every legal path with a tiny generator. Assert that illegal actions are refused. Your test suite gets graph coverage for free.",
  blocks: [
    {
      kind: 'vitest',
      title: 'traffic.test.ts',
      code: `test('cycle ends where it began', () => {
  const m = traffic();
  ['next', 'next', 'next'].forEach(a => m.go(a));
  expect(m.state()).toBe('red');
});

test('cannot stop on red', () => {
  const m = traffic();
  expect(m.valid_action('stop')).toBe(false);
});
`,
    },
  ],
  note: "The graph itself is the contract. Tests stop being about implementation details and start being about *which paths through the graph matter to your users.*",
};
