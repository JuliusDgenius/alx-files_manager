import { Router } from 'express';
import AppController from '../controllers/AppController';

const router = Router();

// GET /status - Check API status
router.get('/status', AppController.getStatus);

// GET /stats - Get application statistics
router.get('/stats', AppController.getStats);

export default router;
