import { Router } from 'express';
import { z } from 'zod';
import { ScanController } from '../controllers/scan.controller.js';
import { anonSession } from '../middleware/anonSession.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { scanLimiter } from '../middleware/rateLimit.js';

export const scanRouter = Router();

const urlSchema = z.object({
  url: z.string().url('Must be a valid URL starting with http:// or https://'),
});

const hashSchema = z.object({
  hash: z
    .string()
    .regex(
      /^([a-fA-F0-9]{32}|[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/,
      'Hash must be valid MD5 (32 hex), SHA-1 (40 hex), or SHA-256 (64 hex)'
    ),
});

scanRouter.use(anonSession);
scanRouter.use(scanLimiter);

scanRouter.post('/file', upload.single('file'), ScanController.scanFile);
scanRouter.post('/url', validate({ body: urlSchema }), ScanController.scanUrl);
scanRouter.post('/hash', validate({ body: hashSchema }), ScanController.scanHash);
