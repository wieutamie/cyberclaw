import { Request, Response, NextFunction } from 'express';
import { ScanService } from '../services/scan.service.js';
import { HistoryService } from '../services/history.service.js';

export class ScansController {
  static async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const status = await ScanService.getScanStatus(userId, id);
      return res.status(200).json({ ok: true, data: status });
    } catch (err) {
      next(err);
    }
  }

  static async getDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const scan = await ScanService.getScanDetails(userId, id);
      return res.status(200).json({ ok: true, data: scan });
    } catch (err) {
      next(err);
    }
  }

  static async rescan(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const result = await ScanService.rescan(userId, id);
      return res.status(200).json({ ok: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async deleteScan(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const success = await HistoryService.deleteScan(userId, id);
      return res.status(200).json({ ok: true, data: { deleted: success } });
    } catch (err) {
      next(err);
    }
  }

  static async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const pageSize = req.query.pageSize
        ? parseInt(req.query.pageSize as string, 10)
        : 10;
      const q = req.query.q as string | undefined;
      const type = req.query.type as any;
      const verdict = req.query.verdict as any;

      const result = await HistoryService.getHistory(userId, {
        page,
        pageSize,
        q,
        type,
        verdict,
      });

      return res.status(200).json({ ok: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async exportCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const csv = await HistoryService.exportCsv(userId);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="cyberclaw_history_${Date.now()}.csv"`
      );
      return res.status(200).send(csv);
    } catch (err) {
      next(err);
    }
  }

  static async clearAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      await HistoryService.clearAllHistory(userId);
      return res.status(200).json({ ok: true, data: { cleared: true } });
    } catch (err) {
      next(err);
    }
  }
}
