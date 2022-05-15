class JssmError extends Error {
    constructor(machine, message) {
        super(message);
        this.name = 'JssmError';
    }
}
;
export { JssmError };
