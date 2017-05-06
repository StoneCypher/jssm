
import test from 'ava';

const jssm = require('../../build/jssm.es5.js');





test('build-set version number is present', t => t.is(typeof jssm.version, 'string'));

// build 200 tests that delay up to 3 sec each.  completes in 3 sec because they're all
// being run in parallel

const seq = upTo => new Array(upTo).fill(false).map( (_,i) => i );

/*
seq(200).map(i => test(`Delay test ${i}`, t =>
  new Promise( (res, rej) => setTimeout(() => { t.true(); res('res'); }, Math.random() * 3000))) );
*/





function promise_delay(how_long, f) {
	return new Promise( (resolve, reject) => setTimeout( () => { resolve(f()); }, how_long ) );
}

seq(3000).map(i =>
	test(`Delay test ${i}`, t => promise_delay(Math.random() * 5000, () => { t.is(1,1); return 'res'; }))
);





test('bar', async t => {
	const bar = Promise.resolve('bar');
	t.is(await bar, 'bar');
});
