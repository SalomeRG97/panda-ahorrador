const authService = require('../services/auth.service');
const logger = require('../config/logger');

class ShareController {
  async shareData(req, res, next) {
    try {
      const { viewerEmail } = req.body;
      logger.info(`[ShareController] POST /api/share -> Owner ${req.user.id} comparte con ${viewerEmail}`);
      const result = await authService.shareWithViewer(req.user.id, viewerEmail);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async removeShare(req, res, next) {
    try {
      const { viewerId } = req.params;
      logger.info(`[ShareController] DELETE /api/share/${viewerId}`);
      await authService.removeShare(req.user.id, parseInt(viewerId));
      res.json({ success: true, message: 'Acceso revocado' });
    } catch (error) {
      next(error);
    }
  }

  async getMyViewers(req, res, next) {
    try {
      logger.info(`[ShareController] GET /api/share/my-viewers`);
      const viewers = await authService.getMyViewers(req.user.id);
      res.json({ success: true, data: viewers });
    } catch (error) {
      next(error);
    }
  }

  async getSharedWithMe(req, res, next) {
    try {
      logger.info(`[ShareController] GET /api/share/shared-with-me`);
      const owners = await authService.getSharedWithMe(req.user.id);
      res.json({ success: true, data: owners });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ShareController();
