import express from 'express';
import cors from 'cors';
import { config } from './src/config';
import { logger } from './src/utils/logger';
import routes from './src/routes';
import { requestLogger } from './src/middlewares/logger.middleware';
import { errorHandler, notFoundHandler } from './src/middlewares/error.middleware';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth';

const app = express();

// Global Middleware
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/auth/update-role', async (req, res) => {
    try {
        const { userId, role } = req.body;

        if (!userId || !role) {
            return res.status(400).json({ error: 'userId and role are required' });
        }

        // Validate role
        const validRoles = ['user', 'admin', 'manager', 'staff'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be one of: user, admin, manager, staff' });
        }

        // Get current user session to check permissions
        const session = await auth.api.getSession({ headers: req.headers });

        // Allow if user is updating their own role during setup OR if admin is updating
        const isOwnProfile = session?.user?.id === userId;
        if (!session?.user && !isOwnProfile) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // // Only allow admin role changes by admins or during initial setup
        // if (role === 'admin' && session?.user) {
        //     return res.status(403).json({ error: 'Admin access required to assign admin role' });
        // }

        // Update user role in database
        const { db } = await import('./src/db');
        const { user } = await import('./src/db/schemas/auth.schema');
        const { eq } = await import('drizzle-orm');

        const result = await db.update(user)
            .set({ role, updatedAt: new Date() })
            .where(eq(user.id, userId))
            .returning({ id: user.id, role: user.role });

        if (result.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            message: 'Role updated successfully',
            user: result[0]
        });
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ error: 'Failed to update role' });
    }
});
// Auth endpoints
app.use('/api/auth', toNodeHandler(auth));

app.get('/', (req, res) => {
    res.json({
        message: 'MenuGo API',
        version: '1.0.0',
        status: 'running',
    });
});


// API Routes
app.use('/api', routes);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start Server
const server = app.listen(config.port, () => {
    logger.info(`🚀 Server is running on http://localhost:${config.port}`);
    logger.info(`📝 Environment: ${config.nodeEnv}`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
    });
});

export default app;
