const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const logger = require("./logger");

let io;

const initializeSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // 인증 미들웨어
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (error) {
      logger.error("Socket 인증 실패:", error);
      next(new Error("Authentication error"));
    }
  });

  // 연결 이벤트 처리
  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id} (User: ${socket.userId})`);

    // 사용자별 room 생성
    socket.join(socket.userId.toString());

    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });

    // 에러 처리
    socket.on("error", (error) => {
      logger.error("Socket error:", error);
    });
  });

  return io;
};

const getIo = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

module.exports = {
  initializeSocket,
  getIo,
};
