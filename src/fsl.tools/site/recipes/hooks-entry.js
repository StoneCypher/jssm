module.exports = {
  title: 'Side effects on entry',
  category: 'Hooks',
  tags: ['hook_entry', 'analytics', 'side-effects'],
  problem: "Fire a side effect every time the machine arrives at a state — log it, persist it, page someone — without scattering checks across your call sites.",
  blocks: [
    {
      kind: 'jssm',
      title: 'order.hooks.ts',
      code: `order.hook_entry('shipped', () => {
  analytics.track('order.shipped', { id });
  email.shipping(customer);
});

order.hook_entry('delivered', closeOut);
`,
    },
  ],
  note: "Hooks run after the transition lands, never before — so you never fire `order.shipped` on a request that gets rejected. The machine is the source of truth; the side effects follow.",
};
