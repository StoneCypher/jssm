
import { sm, compile, parse } from '../jssm';
import { readFileSync }       from 'fs';

const block_data = `${readFileSync('./src/ts/tests/UnicodeBlocks-14.0.0.txt')}`.split('\n'),
      block_rows = block_data.filter(remove_blanks_and_comments),
      blocks     = block_rows.reduce(accumulate_block_object, {});





function remove_blanks_and_comments(line: string): boolean {

  if (line.charAt(0) === '#')   { return false; }
  if (line.trim().length === 0) { return false; }

  return true;

}





function accumulate_block_object(acc: Object, cur: string): Object {

  const pair    = cur.trim().split('; '),
        range   = pair[0],
        label   = pair[1],
        range_p = range.split('..'),
        range_l = parseInt(range_p[0], 16),
        range_r = parseInt(range_p[1], 16);

  if ((range !== undefined) && (label !== undefined)) {
    acc[label.trim()] = [range_l, range_r];
    return acc;
  } else {
    throw new Error(`Bad row: ${cur}`);
  }

}





const atom_start = 32,
      atom_skips = ' "#%&\'()+-/:;<=>@[\\]`{|}~⌂\x7F'.split('');





function test_range_with(desc: string, func: (number) => boolean) {

  describe(`Unicode character tests - ${desc}`, () => {

    Object.keys(blocks).forEach(blockname => {
    // const blockname = 'Basic Latin';

      const lo = blocks[blockname][0],
            hi = blocks[blockname][1],
            sz = hi - lo;

      describe(`${blockname} [${lo} - ${hi}] (${sz} ch)`, () => {

        // left clause; right clause; middle clause in chain
        test(`${blockname} in atoms, ${sz*3} tests`, () => {

          for (let idx = Math.max(blocks[blockname][0], atom_start); idx <= blocks[blockname][1]; ++idx) {

            func(idx);

            // const cp = String.fromCodePoint(idx);

            // if (!(atom_skips.includes(cp))) {

            //   let left_test, middle_test, right_test;

            //   try {
            //     left_test   = sm`${cp} -> target;`,
            //     middle_test = sm`source -> ${cp} -> target;`,
            //     right_test  = sm`source -> ${cp};`;
            //   } catch (e) {
            //     throw new Error(`Broke on ${idx} "${cp}"`);
            //   }

            //   expect( left_test.has_state(cp)   ).toBe(true);
            //   expect( right_test.has_state(cp)  ).toBe(true);
            //   expect( middle_test.has_state(cp) ).toBe(true);

            // }

          }

        });

        test.todo(`${blockname} in strings`);
        test.todo(`${blockname} in label atom`);
        test.todo(`${blockname} in label string`);
        test.todo(`${blockname} in spread`);

      });

    });

  });

}
