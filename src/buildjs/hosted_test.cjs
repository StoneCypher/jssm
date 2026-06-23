/**
 * Start a local `servehere` instance, run the Playwright e2e suite against it,
 * then tear the server down cleanly on every platform.
 *
 * Adapted from the react_ts_with_claude_gh_template harness. The server serves
 * `SERVE_DIR` (default `docs`, the built site) on port 15512 with CORS and the
 * haltroute (`/z-terminate`) enabled so it can be stopped from any platform.
 *
 * The servehere bin is resolved and spawned via `process.execPath` directly,
 * with **no `shell: true`** — that avoids the Windows libuv async-handle
 * cleanup problem (the same class of issue as jssm's #0688c1b7 "graceful exit"
 * fix). Teardown hits the haltroute, then force-kills after 2s if needed.
 *
 * @example
 *   // Run the full e2e suite against the built site:
 *   node src/buildjs/hosted_test.cjs
 *
 *   // Smoke run against the e2e fixtures (no full build needed):
 *   SERVE_DIR=src/ts/e2e/fixtures node src/buildjs/hosted_test.cjs
 *
 * @example
 *   // Successful run:
 *   //   Waiting for servehere on http://localhost:15512...
 *   //   Server is ready.
 *   //   (playwright output)
 *   //   Server shut down.
 *   // exit 0
 */

'use strict';

const { spawn, spawnSync } = require('child_process');
const { dirname, join }    = require('path');

const PORT      = 15512;
const BASE_URL  = `http://localhost:${PORT}`;
// Serve dir: `--serve-dir=<path>` (cross-platform, preferred in npm scripts)
// > `SERVE_DIR` env > the built site `docs`.
const argServeDir = (process.argv.find(a => a.startsWith('--serve-dir=')) || '').split('=')[1];
const SERVE_DIR   = argServeDir || process.env.SERVE_DIR || 'docs';
const projectRoot = join(__dirname, '..', '..');

/**
 * Poll a URL until it responds or the attempt limit is reached.
 *
 * @param {string} url - URL to poll.
 * @param {number} [maxAttempts] - Maximum attempts before giving up.
 * @param {number} [intervalMs] - Delay between attempts, in milliseconds.
 * @returns {Promise<void>} Resolves once the server responds.
 * @throws {Error} If the server never responds within the attempt budget.
 */
async function waitForServer(url, maxAttempts = 50, intervalMs = 200) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  throw new Error(`Server at ${url} did not respond after ${maxAttempts} attempts`);
}

/**
 * Send the haltroute request to shut the servehere instance down.
 *
 * @param {string} baseUrl - Base URL of the running server.
 * @returns {Promise<void>}
 */
async function haltServer(baseUrl) {
  try {
    await fetch(`${baseUrl}/z-terminate`);
  } catch {
    // The server may close the connection before responding — expected.
  }
}

async function main() {

  const servehereDir = dirname(require.resolve('servehere/package.json'));
  const servehereBin = join(servehereDir, 'src', 'js', 'index.js');

  const server = spawn(
    process.execPath,
    [servehereBin, '-p', String(PORT), '-c', '-d', SERVE_DIR, '-z', '-s'],
    { cwd: projectRoot, stdio: 'ignore' }
  );

  let testFailed = false;

  try {
    console.log(`Waiting for servehere on ${BASE_URL} (serving ${SERVE_DIR})...`);
    await waitForServer(BASE_URL);
    console.log('Server is ready.');

    // Resolve the Playwright test CLI and run it via node directly — no shell,
    // mirroring the servehere spawn above. Avoids Windows shell/libuv issues
    // and builds no shell command string (no injection surface).
    const pwCli = join(dirname(require.resolve('@playwright/test/package.json')), 'cli.js');
    const res = spawnSync(process.execPath, [pwCli, 'test', 'src/ts/e2e'], {
      cwd   : projectRoot,
      stdio : 'inherit',
      env   : { ...process.env, BASE_URL },
    });
    if (res.error) { throw res.error; }
    if (res.status !== 0) {
      testFailed = true;
      console.error(`Playwright exited with code ${res.status}`);
    }
  } catch (error) {
    testFailed = true;
    console.error(`Error: ${error && error.message}`);
  } finally {
    await haltServer(BASE_URL);

    const closed = await new Promise(resolve => {
      const timeout = setTimeout(() => resolve(false), 2000);
      server.on('close', () => { clearTimeout(timeout); resolve(true); });
    });

    if (!closed) {
      try { server.kill(); } catch { /* already gone */ }
      await new Promise(resolve => server.on('close', resolve));
    }

    console.log('Server shut down.');
  }

  process.exitCode = testFailed ? 1 : 0;
}

main();
