'use strict';

/**
 * Check #1 — classification completeness across every surface.
 *
 * For each surface present in the teaching-surface manifest, asserts that the
 * manifest partitions that surface's ground-truth unit set: every unit is
 * claimed by exactly one feature, and no feature claims a unit the ground truth
 * lacks. This is what keeps each curated teaching set from silently falling
 * behind its surface — a new grammar rule, API export, CLI flag, or custom
 * element is unclaimed until someone classifies it (teach or exclude).
 *
 * See notes/superpowers/specs/2026-06-27-help-bar-teaching-surface.md §6.
 *
 * @example
 *   const { checkAll } = require('./check_partition.cjs');
 *   checkAll().ok; // true when every surface partitions cleanly
 */

const fs   = require('fs');
const path = require('path');
const { surfaceUniverse } = require('./extract_surfaces.cjs');

const MANIFEST = path.join(__dirname, '..', '..', 'data', 'teaching-surface.json');

/** The ground-truth unit ids a feature claims (language uses grammar.rules). */
const claimsOf = f => f.units || (f.grammar && f.grammar.rules) || [];

/**
 * Partition status for one surface.
 *
 * @param universe ground-truth unit ids for the surface
 * @param features manifest features whose `surface` is this surface
 * @returns `{ ok, unitCount, featureCount, unclaimed, doubleClaimed, unknown }`
 */
function checkSurface(universe, features) {
  const units     = new Set(universe);
  const claimedBy = new Map();
  const unknown   = {};
  for (const f of features) {
    for (const u of claimsOf(f)) {
      if (!claimedBy.has(u)) claimedBy.set(u, []);
      claimedBy.get(u).push(f.id);
      if (!units.has(u)) (unknown[f.id] ||= []).push(u);
    }
  }
  const unclaimed     = universe.filter(u => !claimedBy.has(u));
  const doubleClaimed = {};
  for (const [u, owners] of claimedBy) if (owners.length > 1) doubleClaimed[u] = owners;
  const ok = unclaimed.length === 0
    && Object.keys(doubleClaimed).length === 0
    && Object.keys(unknown).length === 0;
  return { ok, unitCount: universe.length, featureCount: features.length, unclaimed, doubleClaimed, unknown };
}

/**
 * Run the partition check for every surface that appears in the manifest.
 *
 * @returns `{ ok, surfaces }` where `surfaces` maps each surface to its result
 */
function checkAll() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const bySurface = new Map();
  for (const f of manifest.features) {
    if (!bySurface.has(f.surface)) bySurface.set(f.surface, []);
    bySurface.get(f.surface).push(f);
  }
  const surfaces = {};
  let ok = true;
  for (const [surface, features] of bySurface) {
    const r = checkSurface(surfaceUniverse(surface), features);
    surfaces[surface] = r;
    ok = ok && r.ok;
  }
  return { ok, surfaces };
}

module.exports = { checkAll, checkSurface };

if (require.main === module) {
  const { ok, surfaces } = checkAll();
  for (const [surface, r] of Object.entries(surfaces)) {
    const tag = r.ok ? 'OK  ' : 'FAIL';
    console.log(`[${tag}] ${surface.padEnd(13)} ${r.unitCount} units / ${r.featureCount} features`);
    if (r.unclaimed.length)                                       console.log(`        UNCLAIMED (${r.unclaimed.length}): ${r.unclaimed.join(', ')}`);
    for (const [u, owners] of Object.entries(r.doubleClaimed))    console.log(`        DOUBLE-CLAIMED: ${u} <- ${owners.join(', ')}`);
    for (const [fid, us] of Object.entries(r.unknown))           console.log(`        UNKNOWN UNIT in ${fid}: ${us.join(', ')}`);
  }
  console.log(ok ? '\npartition OK across all surfaces' : '\npartition FAILED');
  process.exit(ok ? 0 : 1);
}
