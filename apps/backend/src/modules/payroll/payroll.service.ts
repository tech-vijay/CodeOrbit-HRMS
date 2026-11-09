import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/errors';
import { Decimal } from '@prisma/client/runtime/library';
import { ExpenseStatus, NotificationType } from '@prisma/client';
import { NotificationService } from '../notifications/notification.service';

export interface SalaryBreakdown {
  ctc: number;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  conveyance: number;
  medicalAllowance: number;
  pfEmployer: number;
  pfEmployee: number;
  professionalTax: number;
  tds: number;
}

export class PayrollService {
  /**
   * Helper: Standard Indian Statutory Salary Calculator based on Annual CTC
   * Monthly Gross = CTC / 12
   * Basic = 50% of Gross
   * HRA = 40% of Basic (standard non-metro/metro blend)
   * Conveyance = 1,600 / month
   * Medical Allowance = 1,250 / month
   * PF Employee = 12% of Basic (capped at basic or standard PF statutory)
   * PF Employer = 12% of Basic
   * Professional Tax = 200 / month standard
   * Special Allowance = Gross - (Basic + HRA + Conveyance + Medical + PF Employer)
   */
  public static calculateStatutoryBreakdown(annualCtc: number): SalaryBreakdown {
    const monthlyGross = Math.round(annualCtc / 12);
    const basicSalary = Math.round(monthlyGross * 0.50);
    const hra = Math.round(basicSalary * 0.40);
    const conveyance = 1600;
    const medicalAllowance = 1250;
    
    // PF 12% of Basic (Standard Indian statutory)
    const pfEmployee = Math.round(Math.min(basicSalary, 15000) * 0.12);
    const pfEmployer = pfEmployee;
    const professionalTax = 200;

    // Remaining pool for special allowance
    const fixedComponents = basicSalary + hra + conveyance + medicalAllowance + pfEmployer;
    const specialAllowance = Math.max(0, monthlyGross - fixedComponents);

    // Estimated monthly TDS (approx progressive deduction placeholder)
    let monthlyTds = 0;
    if (annualCtc > 1200000) {
      monthlyTds = Math.round(((annualCtc - 1200000) * 0.20 + 75000) / 12);
    } else if (annualCtc > 700000) {
      monthlyTds = Math.round(((annualCtc - 700000) * 0.10) / 12);
    }

    return {
      ctc: annualCtc,
      basicSalary,
      hra,
      specialAllowance,
      conveyance,
      medicalAllowance,
      pfEmployer,
      pfEmployee,
      professionalTax,
      tds: monthlyTds,
    };
  }

  /**
   * Upsert an employee's salary structure
   */
  public static async setSalaryStructure(
    organizationId: string,
    data: {
      employeeId: string;
      ctc: number;
      basicSalary: number;
      hra: number;
      specialAllowance: number;
      conveyance: number;
      medicalAllowance: number;
      pfEmployer: number;
      pfEmployee: number;
      professionalTax: number;
      tds: number;
      effectiveFrom: string;
    }
  ) {
    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, organizationId },
    });

    if (!employee) {
      throw new AppError('Employee not found in organization', 404);
    }

    // Deactivate previous structures for this employee
    await prisma.salaryStructure.updateMany({
      where: { employeeId: data.employeeId, organizationId, isActive: true },
      data: { isActive: false },
    });

    const structure = await prisma.salaryStructure.create({
      data: {
        organizationId,
        employeeId: data.employeeId,
        ctc: new Decimal(data.ctc),
        basicSalary: new Decimal(data.basicSalary),
        hra: new Decimal(data.hra),
        specialAllowance: new Decimal(data.specialAllowance),
        conveyance: new Decimal(data.conveyance),
        medicalAllowance: new Decimal(data.medicalAllowance),
        pfEmployer: new Decimal(data.pfEmployer),
        pfEmployee: new Decimal(data.pfEmployee),
        professionalTax: new Decimal(data.professionalTax),
        tds: new Decimal(data.tds),
        effectiveFrom: new Date(data.effectiveFrom),
        isActive: true,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            workEmail: true,
          },
        },
      },
    });

    return structure;
  }

  /**
   * Get active salary structure for employee
   */
  public static async getSalaryStructure(organizationId: string, employeeId: string) {
    const structure = await prisma.salaryStructure.findFirst({
      where: { employeeId, organizationId, isActive: true },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            workEmail: true,
            joiningDate: true,
            status: true,
          },
        },
      },
    });

    return structure;
  }

  /**
   * Execute or generate monthly payroll run with leave & attendance LOP deductions
   */
  public static async processPayrollRun(
    organizationId: string,
    params: { month: number; year: number; notes?: string }
  ) {
    const { month, year, notes } = params;

    // Check if payroll already exists for this month/year
    const existing = await prisma.payrollRun.findUnique({
      where: {
        organizationId_month_year: {
          organizationId,
          month,
          year,
        },
      },
    });

    if (existing && existing.status === 'PAID') {
      throw new AppError('Payroll for this month is already paid and locked', 400);
    }

    // Number of calendar days in this month
    const monthDays = new Date(year, month, 0).getDate();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch active employees with an active salary structure
    const employees = await prisma.employee.findMany({
      where: {
        organizationId,
        status: { in: ['ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'ON_LEAVE'] },
        salaryStructures: {
          some: { isActive: true },
        },
      },
      include: {
        salaryStructures: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (employees.length === 0) {
      throw new AppError('No active employees with configured salary structures found', 400);
    }

    // Fetch approved LOP leaves for this month
    const approvedLopLeaves = await prisma.leaveRequest.findMany({
      where: {
        organizationId,
        status: 'APPROVED',
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        leaveType: {
          code: 'LOP',
        },
      },
      select: {
        employeeId: true,
        totalDays: true,
      },
    });

    const lopDaysMap = new Map<string, number>();
    for (const l of approvedLopLeaves) {
      const cur = lopDaysMap.get(l.employeeId) || 0;
      lopDaysMap.set(l.employeeId, cur + Number(l.totalDays));
    }

    // Delete previous non-paid payroll items if re-processing and unlink expenses
    if (existing) {
      const existingItems = await prisma.payrollItem.findMany({
        where: { payrollRunId: existing.id },
        select: { id: true },
      });
      const itemIds = existingItems.map((i) => i.id);
      if (itemIds.length > 0) {
        await prisma.expenseClaim.updateMany({
          where: { payrollItemId: { in: itemIds } },
          data: { payrollItemId: null },
        });
      }
      await prisma.payrollItem.deleteMany({
        where: { payrollRunId: existing.id },
      });
    }

    // Fetch approved expense claims waiting for reimbursement
    const approvedExpenses = await prisma.expenseClaim.findMany({
      where: {
        organizationId,
        status: ExpenseStatus.APPROVED_BY_FINANCE,
        payrollItemId: null,
      },
    });

    const expenseMap = new Map<string, typeof approvedExpenses>();
    for (const exp of approvedExpenses) {
      const cur = expenseMap.get(exp.employeeId) || [];
      cur.push(exp);
      expenseMap.set(exp.employeeId, cur);
    }

    let runTotalGross = 0;
    let runTotalDeductions = 0;
    let runTotalNet = 0;

    const payrollRun = existing
      ? await prisma.payrollRun.update({
          where: { id: existing.id },
          data: {
            status: 'PROCESSING',
            notes: notes || existing.notes,
            processedAt: new Date(),
          },
        })
      : await prisma.payrollRun.create({
          data: {
            organizationId,
            month,
            year,
            status: 'PROCESSING',
            notes,
            processedAt: new Date(),
          },
        });

    for (const emp of employees) {
      const structure = emp.salaryStructures[0];
      const basic = Number(structure.basicSalary);
      const hra = Number(structure.hra);
      const special = Number(structure.specialAllowance);
      const conveyance = Number(structure.conveyance);
      const medical = Number(structure.medicalAllowance);
      const grossMonthly = basic + hra + special + conveyance + medical;

      const pf = Number(structure.pfEmployee);
      const pt = Number(structure.professionalTax);
      const tds = Number(structure.tds);

      // Compute Loss of Pay (LOP) deduction
      const lopDays = Math.min(monthDays, lopDaysMap.get(emp.id) || 0);
      const payableDays = Math.max(0, monthDays - lopDays);
      const perDaySalary = grossMonthly / monthDays;
      const lopDeduction = Math.round(lopDays * perDaySalary * 100) / 100;

      // Expenses to reimburse
      const empExpenses = expenseMap.get(emp.id) || [];
      const reimbursements = empExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

      const totalDeductions = Math.round((pf + pt + tds + lopDeduction) * 100) / 100;
      const netSalary = Math.max(0, Math.round((grossMonthly - totalDeductions + reimbursements) * 100) / 100);

      runTotalGross += grossMonthly;
      runTotalDeductions += totalDeductions;
      runTotalNet += netSalary;

      const createdItem = await prisma.payrollItem.create({
        data: {
          payrollRunId: payrollRun.id,
          employeeId: emp.id,
          monthDays,
          payableDays: new Decimal(payableDays),
          lopDays: new Decimal(lopDays),
          basicSalary: new Decimal(basic),
          hra: new Decimal(hra),
          specialAllowance: new Decimal(special),
          conveyance: new Decimal(conveyance),
          medicalAllowance: new Decimal(medical),
          reimbursements: new Decimal(reimbursements),
          grossSalary: new Decimal(grossMonthly),
          pfDeduction: new Decimal(pf),
          professionalTax: new Decimal(pt),
          tdsDeduction: new Decimal(tds),
          lopDeduction: new Decimal(lopDeduction),
          totalDeductions: new Decimal(totalDeductions),
          netSalary: new Decimal(netSalary),
          isPaid: false,
        },
      });

      if (empExpenses.length > 0) {
        await prisma.expenseClaim.updateMany({
          where: { id: { in: empExpenses.map((e) => e.id) } },
          data: { payrollItemId: createdItem.id },
        });
      }
    }

    const updatedRun = await prisma.payrollRun.update({
      where: { id: payrollRun.id },
      data: {
        totalGross: new Decimal(Math.round(runTotalGross * 100) / 100),
        totalDeductions: new Decimal(Math.round(runTotalDeductions * 100) / 100),
        totalNet: new Decimal(Math.round(runTotalNet * 100) / 100),
        employeeCount: employees.length,
        status: 'DRAFT', // Ready for manager/admin review
      },
      include: {
        payrollItems: {
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                workEmail: true,
              },
            },
          },
        },
      },
    });

    return updatedRun;
  }

  /**
   * Approve or reject payroll run
   */
  public static async updatePayrollStatus(
    organizationId: string,
    payrollRunId: string,
    userId: string,
    status: 'APPROVED' | 'CANCELLED' | 'PROCESSING',
    notes?: string
  ) {
    const run = await prisma.payrollRun.findFirst({
      where: { id: payrollRunId, organizationId },
    });

    if (!run) {
      throw new AppError('Payroll run not found', 404);
    }

    if (run.status === 'PAID') {
      throw new AppError('Cannot alter a finalized paid payroll run', 400);
    }

    const updated = await prisma.payrollRun.update({
      where: { id: payrollRunId },
      data: {
        status,
        notes: notes || run.notes,
        approvedById: status === 'APPROVED' ? userId : run.approvedById,
        approvedAt: status === 'APPROVED' ? new Date() : run.approvedAt,
      },
      include: {
        approvedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return updated;
  }

  /**
   * Disburse/Mark payroll as paid
   */
  public static async markPayrollPaid(
    organizationId: string,
    payrollRunId: string,
    paymentMode: string = 'BANK_TRANSFER',
    paymentRef?: string
  ) {
    const run = await prisma.payrollRun.findFirst({
      where: { id: payrollRunId, organizationId },
    });

    if (!run) {
      throw new AppError('Payroll run not found', 404);
    }

    if (run.status !== 'APPROVED') {
      throw new AppError('Payroll run must be APPROVED before disbursement', 400);
    }

    const now = new Date();

    await prisma.payrollItem.updateMany({
      where: { payrollRunId },
      data: {
        isPaid: true,
        paymentMode,
        paymentRef: paymentRef || `DISB-${Date.now()}`,
        paidAt: now,
      },
    });

    const updatedRun = await prisma.payrollRun.update({
      where: { id: payrollRunId },
      data: {
        status: 'PAID',
        disbursedAt: now,
      },
    });

    // Mark attached expense claims as REIMBURSED
    const items = await prisma.payrollItem.findMany({
      where: { payrollRunId },
      include: {
        employee: { select: { id: true, userId: true, firstName: true } },
        expenseClaims: true,
      },
    });

    const itemIds = items.map((i) => i.id);
    if (itemIds.length > 0) {
      await prisma.expenseClaim.updateMany({
        where: { payrollItemId: { in: itemIds } },
        data: {
          status: ExpenseStatus.REIMBURSED,
          reimbursedAt: now,
        },
      });
    }

    // Send notifications to employees
    for (const item of items) {
      if (item.employee.userId) {
        await NotificationService.notify({
          organizationId,
          userId: item.employee.userId,
          title: 'Payslip Available & Salary Disbursed',
          message: `Your salary for ${run.month}/${run.year} of INR ${item.netSalary} has been credited.`,
          type: NotificationType.PAYROLL,
          link: '/dashboard/payroll',
        });

        if (item.expenseClaims && item.expenseClaims.length > 0) {
          const totalReimbursed = item.expenseClaims.reduce((s, c) => s + Number(c.amount), 0);
          await NotificationService.notify({
            organizationId,
            userId: item.employee.userId,
            title: 'Expense Claims Reimbursed',
            message: `${item.expenseClaims.length} expense claims totaling INR ${totalReimbursed} were disbursed with your payroll.`,
            type: NotificationType.EXPENSE,
            link: '/dashboard/expenses',
          });
        }
      }
    }

    return updatedRun;
  }

  /**
   * List payroll runs with summary metrics
   */
  public static async listPayrollRuns(
    organizationId: string,
    params: { year?: number; status?: string; page: number; limit: number }
  ) {
    const { year, status, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (year) where.year = year;
    if (status) where.status = status;

    const [runs, total] = await Promise.all([
      prisma.payrollRun.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        include: {
          approvedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.payrollRun.count({ where }),
    ]);

    return {
      runs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get specific payroll run by ID with detailed items
   */
  public static async getPayrollRunById(organizationId: string, payrollRunId: string) {
    const run = await prisma.payrollRun.findFirst({
      where: { id: payrollRunId, organizationId },
      include: {
        approvedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        payrollItems: {
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                workEmail: true,
                department: { select: { name: true } },
                designation: { select: { title: true } },
              },
            },
          },
          orderBy: { employee: { employeeCode: 'asc' } },
        },
      },
    });

    if (!run) {
      throw new AppError('Payroll run not found', 404);
    }

    return run;
  }

  /**
   * Get employee payslips or single payslip detail
   */
  public static async listPayslips(
    organizationId: string,
    params: { employeeId?: string; month?: number; year?: number; page: number; limit: number }
  ) {
    const { employeeId, month, year, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      payrollRun: {
        organizationId,
        status: { in: ['APPROVED', 'PAID'] }, // Only show approved or paid payslips
      },
    };

    if (employeeId) where.employeeId = employeeId;
    if (month) where.payrollRun.month = month;
    if (year) where.payrollRun.year = year;

    const [payslips, total] = await Promise.all([
      prisma.payrollItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          payrollRun: {
            select: {
              id: true,
              month: true,
              year: true,
              status: true,
              disbursedAt: true,
            },
          },
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              workEmail: true,
              department: { select: { name: true } },
              designation: { select: { title: true } },
            },
          },
        },
      }),
      prisma.payrollItem.count({ where }),
    ]);

    return {
      payslips,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single payslip by ID
   */
  public static async getPayslipById(
    organizationId: string,
    payrollItemId: string,
    employeeId?: string
  ) {
    const item = await prisma.payrollItem.findFirst({
      where: {
        id: payrollItemId,
        ...(employeeId ? { employeeId } : {}),
        payrollRun: {
          organizationId,
          ...(employeeId ? { status: { in: ['APPROVED', 'PAID'] } } : {}),
        },
      },
      include: {
        payrollRun: {
          select: {
            id: true,
            month: true,
            year: true,
            status: true,
            disbursedAt: true,
            approvedAt: true,
            organization: {
              select: {
                id: true,
                name: true,
                legalName: true,
                email: true,
                phone: true,
                city: true,
                state: true,
                country: true,
                currency: true,
              },
            },
          },
        },
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            workEmail: true,
            phone: true,
            joiningDate: true,
            department: { select: { name: true } },
            designation: { select: { title: true } },
            branch: { select: { name: true, city: true } },
          },
        },
        expenseClaims: {
          select: {
            id: true,
            title: true,
            category: true,
            amount: true,
            currency: true,
            expenseDate: true,
          },
        },
      },
    });

    if (!item) {
      throw new AppError('Payslip not found', 404);
    }

    return item;
  }

  /**
   * Executive Payroll Metrics Summary
   */
  public static async getPayrollSummary(organizationId: string) {
    const currentYear = new Date().getFullYear();

    const [recentRuns, totalEmployeesWithSalary, ytdStats] = await Promise.all([
      prisma.payrollRun.findMany({
        where: { organizationId },
        take: 6,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      prisma.salaryStructure.count({
        where: { organizationId, isActive: true },
      }),
      prisma.payrollRun.aggregate({
        where: { organizationId, year: currentYear, status: 'PAID' },
        _sum: {
          totalGross: true,
          totalDeductions: true,
          totalNet: true,
        },
      }),
    ]);

    const latestRun = recentRuns[0] || null;

    return {
      latestRun,
      totalEmployeesWithSalary,
      ytdDisbursedNet: ytdStats._sum.totalNet || 0,
      ytdGross: ytdStats._sum.totalGross || 0,
      ytdDeductions: ytdStats._sum.totalDeductions || 0,
      recentHistory: recentRuns,
    };
  }
}
