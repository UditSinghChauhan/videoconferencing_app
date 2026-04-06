import httpStatus from "http-status";
import { ZodError } from "zod";
import { logger } from "../utils/logger.js";
import { buildErrorResponse } from "../utils/apiResponse.js";
import { AppError } from "../utils/appError.js";

const notFoundHandler = (req, res, next) => {
    next(new AppError("Route not found", {
        statusCode: httpStatus.NOT_FOUND,
        code: "ROUTE_NOT_FOUND"
    }));
};

const errorHandler = (error, req, res, next) => {
    let normalizedError = error;

    if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
        }));

        normalizedError = new AppError("Validation failed", {
            statusCode: httpStatus.BAD_REQUEST,
            code: "VALIDATION_ERROR",
            details
        });
        normalizedError.message = details[0]?.message || "Validation failed";
    }

    if (!(normalizedError instanceof AppError)) {
        normalizedError = new AppError(normalizedError.message || "Internal server error", {
            statusCode: normalizedError.statusCode || httpStatus.INTERNAL_SERVER_ERROR,
            code: normalizedError.code || "INTERNAL_SERVER_ERROR",
            details: normalizedError.details || null,
            isOperational: false
        });
    }

    const isServerError = normalizedError.statusCode >= 500;

    logger[isServerError ? "error" : "warn"]("Request failed", {
        path: req.originalUrl,
        method: req.method,
        statusCode: normalizedError.statusCode,
        code: normalizedError.code,
        message: normalizedError.message,
        details: normalizedError.details
    });

    return res
        .status(normalizedError.statusCode)
        .json(buildErrorResponse({
            message: normalizedError.message,
            code: normalizedError.code,
            details: normalizedError.details
        }));
};

export { errorHandler, notFoundHandler };
