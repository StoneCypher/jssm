
class JssmError extends Error {

  constructor(machine: any, message: string) {

    super(message);
    this.name = 'JssmError';

  }

};





export { JssmError };
