import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller.js';
import { anonSession } from '../middleware/anonSession.js';
import { validate } from '../middleware/validate.js';
import { updateSettingsSchema, apiKeySchema } from '../schemas/index.js';

export const settingsRouter = Router();

settingsRouter.use(anonSession);
settingsRouter.get('/', SettingsController.getSettings);
settingsRouter.put('/', validate({ body: updateSettingsSchema }), SettingsController.updateSettings);

settingsRouter.get('/api-key', SettingsController.getApiKey);
settingsRouter.put('/api-key', validate({ body: apiKeySchema }), SettingsController.saveApiKey);
settingsRouter.delete('/api-key', SettingsController.removeApiKey);
settingsRouter.post('/api-key/test', validate({ body: apiKeySchema }), SettingsController.testApiKey);

