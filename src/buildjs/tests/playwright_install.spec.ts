// Unit tests for src/buildjs/playwright_install.cjs — the on-demand Playwright
// Chromium provisioner for the e2e tier. Behavioral assertions with injected
// dependencies (no real network, no real child processes) per house rules
// (no golden / fake tests).

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pw = require('../playwright_install.cjs');

describe('shouldSkipBrowserInstall', () => {
  test('true only for the exact string "1"', () => {
    expect(pw.shouldSkipBrowserInstall({ PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' })).toBe(true);
  });
  test('false for "0"', () => {
    expect(pw.shouldSkipBrowserInstall({ PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '0' })).toBe(false);
  });
  test('false for an absent flag', () => {
    expect(pw.shouldSkipBrowserInstall({})).toBe(false);
  });
  test('false (not a throw) for a nullish env', () => {
    expect(pw.shouldSkipBrowserInstall(undefined)).toBe(false);
  });
  test('false for a truthy-but-wrong value like "true"', () => {
    expect(pw.shouldSkipBrowserInstall({ PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: 'true' })).toBe(false);
  });
});

describe('withSystemCaEnv', () => {
  test('adds --use-system-ca to NODE_OPTIONS when none was set', () => {
    const out = pw.withSystemCaEnv({ PATH: '/bin' });
    expect(out.NODE_OPTIONS).toBe('--use-system-ca');
    expect(out.PATH).toBe('/bin'); // preserves the rest of the env
  });
  test('appends --use-system-ca to an existing NODE_OPTIONS', () => {
    const out = pw.withSystemCaEnv({ NODE_OPTIONS: '--max-old-space-size=4096' });
    expect(out.NODE_OPTIONS).toBe('--max-old-space-size=4096 --use-system-ca');
  });
  test('does not duplicate the flag if already present', () => {
    const out = pw.withSystemCaEnv({ NODE_OPTIONS: '--use-system-ca' });
    expect(out.NODE_OPTIONS).toBe('--use-system-ca');
  });
  test('does not mutate the input env', () => {
    const input = { NODE_OPTIONS: '--x' };
    pw.withSystemCaEnv(input);
    expect(input.NODE_OPTIONS).toBe('--x');
  });
});

describe('chromiumInstallArgs', () => {
  // Args follow the playwright cli.js path (invoked via node), so no leading
  // "playwright" token — that's the bin name, not an argument.
  test('includes --with-deps on linux (OS deps installable there)', () => {
    expect(pw.chromiumInstallArgs('linux')).toEqual(['install', '--with-deps', 'chromium']);
  });
  test('omits --with-deps on win32 (not an apt/dpkg platform)', () => {
    expect(pw.chromiumInstallArgs('win32')).toEqual(['install', 'chromium']);
  });
  test('omits --with-deps on darwin', () => {
    expect(pw.chromiumInstallArgs('darwin')).toEqual(['install', 'chromium']);
  });
});

describe('installWithRetry', () => {
  test('returns 1 when the first attempt succeeds', () => {
    let calls = 0;
    const n = pw.installWithRetry(() => { calls++; }, 3, () => {});
    expect(n).toBe(1);
    expect(calls).toBe(1);
  });
  test('retries and returns the attempt that finally succeeds', () => {
    let n = 0;
    const succeeded = pw.installWithRetry(() => { if (++n < 3) throw new Error('stall'); }, 3, () => {});
    expect(succeeded).toBe(3);
  });
  test('rethrows the last error when every attempt fails', () => {
    expect(() => pw.installWithRetry(() => { throw new Error('boom'); }, 2, () => {})).toThrow('boom');
  });
  test('logs one diagnostic per failed attempt', () => {
    const logs: string[] = [];
    pw.installWithRetry(() => { if (logs.length < 2) throw new Error('x'); }, 5, (m: string) => logs.push(m));
    expect(logs.length).toBe(2);
  });
});

describe('main', () => {
  test('skips (returns false) and never installs when the skip flag is set', () => {
    let installed = false;
    const ran = pw.main({ PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' }, () => { installed = true; }, () => {});
    expect(ran).toBe(false);
    expect(installed).toBe(false);
  });
  test('installs (returns true) when the skip flag is absent', () => {
    let installed = false;
    const ran = pw.main({}, () => { installed = true; }, () => {});
    expect(ran).toBe(true);
    expect(installed).toBe(true);
  });
});
