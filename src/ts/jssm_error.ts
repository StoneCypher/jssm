
import { JssmErrorExtendedInfo } from './jssm_types';





/*******
 *
 *  Custom error class for jssm.  Enriches the standard `Error` with
 *  machine context (current state, instance name) and an optional
 *  `requested_state` so that error messages are self-describing.
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
 *                           context such as `requested_state`.
 *
 */

class JssmError extends Error {

  message         : string;
  base_message    : string;
  requested_state : string | undefined;

  constructor(machine: any, message: string, JEEI?: JssmErrorExtendedInfo) {

    const { requested_state } = (JEEI === undefined)
      ? { requested_state: undefined }
      : JEEI;

    const follow_ups = [];

    if (machine) {
      if (machine.state() !== undefined) { follow_ups.push(`at "${machine.state()}"`); }
    }

    if (requested_state !== undefined) { follow_ups.push(`requested "${requested_state}"`); }

    const complex_msg = `${
      (machine?.instance_name() !== undefined)
        ? `[[${machine.instance_name()}]]: `
        : ''
    }${
      message
    }${
      follow_ups.length
        ? ` (${follow_ups.join(', ')})`
        : ''
    }`;

    super(complex_msg);

    this.name            = 'JssmError';
    this.message         = complex_msg;
    this.base_message    = message;
    this.requested_state = requested_state;

  }

};





export { JssmError };
