
import test from 'ava';

const jssm = require('../../build/jssm.es5.amd.js');





test('foo', t => {
    t.pass();
});

test('bar', async t => {
    const bar = Promise.resolve('bar');

    t.is(await bar, 'bar');
});
