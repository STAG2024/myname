const AuditLog = require("../models/audit-log.model");
const logger = require("../config/logger");

class AuditLogger {
  static async log(action, category, req, details = {}, targetInfo = {}) {
    try {
      const auditLog = new AuditLog({
        action,
        category,
        userId: req.session?.user?._id,
        targetId: targetInfo.targetId,
        targetModel: targetInfo.targetModel,
        details,
        metadata: {
          ip: req.ip,
          userAgent: req.headers["user-agent"],
          path: req.path,
          method: req.method,
          status: req.statusCode,
        },
      });

      await auditLog.save();
      logger.info(`감사 로그 기록: ${action} - ${category}`);
    } catch (error) {
      logger.error("감사 로그 기록 실패:", error);
    }
  }

  static async search({
    startDate,
    endDate,
    action,
    category,
    userId,
    targetId,
    page = 1,
    limit = 50,
  }) {
    try {
      const query = {};

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      if (action) query.action = action;
      if (category) query.category = category;
      if (userId) query.userId = userId;
      if (targetId) query.targetId = targetId;

      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .populate("userId", "email username")
          .lean(),
        AuditLog.countDocuments(query),
      ]);

      return {
        logs,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error("감사 로그 검색 실패:", error);
      throw error;
    }
  }

  static async getStatistics(startDate, endDate) {
    try {
      const query = {
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };

      const [actionStats, categoryStats, userStats] = await Promise.all([
        AuditLog.aggregate([
          { $match: query },
          { $group: { _id: "$action", count: { $sum: 1 } } },
        ]),
        AuditLog.aggregate([
          { $match: query },
          { $group: { _id: "$category", count: { $sum: 1 } } },
        ]),
        AuditLog.aggregate([
          { $match: query },
          { $group: { _id: "$userId", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
      ]);

      return {
        actionStats,
        categoryStats,
        topUsers: userStats,
      };
    } catch (error) {
      logger.error("감사 로그 통계 수집 실패:", error);
      throw error;
    }
  }

  static async cleanup(retentionDays) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await AuditLog.deleteMany({
        timestamp: { $lt: cutoffDate },
      });

      logger.info(`오래된 감사 로그 ${result.deletedCount}개 삭제 완료`);
      return result.deletedCount;
    } catch (error) {
      logger.error("감사 로그 정리 실패:", error);
      throw error;
    }
  }
}

module.exports = AuditLogger;
