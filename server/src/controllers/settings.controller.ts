import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settings.service.js';
import { ApiKeyService } from '../services/apiKey.service.js';
import { AppError } from '../middleware/errorHandler.js';

export class SettingsController {
  static async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const settings = await SettingsService.getSettings(userId);
      return res.status(200).json({ ok: true, data: settings });
    } catch (err) {
      next(err);
    }
  }

  static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const updated = await SettingsService.updateSettings(userId, req.body);
      return res.status(200).json({ ok: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async getApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const meta = await ApiKeyService.getKeyMetadata(userId);
      return res.status(200).json({ ok: true, data: meta });
    } catch (err) {
      next(err);
    }
  }

  static async saveApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { apiKey } = req.body;

      if (!apiKey || typeof apiKey !== 'string') {
        throw new AppError('INVALID_KEY', 'API key is required', 400);
      }

      await ApiKeyService.saveApiKey(userId, apiKey.trim());
      const meta = await ApiKeyService.getKeyMetadata(userId);

      return res.status(200).json({
        ok: true,
        data: { message: 'API key saved successfully', ...meta },
      });
    } catch (err) {
      next(err);
    }
  }

  static async removeApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      await ApiKeyService.removeApiKey(userId);
      return res.status(200).json({
        ok: true,
        data: { message: 'API key removed', hasKey: false, last4: null },
      });
    } catch (err) {
      next(err);
    }
  }

  static async testApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      let keyToTest = req.body?.apiKey;

      if (!keyToTest) {
        keyToTest = await ApiKeyService.getUserApiKey(userId);
      }

      if (!keyToTest) {
        throw new AppError('NO_API_KEY', 'No API key provided to test', 400);
      }

      const isValid = await ApiKeyService.testApiKey(keyToTest);
      return res.status(200).json({ ok: true, data: { valid: isValid } });
    } catch (err) {
      next(err);
    }
  }
}

