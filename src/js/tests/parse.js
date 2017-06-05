
import {test, describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js');





describe('parse/1', async it => {

    describe('forward arrow', async it => {

      const AtoB = [{"from": "a","se": {"kind": "->","to": "b"}}],
            AdB  = [{"from": "a","se": {"kind": "->","to": "b","ldesc": [{"text":"c","value":"d"}]}}],
            ABd  = [{"from": "a","se": {"kind": "->","to": "b","rdesc": [{"text":"c","value":"d"}]}}],
            AdBd = [{"from": "a","se": {"kind": "->","to": "b","ldesc": [{"text":"c","value":"d"}],"rdesc": [{"text":"e","value":"f"}]}}];

      it('a->b;',   t => t.deepEqual(AtoB, jssm.parse('a->b;')   ));
      it('a ->b;',  t => t.deepEqual(AtoB, jssm.parse('a ->b;')  ));
      it('a-> b;',  t => t.deepEqual(AtoB, jssm.parse('a-> b;')  ));
      it('a -> b;', t => t.deepEqual(AtoB, jssm.parse('a -> b;') ));

      it('a{}->b;',   t => t.deepEqual(AtoB, jssm.parse('a{}->b;')   ));
      it('a->{}b;',   t => t.deepEqual(AtoB, jssm.parse('a->{}b;')   ));
      it('a{}->{}b;', t => t.deepEqual(AtoB, jssm.parse('a{}->{}b;') ));

      it('a{c:d}->b;',     t => t.deepEqual(AdB,  jssm.parse('a{c:d;}->b;')       ));
      it('a{c:"d"}->b;',   t => t.deepEqual(AdB,  jssm.parse('a{c:"d";}->b;')     ));
      it('a{"c":d}->b;',   t => t.deepEqual(AdB,  jssm.parse('a{"c":d;}->b;')     ));
      it('a{"c":"d"}->b;', t => t.deepEqual(AdB,  jssm.parse('a{"c":"d";}->b;')   ));
      it('a{c:d}->b;',     t => t.deepEqual(ABd,  jssm.parse('a->{c:d;}b;')       ));
      it('a{c:d}->b;',     t => t.deepEqual(AdBd, jssm.parse('a{c:d;}->{e:f;}b;') ));

    });

    describe('double arrow', async it => {

      const AtoB = [{"from": "a","se": {"kind": "<->","to": "b"}}],
            AdB  = [{"from": "a","se": {"kind": "<->","to": "b","ldesc": [{"text":"c","value":"d"}]}}],
            ABd  = [{"from": "a","se": {"kind": "<->","to": "b","rdesc": [{"text":"c","value":"d"}]}}],
            AdBd = [{"from": "a","se": {"kind": "<->","to": "b","ldesc": [{"text":"c","value":"d"}],"rdesc": [{"text":"e","value":"f"}]}}];

      it('a<->b;',   t => t.deepEqual(AtoB, jssm.parse('a<->b;')   ));
      it('a <->b;',  t => t.deepEqual(AtoB, jssm.parse('a <->b;')  ));
      it('a<-> b;',  t => t.deepEqual(AtoB, jssm.parse('a<-> b;')  ));
      it('a <-> b;', t => t.deepEqual(AtoB, jssm.parse('a <-> b;') ));

      it('a{}<->b;',   t => t.deepEqual(AtoB, jssm.parse('a{}<->b;')   ));
      it('a<->{}b;',   t => t.deepEqual(AtoB, jssm.parse('a<->{}b;')   ));
      it('a{}<->{}b;', t => t.deepEqual(AtoB, jssm.parse('a{}<->{}b;') ));

      it('a{c:d}<->b;',     t => t.deepEqual(AdB,  jssm.parse('a{c:d;}<->b;')       ));
      it('a{c:"d"}<->b;',   t => t.deepEqual(AdB,  jssm.parse('a{c:"d";}<->b;')     ));
      it('a{"c":d}<->b;',   t => t.deepEqual(AdB,  jssm.parse('a{"c":d;}<->b;')     ));
      it('a{"c":"d"}<->b;', t => t.deepEqual(AdB,  jssm.parse('a{"c":"d";}<->b;')   ));
      it('a{c:d}<->b;',     t => t.deepEqual(ABd,  jssm.parse('a<->{c:d;}b;')       ));
      it('a{c:d}<->b;',     t => t.deepEqual(AdBd, jssm.parse('a{c:d;}<->{e:f;}b;') ));

    });

    describe('chain', async it => {
      const AtoBtoC = [{"from":"a","se":{"kind":"->","to":"b","se":{"kind":"->","to":"c"}}}];
      it('a->b->c;', t => t.deepEqual(AtoBtoC, jssm.parse('a->b->c;') ));
    });

    describe('sequence', async it => {
      const AtoB_CtoD = [{"from":"a","se":{"kind":"->","to":"b"}},{"from":"c","se":{"kind":"->","to":"d"}}];
      it('a->b;c->d;', t => t.deepEqual(AtoB_CtoD, jssm.parse('a->b;c->d;') ));
    });

});

// stochable
