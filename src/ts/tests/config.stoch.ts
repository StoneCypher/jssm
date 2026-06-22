
import * as fc   from 'fast-check';
import * as jssm from '../jssm';





// Property-based coverage for §8 Configuration blocks of the FSL
// grammar reference (`notes/fsl-grammar-reference.md`).  §8 has two
// shapes:
//
//   - Block-style:  `<keyword> : { <items>? };`
//   - Single-value: `<keyword> : <value> ;`
//
// Block-style has nine forms:
//   - 6 state-defaults blocks (state, start_state, end_state,
//     active_state, terminal_state, hooked_state) — each accepts
//     the same StateDeclarationItem set as §7 and emits a node
//     whose `key` is `default_<keyword>_config`
//   - 2 placeholder blocks (action, validation) — each emits a node
//     with `config_kind` (NOT `key`) and `config_items` fields.
//   - the `transition:` block is now normalized to the standard
//     dispatch shape `{ key:'default_transition_config', value }`
//     (the overlapping-state-groups feature wired it through).  Its
//     body reuses the shared style-items rule, so it accepts the
//     `state: {}` style items (e.g. `color: red;`), the graph-default
//     edge-color line, and the legacy `whargarbl`/`todo` stubs.
//
// Single-value has five forms:
//   - graph_layout : GvizLayout (`dot`/`circo`/`fdp`/`neato`/`twopi`)
//   - start_states : LabelList
//   - end_states   : LabelList
//   - graph_bg_color : Color
//   - allows_override : true / false / undefined
//
// Grammar quirk worth noting: the placeholder items inside
// `action:` / `validation:` blocks require NO whitespace between
// the colon and the value (the grammar rule is
// `<key>:<value>;` with no `WS?` slot between `:` and `value`).
// All other config surfaces accept `<key> : <value>` with WS.
// This is asymmetric and likely a footgun worth a §14 entry if it
// surfaces in real use.



const RUNS = 100;



/**
 *  Parse a single config statement and return its term at `tree[0]`.
 *  Two AST shapes appear here:
 *
 *    - Block-style state configs:   `{ key: 'default_<x>_config',  value: [...] }`
 *    - Normalized transition block: `{ key: 'default_transition_config', value: ... }`
 *    - Placeholder block configs:   `{ config_kind: '<x>', config_items: [...] }`
 *    - Single-value configs:        `{ key: '<keyword>',           value: ... }`
 *
 *  Callers know which shape they expect and read the appropriate
 *  fields.
 *
 *  @param  src  Full config statement, terminator included.
 *  @returns     The config AST node.
 */
function parse_config(src: string): Record<string, unknown> {

  const tree = jssm.parse(src) as Array<Record<string, unknown>>;
  return tree[0];

}





describe('§8 Config — state-defaults block keys (6 forms)', () => {

  // The six state-defaults blocks all share the StateDeclarationItem
  // body (from §7) but emit different AST `key`s following the
  // `default_<keyword>_config` naming convention.

  const STATE_BLOCKS: ReadonlyArray<readonly [string, string]> = [
    ['state',          'default_state_config'         ],
    ['start_state',    'default_start_state_config'   ],
    ['end_state',      'default_end_state_config'     ],
    ['active_state',   'default_active_state_config'  ],
    ['terminal_state', 'default_terminal_state_config'],
    ['hooked_state',   'default_hooked_state_config'  ],
  ];

  for (const [keyword, expected_key] of STATE_BLOCKS) {

    test(`\`${keyword}: {};\` empty block yields key=${expected_key}, value=[]`, () => {
      const node = parse_config(`${keyword}: {};`);
      expect(node.key  ).toBe(expected_key);
      expect(node.value).toEqual([]);
    });

    test(`\`${keyword}: { color: red; };\` propagates StateDeclarationItems into value`, () => {
      const node = parse_config(`${keyword}: { color: red; };`);
      expect(node.key  ).toBe(expected_key);
      expect(node.value).toEqual([{ key: 'color', value: '#ff0000ff' }]);
    });

  }

});



describe('§8 Config — state-defaults block bodies reuse §7 item set', () => {

  // The body of any state-defaults block accepts the same items as
  // a state declaration's body.  Sampling a subset across all six
  // block keywords confirms that the shared item surface really is
  // shared, not accidentally divergent.

  const ITEMS_TO_SAMPLE: ReadonlyArray<readonly [string, string]> = [
    ['color: red;',            'color'           ],
    ['shape: box;',            'shape'           ],
    ['corners: rounded;',      'corners'         ],
    ['line-style: dashed;',    'line-style'      ],
    ['label: hi;',             'state-label'     ],
    ['background-color: blue;','background-color'],
  ];

  const BLOCK_KEYWORDS = ['state', 'start_state', 'end_state', 'active_state', 'terminal_state', 'hooked_state'] as const;

  test('Random block × random item pairs yield the expected nested AST key', () => {

    fc.assert(
      fc.property(
        fc.constantFrom(...BLOCK_KEYWORDS),
        fc.constantFrom(...ITEMS_TO_SAMPLE),
        (block, [item_src, expected_item_key]) => {
          const node       = parse_config(`${block}: { ${item_src} };`);
          const body_array = node.value as Array<{ key: string }>;
          expect(body_array).toHaveLength(1);
          expect(body_array[0].key).toBe(expected_item_key);
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('§8 Config — placeholder blocks (transition / action / validation)', () => {

  // The placeholder blocks emit a different shape: `config_kind` and
  // `config_items` instead of `key` and `value`.  Their `items`
  // surfaces only accept `whargarbl`/`todo` keys today — explicit
  // grammar stubs for future schemas.  Note: the items use the
  // *no-WS-between-colon-and-value* form (e.g. `todo:x;`, NOT
  // `todo: x;`).

  test('`validation: { todo:x; };` yields config_kind=validation, config_items=[...]', () => {
    const node = parse_config('validation: { todo:x; };');
    expect(node.config_kind).toBe('validation');
    expect(node.config_items).toEqual([{ key: 'todo', value: 'x' }]);
  });

  test('`validation: { whargarbl:y; };` (the other placeholder key) parses', () => {
    const node = parse_config('validation: { whargarbl:y; };');
    expect(node.config_items).toEqual([{ key: 'whargarbl', value: 'y' }]);
  });

  test('`action: { todo:z; };` yields config_kind=action', () => {
    const node = parse_config('action: { todo:z; };');
    expect(node.config_kind).toBe('action');
    expect(node.config_items).toEqual([{ key: 'todo', value: 'z' }]);
  });

  test('`action: { whargarbl:w; };` parses', () => {
    const node = parse_config('action: { whargarbl:w; };');
    expect(node.config_items).toEqual([{ key: 'whargarbl', value: 'w' }]);
  });

});



describe('§8 Config — normalized transition block accepts an edge_color branch', () => {

  // The `transition:` block is now normalized to the standard
  // `{ key:'default_transition_config', value }` dispatch shape.  Its
  // body (the shared style-items rule) accepts either a single
  // `GraphDefaultEdgeColor` (`edge_color : <Color>;`) OR a list of
  // style/placeholder items.  The `edge_color` branch returns a
  // single object as `value` (not an array) — pinning here because
  // that's an asymmetry future code might assume away.

  test('`transition: { edge_color: blue; };` returns a single-object value', () => {
    const node = parse_config('transition: { edge_color: blue; };');
    expect(node.key).toBe('default_transition_config');
    expect(node.value).toEqual({ key: 'graph_default_edge_color', value: '#0000ffff' });
    expect(Array.isArray(node.value)).toBe(false);
  });

  test('`transition: { whargarbl:x; };` placeholder branch returns an array value', () => {
    const node = parse_config('transition: { whargarbl:x; };');
    expect(node.key).toBe('default_transition_config');
    expect(Array.isArray(node.value)).toBe(true);
    expect(node.value).toEqual([{ key: 'whargarbl', value: 'x' }]);
  });

  test('`transition: { color: red; };` accepts shared style items as a value array', () => {
    const node = parse_config('transition: { color: red; };');
    expect(node.key).toBe('default_transition_config');
    expect(node.value).toEqual([{ key: 'color', value: '#ff0000ff' }]);
  });

  test('Random colour name in edge_color round-trips into a hex value', () => {

    fc.assert(
      fc.property(
        fc.constantFrom('red', 'blue', 'green', 'white', 'black', 'orange', 'purple'),
        (color_name) => {
          const node = parse_config(`transition: { edge_color: ${color_name}; };`);
          expect((node.value as { key: string }).key).toBe('graph_default_edge_color');
          expect((node.value as { value: string }).value).toMatch(/^#[0-9a-f]{8}$/i);
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('§8 Config — single-value configs (5 forms)', () => {

  test('`graph_layout: dot;` parses to value=dot', () => {
    const node = parse_config('graph_layout: dot;');
    expect(node.key  ).toBe('graph_layout');
    expect(node.value).toBe('dot');
  });

  test('All five documented GvizLayout values parse to themselves', () => {

    const LAYOUTS = ['dot', 'circo', 'fdp', 'neato', 'twopi'] as const;

    for (const layout of LAYOUTS) {
      const node = parse_config(`graph_layout: ${layout};`);
      expect(node.key  ).toBe('graph_layout');
      expect(node.value).toBe(layout);
    }

  });

  test('Unknown graph_layout value throws', () => {
    expect(() => parse_config('graph_layout: spaghetti;')).toThrow();
  });

  test('`start_states: [a b c];` yields ordered array', () => {
    const node = parse_config('start_states: [a b c];');
    expect(node.key  ).toBe('start_states');
    expect(node.value).toEqual(['a', 'b', 'c']);
  });

  test('`end_states: [x];` yields one-element array', () => {
    const node = parse_config('end_states: [x];');
    expect(node.key  ).toBe('end_states');
    expect(node.value).toEqual(['x']);
  });

  test('`graph_bg_color: red;` resolves to the canonical hex', () => {
    const node = parse_config('graph_bg_color: red;');
    expect(node.key  ).toBe('graph_bg_color');
    expect(node.value).toBe('#ff0000ff');
  });

  test('`allows_override` accepts true / false / undefined', () => {

    expect(parse_config('allows_override: true;'     ).value).toBe(true);
    expect(parse_config('allows_override: false;'    ).value).toBe(false);
    expect(parse_config('allows_override: undefined;').value).toBeUndefined();

  });

});



describe('§8 Config — start_states / end_states random round-trips', () => {

  // Both attributes are pure LabelList wrappers — random label
  // arrays should round-trip preserving order and arity.

  const ATOM_LIKE = fc.array(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
    { minLength: 1, maxLength: 6 }
  ).map(arr => arr.join(''));

  for (const keyword of ['start_states', 'end_states'] as const) {

    test(`${keyword} round-trips random LabelList contents`, () => {

      fc.assert(
        fc.property(
          fc.array(ATOM_LIKE, { minLength: 0, maxLength: 8 }),
          (labels) => {
            const src  = `${keyword}: [${labels.join(' ')}];`;
            const node = parse_config(src);
            expect(node.key  ).toBe(keyword);
            expect(node.value).toEqual(labels);
          }
        ),
        { numRuns: RUNS }
      );

    });

  }

});
