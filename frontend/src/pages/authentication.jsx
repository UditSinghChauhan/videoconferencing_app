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
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import "../App.css";

const defaultTheme = createTheme({
    palette: {
        mode: "dark",
        primary: {
            main: "#ea580c"
        },
        secondary: {
            main: "#38bdf8"
        },
        background: {
            default: "#020617",
            paper: "transparent"
        },
        text: {
            primary: "#f8fafc",
            secondary: "#94a3b8"
        }
    },
    shape: {
        borderRadius: 16
    },
    typography: {
        fontFamily: '"Plus Jakarta Sans", "Manrope", "Segoe UI", sans-serif',
        h5: {
            fontWeight: 800,
            letterSpacing: "-0.04em"
        },
        button: {
            textTransform: "none",
            fontWeight: 700
        }
    }
});

export default function Authentication() {
    const navigate = useNavigate();
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [name, setName] = React.useState("");
    const [error, setError] = React.useState("");
    const [message, setMessage] = React.useState("");
    const [formState, setFormState] = React.useState(0);
    const [open, setOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const { handleRegister, handleLogin, isAuthenticated, isCheckingAuth } = React.useContext(AuthContext);

    React.useEffect(() => {
        if (!isCheckingAuth && isAuthenticated) {
            navigate("/home");
        }
    }, [isAuthenticated, isCheckingAuth, navigate]);

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
            const errorMessage = !err?.response
                ? "Bridge is unable to reach the backend right now. Please try again in a moment."
                : err?.response?.data?.message || 
                (isSignUp 
                    ? "Couldn't create account. Try a different username."
                    : "Login failed. Check your username and password.");
            setError(errorMessage);
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
                        <span className="heroBadge">Sign in to your account</span>
                        <h1>Sign in to start hosting meetings.</h1>
                        <p>
                            Your meetings are automatically saved. Sign up in 30 seconds, and start your first meeting right away.
                            You can jump back into past meetings anytime.
                        </p>
                    </div>

                    <div className="authStats">
                        <div className="authStat">
                            <strong>Secure account</strong>
                            <span>Your login is safe. Your meetings are private.</span>
                        </div>
                        <div className="authStat">
                            <strong>Your meeting history</strong>
                            <span>All your past meetings are saved. Jump back in anytime.</span>
                        </div>
                        <div className="authStat">
                            <strong>Works everywhere</strong>
                            <span>Use it on any device. Your data stays secure.</span>
                        </div>
                    </div>
                </section>

                <section className="authCardWrap">
                    <Paper elevation={0} className="authGlassCard">
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <Avatar sx={{ m: 1, bgcolor: "secondary.main", boxShadow: "0 10px 24px rgba(56, 189, 248, 0.28)" }}>
                                <LockOutlinedIcon />
                            </Avatar>
                            <Typography component="h1" variant="h5" className="authCardTitle">
                                {isSignUp ? "Create your Bridge account" : "Welcome back to Bridge"}
                            </Typography>
                            <p className="authCardSubtitle">
                                {isSignUp ? "Create your account. Start hosting meetings instantly." : "Welcome back. Your recent meetings are right here."}
                            </p>

                            <div className="authToggle">
                                <Button className={!isSignUp ? "buttonGlow" : ""} variant={!isSignUp ? "contained" : "text"} onClick={() => setFormState(0)}>
                                    Sign In
                                </Button>
                                <Button className={isSignUp ? "buttonGlow" : ""} variant={isSignUp ? "contained" : "text"} onClick={() => setFormState(1)}>
                                    Create Account
                                </Button>
                            </div>

                            <Box component="form" noValidate sx={{ mt: 1, width: "100%" }} onSubmit={handleAuth}>
                                {isSignUp ? (
                                    <TextField
                                        className="authField"
                                        margin="normal"
                                        required
                                        fullWidth
                                        id="name"
                                        label="Your name"
                                        placeholder="John Smith"
                                        name="name"
                                        value={name}
                                        autoFocus
                                        onChange={(event) => setName(event.target.value)}
                                        helperText="This is how others will see you in meetings"
                                    />
                                ) : null}

                                <TextField
                                    className="authField"
                                    margin="normal"
                                    required
                                    fullWidth
                                    id="username"
                                    label="Username"
                                    placeholder={isSignUp ? "john_smith" : "Your username"}
                                    name="username"
                                    value={username}
                                    autoFocus={!isSignUp}
                                    onChange={(event) => setUsername(event.target.value)}
                                    helperText={isSignUp ? "Letters, numbers, underscores only" : ""}
                                />

                                <TextField
                                    className="authField"
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="password"
                                    label="Password"
                                    value={password}
                                    type="password"
                                    onChange={(event) => setPassword(event.target.value)}
                                    id="password"
                                    helperText={isSignUp ? "At least 8 characters" : ""}
                                />

                                {error ? <p className="errorText">{error}</p> : isSignUp ? <p className="helperText">Use a strong password with uppercase, lowercase, and a number.</p> : null}

                                <Button className="buttonGlow" type="submit" fullWidth variant="contained" sx={{ mt: 2, mb: 1.5, py: 1.4 }} disabled={isSubmitting}>
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
