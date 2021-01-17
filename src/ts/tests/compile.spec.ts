
/* eslint-disable max-len */

import * as jssm from '../jssm';

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

});





describe('error catchery', () => {

  test.todo('uncomment the compile spec tests once they\'re understood');

  // describe('unknown rule', () => {
  //   test('throws', () => expect( () => {
  //     jssm.compile( [{"key":"FAKE_RULE","from":"a","se":{"kind":"->","to":"b"}}] );
  //   } ).toThrow() );
  // });

  // describe('unnamed state_declaration', () => {
  //   test('throws', () => expect( () => {
  //     jssm.compile( [{"key":"state_declaration"}] );
  //   } ).toThrow() );
  // });

  describe('unknown state property', () => {
    test('throws', () => expect( () => {
      sm`a->b; c: { foo: red; };`;
    } ).toThrow() );
  });

});

// stochable
