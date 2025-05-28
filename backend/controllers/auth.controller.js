// 경로: /backend/controllers/auth.controller.js
const User = require("../models/User");

// 회원가입
exports.signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 이메일 주소 파싱
    const [username, domain] = email.split("@");

    if (!username || !domain) {
      return res.status(400).json({
        message: "올바른 이메일 형식이 아닙니다.",
      });
    }

    // 이메일 중복 체크
    const existingUser = await User.findOne({ username, domain });
    if (existingUser) {
      return res.status(400).json({
        message: "이미 존재하는 이메일 주소입니다.",
      });
    }

    // 새 사용자 생성
    const user = new User({
      username,
      domain,
      password,
    });
    await user.save();

    res.status(201).json({
      message: "회원가입이 완료되었습니다.",
      email: user.email, // virtual field 사용
    });
  } catch (error) {
    console.error("회원가입 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

// 로그인
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 이메일 주소 파싱
    const [username, domain] = email.split("@");

    if (!username || !domain) {
      return res.status(400).json({
        message: "올바른 이메일 형식이 아닙니다.",
      });
    }

    // 사용자 찾기
    const user = await User.findOne({ username, domain });
    if (!user) {
      return res.status(401).json({
        message: "이메일 또는 비밀번호가 잘못되었습니다.",
      });
    }

    // 비밀번호 확인
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({
        message: "이메일 또는 비밀번호가 잘못되었습니다.",
      });
    }

    const token = user.generateAuthToken();
    res.json({
      token,
      email: user.email, // virtual field 사용
    });
  } catch (error) {
    console.error("로그인 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};
