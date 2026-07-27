import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

const require = createRequire(import.meta.url);
const brt = require('../build_repo_timeline.cjs');

// Pure, gh-free tests: arg parsing and the curated-table assembly (fed a stub
// metadata map, never the network). The integrity checks (no repo in two
// categories, no dangling supersession target) also run here against the real
// embedded tables, so a bad edit to CATEGORIES/OBSOLETION fails this suite.

const { parseArgs, buildDataset, auditEnrollment } = brt;

describe('auditEnrollment', () => {

  it('flags a real fsl repo nobody enrolled', () => {
    // The case that started this: a repo exists, is obviously in scope, and the
    // diagram silently omits it because no one added it to CATEGORIES.
    const a = auditEnrollment(['jssm'], ['jssm', 'fsl.tools']);
    expect(a.unenrolled).toEqual(['fsl.tools']);
    expect(a.missing).toEqual([]);
  });

  it('flags a curated name that no longer resolves under the owner', () => {
    const a = auditEnrollment(['jssm', 'renamed-away'], ['jssm']);
    expect(a.missing).toEqual(['renamed-away']);
  });

  it('does not call a cross-owner entry missing', () => {
    // owner/name entries are fetched separately and never appear in this
    // owner's listing, so treating them as missing would cry wolf every run.
    const a = auditEnrollment(['highlightjs/highlightjs-fsl'], []);
    expect(a.missing).toEqual([]);
  });

  it('ignores owner repos unrelated to fsl or jssm', () => {
    const a = auditEnrollment([], ['some-unrelated-thing', 'holiday-photos']);
    expect(a.unenrolled).toEqual([]);
  });

  it('matches the fsl/jssm filter case-insensitively', () => {
    const a = auditEnrollment([], ['FSL-Spec', 'JSSM-thing']);
    expect(a.unenrolled).toEqual(['FSL-Spec', 'JSSM-thing']);
  });

  it('reports nothing when the curated list and the owner listing agree', () => {
    expect(auditEnrollment(['jssm'], ['jssm'])).toEqual({ missing: [], unenrolled: [] });
  });

});

describe('parseArgs', () => {
  it('requires --out', () => { expect(() => parseArgs([])).toThrow(/--out/); });
  it('rejects an unknown flag', () => { expect(() => parseArgs(['--out', 'd', '--nope'])).toThrow(/unknown flag/); });
  it('defaults the owner', () => { expect(parseArgs(['--out', 'd']).owner).toBe('StoneCypher'); });
});

describe('buildDataset', () => {
  // blanket stub so every repo's metadata joins without the network (and the
  // "not found" warning never fires, keeping test output pristine)
  const meta = { get: () => ({ visibility: 'public', archived: false, fork: false, description: null }) };
  const ds = buildDataset(meta);

  it('assembles every curated repo with no dup/dangling errors', () => {
    expect(ds.repos.length).toBe(33);
    expect(ds.categoryOrder.length).toBe(8);
    expect(ds.categoryOrder[0]).toBe('replaced by newer work');
    expect(ds.categoryOrder[ds.categoryOrder.length - 1]).toBe('wanted, never took off, new work waiting on org transfer');
  });

  it('carries a cross-owner repo under its full owner/name', () => {
    const up = ds.repos.find(r => r.name === 'highlightjs/highlightjs-fsl');
    expect(up).toBeDefined();
    expect(up.category).toBe('current');
  });

  it('records the alpha grammar being upstreamed', () => {
    const alpha = ds.repos.find(r => r.name === 'alpha-highlightjs-fsl');
    expect(alpha.obsoletedBy).toBe('highlightjs/highlightjs-fsl');
    expect(alpha.obsoletedByWhat).toBe('grammar upstreamed');
  });

  it('keeps category labels verbatim, with fsl-textmate corrected to current', () => {
    expect(ds.repos.find(r => r.name === 'jssm').category).toBe('current');
    expect(ds.repos.find(r => r.name === 'fsl-textmate').category).toBe('current');
  });

  it('carries the supersession edges, several resolving to jssm', () => {
    const fslc = ds.repos.find(r => r.name === 'fslc');
    expect(fslc.obsoletedBy).toBe('jssm');
    expect(fslc.obsoletedByWhat).toBe('cli work');
    expect(ds.repos.find(r => r.name === 'fsl-code').obsoletedBy).toBe('vscode-fsl');
    expect(ds.repos.filter(r => r.obsoletedBy === 'jssm').length).toBe(6);
  });

  it('preserves maintainer asides in note', () => {
    expect(ds.repos.find(r => r.name === 'require_jssm').note).toMatch(/require_fsl/);
  });
});
