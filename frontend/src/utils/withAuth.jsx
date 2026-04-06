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
            return <p className="historyStatus">Checking your session...</p>;
        }

        if (!isAuthenticated) {
            return null;
        }

        return <WrappedComponent {...props} />;
    };

    return AuthComponent;
};

export default withAuth;
