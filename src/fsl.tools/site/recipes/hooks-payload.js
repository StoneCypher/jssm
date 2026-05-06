module.exports = {
  title: 'Payload-aware actions',
  category: 'Hooks',
  tags: ['hook_action', 'data', 'session'],
  problem: "Most actions carry data — a form submission, a server response, a user id. Pass it through with the transition and read it in the hook.",
  blocks: [
    {
      kind: 'jssm',
      title: 'session.hooks.ts',
      code: `session.go('login', { user });

session.hook_action('login', ({ data }) => {
  currentUser = data.user;
  router.push('/dashboard');
});

// the payload travels with the action, not in module state
`,
    },
  ],
};
