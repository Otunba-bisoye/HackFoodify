import { Server } from "socket.io";
import { verifyToken } from "@clerk/express";

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  // 🛡️ AUTHENTICATION MIDDLEWARE
  io.use(async (socket, next) => {
    try {
      // Extract token from socket auth payload or headers
      const rawToken =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization;

      if (!rawToken) {
        return next(new Error("Authentication error: Token missing."));
      }

      // Strip "Bearer " prefix if present
      const token = rawToken.startsWith("Bearer ")
        ? rawToken.slice(7)
        : rawToken;

      // Verify token with Clerk
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      // Attach Clerk user ID to the socket instance for future use
      socket.userId = payload.sub;
      next();
    } catch (err) {
      console.error("❌ Socket Auth Failed:", err.message);
      return next(new Error("Authentication error: Invalid or expired token."));
    }
  });

  io.on("connection", (socket) => {
    console.log(`⚡ Authenticated socket connected: ${socket.id} (User: ${socket.userId})`);

    // 🚪 Join room for a specific order screen
    socket.on("join_order", (orderId) => {
      socket.join(`order_${orderId}`);
    });

    // 🚪 Leave order room when screen unmounts
    socket.on("leave_order", (orderId) => {
      socket.leave(`order_${orderId}`);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io has not been initialized!");
  }
  return io;
};