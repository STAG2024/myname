const SecurityMonitor = require("../services/security-monitor");

// 보안 이벤트 로깅 미들웨어
const logSecurityEvent = (type, severity, description) => {
  return (req, res, next) => {
    const userId = req.session?.user?._id;
    SecurityMonitor.logEvent(type, severity, description, req, userId);
    next();
  };
};

// 로그인 이벤트 모니터링
const monitorLogin = (req, res, next) => {
  const originalJson = res.json;
  res.json = function (data) {
    if (data.success) {
      SecurityMonitor.logEvent(
        "LOGIN_SUCCESS",
        "LOW",
        "로그인 성공",
        req,
        data.user?._id
      );
    } else {
      SecurityMonitor.logEvent(
        "LOGIN_FAILURE",
        "MEDIUM",
        `로그인 실패: ${data.message}`,
        req
      );
    }
    return originalJson.call(this, data);
  };
  next();
};

// 계정 잠금 모니터링
const monitorAccountLock = (req, res, next) => {
  const originalJson = res.json;
  res.json = function (data) {
    if (data.locked) {
      SecurityMonitor.logEvent(
        "ACCOUNT_LOCKED",
        "HIGH",
        `계정 잠금: ${data.message}`,
        req,
        data.userId
      );
    }
    return originalJson.call(this, data);
  };
  next();
};

// 비밀번호 변경 모니터링
const monitorPasswordChange = (req, res, next) => {
  const originalJson = res.json;
  res.json = function (data) {
    if (data.success) {
      SecurityMonitor.logEvent(
        "PASSWORD_CHANGED",
        "MEDIUM",
        "비밀번호 변경 성공",
        req,
        req.session?.user?._id
      );
    }
    return originalJson.call(this, data);
  };
  next();
};

// Rate Limit 초과 모니터링
const monitorRateLimit = (req, res, next) => {
  const originalStatus = res.status;
  res.status = function (code) {
    if (code === 429) {
      SecurityMonitor.logEvent(
        "RATE_LIMIT_EXCEEDED",
        "MEDIUM",
        `Rate limit 초과: ${req.ip}`,
        req,
        req.session?.user?._id
      );
    }
    return originalStatus.call(this, code);
  };
  next();
};

// 토큰 검증 실패 모니터링
const monitorTokenValidation = (req, res, next) => {
  const originalStatus = res.status;
  res.status = function (code) {
    if (code === 401 || code === 403) {
      SecurityMonitor.logEvent(
        "INVALID_TOKEN",
        "HIGH",
        "토큰 검증 실패",
        req,
        req.session?.user?._id
      );
    }
    return originalStatus.call(this, code);
  };
  next();
};

// XSS 시도 모니터링
const monitorXSS = (req, res, next) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /onerror=/gi,
    /onload=/gi,
  ];

  const checkXSS = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === "string") {
        for (let pattern of xssPatterns) {
          if (pattern.test(obj[key])) {
            SecurityMonitor.logEvent(
              "XSS_ATTEMPT",
              "CRITICAL",
              `XSS 시도 감지: ${key}`,
              req,
              req.session?.user?._id
            );
            break;
          }
        }
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        checkXSS(obj[key]);
      }
    }
  };

  if (req.body) checkXSS(req.body);
  if (req.query) checkXSS(req.query);
  if (req.params) checkXSS(req.params);

  next();
};

// SQL/NoSQL Injection 시도 모니터링
const monitorInjection = (req, res, next) => {
  const injectionPatterns = [
    /\$where/i,
    /\$ne/i,
    /\$gt/i,
    /\$lt/i,
    /\$or/i,
    /\$and/i,
    /\{\s*\$/,
    /;\s*$/,
    /--/,
    /\/\*/,
    /UNION\s+SELECT/i,
  ];

  const checkInjection = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === "string") {
        for (let pattern of injectionPatterns) {
          if (pattern.test(obj[key])) {
            SecurityMonitor.logEvent(
              "INJECTION_ATTEMPT",
              "CRITICAL",
              `Injection 시도 감지: ${key}`,
              req,
              req.session?.user?._id
            );
            break;
          }
        }
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        checkInjection(obj[key]);
      }
    }
  };

  if (req.body) checkInjection(req.body);
  if (req.query) checkInjection(req.query);
  if (req.params) checkInjection(req.params);

  next();
};

module.exports = {
  logSecurityEvent,
  monitorLogin,
  monitorAccountLock,
  monitorPasswordChange,
  monitorRateLimit,
  monitorTokenValidation,
  monitorXSS,
  monitorInjection,
};
