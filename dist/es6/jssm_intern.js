/**
 * String interning support for the jssm machine internals.
 *
 * State and action names are interned to dense integer ids at machine
 * construction so that per-transition dispatch can use numeric map keys
 * (integer hashing) instead of repeated string-keyed lookups.  Internal
 * machinery only — deliberately not re-exported from the `jssm` public
 * surface, so the public API is unchanged.
 * @internal
 */
/**
 * A string↔integer bimap.  Assigns dense ids (0, 1, 2, …) in first-seen
 * order; lookups are O(1) both directions.  Grows monotonically — there is
 * no removal, matching machine semantics (states and actions are fixed
 * after construction; late interning only happens for never-matching
 * lookups such as hook registrations naming unknown states).
 * @example
 *   const i = new Interner();
 *   i.intern('red');     // 0
 *   i.intern('green');   // 1
 *   i.intern('red');     // 0  (idempotent)
 *   i.id_of('green');    // 1
 *   i.name_of(0);        // 'red'
 * @see pair_key
 */
class Interner {
    constructor() {
        this.ids = new Map();
        this.names = [];
    }
    /**
     * Return the id for `name`, assigning the next dense id if the name has
     * not been seen before.
     * @param name - The string to intern.
     * @returns The (possibly newly assigned) integer id.
     * @example
     *   interner.intern('red');  // 0 on first call, 0 on every later call
     */
    intern(name) {
        const existing = this.ids.get(name);
        if (existing !== undefined) {
            return existing;
        }
        const id = this.names.length;
        this.ids.set(name, id);
        this.names.push(name);
        return id;
    }
    /**
     * Return the id for `name` without interning, or `undefined` when the
     * name has never been interned.  This is the hot-path probe for
     * user-supplied names.
     * @param name - The string to look up.
     * @example
     *   interner.id_of('mauve');  // undefined — never interned
     */
    id_of(name) {
        return this.ids.get(name);
    }
    /**
     * Return the name for `id`, or `undefined` for an id never assigned.
     * @param id - The integer id to invert.
     * @example
     *   interner.name_of(0);  // 'red'
     */
    name_of(id) {
        return this.names[id];
    }
    /** The count of distinct interned names. */
    get size() {
        return this.names.length;
    }
}
/**
 * Szudzik pairing: packs two non-negative integers into one unique number,
 * order-sensitively, with no dependence on a fixed table size — so interners
 * may keep growing without invalidating existing keys.  Values stay exact
 * for ids below 2^26 (the result is bounded by roughly max(a,b)^2), far
 * beyond any real machine's state count.
 *
 * NaN deliberately propagates: probing with an unknown name's id
 * (`id_of(...) ?? NaN`) yields a NaN key, which can never match a stored
 * key, so the lookup misses — exactly the behavior of the string-keyed maps
 * it replaces.  Do NOT use a negative sentinel instead: Szudzik is only
 * injective over the naturals, and a negative input can collide with a real
 * stored key (e.g. szudzik(-1, 2) === szudzik(1, 1) === 3), which would make
 * lookups from an unknown state falsely succeed.
 * @param a - First non-negative integer (or NaN as a deliberate miss).
 * @param b - Second non-negative integer (or NaN as a deliberate miss).
 * @returns A number unique to the ordered pair `(a, b)` over the naturals.
 * @example
 *   pair_key(2, 5);  // 27
 *   pair_key(5, 2);  // 32 — order-sensitive
 * @see Interner
 */
function pair_key(a, b) {
    return (a >= b)
        ? (a * a) + a + b
        : (b * b) + a;
}
/**
 * Inverse of {@link pair_key}: recovers the ordered pair `(a, b)` that was
 * packed into a Szudzik key.  Exact for any key produced by `pair_key` over
 * non-negative integer inputs, so `un_pair_key(pair_key(a, b))` round-trips
 * to `[a, b]`.  Used to walk interned, pair-keyed maps (e.g. the hook tables)
 * back to their original `(from_id, to_id)` ids for {@link Interner.name_of}.
 *
 * Behavior is only defined for keys `pair_key` actually emits; a NaN key (the
 * unknown-name sentinel) yields `[NaN, NaN]`, never a spurious real pair.
 * @param z - A key produced by `pair_key`.
 * @returns The ordered pair `[a, b]` such that `pair_key(a, b) === z`.
 * @example
 *   un_pair_key(27);  // [2, 5]
 *   un_pair_key(32);  // [5, 2] — order preserved
 * @see pair_key
 */
function un_pair_key(z) {
    const s = Math.floor(Math.sqrt(z));
    const l = z - (s * s);
    return (l < s) ? [l, s] : [s, l - s];
}
export { Interner, pair_key, un_pair_key };
