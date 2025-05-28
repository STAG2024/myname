// 경로: /backend/routes/mail.routes.js

const express = require("express");
const router = express.Router();
const mailController = require("../controllers/mail.controller");
const { validateSendMail, validateMailId } = require("../middleware/validators");

// 받은 편지함 조회
router.get("/", mailController.getInbox);

// 개별 메일 조회
router.get("/:id", validateMailId, mailController.getMail);

// 메일 전송
router.post("/", validateSendMail, mailController.sendMail);

// 메일 삭제
router.delete("/:id", validateMailId, mailController.deleteMail);

module.exports = router;