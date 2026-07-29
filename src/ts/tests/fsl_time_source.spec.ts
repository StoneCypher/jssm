import { describe, it, expect } from 'vitest';
import { Machine, make } from '../jssm';

function build(src: string, time_source: () => number) {
  return new Machine<unknown>({ ...make<string, unknown>(src), time_source });
}

describe('#816 injected time_source is honored', () => {
  it('uses the injected clock for serialize timestamps', () => {
    const m = build('a -> b;', () => 42);
    expect(m.serialize().timestamp).toBe(42);
  });
  it('two machines with a frozen clock serialize identical timestamps', () => {
    const a = build('a -> b;', () => 0).serialize().timestamp;
    const b = build('a -> b;', () => 0).serialize().timestamp;
    expect(a).toBe(b);
  });
  it('canonical() returns the {v,state,data} identity string', () => {
    const m = build('a -> b;', () => 0);
    expect(m.canonical()).toContain('"state":"a"');
    expect(m.canonical()).toContain('"v":1');
  });
});
