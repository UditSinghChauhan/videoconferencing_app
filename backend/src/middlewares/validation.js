import httpStatus from 'http-status';

// Validation middleware
export const validateRegisterInput = (req, res, next) => {
    const { name, username, password } = req.body;

    if (!name || !username || !password) {
        return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: "Name, username, and password are required"
        });
    }

    if (username.length < 3) {
        return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: "Username must be at least 3 characters long"
        });
    }

    if (password.length < 6) {
        return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: "Password must be at least 6 characters long"
        });
    }

    // Basic password strength check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(password)) {
        return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: "Password must contain at least one uppercase letter, one lowercase letter, and one number"
        });
    }

    next();
};

export const validateLoginInput = (req, res, next) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: "Username and password are required"
        });
    }

    next();
};

export const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
};
