
/* eslint-disable max-len */

import * as jssm     from '../jssm';
import { JssmError } from '../jssm_error';

const sm = jssm.sm;





describe('compile/1', () => {

  describe('a->b;', () => {
    const a_to_b_str = `a->b;`;
    test('doesn\'t throw', () => expect( () => {
      jssm.compile(jssm.parse(a_to_b_str));
    }).not.toThrow() );
  });

  describe('a->b->c;', () => {
    const a_to_b_to_c_str = `a->b->c;`;
    test('doesn\'t throw', () => expect( () => {
      jssm.compile(jssm.parse(a_to_b_to_c_str));
    }).not.toThrow() );
  });

  describe('template tokens', () => {
    const a_through_e_token_str = `a->${'b'}->c->${'d'}->e;`;
    test('doesn\'t throw', () => expect( () => {
      jssm.compile(jssm.parse(a_through_e_token_str));
    }).not.toThrow() );
  });

  describe('all arrows', () => {
    const all_arrows = `a -> b => c ~> d <-> e <=> f <~> g <-=> h <=-> i <~-> j <-~> k <=~> l <~=> m <- n <= o <~ p;`;
    test('doesn\'t throw', () => expect( () => {
      jssm.compile(jssm.parse(all_arrows));
    }).not.toThrow() );
  });

  describe('all unicode arrows', () => {
    const all_arrows = `a ← b ⇐ c ↚ d → e ⇒ f ↛ g ↔ h ⇔ i ↮ j ←⇒ k ⇐→ l ←↛ m ↚→ n ⇐↛ o ↚⇒ p;`;
    test('doesn\'t throw', () => expect( () => {
      jssm.compile(jssm.parse(all_arrows));
    }).not.toThrow() );
  });

  // A transition-free document (natural while authoring states-first) must
  // fail with a deliberate, readable JssmError — not the internal TypeError
  // it used to crash with — because the editor's lint surfaces this message
  // verbatim on every keystroke.  A machine with no transitions cannot be
  // constructed, so compile is the right place to say so clearly.
  describe('transition-free machines', () => {

    describe('state Off : {};', () => {
      const state_only_str = `state Off : {};`;
      test('throws JssmError', () => expect( () => {
        jssm.compile(jssm.parse(state_only_str));
      }).toThrow(JssmError) );
      test('names the problem', () => expect( () => {
        jssm.compile(jssm.parse(state_only_str));
      }).toThrow(/no transitions/) );
    });

    describe('several state blocks, still no transitions', () => {
      const blocks_only_str = `state Off : {}; state On : {};`;
      test('throws JssmError', () => expect( () => {
        jssm.compile(jssm.parse(blocks_only_str));
      }).toThrow(JssmError) );
    });

  });

  describe('direct make callpoint', () => {
    const match = { start_states: [ 'a' ], end_states: [], failed_outputs: [], transitions: [ { from: 'a', to: 'b', kind: 'legal', after_time: undefined, forced_only: false, main_path: false } ], state_property: [] };
    test('direct match', () => {
      expect(jssm.make('a->b;')).toStrictEqual(match);
    })
  });

});





describe('error catchery', () => {

  test.todo('uncomment the compile spec tests once they\'re understood');

  describe('unknown rule', () => {
    test('throws', () => expect( () => {
      jssm.compile( [{"key":"FAKE_RULE","from":"a","se":{"kind":"->","to":"b"}}] as any );
    } ).toThrow() );
  });

  describe('unnamed state_declaration', () => {
    test('throws', () => expect( () => {
      jssm.compile( [{"key":"state_declaration"}] as any );
    } ).toThrow() );
  });

  describe('unknown state property', () => {
    test('throws', () => expect( () => {
      sm`a->b; c: { foo: red; };`;
    } ).toThrow() );
  });

  describe('direct make failure throws', () => {
    test('direct match', () => {
      expect( () => jssm.make('kaboom')).toThrow();
    })
  });

});

// stochable
