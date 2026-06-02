
import { sm } from '../jssm';




// Each entry pairs a reporter-safe display name with the actual control
// character it denotes.  The display names deliberately use the escaped form
// (`\t`, not a raw tab) so that no raw control character ever lands in a test
// title — a raw `\r` or `\n` in a title corrupts terminal reporter output and
// makes passing tests *appear* to vanish.  That illusion is why these tests
// were once disabled; the parser itself has always accepted these characters
// (see grammar rule `Unescaped = [\x00-\x21...]`, which includes \t \n \v \r).
const SpecialCharacters: ReadonlyArray<readonly [string, string]> = [
  ['tab (\\t)',             '\t'],
  ['newline (\\n)',         '\n'],
  ['vertical tab (\\v)',    '\v'],
  ['carriage return (\\r)', '\r']
];




describe('Special characters in quoted labels', () => {

  describe('framed between letters', () => {

    for (const [name, sc] of SpecialCharacters) {
      test(`a ${name} parses and is preserved in the state name`, () => {
        const machine = sm`"open${sc}shut" -> b;`;
        expect(machine.states()).toContain(`open${sc}shut`);
      });
    }

  });

  describe('as the entire bare label', () => {

    for (const [name, sc] of SpecialCharacters) {
      test(`a lone ${name} parses and is preserved as a state`, () => {
        const machine = sm`"${sc}" -> b;`;
        expect(machine.states()).toContain(sc);
        expect(machine.states()).toHaveLength(2);
      });
    }

  });

  test(`a framed control character does not collapse into a plain label`, () => {
    const machine = sm`"open${'\t'}shut" -> b;`;
    expect(machine.states()).not.toContain('openshut');
  });

});
