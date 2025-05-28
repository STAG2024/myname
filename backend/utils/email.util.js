const nodemailer = require("nodemailer");
const logger = require("../config/logger");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail(to, subject, html) {
    try {
      const result = await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject,
        html,
      });
      logger.info(`이메일 발송 성공: ${to}`);
      return result;
    } catch (error) {
      logger.error("이메일 발송 실패:", error);
      throw error;
    }
  }

  async sendVerificationEmail(to, token) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>이메일 주소 인증</h2>
        <p>안녕하세요! 회원가입해 주셔서 감사합니다.</p>
        <p>아래 버튼을 클릭하여 이메일 주소를 인증해 주세요:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #4CAF50; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            이메일 인증하기
          </a>
        </div>
        <p>이 링크는 24시간 동안 유효합니다.</p>
        <p>본인이 요청하지 않은 경우 이 이메일을 무시하셔도 됩니다.</p>
      </div>
    `;

    return this.sendEmail(to, "이메일 주소 인증", html);
  }

  async sendPasswordResetEmail(to, token) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>비밀번호 재설정</h2>
        <p>비밀번호 재설정을 요청하셨습니다.</p>
        <p>아래 버튼을 클릭하여 새로운 비밀번호를 설정해 주세요:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #2196F3; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            비밀번호 재설정
          </a>
        </div>
        <p>이 링크는 1시간 동안 유효합니다.</p>
        <p>본인이 요청하지 않은 경우 이 이메일을 무시하시고 비밀번호를 변경해 주세요.</p>
      </div>
    `;

    return this.sendEmail(to, "비밀번호 재설정", html);
  }
}

module.exports = new EmailService();
