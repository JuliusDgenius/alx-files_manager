import { Router } from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';

const router = Router();

// GET /status - Check API status
router.get('/status', AppController.getStatus);

// GET /stats - Get application statistics
router.get('/stats', AppController.getStats);

// Creates a new user
router.post('/users', UsersController.postNew);

export default router;
