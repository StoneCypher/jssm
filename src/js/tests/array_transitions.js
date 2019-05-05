
/* eslint-disable max-len */

import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.cjs.js');





describe('array on left', async it => {

  const aLeft = [
    {main_path: false,forced_only: false,"from":"a","to":"d","kind":"legal"},
    {main_path: false,forced_only: false,"from":"b","to":"d","kind":"legal"},
    {main_path: false,forced_only: false,"from":"c","to":"d","kind":"legal"}
  ];

  it('[a b c]->d;', t => t.deepEqual(aLeft, jssm.compile(jssm.parse('[a b c]->d;')).transitions ));

});





describe('array on right', async it => {

  const aRight = [
    {main_path: false,forced_only: false,"from":"a","to":"b","kind":"legal"},
    {main_path: false,forced_only: false,"from":"a","to":"c","kind":"legal"},
    {main_path: false,forced_only: false,"from":"a","to":"d","kind":"legal"}
  ];

  it('a->[b c d];', t => t.deepEqual(aRight, jssm.compile(jssm.parse('a->[b c d];')).transitions ));

});





describe('array on both sides', async it => {

  const aBoth = [
    {main_path: false,forced_only: false,"from":"a","to":"x","kind":"legal"},
    {main_path: false,forced_only: false,"from":"a","to":"y","kind":"legal"},
    {main_path: false,forced_only: false,"from":"a","to":"z","kind":"legal"},
    {main_path: false,forced_only: false,"from":"b","to":"x","kind":"legal"},
    {main_path: false,forced_only: false,"from":"b","to":"y","kind":"legal"},
    {main_path: false,forced_only: false,"from":"b","to":"z","kind":"legal"},
    {main_path: false,forced_only: false,"from":"c","to":"x","kind":"legal"},
    {main_path: false,forced_only: false,"from":"c","to":"y","kind":"legal"},
    {main_path: false,forced_only: false,"from":"c","to":"z","kind":"legal"}
  ];

  it('[a b c]->[x y z];', t => t.deepEqual(aBoth, jssm.compile(jssm.parse('[a b c]->[x y z];')).transitions ));

});
