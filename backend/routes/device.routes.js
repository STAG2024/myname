const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/auth");
const User = require("../models/User");
const logger = require("../config/logger");
const emailService = require("../services/email.service");

// 신뢰할 수 있는 디바이스 목록 조회
router.get("/trusted", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const trustedDevices = user.securitySettings.trustedDevices || [];

    res.json({
      success: true,
      devices: trustedDevices,
    });
  } catch (error) {
    logger.error("신뢰할 수 있는 디바이스 목록 조회 실패:", error);
    res.status(500).json({
      success: false,
      message: "디바이스 목록 조회 중 오류가 발생했습니다.",
    });
  }
});

// 디바이스를 신뢰할 수 있는 목록에 추가
router.post("/trust/:deviceId", isAuthenticated, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const user = await User.findById(req.user._id);

    // 이미 신뢰할 수 있는 디바이스인지 확인
    if (user.securitySettings.trustedDevices.includes(deviceId)) {
      return res.status(400).json({
        success: false,
        message: "이미 신뢰할 수 있는 디바이스입니다.",
      });
    }

    // 디바이스 정보 찾기
    const device = user.activeSessions.find((s) => s.deviceId === deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "디바이스를 찾을 수 없습니다.",
      });
    }

    // 신뢰할 수 있는 디바이스 목록에 추가
    user.securitySettings.trustedDevices.push(deviceId);
    await user.save();

    // 이메일 알림 발송
    await emailService.sendSecuritySettingsAlert(user, {
      trustedDevice: `${device.browser} on ${device.os}`,
    });

    res.json({
      success: true,
      message: "디바이스가 신뢰할 수 있는 목록에 추가되었습니다.",
    });
  } catch (error) {
    logger.error("디바이스 신뢰 설정 실패:", error);
    res.status(500).json({
      success: false,
      message: "디바이스 신뢰 설정 중 오류가 발생했습니다.",
    });
  }
});

// 신뢰할 수 있는 디바이스 제거
router.delete("/trust/:deviceId", isAuthenticated, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const user = await User.findById(req.user._id);

    // 디바이스가 신뢰할 수 있는 목록에 있는지 확인
    const deviceIndex = user.securitySettings.trustedDevices.indexOf(deviceId);
    if (deviceIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "신뢰할 수 있는 디바이스 목록에서 찾을 수 없습니다.",
      });
    }

    // 디바이스 정보 찾기
    const device = user.activeSessions.find((s) => s.deviceId === deviceId);

    // 신뢰할 수 있는 디바이스 목록에서 제거
    user.securitySettings.trustedDevices.splice(deviceIndex, 1);
    await user.save();

    // 이메일 알림 발송
    if (device) {
      await emailService.sendSecuritySettingsAlert(user, {
        removedTrustedDevice: `${device.browser} on ${device.os}`,
      });
    }

    res.json({
      success: true,
      message: "디바이스가 신뢰할 수 있는 목록에서 제거되었습니다.",
    });
  } catch (error) {
    logger.error("디바이스 신뢰 해제 실패:", error);
    res.status(500).json({
      success: false,
      message: "디바이스 신뢰 해제 중 오류가 발생했습니다.",
    });
  }
});

// 디바이스 차단
router.post("/block/:deviceId", isAuthenticated, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const user = await User.findById(req.user._id);

    // 디바이스 찾기
    const device = user.activeSessions.find((s) => s.deviceId === deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "디바이스를 찾을 수 없습니다.",
      });
    }

    // 디바이스가 이미 차단되었는지 확인
    if (user.securitySettings.blockedDevices?.includes(deviceId)) {
      return res.status(400).json({
        success: false,
        message: "이미 차단된 디바이스입니다.",
      });
    }

    // 차단된 디바이스 목록에 추가
    if (!user.securitySettings.blockedDevices) {
      user.securitySettings.blockedDevices = [];
    }
    user.securitySettings.blockedDevices.push(deviceId);

    // 신뢰할 수 있는 디바이스 목록에서 제거
    const trustedIndex = user.securitySettings.trustedDevices.indexOf(deviceId);
    if (trustedIndex !== -1) {
      user.securitySettings.trustedDevices.splice(trustedIndex, 1);
    }

    // 활성 세션 종료
    await user.endSession(deviceId);
    await user.save();

    // 이메일 알림 발송
    await emailService.sendSecuritySettingsAlert(user, {
      blockedDevice: `${device.browser} on ${device.os}`,
    });

    res.json({
      success: true,
      message: "디바이스가 차단되었습니다.",
    });
  } catch (error) {
    logger.error("디바이스 차단 실패:", error);
    res.status(500).json({
      success: false,
      message: "디바이스 차단 중 오류가 발생했습니다.",
    });
  }
});

// 디바이스 차단 해제
router.delete("/block/:deviceId", isAuthenticated, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const user = await User.findById(req.user._id);

    // 차단된 디바이스 목록에서 찾기
    const deviceIndex = user.securitySettings.blockedDevices?.indexOf(deviceId);
    if (deviceIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "차단된 디바이스 목록에서 찾을 수 없습니다.",
      });
    }

    // 디바이스 정보 찾기
    const device = user.activeSessions.find((s) => s.deviceId === deviceId);

    // 차단 해제
    user.securitySettings.blockedDevices.splice(deviceIndex, 1);
    await user.save();

    // 이메일 알림 발송
    if (device) {
      await emailService.sendSecuritySettingsAlert(user, {
        unblockedDevice: `${device.browser} on ${device.os}`,
      });
    }

    res.json({
      success: true,
      message: "디바이스 차단이 해제되었습니다.",
    });
  } catch (error) {
    logger.error("디바이스 차단 해제 실패:", error);
    res.status(500).json({
      success: false,
      message: "디바이스 차단 해제 중 오류가 발생했습니다.",
    });
  }
});

module.exports = router;
