/**
 * Conformance corpus aggregator.  Re-exports every tier's vectors as one flat,
 * tier-tagged list plus a per-tier grouping, so the §26 runner
 * (`corpus.spec.ts`) and any future differential harness can consume the whole
 * corpus from a single import.
 *
 * Tiers (§26): T1 finite, T2 rich-portable, T3 pinned-unicode.
 */

import type { CorpusVector } from '../corpus_types';

import { vectors as t1_transitions } from './t1-finite/transitions';
import { vectors as t1_props       } from './t1-finite/props';
import { vectors as t2_data        } from './t2-rich-portable/data';
import { vectors as t2_prob        } from './t2-rich-portable/probabilistic';
import { vectors as t3_identifiers } from './t3-pinned-unicode/identifiers';


/** T1 (finite profile) vectors. */
export const T1_VECTORS: ReadonlyArray<CorpusVector> = [
  ...t1_transitions,
  ...t1_props
];

/** T2 (rich-portable) vectors. */
export const T2_VECTORS: ReadonlyArray<CorpusVector> = [
  ...t2_data,
  ...t2_prob
];

/** T3 (pinned-unicode) vectors. */
export const T3_VECTORS: ReadonlyArray<CorpusVector> = [
  ...t3_identifiers
];

/** The whole corpus, grouped by certification tier. */
export const CORPUS_BY_TIER: Readonly<Record<'T1' | 'T2' | 'T3', ReadonlyArray<CorpusVector>>> = {
  T1 : T1_VECTORS,
  T2 : T2_VECTORS,
  T3 : T3_VECTORS
};

/** The whole corpus as one flat list. */
export const ALL_VECTORS: ReadonlyArray<CorpusVector> = [
  ...T1_VECTORS,
  ...T2_VECTORS,
  ...T3_VECTORS
];
