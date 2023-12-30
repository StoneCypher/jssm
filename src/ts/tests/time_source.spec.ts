
import { sm } from '../jssm';





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
