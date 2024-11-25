export class ImplementationError extends Error {
    constructor(functionName) {
        super("ImplementationError : function "+functionName+" must be implemented.");
    }
}
