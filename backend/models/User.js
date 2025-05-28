// 경로: /backend/models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// 로그인 세션 및 기록용 서브 스키마
const sessionSchema = new mongoose.Schema({
  deviceId: String,
  deviceType: String,
  browser: String,
  os: String,
  ip: String,
  lastActive: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
});

const loginHistorySchema = new mongoose.Schema({
  ip: String,
  deviceInfo: String,
  location: String,
  status: { type: String, enum: ["success", "failed"] },
  timestamp: { type: Date, default: Date.now },
});

// 사용자 스키마
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    domain: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 8 },
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    bio: { type: String, maxLength: 500 },
    profileImage: { type: String },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "inactive",
    },
    lastLogin: Date,
    loginAttempts: {
      count: { type: Number, default: 0 },
      lastAttempt: Date,
      lockUntil: Date,
    },
    securityStamp: {
      type: String,
      default: () => crypto.randomBytes(32).toString("hex"),
    },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: String,
    backupCodes: [
      {
        code: String,
        used: { type: Boolean, default: false },
      },
    ],
    activeSessions: [sessionSchema],
    loginHistory: [loginHistorySchema],
    securitySettings: {
      loginNotifications: { type: Boolean, default: true },
      failedLoginAttempts: { type: Number, default: 0 },
      lastFailedLogin: Date,
      lockoutUntil: Date,
      allowedIPs: [String],
      trustedDevices: [String],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.twoFactorSecret;
        delete ret.backupCodes;
        delete ret.emailVerificationToken;
        delete ret.passwordResetToken;
        delete ret.securityStamp;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// virtual: email = username@domain
userSchema.virtual("email").get(function () {
  return `${this.username}@${this.domain}`;
});

// 비밀번호 해싱
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  this.updatedAt = new Date();
  next();
});

// 비밀번호 비교
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// JWT 생성
userSchema.methods.generateAuthToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: "24h",
  });
};

// 로그인 시도 기록
userSchema.methods.handleLoginAttempt = async function (success, ip, deviceInfo) {
  if (success) {
    this.securitySettings.failedLoginAttempts = 0;
    this.securitySettings.lastFailedLogin = undefined;
    this.securitySettings.lockoutUntil = undefined;
    this.loginHistory.push({ ip, deviceInfo, status: "success" });
  } else {
    this.securitySettings.failedLoginAttempts += 1;
    this.securitySettings.lastFailedLogin = new Date();
    if (this.securitySettings.failedLoginAttempts >= 5) {
      this.securitySettings.lockoutUntil = new Date(Date.now() + 30 * 60 * 1000);
    }
    this.loginHistory.push({ ip, deviceInfo, status: "failed" });
  }
  if (this.loginHistory.length > 100) {
    this.loginHistory = this.loginHistory.slice(-100);
  }
  await this.save();
};

userSchema.methods.isLocked = function () {
  return (
    this.securitySettings.lockoutUntil &&
    this.securitySettings.lockoutUntil > Date.now()
  );
};

userSchema.methods.isIPAllowed = function (ip) {
  return (
    !this.securitySettings.allowedIPs?.length ||
    this.securitySettings.allowedIPs.includes(ip)
  );
};

userSchema.methods.isDeviceTrusted = function (deviceId) {
  return this.securitySettings.trustedDevices.includes(deviceId);
};

userSchema.methods.addSession = async function (sessionData) {
  this.activeSessions.push(sessionData);
  await this.save();
};

userSchema.methods.endSession = async function (sessionId) {
  const session = this.activeSessions.id(sessionId);
  if (session) {
    session.isActive = false;
    await this.save();
  }
};

userSchema.methods.setupTwoFactor = async function () {
  const secret = crypto.randomBytes(32).toString("hex");
  this.twoFactorSecret = secret;
  const backupCodes = Array.from({ length: 10 }, () => ({
    code: crypto.randomBytes(4).toString("hex"),
    used: false,
  }));
  this.backupCodes = backupCodes;
  await this.save();
  return { secret, backupCodes: backupCodes.map((bc) => bc.code) };
};

userSchema.methods.generateEmailVerificationToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.emailVerificationToken = token;
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  return token;
};

userSchema.methods.generatePasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = token;
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000;
  return token;
};

const User = mongoose.model("User", userSchema);
module.exports = User;