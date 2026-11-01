import { prisma } from '../../config/prisma';
import {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  AddDocumentInput,
  AddEmergencyContactInput,
  UpdateOnboardingTaskInput,
  QueryEmployeesInput,
} from './employee.schemas';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from '../../utils/errors';
import { AuditService } from '../audit/audit.service';
import { AuditAction, LifecycleEventType, OnboardingTaskCategory } from '@prisma/client';
import { hashPassword } from '../../utils/crypto';

export class EmployeeService {
  /**
   * Add a new employee with automatic employee ID generation, onboarding checklist, and optional account creation
   */
  public static async createEmployee(
    organizationId: string,
    creatorId: string,
    input: CreateEmployeeInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    // 1. Verify work email uniqueness within tenant
    const existingWorkEmail = await prisma.employee.findFirst({
      where: {
        organizationId,
        workEmail: input.workEmail.toLowerCase(),
      },
    });

    if (existingWorkEmail) {
      throw new ConflictError(
        `An employee with work email '${input.workEmail}' already exists in your organization`
      );
    }

    // 2. Validate tenant ownership of referenced department, designation, manager
    if (input.departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: input.departmentId, organizationId },
      });
      if (!dept) throw new BadRequestError('Invalid department specified');
    }

    if (input.designationId) {
      const desig = await prisma.designation.findFirst({
        where: { id: input.designationId, organizationId },
      });
      if (!desig) throw new BadRequestError('Invalid designation specified');
    }

    if (input.managerId) {
      const manager = await prisma.employee.findFirst({
        where: { id: input.managerId, organizationId },
      });
      if (!manager) throw new BadRequestError('Invalid reporting manager specified');
    }

    // 3. Atomically allocate sequential employee code
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { employeeCodePrefix: true, employeeCodeCounter: true, name: true },
    });

    if (!org) throw new NotFoundError('Organization not found');

    const prefix = org.employeeCodePrefix || 'EMP';
    const counter = org.employeeCodeCounter || 1;
    const employeeCode = `${prefix}-${String(counter).padStart(4, '0')}`;

    // 4. Transaction: increment counter, optionally create user + membership, create employee, onboarding tasks & lifecycle
    const result = await prisma.$transaction(async (tx) => {
      // Increment organization employee code counter
      await tx.organization.update({
        where: { id: organizationId },
        data: { employeeCodeCounter: { increment: 1 } },
      });

      let linkedUserId: string | null = null;

      // Handle account provisioning
      if (input.createAccount) {
        let user = await tx.user.findUnique({
          where: { email: input.workEmail.toLowerCase() },
        });

        if (!user) {
          const defaultPassword = await hashPassword('WelcomeOrbit@2026!');
          user = await tx.user.create({
            data: {
              email: input.workEmail.toLowerCase(),
              passwordHash: defaultPassword,
              firstName: input.firstName,
              lastName: input.lastName,
              phone: input.phone,
              status: 'ACTIVE',
            },
          });
        }

        linkedUserId = user.id;

        // Ensure Employee role exists in organization
        let employeeRole = await tx.role.findFirst({
          where: {
            organizationId,
            slug: 'employee',
          },
        });

        if (!employeeRole) {
          employeeRole = await tx.role.create({
            data: {
              organizationId,
              name: 'Employee',
              slug: 'employee',
              description: 'Standard self-service employee portal access',
              isSystemRole: true,
            },
          });
        }

        // Create membership if not already existing
        const existingMembership = await tx.membership.findFirst({
          where: { organizationId, userId: user.id },
        });

        if (!existingMembership) {
          await tx.membership.create({
            data: {
              organizationId,
              userId: user.id,
              roleId: employeeRole.id,
              status: 'ACTIVE',
            },
          });
        }
      }

      // Create Employee Record
      const employee = await tx.employee.create({
        data: {
          organizationId,
          userId: linkedUserId,
          employeeCode,
          firstName: input.firstName,
          lastName: input.lastName,
          workEmail: input.workEmail.toLowerCase(),
          personalEmail: input.personalEmail || null,
          phone: input.phone || null,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          gender: input.gender || null,
          joiningDate: new Date(input.joiningDate),
          status: input.status,
          employmentType: input.employmentType,
          departmentId: input.departmentId || null,
          designationId: input.designationId || null,
          branchId: input.branchId || null,
          managerId: input.managerId || null,
        },
        include: {
          department: true,
          designation: true,
          manager: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true },
          },
        },
      });

      // Seed Initial Onboarding Tasks
      const defaultTasks = [
        {
          title: 'Submit Government ID & Address Proof',
          description: 'Upload valid Passport, Aadhaar, or National ID',
          category: OnboardingTaskCategory.DOCUMENT_SUBMISSION,
        },
        {
          title: 'Sign & Submit Employment Agreement',
          description: 'Review terms of employment and submit signed contract',
          category: OnboardingTaskCategory.DOCUMENT_SUBMISSION,
        },
        {
          title: 'IT Hardware & Workstation Setup',
          description: 'Corporate laptop allocation, SSO credentials, and VPN setup',
          category: OnboardingTaskCategory.IT_PROVISIONING,
        },
        {
          title: 'HR Induction & Company Policies Briefing',
          description: 'Attend HR orientation and acknowledge code of conduct',
          category: OnboardingTaskCategory.HR_ORIENTATION,
        },
      ];

      await tx.onboardingTask.createMany({
        data: defaultTasks.map((task) => ({
          organizationId,
          employeeId: employee.id,
          title: task.title,
          description: task.description,
          category: task.category,
        })),
      });

      // Record Lifecycle Event
      await tx.lifecycleEvent.create({
        data: {
          organizationId,
          employeeId: employee.id,
          eventType: LifecycleEventType.HIRED,
          description: `Employee hired as ${employee.designation?.title || 'Team Member'} in ${employee.department?.name || 'General Pool'}`,
          effectiveDate: new Date(input.joiningDate),
          createdBy: creatorId,
        },
      });

      return employee;
    });

    // Record Immutable Audit Log
    await AuditService.log({
      organizationId,
      userId: creatorId,
      action: AuditAction.CREATE,
      entityType: 'Employee',
      entityId: result.id,
      description: `New employee '${result.firstName} ${result.lastName}' (${result.employeeCode}) created`,
      ipAddress,
      userAgent,
    });

    return result;
  }

  /**
   * Search, filter, and paginate employees within the tenant
   */
  public static async getEmployees(
    organizationId: string,
    query: QueryEmployeesInput
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }
    if (query.designationId) {
      where.designationId = query.designationId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.employmentType) {
      where.employmentType = query.employmentType;
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { workEmail: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        include: {
          department: { select: { id: true, name: true, code: true } },
          designation: { select: { id: true, title: true, code: true } },
          manager: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
          _count: {
            select: {
              employeeDocuments: true,
              onboardingTasks: true,
              attendances: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Fetch single employee comprehensive dossier
   */
  public static async getEmployeeById(organizationId: string, employeeId: string) {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      include: {
        department: true,
        designation: true,
        branch: true,
        manager: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true, workEmail: true },
        },
        directReports: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true, status: true },
        },
        employeeDocuments: {
          orderBy: { createdAt: 'desc' },
        },
        emergencyContacts: true,
        onboardingTasks: {
          orderBy: { createdAt: 'asc' },
        },
        lifecycleEvents: {
          orderBy: { effectiveDate: 'desc' },
        },
      },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found in your organization');
    }

    return employee;
  }

  /**
   * Update employee details and record lifecycle changes
   */
  public static async updateEmployee(
    organizationId: string,
    updaterId: string,
    employeeId: string,
    input: UpdateEmployeeInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    const current = await prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
    });

    if (!current) {
      throw new NotFoundError('Employee not found');
    }

    // Verify foreign keys if provided
    if (input.departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: input.departmentId, organizationId },
      });
      if (!dept) throw new BadRequestError('Invalid department');
    }

    if (input.designationId) {
      const desig = await prisma.designation.findFirst({
        where: { id: input.designationId, organizationId },
      });
      if (!desig) throw new BadRequestError('Invalid designation');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.update({
        where: { id: employeeId },
        data: {
          ...input,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
        },
        include: {
          department: true,
          designation: true,
        },
      });

      // Detect and record lifecycle events
      if (input.status && input.status !== current.status) {
        await tx.lifecycleEvent.create({
          data: {
            organizationId,
            employeeId,
            eventType:
              input.status === 'ACTIVE'
                ? LifecycleEventType.PROBATION_COMPLETED
                : input.status === 'TERMINATED'
                ? LifecycleEventType.TERMINATED
                : input.status === 'RESIGNED'
                ? LifecycleEventType.RESIGNED
                : LifecycleEventType.PROMOTED,
            description: `Employment status transitioned from ${current.status} to ${input.status}`,
            createdBy: updaterId,
          },
        });
      }

      if (input.designationId && input.designationId !== current.designationId) {
        await tx.lifecycleEvent.create({
          data: {
            organizationId,
            employeeId,
            eventType: LifecycleEventType.DESIGNATION_CHANGE,
            description: `Designation updated to ${emp.designation?.title || 'new role'}`,
            createdBy: updaterId,
          },
        });
      }

      if (input.departmentId && input.departmentId !== current.departmentId) {
        await tx.lifecycleEvent.create({
          data: {
            organizationId,
            employeeId,
            eventType: LifecycleEventType.DEPARTMENT_TRANSFER,
            description: `Transferred to department: ${emp.department?.name || 'new department'}`,
            createdBy: updaterId,
          },
        });
      }

      return emp;
    });

    await AuditService.log({
      organizationId,
      userId: updaterId,
      action: AuditAction.UPDATE,
      entityType: 'Employee',
      entityId: employeeId,
      description: `Employee ${updated.firstName} ${updated.lastName} profile updated`,
      oldValues: current,
      newValues: updated,
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * Upload and attach an employee document
   */
  public static async addDocument(
    organizationId: string,
    uploaderId: string,
    employeeId: string,
    input: AddDocumentInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
    });

    if (!employee) throw new NotFoundError('Employee not found');

    const document = await prisma.employeeDocument.create({
      data: {
        organizationId,
        employeeId,
        title: input.title,
        documentType: input.documentType,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      },
    });

    await AuditService.log({
      organizationId,
      userId: uploaderId,
      action: AuditAction.CREATE,
      entityType: 'EmployeeDocument',
      entityId: document.id,
      description: `Document '${document.title}' (${document.documentType}) attached to employee ${employee.employeeCode}`,
      ipAddress,
      userAgent,
    });

    return document;
  }

  /**
   * Update onboarding task status
   */
  public static async updateOnboardingTask(
    organizationId: string,
    userId: string,
    taskId: string,
    input: UpdateOnboardingTaskInput
  ) {
    const task = await prisma.onboardingTask.findFirst({
      where: { id: taskId, organizationId },
    });

    if (!task) throw new NotFoundError('Onboarding task not found');

    const isCompleted = input.status === 'COMPLETED';

    return prisma.onboardingTask.update({
      where: { id: taskId },
      data: {
        status: input.status,
        completedAt: isCompleted ? new Date() : null,
        completedBy: isCompleted ? userId : null,
      },
    });
  }

  /**
   * Add emergency contact
   */
  public static async addEmergencyContact(
    organizationId: string,
    employeeId: string,
    input: AddEmergencyContactInput
  ) {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
    });

    if (!employee) throw new NotFoundError('Employee not found');

    return prisma.emergencyContact.create({
      data: {
        employeeId,
        name: input.name,
        relationship: input.relationship,
        phone: input.phone,
        email: input.email || null,
        address: input.address || null,
        isPrimary: input.isPrimary,
      },
    });
  }

  /**
   * Export all employees formatted for enterprise reporting
   */
  public static async exportEmployees(organizationId: string) {
    const employees = await prisma.employee.findMany({
      where: { organizationId },
      include: {
        department: true,
        designation: true,
        manager: {
          select: { firstName: true, lastName: true, employeeCode: true },
        },
      },
      orderBy: { employeeCode: 'asc' },
    });

    return employees.map((emp) => ({
      employeeCode: emp.employeeCode,
      name: `${emp.firstName} ${emp.lastName}`,
      workEmail: emp.workEmail,
      phone: emp.phone || 'N/A',
      department: emp.department?.name || 'Unassigned',
      designation: emp.designation?.title || 'Unassigned',
      manager: emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : 'None',
      employmentType: emp.employmentType,
      status: emp.status,
      joiningDate: emp.joiningDate.toISOString().split('T')[0],
    }));
  }
}
