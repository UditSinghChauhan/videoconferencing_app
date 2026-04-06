const sendSuccess = (res, { statusCode = 200, message, data = null } = {}) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
};

const buildErrorResponse = ({ message, code, details = null }) => ({
    success: false,
    message,
    error: {
        code,
        details
    }
});

export { buildErrorResponse, sendSuccess };
