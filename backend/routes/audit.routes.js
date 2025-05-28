const express = require("express");
const router = express.Router();
const AuditLogger = require("../services/audit-logger");
const { isAdmin } = require("../middleware/auth");
const { validateQuery } = require("../middleware/security");

// 감사 로그 검색
router.get("/logs", isAdmin, validateQuery, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      action,
      category,
      userId,
      targetId,
      page,
      limit,
    } = req.query;

    const result = await AuditLogger.search({
      startDate,
      endDate,
      action,
      category,
      userId,
      targetId,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "감사 로그 검색 중 오류가 발생했습니다.",
    });
  }
});

// 감사 로그 통계
router.get("/statistics", isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "시작일과 종료일이 필요합니다.",
      });
    }

    const statistics = await AuditLogger.getStatistics(startDate, endDate);
    res.json(statistics);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "통계 수집 중 오류가 발생했습니다.",
    });
  }
});

// 오래된 로그 정리 (관리자 전용)
router.post("/cleanup", isAdmin, async (req, res) => {
  try {
    const { retentionDays = 90 } = req.body;

    if (retentionDays < 30) {
      return res.status(400).json({
        success: false,
        message: "보관 기간은 최소 30일 이상이어야 합니다.",
      });
    }

    const deletedCount = await AuditLogger.cleanup(retentionDays);
    res.json({
      success: true,
      message: `${deletedCount}개의 오래된 로그가 삭제되었습니다.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "로그 정리 중 오류가 발생했습니다.",
    });
  }
});

module.exports = router;
