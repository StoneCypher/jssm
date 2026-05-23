import { defaults } from '../../../cli/config/defaults';

describe('cli/config/defaults', () => {

  it('include defaults to glob for all .fsl files', () => {
    expect(defaults.include).toEqual(['**/*.fsl']);
  });

  it('exclude defaults to node_modules', () => {
    expect(defaults.exclude).toEqual(['**/node_modules/**']);
  });

  it('render.defaultTarget is svg', () => {
    expect(defaults.render.defaultTarget).toBe('svg');
  });

  it('render.scale is 3 (matches current hard-coded value)', () => {
    expect(defaults.render.scale).toBe(3);
  });

  it('render.quality is 85 (matches current hard-coded value)', () => {
    expect(defaults.render.quality).toBe(85);
  });

  it('every per-subcommand section is present', () => {
    expect(defaults.lint).toBeDefined();
    expect(defaults.fmt).toBeDefined();
    expect(defaults.test).toBeDefined();
    expect(defaults.check).toBeDefined();
    expect(defaults.typegen).toBeDefined();
    expect(defaults.new).toBeDefined();
    expect(defaults.convert).toBeDefined();
    expect(defaults.playground).toBeDefined();
    expect(defaults.mcp).toBeDefined();
    expect(defaults.lsp).toBeDefined();
    expect(defaults.repl).toBeDefined();
  });

  it('defaults is deep-frozen so callers cannot mutate it', () => {
    expect(Object.isFrozen(defaults)).toBe(true);
    expect(Object.isFrozen(defaults.render)).toBe(true);
    expect(Object.isFrozen(defaults.include)).toBe(true);
  });

});
