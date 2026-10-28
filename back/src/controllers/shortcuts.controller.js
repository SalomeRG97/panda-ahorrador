const shortcutsService = require('../services/shortcuts.service');
const logger = require('../config/logger');

class ShortcutsController {
  async getToday(req, res, next) {
    try {
      const userId = req.effectiveUserId || req.user.id;
      logger.info(`[ShortcutsController] GET /api/shortcuts/today (userId: ${userId})`);
      const shortcuts = await shortcutsService.getTodayShortcuts(userId);
      res.json({ success: true, data: shortcuts });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ShortcutsController();
