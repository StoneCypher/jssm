/**
 * FSL multi-host capability manifests (megaspec §16 / §26; fsl #1172, #1173).
 *
 * A *capability manifest* is a host/adapter target's self-description: the
 * subset of FSL language features it can faithfully emit, and the
 * certification tier it claims.  A machine, in turn, declares the set of
 * features it actually *uses*.  Compiling a machine against a target is then a
 * pure set question — "does every feature the machine needs appear in what the
 * target supports?" — and the answer, when "no", is the concrete list of
 * features the target cannot honor.  That list is what a `targets:` directive
 * turns into a compile-time warning or error (§16), instead of a silent
 * runtime divergence ("your `double` math won't lower faithfully to a
 * fixed-point-only target").
 *
 * This module is the *data model and the checker only*.  It is deliberately
 * free of any parser or runtime coupling: it imports nothing from the rest of
 * jssm, mutates no shared state, and every function here is pure.  Targets
 * "self-advertise their abilities, so the matrix is data-driven and new
 * targets describe themselves" (§16) — so the model is open: a manifest is
 * just data, and unknown future feature names round-trip untouched.
 *
 * The vocabulary of feature names is drawn from the capability/`disallow`
 * family (§3) and the rich-band roster (§3 verifiability bands) — first-class
 * lambdas, 256-bit ints, dense time, arbitrary precision, threads, and so on
 * (§16's own examples).  It is intentionally *not* a closed enum: see
 * {@link FslFeature}.
 *
 * @see CapabilityManifest
 * @see check_capabilities
 * @see https://github.com/StoneCypher/fsl/issues/1172
 * @see https://github.com/StoneCypher/fsl/issues/1173
 */
/**
 *  The set of every {@link CertificationTier} value, as a runtime-checkable
 *  frozen array.  Useful for validation and exhaustive iteration without
 *  re-listing the union by hand.
 *
 *  @example
 *    certification_tiers.includes('T1' as CertificationTier);  // true
 *    certification_tiers.includes('T9' as CertificationTier);  // false
 */
const certification_tiers = Object.freeze(['T1', 'T2', 'T3', 'adapter']);
/**
 *  Build a {@link CapabilityManifest} from a plain list of supported
 *  features.  Duplicate feature names collapse (set semantics); the resulting
 *  manifest's `supports` is a `ReadonlySet`, so the checker cannot mutate it.
 *
 *  @param target - The host/adapter coordinate, e.g. `'native:rust'`.
 *  @param tier - The certification tier the target claims.
 *  @param supports - The features the target can faithfully emit (an
 *    iterable; duplicates are de-duplicated).
 *
 *  @example
 *    // A finite-profile C target: integers and transitions, no floats.
 *    const c_target = make_manifest('native:c', 'T1',
 *      ['transitions', 'actions', 'vals', 'int256']);
 *    c_target.tier;                  // 'T1'
 *    c_target.supports.has('float'); // false
 *
 *  @see check_capabilities
 */
function make_manifest(target, tier, supports) {
    return {
        target,
        tier,
        supports: new Set(supports)
    };
}
/**
 *  Build a {@link MachineRequirements} from a plain list of used features.
 *  Duplicate feature names collapse (set semantics).
 *
 *  @param required - The features the machine uses (an iterable; duplicates
 *    are de-duplicated).
 *
 *  @example
 *    const needs = make_requirements(['transitions', 'float', 'rand']);
 *    needs.required.has('float');  // true
 *
 *  @see check_capabilities
 */
function make_requirements(required) {
    return {
        required: new Set(required)
    };
}
/**
 *  Decide whether a target's capability manifest satisfies a machine's
 *  feature requirements (megaspec §16, #1172/#1173).
 *
 *  Pure set difference: a requirement is *missing* when the manifest's
 *  `supports` set does not contain it.  The machine is satisfied exactly when
 *  nothing is missing.  This is the codegen dual of the verification
 *  capability attributes (§3): those bound what the *checker* may assume; this
 *  bounds what a *host* can emit.
 *
 *  The returned `missing` list is **sorted** (lexicographically) so that
 *  diagnostics are deterministic and reproducible regardless of set iteration
 *  order — important because FSL diagnostics are meant to be stable across
 *  runs and hosts (§15).
 *
 *  @param requirements - The features the machine uses.
 *  @param manifest - The target's self-declared capabilities.
 *  @returns The verdict: whether satisfied, and which features (if any) the
 *    target cannot honor.
 *
 *  @example
 *    // A double-using machine against a fixed-point-only target.
 *    const target = make_manifest('native:c', 'T1', ['transitions', 'int256']);
 *    const needs  = make_requirements(['transitions', 'double']);
 *    const r = check_capabilities(needs, target);
 *    r.satisfied;  // false
 *    r.missing;    // ['double']
 *
 *  @example
 *    // Everything the machine needs is present.
 *    const rich = make_manifest('native:rust', 'T2',
 *      ['transitions', 'double', 'first_class_lambdas']);
 *    const needs2 = make_requirements(['transitions', 'double']);
 *    check_capabilities(needs2, rich).satisfied;  // true
 *    check_capabilities(needs2, rich).missing;    // []
 *
 *  @see make_manifest
 *  @see make_requirements
 */
function check_capabilities(requirements, manifest) {
    const missing = [];
    for (const feature of requirements.required) {
        if (!manifest.supports.has(feature)) {
            missing.push(feature);
        }
    }
    missing.sort();
    return {
        satisfied: (missing.length === 0),
        missing: missing,
        target: manifest.target,
        tier: manifest.tier
    };
}
/**
 *  Check a machine's requirements against *several* candidate targets at once
 *  — the shape a `targets: a, b, c;` directive needs (megaspec §16).  Returns
 *  one {@link CapabilityCheckResult} per manifest, in input order, so a caller
 *  can report per-target diagnostics.
 *
 *  @param requirements - The features the machine uses.
 *  @param manifests - The candidate targets' manifests.
 *  @returns One verdict per manifest, in the same order.
 *
 *  @example
 *    const needs = make_requirements(['transitions', 'double']);
 *    const c    = make_manifest('native:c',    'T1', ['transitions']);
 *    const rust = make_manifest('native:rust', 'T2', ['transitions', 'double']);
 *    const results = check_capabilities_all(needs, [c, rust]);
 *    results.map(r => r.satisfied);  // [false, true]
 *
 *  @see check_capabilities
 */
function check_capabilities_all(requirements, manifests) {
    return manifests.map(manifest => check_capabilities(requirements, manifest));
}
export { certification_tiers, make_manifest, make_requirements, check_capabilities, check_capabilities_all };
