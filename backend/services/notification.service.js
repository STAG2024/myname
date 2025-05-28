const nodemailer = require("nodemailer");
const { WebhookClient } = require("@slack/webhook");
const NotificationSettings = require("../models/notification-settings.model");
const logger = require("../config/logger");

class NotificationService {
  constructor(io) {
    this.io = io;
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // 알림 전송
  async sendNotification(notification) {
    try {
      const {
        userId,
        type,
        severity,
        title,
        message,
        metadata = {},
      } = notification;

      // 사용자의 알림 설정 조회
      const settings = await NotificationSettings.findOne({ userId });
      if (!settings) return;

      // 알림 전송 조건 확인
      if (!this.shouldSendNotification(settings, type, severity)) {
        return;
      }

      // 브라우저 알림
      if (settings.browser.enabled) {
        this.sendBrowserNotification(userId, notification);
      }

      // 이메일 알림
      if (settings.email.enabled && settings.email.address) {
        await this.sendEmailNotification(settings.email.address, notification);
      }

      // Slack 알림
      if (settings.slack.enabled && settings.slack.webhookUrl) {
        await this.sendSlackNotification(
          settings.slack.webhookUrl,
          notification
        );
      }

      // 알림 로깅
      logger.info(`알림 전송 완료: ${title} (${type}) to userId: ${userId}`);
    } catch (error) {
      logger.error("알림 전송 실패:", error);
    }
  }

  // 알림 전송 조건 확인
  shouldSendNotification(settings, type, severity) {
    // 조용한 시간 체크
    if (settings.quietHours.enabled) {
      const now = new Date();
      const [startHour, startMinute] = settings.quietHours.start.split(":");
      const [endHour, endMinute] = settings.quietHours.end.split(":");
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      const isQuietTime =
        (currentHour > parseInt(startHour) ||
          (currentHour === parseInt(startHour) &&
            currentMinute >= parseInt(startMinute))) &&
        (currentHour < parseInt(endHour) ||
          (currentHour === parseInt(endHour) &&
            currentMinute <= parseInt(endMinute)));

      if (isQuietTime && severity !== "critical") {
        return false;
      }
    }

    // 이벤트 타입 체크
    if (!settings.eventTypes[type]) {
      return false;
    }

    // 심각도 레벨 체크
    if (!settings.severityLevels[severity]) {
      return false;
    }

    return true;
  }

  // 브라우저 알림
  sendBrowserNotification(userId, notification) {
    this.io.to(userId.toString()).emit("security-notification", {
      title: notification.title,
      message: notification.message,
      severity: notification.severity,
      timestamp: new Date(),
      metadata: notification.metadata,
    });
  }

  // 이메일 알림
  async sendEmailNotification(email, notification) {
    try {
      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: `[보안 알림] ${notification.title}`,
        html: this.generateEmailTemplate(notification),
      });
    } catch (error) {
      logger.error("이메일 알림 전송 실패:", error);
    }
  }

  // Slack 알림
  async sendSlackNotification(webhookUrl, notification) {
    try {
      const webhook = new WebhookClient({ url: webhookUrl });
      await webhook.send({
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🚨 보안 알림",
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*제목:*\n${notification.title}`,
              },
              {
                type: "mrkdwn",
                text: `*심각도:*\n${notification.severity}`,
              },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*상세 내용:*\n${notification.message}`,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `발생 시간: ${new Date().toLocaleString()}`,
              },
            ],
          },
        ],
      });
    } catch (error) {
      logger.error("Slack 알림 전송 실패:", error);
    }
  }

  // 이메일 템플릿 생성
  generateEmailTemplate(notification) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d32f2f;">[보안 알림] ${notification.title}</h2>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px;">
          <p><strong>심각도:</strong> ${notification.severity}</p>
          <p><strong>발생 시간:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>상세 내용:</strong></p>
          <p>${notification.message}</p>
        </div>
        <div style="margin-top: 20px; font-size: 12px; color: #666;">
          이 알림은 자동으로 생성되었습니다. 문의사항이 있으시면 관리자에게 연락해주세요.
        </div>
      </div>
    `;
  }
}

module.exports = NotificationService;
