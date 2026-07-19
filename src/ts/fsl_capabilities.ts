
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
 * @see CapabilityManifest
 * @see check_capabilities
 * @see https://github.com/StoneCypher/fsl/issues/1172
 * @see https://github.com/StoneCypher/fsl/issues/1173
 */




/**
 *  A certification tier a codegen target may claim (megaspec §26).  A target
 *  "declares its certified tier in its capability manifest (#1172)".
 *
 *  - `'T1'` — the **finite profile**: no floats, no locale, no regex, no
 *    Unicode tables.  Trivially exact on every host, including bare C.
 *  - `'T2'` — **rich-portable**: the rich band, portable across hosts.
 *  - `'T3'` — **pinned-unicode**: T2 plus the locked-Unicode-version string
 *    operations (§8).
 *  - `'adapter'` — an **adapter** target (xstate, boost::msm, stent, …) that
 *    re-expresses FSL onto a foreign runtime over a declared feature subset,
 *    rather than shipping a certified native runtime.
 */
type CertificationTier = 'T1' | 'T2' | 'T3' | 'adapter';



/**
 *  The set of every {@link CertificationTier} value, as a runtime-checkable
 *  frozen array.  Useful for validation and exhaustive iteration without
 *  re-listing the union by hand.
 *  @example
 *    certification_tiers.includes('T1' as CertificationTier);  // true
 *    certification_tiers.includes('T9' as CertificationTier);  // false
 */
const certification_tiers: ReadonlyArray<CertificationTier> =
  Object.freeze(['T1', 'T2', 'T3', 'adapter'] as const);



/**
 *  A single FSL feature name, as it appears both in a target's
 *  {@link CapabilityManifest} (features the target *supports*) and in a
 *  machine's {@link MachineRequirements} (features the machine *uses*).
 *
 *  The named members below are the well-known features the spec calls out
 *  explicitly (§16's manifest examples and the §3 capability/`disallow`
 *  family).  The trailing `(string & {})` arm keeps the type **open**: a new
 *  target plugin (or a future language feature) may name a capability this
 *  module has never heard of, and it must round-trip through the model and the
 *  checker untouched — "new targets describe themselves" (§16).  Editors still
 *  autocomplete the known names while the open arm preserves forward
 *  compatibility.
 */
type FslFeature =
  // §16 manifest examples
  | 'first_class_lambdas'
  | 'int256'
  | 'dense_time'
  | 'arbitrary_precision'
  | 'threads'
  // rich numeric band (§3 / §4.1)
  | 'float'
  | 'double'
  | 'longint'
  | 'unbounded_decimal'
  // rich containers / dynamic (§3 / §4.2)
  | 'open_strings'
  | 'open_containers'
  | 'recursive_adts'
  | 'any_dynamic'
  // §3 capability / disallow family
  | 'transitions'
  | 'actions'
  | 'forced_transitions'
  | 'override'
  | 'tapes'
  | 'sensors'
  | 'channels'
  | 'emit'
  | 'time'
  | 'vals'
  | 'assign'
  | 'data'
  | 'rand'
  | 'probability'
  | 'rollback'
  | 'composition'
  | 'embedding'
  // §8 pinned-unicode string operations
  | 'pinned_unicode'
  // open arm — forward-compatible, unknown future / plugin features
  | (string & {});



/**
 *  A host/adapter codegen target's self-description (megaspec §16, #1172).
 *
 *  - `target` — the host↔library coordinate, e.g. `'native:rust'`,
 *    `'native:c'`, `'adapter:xstate'`.  Opaque to the checker; it only
 *    identifies the manifest in diagnostics.
 *  - `tier` — the {@link CertificationTier} the target claims.
 *  - `supports` — the features the target can faithfully emit.  Stored as a
 *    `ReadonlySet` so membership is O(1) and the manifest cannot be mutated by
 *    the checker.
 *  @see make_manifest — the convenient constructor.
 *  @see check_capabilities — the satisfaction check.
 */
interface CapabilityManifest {
  readonly target    : string;
  readonly tier      : CertificationTier;
  readonly supports  : ReadonlySet<FslFeature>;
}



/**
 *  The features a particular machine actually uses — its demand side of the
 *  negotiation (megaspec §16).  A `ReadonlySet`, mirroring
 *  {@link CapabilityManifest.supports}.
 */
interface MachineRequirements {
  readonly required  : ReadonlySet<FslFeature>;
}



/**
 *  The verdict of checking a machine's requirements against a target's
 *  capability manifest (megaspec §16).
 *
 *  - `satisfied` — `true` iff the target supports every required feature.
 *  - `missing` — the required features the target does **not** support, sorted
 *    for stable, reproducible diagnostics.  Empty exactly when `satisfied`.
 *  - `target` / `tier` — echoed from the manifest so a caller aggregating
 *    several results can attribute each verdict without re-threading the
 *    manifest.
 */
interface CapabilityCheckResult {
  readonly satisfied : boolean;
  readonly missing   : ReadonlyArray<FslFeature>;
  readonly target    : string;
  readonly tier      : CertificationTier;
}



/**
 *  Build a {@link CapabilityManifest} from a plain list of supported
 *  features.  Duplicate feature names collapse (set semantics); the resulting
 *  manifest's `supports` is a `ReadonlySet`, so the checker cannot mutate it.
 *  @param target - The host/adapter coordinate, e.g. `'native:rust'`.
 *  @param tier - The certification tier the target claims.
 *  @param supports - The features the target can faithfully emit (an
 *    iterable; duplicates are de-duplicated).
 *  @example
 *    // A finite-profile C target: integers and transitions, no floats.
 *    const c_target = make_manifest('native:c', 'T1',
 *      ['transitions', 'actions', 'vals', 'int256']);
 *    c_target.tier;                  // 'T1'
 *    c_target.supports.has('float'); // false
 *  @see check_capabilities
 */
function make_manifest(
  target   : string,
  tier     : CertificationTier,
  supports : Iterable<FslFeature>
): CapabilityManifest {
  return {
    target,
    tier,
    supports: new Set<FslFeature>(supports)
  };
}



/**
 *  Build a {@link MachineRequirements} from a plain list of used features.
 *  Duplicate feature names collapse (set semantics).
 *  @param required - The features the machine uses (an iterable; duplicates
 *    are de-duplicated).
 *  @example
 *    const needs = make_requirements(['transitions', 'float', 'rand']);
 *    needs.required.has('float');  // true
 *  @see check_capabilities
 */
function make_requirements(
  required : Iterable<FslFeature>
): MachineRequirements {
  return {
    required: new Set<FslFeature>(required)
  };
}



/**
 *  Orders two feature names by UTF-16 code unit — the same order the default
 *  comparator-less `Array.prototype.sort` gives an all-string array — so a
 *  missing-feature list is deterministic across hosts and never depends on the
 *  host locale.
 *  @param a - The left feature name.
 *  @param b - The right feature name.
 *  @returns `-1`, `0`, or `1` as `a` sorts before, equal to, or after `b`.
 *  @example
 *    feature_compare('double', 'int256')   // → -1
 *    feature_compare('tapes', 'sensors')   // → 1
 *  @see check_capabilities
 */
function feature_compare(a: FslFeature, b: FslFeature): -1 | 0 | 1 {
  if (a < b) { return -1; }
  if (a > b) { return 1;  }
  return 0;
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
 *  @param requirements - The features the machine uses.
 *  @param manifest - The target's self-declared capabilities.
 *  @returns The verdict: whether satisfied, and which features (if any) the
 *    target cannot honor.
 *  @example
 *    // A double-using machine against a fixed-point-only target.
 *    const target = make_manifest('native:c', 'T1', ['transitions', 'int256']);
 *    const needs  = make_requirements(['transitions', 'double']);
 *    const r = check_capabilities(needs, target);
 *    r.satisfied;  // false
 *    r.missing;    // ['double']
 *  @example
 *    // Everything the machine needs is present.
 *    const rich = make_manifest('native:rust', 'T2',
 *      ['transitions', 'double', 'first_class_lambdas']);
 *    const needs2 = make_requirements(['transitions', 'double']);
 *    check_capabilities(needs2, rich).satisfied;  // true
 *    check_capabilities(needs2, rich).missing;    // []
 *  @see make_manifest
 *  @see make_requirements
 */
function check_capabilities(
  requirements : MachineRequirements,
  manifest     : CapabilityManifest
): CapabilityCheckResult {

  const missing: Array<FslFeature> = [];

  for (const feature of requirements.required) {
    if (!manifest.supports.has(feature)) {
      missing.push(feature);
    }
  }

  missing.sort(feature_compare);

  return {
    satisfied : (missing.length === 0),
    missing   : missing,
    target    : manifest.target,
    tier      : manifest.tier
  };
}



/**
 *  Check a machine's requirements against *several* candidate targets at once
 *  — the shape a `targets: a, b, c;` directive needs (megaspec §16).  Returns
 *  one {@link CapabilityCheckResult} per manifest, in input order, so a caller
 *  can report per-target diagnostics.
 *  @param requirements - The features the machine uses.
 *  @param manifests - The candidate targets' manifests.
 *  @returns One verdict per manifest, in the same order.
 *  @example
 *    const needs = make_requirements(['transitions', 'double']);
 *    const c    = make_manifest('native:c',    'T1', ['transitions']);
 *    const rust = make_manifest('native:rust', 'T2', ['transitions', 'double']);
 *    const results = check_capabilities_all(needs, [c, rust]);
 *    results.map(r => r.satisfied);  // [false, true]
 *  @see check_capabilities
 */
function check_capabilities_all(
  requirements : MachineRequirements,
  manifests    : ReadonlyArray<CapabilityManifest>
): ReadonlyArray<CapabilityCheckResult> {
  return manifests.map(manifest => check_capabilities(requirements, manifest));
}



export {
  CertificationTier,
  certification_tiers,
  FslFeature,
  CapabilityManifest,
  MachineRequirements,
  CapabilityCheckResult,
  make_manifest,
  make_requirements,
  check_capabilities,
  check_capabilities_all
};
