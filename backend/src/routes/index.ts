import { Router } from 'express';
import userRoutes from './user.routes';
import restaurantRoutes from './restaurant.routes';
import roleRoutes from './role.routes';
import memberRoutes from './member.routes';
import tableRoutes from './table.routes';
import menuRoutes from './menu.routes';
import sessionRoutes from './session.routes';
import orderRoutes from './order.routes';
import publicRoutes from './public.routes';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Health check
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// API routes
router.use('/users', userRoutes);

router.use('/restaurants', authenticate, restaurantRoutes);

// Restaurant sub-resources (all authenticated with permission middleware)
router.use('/restaurants/:restaurantId/roles', authenticate, roleRoutes);
router.use('/restaurants/:restaurantId/members', authenticate, memberRoutes);
router.use('/restaurants/:restaurantId/tables', authenticate, tableRoutes);
router.use('/restaurants/:restaurantId/menu', authenticate, menuRoutes);
router.use('/restaurants/:restaurantId/sessions', authenticate, sessionRoutes);
router.use('/restaurants/:restaurantId/orders', authenticate, orderRoutes);

// Accept invitation (authenticated but not restaurant-scoped)
import { memberController } from '../controllers/member.controller';
router.get('/invitations/my', authenticate, memberController.getMyInvitations.bind(memberController));
router.post('/invitations/accept', authenticate, memberController.acceptInvitation.bind(memberController));
router.post('/invitations/reject', authenticate, memberController.rejectInvitation.bind(memberController));

// Public routes (NO auth middleware)
router.use('/public', publicRoutes);

export default router;
