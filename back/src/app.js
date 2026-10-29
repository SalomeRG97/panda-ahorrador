const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const config = require('./config/environment');
const pool = require('./config/database');
const logger = require('./config/logger');
const { version } = require('../package.json');
const requestLogger = require('./middlewares/request-logger.middleware');
const errorHandler = require('./middlewares/error-handler.middleware');

// Rutas de autenticación
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const shareRoutes = require('./routes/share.routes');
const profileRoutes = require('./routes/profile.routes');

// Rutas por módulo (protegidas)
const categoryRoutes = require('./routes/category.routes');
const paymentMethodRoutes = require('./routes/payment-method.routes');
const yearRoutes = require('./routes/year.routes');
const monthRoutes = require('./routes/month.routes');
const incomeRoutes = require('./routes/income.routes');
const expenseRoutes = require('./routes/expense.routes');
const weekRoutes = require('./routes/week.routes');
const challengeRoutes = require('./routes/challenge.routes');
const summaryRoutes = require('./routes/summary.routes');
const shortcutsRoutes = require('./routes/shortcuts.routes');

const app = express();

// Middlewares globales
const clientOrigins = (config.clientUrl || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(
  new Set([
    'http://localhost:4200',
    'https://panda-ahorrador-front.onrender.com',
    ...clientOrigins,
  ])
);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origen no permitido por CORS'), false);
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(requestLogger);

// Servir archivos estáticos (avatares)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Ruta de comprobación de estado (Health Check)
const HEALTH_CHECK_TIMEOUT_MS = 3000;

app.get('/api/health', async (req, res) => {
  let timeoutId;
  try {
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Database health check timeout'));
      }, HEALTH_CHECK_TIMEOUT_MS);
    });

    await Promise.race([
      pool.query({ sql: 'SELECT 1', timeout: HEALTH_CHECK_TIMEOUT_MS }),
      timeoutPromise,
    ]);

    res.status(200).json({
      status: 'ok',
      db: 'ok',
      version,
      uptime: process.uptime(),
      app: '熊猫理财 El panda ahorrador API',
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error(`[HealthCheck] Fallo de conexión a la BD: ${error.message}`);
    res.status(503).json({
      status: 'error',
      db: 'down',
      version,
      uptime: process.uptime(),
      app: '熊猫理财 El panda ahorrador API',
      timestamp: new Date(),
    });
  } finally {
    clearTimeout(timeoutId);
  }
});

// Rutas de autenticación (públicas y protegidas)
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/profile', profileRoutes);

// Registro de endpoints de API (protegidos)
app.use('/api/categories', categoryRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/years', yearRoutes);
app.use('/api/months', monthRoutes);
app.use('/api/incomes', incomeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/weeks', weekRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/shortcuts', shortcutsRoutes);

// Servir frontend compilado (React + Vite) en producción / Docker
const frontendDistPath = path.join(__dirname, '../../front/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Handling 404
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: `Ruta no encontrada: ${req.originalUrl}` });
});

// Middleware global de manejo de errores
app.use(errorHandler);

module.exports = app;
