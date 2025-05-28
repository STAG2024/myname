const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      "CREATE",
      "READ",
      "UPDATE",
      "DELETE",
      "LOGIN",
      "LOGOUT",
      "PASSWORD_CHANGE",
      "EMAIL_CHANGE",
      "PROFILE_UPDATE",
      "PERMISSION_CHANGE",
      "SETTINGS_CHANGE",
      "DATA_EXPORT",
      "API_ACCESS",
    ],
  },
  category: {
    type: String,
    required: true,
    enum: ["USER", "ADMIN", "SYSTEM", "SECURITY", "DATA"],
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "targetModel",
  },
  targetModel: {
    type: String,
    required: function () {
      return this.targetId != null;
    },
  },
  details: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    reason: String,
    additionalInfo: mongoose.Schema.Types.Mixed,
  },
  metadata: {
    ip: String,
    userAgent: String,
    path: String,
    method: String,
    status: Number,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

// 인덱스 생성
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ category: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ targetId: 1, timestamp: -1 });
auditLogSchema.index({ "metadata.ip": 1, timestamp: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;
