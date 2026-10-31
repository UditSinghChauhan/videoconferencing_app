import { z } from "zod";

const registerSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
    username: z.string().trim().min(3, "Username must be at least 3 characters long").max(50, "Username is too long")
        .regex(/^[A-Za-z0-9_]+$/, "Username can only contain letters, numbers and underscores"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .max(128, "Password is too long")
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number")
});

const loginSchema = z.object({
    username: z.string().trim().min(1, "Username is required"),
    password: z.string().min(1, "Password is required")
});

const csrfHeaderSchema = z.object({
    "x-csrf-token": z.string().trim().min(1, "CSRF token is required")
});

export {
    csrfHeaderSchema,
    loginSchema,
    registerSchema
};
