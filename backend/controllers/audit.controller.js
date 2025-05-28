// 경로: backend/controllers/audit.controller.js

const AuditLogger = require('../utils/audit-logger');

exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLogger.search(req.query);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: '감사 로그 불러오기 실패', error: err.message });
  }
};