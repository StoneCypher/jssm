import * as lib from '../../cli/lib';

describe('cli/lib barrel', () => {

  it('re-exports render and renderSet as callable functions', () => {
    expect(typeof lib.render).toBe('function');
    expect(typeof lib.renderSet).toBe('function');
  });

  it('re-exports parseFslArgs as a callable function', () => {
    expect(typeof lib.parseFslArgs).toBe('function');
  });

  it('re-exports RenderError and RasterizationUnsupportedError as constructors', () => {
    expect(typeof lib.RenderError).toBe('function');
    expect(typeof lib.RasterizationUnsupportedError).toBe('function');
    const re = new lib.RenderError('msg');
    expect(re).toBeInstanceOf(Error);
    expect(re.message).toBe('msg');
  });

});

describe('cli/lib — config re-exports', () => {

  it('exports the loadConfig orchestrator', async () => {
    const { loadConfig } = await import('../../cli/lib');
    expect(typeof loadConfig).toBe('function');
  });

  it('exports mergeConfigs (pure)', async () => {
    const { mergeConfigs } = await import('../../cli/lib');
    expect(typeof mergeConfigs).toBe('function');
    expect(mergeConfigs([])).toEqual({});
  });

  it('exports resolveExtends (pure)', async () => {
    const { resolveExtends } = await import('../../cli/lib');
    expect(typeof resolveExtends).toBe('function');
  });

  it('exports defaults (pure constant)', async () => {
    const { defaults } = await import('../../cli/lib');
    expect(defaults.render.defaultTarget).toBe('svg');
  });

  it('exports validateConfig (pure)', async () => {
    const { validateConfig } = await import('../../cli/lib');
    expect(typeof validateConfig).toBe('function');
  });

  it('exports loadConfigFile, discoverUserGlobalConfig, discoverProjectConfig', async () => {
    const lib = await import('../../cli/lib');
    expect(typeof lib.loadConfigFile).toBe('function');
    expect(typeof lib.discoverUserGlobalConfig).toBe('function');
    expect(typeof lib.discoverProjectConfig).toBe('function');
  });

  it('exports extractMachineAttributes and flagsToConfig', async () => {
    const lib = await import('../../cli/lib');
    expect(typeof lib.extractMachineAttributes).toBe('function');
    expect(typeof lib.flagsToConfig).toBe('function');
  });

  it('exports all five ConfigError classes', async () => {
    const lib = await import('../../cli/lib');
    expect(typeof lib.ConfigError).toBe('function');
    expect(typeof lib.ConfigParseError).toBe('function');
    expect(typeof lib.ConfigSchemaError).toBe('function');
    expect(typeof lib.ConfigExtendsError).toBe('function');
    expect(typeof lib.ConfigIOError).toBe('function');
  });

});
