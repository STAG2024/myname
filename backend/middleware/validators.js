// 경로: /backend/middleware/validators.js

const { body, param, validationResult } = require("express-validator");

// 공통 에러 처리
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "입력값이 유효하지 않습니다.",
      errors: errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

// 회원가입 유효성 검사
const validateSignup = [
  body("email")
    .trim()
    .notEmpty().withMessage("이메일은 필수 입력항목입니다.")
    .matches(emailRegex).withMessage("올바른 이메일 형식이 아닙니다.")
    .isLength({ max: 50 }).withMessage("이메일은 50자를 초과할 수 없습니다."),
  body("password")
    .trim()
    .notEmpty().withMessage("비밀번호는 필수 입력항목입니다.")
    .isLength({ min: 6 }).withMessage("비밀번호는 최소 6자 이상이어야 합니다.")
    .isLength({ max: 100 }).withMessage("비밀번호는 100자를 초과할 수 없습니다.")
    .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/)
    .withMessage("비밀번호는 영문자와 숫자를 포함해야 합니다."),
  validate,
];

// 로그인 유효성 검사
const validateLogin = [
  body("email")
    .trim()
    .notEmpty().withMessage("이메일은 필수 입력항목입니다.")
    .matches(emailRegex).withMessage("올바른 이메일 형식이 아닙니다."),
  body("password")
    .trim()
    .notEmpty().withMessage("비밀번호는 필수 입력항목입니다."),
  validate,
];

// 메일 발송 유효성 검사
const validateSendMail = [
  body("to")
    .trim()
    .notEmpty().withMessage("받는 사람은 필수 입력항목입니다.")
    .matches(emailRegex).withMessage("올바른 이메일 형식이 아닙니다.")
    .isLength({ max: 50 }).withMessage("받는 사람 이메일은 50자를 초과할 수 없습니다."),
  body("subject")
    .trim()
    .notEmpty().withMessage("제목은 필수 입력항목입니다.")
    .isLength({ max: 200 }).withMessage("제목은 200자를 초과할 수 없습니다.")
    .matches(/^[^<>]*$/).withMessage("제목에 HTML 태그를 포함할 수 없습니다."),
  body("body")
    .trim()
    .notEmpty().withMessage("내용은 필수 입력항목입니다.")
    .isLength({ max: 50000 }).withMessage("내용은 50000자를 초과할 수 없습니다."),
  validate,
];

// 메일 ID 검증
const validateMailId = [
  param("id")
    .trim()
    .notEmpty().withMessage("메일 ID가 필요합니다.")
    .isMongoId().withMessage("올바른 메일 ID 형식이 아닙니다."),
  validate,
];

module.exports = {
  validateSignup,
  validateLogin,
  validateSendMail,
  validateMailId,
};