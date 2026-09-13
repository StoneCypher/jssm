
import { describe, test, expect } from 'vitest';

import {
  sm, go, hook, JssmError,
  is_start_state, is_end_state, state_is_terminal, state_has_hooks,
  graph_layout, dot_preamble, default_transition_config, default_graph_config,
  all_themes, themes, set_themes, flow,
  standard_state_style, hooked_state_style, start_state_style,
  end_state_style, terminal_state_style, active_state_style,
  resolve_state_config, style_for,
  transfer_state_properties, state_style_condense
} from '../jssm';





// Direct tests of the style family as bare functions.  Expected values come
// from the FSL text, the literal inputs, or the shipped theme tables
// (src/ts/themes/*): the default theme paints a plain state white, the ocean
// theme paints it cadetblue1, and no theme sets `corners`.

describe('bare functions — style family', () => {



  describe('graph_layout', () => {
    test('defaults to dot and follows the directive', () => {
      expect(graph_layout(sm`a -> b;`)).toBe('dot');
      expect(graph_layout(sm`graph_layout: circo; a -> b;`)).toBe('circo');
    });
  });



  describe('dot_preamble', () => {
    test('is the declared preamble, or undefined', () => {
      expect(dot_preamble(sm`dot_preamble: "x -> y;"; a -> b;`)).toBe('x -> y;');
      expect(dot_preamble(sm`a -> b;`)).toBeUndefined();
    });
  });



  describe('default_transition_config', () => {
    test('is the compiled transition block, or undefined', () => {
      expect(default_transition_config(sm`a -> b; transition: { color: blue; };`))
        .toStrictEqual([ { key: 'color', value: '#0000ffff' } ]);
      expect(default_transition_config(sm`a -> b;`)).toBeUndefined();
    });
  });



  describe('default_graph_config', () => {
    test('is the compiled graph block', () => {
      expect(default_graph_config(sm`a -> b; graph: { background-color: #ffffff; };`))
        .toStrictEqual([ { key: 'background-color', value: '#ffffffff' } ]);
    });
  });



  describe('all_themes', () => {
    test('lists the shipped theme names regardless of the machine', () => {
      const names = all_themes(sm`a -> b;`);
      expect(names).toContain('default');
      expect(names).toContain('ocean');
      expect(names).toStrictEqual(all_themes(sm`x -> y;`));
    });
  });



  describe('themes / set_themes', () => {

    test('defaults to the default theme and round-trips a single name as a one-element array', () => {
      const m = sm`a -> b;`;
      expect(themes(m)).toStrictEqual(['default']);
      set_themes(m, 'ocean');
      expect(themes(m)).toStrictEqual(['ocean']);
      expect(m.themes).toStrictEqual(['ocean']);
    });

    test('round-trips an array', () => {
      const m = sm`a -> b;`;
      set_themes(m, ['ocean', 'bold']);
      expect(themes(m)).toStrictEqual(['ocean', 'bold']);
    });

    test('the theme directive is readable', () => {
      expect(themes(sm`theme: ocean; a -> b;`)).toStrictEqual(['ocean']);
    });

  });



  describe('flow', () => {
    test('defaults to down and follows the directive', () => {
      expect(flow(sm`a -> b;`)).toBe('down');
      expect(flow(sm`flow: left; a -> b;`)).toBe('left');
    });
  });



  describe('the six *_state_style accessors', () => {

    test('are empty on a machine with no style blocks', () => {
      const m = sm`a -> b;`;
      expect(standard_state_style(m)).toStrictEqual({});
      expect(hooked_state_style(m)).toStrictEqual({});
      expect(start_state_style(m)).toStrictEqual({});
      expect(end_state_style(m)).toStrictEqual({});
      expect(terminal_state_style(m)).toStrictEqual({});
      expect(active_state_style(m)).toStrictEqual({});
    });

    test('each returns exactly its declared block', () => {
      const m = sm`
        a -> b;
        state:          { shape: circle;   };
        hooked_state:   { shape: box;      };
        start_state:    { shape: oval;     };
        end_state:      { shape: diamond;  };
        terminal_state: { shape: hexagon;  };
        active_state:   { shape: triangle; };
      `;
      expect(standard_state_style(m)).toStrictEqual({ shape: 'circle'   });
      expect(hooked_state_style(m)).toStrictEqual(  { shape: 'box'      });
      expect(start_state_style(m)).toStrictEqual(   { shape: 'oval'     });
      expect(end_state_style(m)).toStrictEqual(     { shape: 'diamond'  });
      expect(terminal_state_style(m)).toStrictEqual({ shape: 'hexagon'  });
      expect(active_state_style(m)).toStrictEqual(  { shape: 'triangle' });
    });

    test('agree with the class getters', () => {
      const m = sm`a -> b; state: { shape: circle; }; active_state: { color: red; };`;
      expect(standard_state_style(m)).toStrictEqual(m.standard_state_style);
      expect(active_state_style(m)).toStrictEqual(m.active_state_style);
    });

  });



  describe('resolve_state_config', () => {

    test('a plain state is painted white by the default theme and cadetblue1 once the theme is ocean (cache busting)', () => {
      const m = sm`a -> b -> c -> a;`;
      expect(resolve_state_config(m, 'b').backgroundColor).toBe('white');
      set_themes(m, 'ocean');
      expect(resolve_state_config(m, 'b').backgroundColor).toBe('cadetblue1');
    });

    test('the current state carries the active_state overlay, and it moves with the machine', () => {
      const m = sm`a -> b -> c -> a; state: { shape: box; }; active_state: { shape: circle; };`;
      expect(resolve_state_config(m, 'b').shape).toBe('box');
      go(m, 'b');
      expect(resolve_state_config(m, 'b').shape).toBe('circle');
      expect(resolve_state_config(m, 'c').shape).toBe('box');
    });

    test('group metadata applies to the group members only', () => {
      const m = sm`&busy : [working]; idle 'go' -> working -> done -> idle; state &busy : { color: orange; };`;
      expect(resolve_state_config(m, 'working').color).toBe('#ffa500ff');
      expect(resolve_state_config(m, 'done').color).not.toBe('#ffa500ff');
    });

    test('the hooked layer joins once a hook touches the state (cache busting)', () => {
      const m = sm`a -> b -> c -> a; hooked_state: { corners: rounded; };`;
      expect(resolve_state_config(m, 'b').corners).toBeUndefined();
      hook(m, 'b', 'c', () => true);
      expect(resolve_state_config(m, 'b').corners).toBe('rounded');
    });

    test('per-state config wins over the theme', () => {
      const m = sm`a -> b -> c -> a; state b : { background-color: red; };`;
      expect(resolve_state_config(m, 'b').backgroundColor).toBe('#ff0000ff');
    });

  });



  describe('the kind predicates the cascade used to reach through the class', () => {
    // compose_state_config now calls the query / hooks family functions
    // directly, so the class delegates it used to route through are pinned
    // here against the functions, on a machine where every kind is distinct.
    test('the class delegates and the family functions agree for start, end, terminal, and hooked', () => {
      const m = sm`a -> b -> c -> d; end_states: [c];`;
      hook(m, 'b', 'c', () => true);
      for (const s of ['a', 'b', 'c', 'd']) {
        expect(m.is_start_state(s)).toBe(is_start_state(m, s));
        expect(m.is_end_state(s)).toBe(is_end_state(m, s));
        expect(m.state_is_terminal(s)).toBe(state_is_terminal(m, s));
        expect(m.state_has_hooks(s)).toBe(state_has_hooks(m, s));
      }
      expect(m.is_start_state('a')).toBe(true);
      expect(m.is_end_state('c')).toBe(true);
      expect(m.is_end_state('d')).toBe(false);
      expect(m.state_is_terminal('d')).toBe(true);
      expect(m.state_has_hooks('b')).toBe(true);
      expect(m.state_has_hooks('a')).toBe(false);
    });
  });



  describe('style_for', () => {
    test('equals resolve_state_config for every state, current or not', () => {
      const m = sm`a -> b -> c -> a; state: { shape: box; }; active_state: { shape: circle; };`;
      for (const s of ['a', 'b', 'c']) {
        expect(style_for(m, s)).toStrictEqual(resolve_state_config(m, s));
        expect(style_for(m, s)).toStrictEqual(m.style_for(s));
      }
    });
  });



  describe('transfer_state_properties', () => {

    test('folds the declaration list onto the declaration record and returns it', () => {
      const decl = {
        state        : 'a',
        declarations : [
          { key: 'shape',          value: 'circle' },
          { key: 'color',          value: 'red'    },
          { key: 'line-style',     value: 'dashed' },
          { key: 'state-label',    value: 'Aye'    },
          { key: 'state_property', name: 'p', value: 3 },
        ]
      } as any;
      const out = transfer_state_properties(decl);
      expect(out).toBe(decl);
      expect(out.shape).toBe('circle');
      expect(out.color).toBe('red');
      expect(out.lineStyle).toBe('dashed');
      expect(out.stateLabel).toBe('Aye');
      expect(out.property).toStrictEqual({ name: 'p', value: 3 });
    });

    test('throws a JssmError on an unknown key', () => {
      expect(() => transfer_state_properties({ state: 'a', declarations: [ { key: 'bogus', value: 1 } ] } as any)).toThrow(JssmError);
    });

  });



  describe('state_style_condense', () => {

    test('remaps kebab-case keys to the config fields', () => {
      expect(state_style_condense([
        { key: 'color',      value: 'red'    },
        { key: 'shape',      value: 'oval'   },
        { key: 'line-style', value: 'dashed' }
      ] as any)).toStrictEqual({ color: 'red', shape: 'oval', lineStyle: 'dashed' });
    });

    test('undefined condenses to an empty config', () => {
      expect(state_style_condense(undefined)).toStrictEqual({});
    });

    test('rejects a redefined key, a non-object item, and a non-array', () => {
      expect(() => state_style_condense([ { key: 'color', value: 'red' }, { key: 'color', value: 'blue' } ] as any)).toThrow(JssmError);
      expect(() => state_style_condense([ 'color' ] as any)).toThrow(JssmError);
      expect(() => state_style_condense('color' as any)).toThrow(JssmError);
    });

  });

});
