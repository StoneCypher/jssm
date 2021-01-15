
const r639 = require('reduce-to-639-1').reduce;





test('should be en', () =>
  expect(r639('EnglISh')).toBe('en') );

test('should be am', () =>
  expect(r639('አማርኛ')).toBe('am') );

test('should be undef when wrong str', () =>
  expect( r639('xyzzy') ).toBe(undefined) );

test('should be undef when empty str', () =>
  expect( r639('') ).toBe(undefined) );

test.todo('commented out r639 things');

// describe(`r639 _`, async it => it('should be undef when unnamed',   t => t.throws( async() => r639()      )));
// describe(`r639 _`, async it => it('should be undef when false',     t => t.throws( async() => r639(false) )));
