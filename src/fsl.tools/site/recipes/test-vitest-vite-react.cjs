module.exports = {
  title: 'Vitest × Vite × React',
  category: 'Testing',
  tags: ['vitest', 'vite', 'react', 'jsdom'],
  problem: "Wire jssm machines into a Vitest suite that runs against a Vite-powered React app. State transitions assert as plain function calls; React renders as a snapshot of `state()`.",
  blocks: [
    {
      kind: 'shell',
      title: 'install',
      code: `$ npm i -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
$ npm i jssm
`,
    },
    {
      kind: 'ts',
      title: 'vitest.config.ts',
      code: `import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
  },
});
`,
    },
    {
      kind: 'ts',
      title: 'panel.machine.ts',
      code: `import { sm } from 'jssm';

export const makePanel = () => sm\`
  closed 'toggle' → open;
  open   'toggle' → closed;
\`;
`,
    },
    {
      kind: 'vitest',
      title: 'panel.test.ts',
      code: `import { describe, it, expect } from 'vitest';
import { makePanel } from './panel.machine';

describe('panel', () => {
  it('starts closed', () => {
    expect(makePanel().state()).toBe('closed');
  });

  it('opens on toggle', () => {
    const p = makePanel();
    p.go('toggle');
    expect(p.state()).toBe('open');
  });

  it('refuses unknown actions', () => {
    const p = makePanel();
    expect(p.go('shimmy')).toBe(false); // → no transition
    expect(p.state()).toBe('closed');
  });
});
`,
    },
    {
      kind: 'tsx',
      title: 'Panel.test.tsx',
      code: `import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Panel } from './Panel';

describe('<Panel/>', () => {
  it('toggles on click', () => {
    render(<Panel/>);
    expect(screen.getByRole('region')).toHaveAttribute('data-state', 'closed');
    fireEvent.click(screen.getByRole('button', { name: /toggle/i }));
    expect(screen.getByRole('region')).toHaveAttribute('data-state', 'open');
  });
});
`,
    },
  ],
  note: "Vitest's `globals: true` lets you skip the imports if you prefer; the explicit form is easier on graders and grep. The key idea: machines are pure data + a verb table, so unit tests don't need React at all — render tests then become very small.",
};
