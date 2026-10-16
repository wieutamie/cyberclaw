import { Router } from 'express';
import { ScansController } from '../controllers/scans.controller.js';
import { anonSession } from '../middleware/anonSession.js';

export const scansRouter = Router();

scansRouter.use(anonSession);

// Note: /export and root / routes must be registered before parameterized /:id routes
scansRouter.get('/', ScansController.getHistory);
scansRouter.delete('/', ScansController.clearAll);
scansRouter.get('/export', ScansController.exportCsv);

scansRouter.get('/:id/status', ScansController.getStatus);
scansRouter.get('/:id', ScansController.getDetails);
scansRouter.post('/:id/rescan', ScansController.rescan);
scansRouter.delete('/:id', ScansController.deleteScan);
