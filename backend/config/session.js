// ✅ 반드시 가장 위에서 환경 변수 로딩
require("dotenv").config();

console.log("✅ MONGODB_URI in session.js:", process.env.MONGODB_URI); // 디버깅 로그

const session = require("express-session");
const MongoStore = require("connect-mongo");
const crypto = require("crypto");

// 세션 설정
const sessionConfig = {
  // 세션 쿠키 설정
  cookie: {
    httpOnly: true, // JavaScript에서 쿠키 접근 방지
    secure: process.env.NODE_ENV === "production", // HTTPS에서만 쿠키 전송
    sameSite: "strict", // CSRF 방지
    maxAge: 24 * 60 * 60 * 1000, // 24시간
  },

  // 세션 저장소 설정 (MongoDB)
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: "sessions",
    ttl: 24 * 60 * 60, // 24시간
    autoRemove: "native", // 만료된 세션 자동 삭제
    crypto: {
      secret:
        process.env.SESSION_ENCRYPT_SECRET ||
        crypto.randomBytes(32).toString("hex"),
    },
    touchAfter: 24 * 3600, // 24시간마다 세션 갱신
  }),

  // 세션 기본 설정
  name: "sessionId", // 쿠키 이름 변경
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
  resave: false, // 세션 변경사항 없어도 다시 저장하지 않음
  saveUninitialized: false, // 초기화되지 않은 세션 저장하지 않음
  rolling: true, // 요청마다 쿠키 만료 시간 갱신
};

// 세션 보안 미들웨어
const sessionSecurity = (req, res, next) => {
  // 세션 하이재킹 방지
  if (req.session && req.session.user) {
    // IP 주소나 User-Agent가 변경된 경우
    if (
      req.session.userAgent !== req.headers["user-agent"] ||
      req.session.userIp !== req.ip
    ) {
      req.session.destroy((err) => {
        if (err) {
          console.error("세션 삭제 중 오류:", err);
        }
      });
      return res
        .status(401)
        .json({ message: "세션이 만료되었습니다. 다시 로그인해주세요." });
    }
  }
  next();
};

// 세션 초기화 미들웨어
const initSession = (req, res, next) => {
  if (req.session && req.session.user && !req.session.initialized) {
    req.session.userAgent = req.headers["user-agent"];
    req.session.userIp = req.ip;
    req.session.initialized = true;
  }
  next();
};

// 세션 정리 스케줄러
const cleanupSessions = async () => {
  try {
    await sessionConfig.store.all((error, sessions) => {
      if (error) {
        console.error("세션 조회 중 오류:", error);
        return;
      }

      sessions.forEach((session) => {
        // 만료된 세션 삭제
        if (session.cookie && new Date(session.cookie.expires) < new Date()) {
          sessionConfig.store.destroy(session.id, (err) => {
            if (err) {
              console.error("세션 삭제 중 오류:", err);
            }
          });
        }
      });
    });
  } catch (error) {
    console.error("세션 정리 중 오류:", error);
  }
};

// 매일 자정에 세션 정리 실행
setInterval(cleanupSessions, 24 * 60 * 60 * 1000);

module.exports = {
  sessionConfig,
  sessionSecurity,
  initSession,
};
