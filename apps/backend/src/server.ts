import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './config/prisma';
import { execFileSync } from 'child_process';
import path from 'path';

const app = createApp();

const startServer = async () => {
  try {
    // Verify database connectivity
    await prisma.$connect();
    logger.info('Connected to PostgreSQL database engine');

    if (env.NODE_ENV === 'production' && env.ENABLE_DEMO_SEED) {
      const demoOrganization = await prisma.organization.findUnique({
        where: { slug: 'codeorbit-demo' },
        select: { id: true },
      });
      if (!demoOrganization) {
        logger.info('Demo seeding is enabled and no demo tenant exists; creating demo tenant.');
        execFileSync(
          process.execPath,
          [require.resolve('tsx/cli'), path.resolve(__dirname, '../prisma/seed.ts')],
          {
            cwd: path.resolve(__dirname, '../../..'),
            env: process.env,
            stdio: 'inherit',
          }
        );
      }
    }

    app.listen(env.PORT, () => {
      logger.info(`CodeOrbit HRMS Backend running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
