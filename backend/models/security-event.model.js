const mongoose = require("mongoose");

const securityEventSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      "LOGIN_SUCCESS",
      "LOGIN_FAILURE",
      "ACCOUNT_LOCKED",
      "PASSWORD_CHANGED",
      "SUSPICIOUS_ACTIVITY",
      "RATE_LIMIT_EXCEEDED",
      "INVALID_TOKEN",
      "XSS_ATTEMPT",
      "INJECTION_ATTEMPT",
      "FILE_UPLOAD_VIOLATION",
    ],
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  severity: {
    type: String,
    required: true,
    enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
  },
  description: {
    type: String,
    required: true,
  },
  metadata: {
    ip: String,
    userAgent: String,
    location: {
      country: String,
      city: String,
      timezone: String,
    },
    browser: {
      name: String,
      version: String,
    },
    os: {
      name: String,
      version: String,
    },
    device: {
      type: String,
      vendor: String,
      model: String,
    },
  },
  request: {
    method: String,
    path: String,
    headers: Object,
    body: Object,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// 인덱스 생성
securityEventSchema.index({ type: 1, timestamp: -1 });
securityEventSchema.index({ userId: 1, timestamp: -1 });
securityEventSchema.index({ severity: 1, timestamp: -1 });
securityEventSchema.index({ "metadata.ip": 1, timestamp: -1 });

const SecurityEvent = mongoose.model("SecurityEvent", securityEventSchema);

module.exports = SecurityEvent;
