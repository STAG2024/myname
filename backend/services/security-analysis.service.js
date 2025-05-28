const geoip = require("geoip-lite");
const logger = require("../config/logger");
const emailService = require("./email.service");

class SecurityAnalysisService {
  // 로그인 패턴 분석
  analyzeLoginPattern(user, loginHistory) {
    const analysis = {
      riskScore: 0,
      unusualActivities: [],
      recommendations: [],
    };

    // 최근 실패한 로그인 시도 분석
    const recentFailures = loginHistory
      .filter((log) => log.status === "failed")
      .slice(0, 10);

    if (recentFailures.length >= 3) {
      analysis.riskScore += 30;
      analysis.unusualActivities.push({
        type: "multiple_failures",
        count: recentFailures.length,
        message: `최근 ${recentFailures.length}회의 로그인 실패가 감지되었습니다.`,
      });
      analysis.recommendations.push("2단계 인증을 활성화하는 것을 권장합니다.");
    }

    // 비정상적인 위치에서의 로그인 시도 분석
    const locations = new Set();
    const recentLogins = loginHistory.slice(0, 20);

    recentLogins.forEach((log) => {
      if (log.ip) {
        const geo = geoip.lookup(log.ip);
        if (geo) {
          locations.add(geo.country);
        }
      }
    });

    if (locations.size > 2) {
      analysis.riskScore += 20;
      analysis.unusualActivities.push({
        type: "multiple_locations",
        locations: Array.from(locations),
        message: "여러 국가에서의 로그인 시도가 감지되었습니다.",
      });
      analysis.recommendations.push(
        "허용된 IP 주소 목록을 설정하는 것을 권장합니다."
      );
    }

    // 시간대 기반 분석
    const loginTimes = loginHistory
      .filter((log) => log.status === "success")
      .map((log) => new Date(log.timestamp).getHours());

    const unusualTimes = loginTimes.filter((hour) => hour >= 22 || hour <= 5);
    if (unusualTimes.length >= 3) {
      analysis.riskScore += 10;
      analysis.unusualActivities.push({
        type: "unusual_times",
        count: unusualTimes.length,
        message: "비정상적인 시간대의 로그인이 감지되었습니다.",
      });
    }

    return analysis;
  }

  // 디바이스 사용 패턴 분석
  analyzeDevicePattern(user, activeSessions) {
    const analysis = {
      riskScore: 0,
      unusualActivities: [],
      recommendations: [],
    };

    // 동시 접속 디바이스 수 분석
    const activeSessions = activeSessions.filter((session) => session.isActive);
    if (activeSessions.length > 3) {
      analysis.riskScore += 15;
      analysis.unusualActivities.push({
        type: "multiple_sessions",
        count: activeSessions.length,
        message: `${activeSessions.length}개의 동시 접속이 감지되었습니다.`,
      });
      analysis.recommendations.push(
        "불필요한 세션을 종료하는 것을 권장합니다."
      );
    }

    // 새로운 디바이스 사용 분석
    const trustedDevices = user.securitySettings.trustedDevices || [];
    const newDevices = activeSessions.filter(
      (session) => !trustedDevices.includes(session.deviceId)
    );

    if (newDevices.length > 0) {
      analysis.riskScore += 10;
      analysis.unusualActivities.push({
        type: "new_devices",
        count: newDevices.length,
        message: `${newDevices.length}개의 새로운 디바이스 접속이 감지되었습니다.`,
      });
      analysis.recommendations.push(
        "신뢰할 수 있는 디바이스를 등록하는 것을 권장합니다."
      );
    }

    return analysis;
  }

  // IP 주소 기반 위험 분석
  analyzeIPRisk(loginHistory) {
    const analysis = {
      riskScore: 0,
      unusualActivities: [],
      recommendations: [],
    };

    const ipCounts = {};
    const suspiciousIPs = new Set();

    loginHistory.forEach((log) => {
      if (!log.ip) return;

      // IP 주소별 시도 횟수 집계
      ipCounts[log.ip] = (ipCounts[log.ip] || 0) + 1;

      // 실패한 로그인의 IP 주소 기록
      if (log.status === "failed") {
        suspiciousIPs.add(log.ip);
      }
    });

    // 과도한 시도가 있는 IP 분석
    Object.entries(ipCounts).forEach(([ip, count]) => {
      if (count > 10) {
        analysis.riskScore += 20;
        analysis.unusualActivities.push({
          type: "excessive_attempts",
          ip,
          count,
          message: `IP 주소 ${ip}에서 과도한 로그인 시도가 감지되었습니다.`,
        });
        analysis.recommendations.push(
          "해당 IP 주소를 차단하는 것을 권장합니다."
        );
      }
    });

    // 의심스러운 IP 주소 분석
    if (suspiciousIPs.size > 0) {
      analysis.riskScore += suspiciousIPs.size * 5;
      analysis.unusualActivities.push({
        type: "suspicious_ips",
        ips: Array.from(suspiciousIPs),
        message: `${suspiciousIPs.size}개의 의심스러운 IP 주소가 감지되었습니다.`,
      });
    }

    return analysis;
  }

  // 전체 보안 위험도 분석
  async analyzeSecurityRisk(user) {
    try {
      const loginPattern = this.analyzeLoginPattern(user, user.loginHistory);
      const devicePattern = this.analyzeDevicePattern(
        user,
        user.activeSessions
      );
      const ipRisk = this.analyzeIPRisk(user.loginHistory);

      const totalRiskScore =
        loginPattern.riskScore + devicePattern.riskScore + ipRisk.riskScore;

      const analysis = {
        riskScore: totalRiskScore,
        riskLevel: this.calculateRiskLevel(totalRiskScore),
        unusualActivities: [
          ...loginPattern.unusualActivities,
          ...devicePattern.unusualActivities,
          ...ipRisk.unusualActivities,
        ],
        recommendations: [
          ...new Set([
            ...loginPattern.recommendations,
            ...devicePattern.recommendations,
            ...ipRisk.recommendations,
          ]),
        ],
      };

      // 높은 위험도 감지 시 이메일 알림
      if (
        analysis.riskLevel === "high" &&
        user.securitySettings.loginNotifications
      ) {
        await this.sendRiskAlert(user, analysis);
      }

      return analysis;
    } catch (error) {
      logger.error("보안 위험도 분석 실패:", error);
      throw error;
    }
  }

  // 위험도 레벨 계산
  calculateRiskLevel(score) {
    if (score >= 70) return "high";
    if (score >= 40) return "medium";
    return "low";
  }

  // 위험 알림 발송
  async sendRiskAlert(user, analysis) {
    try {
      const activities = analysis.unusualActivities
        .map((activity) => activity.message)
        .join("\n");

      const recommendations = analysis.recommendations
        .map((rec) => `- ${rec}`)
        .join("\n");

      await emailService.sendSecurityAlert(user, {
        riskLevel: analysis.riskLevel,
        riskScore: analysis.riskScore,
        activities,
        recommendations,
      });
    } catch (error) {
      logger.error("보안 위험 알림 발송 실패:", error);
    }
  }
}

module.exports = new SecurityAnalysisService();
