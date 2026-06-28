
import { sm, Machine, make } from '../jssm';





describe('Creation date, time, timestamp', () => {

  const m = sm`a -> b;`;

  test('Creation date exists and is a date', () => {
    expect(m.creation_date === undefined).toBe(false);
    expect(m.creation_date instanceof Date).toBe(true);
  });

  test('Creation timestamp exists and is a number', () => {
    expect(m.creation_timestamp === undefined).toBe(false);
    expect(typeof m.creation_timestamp).toBe('number');
  });

  test('Creation start time exists and is a number', () => {
    expect(m.create_start_time === undefined).toBe(false);
    expect(typeof m.create_start_time).toBe('number');
  });

});


describe('#816 injected time_source is honored', () => {

  test('serialize() timestamp comes from the injected clock', () => {
    const m = new Machine<unknown>({ ...make<string, unknown>('a -> b;'), time_source: () => 42 });
    expect(m.serialize().timestamp).toBe(42);
  });

  test('a frozen clock makes two machines serialize identical timestamps', () => {
    const a = new Machine<unknown>({ ...make<string, unknown>('a -> b;'), time_source: () => 0 }).serialize().timestamp;
    const b = new Machine<unknown>({ ...make<string, unknown>('a -> b;'), time_source: () => 0 }).serialize().timestamp;
    expect(a).toBe(b);
  });

});
