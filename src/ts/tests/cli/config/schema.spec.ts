import { validateConfig, CONFIG_SCHEMA } from '../../../cli/config/schema';
import { ConfigSchemaError } from '../../../cli/config/types';

describe('cli/config/schema', () => {

  it('CONFIG_SCHEMA is a valid JSON Schema draft 07 object', () => {
    expect(CONFIG_SCHEMA.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(CONFIG_SCHEMA.type).toBe('object');
    expect(CONFIG_SCHEMA.additionalProperties).toBe(false);
  });

  it('accepts an empty object', () => {
    expect(() => validateConfig({}, { path: '/x' })).not.toThrow();
  });

  it('accepts $schema and extends fields', () => {
    expect(() => validateConfig({
      $schema: 'https://example/schema.json',
      extends: './base.json',
    }, { path: '/x' })).not.toThrow();
  });

  it('accepts extends as an array', () => {
    expect(() => validateConfig({ extends: ['./a.json', './b.json'] }, { path: '/x' })).not.toThrow();
  });

  it('accepts a complete render config', () => {
    expect(() => validateConfig({
      render: {
        defaultTarget: 'png',
        outDir: 'build',
        scale: 4,
        width: 800,
        height: 600,
        quality: 90,
        theme: 'dark',
      },
    }, { path: '/x' })).not.toThrow();
  });

  it('accepts a registry section mapping names to file paths', () => {
    expect(() => validateConfig({
      registry: {
        traffic:  './machines/traffic-light.fsl',
        elevator: '../shared/elevator.fsl',
      },
    }, { path: '/x' })).not.toThrow();
  });

  it('rejects non-string registry values', () => {
    expect(() => validateConfig({ registry: { traffic: 42 } } as any, { path: '/x' })).toThrow(ConfigSchemaError);
  });

  it('rejects unknown top-level keys', () => {
    expect(() => validateConfig({ totally_made_up: true } as any, { path: '/x' })).toThrow(ConfigSchemaError);
  });

  it('rejects render.defaultTarget not in the enum', () => {
    expect(() => validateConfig({ render: { defaultTarget: 'tiff' } } as any, { path: '/x' })).toThrow(ConfigSchemaError);
  });

  it('rejects non-numeric render.scale', () => {
    expect(() => validateConfig({ render: { scale: 'big' } } as any, { path: '/x' })).toThrow(ConfigSchemaError);
  });

  it('rejects extends as a number', () => {
    expect(() => validateConfig({ extends: 42 } as any, { path: '/x' })).toThrow(ConfigSchemaError);
  });

  it('ConfigSchemaError carries the violations array and the path', () => {
    try {
      validateConfig({ render: { scale: 'big' } } as any, { path: '/foo/.fsl/config.json' });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigSchemaError);
      const err = e as ConfigSchemaError;
      expect(err.path).toBe('/foo/.fsl/config.json');
      expect(err.violations.length).toBeGreaterThan(0);
    }
  });

  it('omits the "in <path>" suffix when no path is provided', () => {
    try {
      validateConfig({ render: { scale: 'big' } } as any);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigSchemaError);
      const err = e as ConfigSchemaError;
      expect(err.path).toBeUndefined();
      expect(err.message).not.toContain(' in ');
    }
  });

});
