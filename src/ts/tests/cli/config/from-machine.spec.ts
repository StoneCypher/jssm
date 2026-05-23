import { extractMachineAttributes } from '../../../cli/config/sources/from-machine';

describe('cli/config/sources/from-machine', () => {

  it('returns an empty PartialConfig for a typical machine in v1', () => {
    const fsl = `
      a 'next' -> b 'next' -> c;
    `;
    const out = extractMachineAttributes(fsl);
    expect(out).toEqual({});
  });

  it('returns an empty PartialConfig for a machine with current attribute syntax', () => {
    const fsl = `
      machine_name: "traffic light";
      machine_author: "Test";
      a 'next' -> b;
    `;
    const out = extractMachineAttributes(fsl);
    expect(out).toEqual({});
  });

  it('returns an empty PartialConfig for invalid FSL (does not throw)', () => {
    // Robust to broken FSL — config layering should not block on parser errors.
    const out = extractMachineAttributes('not actually fsl');
    expect(out).toEqual({});
  });

  it('returns a plain object (not frozen, callers may merge)', () => {
    const out = extractMachineAttributes('a -> b;');
    expect(Object.isFrozen(out)).toBe(false);
  });

});
