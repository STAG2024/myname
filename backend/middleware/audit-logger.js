const AuditLogger = require("../services/audit-logger");

// 기본 감사 로그 미들웨어
const auditLog = (action, category) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    const originalEnd = res.end;
    let responseBody;

    // 응답 데이터 캡처
    res.json = function (data) {
      responseBody = data;
      return originalJson.call(this, data);
    };

    // 응답 상태 코드 캡처
    res.end = async function (chunk, encoding) {
      res.end = originalEnd;
      if (chunk) {
        try {
          responseBody = JSON.parse(chunk);
        } catch (e) {
          responseBody = chunk.toString();
        }
      }

      // 감사 로그 기록
      await AuditLogger.log(action, category, req, {
        requestBody: req.body,
        responseBody,
        reason: req.body?.reason || "일반 작업",
      });

      return originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};

// 사용자 인증 감사
const auditAuth = () => {
  return auditLog("LOGIN", "SECURITY");
};

// 데이터 변경 감사
const auditDataChange = (action, targetModel) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    let responseBody;

    res.json = async function (data) {
      responseBody = data;

      if (data.success !== false) {
        await AuditLogger.log(
          action,
          "DATA",
          req,
          {
            before: req.originalData, // 이전 데이터 (해당하는 경우)
            after: data.result || data, // 변경된 데이터
            reason: req.body?.reason || "데이터 변경",
          },
          {
            targetId: req.params.id || data._id,
            targetModel,
          }
        );
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

// 관리자 작업 감사
const auditAdmin = (action) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    let responseBody;

    res.json = async function (data) {
      responseBody = data;

      await AuditLogger.log(action, "ADMIN", req, {
        action: req.body.action,
        target: req.body.target,
        changes: req.body.changes,
        reason: req.body.reason || "관리자 작업",
      });

      return originalJson.call(this, data);
    };

    next();
  };
};

// 시스템 설정 변경 감사
const auditSettings = () => {
  return auditLog("SETTINGS_CHANGE", "SYSTEM");
};

// API 접근 감사
const auditApiAccess = () => {
  return auditLog("API_ACCESS", "SYSTEM");
};

module.exports = {
  auditLog,
  auditAuth,
  auditDataChange,
  auditAdmin,
  auditSettings,
  auditApiAccess,
};
