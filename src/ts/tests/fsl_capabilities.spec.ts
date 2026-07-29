import {
  CertificationTier,
  certification_tiers,
  FslFeature,
  CapabilityManifest,
  MachineRequirements,
  make_manifest,
  make_requirements,
  feature_compare,
  check_capabilities,
  check_capabilities_all
} from '../fsl_capabilities';



describe('fsl_capabilities', () => {

  describe('certification_tiers', () => {

    test('contains exactly the four declared tiers', () => {
      expect([...certification_tiers]).toEqual(['T1', 'T2', 'T3', 'adapter']);
    });

    test('every member is a valid CertificationTier and includes works', () => {
      // includes is the runtime-validation use the constant exists for.
      expect(certification_tiers.includes('T1' as CertificationTier)).toBe(true);
      expect(certification_tiers.includes('adapter' as CertificationTier)).toBe(true);
      expect(certification_tiers.includes('T9' as CertificationTier)).toBe(false);
    });

    test('is frozen — the canonical tier list cannot be mutated', () => {
      expect(Object.isFrozen(certification_tiers)).toBe(true);
    });

  });


  describe('make_manifest', () => {

    test('records target, tier, and supported features', () => {
      const m = make_manifest('native:c', 'T1', ['transitions', 'actions']);
      expect(m.target).toBe('native:c');
      expect(m.tier).toBe('T1');
      expect(m.supports.has('transitions')).toBe(true);
      expect(m.supports.has('actions')).toBe(true);
      expect(m.supports.has('float')).toBe(false);
    });

    test('de-duplicates repeated feature names (set semantics)', () => {
      const m = make_manifest('native:rust', 'T2',
        ['double', 'double', 'transitions']);
      expect(m.supports.size).toBe(2);
    });

    test('accepts an empty support list', () => {
      const m = make_manifest('adapter:xstate', 'adapter', []);
      expect(m.supports.size).toBe(0);
    });

    test('accepts any iterable, not only arrays', () => {
      const src = new Set<FslFeature>(['transitions', 'vals']);
      const m = make_manifest('native:python', 'T2', src);
      expect(m.supports.size).toBe(2);
      expect(m.supports.has('vals')).toBe(true);
    });

    test('round-trips an unknown future / plugin feature name (open arm)', () => {
      const m = make_manifest('native:erlang', 'T2', ['simd_lanes_512']);
      expect(m.supports.has('simd_lanes_512')).toBe(true);
    });

  });


  describe('make_requirements', () => {

    test('records the required features', () => {
      const r = make_requirements(['transitions', 'float', 'rand']);
      expect(r.required.has('transitions')).toBe(true);
      expect(r.required.has('float')).toBe(true);
      expect(r.required.has('rand')).toBe(true);
    });

    test('de-duplicates repeated feature names', () => {
      const r = make_requirements(['vals', 'vals', 'vals']);
      expect(r.required.size).toBe(1);
    });

    test('accepts an empty requirement set', () => {
      const r = make_requirements([]);
      expect(r.required.size).toBe(0);
    });

  });


  describe('feature_compare', () => {

    test('orders feature names by UTF-16 code unit, all three arms', () => {
      expect(feature_compare('double', 'int256')).toBe(-1);
      expect(feature_compare('tapes', 'sensors')).toBe(1);
      expect(feature_compare('tapes', 'tapes')).toBe(0);
    });

    test('matches the default comparator-less sort order', () => {
      const features: FslFeature[] = ['tapes', 'double', 'int256'];
      // eslint-disable-next-line unicorn/require-array-sort-compare -- the platform's comparator-free string sort IS the reference behavior under test; supplying a comparator would make this tautological
      expect([...features].sort(feature_compare)).toEqual([...features].sort());
    });

  });


  describe('check_capabilities', () => {

    test('satisfied when every required feature is supported', () => {
      const target: CapabilityManifest =
        make_manifest('native:rust', 'T2',
          ['transitions', 'double', 'first_class_lambdas']);
      const needs: MachineRequirements =
        make_requirements(['transitions', 'double']);

      const result = check_capabilities(needs, target);

      expect(result.satisfied).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.target).toBe('native:rust');
      expect(result.tier).toBe('T2');
    });

    test('unsatisfied lists exactly the unsupported features', () => {
      const target = make_manifest('native:c', 'T1', ['transitions', 'int256']);
      const needs  = make_requirements(['transitions', 'double']);

      const result = check_capabilities(needs, target);

      expect(result.satisfied).toBe(false);
      expect(result.missing).toEqual(['double']);
    });

    test('an empty requirement set is always satisfied', () => {
      const target = make_manifest('native:c', 'T1', []);
      const needs  = make_requirements([]);

      const result = check_capabilities(needs, target);

      expect(result.satisfied).toBe(true);
      expect(result.missing).toEqual([]);
    });

    test('missing list is sorted for deterministic diagnostics', () => {
      // Inserted out of sorted order to prove the sort actually runs.
      const target = make_manifest('native:c', 'T1', ['transitions']);
      const needs  = make_requirements(['threads', 'double', 'longint']);

      const result = check_capabilities(needs, target);

      expect(result.satisfied).toBe(false);
      expect(result.missing).toEqual(['double', 'longint', 'threads']);
    });

    test('all-missing when the target supports nothing the machine needs', () => {
      const target = make_manifest('adapter:xstate', 'adapter', []);
      const needs  = make_requirements(['emit', 'channels']);

      const result = check_capabilities(needs, target);

      expect(result.satisfied).toBe(false);
      expect(result.missing).toEqual(['channels', 'emit']);
    });

    test('echoes the manifest target and tier into the verdict', () => {
      const target = make_manifest('adapter:boost_msm', 'adapter', ['transitions']);
      const needs  = make_requirements(['emit']);

      const result = check_capabilities(needs, target);

      expect(result.target).toBe('adapter:boost_msm');
      expect(result.tier).toBe('adapter');
    });

    test('an unknown future feature the target lacks is reported missing', () => {
      const target = make_manifest('native:c', 'T1', ['transitions']);
      const needs  = make_requirements(['quantum_gates']);

      const result = check_capabilities(needs, target);

      expect(result.satisfied).toBe(false);
      expect(result.missing).toEqual(['quantum_gates']);
    });

  });


  describe('check_capabilities_all', () => {

    test('returns one verdict per manifest, in input order', () => {
      const needs = make_requirements(['transitions', 'double']);
      const c    = make_manifest('native:c',    'T1', ['transitions']);
      const rust = make_manifest('native:rust', 'T2', ['transitions', 'double']);

      const results = check_capabilities_all(needs, [c, rust]);

      expect(results).toHaveLength(2);
      expect(results[0].target).toBe('native:c');
      expect(results[0].satisfied).toBe(false);
      expect(results[0].missing).toEqual(['double']);
      expect(results[1].target).toBe('native:rust');
      expect(results[1].satisfied).toBe(true);
    });

    test('returns an empty list when given no manifests', () => {
      const needs = make_requirements(['transitions']);
      expect(check_capabilities_all(needs, [])).toEqual([]);
    });

  });

});
