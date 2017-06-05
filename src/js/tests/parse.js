
import {test, describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js');





describe('parse/1', async it => {

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

// stochable
