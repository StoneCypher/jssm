
/* eslint-disable max-len */

import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.cjs.js');





describe('parse/1', async _parse_it => {

    describe('forward arrow', async it => {

      const AtoB = [{"key": "transition", "from": "a", "se": {"kind": "->","to": "b"}}],
            AdB  = [{"key": "transition", "from": "a", "se": {"kind": "->","to": "b","l_desc": [{"key":"arc_label","value":"d"}]}}],
            ABd  = [{"key": "transition", "from": "a", "se": {"kind": "->","to": "b","r_desc": [{"key":"arc_label","value":"d"}]}}],
            AdBd = [{"key": "transition", "from": "a", "se": {"kind": "->","to": "b","l_desc": [{"key":"arc_label","value":"d"}],"r_desc": [{"key":"arc_label","value":"f"}]}}];

      const echo_equal = (testt, validator) => it(testt, t => t.deepEqual(validator, jssm.parse(testt)));

      const ShouldEqualAtoB = ['a->b;', 'a ->b;', 'a-> b;', 'a -> b;', 'a{}->b;', 'a->{}b;', 'a{}->{}b;'];
      ShouldEqualAtoB.map(p => echo_equal(p, AtoB));

      echo_equal('a{arc_label:d;}->b;',               AdB);
      echo_equal('a{arc_label:"d";}->b;',             AdB);
      echo_equal('a->{arc_label:d;}b;',               ABd);
      echo_equal('a{arc_label:d;}->{arc_label:f;}b;', AdBd);

    });

    describe('double arrow', async it => {

      const AtoB = [{"key": "transition", "from": "a", "se": {"kind": "<->","to": "b"}}],
            AdB  = [{"key": "transition", "from": "a", "se": {"kind": "<->","to": "b","l_desc": [{"key":"arc_label","value":"d"}]}}],
            ABd  = [{"key": "transition", "from": "a", "se": {"kind": "<->","to": "b","r_desc": [{"key":"arc_label","value":"d"}]}}],
            AdBd = [{"key": "transition", "from": "a", "se": {"kind": "<->","to": "b","l_desc": [{"key":"arc_label","value":"d"}],"r_desc": [{"key":"arc_label","value":"f"}]}}];

      const echo_equal = (testt, validator) => it(testt, t => t.deepEqual(validator, jssm.parse(testt)));

      const ShouldEqualAtoB = ['a<->b;', 'a <->b;', 'a<-> b;', 'a <-> b;', 'a{}<->b;', 'a<->{}b;', 'a{}<->{}b;'];
      ShouldEqualAtoB.map(p => echo_equal(p, AtoB));

      echo_equal('a{arc_label:d;}<->b;',               AdB);
      echo_equal('a{arc_label:"d";}<->b;',             AdB);
      echo_equal('a<->{arc_label:d;}b;',               ABd);
      echo_equal('a{arc_label:d;}<->{arc_label:f;}b;', AdBd);

    });

    describe('chain', async it => {
      const AtoBtoC = [{"key":"transition","from":"a","se":{"kind":"->","to":"b","se":{"kind":"->","to":"c"}}}];
      it('a->b->c;', t => t.deepEqual(AtoBtoC, jssm.parse('a->b->c;') ));
    });

    describe('sequence', async it => {
      const AtoB_CtoD = [{"key":"transition","from":"a","se":{"kind":"->","to":"b"}},{"key":"transition","from":"c","se":{"kind":"->","to":"d"}}];
      it('a->b;c->d;', t => t.deepEqual(AtoB_CtoD, jssm.parse('a->b;c->d;') ));
    });

    // todo: graph: {inputs: [foo]}
    // todo: graph: {outputs: [foo]}

    describe('torture', async it => {

      const augh = `
      a->b-> c-> d -> e
->
f <- g <= h <-> i <=> j ~> k <~ l <~> m <~-> n <-~> o <=~> p <~=> q <-=> r <=-> s 'A' <= 'B' t;

a ← b2 ⇐ c2 ↚ d2 → e2 ⇒ f2 ↛ g2 ↔ h2 ⇔ i2 ↮ j2 ←⇒ k2 ⇐→ l2 ←↛ m2 ↚→ n2 ⇐↛ o2 ↚⇒ p2;

`;

      it('doesn\'t throw', t => t.notThrows(() => { jssm.parse(augh); }) );

    });

});

// stochable
