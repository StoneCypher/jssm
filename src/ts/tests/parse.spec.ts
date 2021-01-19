
/* eslint-disable max-len */

import * as jssm from '../jssm';





describe('parse/1', () => {

  describe('forward arrow', () => {

    const AtoB = [{"key": "transition", "from": "a", "se": {"kind": "->","to": "b"}}],
          AdB  = [{"key": "transition", "from": "a", "se": {"kind": "->","to": "b","l_desc": [{"key":"arc_label","value":"d"}]}}],
          ABd  = [{"key": "transition", "from": "a", "se": {"kind": "->","to": "b","r_desc": [{"key":"arc_label","value":"d"}]}}],
          AdBd = [{"key": "transition", "from": "a", "se": {"kind": "->","to": "b","l_desc": [{"key":"arc_label","value":"d"}],"r_desc": [{"key":"arc_label","value":"f"}]}}];

    const echo_equal = (testt, validator) =>
      test(testt, () =>
        expect(jssm.parse(testt))
          .toEqual(validator) );

    const ShouldEqualAtoB = ['a->b;', 'a ->b;', 'a-> b;', 'a -> b;', 'a{}->b;', 'a->{}b;', 'a{}->{}b;'];
    ShouldEqualAtoB.map(p => echo_equal(p, AtoB));

    echo_equal('a{arc_label:d;}->b;',               AdB);
    echo_equal('a{arc_label:"d";}->b;',             AdB);
    echo_equal('a->{arc_label:d;}b;',               ABd);
    echo_equal('a{arc_label:d;}->{arc_label:f;}b;', AdBd);

  });

  describe('double arrow', () => {

    const AtoB = [{"key": "transition", "from": "a", "se": {"kind": "<->","to": "b"}}],
          AdB  = [{"key": "transition", "from": "a", "se": {"kind": "<->","to": "b","l_desc": [{"key":"arc_label","value":"d"}]}}],
          ABd  = [{"key": "transition", "from": "a", "se": {"kind": "<->","to": "b","r_desc": [{"key":"arc_label","value":"d"}]}}],
          AdBd = [{"key": "transition", "from": "a", "se": {"kind": "<->","to": "b","l_desc": [{"key":"arc_label","value":"d"}],"r_desc": [{"key":"arc_label","value":"f"}]}}];

    const echo_equal = (testt, validator) =>
      test(testt, () =>
        expect(jssm.parse(testt))
          .toEqual(validator) );

    const ShouldEqualAtoB = ['a<->b;', 'a <->b;', 'a<-> b;', 'a <-> b;', 'a{}<->b;', 'a<->{}b;', 'a{}<->{}b;'];
    ShouldEqualAtoB.map(p => echo_equal(p, AtoB));

    echo_equal('a{arc_label:d;}<->b;',               AdB);
    echo_equal('a{arc_label:"d";}<->b;',             AdB);
    echo_equal('a<->{arc_label:d;}b;',               ABd);
    echo_equal('a{arc_label:d;}<->{arc_label:f;}b;', AdBd);

  });

  describe('chain', () => {
    const AtoBtoC = [{"key":"transition","from":"a","se":{"kind":"->","to":"b","se":{"kind":"->","to":"c"}}}];
    test('a->b->c;', () =>
      expect( jssm.parse('a->b->c;') )
        .toEqual(AtoBtoC) );
  });

  describe('sequence', () => {
    const AtoB_CtoD = [{"key":"transition","from":"a","se":{"kind":"->","to":"b"}},{"key":"transition","from":"c","se":{"kind":"->","to":"d"}}];
    test('a->b;c->d;', () =>
      expect( jssm.parse('a->b;c->d;') )
        .toEqual(AtoB_CtoD) );
  });

  test.todo('graph inputs, graph outputs in parse.spec');

  // todo: graph: {inputs: [foo]}
  // todo: graph: {outputs: [foo]}

  test.todo('improve torture in parse.spec');

  describe('torture', () => {

    const augh = `
      a->b-> c-> d -> e
->
f <- g <= h <-> i <=> j ~> k <~ l <~> m <~-> n <-~> o <=~> p <~=> q <-=> r <=-> s 'A' <= 'B' t;

a ← b2 ⇐ c2 ↚ d2 → e2 ⇒ f2 ↛ g2 ↔ h2 ⇔ i2 ↮ j2 ←⇒ k2 ⇐→ l2 ←↛ m2 ↚→ n2 ⇐↛ o2 ↚⇒ p2;

`;

    test('doesn\'t throw', () => expect(() => { jssm.parse(augh); }).not.toThrow() );

  });

});

// stochable
