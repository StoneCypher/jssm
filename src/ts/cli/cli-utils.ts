export type FlagType = 'string' | 'number' | 'boolean';

export interface FlagSpec {
  short?: string;
  type?: FlagType;
  boolean?: boolean;
  enum?: readonly string[];
  default?: string | number | boolean;
}

export interface ParseSpec {
  flags: Record<string, FlagSpec>;
  usage: string;
}

export interface ParseResult<S extends ParseSpec> {
  positional: string[];
  flags: Record<string, string | number | boolean | undefined>;
  helpText: () => string;
}

/**
 * Parse a CLI-style argv array against a flag specification.
 *
 * Supported forms:
 *   --long=value     long flag with =
 *   --long value     long flag with space-separated value
 *   --bool           boolean long flag
 *   -s value         short flag with space value
 *   -svalue          short flag with attached value
 *   -b               boolean short flag
 *   --               terminate flag parsing; remaining args are positional
 *   -                positional (stdin sentinel)
 *
 * @param argv - The argument array to parse (e.g. process.argv.slice(2))
 * @param spec - The flag specification describing accepted flags, their types, and defaults
 * @returns A ParseResult containing positional args, parsed flag values, and a helpText() generator
 *
 * @throws Error if an unknown flag is seen, an enum value mismatches,
 *   or a numeric flag receives a non-numeric value.
 *
 * @example
 * ```ts
 * const spec = {
 *   flags: {
 *     target: { short: 't', enum: ['svg', 'png'], default: 'svg' },
 *     help:   { short: 'h', boolean: true },
 *   },
 *   usage: 'fsl-render [options] <fsl-paths...>',
 * } as const;
 *
 * const result = parseFslArgs(['--target=png', 'machine.fsl'], spec);
 * // result.flags.target === 'png'
 * // result.positional   === ['machine.fsl']
 * ```
 */
export function parseFslArgs<S extends ParseSpec>(argv: string[], spec: S): ParseResult<S> {
  const positional: string[] = [];
  const flags: Record<string, string | number | boolean | undefined> = {};

  // Build a short → long lookup map
  const shortMap: Record<string, string> = {};
  for (const [name, fs] of Object.entries(spec.flags)) {
    if (fs.short) shortMap[fs.short] = name;
  }

  const isBoolean = (name: string): boolean => spec.flags[name]?.boolean === true;
  const flagType  = (name: string): FlagType => {
    // Callers only invoke this for non-boolean flags (boolean flags are
    // handled inline in the argv loop and never reach `coerce`), so the
    // `fs.boolean` check that used to live here is unreachable.
    const fs = spec.flags[name]!;
    return fs.type ?? 'string';
  };

  const coerce = (name: string, raw: string): string | number => {
    const t = flagType(name);
    if (t === 'number') {
      const n = Number(raw);
      if (Number.isNaN(n)) {
        throw new Error(`flag --${name} requires a number, got: ${raw}`);
      }
      return n;
    }
    const fs = spec.flags[name];
    if (fs.enum && !fs.enum.includes(raw)) {
      throw new Error(`flag --${name} value '${raw}' not in: ${fs.enum.join(', ')}`);
    }
    return raw;
  };

  let i = 0;
  let positionalOnly = false;
  while (i < argv.length) {
    const a = argv[i];
    if (positionalOnly) { positional.push(a); i++; continue; }
    if (a === '--') { positionalOnly = true; i++; continue; }
    if (a === '-')  { positional.push(a); i++; continue; }

    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      const name = eq >= 0 ? a.slice(2, eq) : a.slice(2);
      if (!(name in spec.flags)) throw new Error(`unknown flag: --${name}`);
      if (isBoolean(name)) {
        flags[name] = true;
        i++;
      } else if (eq >= 0) {
        flags[name] = coerce(name, a.slice(eq + 1));
        i++;
      } else {
        if (i + 1 >= argv.length) throw new Error(`flag --${name} requires a value`);
        flags[name] = coerce(name, argv[i + 1]);
        i += 2;
      }
      continue;
    }

    if (a.startsWith('-') && a.length > 1) {
      const short = a[1];
      const name  = shortMap[short];
      if (!name) throw new Error(`unknown flag: -${short}`);
      if (isBoolean(name)) {
        flags[name] = true;
        // Allow combined short booleans? v1: single short-bool per arg only.
        if (a.length > 2) throw new Error(`combined short flags not supported: ${a}`);
        i++;
      } else if (a.length > 2) {
        flags[name] = coerce(name, a.slice(2));
        i++;
      } else {
        if (i + 1 >= argv.length) throw new Error(`flag -${short} requires a value`);
        flags[name] = coerce(name, argv[i + 1]);
        i += 2;
      }
      continue;
    }

    positional.push(a);
    i++;
  }

  // Apply defaults
  for (const [name, fs] of Object.entries(spec.flags)) {
    if (flags[name] === undefined && fs.default !== undefined) {
      flags[name] = fs.default;
    }
  }

  const helpText = (): string => {
    const lines: string[] = [];
    lines.push('Usage:');
    lines.push('  ' + spec.usage);
    lines.push('');
    lines.push('Options:');
    for (const [name, fs] of Object.entries(spec.flags)) {
      const short = fs.short ? `-${fs.short}, ` : '    ';
      const longPart = `--${name}`;
      const arg = fs.boolean ? '' : (fs.enum ? ` ${fs.enum.join('|')}` : (fs.type === 'number' ? ' N' : ' VALUE'));
      const defStr = fs.default !== undefined ? ` (default: ${fs.default})` : '';
      lines.push(`  ${short}${longPart}${arg}${defStr}`);
    }
    return lines.join('\n');
  };

  return { positional, flags, helpText };
}
