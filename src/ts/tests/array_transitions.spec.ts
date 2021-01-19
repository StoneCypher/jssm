
/* eslint-disable max-len */

import * as jssm from '../jssm';





describe('Array basics', () => {



  describe('array of one', () => {

    const aLeft = [
      {main_path: false,forced_only: false,"from":"a","to":"d","kind":"legal"}
    ];

    test('[a]->d;', () => expect( jssm.compile(jssm.parse('[a]->d;')).transitions ).toEqual(aLeft) );

  });



  describe('array of one', () => {

    const aLeft = [
      {main_path: false,forced_only: false,"from":"a","to":"d","kind":"legal"}
    ];

    test('[a]->d;', () => expect( jssm.compile(jssm.parse('[a]->d;')).transitions ).toEqual(aLeft) );

  });



});





describe('Array sides', () => {



  describe('array on left', () => {

    const aLeft = [
      {main_path: false,forced_only: false,"from":"a","to":"d","kind":"legal"},
      {main_path: false,forced_only: false,"from":"b","to":"d","kind":"legal"},
      {main_path: false,forced_only: false,"from":"c","to":"d","kind":"legal"}
    ];

    test('[a b c]->d;', () => expect( jssm.compile(jssm.parse('[a b c]->d;')).transitions ).toEqual(aLeft) );

  });



  describe('array on right', () => {

    const aRight = [
      {main_path: false,forced_only: false,"from":"a","to":"b","kind":"legal"},
      {main_path: false,forced_only: false,"from":"a","to":"c","kind":"legal"},
      {main_path: false,forced_only: false,"from":"a","to":"d","kind":"legal"}
    ];

    test('a->[b c d];', () => expect( jssm.compile(jssm.parse('a->[b c d];')).transitions ).toEqual(aRight) );

  });



  describe('array on both sides', () => {

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

    test('[a b c]->[x y z];', () => expect( jssm.compile(jssm.parse('[a b c]->[x y z];')).transitions ).toEqual(aBoth) );

  });



  describe('array in middle', () => {

    const aBoth = [
      {main_path: false,forced_only: false,"from":"a","to":"x","kind":"legal"},
      {main_path: false,forced_only: false,"from":"a","to":"y","kind":"legal"},
      {main_path: false,forced_only: false,"from":"a","to":"z","kind":"legal"},
      {main_path: false,forced_only: false,"from":"x","to":"b","kind":"legal"},
      {main_path: false,forced_only: false,"from":"y","to":"b","kind":"legal"},
      {main_path: false,forced_only: false,"from":"z","to":"b","kind":"legal"}
    ];

    test('a->[x y z]->b;', () => expect( jssm.compile(jssm.parse('a->[x y z]->b;')).transitions ).toEqual(aBoth) );

  });



});





describe('array of zero must throw', () => {

  const aLeft = [];

  test('On left []->d;',      () => expect( () => jssm.compile( jssm.parse('[]->d;')    ).transitions ).toThrow() );
  test('On right d->[];',     () => expect( () => jssm.compile( jssm.parse('d->[];')    ).transitions ).toThrow() );
  test('On both []->[];',     () => expect( () => jssm.compile( jssm.parse('[]->[];')   ).transitions ).toThrow() );
  test('In middle d->[]->e;', () => expect( () => jssm.compile( jssm.parse('d->[]->e;') ).transitions ).toThrow() );
  test('In loop d->[]->d;',   () => expect( () => jssm.compile( jssm.parse('d->[]->d;') ).transitions ).toThrow() );

});
