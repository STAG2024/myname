const jwt = require("jsonwebtoken");
const config = require("../config/config");
const User = require("../models/User");
const logger = require("../config/logger");
const emailService = require("../services/email.service");
const useragent = require("express-useragent");
const geoip = require("geoip-lite");

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, securityStamp: user.securityStamp },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

const isAuthenticated = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "인증이 필요합니다.",
      });
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findById(decoded.id);

    if (!user || user.securityStamp !== decoded.securityStamp) {
      return res.status(401).json({
        success: false,
        message: "세션이 만료되었습니다. 다시 로그인해주세요.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error("인증 실패:", error);
    res.status(401).json({
      success: false,
      message: "인증에 실패했습니다.",
    });
  }
};

const handleLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    // 로그인 시도 정보 수집
    const userAgent = useragent.parse(req.headers["user-agent"]);
    const ip = req.ip || req.connection.remoteAddress;
    const geo = geoip.lookup(ip);

    const loginInfo = {
      ip,
      browser: userAgent.browser,
      os: userAgent.os,
      location: geo ? `${geo.city}, ${geo.country}` : undefined,
      timestamp: new Date(),
    };

    if (!user || !(await user.comparePassword(password))) {
      // 실패한 로그인 시도 기록
      if (user) {
        await user.handleLoginAttempt(false, loginInfo);
      }
      return res.status(401).json({
        success: false,
        message: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    if (user.isLocked()) {
      return res.status(403).json({
        success: false,
        message: "계정이 잠겼습니다. 잠시 후 다시 시도해주세요.",
      });
    }

    // 성공한 로그인 처리
    await user.handleLoginAttempt(true, loginInfo);

    // 세션 추가
    await user.addSession({
      deviceId: req.headers["x-device-id"],
      deviceType: userAgent.device,
      browser: userAgent.browser,
      os: userAgent.os,
      ip,
    });

    // 로그인 알림 이메일 발송 (설정이 활성화된 경우)
    if (user.securitySettings.loginNotifications) {
      await emailService.sendLoginAlert(user, loginInfo);
    }

    const token = generateToken(user);
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    logger.error("로그인 처리 실패:", error);
    next(error);
  }
};

module.exports = {
  isAuthenticated,
  handleLogin,
  generateToken,
};
