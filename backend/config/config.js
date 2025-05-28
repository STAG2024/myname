require("dotenv").config();

module.exports = {
  app: {
    name: process.env.APP_NAME || "내 앱",
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || "development",
  },
  db: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/myapp",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "your-secret-key",
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  },
  email: {
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === "true",
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
  },
};
