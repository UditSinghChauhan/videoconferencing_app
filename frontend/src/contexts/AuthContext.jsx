import axios from "axios";
import httpStatus from "http-status";
import { createContext } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";

export const AuthContext = createContext({});

const client = axios.create({
    baseURL: `${server}/api/v1/users`
});

export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();

    const handleRegister = async (name, username, password) => {
        const request = await client.post("/register", {
            name,
            username,
            password
        });

        if (request.status === httpStatus.CREATED) {
            return request.data.message;
        }

        return "Account created successfully.";
    };

    const handleLogin = async (username, password) => {
        const request = await client.post("/login", {
            username,
            password
        });

        if (request.status === httpStatus.OK) {
            localStorage.setItem("token", request.data.token);
            navigate("/home");
        }
    };

    const getHistoryOfUser = async () => {
        const request = await client.get("/get_all_activity", {
            params: {
                token: localStorage.getItem("token")
            }
        });

        return request.data.data || [];
    };

    const addToUserHistory = async (meetingCode) => {
        return client.post("/add_to_activity", {
            token: localStorage.getItem("token"),
            meeting_code: meetingCode
        });
    };

    const logout = () => {
        localStorage.removeItem("token");
        navigate("/auth");
    };

    const value = {
        addToUserHistory,
        getHistoryOfUser,
        handleRegister,
        handleLogin,
        logout
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
