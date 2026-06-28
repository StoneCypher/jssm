/**
 * On-demand Playwright Chromium provisioner for the e2e tier.
 *
 * jssm needs a browser ONLY for the Playwright e2e suite (`src/ts/e2e`) — never
 * for `npm install` (the `playwright`/`@playwright/test` packages ship no
 * auto-download postinstall) and never for end users (they get the published
 * package, where `@playwright/test` is a devDependency and is never installed).
 * The extreme time cost of a browser download — for contributors and, worse, on
 * metered CI minutes — should therefore be paid exactly once, on the one path
 * that actually needs it.
 *
 * This script makes that provisioning explicit and robust. It is invoked by the
 * `e2e:install` npm script ahead of `hosted_test.cjs`, so `npm run e2e`
 * self-provisions a browser while every other build/test/CI path stays
 * browser-free.
 *
 * Adapted from the react_ts_with_claude_gh_template postinstall, with
 * jssm-specific changes:
 *   - opt-in, not a `postinstall` — jssm's build never needs a browser, so
 *     nothing downloads one by default;
 *   - installs ONLY Chromium (the sole engine the e2e config drives),
 *     time-boxed and retried so a stalled CDN download is killed, not waited on;
 *   - `--with-deps` only on Linux (the apt/dpkg platform); plain install on
 *     Windows/macOS, where `--with-deps` is unsupported;
 *   - runs the install under `NODE_OPTIONS=--use-system-ca` (Node >=22) so it
 *     works behind a TLS-intercepting proxy/AV, and is harmless on CI;
 *   - skips entirely when `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`, for a cached CI
 *     e2e job that already has the browser.
 *
 * @example
 *   // Provision Chromium for the e2e suite (normal use, via `npm run e2e`):
 *   node src/buildjs/playwright_install.cjs
 *
 * @example
 *   // Skip when a CI cache already restored the browser:
 *   PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 node src/buildjs/playwright_install.cjs
 *   // logs the skip and exits 0 without contacting the network
 *
 * @see ./hosted_test.cjs
 * @see ../../playwright.config.ts
 */

'use strict';

const { execFileSync } = require('child_process');
const { dirname, join } = require('path');

/** Per-attempt time box for one browser install (4 minutes, in ms). */
const DEFAULT_TIMEOUT_MS = 4 * 60 * 1000;

/** Number of install attempts before giving up. */
const DEFAULT_ATTEMPTS = 3;

/**
 * Whether the Chromium provisioning should be skipped.
 *
 * Opt-in via the exact string `"1"` so an accidental empty, `"0"`, or `"true"`
 * value never silently disables provisioning.
 *
 * @param {object} [env] - environment to read `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` from
 * @returns {boolean} whether the caller asked to skip the download
 *
 * @example
 *   shouldSkipBrowserInstall({ PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' }) // => true
 *   shouldSkipBrowserInstall({})                                        // => false
 */
function shouldSkipBrowserInstall(env) {
  return (env ?? {}).PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD === '1';
}

/**
 * Return a copy of `env` with `--use-system-ca` ensured in `NODE_OPTIONS`.
 *
 * Lets the install succeed behind a TLS-intercepting proxy/AV (Node >=22 reads
 * the OS trust store with this flag). Appends rather than clobbers any existing
 * `NODE_OPTIONS`, and is idempotent so repeated runs never duplicate the flag.
 * Does not mutate the input.
 *
 * @param {object} [env] - source environment
 * @returns {object} a new environment object with the flag ensured
 *
 * @example
 *   withSystemCaEnv({}).NODE_OPTIONS                                  // => '--use-system-ca'
 *   withSystemCaEnv({ NODE_OPTIONS: '--x' }).NODE_OPTIONS             // => '--x --use-system-ca'
 */
function withSystemCaEnv(env) {
  const base = env ?? {};
  const existing = base.NODE_OPTIONS ?? '';
  const flag = '--use-system-ca';
  const next = existing.split(' ').includes(flag)
    ? existing
    : `${existing} ${flag}`.trim();
  return { ...base, NODE_OPTIONS: next };
}

/**
 * Build the Chromium-only install argument vector for `platform`.
 *
 * These are the arguments passed to Playwright's `cli.js` (run via node), so
 * there is no leading `playwright` token. `--with-deps` installs OS-level
 * browser dependencies, which Playwright only supports on Debian/Ubuntu — so it
 * is included on `linux` and omitted on `win32`/`darwin`, where it errors.
 *
 * @param {string} platform - a `process.platform` value
 * @returns {string[]} the argument vector after the cli.js path
 *
 * @example
 *   chromiumInstallArgs('linux') // => ['install','--with-deps','chromium']
 *   chromiumInstallArgs('win32') // => ['install','chromium']
 */
function chromiumInstallArgs(platform) {
  return platform === 'linux'
    ? ['install', '--with-deps', 'chromium']
    : ['install', 'chromium'];
}

/**
 * Resolve the path to Playwright's `cli.js`, the bin that owns `install`.
 *
 * Resolved from the installed `playwright` package (rather than shelling out to
 * `npx`) so the install runs through `process.execPath` with no shell — the
 * same Windows-safe, injection-free pattern as `hosted_test.cjs`.
 *
 * @returns {string} absolute path to the playwright cli.js
 */
function resolvePlaywrightCli() {
  return join(dirname(require.resolve('playwright/package.json')), 'cli.js');
}

/**
 * Run an install attempt repeatedly until one succeeds.
 *
 * Each attempt is delegated to `runAttempt`; if it throws — including the
 * timeout kill that turns a hang into an error — the next attempt runs, up to
 * `attempts` total. The final attempt's error is rethrown so the caller can
 * fail the install.
 *
 * @param {(attempt: number) => void} runAttempt - performs one attempt; throws on failure
 * @param {number} [attempts] - maximum attempts; must be >= 1
 * @param {(message: string) => void} [log] - sink for retry diagnostics
 * @returns {number} the 1-based number of the attempt that succeeded
 * @throws {Error} the last error when every attempt fails
 *
 * @example
 *   let n = 0;
 *   installWithRetry(() => { if (++n < 2) throw new Error('stall'); }, 3, () => {}); // => 2
 */
function installWithRetry(runAttempt, attempts = DEFAULT_ATTEMPTS, log = console.error) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      runAttempt(attempt);
      return attempt;
    } catch (err) {
      lastError = err;
      log(`Playwright Chromium install attempt ${attempt}/${attempts} failed: ${err.message}`);
    }
  }
  throw lastError;
}

/**
 * Perform one real, time-boxed Chromium install via `npx playwright install`.
 *
 * @param {number} [timeoutMs] - kill the attempt if it exceeds this many ms
 * @param {object} [env] - environment for the child (defaults to the system-CA env)
 * @throws {Error} if the command exits non-zero or exceeds the timeout
 */
function runChromiumInstall(timeoutMs = DEFAULT_TIMEOUT_MS, env = withSystemCaEnv(process.env)) {
  execFileSync(process.execPath, [resolvePlaywrightCli(), ...chromiumInstallArgs(process.platform)], {
    stdio: 'inherit',
    timeout: timeoutMs,
    killSignal: 'SIGKILL',
    env,
  });
}

/**
 * Entry point: skip when requested, otherwise install Chromium with retries.
 *
 * Dependency-injected so tests exercise the skip/install branches without
 * touching the network.
 *
 * @param {object} [env] - environment to read the skip flag from
 * @param {() => void} [install] - performs the (retried) install
 * @param {(message: string) => void} [log] - sink for the skip notice
 * @returns {boolean} whether an install was attempted (false when skipped)
 *
 * @example
 *   main({ PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' }, () => {}) // => false (skipped)
 */
function main(
  env = process.env,
  install = () => installWithRetry(() => runChromiumInstall()),
  log = console.log,
) {
  if (shouldSkipBrowserInstall(env)) {
    log('playwright_install: PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 — skipping Chromium install.');
    return false;
  }
  install();
  return true;
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  DEFAULT_ATTEMPTS,
  shouldSkipBrowserInstall,
  withSystemCaEnv,
  chromiumInstallArgs,
  installWithRetry,
  runChromiumInstall,
  main,
};

// Run only when invoked directly, never when required by tests.
if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(`playwright_install: Chromium install failed after retries: ${err.message}`);
    process.exit(1);
  }
}
