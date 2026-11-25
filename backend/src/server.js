import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';

// Config & Infrastructure
import { connectDB, disconnectDB } from './config/db.js';
import { initSocket } from './config/socket.js';
import { isAdmin } from './middleware/authMiddleware.js';

// Route Imports
import webhookRouter from './routes/webhookRoutes.js';
import userRouter from './routes/userRoutes.js';
import vendorRouter from './routes/vendorRoutes.js';
import productRouter from './routes/productRoutes.js';
import orderRouter from './routes/orderRoutes.js';
import championRouter from './routes/championRoutes.js';
import cartRouter from './routes/cartRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import landMarkRouter from './routes/landMarkRoutes.js';
import notificationRouter from './routes/notificationRoutes.js';
import supportRouter from './routes/supportRoutes.js';
import couponRouter from './routes/couponRoutes.js';
import bankRouter from './routes/bankRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const allowedOrigins = [
  'http://localhost:5173',
  // add deployed web URL or tunnel URL when needed
];

// Initialize Socket.io
initSocket(server);

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Webhook Route (rawBody parser required for Svix signature verification)
app.use(
  '/api/webhooks',
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
  webhookRouter
);

// Global Middleware
app.use(express.json());
app.use(clerkMiddleware());

// API Routes
app.use('/api/admin', isAdmin, adminRouter);
app.use('/api/user', userRouter);
app.use('/api/landmark', landMarkRouter);
app.use('/api/vendor', vendorRouter);
app.use('/api/champion', championRouter);
app.use('/api/product', productRouter);
app.use('/api/order', orderRouter);
app.use('/api/cart', cartRouter);
app.use('/api/notification', notificationRouter);
app.use('/api/support', supportRouter);
app.use('/api/coupon', couponRouter);
app.use('/api/banks', bankRouter);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// Database Connection & Server Listen
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server up and running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Database connection failed on startup:', err);
    process.exit(1);
  });

// Graceful Shutdown Handler
const gracefulShutdown = async (signal) => {
  console.log(`\n⚠️ ${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await disconnectDB();
    console.log('🛑 Server and Database connections closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Process Exception Catchers
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  server.close(async () => {
    await disconnectDB();
    process.exit(1);
  });
});

process.on('uncaughtException', async (err) => {
  console.error('❌ Uncaught Exception:', err);
  await disconnectDB();
  process.exit(1);
});