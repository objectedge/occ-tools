/**
 * Default error class for errors thrown by the OCC Client. This error type should be thrown only when error comes from
 * the OCC endpoint. For any other error types just use the normal Error class.
 */
class OccEndpointError extends Error {
  /**
   * Create a new instance for this error type.
   *
   * @param {String} message The message related with the error caught.
   * @param {Object} httpResponse The HTTP response object from the OCC endpoint call.
   */
  constructor(message, httpResponse) {
    super(message);

    // Saving class name in the property of our custom error as a shortcut.
    this.name = this.constructor.name;

    // This will exclude this constructor from the stack trace
    Error.captureStackTrace(this, this.constructor);

    if (httpResponse) {
      this.status = httpResponse.status || 500;
      this.data = httpResponse.data || null;
      this.httpResponse = httpResponse;
    }
  }
}

class OccClientError extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;

    // Saving class name in the property of our custom error as a shortcut.
    this.name = this.constructor.name;

    const stackDescriptor = Object.getOwnPropertyDescriptor(this, "stack");
    const getStack = stackDescriptor.get || (() => stackDescriptor.value);

    Object.defineProperty(this, "stack", {
      get() {
        let stackTrace = getStack.call(this);

        if (this.cause) {
          stackTrace += `\nCaused by: ${this.cause.stack}`;
        }

        return stackTrace;
      },
    });
  }
}

module.exports = {
  OccClientError,
  OccEndpointError,
};
