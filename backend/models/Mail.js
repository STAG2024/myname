// 경로: /backend/models/Mail.js
const mongoose = require("mongoose");

const mailSchema = new mongoose.Schema(
  {
    from: {
      username: { type: String, required: true },
      domain: { type: String, required: true },
    },
    to: {
      username: { type: String, required: true },
      domain: { type: String, required: true },
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Mail = mongoose.model("Mail", mailSchema);
module.exports = Mail;
