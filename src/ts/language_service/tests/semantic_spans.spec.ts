import { describe, it, expect } from 'vitest';
import { fslSemanticSpans } from '../semantic_spans.js';

describe('fslSemanticSpans', () => {
  it('marks a color value span with the resolved hex', () => {
    const doc = 'state s : { color: crimson; };';
    const spans = fslSemanticSpans(doc);
    const color = spans.find(s => s.kind === 'color');
    expect(color).toBeDefined();
    expect(doc.slice(color!.from, color!.to)).toBe('crimson');
    expect(color!.value).toMatch(/^#[0-9a-f]{8}$/i);
  });

  it('marks state names', () => {
    const doc = 'Cart -> Paid;';
    const states = fslSemanticSpans(doc)
      .filter(s => s.kind === 'state')
      .map(s => doc.slice(s.from, s.to));
    expect(states).toEqual(expect.arrayContaining(['Cart', 'Paid']));
  });

  it('carries the resolved name as value for a plain state name', () => {
    const doc = 'Cart -> Paid;';
    const cart = fslSemanticSpans(doc).find(s => s.kind === 'state' && doc.slice(s.from, s.to) === 'Cart');
    expect(cart).toBeDefined();
    expect(cart!.value).toBe('Cart');
  });

  it('carries the unquoted, unescaped name as value for a quoted state name', () => {
    const doc = 'a -> "b c";';
    const quoted = fslSemanticSpans(doc).find(s => s.kind === 'state' && s.value === 'b c');
    expect(quoted).toBeDefined();
    expect(doc.slice(quoted!.from, quoted!.to)).toBe('"b c"');
  });

  it('carries the full digit-leading name as value even though the stream tokenizer would split it', () => {
    const doc = '123abc -> b;';
    const digitLed = fslSemanticSpans(doc).find(s => s.kind === 'state' && doc.slice(s.from, s.to) === '123abc');
    expect(digitLed).toBeDefined();
    expect(digitLed!.value).toBe('123abc');
  });

  it('marks shape enum values', () => {
    const doc = 'state s : { shape: folder; };';
    const en = fslSemanticSpans(doc).find(s => s.kind === 'enum');
    expect(en).toBeDefined();
    expect(doc.slice(en!.from, en!.to)).toBe('folder');
  });

  it('returns [] when the document does not parse', () => {
    expect(fslSemanticSpans('state s : { color:')).toEqual([]);
  });

  it('marks each group-list member as a state span with its resolved value', () => {
    const doc = '&InProgress : [connecting sending receiving];\nconnecting -> sending;';
    const spans = fslSemanticSpans(doc).filter(s => s.kind === 'state');
    for (const member of ['connecting', 'sending', 'receiving']) {
      const hit = spans.find(s => s.value === member && s.to <= doc.indexOf('\n'));
      expect(hit, `member ${member}`).toBeDefined();
      expect(doc.slice(hit!.from, hit!.to)).toBe(member);
    }
  });

  it('does not mark the group name itself as a state', () => {
    const doc = '&InProgress : [a b];\na -> b;';
    const in_decl = fslSemanticSpans(doc)
      .filter(s => s.kind === 'state' && s.to <= doc.indexOf('\n'))
      .map(s => s.value);
    expect(in_decl).not.toContain('InProgress');
  });

  it('locates repeated and substring-prone members by declaration order', () => {
    const doc = '&G : [end sending end];\nend -> sending;';
    const in_decl = fslSemanticSpans(doc)
      .filter(s => s.kind === 'state' && s.to <= doc.indexOf('\n'));
    expect(in_decl.map(s => doc.slice(s.from, s.to))).toEqual(['end', 'sending', 'end']);
    // the two 'end' spans are distinct positions
    expect(in_decl[0]!.from).not.toBe(in_decl[2]!.from);
  });

  it('marks the single-alias group form member', () => {
    const doc = '&Solo : lonely;\nlonely -> done;';
    const hit = fslSemanticSpans(doc)
      .find(s => s.kind === 'state' && s.value === 'lonely' && s.to <= doc.indexOf('\n'));
    expect(hit).toBeDefined();
    expect(doc.slice(hit!.from, hit!.to)).toBe('lonely');
  });

  it('marks a hook declaration state subject as a state span', () => {
    const doc = 'a -> b;\non enter b do \'act\';';
    const hits = fslSemanticSpans(doc)
      .filter(s => s.kind === 'state' && s.value === 'b' && s.from > doc.indexOf('\n'));
    expect(hits.length).toBe(1);
    expect(doc.slice(hits[0]!.from, hits[0]!.to)).toBe('b');
  });

  it('spans an escape-encoded group member over its quoted source, value unescaped', () => {
    // grammar-sourced locations, not text search: the span covers the quoted
    // source spelling (consistent with quoted transition endpoints) while
    // value carries the resolved, unescaped name.
    const doc = '&G : ["a\\"b" c];\nc -> d;';
    const hit = fslSemanticSpans(doc)
      .find(s => s.kind === 'state' && s.value === 'a"b');
    expect(hit).toBeDefined();
    expect(doc.slice(hit!.from, hit!.to)).toBe('"a\\"b"');
  });

  it('is unfooled by member text recurring in a trailing comment', () => {
    const doc = '&G : [go];\n// go\ngo -> y;';
    const in_decl = fslSemanticSpans(doc)
      .filter(s => s.kind === 'state' && s.value === 'go' && s.to <= doc.indexOf('\n'));
    expect(in_decl.length).toBe(1);
    expect(in_decl[0]!.from).toBe(doc.indexOf('go'));
  });

  it('spans an escape-encoded hook subject over its quoted source', () => {
    const doc = 'a -> "x\\"y";\non enter "x\\"y" do \'act\';';
    const in_hook = fslSemanticSpans(doc)
      .find(s => s.kind === 'state' && s.value === 'x"y' && s.from > doc.indexOf('\n'));
    expect(in_hook).toBeDefined();
    expect(doc.slice(in_hook!.from, in_hook!.to)).toBe('"x\\"y"');
  });

  it('spans state members of a mixed list but not its nest/spread group refs', () => {
    const doc = '&Outer : [alpha &Inner ...&Flat beta];\n&Inner : [x];\n&Flat : [y];\nalpha -> beta;\nx -> y;';
    const first_line = doc.indexOf('\n');
    const in_decl = fslSemanticSpans(doc)
      .filter(s => s.kind === 'state' && s.to <= first_line);
    expect(in_decl.map(s => s.value).sort()).toEqual(['alpha', 'beta']);
    expect(in_decl.map(s => doc.slice(s.from, s.to)).sort()).toEqual(['alpha', 'beta']);
  });

  it('does not mark a hook group-ref subject as a state', () => {
    const doc = 'a -> b;\n&G : [a b];\non exit &G do \'act\';';
    const hook_line = doc.lastIndexOf('on exit');
    const in_hook = fslSemanticSpans(doc)
      .filter(s => s.kind === 'state' && s.from >= hook_line)
      .map(s => s.value);
    expect(in_hook).toEqual([]);
  });
});
