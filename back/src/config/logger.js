const { createLogger, format, transports } = require('winston');
const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const customFormat = format.printf(({ timestamp, level, message, ...metadata }) => {
  let metaStr = Object.keys(metadata).length ? JSON.stringify(metadata) : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message} ${metaStr}`;
});

const maskEmail = (email) => {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return '***';
  }
  const [local, domain] = email.trim().split('@');
  if (!local || !domain) return '***';
  return `${local[0]}***@${domain}`;
};

const maskEmailsInText = (text) => {
  if (typeof text !== 'string') return text;
  return text.replace(
    /([a-zA-Z0-9._%+-])[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    '$1***@$2'
  );
};

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    customFormat
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        customFormat
      )
    }),
    new transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error'
    }),
    new transports.File({
      filename: path.join(logDir, 'combined.log')
    })
  ]
});

logger.maskEmail = maskEmail;
logger.maskEmailsInText = maskEmailsInText;

module.exports = logger;
