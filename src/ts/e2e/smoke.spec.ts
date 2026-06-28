import { test, expect } from '@playwright/test';

/**
 * Harness smoke test: proves the full e2e pipeline — `servehere` hosting,
 * Playwright driving a real Chromium against `BASE_URL`, and clean teardown —
 * works end to end. It loads the fixture page the harness serves (see
 * `src/buildjs/hosted_test.cjs` run with `SERVE_DIR=src/ts/e2e/fixtures`) and
 * asserts the known marker element. It does NOT exercise jssm itself; the real
 * component e2e (e.g. <fsl-editor>) is layered on once that ships.
 */
test('the hosted page loads in a real browser', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#smoke')).toHaveText('jssm e2e harness works');
});
