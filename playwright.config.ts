import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright e2e configuration for jssm.
 *
 * The local server is owned by the harness (`src/buildjs/hosted_test.cjs`),
 * which sets `BASE_URL`. We fall back to the harness's default port so
 * `npx playwright test src/ts/e2e` also works when a server is already up.
 *
 * @example
 *   // Normal path — harness starts servehere, runs this, tears it down:
 *   node src/buildjs/hosted_test.cjs
 *
 *   // Manual (server already running on :15512):
 *   BASE_URL=http://localhost:15512 npx playwright test src/ts/e2e
 */
export default defineConfig({
  testDir : './src/ts/e2e',
  use     : {
    baseURL : process.env.BASE_URL ?? 'http://localhost:15512',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
