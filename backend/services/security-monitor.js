const geoip = require("geoip-lite");
const UAParser = require("ua-parser-js");
const SecurityEvent = require("../models/security-event.model");
const logger = require("../config/logger");

class SecurityMonitor {
  static async logEvent(type, severity, description, req, userId = null) {
    try {
      const parser = new UAParser(req.headers["user-agent"]);
      const geo = geoip.lookup(req.ip);

      const event = new SecurityEvent({
        type,
        severity,
        description,
        userId,
        metadata: {
          ip: req.ip,
          userAgent: req.headers["user-agent"],
          location: geo
            ? {
                country: geo.country,
                city: geo.city,
                timezone: geo.timezone,
              }
            : null,
          browser: {
            name: parser.getBrowser().name,
            version: parser.getBrowser().version,
          },
          os: {
            name: parser.getOS().name,
            version: parser.getOS().version,
          },
          device: {
            type: parser.getDevice().type,
            vendor: parser.getDevice().vendor,
            model: parser.getDevice().model,
          },
        },
        request: {
          method: req.method,
          path: req.path,
          headers: this.sanitizeHeaders(req.headers),
          body: this.sanitizeBody(req.body),
        },
      });

      await event.save();
      this.analyzeEvent(event);
    } catch (error) {
      logger.error("보안 이벤트 로깅 실패:", error);
    }
  }

  // 민감한 정보 제거
  static sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ["authorization", "cookie", "x-csrf-token"];

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = "[REDACTED]";
      }
    });

    return sanitized;
  }

  static sanitizeBody(body) {
    const sanitized = { ...body };
    const sensitiveFields = ["password", "token", "creditCard", "ssn"];

    this.recursiveSanitize(sanitized, sensitiveFields);
    return sanitized;
  }

  static recursiveSanitize(obj, sensitiveFields) {
    for (let key in obj) {
      if (typeof obj[key] === "object" && obj[key] !== null) {
        this.recursiveSanitize(obj[key], sensitiveFields);
      } else if (sensitiveFields.includes(key.toLowerCase())) {
        obj[key] = "[REDACTED]";
      }
    }
  }

  // 이벤트 분석 및 경고
  static async analyzeEvent(event) {
    try {
      // IP 기반 의심스러운 활동 감지
      await this.detectSuspiciousIP(event);

      // 사용자 기반 의심스러운 활동 감지
      if (event.userId) {
        await this.detectSuspiciousUserActivity(event);
      }

      // 심각도에 따른 알림
      if (["HIGH", "CRITICAL"].includes(event.severity)) {
        await this.sendAlert(event);
      }
    } catch (error) {
      logger.error("보안 이벤트 분석 실패:", error);
    }
  }

  // IP 기반 의심스러운 활동 감지
  static async detectSuspiciousIP(event) {
    const timeWindow = new Date(Date.now() - 60 * 60 * 1000); // 1시간

    const ipEvents = await SecurityEvent.find({
      "metadata.ip": event.metadata.ip,
      timestamp: { $gte: timeWindow },
    });

    // 로그인 실패 횟수
    const loginFailures = ipEvents.filter(
      (e) => e.type === "LOGIN_FAILURE"
    ).length;
    if (loginFailures >= 10) {
      logger.warn(
        `의심스러운 IP 감지: ${event.metadata.ip} (과도한 로그인 실패)`
      );
    }

    // 다중 계정 접근 시도
    const uniqueUsers = new Set(ipEvents.map((e) => e.userId?.toString())).size;
    if (uniqueUsers >= 5) {
      logger.warn(`의심스러운 IP 감지: ${event.metadata.ip} (다중 계정 접근)`);
    }
  }

  // 사용자 기반 의심스러운 활동 감지
  static async detectSuspiciousUserActivity(event) {
    const timeWindow = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24시간

    const userEvents = await SecurityEvent.find({
      userId: event.userId,
      timestamp: { $gte: timeWindow },
    });

    // 비정상적인 위치에서의 접근
    const locations = new Set(
      userEvents.map((e) => e.metadata.location?.country)
    );
    if (locations.size > 2) {
      logger.warn(
        `의심스러운 사용자 활동 감지: ${event.userId} (다중 국가에서 접근)`
      );
    }

    // 비정상적인 시간대의 활동
    const hours = new Set(
      userEvents.map((e) => new Date(e.timestamp).getHours())
    );
    const suspiciousHours = Array.from(hours).filter(
      (h) => h >= 22 || h <= 5
    ).length;
    if (suspiciousHours >= 3) {
      logger.warn(
        `의심스러운 사용자 활동 감지: ${event.userId} (심야 시간대 활동)`
      );
    }
  }

  // 보안 경고 전송
  static async sendAlert(event) {
    // 여기에 실제 알림 로직 구현 (이메일, SMS, 슬랙 등)
    logger.error(`보안 경고: ${event.type} - ${event.description}`);
  }
}

module.exports = SecurityMonitor;
