// 경로: /backend/controllers/mail.controller.js
const Mail = require("../models/Mail");
const User = require("../models/User");
const mailer = require("../utils/mailer");

const getInbox = async (req, res) => {
  try {
    const [username, domain] = req.user.email.split("@");
    const mails = await Mail.find({
      "to.username": username,
      "to.domain": domain,
      deleted: false,
    }).sort({ createdAt: -1 });

    const formattedMails = mails.map((mail) => ({
      ...mail.toObject(),
      from: `${mail.from.username}@${mail.from.domain}`,
      to: `${mail.to.username}@${mail.to.domain}`,
      read: mail.read,
    }));

    res.json(formattedMails);
  } catch (error) {
    console.error("받은편지함 조회 오류:", error);
    res.status(500).json({ message: "메일 목록을 불러오는데 실패했습니다." });
  }
};

const getMail = async (req, res) => {
  try {
    const mail = await Mail.findById(req.params.id);
    if (!mail) {
      return res.status(404).json({ message: "메일을 찾을 수 없습니다." });
    }

    const [username, domain] = req.user.email.split("@");
    const isRecipient = mail.to.username === username && mail.to.domain === domain;
    const isSender = mail.from.username === username && mail.from.domain === domain;

    if (!isRecipient && !isSender) {
      return res.status(403).json({ message: "접근 권한이 없습니다." });
    }

    if (isRecipient && !mail.read) {
      mail.read = true;
      await mail.save();
    }

    const formattedMail = {
      ...mail.toObject(),
      from: `${mail.from.username}@${mail.from.domain}`,
      to: `${mail.to.username}@${mail.to.domain}`,
    };

    res.json(formattedMail);
  } catch (error) {
    console.error("메일 상세 조회 오류:", error);
    res.status(500).json({ message: "메일을 불러오는데 실패했습니다." });
  }
};

const sendMail = async (req, res) => {
  try {
    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ message: "받는 사람, 제목, 내용은 필수 입력 항목입니다." });
    }

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ message: "올바른 이메일 형식이 아닙니다." });
    }

    const [toUsername, toDomain] = to.split("@");
    const [fromUsername, fromDomain] = req.user.email.split("@");

    const recipient = await User.findOne({ username: toUsername, domain: toDomain });
    if (!recipient) {
      return res.status(404).json({ message: "존재하지 않는 사용자입니다." });
    }

    if (fromUsername === toUsername && fromDomain === toDomain) {
      return res.status(400).json({ message: "자기 자신에게는 메일을 보낼 수 없습니다." });
    }

    const mail = new Mail({
      from: { username: fromUsername, domain: fromDomain },
      to: { username: toUsername, domain: toDomain },
      subject,
      body,
    });

    await mail.save();

    try {
      await mailer.sendMail({
        from: req.user.email,
        to,
        subject,
        text: body,
      });
    } catch (mailError) {
      console.error("메일 발송 오류:", mailError);
      return res.status(201).json({
        message: "메일이 저장되었으나, 실제 발송에는 실패했습니다.",
        mailSaved: true,
        mailSent: false,
      });
    }

    res.status(201).json({
      message: "메일이 성공적으로 발송되었습니다.",
      mailSaved: true,
      mailSent: true,
    });
  } catch (error) {
    console.error("메일 발송 오류:", error);
    res.status(500).json({ message: "메일 발송에 실패했습니다." });
  }
};

const deleteMail = async (req, res) => {
  try {
    const mail = await Mail.findById(req.params.id);
    if (!mail) {
      return res.status(404).json({ message: "메일을 찾을 수 없습니다." });
    }

    const [username, domain] = req.user.email.split("@");
    const isRecipient = mail.to.username === username && mail.to.domain === domain;
    const isSender = mail.from.username === username && mail.from.domain === domain;

    if (!isRecipient && !isSender) {
      return res.status(403).json({ message: "접근 권한이 없습니다." });
    }

    mail.deleted = true;
    await mail.save();

    res.json({ message: "메일이 삭제되었습니다." });
  } catch (error) {
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

module.exports = {
  getInbox,
  getMail,
  sendMail,
  deleteMail,
};
