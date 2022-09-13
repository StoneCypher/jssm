
/* eslint-disable max-len */

import { sm } from '../jssm';





describe('Start states', () => {

  test('List single, agreeing', () => {
    expect( sm`a -> b; start_states: [a];`.state() )
      .toBe('a')
  } );

  test('List single, disagreeing', () => {
    expect( sm`a -> b; start_states: [b];`.state() )
      .toBe('b')
  } );

  test('List multiple, agreeing', () => {
    expect( sm`a -> b -> c; start_states: [a c];`.state() )
      .toBe('a')
  } );

  test('List multiple, disagreeing', () => {
    expect( sm`a -> b -> c; start_states: [b c];`.state() )
      .toBe('b')
  } );

});





describe('Invalid start states', () => {

  test('Singleton, nonsense', () => {
    expect( () => sm`a -> b; start_states: c;`.state() )
      .toThrow()
  } );

  test('List single, nonsense', () => {
    expect( () => sm`a -> b; start_states: [c];`.state() )
      .toThrow()
  } );

  test('List multiple, agreeing and nonsense', () => {
    expect( () => sm`a -> b; start_states: [a c];`.state() )
      .toThrow()
  } );

  test('List multiple, disagreeing and nonsense', () => {
    expect( () => sm`a -> b; start_states: [b c];`.state() )
      .toThrow()
  } );

  test('List multiple, nonsense and agreeing', () => {
    expect( () => sm`a -> b; start_states: [c a];`.state() )
      .toThrow()
  } );

  test('List multiple, nonsense and disagreeing', () => {
    expect( () => sm`a -> b; start_states: [c b];`.state() )
      .toThrow()
  } );

  test('List multiple, dual nonsense', () => {
    expect( () => sm`a -> b; start_states: [c d];`.state() )
      .toThrow()
  } );

  test('List multiple, repeating agreeing', () => {
    expect( () => sm`a -> b; start_states: [a a];`.state() )
      .toThrow()
  } );

  test('List multiple, repeating disagreeing', () => {
    expect( () => sm`a -> b; start_states: [b b];`.state() )
      .toThrow()
  } );

  test('List multiple, repeating nonsense', () => {
    expect( () => sm`a -> b; start_states: [c c];`.state() )
      .toThrow()
  } );

});
