const logger = require('../config/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const safeUrl = logger.maskEmailsInText(req.originalUrl);
    const userPart = req.user?.id ? `userId:${req.user.id}` : 'anon';
    const reqIdPart = req.id ? ` [reqId:${req.id}]` : '';
    logger.info(
      `[HTTP]${reqIdPart} ${req.method} ${safeUrl} - Status: ${res.statusCode} (${duration}ms) - User: ${userPart}`
    );
  });
  next();
};

module.exports = requestLogger;
