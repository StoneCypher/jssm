import { test, expect, type Page } from '@playwright/test';

/**
 * Real-browser e2e for the dual-mode contract between `<fsl-editor>` and a
 * host `<fsl-instance>` (#659 / #1387):
 *
 *   - **Seed:** an editor slotted into an instance seeds its document from
 *     the host's `fsl`.
 *   - **Write-back:** every genuine user edit reflects into `host.fsl` via
 *     the `change` event.
 *   - **Keep-last-good:** while the user types through invalid intermediate
 *     source (every mid-keystroke state of a new transition), the host's
 *     machine stays on the last good build and nothing throws.
 *   - **Rebuild + reset-to-start:** once the source parses again, the host
 *     machine is rebuilt with the new structure at its start state.
 *
 * This exercises the path with real trusted keystrokes in Chromium — the
 * jsdom wc specs cover the same contract programmatically, but programmatic
 * dispatch is exactly what the tile-crash investigation (#891) proved can
 * behave differently from real input.
 * @see ./fixtures/dual_mode.html for the import-map serving contract.
 */

/** Read a property from the host instance element. */
async function host_fsl (page: Page): Promise<string> {
  return page.evaluate(() => (document.querySelector('#host') as unknown as { fsl: string }).fsl);
}

test('dual-mode: editor seeds from host, edits write back, machine rebuilds at start state', async ({ page }) => {

  const uncaught: Error[] = [];
  page.on('pageerror', e => { uncaught.push(e); });

  await page.goto('/src/ts/e2e/fixtures/dual_mode.html');
  await page.waitForFunction(() => (globalThis as unknown as { __fixture_ready?: boolean }).__fixture_ready);

  // Seed: the editor took its document from the host's fsl attribute.
  const editor_doc = page.locator('fsl-editor .cm-content');
  await expect(editor_doc).toContainText('a -> b;');

  // Baseline machine: two states, sitting at start.
  const before = await page.evaluate(() => {
    const host = document.querySelector('#host') as unknown as { machine: { states(): string[] }, state(): string };
    return { states: host.machine.states(), state: host.state() };
  });
  expect(before.states.sort((a, b) => a.localeCompare(b))).toEqual(['a', 'b']);
  expect(before.state).toBe('a');

  // Walk the machine off its start state, so the rebuild's reset-to-start is
  // observable rather than coincidental.
  await page.evaluate(() => (document.querySelector('#host') as unknown as { transition(s: string): boolean }).transition('b'));
  const walked = await page.evaluate(() => (document.querySelector('#host') as unknown as { state(): string }).state());
  expect(walked).toBe('b');

  // Real trusted keystrokes: click into the editor, jump to end, and type a
  // new transition. Every intermediate keystroke is INVALID source — the
  // keep-last-good contract says nothing throws and the machine holds.
  await editor_doc.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type(' b -> c;');

  // Write-back: the host's fsl property tracked the editor text.
  expect(await host_fsl(page)).toContain('b -> c;');

  // Rebuild: the machine now knows state c, and reset-to-start put it back
  // on a (structure changed; preserving position would be unsafe).
  const after = await page.evaluate(() => {
    const host = document.querySelector('#host') as unknown as { machine: { states(): string[] }, state(): string };
    return { states: host.machine.states(), state: host.state() };
  });
  expect(after.states.sort((a, b) => a.localeCompare(b))).toEqual(['a', 'b', 'c']);
  expect(after.state).toBe('a');

  // Keep-last-good: the invalid intermediate keystrokes never threw.
  expect(uncaught, `uncaught page errors: ${uncaught.map(e => e.message).join(' | ')}`).toEqual([]);

});
