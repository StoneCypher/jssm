/**
 * JSON Schema for the `fsl` config file, plus the `validateConfig`
 * function used by the loader.
 *
 * The schema is hand-written in v1; a follow-up will generate it from the
 * TS types via `ts-json-schema-generator`. Until then, when types in
 * `types.ts` change, update this file in lockstep.
 *
 * Pure module — uses ajv directly with no Node API references.
 */

import Ajv, { ErrorObject } from 'ajv';
import type { PartialConfig } from './types';
import { ConfigSchemaError } from './types';

/** Empty per-subcommand-section schema; reserves the key. */
const emptySection = { type: 'object', additionalProperties: true } as const;

/** The JSON Schema (draft-07) used at runtime and published for editor autocomplete. */
export const CONFIG_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://stonecypher.github.io/jssm/schemas/fsl-config.json',
  title: 'fsl Configuration',
  description: 'Unified configuration for the fsl CLI and the jssm/cli library.',
  type: 'object',
  additionalProperties: false,
  properties: {
    $schema: { type: 'string' },
    extends: {
      oneOf: [
        { type: 'string' },
        { type: 'array', items: { type: 'string' } },
      ],
    },
    include: { type: 'array', items: { type: 'string' } },
    exclude: { type: 'array', items: { type: 'string' } },
    render: {
      type: 'object',
      additionalProperties: false,
      properties: {
        defaultTarget: { type: 'string', enum: ['svg', 'dot', 'png', 'jpeg', 'html'] },
        outDir: { type: 'string' },
        scale: { type: 'number' },
        width: { type: 'number' },
        height: { type: 'number' },
        quality: { type: 'number' },
        theme: { type: 'string' },
      },
    },
    lint: emptySection,
    format: emptySection,
    test: emptySection,
    check: emptySection,
    codegen: emptySection,
    init: emptySection,
    import: emptySection,
    export: emptySection,
    mcp: emptySection,
    lsp: emptySection,
    repl: emptySection,
    registry: {
      type: 'object',
      additionalProperties: { type: 'string' },
    },
  },
} as const;

const ajv = new Ajv({ allErrors: true });
const validator = ajv.compile(CONFIG_SCHEMA as object);

/**
 * Validate a parsed config object against the schema. Throws
 * `ConfigSchemaError` with the full ajv violation array on failure.
 *
 * @param config - The parsed object from a config file (or assembled in code)
 * @param opts.path - Source path for the error message (optional but recommended)
 * @throws ConfigSchemaError if the object violates the schema
 *
 * @example
 *   validateConfig({ render: { defaultTarget: 'svg' } }, { path: '/x.json' });
 *   // returns void
 *
 * @example
 *   validateConfig({ render: { defaultTarget: 'tiff' } }, { path: '/x.json' });
 *   // throws ConfigSchemaError
 *
 * @see CONFIG_SCHEMA
 * @see ConfigSchemaError
 */
export function validateConfig(config: unknown, opts: { path?: string } = {}): asserts config is PartialConfig {
  const ok = validator(config);
  if (!ok) {
    const violations = validator.errors as ErrorObject[];
    const summary = violations.map(v => `${v.instancePath || '/'}: ${v.message}`).join('; ');
    throw new ConfigSchemaError(`config schema violation${opts.path ? ` in ${opts.path}` : ''}: ${summary}`, {
      path: opts.path,
      violations,
    });
  }
}
