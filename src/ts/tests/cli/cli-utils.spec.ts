import { parseFslArgs } from '../../cli/cli-utils';

describe('parseFslArgs', () => {

  const spec = {
    flags: {
      target:   { short: 't', enum: ['svg','dot','png','jpeg','html'], default: 'svg' },
      output:   { short: 'o' },
      'out-dir': {},
      stdout:   { boolean: true },
      width:    { type: 'number' },
      quality:  { type: 'number', default: 85 },
      help:     { short: 'h', boolean: true },
      version:  { short: 'V', boolean: true },
    },
    usage: 'fsl-render [options] <fsl-paths...>',
  } as const;

  it('parses positional args', () => {
    const out = parseFslArgs(['m1.fsl', 'm2.fsl'], spec);
    expect(out.positional).toEqual(['m1.fsl', 'm2.fsl']);
  });

  it('parses long flag with =', () => {
    const out = parseFslArgs(['m.fsl', '--target=png'], spec);
    expect(out.flags.target).toBe('png');
    expect(out.positional).toEqual(['m.fsl']);
  });

  it('parses long flag with space-separated value', () => {
    const out = parseFslArgs(['--target', 'dot', 'm.fsl'], spec);
    expect(out.flags.target).toBe('dot');
    expect(out.positional).toEqual(['m.fsl']);
  });

  it('parses short flag with attached value', () => {
    const out = parseFslArgs(['-tpng', 'm.fsl'], spec);
    expect(out.flags.target).toBe('png');
  });

  it('parses short flag with space value', () => {
    const out = parseFslArgs(['-t', 'jpeg', 'm.fsl'], spec);
    expect(out.flags.target).toBe('jpeg');
  });

  it('parses short flag with -o', () => {
    const out = parseFslArgs(['-o', 'out.svg', 'm.fsl'], spec);
    expect(out.flags.output).toBe('out.svg');
  });

  it('parses boolean flags', () => {
    const out = parseFslArgs(['--stdout', 'm.fsl'], spec);
    expect(out.flags.stdout).toBe(true);
  });

  it('parses numeric flags', () => {
    const out = parseFslArgs(['--width', '800', 'm.fsl'], spec);
    expect(out.flags.width).toBe(800);
    expect(typeof out.flags.width).toBe('number');
  });

  it('applies defaults to missing flags', () => {
    const out = parseFslArgs(['m.fsl'], spec);
    expect(out.flags.target).toBe('svg');
    expect(out.flags.quality).toBe(85);
  });

  it('rejects unknown long flags', () => {
    expect(() => parseFslArgs(['--unknown', 'm.fsl'], spec)).toThrow(/unknown.*flag.*unknown/i);
  });

  it('rejects values not in enum', () => {
    expect(() => parseFslArgs(['--target=tiff', 'm.fsl'], spec)).toThrow(/target.*tiff/i);
  });

  it('rejects non-numeric values for numeric flags', () => {
    expect(() => parseFslArgs(['--width=big', 'm.fsl'], spec)).toThrow(/width.*number/i);
  });

  it('treats `--` as positional terminator', () => {
    const out = parseFslArgs(['--', '--looks-like-a-flag.fsl'], spec);
    expect(out.positional).toEqual(['--looks-like-a-flag.fsl']);
  });

  it('treats single `-` as a positional (stdin sentinel)', () => {
    const out = parseFslArgs(['-'], spec);
    expect(out.positional).toEqual(['-']);
  });

  it('produces help text including the usage line', () => {
    const out = parseFslArgs(['--help'], spec);
    expect(out.flags.help).toBe(true);
    const helpText = out.helpText();
    expect(helpText).toContain('fsl-render [options] <fsl-paths...>');
    expect(helpText).toContain('--target');
    expect(helpText).toContain('--output');
    expect(helpText).toContain('--help');
  });

  it('parses short boolean flag (-h)', () => {
    const out = parseFslArgs(['-h'], spec);
    expect(out.flags.help).toBe(true);
  });

  it('rejects combined short boolean flags', () => {
    expect(() => parseFslArgs(['-hh'], spec)).toThrow(/combined short flags not supported/i);
  });

  it('rejects unknown short flags', () => {
    expect(() => parseFslArgs(['-z'], spec)).toThrow(/unknown.*flag.*-z/i);
  });

  it('throws when long flag value is missing at end of argv', () => {
    expect(() => parseFslArgs(['--target'], spec)).toThrow(/flag --target requires a value/i);
  });

  it('throws when short flag value is missing at end of argv', () => {
    expect(() => parseFslArgs(['-t'], spec)).toThrow(/flag -t requires a value/i);
  });

  it('does not swallow a following long flag as a missing value (long form)', () => {
    // `--output --stdout` must not set output to '--stdout' and drop --stdout.
    expect(() => parseFslArgs(['--output', '--stdout', 'm.fsl'], spec)).toThrow(/flag --output requires a value/i);
  });

  it('does not swallow a following long flag as a missing value (short form)', () => {
    expect(() => parseFslArgs(['-o', '--stdout', 'm.fsl'], spec)).toThrow(/flag -o requires a value/i);
  });

  it('still accepts a negative number as a value', () => {
    const out = parseFslArgs(['--width', '-3', 'm.fsl'], spec);
    expect(out.flags.width).toBe(-3);
    expect(out.positional).toEqual(['m.fsl']);
  });

});
