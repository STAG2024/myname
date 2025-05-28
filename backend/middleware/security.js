const helmet = require("helmet");
const xssClean = require("xss-clean");
const sanitizeHtml = require("sanitize-html");
const mongoSanitize = require("express-mongo-sanitize");
const logger = require("../config/logger");

// Helmet 기본 설정
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// MongoDB 쿼리 주입 방지 설정
const mongoSanitizeConfig = mongoSanitize({
  allowDots: true,
  replaceWith: "_",
  onSanitize: ({ req, key }) => {
    logger.warn(
      `잠재적인 NoSQL Injection 시도 감지: ${req.method} ${req.path}`
    );
    logger.debug(`삭제된 필드: ${key}`);
  },
});

// 쿼리 파라미터 검증
const validateQuery = (req, res, next) => {
  const suspiciousPatterns = [
    /\$/, // MongoDB 연산자
    /\.\./, // 경로 순회
    /;/, // 명령어 체이닝
    /\{\s*\$/, // MongoDB 연산자 객체
    /\$\s*\{/, // 템플릿 주입
  ];

  const checkValue = (value) => {
    if (typeof value === "string") {
      return suspiciousPatterns.some((pattern) => pattern.test(value));
    }
    return false;
  };

  const params = { ...req.query, ...req.params };
  for (let key in params) {
    if (checkValue(params[key])) {
      logger.warn(`의심스러운 쿼리 파라미터 감지: ${req.method} ${req.path}`);
      logger.debug(`의심스러운 파라미터: ${key}=${params[key]}`);
      return res.status(400).json({
        message: "유효하지 않은 요청입니다.",
        error: "의심스러운 쿼리 파라미터가 감지되었습니다.",
      });
    }
  }

  next();
};

// HTML 새니타이징 설정
const sanitizeOptions = {
  allowedTags: [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote",
    "p",
    "ul",
    "ol",
    "li",
    "b",
    "i",
    "strong",
    "em",
    "strike",
    "code",
    "hr",
    "br",
    "div",
    "table",
    "thead",
    "caption",
    "tbody",
    "tr",
    "th",
    "td",
    "pre",
    "a",
  ],
  allowedAttributes: {
    a: ["href", "target"],
    "*": ["class", "style"],
  },
  allowedStyles: {
    "*": {
      color: [
        /^#(0x)?[0-9a-f]+$/i,
        /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/,
      ],
      "text-align": [/^left$/, /^right$/, /^center$/],
      "font-size": [/^\d+(?:px|em|%)$/],
    },
  },
};

// 요청 본문 HTML 새니타이징 미들웨어
const sanitizeBody = (req, res, next) => {
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === "string") {
        // 메일 본문인 경우 HTML 허용하되 새니타이징
        if (key === "body" && req.path === "/api/mail/send") {
          req.body[key] = sanitizeHtml(req.body[key], sanitizeOptions);
        } else {
          // 그 외의 경우 모든 HTML 제거
          req.body[key] = sanitizeHtml(req.body[key], { allowedTags: [] });
        }
      }
    }
  }
  next();
};

// XSS 공격 감지 및 로깅
const xssDetection = (req, res, next) => {
  const originalBody = JSON.stringify(req.body);
  const sanitizedBody = JSON.stringify(
    sanitizeHtml(originalBody, { allowedTags: [] })
  );

  if (originalBody !== sanitizedBody) {
    logger.warn(`잠재적인 XSS 공격 감지: ${req.method} ${req.path}`);
    logger.debug(`원본 데이터: ${originalBody}`);
    logger.debug(`정제된 데이터: ${sanitizedBody}`);
  }

  next();
};

module.exports = {
  helmetConfig,
  xssClean,
  sanitizeBody,
  xssDetection,
  mongoSanitizeConfig,
  validateQuery,
};
