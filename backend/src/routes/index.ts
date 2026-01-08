import { Router } from 'express';
import userRoutes from './user.routes';
import restaurantRoutes from './restaurant.routes';

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

router.use('/restaurants',restaurantRoutes);

// Add more routes here
// router.use('/products', productRoutes);
// router.use('/orders', orderRoutes);
// router.use('/auth', authRoutes);

export default router;
