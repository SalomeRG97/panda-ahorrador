const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/environment');
const logger = require('./config/logger');
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
const allowedOrigins = [
  'http://localhost:4200',
  'https://panda-ahorrador-front.onrender.com',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(requestLogger);

// Servir archivos estáticos (avatares)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Ruta de comprobación de estado (Health Check)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: '熊猫理财 El panda ahorrador API',
    timestamp: new Date()
  });
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

// Handling 404
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: `Ruta no encontrada: ${req.originalUrl}` });
});

// Middleware global de manejo de errores
app.use(errorHandler);

// Iniciar servidor
app.listen(config.port, () => {
  logger.info(`===========================================================`);
  logger.info(`🌸 熊猫理财 El panda ahorrador - Backend API corriendo en http://localhost:${config.port}`);
  logger.info(`🗄️ Base de datos: MySQL CleverCloud (${config.db.database})`);
  logger.info(`🔐 Autenticación: JWT habilitado`);
  logger.info(`===========================================================`);
});

module.exports = app;
