describe('verify_version_bump: check_version_bump', () => {

  let check_version_bump: (local: string, pub: string) => { ok: boolean, message: string };

  beforeAll(async () => {
    ({ check_version_bump } = await import('../../buildjs/verify_version_bump.cjs'));
  });

  it('passes a patch bump', () => {
    const r = check_version_bump('5.164.1', '5.164.0');
    expect(r.ok).toBe(true);
    expect(r.message).toContain('passing');
  });

  it('passes minor and major bumps', () => {
    expect(check_version_bump('5.165.0', '5.164.9').ok).toBe(true);
    expect(check_version_bump('6.0.0',   '5.164.9').ok).toBe(true);
  });

  it('fails an unchanged version', () => {
    const r = check_version_bump('5.164.0', '5.164.0');
    expect(r.ok).toBe(false);
    expect(r.message).toContain('unchanged');
  });

  it('fails a regression', () => {
    const r = check_version_bump('5.163.9', '5.164.0');
    expect(r.ok).toBe(false);
    expect(r.message).toContain('regression');
  });

  it('compares numerically, not lexically', () => {
    expect(check_version_bump('5.10.0', '5.9.0').ok).toBe(true);
    expect(check_version_bump('5.9.0', '5.10.0').ok).toBe(false);
  });

  it('fails invalid versions on either side, naming which', () => {
    expect(check_version_bump('banana', '5.164.0').message).toContain('Invalid private version banana');
    expect(check_version_bump('5.164.0', '').message).toContain('Invalid public version');
    expect(check_version_bump('banana', '5.164.0').ok).toBe(false);
  });

  it('treats a prerelease of the next version as newer than the current release', () => {
    expect(check_version_bump('6.0.0-alpha.1', '5.164.0').ok).toBe(true);
    expect(check_version_bump('5.164.0-alpha.1', '5.164.0').ok).toBe(false);
  });

});
