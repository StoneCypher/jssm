module.exports = {
  title: 'Jest × Webpack × React',
  category: 'Testing',
  tags: ['jest', 'webpack', 'react', 'jsdom'],
  problem: "The classic CRA-shaped stack. Same machine tests, just run under Jest with `jsdom` and `babel-jest`.",
  blocks: [
    {
      kind: 'shell',
      title: 'install',
      code: `$ npm i -D jest @types/jest jest-environment-jsdom babel-jest \\
                 @testing-library/react @testing-library/jest-dom
$ npm i jssm
`,
    },
    {
      kind: 'json',
      title: 'jest.config.json',
      code: `{
  "testEnvironment": "jsdom",
  "setupFilesAfterEach": ["<rootDir>/test/setup.ts"],
  "transform": { "^.+\\\\.(t|j)sx?$": "babel-jest" }
}
`,
    },
    {
      kind: 'jest',
      title: 'panel.test.ts',
      code: `import { makePanel } from './panel.machine';

describe('panel', () => {
  test('opens on toggle', () => {
    const p = makePanel();
    p.go('toggle');
    expect(p.state()).toBe('open');
  });

  test('refuses unknown actions', () => {
    const p = makePanel();
    expect(p.go('shimmy')).toBe(false); // refused
  });
});
`,
    },
  ],
  note: "If you've inherited a Webpack project, this is the path of least resistance. Migrating later to Vitest is a config swap; the test bodies don't change.",
};
