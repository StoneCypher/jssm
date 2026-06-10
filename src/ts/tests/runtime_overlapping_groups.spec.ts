
/* eslint-disable max-len */

/**
 * Runtime tests for the "Overlapping State Groups" feature (Task 3a): the
 * membership-query API (`isIn`, `groupsOf`, `groups`, `statesIn`) and the
 * unified per-state config cascade (`resolve_state_config` / `style_for`),
 * including depth-ordered group metadata, the never-throwing cross-tier merge,
 * and the dynamic `active_state` overlay.
 *
 * These exercise real `sm` / `from` machines end-to-end — no fakes, no
 * snapshots.  Membership assertions compare against `Set`/array contents;
 * cascade assertions read concrete style fields out of `style_for`.
 *
 * Out of scope (parked for Task 3b / Task 4): boundary-hook FIRING and viz
 * cluster rendering.  Hooks are only stored at compile/construct time here.
 */

import { sm, from } from '../jssm';

import { JssmError } from '../jssm_error';





describe('overlapping state groups — membership queries (Task 3a)', () => {


  describe('isIn', () => {

    test('false when the current state is not a member', () => {
      const m = sm`&busy : [working]; idle 'go' -> working;`;
      expect(m.state()).toBe('idle');
      expect(m.isIn('busy')).toBe(false);
    });

    test('true when the current state is a direct member', () => {
      const m = sm`&busy : [working]; idle 'go' -> working;`;
      m.action('go');
      expect(m.state()).toBe('working');
      expect(m.isIn('busy')).toBe(true);
    });

    test('true through nested membership (deep)', () => {
      // `a` is in &inner directly and &outer via the nest; current state is `a`.
      const m = sm`&inner : [a]; &outer : [&inner b]; a -> b;`;
      expect(m.state()).toBe('a');
      expect(m.isIn('inner')).toBe(true);
      expect(m.isIn('outer')).toBe(true);
    });

    test('true through spread membership (deep)', () => {
      const m = sm`&inner : [a]; &outer : [...&inner b]; a -> b;`;
      expect(m.state()).toBe('a');
      expect(m.isIn('outer')).toBe(true);
    });

    test('false for an undeclared group rather than throwing', () => {
      const m = sm`&busy : [working]; idle 'go' -> working;`;
      m.action('go');
      expect(m.isIn('nonesuch')).toBe(false);
    });

  });


  describe('groupsOf', () => {

    test('returns the deep set of containing groups', () => {
      const m = sm`&inner : [a]; &outer : [&inner b]; a -> b;`;
      expect(m.groupsOf('a')).toEqual(new Set(['inner', 'outer']));
    });

    test('a directly-and-only-outer member maps to just the outer group', () => {
      const m = sm`&inner : [a]; &outer : [&inner b]; a -> b;`;
      expect(m.groupsOf('b')).toEqual(new Set(['outer']));
    });

    test('spread membership is included deeply', () => {
      const m = sm`&inner : [a]; &outer : [...&inner b]; a -> b;`;
      expect(m.groupsOf('a')).toEqual(new Set(['inner', 'outer']));
    });

    test('empty set for a state that is in no group', () => {
      const m = sm`&g : [a]; a -> b -> z;`;
      expect(m.groupsOf('z')).toEqual(new Set());
    });

    test('empty set for a state name that appears in no group at all', () => {
      const m = sm`a -> b;`;
      expect(m.groupsOf('a')).toEqual(new Set());
    });

    test('returns a fresh Set (mutating it does not corrupt the machine)', () => {
      const m = sm`&g : [a]; a -> b;`;
      const s = m.groupsOf('a');
      s.add('intruder');
      expect(m.groupsOf('a')).toEqual(new Set(['g']));
      expect(m.isIn('g')).toBe(true);
    });

  });


  describe('groups', () => {

    test('lists declared group names in declaration order', () => {
      const m = sm`&first : [a]; &second : [b]; a -> b;`;
      expect(m.groups()).toEqual(['first', 'second']);
    });

    test('declaration order is preserved even when reversed alphabetically', () => {
      const m = sm`&zebra : [a]; &apple : [b]; a -> b;`;
      expect(m.groups()).toEqual(['zebra', 'apple']);
    });

    test('empty array for a machine with no groups', () => {
      const m = sm`a -> b;`;
      expect(m.groups()).toEqual([]);
    });

    test('returns a fresh array (mutating it does not corrupt the machine)', () => {
      const m = sm`&g : [a]; a -> b;`;
      const g = m.groups();
      g.push('intruder');
      expect(m.groups()).toEqual(['g']);
    });

  });


  describe('statesIn', () => {

    test('returns transitive members in declaration order', () => {
      const m = sm`&inner : [a b]; &outer : [&inner c]; a -> b -> c;`;
      expect(m.statesIn('outer')).toEqual(['a', 'b', 'c']);
      expect(m.statesIn('inner')).toEqual(['a', 'b']);
    });

    test('spread members are flattened just like nested members', () => {
      const m = sm`&inner : [a b]; &outer : [...&inner c]; a -> b -> c;`;
      expect(m.statesIn('outer')).toEqual(['a', 'b', 'c']);
    });

    test('throws a JssmError on an undeclared group', () => {
      const m = sm`&g : [a]; a -> b;`;
      expect(() => m.statesIn('nonesuch')).toThrow(JssmError);
    });

  });


});





describe('overlapping state groups — unified config cascade (Task 3a)', () => {


  // The compiler normalizes the SVG color `orange` to this 8-digit hex; the
  // existing state-style suite pins the same value, so it is stable to assert.
  const ORANGE = '#ffa500ff';
  const RED     = '#ff0000ff';
  const BLUE    = '#0000ffff';
  const GREEN   = '#008000ff';


  test('group metadata flows onto a member state via style_for', () => {
    const m = sm`&busy : [working]; idle 'go' -> working; state &busy : { color: orange; };`;
    expect(m.style_for('working').color).toBe(ORANGE);
  });


  test('resolve_state_config is the same surface as style_for', () => {
    const m = sm`&busy : [working]; idle 'go' -> working; state &busy : { color: orange; };`;
    expect(m.resolve_state_config('working').color).toBe(ORANGE);
  });


  test('group metadata reaches a deep (nested) member', () => {
    const m = sm`&inner : [a]; &outer : [&inner b]; a -> b; state &outer : { color: orange; };`;
    expect(m.style_for('a').color).toBe(ORANGE);
  });


  test('per-state config beats group metadata', () => {
    // `a` is in &busy (orange) but its own `state a` block sets blue; blue wins.
    const m = sm`
      &busy : [a];
      a -> b;
      state &busy : { color: orange; };
      state a    : { color: blue;   };
    `;
    expect(m.style_for('a').color).toBe(BLUE);
  });


  test('inner group beats outer group (nesting depth)', () => {
    // `a` is in both &inner (distance 1) and &outer (distance 2); inner wins.
    const m = sm`
      &inner : [a];
      &outer : [&inner b];
      a -> b;
      state &outer : { color: red;  };
      state &inner : { color: blue; };
    `;
    expect(m.style_for('a').color).toBe(BLUE);
  });


  test('equal-depth group conflict breaks by declaration order (later wins)', () => {
    // `a` is a direct member of both &one and &two (both distance 1); the
    // later-declared &two wins the tie.
    const m = sm`
      &one : [a];
      &two : [a];
      a -> b;
      state &one : { color: red;  };
      state &two : { color: blue; };
    `;
    expect(m.style_for('a').color).toBe(BLUE);
  });


  test('the implicit state:{} block is the base, overridden by a group', () => {
    const m = sm`
      &busy : [a];
      a -> b;
      state      : { color: red;    };
      state &busy : { color: orange; };
    `;
    // group beats the state:{} root
    expect(m.style_for('a').color).toBe(ORANGE);
    // a non-member keeps the state:{} root value
    expect(m.style_for('b').color).toBe(RED);
  });


  test('theme defaults sit below everything (state:{} overrides them)', () => {
    // base theme sets backgroundColor white for plain states; state:{} overrides.
    // `b` is a non-terminal, non-start, non-end plain state so only the base
    // theme + state:{} root apply (no kind layer competes).
    const themed   = sm`a -> b -> c; state : { background-color: green; };`;
    const unthemed = sm`a -> b -> c;`;
    expect(themed.style_for('b').backgroundColor).toBe(GREEN);
    // sanity: the base theme really would have provided a different value
    expect(unthemed.style_for('b').backgroundColor).not.toBe(GREEN);
  });


  test('a key set at state:{} and overridden by state foo:{} does NOT throw', () => {
    // Across-tier override is later-wins, not the single-block redefine error.
    expect(() => sm`
      a -> b;
      state   : { color: red;  };
      state a : { color: blue; };
    `).not.toThrow();

    const m = sm`
      a -> b;
      state   : { color: red;  };
      state a : { color: blue; };
    `;
    expect(m.style_for('a').color).toBe(BLUE);
  });


  test('a redefine WITHIN one condensed declaration block still throws', () => {
    // The `state:{}`, `active_state:{}`, and group-metadata blocks all condense
    // through state_style_condense, which rejects an intra-block key redefine.
    expect(() => sm`a -> b; state : { color: red; color: blue; };`).toThrow();
    expect(() => sm`a -> b; active_state : { color: red; color: blue; };`).toThrow();
    expect(() => sm`&g : [a]; a -> b; state &g : { color: red; color: blue; };`).toThrow();
  });


  describe('active_state overlay (tier 6)', () => {

    test('applies to the current state and disappears after transitioning away', () => {
      const m = sm`
        idle 'go' -> working 'back' -> idle;
        active_state : { color: orange; };
      `;
      // idle is current → overlay present
      expect(m.style_for('idle').color).toBe(ORANGE);
      // working is not current → no overlay
      expect(m.style_for('working').color).toBeUndefined();

      m.action('go');
      expect(m.state()).toBe('working');
      // overlay has moved to working; idle no longer carries it
      expect(m.style_for('working').color).toBe(ORANGE);
      expect(m.style_for('idle').color).toBeUndefined();
    });

    test('the active overlay wins over per-state config on the current state', () => {
      const m = sm`
        idle 'go' -> working;
        state idle   : { color: blue;   };
        active_state : { color: orange; };
      `;
      // idle is current: active overlay (orange) beats per-state (blue)
      expect(m.style_for('idle').color).toBe(ORANGE);
      m.action('go');
      // idle no longer current: its per-state blue shows through
      expect(m.style_for('idle').color).toBe(BLUE);
    });

  });


  test('from() with overlapping groups exposes the same membership + cascade', () => {
    const m = from('&busy : [working]; idle \'go\' -> working; state &busy : { color: orange; };');
    expect(m.groups()).toEqual(['busy']);
    expect(m.statesIn('busy')).toEqual(['working']);
    expect(m.style_for('working').color).toBe(ORANGE);
  });


});
