const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/auth");
const User = require("../models/User");
const securityAnalysisService = require("../services/security-analysis.service");
const logger = require("../config/logger");

// 보안 위험도 분석
router.get("/risk-analysis", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const analysis = await securityAnalysisService.analyzeSecurityRisk(user);

    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    logger.error("보안 위험도 분석 실패:", error);
    res.status(500).json({
      success: false,
      message: "보안 위험도 분석 중 오류가 발생했습니다.",
    });
  }
});

// 로그인 패턴 분석
router.get("/login-pattern", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const analysis = securityAnalysisService.analyzeLoginPattern(
      user,
      user.loginHistory
    );

    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    logger.error("로그인 패턴 분석 실패:", error);
    res.status(500).json({
      success: false,
      message: "로그인 패턴 분석 중 오류가 발생했습니다.",
    });
  }
});

// 디바이스 사용 패턴 분석
router.get("/device-pattern", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const analysis = securityAnalysisService.analyzeDevicePattern(
      user,
      user.activeSessions
    );

    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    logger.error("디바이스 패턴 분석 실패:", error);
    res.status(500).json({
      success: false,
      message: "디바이스 패턴 분석 중 오류가 발생했습니다.",
    });
  }
});

// IP 주소 위험도 분석
router.get("/ip-risk", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const analysis = securityAnalysisService.analyzeIPRisk(user.loginHistory);

    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    logger.error("IP 위험도 분석 실패:", error);
    res.status(500).json({
      success: false,
      message: "IP 위험도 분석 중 오류가 발생했습니다.",
    });
  }
});

module.exports = router;
