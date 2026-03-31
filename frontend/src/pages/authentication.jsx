import * as React from "react";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import Snackbar from "@mui/material/Snackbar";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { AuthContext } from "../contexts/AuthContext";
import "../App.css";

const defaultTheme = createTheme({
    palette: {
        primary: {
            main: "#ea580c"
        },
        secondary: {
            main: "#1d4ed8"
        }
    },
    shape: {
        borderRadius: 16
    }
});

export default function Authentication() {
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [name, setName] = React.useState("");
    const [error, setError] = React.useState("");
    const [message, setMessage] = React.useState("");
    const [formState, setFormState] = React.useState(0);
    const [open, setOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const { handleRegister, handleLogin } = React.useContext(AuthContext);

    const isSignUp = formState === 1;

    const resetForm = () => {
        setUsername("");
        setPassword("");
        setName("");
    };

    const handleAuth = async (event) => {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            if (isSignUp) {
                const result = await handleRegister(name, username, password);
                setMessage(result);
                setOpen(true);
                setFormState(0);
                resetForm();
            } else {
                await handleLogin(username, password);
            }
        } catch (err) {
            setError(err?.response?.data?.message || "Unable to complete authentication. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ThemeProvider theme={defaultTheme}>
            <CssBaseline />
            <div className="authPanel">
                <section className="authIntro">
                    <div>
                        <span className="heroBadge">Authentication and access control</span>
                        <h1>Sign in to launch meetings with a cleaner, recruiter-ready workflow.</h1>
                        <p>
                            Bridge demonstrates a complete authentication flow for a real-time collaboration product,
                            including registration, protected routes, persistent meeting history, and production-aware
                            environment configuration.
                        </p>
                    </div>

                    <div className="authStats">
                        <div className="authStat">
                            <strong>Protected routes</strong>
                            <span>Authenticated access to dashboard and history views.</span>
                        </div>
                        <div className="authStat">
                            <strong>Reusable room codes</strong>
                            <span>Rejoin previous rooms from saved activity.</span>
                        </div>
                        <div className="authStat">
                            <strong>Production deployment</strong>
                            <span>Configurable backend URL and live environment support.</span>
                        </div>
                    </div>
                </section>

                <section className="authCardWrap">
                    <Paper elevation={8} sx={{ width: "100%", maxWidth: 460, p: 4, borderRadius: 6 }}>
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
                                <LockOutlinedIcon />
                            </Avatar>
                            <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
                                {isSignUp ? "Create your Bridge account" : "Welcome back to Bridge"}
                            </Typography>

                            <div className="authToggle">
                                <Button variant={!isSignUp ? "contained" : "outlined"} onClick={() => setFormState(0)}>
                                    Sign In
                                </Button>
                                <Button variant={isSignUp ? "contained" : "outlined"} onClick={() => setFormState(1)}>
                                    Sign Up
                                </Button>
                            </div>

                            <Box component="form" noValidate sx={{ mt: 1, width: "100%" }} onSubmit={handleAuth}>
                                {isSignUp ? (
                                    <TextField
                                        margin="normal"
                                        required
                                        fullWidth
                                        id="name"
                                        label="Full Name"
                                        name="name"
                                        value={name}
                                        autoFocus
                                        onChange={(event) => setName(event.target.value)}
                                    />
                                ) : null}

                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    id="username"
                                    label="Username"
                                    name="username"
                                    value={username}
                                    autoFocus={!isSignUp}
                                    onChange={(event) => setUsername(event.target.value)}
                                />

                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="password"
                                    label="Password"
                                    value={password}
                                    type="password"
                                    onChange={(event) => setPassword(event.target.value)}
                                    id="password"
                                />

                                {error ? <p className="errorText">{error}</p> : <p className="helperText">Use a strong password with uppercase, lowercase, and a number.</p>}

                                <Button type="submit" fullWidth variant="contained" sx={{ mt: 2, mb: 1.5, py: 1.4 }} disabled={isSubmitting}>
                                    {isSubmitting ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
                                </Button>
                            </Box>
                        </Box>
                    </Paper>
                </section>
            </div>

            <Snackbar open={open} autoHideDuration={4000} onClose={() => setOpen(false)} message={message} />
        </ThemeProvider>
    );
}
