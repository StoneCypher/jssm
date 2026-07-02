/**
 *  Minimal GIF-variant LZW decoder for round-trip testing.  Written from the
 *  GIF89a specification, intentionally independent of the encoder under test.
 */
export function lzw_decode(data: Uint8Array, min_code_size: number): Uint8Array {

  const clear = 1 << min_code_size;
  const eoi   = clear + 1;

  let code_size = min_code_size + 1;
  let dict: number[][] = [];
  const reset_dict = (): void => {
    dict = [];
    for (let i = 0; i < clear; ++i) { dict[i] = [i]; }
    dict[clear] = []; dict[eoi] = [];
    code_size = min_code_size + 1;
  };
  reset_dict();

  const out: number[] = [];
  let bit_pos = 0;
  const read_code = (): number => {
    let value = 0;
    for (let b = 0; b < code_size; ++b) {
      const byte = data[bit_pos >> 3]!;
      value |= ((byte >> (bit_pos & 7)) & 1) << b;
      bit_pos += 1;
    }
    return value;
  };

  let prev: number[] | null = null;
  for (;;) {
    const code = read_code();
    if (code === eoi) { break; }
    if (code === clear) { reset_dict(); prev = null; continue; }

    let entry: number[];
    if (code < dict.length && dict[code] !== undefined) {
      entry = dict[code]!;
    } else {
      entry = [...prev!, prev![0]!];       // the KwKwK case
    }
    out.push(...entry);

    if (prev !== null) {
      dict.push([...prev, entry[0]!]);
      if (dict.length === (1 << code_size) && code_size < 12) { code_size += 1; }
    }
    prev = entry;
  }

  return new Uint8Array(out);

}
