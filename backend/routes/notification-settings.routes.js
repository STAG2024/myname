const express = require("express");
const router = express.Router();
const NotificationSettings = require("../models/notification-settings.model");
const { isAuthenticated } = require("../middleware/auth");
const logger = require("../config/logger");

// 알림 설정 조회
router.get("/settings", isAuthenticated, async (req, res) => {
  try {
    let settings = await NotificationSettings.findOne({ userId: req.user._id });

    if (!settings) {
      // 기본 설정으로 생성
      settings = await NotificationSettings.create({
        userId: req.user._id,
        email: { address: req.user.email },
      });
    }

    res.json(settings);
  } catch (error) {
    logger.error("알림 설정 조회 실패:", error);
    res.status(500).json({
      success: false,
      message: "알림 설정을 조회하는 중 오류가 발생했습니다.",
    });
  }
});

// 알림 설정 업데이트
router.put("/settings", isAuthenticated, async (req, res) => {
  try {
    const { email, slack, browser, eventTypes, severityLevels, quietHours } =
      req.body;

    const settings = await NotificationSettings.findOneAndUpdate(
      { userId: req.user._id },
      {
        email,
        slack,
        browser,
        eventTypes,
        severityLevels,
        quietHours,
      },
      { new: true, upsert: true }
    );

    res.json(settings);
  } catch (error) {
    logger.error("알림 설정 업데이트 실패:", error);
    res.status(500).json({
      success: false,
      message: "알림 설정을 업데이트하는 중 오류가 발생했습니다.",
    });
  }
});

// Slack 웹훅 테스트
router.post("/test-slack", isAuthenticated, async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    const { WebhookClient } = require("@slack/webhook");
    const webhook = new WebhookClient({ url: webhookUrl });

    await webhook.send({
      text: "🔔 Slack 알림 테스트입니다. 알림이 정상적으로 설정되었습니다.",
    });

    res.json({
      success: true,
      message: "Slack 알림 테스트가 성공적으로 전송되었습니다.",
    });
  } catch (error) {
    logger.error("Slack 웹훅 테스트 실패:", error);
    res.status(500).json({
      success: false,
      message: "Slack 웹훅 테스트에 실패했습니다. URL을 확인해주세요.",
    });
  }
});

// 이메일 테스트
router.post("/test-email", isAuthenticated, async (req, res) => {
  try {
    const { email } = req.body;
    const nodemailer = require("nodemailer");

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "[테스트] 보안 알림 시스템",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2196f3;">보안 알림 테스트</h2>
          <p>이 이메일은 보안 알림 시스템 테스트입니다.</p>
          <p>알림이 정상적으로 설정되었습니다.</p>
        </div>
      `,
    });

    res.json({
      success: true,
      message: "테스트 이메일이 성공적으로 전송되었습니다.",
    });
  } catch (error) {
    logger.error("이메일 테스트 실패:", error);
    res.status(500).json({
      success: false,
      message: "테스트 이메일 전송에 실패했습니다.",
    });
  }
});

module.exports = router;
