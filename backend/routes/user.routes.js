const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { isAuthenticated } = require("../middleware/auth");
const User = require("../models/User");
const logger = require("../config/logger");

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/profiles";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("이미지 파일만 업로드 가능합니다. (jpeg, jpg, png)"));
  },
});

// 프로필 조회
router.get("/profile", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user);
  } catch (error) {
    logger.error("프로필 조회 실패:", error);
    res.status(500).json({
      success: false,
      message: "프로필 조회 중 오류가 발생했습니다.",
    });
  }
});

// 프로필 업데이트
router.put(
  "/profile",
  isAuthenticated,
  upload.single("profileImage"),
  async (req, res) => {
    try {
      const { name, phone, bio } = req.body;
      const updateData = { name, phone, bio };

      // 프로필 이미지가 업로드된 경우
      if (req.file) {
        // 기존 이미지 삭제
        const user = await User.findById(req.user._id);
        if (user.profileImage) {
          const oldImagePath = path.join(__dirname, "..", user.profileImage);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        updateData.profileImage = req.file.path;
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        updateData,
        { new: true }
      );

      res.json({
        success: true,
        message: "프로필이 성공적으로 업데이트되었습니다.",
        user: updatedUser,
      });
    } catch (error) {
      logger.error("프로필 업데이트 실패:", error);
      res.status(500).json({
        success: false,
        message: "프로필 업데이트 중 오류가 발생했습니다.",
      });
    }
  }
);

// 프로필 이미지 삭제
router.delete("/profile/image", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.profileImage) {
      const imagePath = path.join(__dirname, "..", user.profileImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      user.profileImage = undefined;
      await user.save();
    }

    res.json({
      success: true,
      message: "프로필 이미지가 삭제되었습니다.",
      user,
    });
  } catch (error) {
    logger.error("프로필 이미지 삭제 실패:", error);
    res.status(500).json({
      success: false,
      message: "프로필 이미지 삭제 중 오류가 발생했습니다.",
    });
  }
});

module.exports = router;
