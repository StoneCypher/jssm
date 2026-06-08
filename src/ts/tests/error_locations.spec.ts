/* eslint-disable max-len */

import { JssmError } from '../jssm_error';

describe('JssmError source_location', () => {

  test('stores a provided source_location', () => {
    const loc = { start: { offset: 3, line: 1, column: 4 }, end: { offset: 8, line: 1, column: 9 } };
    const err = new JssmError(undefined, 'boom', { source_location: loc });
    expect(err.source_location).toEqual(loc);
  });

  test('is undefined when no extended info is given', () => {
    const err = new JssmError(undefined, 'boom');
    expect(err.source_location).toBeUndefined();
  });

  test('message string is unchanged by source_location', () => {
    const loc = { start: { offset: 0, line: 1, column: 1 }, end: { offset: 1, line: 1, column: 2 } };
    const a = new JssmError(undefined, 'boom');
    const b = new JssmError(undefined, 'boom', { source_location: loc });
    expect(b.message).toBe(a.message);
  });

});
