const crypto = require("crypto");
const CryptoJS = require("crypto-js");
const argon2 = require("argon2");
const logger = require("../config/logger");

// 암호화 설정
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");
const IV_LENGTH = 16;

class CryptoUtil {
  // Argon2를 사용한 비밀번호 해싱
  static async hashPassword(password) {
    try {
      return await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 2 ** 16, // 64MB
        timeCost: 3, // 3 iterations
        parallelism: 2,
        saltLength: 32,
      });
    } catch (error) {
      logger.error("비밀번호 해싱 중 오류:", error);
      throw new Error("비밀번호 해싱 실패");
    }
  }

  // 비밀번호 검증
  static async verifyPassword(hashedPassword, password) {
    try {
      return await argon2.verify(hashedPassword, password);
    } catch (error) {
      logger.error("비밀번호 검증 중 오류:", error);
      throw new Error("비밀번호 검증 실패");
    }
  }

  // AES-256-GCM을 사용한 데이터 암호화
  static encryptData(data) {
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const key = Buffer.from(ENCRYPTION_KEY, "hex");

      const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

      let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
      encrypted += cipher.final("hex");

      const authTag = cipher.getAuthTag();

      return {
        iv: iv.toString("hex"),
        encryptedData: encrypted,
        authTag: authTag.toString("hex"),
      };
    } catch (error) {
      logger.error("데이터 암호화 중 오류:", error);
      throw new Error("데이터 암호화 실패");
    }
  }

  // AES-256-GCM을 사용한 데이터 복호화
  static decryptData(encryptedData) {
    try {
      const key = Buffer.from(ENCRYPTION_KEY, "hex");
      const iv = Buffer.from(encryptedData.iv, "hex");
      const authTag = Buffer.from(encryptedData.authTag, "hex");

      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(
        encryptedData.encryptedData,
        "hex",
        "utf8"
      );
      decrypted += decipher.final("utf8");

      return JSON.parse(decrypted);
    } catch (error) {
      logger.error("데이터 복호화 중 오류:", error);
      throw new Error("데이터 복호화 실패");
    }
  }

  // 민감한 필드 암호화 (이메일 등)
  static encryptField(text) {
    try {
      return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
    } catch (error) {
      logger.error("필드 암호화 중 오류:", error);
      throw new Error("필드 암호화 실패");
    }
  }

  // 민감한 필드 복호화
  static decryptField(encryptedText) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      logger.error("필드 복호화 중 오류:", error);
      throw new Error("필드 복호화 실패");
    }
  }

  // 안전한 난수 생성
  static generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString("hex");
  }

  // HMAC 기반 데이터 무결성 검증
  static generateHMAC(data) {
    return crypto
      .createHmac("sha256", ENCRYPTION_KEY)
      .update(JSON.stringify(data))
      .digest("hex");
  }

  // 데이터 무결성 검증
  static verifyHMAC(data, hmac) {
    const calculatedHMAC = this.generateHMAC(data);
    return crypto.timingSafeEqual(
      Buffer.from(calculatedHMAC),
      Buffer.from(hmac)
    );
  }
}

module.exports = CryptoUtil;
