
import {test, describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js');





describe('parse/1', async it => {

    describe('forward arrow', async it => {

      const AtoB = [{"from": "a","se": {"kind": "->","to": "b"}}],
            AdB  = [{"from": "a","se": {"kind": "->","to": "b","ldesc": [{"key":"arc_label","value":"d"}]}}],
            ABd  = [{"from": "a","se": {"kind": "->","to": "b","rdesc": [{"key":"arc_label","value":"d"}]}}],
            AdBd = [{"from": "a","se": {"kind": "->","to": "b","ldesc": [{"key":"arc_label","value":"d"}],"rdesc": [{"key":"arc_label","value":"f"}]}}];

      const echo_equal = (test, validator) => it(test, t => t.deepEqual(validator, jssm.parse(test)));

      const ShouldEqualAtoB = ['a->b;', 'a ->b;', 'a-> b;', 'a -> b;', 'a{}->b;', 'a->{}b;', 'a{}->{}b;'];
      ShouldEqualAtoB.map(p => echo_equal(p, AtoB));

      echo_equal('a{arc_label:d;}->b;',               AdB);
      echo_equal('a{arc_label:"d";}->b;',             AdB);
      echo_equal('a->{arc_label:d;}b;',               ABd);
      echo_equal('a{arc_label:d;}->{arc_label:f;}b;', AdBd);

    });

    describe('double arrow', async it => {

      const AtoB = [{"from": "a","se": {"kind": "<->","to": "b"}}],
            AdB  = [{"from": "a","se": {"kind": "<->","to": "b","ldesc": [{"key":"arc_label","value":"d"}]}}],
            ABd  = [{"from": "a","se": {"kind": "<->","to": "b","rdesc": [{"key":"arc_label","value":"d"}]}}],
            AdBd = [{"from": "a","se": {"kind": "<->","to": "b","ldesc": [{"key":"arc_label","value":"d"}],"rdesc": [{"key":"arc_label","value":"f"}]}}];

      const echo_equal = (test, validator) => it(test, t => t.deepEqual(validator, jssm.parse(test)));

      const ShouldEqualAtoB = ['a<->b;', 'a <->b;', 'a<-> b;', 'a <-> b;', 'a{}<->b;', 'a<->{}b;', 'a{}<->{}b;'];
      ShouldEqualAtoB.map(p => echo_equal(p, AtoB));

      echo_equal('a{arc_label:d;}<->b;',               AdB);
      echo_equal('a{arc_label:"d";}<->b;',             AdB);
      echo_equal('a<->{arc_label:d;}b;',               ABd);
      echo_equal('a{arc_label:d;}<->{arc_label:f;}b;', AdBd);

    });

    describe('chain', async it => {
      const AtoBtoC = [{"from":"a","se":{"kind":"->","to":"b","se":{"kind":"->","to":"c"}}}];
      it('a->b->c;', t => t.deepEqual(AtoBtoC, jssm.parse('a->b->c;') ));
    });

    describe('sequence', async it => {
      const AtoB_CtoD = [{"from":"a","se":{"kind":"->","to":"b"}},{"from":"c","se":{"kind":"->","to":"d"}}];
      it('a->b;c->d;', t => t.deepEqual(AtoB_CtoD, jssm.parse('a->b;c->d;') ));
    });

    // todo: graph: {inputs: [foo]}
    // todo: graph: {outputs: [foo]}

});

// stochable
