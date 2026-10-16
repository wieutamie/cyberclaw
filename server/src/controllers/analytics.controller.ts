import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service.js';

export class AnalyticsController {
  static async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const range = (req.query.range as '7d' | '30d' | '90d') || '30d';

      const data = await AnalyticsService.getAnalytics(userId, range);
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  }
}
