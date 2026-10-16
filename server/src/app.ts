import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { apiRouter } from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

export const app = express();

app.set('trust proxy', 1);

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
// NOTE: `credentials: true` forbids a wildcard origin per the CORS spec, so we
// only ever echo back an explicitly allow-listed origin.
const allowedOrigins = env.CLIENT_URL.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  .filter((origin) => origin !== '*');

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (no Origin header), e.g. curl/health checks.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Blocked by CORS policy: Origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    // Expose the anonymous session token so the browser can read and persist it.
    exposedHeaders: ['X-Anon-Session'],
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (env.NODE_ENV !== 'test') {
  app.use(pinoHttp({ logger }));
}

app.use(globalLimiter);

// Mount API routes
app.use('/api', apiRouter);

// 404 & Error handlers
app.use(notFoundHandler);
app.use(errorHandler);
