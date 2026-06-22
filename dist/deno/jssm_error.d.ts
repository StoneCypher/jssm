import { JssmErrorExtendedInfo, FslSourceLocation } from './jssm_types.js';
/*******
 *
 *  Custom error class for jssm.  Enriches the standard `Error` with
 *  machine context (current state, instance name) and an optional
 *  `requested_state` so that error messages are self-describing.
 *
 *  When a semantic error is detected during `compile()` and the parse tree
 *  was produced with `parse(input, { locations: true })`, the thrown error
 *  also carries a `source_location` field — the FSL source span of the
 *  offending statement — so downstream tooling can map the error to a precise
 *  position in the original source text without additional scanning.
 *
 *  ```typescript
 *  throw new JssmError(machine, 'no such state', { requested_state: 'Blue' });
 *  // JssmError: [[my-light]]: no such state (at "Red", requested "Blue")
 *  ```
 *
 *  @param machine         - The `Machine` instance that raised the error, or
 *                           `undefined` if no machine is available.  Used to
 *                           read `state()` and `instance_name()` for context.
 *  @param message         - A human-readable description of the error.
 *  @param JEEI            - Optional {@link JssmErrorExtendedInfo} with extra
 *                           context such as `requested_state` and/or
 *                           `source_location` (the FSL source span of the
 *                           offending statement, present when the error
 *                           originated from a located parse tree).
 *
 */
declare class JssmError extends Error {
    message: string;
    base_message: string;
    requested_state: string | undefined;
    source_location: FslSourceLocation | undefined;
    constructor(machine: any, message: string, JEEI?: JssmErrorExtendedInfo);
}
export { JssmError };
