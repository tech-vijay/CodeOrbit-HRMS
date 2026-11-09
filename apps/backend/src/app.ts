import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middlewares/error.middleware';
import { authRouter } from './modules/auth/auth.routes';
import { organizationRouter } from './modules/organizations/organization.routes';
import { employeeRouter } from './modules/employees/employee.routes';
import { attendanceRouter } from './modules/attendance/attendance.routes';
import { leaveRouter } from './modules/leaves/leave.routes';
import { payrollRouter } from './modules/payroll/payroll.routes';
import { recruitmentRouter } from './modules/recruitment/recruitment.routes';
import { legacyUploadRouter, uploadRouter } from './modules/upload/upload.routes';
import { performanceRouter } from './modules/performance/performance.routes';
import { expenseRouter } from './modules/expenses/expense.routes';
import { notificationRouter } from './modules/notifications/notification.routes';

export const createApp = (): Application => {
  const app = express();

  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // 1. Security HTTP Headers
  app.use(helmet());

  // 2. Strict Cross-Origin Resource Sharing
  app.use(
    cors({
      origin:
        env.NODE_ENV === 'production'
          ? [env.CORS_ORIGIN]
          : [env.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
    })
  );

  // 3. Body & Cookie Parsing
  app.use(express.json({ limit: '14mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser(env.COOKIE_SECRET));

  // 4. Rate Limiting (General protection against DDoS & brute-force)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
  });
  app.use('/api', limiter);

  // 5. System Health Check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'CodeOrbit HRMS Backend Core',
      version: '1.0.0',
    });
  });

  // 7. API Route Handlers
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/organizations', organizationRouter);
  app.use('/api/v1/employees', employeeRouter);
  app.use('/api/v1/attendance', attendanceRouter);
  app.use('/api/v1/leaves', leaveRouter);
  app.use('/api/v1/payroll', payrollRouter);
  app.use('/api/v1/recruitment', recruitmentRouter);
  app.use('/api/v1/upload', uploadRouter);
  app.use('/uploads', legacyUploadRouter);
  app.use('/api/v1/performance', performanceRouter);
  app.use('/api/v1/expenses', expenseRouter);
  app.use('/api/v1/notifications', notificationRouter);

  // 7. 404 Route Handler
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    });
  });

  // 8. Centralized Operational Error Handler
  app.use(errorHandler);

  return app;
};
