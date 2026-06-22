module.exports = {
  title: 'Vitest × Vite × Vue',
  category: 'Testing',
  tags: ['vitest', 'vite', 'vue'],
  problem: "Vue 3 + `@vue/test-utils` against a jssm machine. The store-shaped pattern: a single machine drives `<script setup>` reactivity through a tiny ref wrapper.",
  blocks: [
    {
      kind: 'ts',
      title: 'usePanel.ts',
      code: `import { ref } from 'vue';
import { sm } from 'jssm';

export function usePanel() {
  const machine = sm\`
    closed 'toggle' → open;
    open   'toggle' → closed;
  \`;
  const state = ref(machine.state());
  return {
    state,
    toggle() { if (machine.go('toggle')) state.value = machine.state(); },
  };
}
`,
    },
    {
      kind: 'vitest',
      title: 'Panel.spec.ts',
      code: `import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Panel from './Panel.vue';

describe('Panel.vue', () => {
  it('toggles on click', async () => {
    const w = mount(Panel);
    expect(w.attributes('data-state')).toBe('closed');
    await w.find('button').trigger('click');
    expect(w.attributes('data-state')).toBe('open');
  });
});
`,
    },
  ],
  note: "Same machine code as the React variant — the only Vue-specific piece is the `ref` that mirrors `machine.state()` after each successful transition.",
};
