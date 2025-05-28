const mongoose = require("mongoose");

const notificationSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  email: {
    enabled: { type: Boolean, default: true },
    address: String,
  },
  slack: {
    enabled: { type: Boolean, default: false },
    webhookUrl: String,
    channel: String,
  },
  browser: {
    enabled: { type: Boolean, default: true },
  },
  eventTypes: {
    securityEvents: { type: Boolean, default: true },
    loginAttempts: { type: Boolean, default: true },
    systemAlerts: { type: Boolean, default: true },
    auditLogs: { type: Boolean, default: false },
  },
  severityLevels: {
    low: { type: Boolean, default: false },
    medium: { type: Boolean, default: true },
    high: { type: Boolean, default: true },
    critical: { type: Boolean, default: true },
  },
  quietHours: {
    enabled: { type: Boolean, default: false },
    start: { type: String, default: "22:00" },
    end: { type: String, default: "06:00" },
    timezone: { type: String, default: "Asia/Seoul" },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

notificationSettingsSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const NotificationSettings = mongoose.model(
  "NotificationSettings",
  notificationSettingsSchema
);

module.exports = NotificationSettings;
