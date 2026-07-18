
import { from } from '../jssm';

// remove_hook used to delete handlers without recomputing the `_has_*`
// fast-path flags, so a family's flag stayed `true` after its last hook was
// gone.  Most of that was a standing perf cost, but `_has_transition_hooks`
// staying true was observably wrong: transition_impl kept resolving
// `trans_type` and injecting it into every hook context.  StoneCypher/fsl#1954

type FlagView = {
  _has_hooks                 : boolean;
  _has_basic_hooks           : boolean;
  _has_named_hooks           : boolean;
  _has_entry_hooks           : boolean;
  _has_transition_hooks      : boolean;
  _has_post_hooks            : boolean;
  _has_post_transition_hooks : boolean;
};

const flags = (m: unknown): FlagView => m as unknown as FlagView;

describe('remove_hook recomputes the _has_* fast-path flags (StoneCypher/fsl#1954)', () => {

  test('the observable bug: trans_type no longer leaks after the last transition hook is removed', () => {
    const m = from('a => b;', {});
    const h = (): boolean => true;

    m.hook_standard_transition(h);
    m.remove_hook({ kind: 'standard transition', handler: h });   // last transition-kind hook gone

    let seen: unknown = 'unset';
    m.hook_any_transition(ctx => { seen = ctx.trans_type; return true; });
    m.transition('b');

    expect(seen).toBeUndefined();      // was 'main' before the fix (docs: undefined w/ no transition-kind hook)
  });

  test('_has_transition_hooks flips back to false when the last transition hook is removed', () => {
    const m = from('a => b;', {});
    const h = (): boolean => true;

    m.hook_standard_transition(h);
    expect(flags(m)._has_transition_hooks).toBe(true);

    m.remove_hook({ kind: 'standard transition', handler: h });
    expect(flags(m)._has_transition_hooks).toBe(false);
  });

  test('_has_hooks returns to false once the last hook of any kind is removed', () => {
    const m = from('a -> b; a -> c;', {});
    const h = (): boolean => true;

    m.hook('a', 'b', h);
    expect(flags(m)._has_hooks).toBe(true);
    expect(flags(m)._has_basic_hooks).toBe(true);

    m.remove_hook({ kind: 'hook', from: 'a', to: 'b', handler: h });
    expect(flags(m)._has_hooks).toBe(false);
    expect(flags(m)._has_basic_hooks).toBe(false);
  });

  test('_has_hooks stays true while another family still has a hook', () => {
    const m = from('a -> b; a -> c;', {});
    const h = (): boolean => true;

    m.hook('a', 'b', h);
    m.hook_entry('b', h);

    m.remove_hook({ kind: 'hook', from: 'a', to: 'b', handler: h });   // basic gone, entry remains
    expect(flags(m)._has_basic_hooks).toBe(false);
    expect(flags(m)._has_entry_hooks).toBe(true);
    expect(flags(m)._has_hooks).toBe(true);
  });

  test('named hooks: a recompute with a named hook present keeps _has_named_hooks true, then clears it', () => {
    const m = from('a -> b; a -> c;', {});
    const h = (): boolean => true;

    m.hook_action('a', 'b', 'act', h);       // a named hook
    m.hook('a', 'c', h);                      // and a basic hook

    // Removing the basic hook triggers a recompute while _named_hooks is non-empty.
    m.remove_hook({ kind: 'hook', from: 'a', to: 'c', handler: h });
    expect(flags(m)._has_named_hooks).toBe(true);
    expect(flags(m)._has_hooks).toBe(true);

    m.remove_hook({ kind: 'named', from: 'a', to: 'b', action: 'act', handler: h });
    expect(flags(m)._has_named_hooks).toBe(false);
    expect(flags(m)._has_hooks).toBe(false);
  });

  test('post hooks mirror the behavior', () => {
    const m = from('a => b;', {});
    const h = (): boolean => true;

    m.post_hook_standard_transition(h);
    expect(flags(m)._has_post_hooks).toBe(true);
    expect(flags(m)._has_post_transition_hooks).toBe(true);

    m.remove_hook({ kind: 'post standard transition', handler: h });
    expect(flags(m)._has_post_hooks).toBe(false);
    expect(flags(m)._has_post_transition_hooks).toBe(false);
  });

});
