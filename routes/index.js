import { Router } from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';

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
router.get('/users/me', UsersController.getMe);

// Uploads a file
router.post('/files', FilesController.postNew);

router.post('/files', FilesController.postUpload);

router.get('/files/:id', FilesController.getShow);
router.get('/files', FilesController.getIndex);

router.put('/files/:id/publish', FilesController.putPublish);
router.put('/files/:id/unpublish', FilesController.putUnpublish);

router.get('/files/:id/data', FilesController.getFile);

export default router;
