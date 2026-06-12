import type {
  PartialConfig,
  ResolvedConfig,
  RenderConfig,
  LintConfig,
  FmtConfig,
  TestConfig,
  CheckConfig,
  TypegenConfig,
  Reader,
} from '../../../cli/config/types';
import {
  ConfigError,
  ConfigParseError,
  ConfigSchemaError,
  ConfigExtendsError,
  ConfigIOError,
} from '../../../cli/config/types';

describe('cli/config/types', () => {

  it('ResolvedConfig type-checks with every planned subcommand section populated', () => {
    const r: ResolvedConfig = {
      include: ['**/*.fsl'],
      exclude: [],
      render:  { defaultTarget: 'svg', scale: 3, quality: 85 },
      lint:     {},
      format:   {},
      test:     {},
      check:    {},
      codegen:  {},
      init:     {},
      import:   {},
      export:   {},
      mcp:      {},
      lsp:      {},
      repl:     {},
      registry: { traffic: './machines/traffic-light.fsl' },
    };
    expect(r.render.defaultTarget).toBe('svg');
  });

  it('PartialConfig allows omitting every field', () => {
    const p: PartialConfig = {};
    expect(p).toEqual({});
  });

  it('PartialConfig allows extends as string or array', () => {
    const p1: PartialConfig = { extends: './base.json' };
    const p2: PartialConfig = { extends: ['./a.json', './b.json'] };
    expect(p1.extends).toBe('./base.json');
    expect(Array.isArray(p2.extends)).toBe(true);
  });

  it('PartialConfig allows $schema for editor autocomplete', () => {
    const p: PartialConfig = { $schema: 'https://stonecypher.github.io/jssm/schemas/fsl-config.json' };
    expect(p.$schema).toContain('stonecypher.github.io');
  });

  it('RenderConfig has all v1 fields', () => {
    const r: RenderConfig = {
      defaultTarget: 'png',
      outDir: 'build',
      scale: 4,
      width: 800,
      height: 600,
      quality: 90,
      theme: 'dark',
    };
    expect(r.defaultTarget).toBe('png');
  });

  it('Reader type accepts a path-to-string async function', async () => {
    const r: Reader = async (p: string) => `read:${p}`;
    expect(await r('foo')).toBe('read:foo');
  });

  it('ConfigError is abstract via its concrete subclasses', () => {
    const e = new ConfigParseError('parse fail', { path: '/x.json' });
    expect(e).toBeInstanceOf(ConfigError);
    expect(e).toBeInstanceOf(Error);
    expect(e.kind).toBe('parse');
    expect(e.path).toBe('/x.json');
    expect(e.name).toBe('ConfigParseError');
  });

  it('ConfigSchemaError carries violations', () => {
    const violations = [{ keyword: 'type', instancePath: '/scale', message: 'must be number' }] as any[];
    const e = new ConfigSchemaError('schema fail', { path: '/x.json', violations });
    expect(e.kind).toBe('schema');
    expect(e.violations).toEqual(violations);
  });

  it('ConfigExtendsError carries the chain', () => {
    const chain = ['/a.json', '/b.json', '/a.json'];
    const e = new ConfigExtendsError('cycle', { chain });
    expect(e.kind).toBe('extends');
    expect(e.chain).toEqual(chain);
  });

  it('ConfigIOError carries the underlying errno', () => {
    const cause = Object.assign(new Error('ENOENT'), { code: 'ENOENT', errno: -2 });
    const e = new ConfigIOError('cannot read', { path: '/x', errno: cause as NodeJS.ErrnoException });
    expect(e.kind).toBe('io');
    expect(e.errno.code).toBe('ENOENT');
  });

});
