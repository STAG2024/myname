const formData = require("form-data");
const Mailgun = require("mailgun.js");
const mailgun = new Mailgun(formData);

const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY,
});

const domain = process.env.MAILGUN_DOMAIN;

exports.sendMail = async ({ from, to, subject, text }) => {
  try {
    const result = await mg.messages.create(domain, {
      from: `${from} <noreply@${domain}>`,
      to: [to],
      subject,
      text,
    });

    return result;
  } catch (error) {
    console.error("메일 발송 실패:", error);
    throw new Error("메일 발송에 실패했습니다.");
  }
};
