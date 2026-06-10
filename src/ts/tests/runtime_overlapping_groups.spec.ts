
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





describe('overlapping state groups — boundary-hook firing (Task 3b)', () => {


  describe('group onEnter / onExit', () => {

    test('onEnter fires its action on entering a group from outside', () => {
      // `work` is in &busy; entering &busy dispatches action 'leave', which is
      // valid from `work` and sends the machine back to `idle`.  The observable
      // effect is the machine having bounced back out: final state is `idle`.
      const m = sm`&busy : [work]; idle 'go' -> work 'leave' -> idle; on enter &busy do 'leave';`;
      expect(m.state()).toBe('idle');

      m.action('go');               // idle -> work (enters &busy) -> fires 'leave' -> idle
      expect(m.state()).toBe('idle');
    });

    test('onEnter dispatches the named action (observed via a global-action hook)', () => {
      // Independent of any resulting transition: prove `this.action(label)` was
      // actually dispatched by watching the global-action hook for that label.
      let fired = 0;
      const m = sm`&busy : [work]; idle 'go' -> work 'leave' -> idle; on enter &busy do 'leave';`;
      m.hook_global_action('leave', () => { fired += 1; });

      m.action('go');
      expect(fired).toBe(1);
    });

    test('onExit fires its action on leaving a group to outside', () => {
      // Crossing OUT of &busy (work -> idle) dispatches 'mark', which is a valid
      // self-loop action on idle; a global-action hook records the dispatch.
      // The self-loop keeps the state name unchanged, so it fires no further
      // boundary hooks.
      let exited = 0;
      const m = sm`&busy : [work]; idle 'go' -> work 'back' -> idle; idle 'mark' -> idle; on exit &busy do 'mark';`;
      m.hook_global_action('mark', () => { exited += 1; });

      m.action('go');               // idle -> work : enters &busy, no exit
      expect(exited).toBe(0);

      m.action('back');             // work -> idle : exits &busy -> fires 'mark'
      expect(exited).toBe(1);
      expect(m.state()).toBe('idle');
    });

    test('a transition WITHIN a group does NOT fire that group\'s boundary hooks', () => {
      // Both `a` and `b` are in &g, so a -> b stays inside &g and must fire
      // neither onEnter nor onExit for &g.
      let entered = 0, exited = 0;
      const m = sm`&g : [a b]; a 'go' -> b; on enter &g do 'noop_in'; on exit &g do 'noop_out';`;
      m.hook_global_action('noop_in',  () => { entered += 1; });
      m.hook_global_action('noop_out', () => { exited  += 1; });

      m.action('go');               // a -> b, both in &g — within-group move
      expect(m.state()).toBe('b');
      expect(entered).toBe(0);
      expect(exited).toBe(0);
    });

  });


  describe('multi-membership and nesting', () => {

    test('a state in groups A and B fires BOTH groups\' onEnter', () => {
      // `target` is a direct member of both &a and &b; entering it must fire
      // each group's onEnter.  The two fired actions chain (a_in: target->mid,
      // then b_in: mid->done), so a final state of `done` proves both fired,
      // in exit-before-enter order with A before B (declaration order).
      let aIn = 0, bIn = 0;
      const m = sm`
        &a : [target];
        &b : [target];
        start 'go' -> target 'a_in' -> mid 'b_in' -> done;
        on enter &a do 'a_in';
        on enter &b do 'b_in';
      `;
      m.hook_global_action('a_in', () => { aIn += 1; });
      m.hook_global_action('b_in', () => { bIn += 1; });

      m.action('go');               // -> target (in &a,&b): fires a_in then b_in
      expect(aIn).toBe(1);
      expect(bIn).toBe(1);
      expect(m.state()).toBe('done');
    });

    test('crossing inner + outer boundaries fires both levels', () => {
      // `a` is in &inner (directly) and &outer (via the nest).  Entering `a`
      // from a non-member crosses both boundaries and fires both onEnters.
      // The two fired actions chain so the final state proves both fired.
      let innerIn = 0, outerIn = 0;
      const m = sm`
        &inner : [a];
        &outer : [&inner b];
        start 'go' -> a 'inner_in' -> mid 'outer_in' -> done;
        on enter &inner do 'inner_in';
        on enter &outer do 'outer_in';
      `;
      m.hook_global_action('inner_in', () => { innerIn += 1; });
      m.hook_global_action('outer_in', () => { outerIn += 1; });

      m.action('go');               // start -> a : enters &inner AND &outer
      expect(innerIn).toBe(1);
      expect(outerIn).toBe(1);
      expect(m.state()).toBe('done');
    });

    test('moving from an inner member to an outer-only member fires only the inner boundary', () => {
      // a (in &inner and &outer) -> b (in &outer only): &outer is in both group
      // sets so it does not fire; only &inner is exited.
      let innerOut = 0, outerOut = 0, outerIn = 0;
      const m = sm`
        &inner : [a];
        &outer : [&inner b];
        a 'go' -> b;
        b 'inner_out' -> b;
        on exit  &inner do 'inner_out';
        on exit  &outer do 'outer_out';
        on enter &outer do 'outer_in';
      `;
      m.hook_global_action('inner_out', () => { innerOut += 1; });
      m.hook_global_action('outer_out', () => { outerOut += 1; });
      m.hook_global_action('outer_in',  () => { outerIn  += 1; });

      m.action('go');               // a -> b : exits &inner; stays within &outer
      expect(innerOut).toBe(1);
      expect(outerOut).toBe(0);
      expect(outerIn).toBe(0);
      expect(m.state()).toBe('b');
    });

  });


  describe('plain-state boundary hooks', () => {

    test('on enter foo fires on entering state foo', () => {
      // 'note' is a valid self-loop on foo, so the boundary firing is observed
      // via its global-action hook without perturbing the state name.
      let entered = 0;
      const m = sm`a 'go' -> foo; foo 'note' -> foo; on enter foo do 'note';`;
      m.hook_global_action('note', () => { entered += 1; });

      expect(m.state()).toBe('a');
      m.action('go');               // a -> foo : enters foo
      expect(entered).toBe(1);
      expect(m.state()).toBe('foo');
    });

    test('on exit foo fires on leaving state foo', () => {
      // 'note' is a valid self-loop on bar (the state we just entered).
      let exited = 0;
      const m = sm`foo 'go' -> bar; bar 'note' -> bar; on exit foo do 'note';`;
      m.hook_global_action('note', () => { exited += 1; });

      expect(m.state()).toBe('foo');
      m.action('go');               // foo -> bar : exits foo
      expect(exited).toBe(1);
      expect(m.state()).toBe('bar');
    });

  });


  describe('safety', () => {

    test('an inapplicable boundary action is a safe no-op (no throw)', () => {
      // 'nope' is never a declared action, so dispatching it from the new state
      // is invalid; the boundary firing must swallow that as a no-op.
      const m = sm`&g : [b]; a 'go' -> b; on enter &g do 'nope';`;
      expect(() => m.action('go')).not.toThrow();
      expect(m.state()).toBe('b');
    });

    test('a boundary action that is invalid from the new state does not move the machine', () => {
      // 'back' is valid from b, but the boundary fires it as the entry to &g;
      // here we choose an action ('teleport') that exists in the FSL but is not
      // available from b, so it is a no-op and the machine stays in b.
      const m = sm`&g : [b]; a 'go' -> b; c 'teleport' -> a; on enter &g do 'teleport';`;
      m.action('go');
      expect(m.state()).toBe('b');
    });

    test('boundary firing also occurs on override across a boundary', () => {
      // override is an out-of-graph state set; it must still fire the boundary
      // hooks for the groups it crosses.  'note' is a valid self-loop on b.
      let entered = 0;
      const m = sm`allows_override: true; &g : [b]; a -> b; b 'note' -> b; on enter &g do 'note';`;
      m.hook_global_action('note', () => { entered += 1; });

      m.override('b');              // jumps into &g out-of-graph
      expect(m.state()).toBe('b');
      expect(entered).toBe(1);
    });

  });


  describe('loop protection', () => {

    test('an unbounded boundary cascade throws JssmError rather than hanging', () => {
      // &g enter -> 'toh' (moves to h, entering &h); &h enter -> 'tog' (moves
      // back to g, entering &g); ... a ping-pong with no fixed point.  The
      // depth guard must convert this into a thrown JssmError, fast.
      const m = sm`
        &g : [g];
        &h : [h];
        start 'go' -> g;
        g 'toh' -> h 'tog' -> g;
        on enter &g do 'toh';
        on enter &h do 'tog';
      `;
      expect(() => m.action('go')).toThrow(JssmError);
    });

    test('the loop-protection error names the cascade as the cause', () => {
      const m = sm`
        &g : [g];
        &h : [h];
        start 'go' -> g;
        g 'toh' -> h 'tog' -> g;
        on enter &g do 'toh';
        on enter &h do 'tog';
      `;
      expect(() => m.action('go')).toThrow(/cascade|depth limit|infinite/i);
    });

    test('a deep-but-finite cascade under the cap completes normally', () => {
      // start -> a enters &one (fires 'step' -> b), b enters &two (fires 'step2'
      // -> c).  Two nested boundary hops, well under the limit; ends in `c`.
      const m = sm`
        &one : [a];
        &two : [b];
        start 'go' -> a 'step' -> b 'step2' -> c;
        on enter &one do 'step';
        on enter &two do 'step2';
      `;
      expect(() => m.action('go')).not.toThrow();
      expect(m.state()).toBe('c');
    });

  });


});
