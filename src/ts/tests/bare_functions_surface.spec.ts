/*******
 *
 *  The generative contract of the 6.0 bare-functions split: every public
 *  member of the 5.x `Machine` class has a function of the same name on the
 *  default `jssm` entry (getters as `name(m)`, setters as `set_name(m, v)`),
 *  and every function the eleven family files publish through the barrel is
 *  the very same function object the family exports.
 *
 *  The expectations are derived from the class's member NAMES and from the
 *  family modules' export lists, never from the functions' behavior, so this
 *  cannot become a fake test: if a delegate is left without a function, or a
 *  barrel line drops a name, a row goes red and says which.
 *
 *  Exclusions are the members that deliberately have no function form:
 *  `constructor`; the template-tag methods `sm` / `fsl` (the top-level
 *  factories cover them); `do` (a reserved word — `act` / `action` are the
 *  function forms, bare-functions design decision 5, StoneCypher/fsl#1992);
 *  `transition_impl` (a public-named `@internal` delegate); and every
 *  `_`-prefixed internal delegate (`_new_state`, `_data_ref`, `_fire`,
 *  `_fire_one`, `_has_subscribers`, `_fire_hook_rejection`,
 *  `_fire_boundary_actions`).
 *
 */

import { describe, test, expect } from 'vitest';

import * as jssm from '../jssm';
import { Machine } from '../compat';

import * as events     from '../machine/events';
import * as history    from '../machine/history';
import * as timers     from '../machine/timers';
import * as transition from '../machine/transition';
import * as hooks      from '../machine/hooks';
import * as data       from '../machine/data';
import * as query      from '../machine/query';
import * as stochastic from '../machine/stochastic';
import * as groups     from '../machine/groups';
import * as style      from '../machine/style';
import * as create     from '../machine/create';



const barrel = jssm as Record<string, unknown>;

/** Class members that have no function form on the default entry, by design. */
const EXCLUDED_MEMBERS: ReadonlySet<string> = new Set([
  'constructor', 'sm', 'fsl', 'do', 'transition_impl',
]);

/**
 *  Family exports the barrel deliberately does not list: the cross-family
 *  plumbing (dispatch, the constructor's helpers, the timer sources, the hook
 *  step internals).  Anything a family exports that is neither here nor on
 *  the barrel is a dropped name and fails the reverse-direction test.
 */
const MODULE_ONLY_EXPORTS: Readonly<Record<string, ReadonlySet<string>>> = {
  events     : new Set(['fire', 'fire_one', 'has_subscribers']),
  history    : new Set<string>(),
  timers     : new Set(['DEFAULT_TIME_SOURCE', 'DEFAULT_TIMEOUT_SOURCE', 'DEFAULT_CLEAR_TIMEOUT_SOURCE']),
  transition : new Set(['transition_impl', 'fire_hook_rejection', 'fire_boundary_actions']),
  hooks      : new Set(['hook_required_fields', 'hook_spatial_fields', 'update_hook_fields', 'HOOK_PASSED', 'HOOK_REJECTED']),
  data       : new Set(['data_ref', 'validate_val_value']),
  query      : new Set<string>(),
  stochastic : new Set<string>(),
  groups     : new Set(['groups_by_depth']),
  style      : new Set<string>(),
  create     : new Set(['new_state', 'find_connected_components']),
};

const FAMILIES: Readonly<Record<string, Record<string, unknown>>> = {
  events, history, timers, transition, hooks, data, query, stochastic, groups, style, create,
};



/** The class's public member names, each tagged with what kind of member it is. */
function public_members(): Array<{ name: string, kind: 'method' | 'getter' | 'setter' | 'accessor' }> {

  const out: Array<{ name: string, kind: 'method' | 'getter' | 'setter' | 'accessor' }> = [];

  for (const name of Object.getOwnPropertyNames(Machine.prototype)) {

    if (EXCLUDED_MEMBERS.has(name) || name.startsWith('_')) { continue; }

    const desc = Object.getOwnPropertyDescriptor(Machine.prototype, name);

    if (typeof desc.value === 'function') { out.push({ name, kind: 'method' }); continue; }

    const has_get = typeof desc.get === 'function',
          has_set = typeof desc.set === 'function';

    if (has_get && has_set) { out.push({ name, kind: 'accessor' }); }
    else if (has_get)       { out.push({ name, kind: 'getter'   }); }
    else if (has_set)       { out.push({ name, kind: 'setter'   }); }

  }

  return out;

}



describe('bare-functions surface: every public Machine member has a function form', () => {

  const members = public_members();

  test('the class exposes a non-trivial public surface to check', () => {
    // a sanity floor, so an accidentally empty prototype cannot pass vacuously;
    // the 5.x class carried well over a hundred public members
    expect(members.length).toBeGreaterThan(100);
  });

  test.each(members.filter(m => m.kind === 'method').map(m => m.name))(
    'method %s -> function %s(m, ...)',
    (name: string) => {
      expect(typeof barrel[name], `jssm.${name}`).toBe('function');
    }
  );

  test.each(members.filter(m => m.kind === 'getter').map(m => m.name))(
    'getter %s -> function %s(m)',
    (name: string) => {
      expect(typeof barrel[name], `jssm.${name}`).toBe('function');
    }
  );

  test.each(members.filter(m => m.kind === 'setter').map(m => m.name))(
    'setter-only %s -> function set_%s(m, v)',
    (name: string) => {
      expect(typeof barrel[`set_${name}`], `jssm.set_${name}`).toBe('function');
    }
  );

  test.each(members.filter(m => m.kind === 'accessor').map(m => m.name))(
    'getter+setter %s -> functions %s(m) and set_%s(m, v)',
    (name: string) => {
      expect(typeof barrel[name],           `jssm.${name}`).toBe('function');
      expect(typeof barrel[`set_${name}`],  `jssm.set_${name}`).toBe('function');
    }
  );

  test('the three accessor pairs of the 5.x class are all present as pairs', () => {
    // the class has exactly these getter+setter pairs; naming them keeps the
    // accessor branch above from passing on an empty list
    const pairs = members.filter(m => m.kind === 'accessor').map(m => m.name).sort((a, b) => a.localeCompare(b));
    expect(pairs).toEqual(['history_length', 'rng_seed', 'themes']);
  });

});



describe('bare-functions surface: act / action / do (decision 5)', () => {

  test('act is a function on the default entry', () => {
    expect(typeof jssm.act).toBe('function');
  });

  test('action is the same function object as act', () => {
    expect(jssm.action).toBe(jssm.act);
  });

  test('nothing named do is exported from the default entry', () => {
    expect('do' in jssm).toBe(false);
  });

  test('the class keeps do, act, and action as methods', () => {
    expect(typeof Machine.prototype.do).toBe('function');
    expect(typeof Machine.prototype.act).toBe('function');
    expect(typeof Machine.prototype.action).toBe('function');
  });

});



describe('bare-functions surface: every family export reaches the barrel with the same identity', () => {

  for (const [family_name, family] of Object.entries(FAMILIES)) {

    const module_only = MODULE_ONLY_EXPORTS[family_name];
    const names       = Object.keys(family).filter(n => !module_only.has(n));

    test(`${family_name} publishes at least one name through the barrel`, () => {
      expect(names.length).toBeGreaterThan(0);
    });

    test.each(names)(`${family_name}.%s is the barrel's %s`, (name: string) => {
      expect(Object.hasOwn(barrel, name), `barrel lacks ${family_name}.${name}`).toBe(true);
      expect(barrel[name]).toBe(family[name]);
    });

    test.each([...module_only])(`${family_name}.%s is module-only and stays off the barrel`, (name: string) => {
      expect(Object.hasOwn(family, name), `${family_name} no longer exports ${name}; update MODULE_ONLY_EXPORTS`).toBe(true);
      expect(Object.hasOwn(barrel, name)).toBe(false);
    });

  }

});
