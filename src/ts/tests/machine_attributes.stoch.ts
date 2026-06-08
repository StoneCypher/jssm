
import * as fc   from 'fast-check';
import * as jssm from '../jssm';





// Property-based coverage for §9 Machine attributes of the FSL
// grammar reference (`notes/fsl-grammar-reference.md`).  Each is a
// `keyword : value;` line at top level.  The attribute → value-type
// table is documented in §9; this suite pins the AST `key` each
// keyword produces, exercises the sub-vocabularies (Direction,
// HookDefinition, Theme, License, SemVer, URL), and confirms the
// `LabelOrLabelList`-typed attributes accept both bare-label and
// bracketed-list value shapes.
//
// URL footgun (worked around here, not pinned): the URL char class
// in the grammar includes `;`, so a URL without WS before the
// terminating `;` is eaten verbatim and the rule fails.  All URL
// tests in this file (and the matching spec file) write
// `<url> ;` (with a space) — the same convention used in
// `machine_attributes.spec.ts`.  Worth flagging in the §14 Quirks
// section of the grammar reference at next sync.



const RUNS = 100;



/**
 *  Parse a single attribute declaration and return the term at
 *  `tree[0]`.
 *
 *  @param  src  Full attribute source, terminator included.
 *  @returns     Attribute AST node.
 *
 *  @example
 *    parse_attr('machine_name: Foo;')   // → {key:'machine_name', value:'Foo'}
 *    parse_attr('fsl_version: 1.2.3;')  // → {key:'fsl_version', value:{major:1, ...}}
 */
function parse_attr(src: string): { key: string; value: unknown } {

  const tree = jssm.parse(src) as Array<{ key: string; value: unknown }>;
  return tree[0];

}



/**
 *  Random atom-shaped label body — lowercase ASCII only.
 */
const ATOM_LIKE = fc.array(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 1, maxLength: 6 }
).map(arr => arr.join(''));





describe('§9 MachineAttribute — AST key per keyword (Label-typed values)', () => {

  // The simplest table: keyword → expected AST key.  These rows
  // all use `Label`-class values so the test bodies are interchangeable.

  const LABEL_ATTRS: ReadonlyArray<readonly [string, string]> = [
    ['machine_name',     'machine_name'    ],
    ['machine_language', 'machine_language'],
    ['npm_name',         'npm_name'        ],
  ];

  for (const [keyword, expected_key] of LABEL_ATTRS) {
    test(`\`${keyword}: foo;\` produces AST key \`${expected_key}\``, () => {
      const node = parse_attr(`${keyword}: foo;`);
      expect(node.key  ).toBe(expected_key);
      expect(node.value).toBe('foo');
    });
  }

});



describe('§9 MachineAttribute — LabelOrLabelList-typed attributes', () => {

  // The four attributes whose values are LabelOrLabelList accept
  // both bare-label and bracketed-list forms.  Bare-label produces
  // a string `value`; bracketed list produces an array.

  const LIST_ATTRS: ReadonlyArray<readonly [string, string]> = [
    ['machine_author',      'machine_author'     ],
    ['machine_contributor', 'machine_contributor'],
    ['machine_comment',     'machine_comment'    ],
    ['machine_reference',   'machine_reference'  ],  // present in grammar but not in §9 table
  ];

  for (const [keyword, expected_key] of LIST_ATTRS) {

    test(`\`${keyword}: foo;\` (bare label) yields string-typed value`, () => {
      const node = parse_attr(`${keyword}: foo;`);
      expect(node.key  ).toBe(expected_key);
      expect(node.value).toBe('foo');
    });

    test(`\`${keyword}: [a b c];\` (bracketed list) yields array-typed value`, () => {
      const node = parse_attr(`${keyword}: [a b c];`);
      expect(node.key  ).toBe(expected_key);
      expect(node.value).toEqual(['a', 'b', 'c']);
    });

  }

});



describe('§9 MachineAttribute — SemVer-typed attributes', () => {

  // Both `fsl_version` and `machine_version` take a SemVer value
  // and produce a structured `{major, minor, patch, full}` object.

  const SEMVER_ATTRS: ReadonlyArray<readonly [string, string]> = [
    ['fsl_version',     'fsl_version'    ],
    ['machine_version', 'machine_version'],
  ];

  for (const [keyword, expected_key] of SEMVER_ATTRS) {

    test(`\`${keyword}: 1.2.3;\` produces structured SemVer value`, () => {
      const node = parse_attr(`${keyword}: 1.2.3;`);
      expect(node.key  ).toBe(expected_key);
      expect(node.value).toEqual({ major: 1, minor: 2, patch: 3, full: '1.2.3' });
    });

    test(`\`${keyword}: 0.0.0;\` zero-version parses`, () => {
      const node = parse_attr(`${keyword}: 0.0.0;`);
      expect(node.value).toEqual({ major: 0, minor: 0, patch: 0, full: '0.0.0' });
    });

    test(`Random SemVer round-trips with matching major/minor/patch`, () => {

      fc.assert(
        fc.property(
          fc.integer(0, 999),
          fc.integer(0, 999),
          fc.integer(0, 999),
          (major, minor, patch) => {
            const ver  = `${major}.${minor}.${patch}`;
            const node = parse_attr(`${keyword}: ${ver};`);
            expect(node.value).toEqual({ major, minor, patch, full: ver });
          }
        ),
        { numRuns: RUNS }
      );

    });

  }

});





describe('§9 MachineAttribute — theme (always wrapped in an array)', () => {

  // §9 declares Theme as an enum of five names; the `theme:` attribute
  // accepts a single theme or a bracketed list.  Empirically the
  // parser wraps even the single-theme case in a one-element array
  // — worth pinning so a future grammar tweak (e.g. unwrapping
  // singletons) is a deliberate decision.

  const THEMES = ['plain', 'default', 'modern', 'ocean', 'bold'] as const;

  for (const theme of THEMES) {
    test(`\`theme: ${theme};\` wraps the single theme in a one-element array`, () => {
      const node = parse_attr(`theme: ${theme};`);
      expect(node.key  ).toBe('theme');
      expect(node.value).toEqual([theme]);
    });
  }

  test('Random multi-theme list preserves order', () => {

    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...THEMES), { minLength: 1, maxLength: 5 }),
        (chosen) => {
          const src  = `theme: [${chosen.join(' ')}];`;
          const node = parse_attr(src);
          expect(node.value).toEqual(chosen);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('Unknown theme name throws', () => {
    expect(() => parse_attr('theme: rainbow;')).toThrow();
  });

});



describe('§9 MachineAttribute — flow (Direction enum)', () => {

  const DIRECTIONS = ['up', 'right', 'down', 'left'] as const;

  for (const dir of DIRECTIONS) {
    test(`\`flow: ${dir};\` parses to direction \`${dir}\``, () => {
      const node = parse_attr(`flow: ${dir};`);
      expect(node.key  ).toBe('flow');
      expect(node.value).toBe(dir);
    });
  }

  test('Unknown direction throws', () => {
    expect(() => parse_attr('flow: sideways;')).toThrow();
  });

});



describe('§9 MachineAttribute — hooks (HookDefinition enum)', () => {

  // `hooks: open` / `hooks: closed` control whether unbound hooks
  // throw or are silently allowed.  Note: AST key is `hook_definition`
  // (with an underscore), not `hooks` — the keyword is plural but the
  // canonical key is singular.

  for (const setting of ['open', 'closed'] as const) {
    test(`\`hooks: ${setting};\` produces key=hook_definition value=${setting}`, () => {
      const node = parse_attr(`hooks: ${setting};`);
      expect(node.key  ).toBe('hook_definition');
      expect(node.value).toBe(setting);
    });
  }

  test('Unknown hook setting throws', () => {
    expect(() => parse_attr('hooks: maybe;')).toThrow();
  });

});





describe('§9 MachineAttribute — machine_license', () => {

  // The grammar's LicenseOrLabelOrList tries a fixed shortlist of
  // well-known licenses first, then falls through to Label or
  // LabelList.  All shortlist names parse to themselves verbatim.

  const KNOWN_LICENSES = [
    'MIT', 'BSD 2-clause', 'BSD 3-clause', 'Apache 2.0', 'Mozilla 2.0',
    'Public domain', 'GPL v2', 'GPL v3', 'LGPL v2.1', 'LGPL v3.0',
    'Unknown',
  ] as const;

  for (const license of KNOWN_LICENSES) {
    test(`\`machine_license: ${license};\` parses to ${JSON.stringify(license)}`, () => {
      const node = parse_attr(`machine_license: ${license};`);
      expect(node.key  ).toBe('machine_license');
      expect(node.value).toBe(license);
    });
  }

  test('Custom license falls through to Label', () => {
    const node = parse_attr('machine_license: CustomLicense;');
    expect(node.value).toBe('CustomLicense');
  });

});



describe('§9 MachineAttribute — machine_definition (URL value)', () => {

  // URL = UrlProtocol + permissive char class.  Because the char
  // class includes `;`, the URL would otherwise consume the
  // terminating semicolon.  The working convention (matching
  // `machine_attributes.spec.ts`) is to write `<url> ;` with WS
  // before the terminator.

  test('`http://google.com/` URL parses with key=machine_definition', () => {
    const node = parse_attr('machine_definition: http://google.com/ ;');
    expect(node.key  ).toBe('machine_definition');
    expect(node.value).toBe('http://google.com/');
  });

  test('`https://example.com/foo` URL parses', () => {
    const node = parse_attr('machine_definition: https://example.com/foo ;');
    expect(node.value).toBe('https://example.com/foo');
  });

  test('URL with rich URL-safe chars round-trips', () => {

    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_./~'.split('')),
          { minLength: 1, maxLength: 30 }
        ).map(arr => arr.join('')),
        (path) => {
          const url  = `https://example.com/${path}`;
          const node = parse_attr(`machine_definition: ${url} ;`);
          expect(node.value).toBe(url);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('Non-http(s) scheme throws (file://, mailto: not accepted)', () => {
    expect(() => parse_attr('machine_definition: file:///etc/passwd ;')).toThrow();
    expect(() => parse_attr('machine_definition: mailto:x@y.com ;')).toThrow();
  });

});



describe('§9 MachineAttribute — dot_preamble (String value)', () => {

  // dot_preamble takes a quoted String which is passed through to
  // the dot output verbatim.  Random unescaped bodies round-trip.

  test('Empty string preamble parses', () => {
    const node = parse_attr('dot_preamble: "";');
    expect(node.key  ).toBe('dot_preamble');
    expect(node.value).toBe('');
  });

  test('Random unescaped string body round-trips', () => {

    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 30 })
          .filter(s => !s.includes('"') && !s.includes('\\')),
        (body) => {
          const node = parse_attr(`dot_preamble: "${body}";`);
          expect(node.value).toBe(body);
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('§9 MachineAttribute — random round-trip across keyword vocabularies', () => {

  // Mixed property: pick a Label-typed attribute and a random body;
  // confirm the parser produces the expected key and faithful value.
  // The LabelOrLabelList attributes also accept the bare-label form,
  // so they share this property — exercising them together gives a
  // stronger random sample of the attribute surface as a whole.

  const ATTRS: ReadonlyArray<readonly [string, string]> = [
    ['machine_name',        'machine_name'       ],
    ['machine_language',    'machine_language'   ],
    ['machine_author',      'machine_author'     ],
    ['machine_contributor', 'machine_contributor'],
    ['machine_comment',     'machine_comment'    ],
    ['machine_reference',   'machine_reference'  ],
    ['npm_name',            'npm_name'           ],
  ];

  test('Each Label/LabelOrLabelList attribute round-trips a random bare body', () => {

    fc.assert(
      fc.property(
        fc.constantFrom(...ATTRS),
        ATOM_LIKE,
        ([keyword, expected_key], body) => {
          const node = parse_attr(`${keyword}: ${body};`);
          expect(node.key  ).toBe(expected_key);
          expect(node.value).toBe(body);
        }
      ),
      { numRuns: RUNS }
    );

  });

});
