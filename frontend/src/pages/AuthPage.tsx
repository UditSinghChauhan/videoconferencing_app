import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { FullPageSpinner } from "../components/FullPageSpinner";
import { Logo } from "../components/Logo";
import { getErrorMessage } from "../lib/api";
import styles from "./AuthPage.module.css";

type Mode = "signin" | "signup";

interface FieldErrors {
    name?: string;
    username?: string;
    password?: string;
}

const validate = (mode: Mode, values: { name: string; username: string; password: string }): FieldErrors => {
    const errors: FieldErrors = {};

    if (mode === "signup") {
        if (!values.name.trim()) errors.name = "Enter the name people will see in meetings.";
        if (values.username.trim().length < 3) errors.username = "Use at least 3 characters.";
        else if (!/^[A-Za-z0-9_]+$/.test(values.username.trim())) errors.username = "Use letters, numbers and underscores only.";
        if (values.password.length < 8) errors.password = "Use at least 8 characters.";
        else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(values.password)) errors.password = "Include an uppercase letter, a lowercase letter and a number.";
    } else {
        if (!values.username.trim()) errors.username = "Enter your username.";
        if (!values.password) errors.password = "Enter your password.";
    }

    return errors;
};

/** Only same-origin paths are accepted as a post-login destination. */
const safeNext = (value: string | null) => (value && value.startsWith("/") && !value.startsWith("//") ? value : "/home");

export default function AuthPage() {
    const { status, signIn, signUp } = useAuth();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const mode: Mode = params.get("mode") === "signup" ? "signup" : "signin";
    const next = safeNext(params.get("next"));
    const [values, setValues] = useState({ name: "", username: "", password: "" });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const firstFieldRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (status === "authenticated") {
            navigate(next, { replace: true });
        }
    }, [navigate, next, status]);

    useEffect(() => {
        setErrors({});
        setFormError(null);
        firstFieldRef.current?.focus();
    }, [mode]);

    if (status === "checking") {
        return <FullPageSpinner label="Restoring your session" />;
    }

    const switchMode = (nextMode: Mode) => {
        const nextParams = new URLSearchParams(params);
        if (nextMode === "signup") nextParams.set("mode", "signup");
        else nextParams.delete("mode");
        setParams(nextParams, { replace: true });
    };

    const update = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setValues((current) => ({ ...current, [key]: event.target.value }));
        setErrors((current) => ({ ...current, [key]: undefined }));
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const nextErrors = validate(mode, values);
        setErrors(nextErrors);
        setFormError(null);

        if (Object.keys(nextErrors).length > 0) {
            return;
        }

        setSubmitting(true);
        try {
            if (mode === "signup") {
                await signUp(values.name.trim(), values.username.trim(), values.password);
            } else {
                await signIn(values.username.trim(), values.password);
            }
        } catch (error) {
            setFormError(getErrorMessage(
                error,
                mode === "signup" ? "Couldn't create your account. Try a different username." : "Couldn't sign you in. Check your username and password."
            ));
        } finally {
            setSubmitting(false);
        }
    };

    const isSignUp = mode === "signup";

    return (
        <div className={styles.page}>
            <header className={styles.top}>
                <Logo />
                <Link to="/demo" className={styles.demoLink}>Try the demo without an account</Link>
            </header>

            <main id="main" className={styles.main}>
                <div className={styles.card}>
                    <h1 className={styles.title}>{isSignUp ? "Create your account" : "Welcome back"}</h1>
                    <p className={styles.subtitle}>
                        {isSignUp
                            ? "Host meetings, invite anyone with a link, and keep a recap of every call."
                            : "Sign in to start or join a meeting."}
                    </p>

                    <form className={styles.form} onSubmit={submit} noValidate>
                        {isSignUp ? (
                            <Field
                                ref={firstFieldRef}
                                label="Your name"
                                name="name"
                                autoComplete="name"
                                value={values.name}
                                onChange={update("name")}
                                error={errors.name}
                                hint="Shown to others in meetings"
                            />
                        ) : null}
                        <Field
                            ref={isSignUp ? undefined : firstFieldRef}
                            label="Username"
                            name="username"
                            autoComplete="username"
                            autoCapitalize="none"
                            spellCheck={false}
                            value={values.username}
                            onChange={update("username")}
                            error={errors.username}
                            hint={isSignUp ? "Letters, numbers and underscores" : undefined}
                        />
                        <Field
                            label="Password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete={isSignUp ? "new-password" : "current-password"}
                            value={values.password}
                            onChange={update("password")}
                            error={errors.password}
                            hint={isSignUp ? "8+ characters with upper and lower case letters and a number" : undefined}
                            trailingLabel={
                                <button type="button" className={styles.reveal} onClick={() => setShowPassword((v) => !v)} aria-pressed={showPassword}>
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            }
                        />

                        {formError ? (
                            <p className={styles.formError} role="alert">
                                {formError}
                            </p>
                        ) : null}

                        <Button type="submit" size="lg" block loading={submitting}>
                            {isSignUp ? "Create account" : "Sign in"}
                        </Button>
                    </form>

                    <p className={styles.switch}>
                        {isSignUp ? "Already have an account?" : "New to Bridge?"}{" "}
                        <button type="button" onClick={() => switchMode(isSignUp ? "signin" : "signup")}>
                            {isSignUp ? "Sign in" : "Create an account"}
                        </button>
                    </p>
                </div>
            </main>
        </div>
    );
}
