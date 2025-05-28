const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/auth");
const User = require("../models/User");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const logger = require("../config/logger");
const emailService = require("../services/email.service");

// 2단계 인증 설정
router.post("/2fa/setup", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // 2단계 인증 비밀키 생성
    const secret = speakeasy.generateSecret({
      name: `MyApp:${user.email}`,
    });

    // QR 코드 생성
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    // 임시로 비밀키 저장
    user.twoFactorSecret = secret.base32;
    await user.save();

    res.json({
      success: true,
      qrCode: qrCodeUrl,
      secret: secret.base32,
    });
  } catch (error) {
    logger.error("2단계 인증 설정 실패:", error);
    res.status(500).json({
      success: false,
      message: "2단계 인증 설정 중 오류가 발생했습니다.",
    });
  }
});

// 2단계 인증 활성화
router.post("/2fa/verify", isAuthenticated, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user._id);

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: "잘못된 인증 코드입니다.",
      });
    }

    user.twoFactorEnabled = true;
    await user.save();

    // 2FA 활성화 알림 이메일 발송
    await emailService.sendSecuritySettingsAlert(user, {
      twoFactorEnabled: true,
    });

    res.json({
      success: true,
      message: "2단계 인증이 활성화되었습니다.",
    });
  } catch (error) {
    logger.error("2단계 인증 확인 실패:", error);
    res.status(500).json({
      success: false,
      message: "2단계 인증 확인 중 오류가 발생했습니다.",
    });
  }
});

// 2단계 인증 비활성화
router.post("/2fa/disable", isAuthenticated, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user._id);

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: "잘못된 인증 코드입니다.",
      });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    // 2FA 비활성화 알림 이메일 발송
    await emailService.sendSecuritySettingsAlert(user, {
      twoFactorEnabled: false,
    });

    res.json({
      success: true,
      message: "2단계 인증이 비활성화되었습니다.",
    });
  } catch (error) {
    logger.error("2단계 인증 비활성화 실패:", error);
    res.status(500).json({
      success: false,
      message: "2단계 인증 비활성화 중 오류가 발생했습니다.",
    });
  }
});

// 활성 세션 목록 조회
router.get("/sessions", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const activeSessions = user.activeSessions.filter(
      (session) => session.isActive
    );

    res.json({
      success: true,
      sessions: activeSessions,
    });
  } catch (error) {
    logger.error("세션 목록 조회 실패:", error);
    res.status(500).json({
      success: false,
      message: "세션 목록 조회 중 오류가 발생했습니다.",
    });
  }
});

// 세션 종료
router.delete("/sessions/:sessionId", isAuthenticated, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const user = await User.findById(req.user._id);

    await user.endSession(sessionId);

    res.json({
      success: true,
      message: "세션이 종료되었습니다.",
    });
  } catch (error) {
    logger.error("세션 종료 실패:", error);
    res.status(500).json({
      success: false,
      message: "세션 종료 중 오류가 발생했습니다.",
    });
  }
});

// 로그인 기록 조회
router.get("/login-history", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const history = user.loginHistory.sort((a, b) => b.timestamp - a.timestamp);

    res.json({
      success: true,
      history,
    });
  } catch (error) {
    logger.error("로그인 기록 조회 실패:", error);
    res.status(500).json({
      success: false,
      message: "로그인 기록 조회 중 오류가 발생했습니다.",
    });
  }
});

// 보안 설정 업데이트
router.put("/settings", isAuthenticated, async (req, res) => {
  try {
    const { loginNotifications, allowedIPs } = req.body;
    const user = await User.findById(req.user._id);

    const changes = {};

    if (
      loginNotifications !== undefined &&
      loginNotifications !== user.securitySettings.loginNotifications
    ) {
      changes.loginNotifications = loginNotifications;
      user.securitySettings.loginNotifications = loginNotifications;
    }

    if (allowedIPs) {
      changes.allowedIPs = allowedIPs;
      user.securitySettings.allowedIPs = allowedIPs;
    }

    await user.save();

    // 설정 변경 알림 이메일 발송
    if (Object.keys(changes).length > 0) {
      await emailService.sendSecuritySettingsAlert(user, changes);
    }

    res.json({
      success: true,
      message: "보안 설정이 업데이트되었습니다.",
      settings: user.securitySettings,
    });
  } catch (error) {
    logger.error("보안 설정 업데이트 실패:", error);
    res.status(500).json({
      success: false,
      message: "보안 설정 업데이트 중 오류가 발생했습니다.",
    });
  }
});

module.exports = router;
