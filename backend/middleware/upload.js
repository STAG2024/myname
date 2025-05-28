const multer = require("multer");
const { FileType } = require("file-type");
const fs = require("fs").promises;
const path = require("path");
const logger = require("../config/logger");
const uploadConfig = require("../config/upload");

// multer 스토리지 설정
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const dest = uploadConfig.getDestination(req, file, cb);
      await fs.mkdir(dest, { recursive: true });
      cb(null, dest);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const safeFileName = uploadConfig.generateSafeFileName(file.originalname);
    cb(null, safeFileName);
  },
});

// 파일 필터
const fileFilter = (req, file, cb) => {
  // MIME 타입 검사
  if (!uploadConfig.allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error("허용되지 않는 파일 형식입니다."), false);
  }
  cb(null, true);
};

// Multer 설정
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: uploadConfig.maxFileSize,
    files: uploadConfig.maxFiles,
  },
});

// 파일 타입 검증 미들웨어
const validateFileType = async (req, res, next) => {
  if (!req.files?.length) return next();

  try {
    for (const file of req.files) {
      const filePath = file.path;
      const fileTypeResult = await FileType.fromFile(filePath);

      // 파일 타입이 감지되지 않거나 허용되지 않는 경우
      if (
        !fileTypeResult ||
        !uploadConfig.allowedMimeTypes.includes(fileTypeResult.mime)
      ) {
        // 파일 삭제
        await fs.unlink(filePath);
        logger.warn(`유효하지 않은 파일 타입 감지: ${file.originalname}`);
        return res.status(400).json({
          message: "유효하지 않은 파일 형식입니다.",
          error: `${file.originalname} 파일이 허용되지 않는 형식입니다.`,
        });
      }

      // 선언된 MIME 타입과 실제 파일 타입이 다른 경우
      if (file.mimetype !== fileTypeResult.mime) {
        await fs.unlink(filePath);
        logger.warn(`MIME 타입 불일치 감지: ${file.originalname}`);
        return res.status(400).json({
          message: "유효하지 않은 파일입니다.",
          error: `${file.originalname} 파일의 MIME 타입이 일치하지 않습니다.`,
        });
      }
    }
    next();
  } catch (error) {
    logger.error("파일 검증 중 오류 발생:", error);
    next(error);
  }
};

// 파일 업로드 에러 처리 미들웨어
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "파일 크기 제한 초과",
        error: `파일 크기는 ${
          uploadConfig.maxFileSize / (1024 * 1024)
        }MB를 초과할 수 없습니다.`,
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        message: "파일 개수 제한 초과",
        error: `한 번에 최대 ${uploadConfig.maxFiles}개의 파일만 업로드할 수 있습니다.`,
      });
    }
  }

  logger.error("파일 업로드 중 오류 발생:", err);
  res.status(500).json({
    message: "파일 업로드 중 오류가 발생했습니다.",
    error: err.message,
  });
};

// 파일 삭제 유틸리티 함수
const deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    logger.info(`파일 삭제 성공: ${filePath}`);
  } catch (error) {
    logger.error(`파일 삭제 실패: ${filePath}`, error);
  }
};

module.exports = {
  upload,
  validateFileType,
  handleUploadError,
  deleteFile,
};
