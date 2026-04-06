import { z } from "zod";

const registerSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
    username: z.string().trim().min(3, "Username must be at least 3 characters long").max(50, "Username is too long"),
    password: z
        .string()
        .min(6, "Password must be at least 6 characters long")
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
