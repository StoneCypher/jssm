
import { sm } from '../jssm';





// Coverage for StoneCypher/fsl#653 — the explicit quotation syntaxes (`""`
// for states, `''` for actions) let the empty string through the grammar,
// which then silently constructed machines with unreachable nameless
// states and undispatakable nameless actions.  Edge assembly now rejects
// them at compile time, and the hook-descriptor validator requires spatial
// fields to be non-empty strings for the same reason.





describe('fsl#653 — empty-string state and action names are rejected', () => {

  test('empty from-state is rejected', () => {
    expect(() => sm`"" -> b;`).toThrow(/empty/i);
  });

  test('empty to-state is rejected', () => {
    expect(() => sm`a -> "";`).toThrow(/empty/i);
  });

  test('empty chain-middle state is rejected', () => {
    expect(() => sm`a -> "" -> c;`).toThrow(/empty/i);
  });

  test('empty state inside a list is rejected', () => {
    expect(() => sm`["" b] -> c;`).toThrow(/empty/i);
  });

  test('empty right action name is rejected', () => {
    expect(() => sm`a '' -> b;`).toThrow(/empty/i);
  });

  test('empty left action name is rejected', () => {
    expect(() => sm`a 'up' <=> '' b;`).toThrow(/empty/i);
  });

  test('control: quoted multi-word state names still construct', () => {
    expect(() => sm`"quoted state" 'act' -> b;`).not.toThrow();
  });

  test('control: paired left and right actions still construct', () => {
    expect(() => sm`a 'up' <=> 'down' b;`).not.toThrow();
  });

});





describe('fsl#653 — hook descriptors require non-empty string targets', () => {

  test('an action of false is rejected instead of registering a dead hook', () => {
    const m = sm`a 'target' => b;`;
    expect(() =>
      m.set_hook({ kind: 'named', from: 'a', to: 'b', action: false as unknown as string, handler: () => true })
    ).toThrow(/non-empty string/);
  });

  test('an empty-string from is rejected', () => {
    const m = sm`a -> b;`;
    expect(() =>
      m.set_hook({ kind: 'exit', from: '', handler: () => true })
    ).toThrow(/non-empty string/);
  });

  test('a numeric to is rejected', () => {
    const m = sm`a -> b;`;
    expect(() =>
      m.set_hook({ kind: 'entry', to: 7 as unknown as string, handler: () => true })
    ).toThrow(/non-empty string/);
  });

  test('control: well-formed descriptors still register', () => {
    const m = sm`a 'target' => b;`;
    expect(() =>
      m.set_hook({ kind: 'named', from: 'a', to: 'b', action: 'target', handler: () => true })
    ).not.toThrow();
  });

});
