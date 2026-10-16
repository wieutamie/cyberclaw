import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import { VirusTotalError } from '../lib/virustotal/client.js';

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  res.status(404).json({
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.path}`,
    },
  });
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof VirusTotalError) {
    logger.warn({ code: err.code, msg: err.message }, 'VirusTotal error caught');
    return res.status(err.statusCode).json({
      ok: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      ok: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  if (err.name === 'ZodError') {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.issues,
      },
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: `File size exceeds the maximum allowed limit (${env.MAX_UPLOAD_MB} MB).`,
      },
    });
  }

  logger.error({ err }, 'Unhandled application error');
  return res.status(500).json({
    ok: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred.',
    },
  });
}
