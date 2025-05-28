// 경로: /backend/app.js

require("dotenv").config(); // ✅ 가장 먼저 환경 변수 로드

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const csrf = require("csurf");
const session = require("express-session");

const logger = require("./config/logger");
const httpLogger = require("./middleware/httpLogger");

const {
  helmetConfig,
  xssClean,
  sanitizeBody,
  xssDetection,
  mongoSanitizeConfig,
  validateQuery,
} = require("./middleware/security");

const {
  sessionConfig,
  sessionSecurity,
  initSession,
} = require("./config/session");

const {
  monitorLogin,
  monitorAccountLock,
  monitorPasswordChange,
  monitorRateLimit,
  monitorTokenValidation,
  monitorXSS,
  monitorInjection,
} = require("./middleware/security-monitor");

const {
  defaultLimit,
  authLimit,
  mailSendLimit,
} = require("./middleware/rateLimit");

const authRoutes = require("./routes/auth.routes");
const mailRoutes = require("./routes/mail.routes");
const auditRoutes = require("./routes/audit.routes");

const app = express();

// HTTP 요청 로깅
app.use(httpLogger);

// 보안 미들웨어
app.use(helmetConfig);
app.use(xssClean());

// CORS 설정
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// 기본 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 세션 미들웨어
app.use(session(sessionConfig));
app.use(initSession);
app.use(sessionSecurity);

// 보안 모니터링 미들웨어
app.use(monitorRateLimit);
app.use(monitorTokenValidation);
app.use(monitorXSS);
app.use(monitorInjection);

// XSS 방어 미들웨어
app.use(sanitizeBody);
app.use(xssDetection);

// NoSQL Injection 방어 미들웨어
app.use(mongoSanitizeConfig);
app.use(validateQuery);

// 기본 Rate Limiting 적용
app.use(defaultLimit);

// CSRF 보호 설정
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  },
});

// CSRF 토큰 발급 라우트
app.get("/api/csrf-token", csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// API 라우트에 CSRF 보호 및 Rate Limiting 적용
app.use(
  "/api/auth",
  [
    authLimit,
    csrfProtection,
    monitorLogin,
    monitorAccountLock,
    monitorPasswordChange,
  ],
  authRoutes
);

app.use("/api/mail", csrfProtection, mailRoutes);

// 감사 로그 라우트 추가
app.use("/api/audit", csrfProtection, auditRoutes);

// 데이터베이스 연결
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    logger.info("MongoDB 연결 성공");
  })
  .catch((err) => {
    logger.error("MongoDB 연결 실패:", err);
  });

// 에러 핸들링
app.use((err, req, res, next) => {
  logger.error("서버 에러:", err);

  if (err.code === "EBADCSRFTOKEN") {
    res.status(403).json({
      message:
        "CSRF 토큰이 유효하지 않습니다. 페이지를 새로고침하고 다시 시도해주세요.",
    });
  } else {
    console.error(err.stack);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

module.exports = app;