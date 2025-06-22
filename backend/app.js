const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit'); // Keep this, as you use it directly
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

// --- Database Connection (Add this - placeholder for now) ---
// You'll need to create this file and connect to PostgreSQL
const connectDB = require('./config/db.js'); // Fixed: Added .js extension
connectDB(); // Call connectDB to establish connection when app starts

// Import routes
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');

// Import middleware
// Ensure these imports match the module.exports of their respective files
const { auth } = require('./middleware/auth'); // Correct for object export from auth.js
const { apiLimiter } = require('./middleware/ratelimiter'); // Use specific limiter from your file
// No direct 'validation' middleware in app.use, but functions imported by routes.

// Import services
const auditLogger = require('./utils/auditLogger'); // Ensure this utility is implemented

const app = express();
const server = http.createServer(app);

// Trust proxy setting for rate limiting (fixes X-Forwarded-For header issues)
app.set('trust proxy', 1);

const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"], // Added common methods
    credentials: true // Important for cookies/sessions if you use them later
  }
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// Rate limiting - Using your custom defined apiLimiter for general API routes
// This replaces the direct `rateLimit` call you had.
app.use('/api/', apiLimiter); // Using the one from your custom ratelimiter.js

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'SASRA Reporting API',
    version: '1.0.0'
  });
});

// API Routes
// Note: authRoutes might use authLimiter internally if you apply it there.
app.use('/api/auth', authRoutes);
app.use('/api/reports', auth, reportRoutes); // This line should now work correctly

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join user to their room for personalized updates
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  // Handle report generation progress
  socket.on('report_progress', (data) => {
    // Emit to a specific user's room
    io.to(`user_${data.userId}`).emit('report_update', data); // Use io.to() for specific rooms
  });

  // Handle real-time notifications
  socket.on('notification', (data) => {
    // Emit to a specific user's room
    io.to(`user_${data.userId}`).emit('new_notification', data); // Use io.to() for specific rooms
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  // Log error for audit
  auditLogger.logError(req, err); // Ensure auditLogger can handle potentially undefined req.user if auth failed before this.

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 SASRA Reporting API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

module.exports = { app, server, io };