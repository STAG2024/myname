const express = require("express");
const router = express.Router();
const SecurityDashboard = require("../services/security-dashboard");
const { isAdmin } = require("../middleware/auth");
const { validateQuery } = require("../middleware/security");

// 보안 개요 데이터 조회
router.get("/overview", isAdmin, async (req, res) => {
  try {
    const { timeRange = 7 } = req.query;
    const overview = await SecurityDashboard.getSecurityOverview(
      parseInt(timeRange)
    );
    res.json(overview);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "보안 개요 데이터 조회 중 오류가 발생했습니다.",
    });
  }
});

// 시간별 보안 이벤트 통계
router.get("/hourly-stats", isAdmin, async (req, res) => {
  try {
    const { timeRange = 7 } = req.query;
    const stats = await SecurityDashboard.getHourlyStats(parseInt(timeRange));
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "시간별 통계 조회 중 오류가 발생했습니다.",
    });
  }
});

// IP 기반 위협 분석
router.get("/ip-threats", isAdmin, async (req, res) => {
  try {
    const { timeRange = 7 } = req.query;
    const threats = await SecurityDashboard.getIPThreats(parseInt(timeRange));
    res.json(threats);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "IP 위협 분석 중 오류가 발생했습니다.",
    });
  }
});

// 사용자 활동 분석
router.get("/user-activities", isAdmin, async (req, res) => {
  try {
    const { timeRange = 7 } = req.query;
    const activities = await SecurityDashboard.getUserActivities(
      parseInt(timeRange)
    );
    res.json(activities);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "사용자 활동 분석 중 오류가 발생했습니다.",
    });
  }
});

// 보안 알림 설정 조회
router.get("/alerts", isAdmin, async (req, res) => {
  try {
    const alerts = await SecurityDashboard.getSecurityAlerts();
    res.json(alerts);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "보안 알림 설정 조회 중 오류가 발생했습니다.",
    });
  }
});

module.exports = router;
