import { Router } from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import UserController from '../controllers/UserController';

const router = Router();

// GET /status - Check API status
router.get('/status', AppController.getStatus);

// GET /stats - Get application statistics
router.get('/stats', AppController.getStats);

// Creates a new user
router.post('/users', UsersController.postNew);

// Authenticates a user
router.get('/connect', AuthController.getConnect);

// Logs out a user
router.get('/disconnect', AuthController.getDisconnect);

// Retrieves the current user
router.get('/users/me', UserController.getMe);

export default router;
