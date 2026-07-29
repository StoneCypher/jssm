import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

const require = createRequire(import.meta.url);
const fm = require('../flow_model.cjs');

// The Sankey mass-flow model is pure: no DOM, no network, no filesystem. These
// tests cover the step function, the four derived event kinds, column collapse,
// and — the point of the whole exercise — the CONSERVATION invariant, which is
// re-derived from the built graph rather than asserted inside the builder, so it
// can disagree with the code that produced it.

const { stepAt, deriveEvents, decompositions, collapseColumns, columnLabel,
        sampleTime, buildFlow, conservationViolations } = fm;

const alive = { name: 'alive', times: [10, 20, 30], totals: [1, 5, 9], born: 10, lastT: 30, dead: false, by: null };
const gone  = { name: 'gone',  times: [10, 20],     totals: [4, 7],    born: 10, lastT: 20, dead: true,  by: 'alive' };


describe('stepAt', () => {

  it('is zero before the first release', () => {
    expect(stepAt(alive, 9)).toBe(0);
  });

  it('holds the last measured size forward for a living package', () => {
    expect(stepAt(alive, 999)).toBe(9);
  });

  it('picks the enclosing step, not the nearest', () => {
    expect(stepAt(alive, 25)).toBe(5);
  });

  it('drops a flowed-out package to zero after its last release', () => {
    expect(stepAt(gone, 21)).toBe(0);
  });

  it('still reports a flowed-out package at its last release', () => {
    expect(stepAt(gone, 20)).toBe(7);
  });

});


describe('deriveEvents', () => {

  it('derives a birth for every package', () => {
    expect(deriveEvents([alive, gone]).filter((e: any) => e.kind === 'birth')).toHaveLength(2);
  });

  it('derives a death only for the package that flowed out', () => {
    const deaths = deriveEvents([alive, gone]).filter((e: any) => e.kind === 'death');
    expect(deaths).toHaveLength(1);
    expect(deaths[0].pkg).toBe('gone');
  });

  it('dates supersession at the successor\'s first release after the predecessor\'s last', () => {
    const s = deriveEvents([alive, gone]).find((e: any) => e.kind === 'supersede');
    expect(s.target).toBe('alive');
    expect(s.t).toBe(30);
  });

  it('falls back to the predecessor\'s last release when the successor never published again', () => {
    const stopped = { name: 'stopped', times: [10], totals: [3], born: 10, lastT: 10, dead: false, by: null };
    const dies    = { name: 'dies',    times: [20], totals: [4], born: 20, lastT: 20, dead: true,  by: 'stopped' };
    const s = deriveEvents([stopped, dies]).find((e: any) => e.kind === 'supersede');
    expect(s.t).toBe(20);
  });

});


describe('decompositions', () => {

  it('detects a file family that moved from one package to another', () => {
    const from = { name: 'mono',  times: [1],    totals: [9], born: 1,    lastT: 1,    dead: false, by: null,
                   famSpan: new Map([['viz', { first: 0, last: 1000 }]]) };
    const to   = { name: 'split', times: [2000], totals: [4], born: 2000, lastT: 2000, dead: false, by: null,
                   famSpan: new Map([['viz', { first: 2000, last: 3000 }]]) };
    const d = decompositions([from, to]);
    expect(d).toHaveLength(1);
    expect(d[0].what).toBe('viz');
    expect(d[0].target).toBe('split');
  });

  it('ignores a family that never left its package', () => {
    const solo = { name: 'a', times: [1], totals: [9], born: 1, lastT: 1, dead: false, by: null,
                   famSpan: new Map([['core', { first: 0, last: 1000 }]]) };
    expect(decompositions([solo])).toHaveLength(0);
  });

  it('ignores a reappearance more than a year later', () => {
    const YEAR = 365 * 864e5;
    const from = { name: 'mono',  times: [1], totals: [9], born: 1, lastT: 1, dead: false, by: null,
                   famSpan: new Map([['viz', { first: 0, last: 1000 }]]) };
    const to   = { name: 'split', times: [1000 + YEAR + 1], totals: [4], born: 1000 + YEAR + 1,
                   lastT: 1000 + YEAR + 1, dead: false, by: null,
                   famSpan: new Map([['viz', { first: 1000 + YEAR + 1, last: 1000 + YEAR + 2 }]]) };
    expect(decompositions([from, to])).toHaveLength(0);
  });

});


describe('collapseColumns', () => {

  it('merges events inside the window into one column', () => {
    const c = collapseColumns([{ t: 0, kind: 'birth', pkg: 'a' }, { t: 5, kind: 'birth', pkg: 'b' }], 10);
    expect(c).toHaveLength(1);
    expect(c[0].events).toHaveLength(2);
  });

  it('keeps events outside the window in separate columns', () => {
    const c = collapseColumns([{ t: 0, kind: 'birth', pkg: 'a' }, { t: 500, kind: 'birth', pkg: 'b' }], 10);
    expect(c).toHaveLength(2);
  });

  it('labels a single-event column specifically', () => {
    const c = collapseColumns([{ t: 0, kind: 'birth', pkg: 'jssm' }], 10);
    expect(columnLabel(c[0])).toBe('jssm born');
  });

  it('summarises a crowded column with an overflow count', () => {
    const many = ['birth', 'birth', 'death', 'death', 'supersede', 'decompose']
      .map((kind, i) => ({ t: i, kind, pkg: 'p' + i, target: 'q' }));
    expect(columnLabel(collapseColumns(many, 100)[0])).toMatch(/\+\d/);
  });

});


describe('sampleTime', () => {

  it('pulls the sample to a package that lived and died inside one column', () => {
    const brief = { name: 'brief', times: [100], totals: [3], born: 100, lastT: 100, dead: true, by: null };
    const col   = { t: 500, tMin: 0, tMax: 1000, events: [] };
    expect(sampleTime(brief, col)).toBe(100);
    expect(stepAt(brief, sampleTime(brief, col))).toBe(3);
  });

  it('does not conjure up a package born after the whole column window', () => {
    const later = { name: 'later', times: [9000], totals: [3], born: 9000, lastT: 9000, dead: false, by: null };
    const col   = { t: 500, tMin: 0, tMax: 1000, events: [] };
    expect(stepAt(later, sampleTime(later, col))).toBe(0);
  });

});


describe('buildFlow', () => {

  it('conserves mass at every node', () => {
    expect(conservationViolations(buildFlow([alive, gone], 1))).toEqual([]);
  });

  it('routes superseded mass into the successor', () => {
    const s = buildFlow([alive, gone], 1).links.filter((l: any) => l.kind === 'supersede');
    expect(s.length).toBeGreaterThan(0);
    expect(s[0].to.pkg).toBe('alive');
  });

  it('never hands a successor more than it actually gained', () => {
    const flow = buildFlow([alive, gone], 1);
    for (const l of flow.links.filter((x: any) => x.kind === 'supersede')) {
      expect(l.bytes).toBeLessThanOrEqual(l.to.mass);
    }
  });

  it('shows mass the successor could not absorb as a visible discard', () => {
    const discarded = buildFlow([alive, gone], 1).links
      .filter((l: any) => l.kind === 'discard')
      .reduce((a: number, l: any) => a + l.bytes, 0);
    expect(discarded).toBeGreaterThan(0);
  });

  it('ends at a today column so a last-column death still routes', () => {
    const flow = buildFlow([alive, gone], 1);
    expect(flow.columns[flow.columns.length - 1].label).toBe('today');
    const inTodayColumn = flow.nodes.filter((n: any) => n.col === flow.columns.length - 1);
    expect(inTodayColumn.some((n: any) => n.pkg === 'gone')).toBe(false);
  });

  it('keeps a one-release package in the diagram', () => {
    const long  = { name: 'long',  times: [0, 9000], totals: [5, 5], born: 0,   lastT: 9000, dead: false, by: null };
    const brief = { name: 'brief', times: [100],     totals: [3],    born: 100, lastT: 100,  dead: true,  by: null };
    const flow  = buildFlow([long, brief], 5000);
    expect(flow.nodes.some((n: any) => n.pkg === 'brief')).toBe(true);
    expect(conservationViolations(flow)).toEqual([]);
  });

  it('emits no zero or negative ribbons', () => {
    const flow = buildFlow([alive, gone], 1);
    expect(flow.links.every((l: any) => l.bytes > 0)).toBe(true);
  });

  it('is deterministic: the same input builds the same graph', () => {
    const a = buildFlow([alive, gone], 1), b = buildFlow([alive, gone], 1);
    expect(a.columns.map((c: any) => c.label)).toEqual(b.columns.map((c: any) => c.label));
    expect(a.links.map((l: any) => l.kind + l.bytes)).toEqual(b.links.map((l: any) => l.kind + l.bytes));
  });

});


describe('conservationViolations', () => {

  it('reports a node whose ribbons were tampered with', () => {
    const flow = buildFlow([alive, gone], 1);
    flow.links[0].bytes += 1;                       // corrupt one ribbon
    expect(conservationViolations(flow).length).toBeGreaterThan(0);
  });

  it('names the offending package and column', () => {
    const flow = buildFlow([alive, gone], 1);
    flow.links[0].bytes += 1;
    const bad = conservationViolations(flow)[0];
    expect(typeof bad.pkg).toBe('string');
    expect(typeof bad.col).toBe('number');
  });

});
