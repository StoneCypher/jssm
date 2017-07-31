
/* eslint-disable max-len */

import {test, describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js');





describe('parse/1', async _parse_it => {

    describe('forward arrow', async it => {

      const AtoB = [{"key": "transition", "from": "a", "se": {"kind": "->","to": "b"}}],
            AdB  = [{"key": "transition", "from": "a", "se": {"kind": "->","to": "b","ldesc": [{"key":"arc_label","value":"d"}]}}],
            ABd  = [{"key": "transition", "from": "a", "se": {"kind": "->","to": "b","rdesc": [{"key":"arc_label","value":"d"}]}}],
            AdBd = [{"key": "transition", "from": "a", "se": {"kind": "->","to": "b","ldesc": [{"key":"arc_label","value":"d"}],"rdesc": [{"key":"arc_label","value":"f"}]}}];

      const echo_equal = (testt, validator) => it(test, t => t.deepEqual(validator, jssm.parse(testt)));

      const ShouldEqualAtoB = ['a->b;', 'a ->b;', 'a-> b;', 'a -> b;', 'a{}->b;', 'a->{}b;', 'a{}->{}b;'];
      ShouldEqualAtoB.map(p => echo_equal(p, AtoB));

      echo_equal('a{arc_label:d;}->b;',               AdB);
      echo_equal('a{arc_label:"d";}->b;',             AdB);
      echo_equal('a->{arc_label:d;}b;',               ABd);
      echo_equal('a{arc_label:d;}->{arc_label:f;}b;', AdBd);

    });

    describe('double arrow', async it => {

      const AtoB = [{"key": "transition", "from": "a", "se": {"kind": "<->","to": "b"}}],
            AdB  = [{"key": "transition", "from": "a", "se": {"kind": "<->","to": "b","ldesc": [{"key":"arc_label","value":"d"}]}}],
            ABd  = [{"key": "transition", "from": "a", "se": {"kind": "<->","to": "b","rdesc": [{"key":"arc_label","value":"d"}]}}],
            AdBd = [{"key": "transition", "from": "a", "se": {"kind": "<->","to": "b","ldesc": [{"key":"arc_label","value":"d"}],"rdesc": [{"key":"arc_label","value":"f"}]}}];

      const echo_equal = (testt, validator) => it(test, t => t.deepEqual(validator, jssm.parse(testt)));

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
      const augh = `a->b-> c-> d -> e;`;
      it('doesn\'t throw', t => t.notThrows(() => { jssm.parse(augh); }) );
    });

});

// stochable
