import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { startRetentionJob } from './jobs/retention.job.js';

const server = app.listen(env.PORT, '0.0.0.0', () => {
  logger.info(`Cyber Claw Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  logger.info(`Allowed CORS Client Origin: ${env.CLIENT_URL}`);
  startRetentionJob();
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});
