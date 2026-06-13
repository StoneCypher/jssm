
import {
  CODATA_YEAR,
  CONSTANTS_VERSION,
  PHYSICAL_CONSTANTS,
  lookup_constant,
  UnknownConstantError
} from '../fsl_constants';

import type { PhysicalConstant } from '../fsl_constants';




describe('fsl_constants version tag', () => {

  test('CODATA_YEAR is 2018', () => {
    expect(CODATA_YEAR).toBe(2018);
  });

  test('CONSTANTS_VERSION is the labeled tag', () => {
    expect(CONSTANTS_VERSION).toBe('CODATA 2018');
  });

  test('every constant carries the module CODATA year', () => {
    for (const key of Object.keys(PHYSICAL_CONSTANTS)) {
      expect(PHYSICAL_CONSTANTS[key as keyof typeof PHYSICAL_CONSTANTS].codata_year).toBe(CODATA_YEAR);
    }
  });

});




describe('fsl_constants CODATA 2018 values', () => {

  test('speed of light c is the exact SI value', () => {
    expect(PHYSICAL_CONSTANTS.c.value).toBe(299_792_458);
    expect(PHYSICAL_CONSTANTS.c.unit).toBe('m s^-1');
    expect(PHYSICAL_CONSTANTS.c.uncertainty).toBe(0);
  });

  test('Planck constant h', () => {
    expect(PHYSICAL_CONSTANTS.h.value).toBe(6.626_070_15e-34);
    expect(PHYSICAL_CONSTANTS.h.unit).toBe('J Hz^-1');
    expect(PHYSICAL_CONSTANTS.h.uncertainty).toBe(0);
  });

  test('reduced Planck constant hbar', () => {
    expect(PHYSICAL_CONSTANTS.hbar.value).toBe(1.054_571_817e-34);
  });

  test('elementary charge e', () => {
    expect(PHYSICAL_CONSTANTS.e.value).toBe(1.602_176_634e-19);
    expect(PHYSICAL_CONSTANTS.e.unit).toBe('C');
  });

  test('Boltzmann constant k_B', () => {
    expect(PHYSICAL_CONSTANTS.k_B.value).toBe(1.380_649e-23);
    expect(PHYSICAL_CONSTANTS.k_B.unit).toBe('J K^-1');
  });

  test('Avogadro constant N_A', () => {
    expect(PHYSICAL_CONSTANTS.N_A.value).toBe(6.022_140_76e23);
    expect(PHYSICAL_CONSTANTS.N_A.unit).toBe('mol^-1');
  });

  test('Newtonian gravitation G is measured (nonzero uncertainty)', () => {
    expect(PHYSICAL_CONSTANTS.G.value).toBe(6.674_30e-11);
    expect(PHYSICAL_CONSTANTS.G.uncertainty).toBe(0.000_15e-11);
    expect(PHYSICAL_CONSTANTS.G.uncertainty).toBeGreaterThan(0);
  });

  test('electron mass m_e', () => {
    expect(PHYSICAL_CONSTANTS.m_e.value).toBe(9.109_383_7015e-31);
    expect(PHYSICAL_CONSTANTS.m_e.unit).toBe('kg');
    expect(PHYSICAL_CONSTANTS.m_e.uncertainty).toBeGreaterThan(0);
  });

  test('proton mass m_p', () => {
    expect(PHYSICAL_CONSTANTS.m_p.value).toBe(1.672_621_923_69e-27);
  });

  test('neutron mass m_n', () => {
    expect(PHYSICAL_CONSTANTS.m_n.value).toBe(1.674_927_498_04e-27);
  });

  test('fine-structure constant alpha is dimensionless', () => {
    expect(PHYSICAL_CONSTANTS.alpha.value).toBe(7.297_352_5693e-3);
    expect(PHYSICAL_CONSTANTS.alpha.unit).toBe('');
  });

  test('molar gas constant R', () => {
    expect(PHYSICAL_CONSTANTS.R.value).toBe(8.314_462_618);
    expect(PHYSICAL_CONSTANTS.R.unit).toBe('J mol^-1 K^-1');
  });

  test('vacuum permittivity eps0', () => {
    expect(PHYSICAL_CONSTANTS.eps0.value).toBe(8.854_187_8128e-12);
    expect(PHYSICAL_CONSTANTS.eps0.uncertainty).toBeGreaterThan(0);
  });

  test('vacuum permeability mu0', () => {
    expect(PHYSICAL_CONSTANTS.mu0.value).toBe(1.256_637_062_12e-6);
  });

  test('standard gravity g_n is exact', () => {
    expect(PHYSICAL_CONSTANTS.g_n.value).toBe(9.806_65);
    expect(PHYSICAL_CONSTANTS.g_n.uncertainty).toBe(0);
  });

  test('uncertainty is never negative for any constant', () => {
    for (const key of Object.keys(PHYSICAL_CONSTANTS)) {
      const k = PHYSICAL_CONSTANTS[key as keyof typeof PHYSICAL_CONSTANTS];
      expect(k.uncertainty).toBeGreaterThanOrEqual(0);
      expect(typeof k.name).toBe('string');
      expect(k.name.length).toBeGreaterThan(0);
    }
  });

});




describe('lookup_constant', () => {

  test('hit: returns the registered constant by symbol', () => {
    const c: PhysicalConstant = lookup_constant('c');
    expect(c.value).toBe(299_792_458);
    expect(c.name).toBe('speed of light in vacuum');
    expect(c).toBe(PHYSICAL_CONSTANTS.c);
  });

  test('hit: works for a measured constant too', () => {
    expect(lookup_constant('G').uncertainty).toBeGreaterThan(0);
  });

  test('miss: throws UnknownConstantError (type)', () => {
    expect(() => lookup_constant('does_not_exist')).toThrow(UnknownConstantError);
  });

  test('miss: error message names the missing symbol and version (substring)', () => {
    expect(() => lookup_constant('nope')).toThrow('unknown physical constant "nope"');
    expect(() => lookup_constant('nope')).toThrow('CODATA 2018');
  });

  test('miss: error carries the offending symbol field', () => {
    try {
      lookup_constant('zzz');
      throw new Error('lookup_constant should have thrown');
    } catch (e) {
      expect(e instanceof UnknownConstantError).toBe(true);
      expect((e as UnknownConstantError).symbol).toBe('zzz');
      expect((e as UnknownConstantError).name).toBe('UnknownConstantError');
    }
  });

  test('miss: inherited Object property names do not count as constants', () => {
    expect(() => lookup_constant('toString')).toThrow(UnknownConstantError);
    expect(() => lookup_constant('hasOwnProperty')).toThrow(UnknownConstantError);
  });

});
