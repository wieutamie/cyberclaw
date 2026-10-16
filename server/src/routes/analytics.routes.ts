import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { anonSession } from '../middleware/anonSession.js';

export const analyticsRouter = Router();

analyticsRouter.use(anonSession);
analyticsRouter.get('/', AnalyticsController.getAnalytics);
