const IS_PROD = process.env.REACT_APP_ENV === 'production';

const server = IS_PROD
    ? process.env.REACT_APP_BACKEND_URL || "https://apnacollegebackend.onrender.com" // production
    : process.env.REACT_APP_BACKEND_URL || "http://localhost:8000" // development

export default server;