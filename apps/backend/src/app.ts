import express, { Application, Request, Response } from 'express';
import { Router } from 'express';
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
import { OrganizationController } from './modules/organizations/organization.controller';
import { authenticate } from './middlewares/auth.middleware';
import { resolveTenantContext } from './middlewares/tenant.middleware';
import { requirePermission } from './middlewares/rbac.middleware';
import { validateRequest } from './middlewares/validate.middleware';
import { createDepartmentSchema } from './modules/organizations/organization.schemas';

export const createApp = (): Application => {
  const app = express();

  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // 1. Security HTTP Headers
  app.use(helmet());

  const allowedOrigins = Array.from(
    new Set([
      env.CORS_ORIGIN,
      'https://codeorbit-hrms-frontend.onrender.com',
      'http://localhost:5173',
      ...(env.NODE_ENV === 'development' ? ['http://127.0.0.1:5173'] : []),
    ])
  );

  // 2. Strict Cross-Origin Resource Sharing
  app.use(
    cors({
      origin: allowedOrigins,
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
  const healthCheck: express.RequestHandler = (_req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'CodeOrbit HRMS Backend Core',
      version: '1.0.0',
    });
  };
  app.get(['/api/health', '/api/v1/health', '/health'], healthCheck);

  const mountApiRouter = (paths: string[], router: express.Router) => {
    paths.forEach((routePath) => app.use(routePath, limiter, router));
  };

  // 7. API Route Handlers, with versioned and legacy deployment aliases.
  mountApiRouter(['/api/v1/auth', '/api/auth', '/auth'], authRouter);
  mountApiRouter(
    ['/api/v1/organizations', '/api/organizations', '/organizations', '/api/organization', '/organization'],
    organizationRouter
  );
  const departmentRouter = Router();
  departmentRouter.use(authenticate, resolveTenantContext);
  departmentRouter.get('/', requirePermission('org:read'), OrganizationController.getDepartments);
  departmentRouter.post(
    '/',
    requirePermission('org:update'),
    validateRequest({ body: createDepartmentSchema }),
    OrganizationController.createDepartment
  );
  mountApiRouter(['/api/v1/departments', '/api/departments', '/departments'], departmentRouter);

  const auditRouter = Router();
  auditRouter.use(authenticate, resolveTenantContext);
  auditRouter.get('/', requirePermission('audit:read'), OrganizationController.getAuditLogs);
  auditRouter.get('/logs', requirePermission('audit:read'), OrganizationController.getAuditLogs);
  mountApiRouter(['/api/v1/audit', '/api/audit', '/audit'], auditRouter);
  mountApiRouter(
    ['/api/v1/employees', '/api/employees', '/employees', '/api/employee', '/employee'],
    employeeRouter
  );
  mountApiRouter(['/api/v1/attendance', '/api/attendance', '/attendance'], attendanceRouter);
  mountApiRouter(['/api/v1/leaves', '/api/leaves', '/leaves', '/api/leave', '/leave'], leaveRouter);
  mountApiRouter(['/api/v1/payroll', '/api/payroll', '/payroll'], payrollRouter);
  mountApiRouter(['/api/v1/recruitment', '/api/recruitment', '/recruitment'], recruitmentRouter);
  mountApiRouter(['/api/v1/upload', '/api/upload', '/upload'], uploadRouter);
  app.use('/uploads', legacyUploadRouter);
  mountApiRouter(['/api/v1/performance', '/api/performance', '/performance'], performanceRouter);
  mountApiRouter(['/api/v1/expenses', '/api/expenses', '/expenses', '/api/expense', '/expense'], expenseRouter);
  mountApiRouter(['/api/v1/notifications', '/api/notifications', '/notifications'], notificationRouter);

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
