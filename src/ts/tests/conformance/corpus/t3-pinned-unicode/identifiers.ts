/**
 * T3 (pinned-unicode) conformance vectors — state and action identifiers that
 * exercise §8's string model (code point is the unit; grapheme clusters span
 * multiple code points) and the §26 T3 tier (operations tied to a *pinned*
 * Unicode version).  A C / minimal host without Unicode tables can still match
 * these because the identifiers are compared by exact code-point sequence, but
 * authoring them as a distinct tier records the §26 contract that anything
 * Unicode-version-sensitive is certified separately.
 *
 * These cover Latin diacritics, CJK, RTL scripts, a combining-mark (NFD)
 * identifier, an emoji ZWJ sequence, and a regional-indicator flag — each a
 * single FSL identifier whose UTF-16 length exceeds its grapheme count.
 */

import type { CorpusVector } from '../../corpus_types';


export const vectors: ReadonlyArray<CorpusVector> = [

  {
    id    : 't3.unicode.diacritics-cjk-emoji',
    tier  : 'T3',
    title : 'Latin-diacritic, CJK, and emoji identifiers drive transitions and loop',
    document :
      `café 'naïve' -> 日本語 '👍' -> café;`,
    seed  : 1,
    stimuli : [
      { kind: 'action', arg: 'naïve' },
      { kind: 'action', arg: '👍'    },
      { kind: 'action', arg: 'naïve' }
    ],
    trace : [
      { step: 0, from: 'café',   to: '日本語', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 1, from: '日本語', to: 'café',   accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 2, from: 'café',   to: '日本語', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false }
    ],
    final_state    : '日本語',
    final_is_final : false
  },

  {
    id    : 't3.unicode.emoji-zwj-and-flag',
    tier  : 'T3',
    title : 'A ZWJ family emoji and a regional-indicator flag are valid identifiers',
    document :
      `👨‍👩‍👧 'wave' -> 🇯🇵 'back' -> 👨‍👩‍👧;`,
    seed  : 1,
    stimuli : [
      { kind: 'action', arg: 'wave' },
      { kind: 'action', arg: 'back' }
    ],
    trace : [
      { step: 0, from: '👨‍👩‍👧', to: '🇯🇵',    accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 1, from: '🇯🇵',     to: '👨‍👩‍👧', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false }
    ],
    final_state    : '👨‍👩‍👧',
    final_is_final : false
  },

  {
    id    : 't3.unicode.multiscript',
    tier  : 'T3',
    title : 'Greek, Cyrillic and Arabic (RTL) identifiers interoperate',
    document :
      `Ω 'στ' -> Привет 'ك' -> مرحبا;`,
    seed  : 1,
    stimuli : [
      { kind: 'action', arg: 'στ' },
      { kind: 'action', arg: 'ك'  }
    ],
    trace : [
      { step: 0, from: 'Ω',      to: 'Привет', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false },
      { step: 1, from: 'Привет', to: 'مرحبا',  accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false }
    ],
    final_state    : 'مرحبا',
    final_is_final : true
  },

  {
    id    : 't3.unicode.combining-mark-nfd',
    tier  : 'T3',
    title : 'A combining-mark (NFD) identifier round-trips by exact code-point sequence',
    document :
      `é -> b;`,           // 'e' + U+0301 combining acute — two code points, one grapheme
    seed  : 1,
    stimuli : [
      { kind: 'transition', arg: 'b' }
    ],
    trace : [
      { step: 0, from: 'é', to: 'b', accepted: true, props_delta: {}, data: undefined, emissions: [], rollback: false }
    ],
    final_state    : 'b',
    final_is_final : true
  }

];
