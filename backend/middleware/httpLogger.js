const morgan = require("morgan");
const logger = require("../config/logger");

// Morgan 포맷 정의
const morganFormat =
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms';

// Morgan 스트림 설정 (Winston logger 사용)
const stream = {
  write: (message) => logger.http(message.trim()),
};

const httpLogger = morgan(morganFormat, { stream });

module.exports = httpLogger;
