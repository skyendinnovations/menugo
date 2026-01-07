import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Public routes (example - adjust based on your needs)
router.post('/', userController.createUser.bind(userController));

// Protected routes - require authentication
router.get('/me', authenticate, userController.getCurrentUser.bind(userController));

router.get('/', authenticate, userController.getUsers.bind(userController));
router.get('/search', authenticate, userController.searchUsers.bind(userController));
router.get('/:id', authenticate, userController.getUserById.bind(userController));
router.patch('/:id', authenticate, userController.updateUser.bind(userController));
router.delete('/:id', authenticate, userController.deleteUser.bind(userController));

// Admin only routes
router.patch('/:id/ban', authenticate, authorize('admin'), userController.banUser.bind(userController));
router.patch('/:id/unban', authenticate, authorize('admin'), userController.unbanUser.bind(userController));

export default router;
