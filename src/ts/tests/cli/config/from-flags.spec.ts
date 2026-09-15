import { flagsToConfig } from '../../../cli/config/sources/from-flags';

describe('cli/config/sources/from-flags', () => {

  it('returns an empty config when no flags map', () => {
    expect(flagsToConfig({}, {})).toEqual({});
  });

  it('maps a single flag to its config path', () => {
    const out = flagsToConfig(
      { target: 'png' },
      { target: 'render.defaultTarget' },
    );
    expect(out).toEqual({ render: { defaultTarget: 'png' } });
  });

  it('maps multiple flags into the same section', () => {
    const out = flagsToConfig(
      { target: 'png', scale: 4 },
      { target: 'render.defaultTarget', scale: 'render.scale' },
    );
    expect(out).toEqual({ render: { defaultTarget: 'png', scale: 4 } });
  });

  it('maps multiple flags into multiple sections', () => {
    const out = flagsToConfig(
      { target: 'png', 'log-level': 'debug' },
      { target: 'render.defaultTarget', 'log-level': 'lint.logLevel' as any },
    );
    expect((out as any).render?.defaultTarget).toBe('png');
    expect((out as any).lint?.logLevel).toBe('debug');
  });

  it('skips flags whose value is undefined', () => {
    const out = flagsToConfig(
      { target: undefined, scale: 4 },
      { target: 'render.defaultTarget', scale: 'render.scale' },
    );
    expect(out).toEqual({ render: { scale: 4 } });
  });

  it('skips flags whose mapping is null (per-invocation-only flags)', () => {
    const out = flagsToConfig(
      { output: 'foo.svg', target: 'png' },
      { output: null, target: 'render.defaultTarget' },
    );
    expect(out).toEqual({ render: { defaultTarget: 'png' } });
  });

  it('skips flags not present in the mapping', () => {
    const out = flagsToConfig(
      { target: 'png', mystery: true },
      { target: 'render.defaultTarget' },
    );
    expect(out).toEqual({ render: { defaultTarget: 'png' } });
  });

  it('handles a top-level (non-section) mapping', () => {
    const out = flagsToConfig(
      { include: ['**/*.fsl'] },
      { include: 'include' },
    );
    expect(out).toEqual({ include: ['**/*.fsl'] });
  });

});
