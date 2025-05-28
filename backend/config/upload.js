const path = require("path");
const crypto = require("crypto");

// 파일 업로드 설정
const uploadConfig = {
  // 허용되는 파일 타입
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ],

  // 파일 크기 제한 (10MB)
  maxFileSize: 10 * 1024 * 1024,

  // 파일 저장 경로
  uploadPath: path.join(__dirname, "../uploads"),

  // 허용되는 최대 파일 수
  maxFiles: 5,

  // 안전한 파일 이름 생성
  generateSafeFileName: (originalname) => {
    const fileExt = path.extname(originalname);
    const randomName = crypto.randomBytes(16).toString("hex");
    return `${randomName}${fileExt}`;
  },

  // 파일 저장 경로 생성
  getDestination: function (req, file, cb) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    const uploadDir = path.join(this.uploadPath, String(year), month, day);
    cb(null, uploadDir);
  },
};

module.exports = uploadConfig;
