
import { JssmErrorExtendedInfo } from './jssm_types.js';





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
