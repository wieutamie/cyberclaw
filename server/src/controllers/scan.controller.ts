import { Request, Response, NextFunction } from 'express';
import { ScanService } from '../services/scan.service.js';
import { AppError } from '../middleware/errorHandler.js';

export class ScanController {
  static async scanFile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const file = req.file;

      if (!file || !file.buffer || file.size === 0) {
        throw new AppError('EMPTY_FILE', 'Uploaded file cannot be empty.', 400);
      }

      const scan = await ScanService.createFileScan(
        userId,
        file.buffer,
        file.originalname
      );

      return res.status(200).json({
        ok: true,
        data: {
          scanId: scan.id,
          state: scan.state,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async scanUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { url } = req.body;

      if (!url) {
        throw new AppError('INVALID_URL', 'URL is required', 400);
      }

      const scan = await ScanService.createUrlScan(userId, url);

      return res.status(200).json({
        ok: true,
        data: {
          scanId: scan.id,
          state: scan.state,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async scanHash(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { hash } = req.body;

      if (!hash) {
        throw new AppError('INVALID_HASH', 'Hash is required', 400);
      }

      const scan = await ScanService.createHashScan(userId, hash);

      return res.status(200).json({
        ok: true,
        data: {
          scanId: scan.id,
          state: scan.state,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
