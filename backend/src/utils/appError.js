import httpStatus from "http-status";

class AppError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = "AppError";
        this.statusCode = options.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        this.code = options.code || "INTERNAL_SERVER_ERROR";
        this.details = options.details || null;
        this.isOperational = options.isOperational ?? true;
    }
}

export { AppError };
