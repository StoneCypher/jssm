// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  encode_machine, decode_machine,
  deflate_raw, inflate_raw, MAX_PERMALINK_INFLATE_BYTES,
  read_fragment_param, set_fragment_param,
  permalink_for, fsl_from_permalink,
  permalink_key_for,
} from '../fsl_permalink.js';

describe('fsl_permalink codec', () => {
  it('round-trips machines exactly, including Unicode and long compressible FSL', async () => {
    for (const fsl of [
      'a -> b;',
      "A 'go' -> B; B 'back' -> A;",
      'café ☕ → ★;',
      "Green 'next' -> Yellow 'next' -> Red 'next' -> Green;\nRed ~> Off;".repeat(5),
    ]) {
      const seg = await encode_machine(fsl);
      expect(seg).toMatch(/^[01][\w-]*$/);          // scheme tag + URL-safe alphabet
      expect(await decode_machine(seg)).toBe(fsl);
    }
  });

  it('tags long input compressed (1) and never grows a short one past raw', async () => {
    const big = "Green 'next' -> Yellow 'next' -> Red 'next' -> Green;\nRed ~> Off;".repeat(5);
    const tagged = await encode_machine(big);
    expect(tagged[0]).toBe('1');
    const small = await encode_machine('a -> b;');
    expect(small[0]).toBe('0');                              // raw beat deflate on a tiny string
  });

  it('rejects an over-cap inflate (decompression-bomb guard)', async () => {
    const big    = new Uint8Array(MAX_PERMALINK_INFLATE_BYTES + 1024);   // zeros: highly compressible
    const packed = await deflate_raw(big);                               // small payload ...
    await expect(inflate_raw(packed)).rejects.toThrow(/exceeded/);       // ... that inflates past the cap
  });
});

describe('fsl_permalink fragment ops', () => {
  it('reads a named segment and returns null when absent', () => {
    expect(read_fragment_param('#a=0AAA&b=1BBB', 'b')).toBe('1BBB');
    expect(read_fragment_param('a=0AAA', 'a')).toBe('0AAA');   // leading # optional
    expect(read_fragment_param('#a=0AAA', 'z')).toBeNull();
    expect(read_fragment_param('', 'a')).toBeNull();
  });

  it('sets a segment while preserving siblings and order', () => {
    expect(set_fragment_param('#a=0AAA&b=1BBB', 'b', '1CCC')).toBe('a=0AAA&b=1CCC');
    expect(set_fragment_param('#a=0AAA', 'b', '1BBB')).toBe('a=0AAA&b=1BBB');   // append
    expect(set_fragment_param('', 'a', '0AAA')).toBe('a=0AAA');
  });

  it('percent-encodes keys so special characters survive a round-trip', () => {
    const frag = set_fragment_param('', 'a=b&c', '0AAA');                 // a key with = and &
    expect(frag).toBe('a%3Db%26c=0AAA');                                  // both encoded
    expect(read_fragment_param(frag, 'a=b&c')).toBe('0AAA');              // read back by the raw key
    expect(set_fragment_param(frag, 'plain', '1BBB'))                     // sibling untouched
      .toBe('a%3Db%26c=0AAA&plain=1BBB');
  });

  it('does not throw on a malformed percent-escape in a key', () => {
    expect(read_fragment_param('#bad%=0AAA', 'bad%')).toBe('0AAA');       // safe_decode falls back
  });
});

describe('fsl_permalink location wrappers', () => {
  it('permalink_for merges into an existing fragment under the given key', async () => {
    const url = await permalink_for('a -> b;', 'b', 'https://host/p', '#a=0XXX');
    expect(url.startsWith('https://host/p#')).toBe(true);
    expect(url).toContain('a=0XXX');                           // sibling segment preserved
    expect(await fsl_from_permalink(url, 'b')).toBe('a -> b;'); // our key round-trips
  });

  it('defaults to key m and round-trips', async () => {
    const url = await permalink_for('a -> b;', undefined, 'https://host/p', '');
    expect(url).toContain('#m=');
    expect(await fsl_from_permalink(url)).toBe('a -> b;');
  });

  it('fsl_from_permalink returns null when the key is absent', async () => {
    expect(await fsl_from_permalink('https://host/p', 'm')).toBeNull();
  });

  it('fsl_from_permalink returns null for a present but malformed segment', async () => {
    expect(await fsl_from_permalink('#m=1@@', 'm')).toBeNull();   // invalid base64 → swallowed
  });
});

describe('permalink_key_for', () => {
  it('prefers uhash, falls back to id, else null', () => {
    const byId = document.createElement('div'); byId.id = 'i';
    expect(permalink_key_for(byId)).toBe('i');

    const byUhash = document.createElement('div'); byUhash.id = 'i'; byUhash.setAttribute('uhash', 'u');
    expect(permalink_key_for(byUhash)).toBe('u');

    expect(permalink_key_for(document.createElement('div'))).toBeNull();
  });
});
