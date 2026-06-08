/* eslint-disable max-len */

import { JssmError } from '../jssm_error';
import { parse }   from '../fsl_parser';
import { compile } from '../jssm_compiler';

const slice = (src: string, loc: any) => src.slice(loc.start.offset, loc.end.offset);

const compileErr = (src: string, located: boolean) => {
  try {
    compile(parse(src, located ? { locations: true } : {}) as any);
  } catch (e) {
    return e as any;
  }
  throw new Error('expected compile to throw');
};

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

describe('compiler semantic errors carry source_location when located', () => {

  test('duplicate one-only statement points at the second occurrence', () => {
    const src = 'fsl_version: 1.0.0;\nfsl_version: 2.0.0;\na -> b;';
    const err = compileErr(src, true);
    expect(err.source_location).toBeDefined();
    expect(slice(src, err.source_location)).toContain('fsl_version: 2.0.0;');
  });

  test('repeated property points at a duplicate', () => {
    const src = 'property foo default 1;\nproperty foo default 2;\na -> b;';
    const err = compileErr(src, true);
    expect(err.source_location).toBeDefined();
    expect(slice(src, err.source_location)).toContain('property foo');
  });

  test('no source_location without locations (message unchanged)', () => {
    const src = 'machine_name: alice;\nmachine_name: bob;\na -> b;';
    const located   = compileErr(src, true);
    const unlocated = compileErr(src, false);
    expect(unlocated.source_location).toBeUndefined();
    expect(unlocated.base_message).toBe(located.base_message);
  });

});
