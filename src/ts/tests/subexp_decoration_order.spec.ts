
 

import * as jssm from '../jssm';





// Subexp decoration order — bug-tracking tests.
//
// The PEG rule `Subexp` (src/ts/fsl_parser.peg ~line 739) accepts a
// fixed positional sequence of optional decorations rather than an
// unordered set:
//
//   pre-arrow:    after  ->  action  ->  probability  ->  brace-block
//   post-arrow:   brace-block  ->  probability  ->  action  ->  after
//
// So `a after 5s 'go' 50% { arc_label: x; } -> b;` parses, but every
// adjacent or non-adjacent pair-swap of those four slots is rejected.
// The grammar carries an inline `// todo these shouldn't be ordered`
// comment acknowledging the wart.
//
// This file enumerates:
//
//   1.  Each decoration on its own (sanity baseline).
//   2.  Every pair of decorations in canonical order (sanity baseline,
//       passes today, must keep passing after any fix).
//   3.  Every pair of decorations in *swapped* order (currently fails;
//       these are the bug-catchers — once Subexp accepts decorations
//       order-insensitively, they should turn green).
//
// Pair-swaps cover the bug exhaustively: PEG positional slots are
// pair-wise independent, so every failing N-decoration order is just
// the union of one or more failing pair orders.





describe('Subexp pre-arrow decoration order', () => {

  describe('singletons (sanity)', () => {
    test('after',  () => expect(() => jssm.parse(`a after 5s -> b;`)).not.toThrow());
    test('action', () => expect(() => jssm.parse(`a 'go' -> b;`)).not.toThrow());
    test('prob',   () => expect(() => jssm.parse(`a 50% -> b;`)).not.toThrow());
    test('desc',   () => expect(() => jssm.parse(`a { arc_label: x; } -> b;`)).not.toThrow());
  });

  describe('canonical pair orders (must keep parsing)', () => {
    test('after action',  () => expect(() => jssm.parse(`a after 5s 'go' -> b;`)).not.toThrow());
    test('after prob',    () => expect(() => jssm.parse(`a after 5s 50% -> b;`)).not.toThrow());
    test('after desc',    () => expect(() => jssm.parse(`a after 5s { arc_label: x; } -> b;`)).not.toThrow());
    test('action prob',   () => expect(() => jssm.parse(`a 'go' 50% -> b;`)).not.toThrow());
    test('action desc',   () => expect(() => jssm.parse(`a 'go' { arc_label: x; } -> b;`)).not.toThrow());
    test('prob desc',     () => expect(() => jssm.parse(`a 50% { arc_label: x; } -> b;`)).not.toThrow());
  });

  describe('swapped pair orders (currently fail; should parse once Subexp is order-insensitive)', () => {
    test('action before after',  () => expect(() => jssm.parse(`a 'go' after 5s -> b;`)).not.toThrow());
    test('prob before after',    () => expect(() => jssm.parse(`a 50% after 5s -> b;`)).not.toThrow());
    test('desc before after',    () => expect(() => jssm.parse(`a { arc_label: x; } after 5s -> b;`)).not.toThrow());
    test('prob before action',   () => expect(() => jssm.parse(`a 50% 'go' -> b;`)).not.toThrow());
    test('desc before action',   () => expect(() => jssm.parse(`a { arc_label: x; } 'go' -> b;`)).not.toThrow());
    test('desc before prob',     () => expect(() => jssm.parse(`a { arc_label: x; } 50% -> b;`)).not.toThrow());
  });

});





describe('Subexp post-arrow decoration order', () => {

  describe('singletons (sanity)', () => {
    test('desc',   () => expect(() => jssm.parse(`a -> { arc_label: x; } b;`)).not.toThrow());
    test('prob',   () => expect(() => jssm.parse(`a -> 50% b;`)).not.toThrow());
    test('action', () => expect(() => jssm.parse(`a -> 'go' b;`)).not.toThrow());
    test('after',  () => expect(() => jssm.parse(`a -> after 5s b;`)).not.toThrow());
  });

  describe('canonical pair orders (must keep parsing)', () => {
    test('desc prob',     () => expect(() => jssm.parse(`a -> { arc_label: x; } 50% b;`)).not.toThrow());
    test('desc action',   () => expect(() => jssm.parse(`a -> { arc_label: x; } 'go' b;`)).not.toThrow());
    test('desc after',    () => expect(() => jssm.parse(`a -> { arc_label: x; } after 5s b;`)).not.toThrow());
    test('prob action',   () => expect(() => jssm.parse(`a -> 50% 'go' b;`)).not.toThrow());
    test('prob after',    () => expect(() => jssm.parse(`a -> 50% after 5s b;`)).not.toThrow());
    test('action after',  () => expect(() => jssm.parse(`a -> 'go' after 5s b;`)).not.toThrow());
  });

  describe('swapped pair orders (currently fail; should parse once Subexp is order-insensitive)', () => {
    test('prob before desc',     () => expect(() => jssm.parse(`a -> 50% { arc_label: x; } b;`)).not.toThrow());
    test('action before desc',   () => expect(() => jssm.parse(`a -> 'go' { arc_label: x; } b;`)).not.toThrow());
    test('after before desc',    () => expect(() => jssm.parse(`a -> after 5s { arc_label: x; } b;`)).not.toThrow());
    test('action before prob',   () => expect(() => jssm.parse(`a -> 'go' 50% b;`)).not.toThrow());
    test('after before prob',    () => expect(() => jssm.parse(`a -> after 5s 50% b;`)).not.toThrow());
    test('after before action',  () => expect(() => jssm.parse(`a -> after 5s 'go' b;`)).not.toThrow());
  });

});
