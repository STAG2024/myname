const nodemailer = require("nodemailer");
const config = require("../config/config");
const logger = require("../config/logger");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });
  }

  async sendLoginAlert(user, loginInfo) {
    const { ip, browser, os, location, timestamp } = loginInfo;

    const html = `
      <h2>새로운 로그인 알림</h2>
      <p>안녕하세요 ${user.name}님,</p>
      <p>귀하의 계정에 새로운 로그인이 감지되었습니다.</p>
      <hr>
      <h3>로그인 정보:</h3>
      <ul>
        <li>시간: ${new Date(timestamp).toLocaleString("ko-KR")}</li>
        <li>IP 주소: ${ip}</li>
        <li>브라우저: ${browser}</li>
        <li>운영체제: ${os}</li>
        <li>위치: ${location || "알 수 없음"}</li>
      </ul>
      <p>본인이 아닌 경우 즉시 비밀번호를 변경하고 보안 설정을 확인해주세요.</p>
    `;

    try {
      await this.transporter.sendMail({
        from: `"${config.app.name}" <${config.email.user}>`,
        to: user.email,
        subject: "[보안 알림] 새로운 로그인이 감지되었습니다",
        html,
      });
      logger.info(`로그인 알림 이메일 발송 성공: ${user.email}`);
    } catch (error) {
      logger.error("로그인 알림 이메일 발송 실패:", error);
      throw error;
    }
  }

  async sendSecuritySettingsAlert(user, changes) {
    const html = `
      <h2>보안 설정 변경 알림</h2>
      <p>안녕하세요 ${user.name}님,</p>
      <p>귀하의 계정에서 다음과 같은 보안 설정 변경이 있었습니다:</p>
      <ul>
        ${Object.entries(changes)
          .map(
            ([key, value]) => `
          <li>${this.translateSettingName(key)}: ${this.formatSettingValue(
              value
            )}</li>
        `
          )
          .join("")}
      </ul>
      <p>본인이 변경하지 않은 경우 즉시 고객센터로 문의해주세요.</p>
    `;

    try {
      await this.transporter.sendMail({
        from: `"${config.app.name}" <${config.email.user}>`,
        to: user.email,
        subject: "[보안 알림] 보안 설정이 변경되었습니다",
        html,
      });
      logger.info(`보안 설정 변경 알림 이메일 발송 성공: ${user.email}`);
    } catch (error) {
      logger.error("보안 설정 변경 알림 이메일 발송 실패:", error);
      throw error;
    }
  }

  async sendPasswordChangeAlert(user) {
    const html = `
      <h2>비밀번호 변경 알림</h2>
      <p>안녕하세요 ${user.name}님,</p>
      <p>귀하의 계정 비밀번호가 변경되었습니다.</p>
      <p>본인이 변경하지 않은 경우 즉시 고객센터로 문의해주세요.</p>
    `;

    try {
      await this.transporter.sendMail({
        from: `"${config.app.name}" <${config.email.user}>`,
        to: user.email,
        subject: "[보안 알림] 비밀번호가 변경되었습니다",
        html,
      });
      logger.info(`비밀번호 변경 알림 이메일 발송 성공: ${user.email}`);
    } catch (error) {
      logger.error("비밀번호 변경 알림 이메일 발송 실패:", error);
      throw error;
    }
  }

  translateSettingName(key) {
    const translations = {
      twoFactorEnabled: "2단계 인증",
      loginNotifications: "로그인 알림",
      allowedIPs: "허용된 IP 주소",
    };
    return translations[key] || key;
  }

  formatSettingValue(value) {
    if (typeof value === "boolean") {
      return value ? "활성화" : "비활성화";
    }
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    return value;
  }
}

module.exports = new EmailService();
