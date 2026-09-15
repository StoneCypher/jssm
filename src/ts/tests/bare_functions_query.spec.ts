
import { describe, test, expect } from 'vitest';

import {
  sm, from as sm_from, create, go, act, JssmError,
  state, label_for, display_text,
  is_start_state, is_end_state,
  failed_outputs, is_failed_output, is_failed,
  state_is_final, is_final, canonical,
  machine_author, machine_comment, machine_contributor, machine_definition,
  machine_language, machine_license, machine_name,
  editor_config, npm_name, default_size, machine_version,
  raw_state_declarations, state_declaration, state_declarations,
  fsl_version, machine_state,
  states, state_for, has_state,
  list_edges, list_named_transitions, list_actions,
  uses_actions, uses_forced_transitions,
  code_allows_override, config_allows_override, allows_override, allow_islands,
  all_state_name_chars, all_state_name_first_chars, all_action_label_chars,
  get_transition_by_state_names, lookup_transition_for,
  list_transitions, list_entrances, list_exits,
  actions, list_states_having_action, list_exit_actions, probable_action_exits,
  is_unenterable, has_unenterables,
  is_terminal, state_is_terminal, has_terminals,
  is_complete, state_is_complete, has_completes,
  edges_between, current_action_for, current_action_edge_for
} from '../jssm';





// Direct tests of the query family as bare functions.  Every expected value
// is readable from the FSL text (or the config literal) the test builds the
// machine from.

const in_range = (table: ReadonlyArray<{ from: string, to: string }>, ch: string): boolean =>
  table.some(r => ch >= r.from && ch <= r.to);



describe('bare functions — query family', () => {



  describe('state', () => {

    test('is the first mentioned state on a fresh machine and follows transitions', () => {
      const m = sm`on <=> off;`;
      expect(state(m)).toBe('on');
      go(m, 'off');
      expect(state(m)).toBe('off');
    });

    test('agrees with the class method', () => {
      const m = sm`a -> b;`;
      go(m, 'b');
      expect(state(m)).toBe(m.state());
    });

  });



  describe('label_for and display_text', () => {

    const m = sm`a -> b; state a: { label: "Foo!"; };`;

    test('label_for is the declared label, or undefined', () => {
      expect(label_for(m, 'a')).toBe('Foo!');
      expect(label_for(m, 'b')).toBeUndefined();
    });

    test('display_text is the label when there is one, otherwise the state name', () => {
      expect(display_text(m, 'a')).toBe('Foo!');
      expect(display_text(m, 'b')).toBe('b');
    });

  });



  describe('is_start_state and is_end_state', () => {

    test('is_start_state is true for the first mentioned state only, by default', () => {
      const m = sm`a -> b;`;
      expect(is_start_state(m, 'a')).toBe(true);
      expect(is_start_state(m, 'b')).toBe(false);
    });

    test('is_start_state honors a declared start_states list', () => {
      const m = sm`start_states: [a b]; a -> b -> c;`;
      expect(is_start_state(m, 'a')).toBe(true);
      expect(is_start_state(m, 'b')).toBe(true);
      expect(is_start_state(m, 'c')).toBe(false);
    });

    test('is_end_state reflects the declared end_states list', () => {
      const m = sm`end_states: [c]; a -> b -> c;`;
      expect(is_end_state(m, 'a')).toBe(false);
      expect(is_end_state(m, 'c')).toBe(true);
    });

  });



  describe('failed_outputs, is_failed_output, is_failed', () => {

    test('failed_outputs is empty when none were declared', () => {
      expect(failed_outputs(sm`a -> b;`)).toStrictEqual([]);
    });

    test('failed_outputs lists the declared states', () => {
      expect(failed_outputs(sm`failed_outputs: [dead error]; a -> b -> dead -> error;`)).toStrictEqual(['dead', 'error']);
    });

    test('is_failed_output tests one state', () => {
      const m = sm`failed_outputs: dead; a -> b -> dead;`;
      expect(is_failed_output(m, 'dead')).toBe(true);
      expect(is_failed_output(m, 'a')).toBe(false);
    });

    test('is_failed tests the current state', () => {
      const m = sm`failed_outputs: dead; a -> dead;`;
      expect(is_failed(m)).toBe(false);
      go(m, 'dead');
      expect(is_failed(m)).toBe(true);
    });

  });



  describe('state_is_final and is_final', () => {

    test('a state with no exits is final; one with exits is not', () => {
      const m = sm`first -> second;`;
      expect(state_is_final(m, 'first')).toBe(false);
      expect(state_is_final(m, 'second')).toBe(true);
    });

    test('a complete state with exits is final', () => {
      const m = sm_from('a -> b -> c;', { complete: ['b'] });
      expect(state_is_final(m, 'b')).toBe(true);
      expect(state_is_final(m, 'a')).toBe(false);
    });

    test('is_final tracks the current state', () => {
      const m = sm`first -> second;`;
      expect(is_final(m)).toBe(false);
      go(m, 'second');
      expect(is_final(m)).toBe(true);
    });

  });



  describe('canonical', () => {

    test('names the current state and data', () => {
      const m = sm_from('a -> b;', { data: 5 });
      expect(canonical(m)).toContain('"state":"a"');
      expect(canonical(m)).toContain('"data":5');
      go(m, 'b');
      expect(canonical(m)).toContain('"state":"b"');
    });

  });



  describe('machine attribute accessors', () => {

    test('machine_author', () => {
      expect(machine_author(sm`machine_author: [bob dobbs]; a -> b;`)).toStrictEqual(['bob', 'dobbs']);
    });

    test('machine_comment', () => {
      expect(machine_comment(sm`machine_comment: "hello there"; a -> b;`)).toBe('hello there');
    });

    test('machine_contributor', () => {
      expect(machine_contributor(sm`machine_contributor: [bob "do bbs"]; a -> b;`)).toStrictEqual(['bob', 'do bbs']);
    });

    test('machine_definition', () => {
      expect(machine_definition(sm`machine_definition: https://example.com/ ; a -> b;`)).toBe('https://example.com/');
    });

    test('machine_language resolves a language name to its ISO 639-1 code', () => {
      expect(machine_language(sm`machine_language: english; a -> b;`)).toBe('en');
    });

    test('machine_license', () => {
      expect(machine_license(sm`machine_license: MIT; a -> b;`)).toBe('MIT');
    });

    test('machine_name', () => {
      expect(machine_name(sm`machine_name: "bo b"; a -> b;`)).toBe('bo b');
    });

    test('editor_config is the declared editor block, or undefined', () => {
      expect(editor_config(sm`editor: { panels: [history]; }; a -> b;`)).toStrictEqual({ panels: ['history'] });
      expect(editor_config(sm`a -> b;`)).toBeUndefined();
    });

    test('npm_name', () => {
      expect(npm_name(sm`npm_name: "my-package"; a -> b;`)).toBe('my-package');
      expect(npm_name(sm`a -> b;`)).toBeUndefined();
    });

    test('default_size takes the three FSL forms', () => {
      expect(default_size(sm`default_size: 800; a -> b;`)).toStrictEqual({ width: 800 });
      expect(default_size(sm`default_size: 800 600; a -> b;`)).toStrictEqual({ width: 800, height: 600 });
      expect(default_size(sm`default_size: height 600; a -> b;`)).toStrictEqual({ height: 600 });
      expect(default_size(sm`a -> b;`)).toBeUndefined();
    });

    test('machine_version is the parsed semver', () => {
      expect(machine_version(sm`machine_version: 1.2.3; a -> b;`)).toStrictEqual({ major: 1, minor: 2, patch: 3, full: '1.2.3' });
      expect(machine_version(sm`a -> b;`)).toBeUndefined();
    });

    test('fsl_version is the parsed semver', () => {
      expect(fsl_version(sm`fsl_version: 1.0.0; a -> b;`)).toStrictEqual({ major: 1, minor: 0, patch: 0, full: '1.0.0' });
      expect(fsl_version(sm`a -> b;`)).toBeUndefined();
    });

  });



  describe('state declarations', () => {

    const m = sm`a -> b; state a: { shape: circle; };`;

    test('raw_state_declarations holds one entry per declared state', () => {
      expect(raw_state_declarations(m).length).toBe(1);
      expect(raw_state_declarations(sm`a -> b;`)).toStrictEqual([]);
    });

    test('state_declaration returns the processed declaration for a state, or undefined', () => {
      expect(state_declaration(m, 'a').state).toBe('a');
      expect(state_declaration(m, 'a').shape).toBe('circle');
      expect(state_declaration(m, 'b')).toBeUndefined();
    });

    test('state_declarations is the map of every processed declaration', () => {
      expect([...state_declarations(m).keys()]).toStrictEqual(['a']);
      expect(state_declarations(m).get('a')).toBe(state_declaration(m, 'a'));
    });

  });



  describe('machine_state', () => {

    test('snapshots the internal tables and the current state', () => {
      const m = sm`a 'go' -> b;`;
      const snap = machine_state(m);
      expect(snap.internal_state_impl_version).toBe(1);
      expect(snap.state).toBe('a');
      expect([...snap.states.keys()]).toStrictEqual(['a', 'b']);
      expect(snap.edges.length).toBe(1);
      expect([...snap.actions.keys()]).toStrictEqual(['go']);
    });

  });



  describe('states, state_for, has_state', () => {

    const m = sm`on <=> off;`;

    test('states lists every state', () => {
      expect(states(m)).toStrictEqual(['on', 'off']);
    });

    test('state_for returns the descriptor and throws JssmError for an unknown state', () => {
      expect(state_for(m, 'on').name).toBe('on');
      expect(state_for(m, 'on').to).toStrictEqual(['off']);
      expect(() => state_for(m, 'dance')).toThrow(JssmError);
    });

    test('has_state', () => {
      expect(has_state(m, 'off')).toBe(true);
      expect(has_state(m, 'dance')).toBe(false);
    });

  });



  describe('list_edges, list_named_transitions, list_actions', () => {

    test('list_edges lists every edge with its endpoints and action', () => {
      const m = sm`on 'toggle' <=> 'toggle' off;`;
      expect(list_edges(m).map(e => [e.from, e.to, e.action])).toStrictEqual([ ['on', 'off', 'toggle'], ['off', 'on', 'toggle'] ]);
    });

    test('list_named_transitions maps a named transition to its edge index', () => {
      const m = create({
        start_states : ['off'],
        transitions  : [ { name: 'turn_on', action: 'power_on', from: 'off', to: 'red', kind: 'legal', forced_only: false, main_path: false } ]
      });
      expect(list_named_transitions(m).get('turn_on')).toBe(0);
      expect(list_named_transitions(sm`a -> b;`).size).toBe(0);
    });

    test('list_actions lists every distinct action name', () => {
      expect(list_actions(sm`a 'go' -> b 'go' -> c 'back' -> a;`)).toStrictEqual(['go', 'back']);
      expect(list_actions(sm`a -> b;`)).toStrictEqual([]);
    });

  });



  describe('the getters as functions', () => {

    test('uses_actions', () => {
      expect(uses_actions(sm`a 'go' -> b;`)).toBe(true);
      expect(uses_actions(sm`a -> b;`)).toBe(false);
    });

    test('uses_forced_transitions', () => {
      expect(uses_forced_transitions(sm`a ~> b;`)).toBe(true);
      expect(uses_forced_transitions(sm`a -> b;`)).toBe(false);
    });

    test('code_allows_override reflects the FSL declaration', () => {
      expect(code_allows_override(sm`allows_override: true; a -> b;`)).toBe(true);
      expect(code_allows_override(sm`allows_override: false; a -> b;`)).toBe(false);
      expect(code_allows_override(sm`a -> b;`)).toBeUndefined();
    });

    test('config_allows_override reflects the runtime config', () => {
      expect(config_allows_override(sm_from('a -> b;', { allows_override: true }))).toBe(true);
      expect(config_allows_override(sm`a -> b;`)).toBeUndefined();
    });

    test('allows_override resolves code and config', () => {
      expect(allows_override(sm`allows_override: true; a -> b;`)).toBe(true);
      expect(allows_override(sm`allows_override: false; a -> b;`)).toBe(false);
      expect(allows_override(sm`a -> b;`)).toBe(false);
      expect(allows_override(sm_from('a -> b;', { allows_override: true }))).toBe(true);
      expect(allows_override(sm_from('allows_override: true; a -> b;', { allows_override: false }))).toBe(false);
    });

    test('allow_islands reflects the declaration and defaults to true', () => {
      expect(allow_islands(sm`a -> b;`)).toBe(true);
      expect(allow_islands(sm`allow_islands: false; a -> b;`)).toBe(false);
      expect(allow_islands(sm`allow_islands: with_start; a -> b;`)).toBe('with_start');
    });

    test('the class getters agree with the functions', () => {
      const m = sm`allows_override: true; a 'go' ~> b;`;
      expect(m.uses_actions).toBe(uses_actions(m));
      expect(m.uses_forced_transitions).toBe(uses_forced_transitions(m));
      expect(m.code_allows_override).toBe(code_allows_override(m));
      expect(m.config_allows_override).toBe(config_allows_override(m));
      expect(m.allows_override).toBe(allows_override(m));
      expect(m.allow_islands).toBe(allow_islands(m));
    });

  });



  describe('the character tables', () => {

    const m = sm`a -> b;`;

    test('all_state_name_chars admits underscore, letters, and digits, not plus', () => {
      const table = all_state_name_chars(m);
      expect(in_range(table, '_')).toBe(true);
      expect(in_range(table, 'q')).toBe(true);
      expect(in_range(table, '7')).toBe(true);
      expect(in_range(table, '+')).toBe(false);
    });

    test('all_state_name_first_chars admits underscore and letters but never a digit', () => {
      const table = all_state_name_first_chars(m);
      expect(in_range(table, '_')).toBe(true);
      expect(in_range(table, 'Q')).toBe(true);
      expect(in_range(table, '7')).toBe(false);
      expect(in_range(table, '+')).toBe(false);
    });

    test('all_action_label_chars admits a space but not the apostrophe', () => {
      const table = all_action_label_chars(m);
      expect(in_range(table, ' ')).toBe(true);
      expect(in_range(table, 'x')).toBe(true);
      expect(in_range(table, "'")).toBe(false);
    });

  });



  describe('get_transition_by_state_names and lookup_transition_for', () => {

    const m = sm`a -> b; a -> c;`;

    test('get_transition_by_state_names is the edge index, or undefined', () => {
      expect(get_transition_by_state_names(m, 'a', 'b')).toBe(0);
      expect(get_transition_by_state_names(m, 'a', 'c')).toBe(1);
      expect(get_transition_by_state_names(m, 'b', 'a')).toBeUndefined();
      expect(get_transition_by_state_names(m, 'zed', 'a')).toBeUndefined();
    });

    test('lookup_transition_for is the edge object, or undefined', () => {
      const e = lookup_transition_for(m, 'a', 'c');
      expect(e.from).toBe('a');
      expect(e.to).toBe('c');
      expect(lookup_transition_for(m, 'c', 'a')).toBeUndefined();
    });

  });



  describe('list_transitions, list_entrances, list_exits', () => {

    const source = `red 'next' -> green 'next' -> yellow 'next' -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;

    test('list_exits defaults to the current state', () => {
      const m = sm_from(source);
      expect(list_exits(m)).toStrictEqual(['green', 'off']);
      expect(list_exits(sm`a -> b; a -> c;`, 'a')).toStrictEqual(['b', 'c']);
    });

    test('list_exits of a terminal or unknown state is empty', () => {
      const m = sm`a -> b;`;
      expect(list_exits(m, 'b')).toStrictEqual([]);
      expect(list_exits(m, 'zed')).toStrictEqual([]);
    });

    test('list_entrances defaults to the current state', () => {
      const m = sm_from(source);
      expect(list_entrances(m)).toStrictEqual(['yellow', 'off']);
      expect(list_entrances(m, 'off')).toStrictEqual(['red', 'yellow', 'green']);
      expect(list_entrances(sm`a -> b;`, 'a')).toStrictEqual([]);
    });

    test('list_transitions pairs the two', () => {
      const m = sm_from(source);
      expect(list_transitions(m)).toStrictEqual({ entrances: ['yellow', 'off'], exits: ['green', 'off'] });
      expect(list_transitions(m, 'off')).toStrictEqual({ entrances: ['red', 'yellow', 'green'], exits: ['red'] });
    });

  });



  describe('actions, list_states_having_action, list_exit_actions, probable_action_exits', () => {

    const source = `red 'next' -> green 'next' -> yellow 'next' -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;

    test('actions defaults to the current state and follows it', () => {
      const m = sm_from(source);
      expect(actions(m)).toStrictEqual(['next', 'shutdown']);
      act(m, 'shutdown');
      expect(actions(m)).toStrictEqual(['start']);
      expect(actions(m, 'green')).toStrictEqual(['next', 'shutdown']);
    });

    test('actions is empty for a state without actions and throws JssmError for an unknown state', () => {
      const m = sm`a 'go' -> b; b -> c;`;
      expect(actions(m, 'b')).toStrictEqual([]);
      expect(() => actions(m, 'zed')).toThrow(JssmError);
    });

    test('list_states_having_action lists the sources of an action and throws for an unknown action', () => {
      const m = sm_from(source);
      expect(list_states_having_action(m, 'next')).toStrictEqual(['red', 'green', 'yellow']);
      expect(list_states_having_action(m, 'start')).toStrictEqual(['off']);
      expect(() => list_states_having_action(m, 'nope')).toThrow(JssmError);
    });

    test('list_exit_actions defaults to the current state, is empty without actions, throws for an unknown state', () => {
      const m = sm`a 'go' -> b; b -> c;`;
      expect(list_exit_actions(m)).toStrictEqual(['go']);
      expect(list_exit_actions(m, 'b')).toStrictEqual([]);
      expect(list_exit_actions(m, 'c')).toStrictEqual([]);
      expect(() => list_exit_actions(m, 'z')).toThrow(JssmError);
    });

    test('probable_action_exits lists action exits with their declared percent probability and share', () => {
      const m = sm`a 'go' 80% -> b; a 'stay' 20% -> a; c -> d;`;
      expect(probable_action_exits(m)).toStrictEqual([
        { action: 'go',   probability: 80, share: undefined },
        { action: 'stay', probability: 20, share: undefined }
      ]);
      expect(probable_action_exits(m, 'c')).toStrictEqual([]);
      expect(() => probable_action_exits(m, 'z')).toThrow(JssmError);
    });

  });



  describe('is_unenterable, has_unenterables', () => {

    test('a state with no entrances is unenterable', () => {
      const m = sm`a -> b; c -> b;`;
      expect(is_unenterable(m, 'a')).toBe(true);
      expect(is_unenterable(m, 'c')).toBe(true);
      expect(is_unenterable(m, 'b')).toBe(false);
      expect(() => is_unenterable(m, 'z')).toThrow(JssmError);
    });

    test('has_unenterables', () => {
      expect(has_unenterables(sm`a -> b;`)).toBe(true);
      expect(has_unenterables(sm`a <-> b;`)).toBe(false);
    });

  });



  describe('is_terminal, state_is_terminal, has_terminals', () => {

    test('state_is_terminal is true for a state with no exits and throws for an unknown one', () => {
      const m = sm`a -> b;`;
      expect(state_is_terminal(m, 'a')).toBe(false);
      expect(state_is_terminal(m, 'b')).toBe(true);
      expect(() => state_is_terminal(m, 'z')).toThrow(JssmError);
    });

    test('is_terminal tracks the current state', () => {
      const m = sm`a -> b;`;
      expect(is_terminal(m)).toBe(false);
      go(m, 'b');
      expect(is_terminal(m)).toBe(true);
    });

    test('has_terminals', () => {
      expect(has_terminals(sm`a -> b;`)).toBe(true);
      expect(has_terminals(sm`a <-> b;`)).toBe(false);
    });

  });



  describe('is_complete, state_is_complete, has_completes', () => {

    test('state_is_complete reflects the complete list and throws for an unknown state', () => {
      const m = sm_from('a -> b -> c;', { complete: ['b'] });
      expect(state_is_complete(m, 'a')).toBe(false);
      expect(state_is_complete(m, 'b')).toBe(true);
      expect(() => state_is_complete(m, 'z')).toThrow(JssmError);
    });

    test('is_complete tracks the current state', () => {
      const m = sm_from('a -> b -> c;', { complete: ['b'] });
      expect(is_complete(m)).toBe(false);
      go(m, 'b');
      expect(is_complete(m)).toBe(true);
    });

    test('has_completes', () => {
      expect(has_completes(sm_from('a -> b;', { complete: ['b'] }))).toBe(true);
      expect(has_completes(sm`a -> b;`)).toBe(false);
    });

  });



  describe('edges_between', () => {

    test('lists every edge between two states, in either direction separately', () => {
      const m = sm`a 'x' -> b; a 'y' -> b; b -> a;`;
      expect(edges_between(m, 'a', 'b').map(e => e.action)).toStrictEqual(['x', 'y']);
      expect(edges_between(m, 'b', 'a').map(e => e.action)).toStrictEqual([undefined]);
    });

    test('is empty for a terminal source, an unknown source, and an unknown target', () => {
      const m = sm`a -> b;`;
      expect(edges_between(m, 'b', 'a')).toStrictEqual([]);
      expect(edges_between(m, 'zed', 'a')).toStrictEqual([]);
      expect(edges_between(m, 'a', 'zed')).toStrictEqual([]);
    });

  });



  describe('current_action_for and current_action_edge_for', () => {

    const m = sm`a 'go' -> b 'back' -> a; a 'skip' -> c;`;

    test('current_action_for is the edge index from the current state, or undefined', () => {
      expect(current_action_for(m, 'go')).toBe(0);
      expect(current_action_for(m, 'skip')).toBe(2);
      expect(current_action_for(m, 'back')).toBeUndefined();
      expect(current_action_for(m, 'nope')).toBeUndefined();
    });

    test('current_action_edge_for is the edge object and throws JssmError otherwise', () => {
      expect(current_action_edge_for(m, 'go').to).toBe('b');
      expect(() => current_action_edge_for(m, 'back')).toThrow(JssmError);
      expect(() => current_action_edge_for(m, 'nope')).toThrow(JssmError);
    });

  });



});
