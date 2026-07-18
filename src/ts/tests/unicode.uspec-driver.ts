
import { sm, compile, parse } from '../jssm';
import { readFileSync }       from 'node:fs';

const block_data = String(readFileSync('./src/ts/tests/UnicodeBlocks-14.0.0.txt')).split('\n'),
      block_rows = block_data.filter(remove_blanks_and_comments),
      blocks     = block_rows.reduce(accumulate_block_object, {});





function remove_blanks_and_comments(line: string): boolean {

  if (line.charAt(0) === '#')   { return false; }
  if (line.trim().length === 0) { return false; }

  return true;

}





function accumulate_block_object(acc: object, cur: string): object {

  const pair    = cur.trim().split('; '),
        range   = pair[0],
        label   = pair[1],
        range_p = range.split('..'),
        range_l = Number.parseInt(range_p[0], 16),
        range_r = Number.parseInt(range_p[1], 16);

  if ((range !== undefined) && (label !== undefined)) {
    acc[label.trim()] = [range_l, range_r];
    return acc;
  }
  throw new Error(`Bad row: ${cur}`);

}





const atom_start = 32,
      atom_skips = ' "#%&\'()+-/:;<=>@[\\]`{|}~⌂\u{7F}'.split('');





function test_range_with(tmult: number, func: (number) => boolean) {

  for (const [blockname, block_range] of Object.entries(blocks)) {

    const lo = block_range[0],
          hi = block_range[1],
          sz = hi - lo;

    test(`${blockname}, ${sz} ch, ${sz*tmult} tests`, () => {

      for (let idx = Math.max(lo, atom_start); idx <= hi; ++idx) {
        expect(func(idx)).toBe(true);
      }

    });

  }

}





export {
  test_range_with,
  atom_skips, atom_start
};
