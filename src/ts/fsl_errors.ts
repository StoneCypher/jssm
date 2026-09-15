
import { FslSourceLocation } from './jssm_types';





/*******
 *
 *  The FSL error-model taxonomy (megaspec §11).
 *
 *  FSL expressions are *total by design*: the checkable tier has no loops, no
 *  recursion, and no effects, so every expression terminates.  What it does
 *  *not* promise is that every operation succeeds — `div0`, an out-of-bounds
 *  index, an arithmetic overflow, or a failed narrow each turn an otherwise
 *  total function *partial*.  When one of those partial operations is actually
 *  reached at runtime, the machine raises a typed {@link FslError}: a structured,
 *  self-describing value whose finite {@link FslErrorKind} can be matched in a
 *  guard (`where last_error.kind = div_by_zero`) and whose message *names the
 *  offending entity* so a human reading a log knows exactly what failed.
 *
 *  This module is intentionally *self-contained*: it depends only on the
 *  `FslSourceLocation` type (for carrying source spans) and the host `Error`,
 *  so it can be folded into the v6 runtime without dragging the rest of the
 *  compiler with it.
 *
 */





/*******
 *
 *  The closed, finite enumeration of FSL error kinds (megaspec §11 —
 *  `Error.kind` is a "finite enum").  This is the discriminant a guard matches
 *  on; the human-readable detail lives in {@link FslError.message}.
 *
 *  Each member names the partial operation (or failed obligation) that raised
 *  the error:
 *
 *  - `div_by_zero`         — `/`, `mod`, `rem`, or `div` with a zero divisor.
 *  - `out_of_bounds`       — an index/slice outside a string, array, bytearray,
 *                            or other indexed container.
 *  - `overflow`            — a fixed-width numeric result outside the declared
 *                            range (the default, non-saturating, non-wrapping
 *                            behavior of §4.1).
 *  - `underflow`           — a fixed-width numeric result below the declared
 *                            minimum (the negative-side partner of `overflow`).
 *  - `type_error`          — a statically-forbidden mixing reached dynamically,
 *                            e.g. a cross-type comparison or a dimensioned-unit
 *                            mismatch (§6, §4.5).
 *  - `failed_narrow`       — an `any`/`option`/variant narrowing (`case`) that
 *                            did not match the runtime tag (§4.4, §13).
 *  - `contract_violation`  — a `require`, `ensure`, or `invariant` that did not
 *                            hold (§10); the specific contract is in
 *                            `Error.contract` / the message.
 *  - `unbound_value`       — a `val`/`prop`/`sensor` read before it had a value
 *                            (no `default`, none supplied, `required` unmet).
 *  - `nan_compare`         — an ordering comparison (`<`, `<=`, `>`, `>=`)
 *                            against a `NaN`, where IEEE makes the result
 *                            meaningless (§4.1 — use the total `compare`).
 *  - `microstep_overflow`  — RTC settling exceeded the microstep bound (§12,
 *                            §13 — a non-stabilizing eventless cycle).
 *
 *  Exported as a frozen array so tooling and tests can enumerate the full set
 *  exactly as `gviz_shapes` / `named_colors` are enumerated.
 *
 *  @example
 *  import { fsl_error_kinds } from 'jssm';
 *  fsl_error_kinds.includes('div_by_zero');   // => true
 *
 */

const fsl_error_kinds = Object.freeze([
  'div_by_zero',
  'out_of_bounds',
  'overflow',
  'underflow',
  'type_error',
  'failed_narrow',
  'contract_violation',
  'unbound_value',
  'nan_compare',
  'microstep_overflow',
] as const);


/**
 *  A single member of the finite FSL error taxonomy.  The string-literal union
 *  derived from {@link fsl_error_kinds}; used as the `kind` discriminant on
 *  {@link FslError}.
 */
type FslErrorKind = (typeof fsl_error_kinds)[number];


/**
 *  The three Design-by-Contract obligations (megaspec §10).  Carried on a
 *  {@link FslError} of kind `contract_violation` so a recovery handler can tell
 *  a caller-obligation breach (`require`) from a machine-obligation breach
 *  (`ensure`) from an always-at-stable breach (`invariant`).
 */
type FslContractKind = 'require' | 'ensure' | 'invariant';





/*******
 *
 *  Structured, named fields attached to an {@link FslError} (megaspec §11 —
 *  "structured fields, messages that name the offending entities").  Every
 *  field is optional; which ones are populated depends on the error `kind`.
 *  The fields are *data*, not prose: a recovery transition reads them directly
 *  (`last_error.entity`, `last_error.index`) rather than re-parsing the message.
 *
 */

type FslErrorFields = {

  /** The named `val`/`prop`/`sensor`/operator/expression that failed. */
  entity?          : string;

  /** For `out_of_bounds`: the offending index. */
  index?           : number;

  /** For `out_of_bounds`: the valid length/size of the container. */
  length?          : number;

  /** For `overflow`/`underflow`: the computed value that left range. */
  value?           : number;

  /** For `overflow`/`underflow`: the inclusive lower bound of the type. */
  lower_bound?     : number;

  /** For `overflow`/`underflow`: the inclusive upper bound of the type. */
  upper_bound?     : number;

  /** For `failed_narrow`/`type_error`: the type/variant that was expected. */
  expected_type?   : string;

  /** For `failed_narrow`/`type_error`: the type/variant actually present. */
  actual_type?     : string;

  /** For `contract_violation`: which obligation (`require`/`ensure`/`invariant`). */
  contract?        : FslContractKind;

  /** For `microstep_overflow`: the configured microstep bound that was hit. */
  bound?           : number;

  /** Source span of the offending FSL expression, when available. */
  source_location? : FslSourceLocation;

};


/**
 *  Constructor input for {@link FslError}: a {@link FslErrorKind} discriminant
 *  plus the structured {@link FslErrorFields}.  Separated from the fields type
 *  so the kind is always required while every field stays optional.
 */
type FslErrorInfo = FslErrorFields & { kind: FslErrorKind };





/*******
 *
 *  Assembles the human-readable tail of an {@link FslError} message — the
 *  parenthetical that names the offending entities.  Pure: takes the structured
 *  fields, returns the joined "`(entity "x", index 5, length 3)`" string (or the
 *  empty string when nothing nameable is present).
 *
 *  Kept separate from the constructor so the entity-naming policy lives in one
 *  testable place rather than threaded through `super()`.
 *
 *  @param fields - The structured error fields to render.
 *  @returns The parenthetical detail string, or `''` when there is nothing to say.
 *
 *  @example
 *  describe_fields({ entity: 'count', index: 5, length: 3 });
 *  // => ' (entity "count", index 5, length 3)'
 *
 */

function describe_fields(fields: FslErrorFields): string {

  const parts: string[] = [];

  if (fields.entity        !== undefined) { parts.push(`entity "${fields.entity}"`);            }
  if (fields.index         !== undefined) { parts.push(`index ${fields.index}`);                }
  if (fields.length        !== undefined) { parts.push(`length ${fields.length}`);              }
  if (fields.value         !== undefined) { parts.push(`value ${fields.value}`);                }
  if (fields.lower_bound   !== undefined) { parts.push(`min ${fields.lower_bound}`);            }
  if (fields.upper_bound   !== undefined) { parts.push(`max ${fields.upper_bound}`);            }
  if (fields.expected_type !== undefined) { parts.push(`expected ${fields.expected_type}`);     }
  if (fields.actual_type   !== undefined) { parts.push(`actual ${fields.actual_type}`);         }
  if (fields.contract      !== undefined) { parts.push(`contract ${fields.contract}`);          }
  if (fields.bound         !== undefined) { parts.push(`bound ${fields.bound}`);                }

  return parts.length > 0 ? ` (${parts.join(', ')})` : '';

}





/*******
 *
 *  A typed FSL runtime error (megaspec §11).  Enriches the host `Error` with a
 *  finite {@link FslErrorKind} discriminant and the structured
 *  {@link FslErrorFields} that name the offending entity, so that:
 *
 *  - a recovery guard can branch on `last_error.kind` and read its fields, and
 *  - a human reading the message sees exactly what failed and where.
 *
 *  The constructed `message` is `"<base>: <prose><(named entities)>"`, e.g.
 *  `"div_by_zero: division by zero (entity "rate")"`.  The `base_message`
 *  (the prose, without the parenthetical) is retained separately, mirroring
 *  {@link JssmError}.
 *
 *  @param kind    - The finite taxonomy member this error belongs to.
 *  @param message - Human-readable prose describing what went wrong.
 *  @param fields  - Structured, named context; every member optional.
 *
 *  @example
 *  throw new FslError('div_by_zero', 'division by zero', { entity: 'rate' });
 *  // FslError: div_by_zero: division by zero (entity "rate")
 *
 */

class FslError extends Error {

  kind            : FslErrorKind;
  base_message    : string;
  message         : string;
  entity          : string | undefined;
  index           : number | undefined;
  length          : number | undefined;
  value           : number | undefined;
  lower_bound     : number | undefined;
  upper_bound     : number | undefined;
  expected_type   : string | undefined;
  actual_type     : string | undefined;
  contract        : FslContractKind | undefined;
  bound           : number | undefined;
  source_location : FslSourceLocation | undefined;

  constructor(kind: FslErrorKind, message: string, fields: FslErrorFields = {}) {

    const complex_msg = `${kind}: ${message}${describe_fields(fields)}`;

    super(complex_msg);

    this.name            = 'FslError';
    this.kind            = kind;
    this.base_message    = message;
    this.message         = complex_msg;
    this.entity          = fields.entity;
    this.index           = fields.index;
    this.length          = fields.length;
    this.value           = fields.value;
    this.lower_bound     = fields.lower_bound;
    this.upper_bound     = fields.upper_bound;
    this.expected_type   = fields.expected_type;
    this.actual_type     = fields.actual_type;
    this.contract        = fields.contract;
    this.bound           = fields.bound;
    this.source_location = fields.source_location;

  }

};





/*******
 *
 *  Convenience constructors for each {@link FslErrorKind}.  Each one fixes the
 *  `kind` and writes the canonical prose, so a runtime callsite supplies only
 *  the offending entities — keeping the taxonomy's messages uniform and the
 *  callsites terse.  Every constructor names its offending entity in the
 *  message (§11).
 *
 */


/**
 *  A `/`, `mod`, `rem`, or `div` was evaluated with a zero divisor.
 *  @param entity - The named operand/expression whose divisor was zero.
 *  @param source_location - Optional source span of the offending expression.
 *  @example
 *  throw div_by_zero_error('rate');
 *  // FslError: div_by_zero: division by zero (entity "rate")
 */
function div_by_zero_error(
  entity?          : string,
  source_location? : FslSourceLocation
): FslError {
  return new FslError('div_by_zero', 'division by zero', { entity, source_location });
}


/**
 *  An index or slice fell outside an indexed container (string, array,
 *  bytearray, …).
 *  @param entity - The named container that was indexed.
 *  @param index  - The offending index.
 *  @param length - The valid length/size of the container.
 *  @param source_location - Optional source span of the offending expression.
 *  @example
 *  throw out_of_bounds_error('items', 5, 3);
 *  // FslError: out_of_bounds: index out of bounds (entity "items", index 5, length 3)
 */
function out_of_bounds_error(
  entity           : string,
  index            : number,
  length           : number,
  source_location? : FslSourceLocation
): FslError {
  return new FslError('out_of_bounds', 'index out of bounds', { entity, index, length, source_location });
}


/**
 *  A fixed-width numeric result exceeded the declared upper bound (the default
 *  error-on-overflow behavior of §4.1 — no wrapping).
 *  @param entity      - The named value/expression that overflowed.
 *  @param value       - The computed value that left range.
 *  @param upper_bound - The inclusive maximum of the declared type.
 *  @param source_location - Optional source span of the offending expression.
 *  @example
 *  throw overflow_error('count', 256, 255);
 *  // FslError: overflow: numeric overflow (entity "count", value 256, max 255)
 */
function overflow_error(
  entity           : string,
  value            : number,
  upper_bound      : number,
  source_location? : FslSourceLocation
): FslError {
  return new FslError('overflow', 'numeric overflow', { entity, value, upper_bound, source_location });
}


/**
 *  A fixed-width numeric result fell below the declared lower bound (the
 *  negative-side partner of {@link overflow_error}).
 *  @param entity      - The named value/expression that underflowed.
 *  @param value       - The computed value that left range.
 *  @param lower_bound - The inclusive minimum of the declared type.
 *  @param source_location - Optional source span of the offending expression.
 *  @example
 *  throw underflow_error('balance', -1, 0);
 *  // FslError: underflow: numeric underflow (entity "balance", value -1, min 0)
 */
function underflow_error(
  entity           : string,
  value            : number,
  lower_bound      : number,
  source_location? : FslSourceLocation
): FslError {
  return new FslError('underflow', 'numeric underflow', { entity, value, lower_bound, source_location });
}


/**
 *  A statically-forbidden mixing was reached dynamically — a cross-type
 *  comparison or an incompatible dimensioned-unit operation (§6, §4.5).
 *  @param expected_type - The type the operation required.
 *  @param actual_type   - The type actually presented.
 *  @param entity        - Optional named operand/expression at fault.
 *  @param source_location - Optional source span of the offending expression.
 *  @example
 *  throw type_error('int', 'string', 'x');
 *  // FslError: type_error: type mismatch (entity "x", expected int, actual string)
 */
function type_error(
  expected_type    : string,
  actual_type      : string,
  entity?          : string,
  source_location? : FslSourceLocation
): FslError {
  return new FslError('type_error', 'type mismatch', { expected_type, actual_type, entity, source_location });
}


/**
 *  An `any`/`option`/variant narrowing (`case`) did not match the runtime tag
 *  (§4.4, §13).
 *  @param expected_type - The variant/type the narrow expected.
 *  @param actual_type   - The variant/type actually present.
 *  @param entity        - Optional named scrutinee.
 *  @param source_location - Optional source span of the offending expression.
 *  @example
 *  throw failed_narrow_error('some', 'none', 'lookup');
 *  // FslError: failed_narrow: narrowing failed (entity "lookup", expected some, actual none)
 */
function failed_narrow_error(
  expected_type    : string,
  actual_type      : string,
  entity?          : string,
  source_location? : FslSourceLocation
): FslError {
  return new FslError('failed_narrow', 'narrowing failed', { expected_type, actual_type, entity, source_location });
}


/**
 *  A Design-by-Contract obligation did not hold (§10).
 *  @param contract - Which obligation breached (`require`/`ensure`/`invariant`).
 *  @param entity   - The named contract/expression that failed.
 *  @param source_location - Optional source span of the offending expression.
 *  @example
 *  throw contract_violation_error('require', 'nonempty');
 *  // FslError: contract_violation: contract violated (entity "nonempty", contract require)
 */
function contract_violation_error(
  contract         : FslContractKind,
  entity           : string,
  source_location? : FslSourceLocation
): FslError {
  return new FslError('contract_violation', 'contract violated', { contract, entity, source_location });
}


/**
 *  A `val`/`prop`/`sensor` was read before it held a value — no `default`, none
 *  supplied at construction, and `required` unmet (§5).
 *  @param entity - The named slot that was read unbound.
 *  @param source_location - Optional source span of the offending expression.
 *  @example
 *  throw unbound_value_error('verified');
 *  // FslError: unbound_value: value is unbound (entity "verified")
 */
function unbound_value_error(
  entity           : string,
  source_location? : FslSourceLocation
): FslError {
  return new FslError('unbound_value', 'value is unbound', { entity, source_location });
}


/**
 *  An ordering comparison (`<`, `<=`, `>`, `>=`) was attempted against a `NaN`,
 *  where IEEE makes the result meaningless (§4.1 — use the total `compare`).
 *  @param entity - Optional named operand that was `NaN`.
 *  @param source_location - Optional source span of the offending expression.
 *  @example
 *  throw nan_compare_error('ratio');
 *  // FslError: nan_compare: ordering comparison against NaN (entity "ratio")
 */
function nan_compare_error(
  entity?          : string,
  source_location? : FslSourceLocation
): FslError {
  return new FslError('nan_compare', 'ordering comparison against NaN', { entity, source_location });
}


/**
 *  RTC settling exceeded the microstep bound (§12, §13) — a non-stabilizing
 *  eventless cycle that never reached a stable configuration.
 *  @param bound - The configured microstep bound that was hit.
 *  @param source_location - Optional source span of the offending expression.
 *  @example
 *  throw microstep_overflow_error(100000);
 *  // FslError: microstep_overflow: microstep bound exceeded (bound 100000)
 */
function microstep_overflow_error(
  bound            : number,
  source_location? : FslSourceLocation
): FslError {
  return new FslError('microstep_overflow', 'microstep bound exceeded', { bound, source_location });
}





export {

  fsl_error_kinds,
    FslErrorKind,

  FslContractKind,

  FslErrorFields,
  FslErrorInfo,

  describe_fields,

  FslError,

  div_by_zero_error,
  out_of_bounds_error,
  overflow_error,
  underflow_error,
  type_error,
  failed_narrow_error,
  contract_violation_error,
  unbound_value_error,
  nan_compare_error,
  microstep_overflow_error,

};
