import { prisma } from '../../config/prisma';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AttendanceStatus, BreakType, RegularizationStatus } from '@prisma/client';
import { resolveCurrentEmployeeProfile } from '../employees/employee-profile.service';

class ApiError {
  static badRequest(msg: string) { return new BadRequestError(msg); }
  static notFound(msg: string) { return new NotFoundError(msg); }
  static forbidden(msg: string) { return new ForbiddenError(msg); }
  static conflict(msg: string) { return new ConflictError(msg); }
}

function parseDateTime(dateStr: string, timeOrIso?: string): Date | undefined {
  if (!timeOrIso) return undefined;
  if (timeOrIso.includes('T')) return new Date(timeOrIso);
  const time = timeOrIso.length === 5 ? `${timeOrIso}:00` : timeOrIso;
  return new Date(`${dateStr}T${time}.000Z`);
}

export class AttendanceService {
  /**
   * Helper to resolve the employee record for the authenticated user or given employeeId
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
        throw ApiError.notFound('Employee record not found in active organization');
      }
      return emp;
    }

    return resolveCurrentEmployeeProfile(organizationId, userId);
  }

  /**
   * Clock in for the current day
   */
  public static async clockIn(
    organizationId: string,
    userId: string,
    data: {
      employeeId?: string;
      checkIn?: string;
      ipAddress?: string;
      location?: string;
      remarks?: string;
    },
    clientIp?: string,
    userAgent?: string
  ) {
    const employee = await this.resolveEmployee(organizationId, userId, data.employeeId);
    
    // Normalize date to YYYY-MM-DD (start of day UTC)
    const now = data.checkIn ? new Date(data.checkIn) : new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const dateObj = new Date(todayStr + 'T00:00:00.000Z');

    // Check if attendance record already exists for today
    let record = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: dateObj,
        },
      },
      include: {
        breaks: true,
      },
    });

    if (record && record.checkIn) {
      throw ApiError.badRequest(`Employee already marked attendance for today at ${record.checkIn.toLocaleTimeString()}`);
    }

    // Determine default shift & check if late
    const defaultShift = await prisma.shift.findFirst({
      where: { organizationId, isDefault: true },
    });

    let isLate = false;
    let shiftId = defaultShift?.id || null;

    if (defaultShift) {
      const [shiftHour, shiftMin] = defaultShift.startTime.split(':').map(Number);
      const shiftStartTimeToday = new Date(now);
      shiftStartTimeToday.setHours(shiftHour, shiftMin + defaultShift.graceMinutes, 0, 0);
      if (now > shiftStartTimeToday) {
        isLate = true;
      }
    } else {
      // Default rule: standard shift starts at 09:15 AM
      const standardThreshold = new Date(now);
      standardThreshold.setHours(9, 15, 0, 0);
      if (now > standardThreshold) {
        isLate = true;
      }
    }

    const initialStatus: AttendanceStatus = isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

    if (record) {
      record = await prisma.attendance.update({
        where: { id: record.id },
        data: {
          checkIn: now,
          status: initialStatus,
          isLate,
          shiftId,
          ipAddress: data.ipAddress || clientIp,
          location: data.location,
          remarks: data.remarks || record.remarks,
        },
        include: { breaks: true, shift: true },
      });
    } else {
      record = await prisma.attendance.create({
        data: {
          organizationId,
          employeeId: employee.id,
          date: dateObj,
          checkIn: now,
          status: initialStatus,
          isLate,
          shiftId,
          ipAddress: data.ipAddress || clientIp,
          location: data.location,
          remarks: data.remarks,
        },
        include: { breaks: true, shift: true },
      });
    }

    AuditService.log({
      action: AuditAction.CREATE,
      entityType: 'Attendance',
      entityId: record.id,
      organizationId,
      userId,
      ipAddress: clientIp,
      userAgent,
      description: `Employee ${employee.employeeCode} (${employee.firstName} ${employee.lastName}) checked in`,
      newValues: { checkIn: now, isLate, status: initialStatus },
    }).catch(() => {});

    return record;
  }

  /**
   * Clock out for the current day
   */
  public static async clockOut(
    organizationId: string,
    userId: string,
    data: {
      employeeId?: string;
      checkOut?: string;
      remarks?: string;
    },
    clientIp?: string,
    userAgent?: string
  ) {
    const employee = await this.resolveEmployee(organizationId, userId, data.employeeId);

    const now = data.checkOut ? new Date(data.checkOut) : new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const dateObj = new Date(todayStr + 'T00:00:00.000Z');

    const record = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: dateObj,
        },
      },
      include: {
        breaks: true,
      },
    });

    if (!record || !record.checkIn) {
      throw ApiError.badRequest('Cannot punch out without prior punch in for today');
    }

    if (record.checkOut) {
      throw ApiError.badRequest('Employee has already clocked out for today');
    }

    // Auto-close any active break if pending
    const activeBreak = record.breaks.find((b: any) => !b.endTime);
    if (activeBreak) {
      const breakDuration = Math.round((now.getTime() - new Date(activeBreak.startTime).getTime()) / 60000);
      await prisma.attendanceBreak.update({
        where: { id: activeBreak.id },
        data: {
          endTime: now,
          durationMinutes: Math.max(0, breakDuration),
        },
      });
    }

    // Refresh breaks list for accurate calculation
    const updatedBreaks = await prisma.attendanceBreak.findMany({
      where: { attendanceId: record.id },
    });

    const totalMinutes = Math.round((now.getTime() - new Date(record.checkIn).getTime()) / 60000);
    const breakMinutes = updatedBreaks.reduce((acc: number, b: any) => acc + (b.durationMinutes || 0), 0);
    const productiveMinutes = Math.max(0, totalMinutes - breakMinutes);

    // Overtime rule: more than 480 productive minutes (8 hours standard shift)
    const standardDailyShiftMinutes = 480;
    const overtimeMinutes = productiveMinutes > standardDailyShiftMinutes ? productiveMinutes - standardDailyShiftMinutes : 0;

    // Status: if productive minutes are under 240 (4 hours), marked as HALF_DAY
    let finalStatus: AttendanceStatus = record.status;
    if (productiveMinutes < 240) {
      finalStatus = AttendanceStatus.HALF_DAY;
    }

    const updated = await prisma.attendance.update({
      where: { id: record.id },
      data: {
        checkOut: now,
        totalMinutes,
        productiveMinutes,
        overtimeMinutes,
        status: finalStatus,
        remarks: data.remarks || record.remarks,
      },
      include: { breaks: true, shift: true },
    });

    AuditService.log({
      action: AuditAction.UPDATE,
      entityType: 'Attendance',
      entityId: updated.id,
      organizationId,
      userId,
      ipAddress: clientIp,
      userAgent,
      description: `Employee ${employee.employeeCode} clocked out (Productive: ${productiveMinutes}m, OT: ${overtimeMinutes}m)`,
      newValues: { checkOut: now, totalMinutes, productiveMinutes, overtimeMinutes },
    }).catch(() => {});

    return updated;
  }

  /**
   * Start a work break (Lunch, Tea, etc.)
   */
  public static async startBreak(
    organizationId: string,
    userId: string,
    data: {
      employeeId?: string;
      breakType: BreakType;
      remarks?: string;
    }
  ) {
    const employee = await this.resolveEmployee(organizationId, userId, data.employeeId);

    const todayStr = new Date().toISOString().slice(0, 10);
    const dateObj = new Date(todayStr + 'T00:00:00.000Z');

    const record = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: dateObj,
        },
      },
      include: {
        breaks: true,
      },
    });

    if (!record || !record.checkIn || record.checkOut) {
      throw ApiError.badRequest('You must be actively checked in without checkout to start a break');
    }

    const existingActive = record.breaks.find((b: any) => !b.endTime);
    if (existingActive) {
      throw ApiError.badRequest(`You are already on an active break (${existingActive.breakType})`);
    }

    const newBreak = await prisma.attendanceBreak.create({
      data: {
        attendanceId: record.id,
        breakType: data.breakType,
        startTime: new Date(),
        remarks: data.remarks,
      },
    });

    return newBreak;
  }

  /**
   * End an active work break
   */
  public static async endBreak(
    organizationId: string,
    userId: string,
    data?: {
      employeeId?: string;
      breakId?: string;
      remarks?: string;
    }
  ) {
    const employee = await this.resolveEmployee(organizationId, userId, data?.employeeId);

    const todayStr = new Date().toISOString().slice(0, 10);
    const dateObj = new Date(todayStr + 'T00:00:00.000Z');

    const record = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: dateObj,
        },
      },
      include: { breaks: true },
    });

    if (!record) {
      throw ApiError.notFound('No attendance session found for today');
    }

    const activeBreak = data?.breakId
      ? record.breaks.find((b: any) => b.id === data.breakId)
      : record.breaks.find((b: any) => !b.endTime);

    if (!activeBreak || activeBreak.endTime) {
      throw ApiError.badRequest('No active break found to conclude');
    }

    const now = new Date();
    const durationMinutes = Math.round((now.getTime() - new Date(activeBreak.startTime).getTime()) / 60000);

    const completedBreak = await prisma.attendanceBreak.update({
      where: { id: activeBreak.id },
      data: {
        endTime: now,
        durationMinutes: Math.max(0, durationMinutes),
        remarks: data?.remarks || activeBreak.remarks,
      },
    });

    return completedBreak;
  }

  /**
   * Get employee attendance status for today
   */
  public static async getTodayStatus(organizationId: string, userId: string, employeeId?: string) {
    const employee = await this.resolveEmployee(organizationId, userId, employeeId);

    const todayStr = new Date().toISOString().slice(0, 10);
    const dateObj = new Date(todayStr + 'T00:00:00.000Z');

    const record = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: dateObj,
        },
      },
      include: {
        breaks: {
          orderBy: { startTime: 'desc' },
        },
        shift: true,
      },
    });

    const activeBreak = record?.breaks.find((b: any) => !b.endTime) || null;

    return {
      id: record?.id,
      date: todayStr,
      employee: {
        id: employee.id,
        employeeCode: employee.employeeCode,
        fullName: `${employee.firstName} ${employee.lastName}`,
        departmentId: employee.departmentId,
      },
      isCheckedIn: Boolean(record?.checkIn),
      isCheckedOut: Boolean(record?.checkOut),
      isOnBreak: Boolean(activeBreak),
      activeBreak,
      checkIn: record?.checkIn || null,
      checkOut: record?.checkOut || null,
      productiveMinutes: record?.productiveMinutes || 0,
      overtimeMinutes: record?.overtimeMinutes || 0,
      status: record?.status || 'ABSENT',
      isLate: record?.isLate || false,
      breaks: record?.breaks || [],
    };
  }

  /**
   * Query organization-wide attendance records with rich filters
   */
  public static async getAttendances(
    organizationId: string,
    params: {
      startDate?: string;
      endDate?: string;
      employeeId?: string;
      departmentId?: string;
      status?: AttendanceStatus;
      isLate?: boolean;
      page: number;
      limit: number;
    }
  ) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (params.startDate || params.endDate) {
      where.date = {};
      if (params.startDate) where.date.gte = new Date(params.startDate + 'T00:00:00.000Z');
      if (params.endDate) where.date.lte = new Date(params.endDate + 'T00:00:00.000Z');
    }

    if (params.status) where.status = params.status;
    if (params.isLate !== undefined) where.isLate = params.isLate;

    if (params.employeeId) {
      where.employeeId = params.employeeId;
    } else if (params.departmentId) {
      where.employee = { departmentId: params.departmentId };
    }

    const [attendances, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              workEmail: true,
              department: { select: { id: true, name: true } },
              designation: { select: { id: true, title: true } },
            },
          },
          breaks: {
            orderBy: { startTime: 'asc' },
          },
          shift: true,
        },
      }),
      prisma.attendance.count({ where }),
    ]);

    return {
      attendances,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get Daily Attendance Summary Dashboard Metrics
   */
  public static async getAttendanceSummary(
    organizationId: string,
    targetDate?: string,
    employeeId?: string
  ) {
    const dateStr = targetDate || new Date().toISOString().slice(0, 10);
    const dateObj = new Date(dateStr + 'T00:00:00.000Z');

    // Total active employees in tenant
    const totalStaff = employeeId
      ? 1
      : await prisma.employee.count({ where: { organizationId, status: 'ACTIVE' } });

    const recordsToday = await prisma.attendance.findMany({
      where: { organizationId, date: dateObj, ...(employeeId ? { employeeId } : {}) },
      include: {
        breaks: true,
      },
    });

    const presentCount = recordsToday.filter((r: any) => Boolean(r.checkIn)).length;
    const lateCount = recordsToday.filter((r: any) => r.isLate).length;
    const halfDayCount = recordsToday.filter((r: any) => r.status === AttendanceStatus.HALF_DAY).length;
    const onBreakCount = recordsToday.filter((r: any) => r.breaks.some((b: any) => !b.endTime)).length;
    const absentCount = Math.max(0, totalStaff - presentCount);

    const totalProductiveMinutes = recordsToday.reduce((acc: number, r: any) => acc + (r.productiveMinutes || 0), 0);
    const totalOvertimeMinutes = recordsToday.reduce((acc: number, r: any) => acc + (r.overtimeMinutes || 0), 0);

    const averageProductiveHours = presentCount > 0
      ? (totalProductiveMinutes / presentCount / 60).toFixed(1)
      : '0.0';

    return {
      date: dateStr,
      totalEmployees: totalStaff,
      totalStaff,
      present: presentCount,
      presentCount,
      absentCount,
      lateCount,
      halfDayCount,
      onBreakCount,
      totalOvertimeHours: (totalOvertimeMinutes / 60).toFixed(1),
      averageProductiveHours,
      attendanceRate: totalStaff > 0 ? Math.round((presentCount / totalStaff) * 100) : 0,
      attendancePercentage: totalStaff > 0 ? Math.round((presentCount / totalStaff) * 100) : 0,
    };
  }

  /**
   * Employee submits attendance regularization request
   */
  public static async requestRegularization(
    organizationId: string,
    userId: string,
    data: {
      employeeId?: string;
      attendanceId?: string;
      date: string;
      requestedCheckIn?: string;
      requestedCheckOut?: string;
      reason: string;
    }
  ) {
    const employee = await this.resolveEmployee(organizationId, userId, data.employeeId);
    const dateObj = new Date(data.date + 'T00:00:00.000Z');

    let attId = data.attendanceId;
    if (!attId) {
      const attendanceRecord = await prisma.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: dateObj,
          },
        },
      });
      attId = attendanceRecord?.id;
    }

    const requestedCheckInDate = parseDateTime(data.date, data.requestedCheckIn);
    const requestedCheckOutDate = parseDateTime(data.date, data.requestedCheckOut);

    const regularization = await prisma.attendanceRegularization.create({
      data: {
        organizationId,
        employeeId: employee.id,
        attendanceId: attId || null,
        date: dateObj,
        requestedCheckIn: requestedCheckInDate,
        requestedCheckOut: requestedCheckOutDate,
        reason: data.reason,
        status: RegularizationStatus.PENDING,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
        },
      },
    });

    return regularization;
  }

  /**
   * Query regularization requests
   */
  public static async getRegularizations(
    organizationId: string,
    params: {
      status?: RegularizationStatus;
      employeeId?: string;
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

    const [items, total] = await Promise.all([
      prisma.attendanceRegularization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              department: { select: { name: true } },
            },
          },
          attendance: true,
        },
      }),
      prisma.attendanceRegularization.count({ where }),
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
   * Manager / Admin review of regularization request
   */
  public static async reviewRegularization(
    organizationId: string,
    regularizationId: string,
    adminUserId: string,
    data: {
      status: 'APPROVED' | 'REJECTED';
      managerRemarks?: string;
    },
    clientIp?: string,
    userAgent?: string
  ) {
    const reg = await prisma.attendanceRegularization.findFirst({
      where: { id: regularizationId, organizationId },
      include: { employee: true },
    });

    if (!reg) {
      throw ApiError.notFound('Regularization request not found in organization');
    }

    if (reg.status !== RegularizationStatus.PENDING) {
      throw ApiError.badRequest(`Regularization request has already been ${reg.status.toLowerCase()}`);
    }

    const updatedReg = await prisma.attendanceRegularization.update({
      where: { id: reg.id },
      data: {
        status: data.status === 'APPROVED' ? RegularizationStatus.APPROVED : RegularizationStatus.REJECTED,
        approvedById: adminUserId,
        managerRemarks: data.managerRemarks,
      },
    });

    // If approved, update or create corresponding attendance record
    if (data.status === 'APPROVED') {
      const checkInTime = reg.requestedCheckIn || new Date(reg.date.toISOString().slice(0, 10) + 'T09:00:00.000Z');
      const checkOutTime = reg.requestedCheckOut || new Date(reg.date.toISOString().slice(0, 10) + 'T18:00:00.000Z');
      const totalMinutes = Math.round((checkOutTime.getTime() - checkInTime.getTime()) / 60000);
      const productiveMinutes = totalMinutes;
      const overtimeMinutes = productiveMinutes > 480 ? productiveMinutes - 480 : 0;

      await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: reg.employeeId,
            date: reg.date,
          },
        },
        create: {
          organizationId,
          employeeId: reg.employeeId,
          date: reg.date,
          checkIn: checkInTime,
          checkOut: checkOutTime,
          totalMinutes,
          productiveMinutes,
          overtimeMinutes,
          status: AttendanceStatus.PRESENT,
          isRegularized: true,
          remarks: `Regularized: ${reg.reason}`,
        },
        update: {
          checkIn: checkInTime,
          checkOut: checkOutTime,
          totalMinutes,
          productiveMinutes,
          overtimeMinutes,
          status: AttendanceStatus.PRESENT,
          isRegularized: true,
          remarks: `Regularized: ${reg.reason}`,
        },
      });
    }

    AuditService.log({
      action: AuditAction.UPDATE,
      entityType: 'AttendanceRegularization',
      entityId: reg.id,
      organizationId,
      userId: adminUserId,
      ipAddress: clientIp,
      userAgent,
      description: `${data.status} regularization request for ${reg.employee.employeeCode}`,
      newValues: { status: data.status, remarks: data.managerRemarks },
    }).catch(() => {});

    return updatedReg;
  }

  /**
   * Export Attendance records to CSV
   */
  public static async exportAttendanceCSV(
    organizationId: string,
    params: { startDate?: string; endDate?: string; departmentId?: string }
  ) {
    const records = await prisma.attendance.findMany({
      where: {
        organizationId,
        ...(params.startDate || params.endDate
          ? {
              date: {
                ...(params.startDate ? { gte: new Date(params.startDate + 'T00:00:00.000Z') } : {}),
                ...(params.endDate ? { lte: new Date(params.endDate + 'T00:00:00.000Z') } : {}),
              },
            }
          : {}),
        ...(params.departmentId ? { employee: { departmentId: params.departmentId } } : {}),
      },
      include: {
        employee: {
          include: { department: true, designation: true },
        },
      },
      orderBy: [{ date: 'desc' }, { employee: { employeeCode: 'asc' } }],
    });

    const headers = [
      'Employee Code',
      'Employee Name',
      'Department',
      'Designation',
      'Date',
      'Check In',
      'Check Out',
      'Productive Hours',
      'Overtime Hours',
      'Status',
      'Is Late',
      'Is Regularized',
    ];

    const rows = records.map((r: any) => [
      r.employee.employeeCode,
      `"${r.employee.firstName} ${r.employee.lastName}"`,
      `"${r.employee.department?.name || 'General'}"`,
      `"${r.employee.designation?.title || 'Staff'}"`,
      r.date.toISOString().slice(0, 10),
      r.checkIn ? r.checkIn.toLocaleTimeString() : 'N/A',
      r.checkOut ? r.checkOut.toLocaleTimeString() : 'N/A',
      (r.productiveMinutes / 60).toFixed(1),
      (r.overtimeMinutes / 60).toFixed(1),
      r.status,
      r.isLate ? 'YES' : 'NO',
      r.isRegularized ? 'YES' : 'NO',
    ]);

    return [headers.join(','), ...rows.map((row: any[]) => row.join(','))].join('\n');
  }

  /**
   * Shift Management
   */
  public static async getShifts(organizationId: string) {
    return prisma.shift.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  public static async createShift(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      startTime: string;
      endTime: string;
      graceMinutes?: number;
      isDefault?: boolean;
    }
  ) {
    if (data.isDefault) {
      await prisma.shift.updateMany({
        where: { organizationId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const shift = await prisma.shift.create({
      data: {
        organizationId,
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        graceMinutes: data.graceMinutes ?? 15,
        isDefault: data.isDefault ?? false,
      },
    });

    return shift;
  }
}
