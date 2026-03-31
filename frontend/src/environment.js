const isProduction = process.env.REACT_APP_ENV === "production";

const server = process.env.REACT_APP_BACKEND_URL || (isProduction ? window.location.origin : "http://localhost:8000");

export default server;
