import { test, expect, type Page } from '@playwright/test';

/**
 * Regression for jssm #891 — the CodeMirror tile-renderer corruption crash
 * (`@codemirror/view` 6.43.4; 6.43.3 and below are clean, empirically).
 *
 * The reproducing recipe — found by matrix reduction, and matching how the
 * user actually hit it while cloning blocks — is:
 *
 *   1. programmatic full-document REPLACE (rebuilds the tile tree; a
 *      measured reproduction-rate enhancer, ~4/5 per attempt with it,
 *      ~1/5 without),
 *   2. real mouse-DRAG selection across a `state` block,
 *   3. copy,
 *   4. real click on the blank separator line between blocks,
 *   5. paste.
 *
 * The drag leaves the persistent tile tree one line short of the document;
 * the paste edit then overruns it: `TilePointer.advance` destructures
 * `parents.pop()` as `undefined` and throws, and every subsequent dispatch
 * re-throws — the editor is dead until reload. Click-then-type alone does
 * NOT reproduce; the trusted drag-selection is load-bearing (programmatic
 * `dispatch({ selection })` never crashes, per #891's necessary
 * conditions). Playwright drives Chromium through CDP's real input
 * pipeline, so its mouse and keyboard are trusted input — the only test
 * layer in this repo that can exercise the bug.
 *
 * Because the crash is probabilistic per attempt (~4/5 per fresh page with
 * the replace enhancer, measured), the test runs ROUNDS attempts, each in a
 * FRESH browser context (context freshness is itself part of the measured
 * high-rate recipe; reusing one page across attempts drops the rate), of
 * CYCLES clone gestures each. On the buggy renderer this reproduces
 * >99.9% of runs; on a healthy CodeMirror it is just a handful of ordinary
 * paste edits and stays fast and green.
 *
 * The injected document is the report's verbatim FSL — three `state`
 * blocks, blank separator lines, emoji labels, trailing spaces intact (the
 * trailing spaces measurably raise the reproduction rate). It is built by
 * explicit concatenation so the trailing spaces are visible and cannot be
 * silently stripped by editor tooling.
 * @see https://github.com/StoneCypher/jssm/issues/891
 * @see ./fixtures/tile_crash.html for the import map that pins CodeMirror
 *      to the lockfile-installed copy under /node_modules.
 */

// The green path is ROUNDS full fresh-context attempts (~5s each), which can
// brush Playwright's default 30s test timeout on a slow machine.
test.setTimeout(120_000);

/** Fresh-context attempts per test; each starts from a pristine view. */
const ROUNDS = 5;

/** Drag-copy-click-paste clone gestures per round. */
const CYCLES = 3;

/** The #891 report document, VERBATIM — trailing spaces are load-bearing. */
const VERBATIM_FSL =
  'state Red_All : { \n' +
  '  label: "\u{1F534}\u{1F534} Red All Reset (RAE)";\n' +
  '  property: n_color "red"; \n' +
  '  property: e_color "red"; \n' +
  '  property: s_color "red"; \n' +
  '  property: w_color "red"; \n' +
  '};\n' +
  '\n' +
  'state Green_Arrow_North: {  \n' +
  '  label: "\u{1F7E2}\u{1F534} Green North With Arrow, Red East";\n' +
  '  property: n_color "green_arrow"; \n' +
  '  property: e_color "red"; \n' +
  '  property: s_color "green_arrow"; \n' +
  '  property: w_color "red";\n' +
  '};\n' +
  '\n' +
  'state Green_North: {  \n' +
  '  label: "\u{1F7E2}\u{1F534} Green North, Red East";\n' +
  '  property: n_color "green"; \n' +
  '  property: e_color "red"; \n' +
  '  property: s_color "green"; \n' +
  '  property: w_color "red";\n' +
  '};\n';

/** Read the editor's current document text. */
async function editor_fsl (page: Page): Promise<string> {
  return page.evaluate(() => (document.querySelector('#ed') as unknown as { fsl: string }).fsl);
}

/**
 * One user-faithful block-clone cycle: drag-select the first block after the
 * first blank separator line, copy it, click the blank line, paste, Return.
 * Recomputes all geometry from the live document so cycles compose as the
 * document grows.
 */
async function clone_block_via_blank_line (page: Page): Promise<void> {

  const text  = await editor_fsl(page);
  const doc   = text.split('\n');
  const blank = doc.findIndex(l => l.trim() === '');
  const start = blank + 1;
  const end   = doc.findIndex((l, i) => i > blank && l.trim() === '};');

  if (blank === -1 || end === -1) throw new Error('fixture document lost its blank-separated block shape');

  const lines    = page.locator('fsl-editor .cm-content .cm-line');
  const from_box = await lines.nth(start).boundingBox();
  const to_box   = await lines.nth(end).boundingBox();

  if (!from_box || !to_box) throw new Error('block lines not visible for drag selection');

  await page.mouse.move(from_box.x + 1, from_box.y + from_box.height / 2);
  await page.mouse.down();
  await page.mouse.move(to_box.x + to_box.width + 4, to_box.y + to_box.height / 2, { steps: 12 });
  await page.mouse.up();

  await page.keyboard.press('Control+c');
  await lines.nth(blank).click();
  await page.keyboard.press('Control+v');
  await page.keyboard.press('Enter');
}

test('cloning a block via drag-select, copy, blank-line click, paste does not corrupt the editor (#891)', async ({ browser, baseURL }) => {

  const uncaught: Error[] = [];

  for (let round = 0; round < ROUNDS; round++) {

    // Tall viewport: the document grows ~8 lines per clone cycle, and lines
    // CodeMirror has virtualized out of the DOM have no boundingBox to drag
    // across. 2400px keeps every line rendered for all cycles.
    const ctx  = await browser.newContext({
      permissions : ['clipboard-read', 'clipboard-write'],
      viewport    : { width: 1280, height: 2400 },
    });
    const page = await ctx.newPage();
    page.on('pageerror', e => { uncaught.push(e); });

    await page.goto(`${baseURL}/src/ts/e2e/fixtures/tile_crash.html`);
    await page.waitForFunction(() => (globalThis as unknown as { __fixture_ready?: boolean }).__fixture_ready);

    // Full-document replace with the verbatim report text: a real dispatch
    // (the fixture seeds a *different* normalized rendering, so the
    // component's echo guard does not swallow it) that rebuilds the tile
    // tree right before the gesture — the measured rate enhancer.
    await page.evaluate(s => { (document.querySelector('#ed') as unknown as { fsl: string }).fsl = s; }, VERBATIM_FSL);
    await page.waitForTimeout(150);

    cycles: for (let cycle = 0; cycle < CYCLES; cycle++) {
      if (uncaught.length > 0) break cycles;  // view already dead; assert the crisp error below
      await clone_block_via_blank_line(page);
      await page.waitForTimeout(150);
    }

    if (uncaught.length > 0 || round === ROUNDS - 1) {

      // The view must never have thrown (the buggy renderer throws
      // TypeError in TilePointer.advance during the paste dispatch and is
      // dead thereafter).
      expect(uncaught, `uncaught page errors: ${uncaught.map(e => e.message).join(' | ')}`).toEqual([]);

      // Every original block must survive (the observed corruption deletes
      // unrelated blocks), and the pastes must have landed (cloned block
      // occurs more than once).
      const fsl = await editor_fsl(page);

      expect(fsl).toContain('state Red_All');
      expect(fsl).toContain('state Green_Arrow_North');
      expect(fsl).toContain('state Green_North');
      expect(fsl).toContain('Green North With Arrow, Red East');
      expect((fsl.match(/state Green_Arrow_North/g) ?? []).length).toBeGreaterThan(1);

      // The editor must still accept further edits — a poisoned view
      // re-throws on every dispatch, so typing both exercises and re-checks
      // liveness.
      await page.keyboard.press('Control+End');
      await page.keyboard.type('// still alive');

      const after = await editor_fsl(page);

      expect(after).toContain('still alive');
      expect(uncaught, `uncaught page errors after liveness edit: ${uncaught.map(e => e.message).join(' | ')}`).toEqual([]);
    }

    await ctx.close();
  }

});
