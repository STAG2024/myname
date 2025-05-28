const SecurityEvent = require("../models/security-event.model");
const AuditLog = require("../models/audit-log.model");
const logger = require("../config/logger");

class SecurityDashboard {
  // 보안 개요 데이터 조회
  static async getSecurityOverview(timeRange) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const [
        securityEvents,
        auditLogs,
        criticalEvents,
        loginAttempts,
        suspiciousActivities,
      ] = await Promise.all([
        // 전체 보안 이벤트 수
        SecurityEvent.countDocuments({
          timestamp: { $gte: startDate },
        }),
        // 전체 감사 로그 수
        AuditLog.countDocuments({
          timestamp: { $gte: startDate },
        }),
        // 심각도 높은 이벤트 수
        SecurityEvent.countDocuments({
          timestamp: { $gte: startDate },
          severity: { $in: ["HIGH", "CRITICAL"] },
        }),
        // 로그인 시도 통계
        SecurityEvent.aggregate([
          {
            $match: {
              timestamp: { $gte: startDate },
              type: { $in: ["LOGIN_SUCCESS", "LOGIN_FAILURE"] },
            },
          },
          {
            $group: {
              _id: "$type",
              count: { $sum: 1 },
            },
          },
        ]),
        // 의심스러운 활동
        SecurityEvent.find({
          timestamp: { $gte: startDate },
          type: "SUSPICIOUS_ACTIVITY",
        })
          .sort({ timestamp: -1 })
          .limit(10),
      ]);

      return {
        totalEvents: securityEvents,
        totalAuditLogs: auditLogs,
        criticalEvents,
        loginAttempts: {
          success:
            loginAttempts.find((x) => x._id === "LOGIN_SUCCESS")?.count || 0,
          failure:
            loginAttempts.find((x) => x._id === "LOGIN_FAILURE")?.count || 0,
        },
        recentSuspiciousActivities: suspiciousActivities,
      };
    } catch (error) {
      logger.error("보안 개요 데이터 조회 실패:", error);
      throw error;
    }
  }

  // 시간별 보안 이벤트 통계
  static async getHourlyStats(timeRange) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const hourlyStats = await SecurityEvent.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$timestamp" },
              month: { $month: "$timestamp" },
              day: { $dayOfMonth: "$timestamp" },
              hour: { $hour: "$timestamp" },
            },
            count: { $sum: 1 },
            criticalCount: {
              $sum: {
                $cond: [{ $in: ["$severity", ["HIGH", "CRITICAL"]] }, 1, 0],
              },
            },
          },
        },
        {
          $sort: {
            "_id.year": 1,
            "_id.month": 1,
            "_id.day": 1,
            "_id.hour": 1,
          },
        },
      ]);

      return hourlyStats;
    } catch (error) {
      logger.error("시간별 통계 조회 실패:", error);
      throw error;
    }
  }

  // IP 기반 위협 분석
  static async getIPThreats(timeRange) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const ipThreats = await SecurityEvent.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate },
            "metadata.ip": { $exists: true },
          },
        },
        {
          $group: {
            _id: "$metadata.ip",
            totalEvents: { $sum: 1 },
            failedLogins: {
              $sum: {
                $cond: [{ $eq: ["$type", "LOGIN_FAILURE"] }, 1, 0],
              },
            },
            suspiciousActivities: {
              $sum: {
                $cond: [{ $eq: ["$type", "SUSPICIOUS_ACTIVITY"] }, 1, 0],
              },
            },
            lastSeen: { $max: "$timestamp" },
            countries: { $addToSet: "$metadata.location.country" },
          },
        },
        {
          $match: {
            $or: [
              { failedLogins: { $gt: 5 } },
              { suspiciousActivities: { $gt: 0 } },
            ],
          },
        },
        {
          $sort: { totalEvents: -1 },
        },
        {
          $limit: 20,
        },
      ]);

      return ipThreats;
    } catch (error) {
      logger.error("IP 위협 분석 실패:", error);
      throw error;
    }
  }

  // 사용자 활동 분석
  static async getUserActivities(timeRange) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const userActivities = await AuditLog.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate },
            userId: { $exists: true },
          },
        },
        {
          $group: {
            _id: "$userId",
            totalActions: { $sum: 1 },
            uniqueIPs: { $addToSet: "$metadata.ip" },
            lastAction: { $max: "$timestamp" },
            actionTypes: { $addToSet: "$action" },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        {
          $unwind: "$userInfo",
        },
        {
          $project: {
            username: "$userInfo.username",
            email: "$userInfo.email",
            totalActions: 1,
            uniqueIPCount: { $size: "$uniqueIPs" },
            lastAction: 1,
            actionTypes: 1,
          },
        },
        {
          $sort: { totalActions: -1 },
        },
        {
          $limit: 20,
        },
      ]);

      return userActivities;
    } catch (error) {
      logger.error("사용자 활동 분석 실패:", error);
      throw error;
    }
  }

  // 보안 알림 설정 조회
  static async getSecurityAlerts() {
    try {
      // 여기에 보안 알림 설정 조회 로직 구현
      // 예: 데이터베이스에서 알림 설정 조회
      return {
        emailAlerts: true,
        slackAlerts: false,
        alertThresholds: {
          failedLogins: 5,
          suspiciousActivities: 3,
          criticalEvents: 1,
        },
      };
    } catch (error) {
      logger.error("보안 알림 설정 조회 실패:", error);
      throw error;
    }
  }
}

module.exports = SecurityDashboard;
