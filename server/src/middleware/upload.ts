import multer from 'multer';
import { env } from '../config/env.js';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, // 32 MB
    files: 1,
  },
});
