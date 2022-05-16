class JssmError extends Error {
    constructor(machine, message, JEEI) {
        const { requested_state } = (JEEI === undefined)
            ? { requested_state: undefined }
            : JEEI;
        const follow_ups = [];
        if (machine) {
            if (machine.state() !== undefined) {
                follow_ups.push(`at "${machine.state()}"`);
            }
        }
        if (requested_state !== undefined) {
            follow_ups.push(`requested "${requested_state}"`);
        }
        const complex_msg = `${((machine === null || machine === void 0 ? void 0 : machine.instance_name()) !== undefined)
            ? `[[${machine.instance_name()}]]: `
            : ''}${message}${follow_ups.length
            ? ` (${follow_ups.join(', ')})`
            : ''}`;
        super(complex_msg);
        this.name = 'JssmError';
        this.message = complex_msg;
        this.base_message = message;
        this.requested_state = requested_state;
    }
}
;
export { JssmError };
