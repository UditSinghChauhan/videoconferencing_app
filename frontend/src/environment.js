const isProduction = process.env.REACT_APP_ENV === "production";

const rawServer = process.env.REACT_APP_BACKEND_URL || (isProduction ? window.location.origin : "http://localhost:8000");
const server = rawServer.replace(/\/+$/, "");

export default server;
