import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './config/prisma';

const app = createApp();

const startServer = async () => {
  try {
    // Verify database connectivity
    await prisma.$connect();
    logger.info('Connected to PostgreSQL database engine');

    app.listen(env.PORT, () => {
      logger.info(`CodeOrbit HRMS Backend running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
