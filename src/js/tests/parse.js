
import {test, describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js');





describe('parse/1', async it => {

  it('a->b;',   t => t.deepEqual([],    jssm.parse('a->b;')   ));
  it('a ->b;',  t => t.deepEqual([0],   jssm.parse('a ->b;')  ));
  it('a-> b;',  t => t.deepEqual([0,1], jssm.parse('a-> b;')  ));
  it('a -> b;', t => t.deepEqual([0,1], jssm.parse('a -> b;') ));

  it('a{}->b;',   t => t.deepEqual([],    jssm.parse('a{}->b;')   ));
  it('a->{}b;',   t => t.deepEqual([0],   jssm.parse('a->{}b;')   ));
  it('a{}->{}b;', t => t.deepEqual([0,1], jssm.parse('a{}->{}b;') ));

  it('a{c:d}->b;',     t => t.deepEqual([], jssm.parse('a{c:d;}->b;')       ));
  it('a{c:"d"}->b;',   t => t.deepEqual([], jssm.parse('a{c:"d";}->b;')     ));
  it('a{"c":d}->b;',   t => t.deepEqual([], jssm.parse('a{"c":d;}->b;')     ));
  it('a{"c":"d"}->b;', t => t.deepEqual([], jssm.parse('a{"c":"d";}->b;')   ));
  it('a{c:d}->b;',     t => t.deepEqual([], jssm.parse('a->{c:d;}b;')       ));
  it('a{c:d}->b;',     t => t.deepEqual([], jssm.parse('a{c:d;}->{e:f;}b;') ));

});

// stochable
