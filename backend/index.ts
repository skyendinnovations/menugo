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
app.use(requestLogger);

app.use('/api/auth', toNodeHandler(auth));
// Root route
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
