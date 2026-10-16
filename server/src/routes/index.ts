import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { scanRouter } from './scan.routes.js';
import { scansRouter } from './scans.routes.js';
import { analyticsRouter } from './analytics.routes.js';
import { settingsRouter } from './settings.routes.js';
import { internalRouter } from './internal.routes.js';

export const apiRouter = Router();

apiRouter.use('/', healthRouter);
apiRouter.use('/scan', scanRouter);
apiRouter.use('/scans', scansRouter);
apiRouter.use('/analytics', analyticsRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/internal', internalRouter);


