const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { validateSignup, validateLogin } = require("../middleware/validators");
const User = require("../models/User");
const emailService = require("../utils/email.util");
const { isAuthenticated } = require("../middleware/auth");
const logger = require("../config/logger");

// 회원가입
router.post("/signup", validateSignup, authController.signup);

// 로그인
router.post("/login", validateLogin, authController.login);

// 회원가입
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // 이메일 중복 체크
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "이미 등록된 이메일 주소입니다.",
      });
    }

    // 새 사용자 생성
    const user = new User({
      email,
      password,
      name,
    });

    // 이메일 인증 토큰 생성
    const verificationToken = user.generateEmailVerificationToken();

    await user.save();

    // 인증 이메일 발송
    await emailService.sendVerificationEmail(email, verificationToken);

    res.status(201).json({
      success: true,
      message: "회원가입이 완료되었습니다. 이메일을 확인해 주세요.",
    });
  } catch (error) {
    logger.error("회원가입 실패:", error);
    res.status(500).json({
      success: false,
      message: "회원가입 처리 중 오류가 발생했습니다.",
    });
  }
});

// 이메일 인증
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "유효하지 않거나 만료된 인증 토큰입니다.",
      });
    }

    user.isEmailVerified = true;
    user.status = "active";
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    res.json({
      success: true,
      message: "이메일 인증이 완료되었습니다.",
    });
  } catch (error) {
    logger.error("이메일 인증 실패:", error);
    res.status(500).json({
      success: false,
      message: "이메일 인증 처리 중 오류가 발생했습니다.",
    });
  }
});

// 비밀번호 재설정 요청
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "등록되지 않은 이메일 주소입니다.",
      });
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save();

    await emailService.sendPasswordResetEmail(email, resetToken);

    res.json({
      success: true,
      message: "비밀번호 재설정 이메일을 발송했습니다.",
    });
  } catch (error) {
    logger.error("비밀번호 재설정 요청 실패:", error);
    res.status(500).json({
      success: false,
      message: "비밀번호 재설정 요청 처리 중 오류가 발생했습니다.",
    });
  }
});

// 비밀번호 재설정
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "유효하지 않거나 만료된 토큰입니다.",
      });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    res.json({
      success: true,
      message: "비밀번호가 성공적으로 변경되었습니다.",
    });
  } catch (error) {
    logger.error("비밀번호 재설정 실패:", error);
    res.status(500).json({
      success: false,
      message: "비밀번호 재설정 중 오류가 발생했습니다.",
    });
  }
});

// 비밀번호 변경
router.post("/change-password", isAuthenticated, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "현재 비밀번호가 일치하지 않습니다.",
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "비밀번호가 성공적으로 변경되었습니다.",
    });
  } catch (error) {
    logger.error("비밀번호 변경 실패:", error);
    res.status(500).json({
      success: false,
      message: "비밀번호 변경 중 오류가 발생했습니다.",
    });
  }
});

module.exports = router;
