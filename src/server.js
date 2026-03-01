require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const connectDB = require('./config/database');
const swaggerSpec = require('./config/swagger');
const logger = require('./config/logger');
const { apiLimiter } = require('./middleware/rateLimiter');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Connect to MongoDB ───────────────────────────────────────────────────────
connectDB();

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ─── HTTP Request Logger (Morgan → Winston) ───────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (message) => logger.http(message.trim()) },
}));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Swagger API Docs ─────────────────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'User Management API Docs',
}));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User Management API v2 is running',
    timestamp: new Date().toISOString(),
  });
});

// ─── API Info ─────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to User Management API v2',
    version: '2.0.0',
    docs: `http://localhost:${PORT}/api/docs`,
    endpoints: {
      auth:   'POST /api/auth/register  |  POST /api/auth/login  |  GET /api/auth/me  |  POST /api/auth/logout',
      users:  'GET|POST /api/users  |  GET|PUT|PATCH|DELETE /api/users/:id',
    },
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running at http://localhost:${PORT}`);
  logger.info(`📖 API Docs:   http://localhost:${PORT}/api/docs`);
  logger.info(`❤️  Health:    http://localhost:${PORT}/health`);
});

module.exports = { app, server };
