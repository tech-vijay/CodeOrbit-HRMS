import { Employee, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ConflictError, NotFoundError } from '../../utils/errors';

export async function resolveCurrentEmployeeProfile(
  organizationId: string,
  userId: string
): Promise<Employee> {
  const linkedEmployee = await prisma.employee.findFirst({
    where: { organizationId, userId },
  });
  if (linkedEmployee) return linkedEmployee;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, phone: true },
  });
  if (!user) throw new NotFoundError('Authenticated user not found');

  const emailEmployee = await prisma.employee.findFirst({
    where: {
      organizationId,
      workEmail: { equals: user.email, mode: 'insensitive' },
    },
  });

  if (emailEmployee) {
    if (emailEmployee.userId && emailEmployee.userId !== userId) {
      throw new ConflictError('Employee profile with this email is already linked to another user');
    }

    const linked = await prisma.employee.updateMany({
      where: { id: emailEmployee.id, organizationId, userId: null },
      data: { userId },
    });
    if (linked.count === 1) {
      return (await prisma.employee.findUniqueOrThrow({ where: { id: emailEmployee.id } }));
    }

    const concurrentlyLinkedEmployee = await prisma.employee.findFirst({
      where: { organizationId, userId },
    });
    if (concurrentlyLinkedEmployee) return concurrentlyLinkedEmployee;
    throw new ConflictError('Employee profile could not be linked to the authenticated user');
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.update({
        where: { id: organizationId },
        data: { employeeCodeCounter: { increment: 1 } },
        select: { employeeCodePrefix: true, employeeCodeCounter: true },
      });

      return tx.employee.create({
        data: {
          organizationId,
          userId,
          employeeCode: `${organization.employeeCodePrefix}-${String(organization.employeeCodeCounter - 1).padStart(4, '0')}`,
          firstName: user.firstName,
          lastName: user.lastName,
          workEmail: user.email,
          phone: user.phone,
          joiningDate: new Date(),
          status: 'ACTIVE',
          employmentType: 'FULL_TIME',
        },
      });
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      throw error;
    }

    const concurrentlyCreatedEmployee = await prisma.employee.findFirst({
      where: { organizationId, userId },
    });
    if (concurrentlyCreatedEmployee) return concurrentlyCreatedEmployee;
    throw error;
  }
}
