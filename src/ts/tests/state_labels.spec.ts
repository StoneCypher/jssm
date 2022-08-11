
import { sm, Machine } from '../jssm';





describe('State style', () => {

  test(`Atom labels don't throw`, () =>
    expect( () => { const _foo = sm`a -> b; state a: { label: atomtest; };`; })
      .not.toThrow() );

  test(`String labels don't throw`, () =>
    expect( () => { const _foo = sm`a -> b; state a: { label: "string test"; };`; })
      .not.toThrow() );

  test(`Atom labels read out correctly`, () =>
    expect( sm`a -> b; state a: { label: atomtest; };`.label_for('a') )
      .toBe('atomtest') );

  test(`String labels read out correctly`, () =>
    expect( sm`a -> b; state a: { label: "string test"; };`.label_for('a') )
      .toBe('string test') );

});





describe('State style defects', () => {

  test(`Atom labels can't repeat`, () =>
    expect( () => { const _foo = sm`a -> b; state a: { label: atomtest; label: atomtest; };`; })
      .toThrow() );

  test(`String labels can't repeat`, () =>
    expect( () => { const _foo = sm`a -> b; state a: { label: "string test"; label: "string test"; };`; })
      .toThrow() );

  test(`Atom labels can't cohabitate with string labels`, () =>
    expect( () => { const _foo = sm`a -> b; state a: { label: atomtest; label: "string test"; };`; })
      .toThrow() );

  test(`Can't repeat from datastructure notation either`, () =>
    expect( () => {
      new Machine( {
        "start_states"      : ["a"],
        "end_states"        : [],
        "transitions"       : [{"from":"a","to":"b","kind":"legal","forced_only":false,"main_path":false}],
        "state_property"    : [],
        "state_declaration" : [{"state":"a","declarations":[{"key":"state-label","value":"foo"},{"key":"state-label","value":"foo"}]}]
      });
    })
      .toThrow() );

});
