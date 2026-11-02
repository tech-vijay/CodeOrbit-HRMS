import { prisma } from '../../config/prisma';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../../utils/errors';
import { AuditService } from '../audit/audit.service';
import { AuditAction, LeaveStatus, HalfDaySession } from '@prisma/client';

export class LeaveService {
  /**
   * Helper to resolve the employee record
   */
  public static async resolveEmployee(
    organizationId: string,
    userId: string,
    explicitEmployeeId?: string
  ) {
    if (explicitEmployeeId) {
      const emp = await prisma.employee.findFirst({
        where: { id: explicitEmployeeId, organizationId },
      });
      if (!emp) {
        throw new NotFoundError('Employee record not found in active organization');
      }
      return emp;
    }

    const emp = await prisma.employee.findFirst({
      where: { userId, organizationId },
    });

    if (!emp) {
      throw new BadRequestError('No employee profile linked to current user in this organization');
    }

    return emp;
  }

  /**
   * Ensure default organization leave types exist
   */
  public static async ensureDefaultLeaveTypes(organizationId: string) {
    const existing = await prisma.leaveType.findMany({ where: { organizationId } });
    if (existing.length > 0) return existing;

    const defaults = [
      { name: 'Casual Leave', code: 'CL', description: 'For urgent personal matters and short leaves', daysAllowed: 12, isPaid: true, color: '#3B82F6' },
      { name: 'Sick Leave', code: 'SL', description: 'Medical and health related leaves', daysAllowed: 10, isPaid: true, color: '#10B981', requiresAttachment: true },
      { name: 'Earned Leave', code: 'EL', description: 'Annual privileged leave with carry-forward capability', daysAllowed: 15, isPaid: true, isCarryForward: true, carryForwardMaxDays: 15, color: '#F59E0B' },
      { name: 'Loss of Pay', code: 'LOP', description: 'Unpaid leave when balance is exhausted', daysAllowed: 0, isPaid: false, color: '#64748B' },
    ];

    for (const d of defaults) {
      await prisma.leaveType.create({
        data: {
          organizationId,
          ...d,
        },
      });
    }

    return prisma.leaveType.findMany({ where: { organizationId }, orderBy: { createdAt: 'asc' } });
  }

  /**
   * List Leave Types for organization
   */
  public static async getLeaveTypes(organizationId: string) {
    return this.ensureDefaultLeaveTypes(organizationId);
  }

  /**
   * Create custom leave type
   */
  public static async createLeaveType(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      code: string;
      description?: string;
      daysAllowed: number;
      isPaid?: boolean;
      requiresAttachment?: boolean;
      carryForwardMaxDays?: number;
      color?: string;
    }
  ) {
    const existing = await prisma.leaveType.findFirst({
      where: { organizationId, code: data.code.toUpperCase() },
    });

    if (existing) {
      throw new ConflictError(`Leave type code ${data.code} already exists in organization`);
    }

    const leaveType = await prisma.leaveType.create({
      data: {
        organizationId,
        name: data.name,
        code: data.code.toUpperCase(),
        description: data.description,
        daysAllowed: data.daysAllowed,
        isPaid: data.isPaid ?? true,
        requiresAttachment: data.requiresAttachment ?? false,
        carryForwardMaxDays: data.carryForwardMaxDays ?? 0,
        isCarryForward: (data.carryForwardMaxDays ?? 0) > 0,
        color: data.color || '#E52328',
      },
    });

    return leaveType;
  }

  /**
   * Ensure employee has balance records allocated for the given year
   */
  public static async ensureBalances(organizationId: string, employeeId: string, year: number) {
    const types = await this.ensureDefaultLeaveTypes(organizationId);

    for (const type of types) {
      const existingBalance = await prisma.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId,
            leaveTypeId: type.id,
            year,
          },
        },
      });

      if (!existingBalance) {
        await prisma.leaveBalance.create({
          data: {
            organizationId,
            employeeId,
            leaveTypeId: type.id,
            year,
            allocatedDays: type.daysAllowed,
            usedDays: 0,
            pendingDays: 0,
            carryForwardDays: 0,
          },
        });
      }
    }
  }

  /**
   * Get employee leave balances
   */
  public static async getLeaveBalances(
    organizationId: string,
    userId: string,
    explicitEmployeeId?: string,
    targetYear?: number
  ) {
    const employee = await this.resolveEmployee(organizationId, userId, explicitEmployeeId);
    const year = targetYear || new Date().getFullYear();

    await this.ensureBalances(organizationId, employee.id, year);

    const balances = await prisma.leaveBalance.findMany({
      where: {
        organizationId,
        employeeId: employee.id,
        year,
      },
      include: {
        leaveType: true,
      },
      orderBy: { leaveType: { name: 'asc' } },
    });

    return balances.map((b: any) => {
      const totalAvailable = Math.max(
        0,
        b.allocatedDays + b.carryForwardDays - b.usedDays - b.pendingDays
      );
      return {
        id: b.id,
        year: b.year,
        leaveType: b.leaveType,
        allocatedDays: b.allocatedDays,
        usedDays: b.usedDays,
        pendingDays: b.pendingDays,
        carryForwardDays: b.carryForwardDays,
        availableDays: totalAvailable,
      };
    });
  }

  /**
   * Calculate business / working days between dates excluding organization weekends and holidays
   */
  public static async calculateLeaveDays(
    organizationId: string,
    startDateStr: string,
    endDateStr: string,
    isHalfDay = false
  ): Promise<number> {
    if (isHalfDay) return 0.5;

    const start = new Date(startDateStr + 'T00:00:00.000Z');
    const end = new Date(endDateStr + 'T00:00:00.000Z');

    if (start > end) {
      throw new BadRequestError('Start date cannot be after end date');
    }

    // Fetch holidays in date range
    const holidays = await prisma.companyHoliday.findMany({
      where: {
        organizationId,
        date: { gte: start, lte: end },
        isMandatory: true,
      },
    });

    const holidayDates = new Set(holidays.map((h: any) => h.date.toISOString().slice(0, 10)));

    let daysCount = 0;
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getUTCDay(); // 0 is Sunday, 6 is Saturday
      const currentStr = current.toISOString().slice(0, 10);

      // Default: skip Sunday (0) and Saturday (6)
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidayDates.has(currentStr);

      if (!isWeekend && !isHoliday) {
        daysCount += 1;
      }

      current.setUTCDate(current.getUTCDate() + 1);
    }

    return Math.max(1, daysCount);
  }

  /**
   * Apply for leave
   */
  public static async applyLeave(
    organizationId: string,
    userId: string,
    data: {
      employeeId?: string;
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      isHalfDay?: boolean;
      halfDaySession?: HalfDaySession;
      reason: string;
      attachmentUrl?: string;
    },
    clientIp?: string,
    userAgent?: string
  ) {
    const employee = await this.resolveEmployee(organizationId, userId, data.employeeId);
    const start = new Date(data.startDate + 'T00:00:00.000Z');
    const end = new Date(data.endDate + 'T00:00:00.000Z');

    if (start > end) {
      throw new BadRequestError('Start date cannot be after end date');
    }

    const leaveType = await prisma.leaveType.findFirst({
      where: { id: data.leaveTypeId, organizationId },
    });

    if (!leaveType) {
      throw new NotFoundError('Leave type not found in active organization');
    }

    // Check for overlapping leave requests
    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        organizationId,
        employeeId: employee.id,
        status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });

    if (overlapping) {
      throw new BadRequestError('You already have an active or pending leave request covering these dates');
    }

    const totalDays = await this.calculateLeaveDays(
      organizationId,
      data.startDate,
      data.endDate,
      data.isHalfDay
    );

    const year = start.getFullYear();
    await this.ensureBalances(organizationId, employee.id, year);

    const balance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
          year,
        },
      },
    });

    if (leaveType.isPaid && balance) {
      const remaining = balance.allocatedDays + balance.carryForwardDays - balance.usedDays - balance.pendingDays;
      if (remaining < totalDays) {
        throw new BadRequestError(
          `Insufficient leave balance for ${leaveType.name}. Available: ${remaining} days, Requested: ${totalDays} days`
        );
      }
    }

    // Transaction: deduct pending days from balance and create request
    const request = await prisma.$transaction(async (tx: any) => {
      if (balance) {
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: {
            pendingDays: { increment: totalDays },
          },
        });
      }

      const newReq = await tx.leaveRequest.create({
        data: {
          organizationId,
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
          startDate: start,
          endDate: end,
          totalDays,
          isHalfDay: data.isHalfDay ?? false,
          halfDaySession: data.halfDaySession,
          reason: data.reason,
          attachmentUrl: data.attachmentUrl,
          status: LeaveStatus.PENDING,
        },
        include: {
          leaveType: true,
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true, department: true },
          },
        },
      });

      return newReq;
    });

    AuditService.log({
      action: AuditAction.CREATE,
      entityType: 'LeaveRequest',
      entityId: request.id,
      organizationId,
      userId,
      ipAddress: clientIp,
      userAgent,
      description: `Employee ${employee.employeeCode} requested ${totalDays} day(s) of ${leaveType.name}`,
      newValues: { startDate: data.startDate, endDate: data.endDate, totalDays },
    }).catch(() => {});

    return request;
  }

  /**
   * Query leave requests with filters
   */
  public static async getLeaveRequests(
    organizationId: string,
    params: {
      status?: LeaveStatus;
      employeeId?: string;
      departmentId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (params.status) where.status = params.status;
    if (params.employeeId) where.employeeId = params.employeeId;
    if (params.departmentId) where.employee = { departmentId: params.departmentId };

    if (params.startDate || params.endDate) {
      where.startDate = {};
      if (params.startDate) where.startDate.gte = new Date(params.startDate + 'T00:00:00.000Z');
      if (params.endDate) where.startDate.lte = new Date(params.endDate + 'T00:00:00.000Z');
    }

    const [items, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ appliedAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          leaveType: true,
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              department: { select: { id: true, name: true } },
              designation: { select: { id: true, title: true } },
            },
          },
          approvedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Manager / Admin review of leave request
   */
  public static async reviewLeaveRequest(
    organizationId: string,
    requestId: string,
    reviewerUserId: string,
    data: {
      status: 'APPROVED' | 'REJECTED';
      managerRemarks?: string;
    },
    clientIp?: string,
    userAgent?: string
  ) {
    const request = await prisma.leaveRequest.findFirst({
      where: { id: requestId, organizationId },
      include: { employee: true, leaveType: true },
    });

    if (!request) {
      throw new NotFoundError('Leave request not found in organization');
    }

    if (request.status !== LeaveStatus.PENDING) {
      throw new BadRequestError(`Leave request has already been ${request.status.toLowerCase()}`);
    }

    const year = request.startDate.getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year,
        },
      },
    });

    const reviewed = await prisma.$transaction(async (tx: any) => {
      if (balance) {
        if (data.status === 'APPROVED') {
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              pendingDays: Math.max(0, balance.pendingDays - request.totalDays),
              usedDays: { increment: request.totalDays },
            },
          });
        } else {
          // REJECTED: restore pending days back to available
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              pendingDays: Math.max(0, balance.pendingDays - request.totalDays),
            },
          });
        }
      }

      const updated = await tx.leaveRequest.update({
        where: { id: request.id },
        data: {
          status: data.status === 'APPROVED' ? LeaveStatus.APPROVED : LeaveStatus.REJECTED,
          approvedById: reviewerUserId,
          approvedAt: new Date(),
          managerRemarks: data.managerRemarks,
        },
        include: {
          leaveType: true,
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true, department: true },
          },
          approvedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      return updated;
    });

    AuditService.log({
      action: AuditAction.UPDATE,
      entityType: 'LeaveRequest',
      entityId: request.id,
      organizationId,
      userId: reviewerUserId,
      ipAddress: clientIp,
      userAgent,
      description: `${data.status} leave request for ${request.employee.employeeCode} (${request.totalDays} days of ${request.leaveType.name})`,
      newValues: { status: data.status, remarks: data.managerRemarks },
    }).catch(() => {});

    return reviewed;
  }

  /**
   * Cancel a leave request
   */
  public static async cancelLeaveRequest(
    organizationId: string,
    requestId: string,
    userId: string,
    cancellationReason?: string,
    clientIp?: string,
    userAgent?: string
  ) {
    const request = await prisma.leaveRequest.findFirst({
      where: { id: requestId, organizationId },
      include: { employee: true, leaveType: true },
    });

    if (!request) {
      throw new NotFoundError('Leave request not found');
    }

    if (request.status === LeaveStatus.REJECTED || request.status === LeaveStatus.CANCELLED) {
      throw new BadRequestError(`Cannot cancel a leave request that is already ${request.status.toLowerCase()}`);
    }

    const year = request.startDate.getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year,
        },
      },
    });

    const cancelled = await prisma.$transaction(async (tx: any) => {
      if (balance) {
        if (request.status === LeaveStatus.PENDING) {
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              pendingDays: Math.max(0, balance.pendingDays - request.totalDays),
            },
          });
        } else if (request.status === LeaveStatus.APPROVED) {
          // If approved, restore used days
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              usedDays: Math.max(0, balance.usedDays - request.totalDays),
            },
          });
        }
      }

      return tx.leaveRequest.update({
        where: { id: request.id },
        data: {
          status: LeaveStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason,
        },
        include: {
          leaveType: true,
          employee: true,
        },
      });
    });

    AuditService.log({
      action: AuditAction.UPDATE,
      entityType: 'LeaveRequest',
      entityId: request.id,
      organizationId,
      userId,
      ipAddress: clientIp,
      userAgent,
      description: `Cancelled leave request for ${request.employee.employeeCode}`,
      newValues: { status: 'CANCELLED', cancellationReason },
    }).catch(() => {});

    return cancelled;
  }

  /**
   * Company Holiday Management
   */
  public static async getHolidays(organizationId: string, year?: number) {
    const targetYear = year || new Date().getFullYear();
    return prisma.companyHoliday.findMany({
      where: { organizationId, year: targetYear },
      orderBy: { date: 'asc' },
    });
  }

  public static async createHoliday(
    organizationId: string,
    data: {
      name: string;
      date: string;
      description?: string;
      isMandatory?: boolean;
    }
  ) {
    const dateObj = new Date(data.date + 'T00:00:00.000Z');
    const year = dateObj.getFullYear();

    const holiday = await prisma.companyHoliday.upsert({
      where: {
        organizationId_date: {
          organizationId,
          date: dateObj,
        },
      },
      create: {
        organizationId,
        name: data.name,
        date: dateObj,
        description: data.description,
        isMandatory: data.isMandatory ?? true,
        year,
      },
      update: {
        name: data.name,
        description: data.description,
        isMandatory: data.isMandatory ?? true,
      },
    });

    return holiday;
  }

  /**
   * Leave Management Dashboard Summary
   */
  public static async getLeaveSummary(organizationId: string) {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const today = new Date(todayStr + 'T00:00:00.000Z');

    const [pendingCount, todayLeaves, upcomingLeaves, totalTypes] = await Promise.all([
      prisma.leaveRequest.count({
        where: { organizationId, status: LeaveStatus.PENDING },
      }),
      prisma.leaveRequest.count({
        where: {
          organizationId,
          status: LeaveStatus.APPROVED,
          startDate: { lte: today },
          endDate: { gte: today },
        },
      }),
      prisma.leaveRequest.count({
        where: {
          organizationId,
          status: LeaveStatus.APPROVED,
          startDate: { gt: today },
        },
      }),
      prisma.leaveType.count({
        where: { organizationId, isActive: true },
      }),
    ]);

    return {
      pendingCount,
      todayOnLeaveCount: todayLeaves,
      upcomingApprovedCount: upcomingLeaves,
      activeLeaveTypesCount: totalTypes,
    };
  }
}
