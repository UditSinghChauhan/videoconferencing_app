import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

const withAuth = (WrappedComponent) => {
    const AuthComponent = (props) => {
        const navigate = useNavigate();
        const { isAuthenticated, isCheckingAuth } = useContext(AuthContext);

        useEffect(() => {
            if (!isCheckingAuth && !isAuthenticated) {
                navigate("/auth");
            }
        }, [isAuthenticated, isCheckingAuth, navigate]);

        if (isCheckingAuth) {
            return (
                <div className="sessionLoading">
                    <div className="sessionLoadingCard">
                        <div className="loadingSpinner" />
                        <h2>Checking your session</h2>
                        <p>We are securely restoring your workspace and verifying your access.</p>
                    </div>
                </div>
            );
        }

        if (!isAuthenticated) {
            return null;
        }

        return <WrappedComponent {...props} />;
    };

    return AuthComponent;
};

export default withAuth;
