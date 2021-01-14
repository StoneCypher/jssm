
import {describe} from 'ava-spec';

const r639 = require('reduce-to-639-1').reduce;





describe(`r639 e`, async it => it('should be en', t => t.is('en', r639('EnglISh'))));
describe(`r639 a`, async it => it('should be am', t => t.is('am', r639('አማርኛ'))));

describe(`r639 _`, async it => it('should be undef when empty str', t => t.is( undefined, r639('') )));

// describe(`r639 _`, async it => it('should be undef when unnamed',   t => t.throws( async() => r639()      )));
// describe(`r639 _`, async it => it('should be undef when false',     t => t.throws( async() => r639(false) )));
