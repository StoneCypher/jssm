import { test, expect } from '@playwright/test';

/**
 * Harness smoke test: proves the full e2e pipeline — `servehere` hosting,
 * Playwright driving a real Chromium against `BASE_URL`, and clean teardown —
 * works end to end. The harness serves the REPO ROOT (so component fixtures
 * can reach /dist and /node_modules — see `tile_crash.spec.ts`); this test
 * loads the marker fixture by its full path and asserts the known element.
 * It does NOT exercise jssm itself.
 */
test('the hosted page loads in a real browser', async ({ page }) => {
  await page.goto('/src/ts/e2e/fixtures/index.html');
  await expect(page.locator('#smoke')).toHaveText('jssm e2e harness works');
});
