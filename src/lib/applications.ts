import { PrismaClient, RoleApplication, User, RequestedRole, ApplicationStatus } from '@prisma/client';

const prisma = new PrismaClient();

export type ApplicationWithUser = RoleApplication & {
  user: User;
};

export async function getApplications(): Promise<ApplicationWithUser[]> {
  return prisma.roleApplication.findMany({
    include: {
      user: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function approveApplication(id: string): Promise<ApplicationWithUser> {
  const application = await prisma.roleApplication.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!application) {
    throw new Error('Application not found');
  }

  if (application.status !== ApplicationStatus.PENDING) {
    throw new Error('Application is not pending');
  }

  // Update application status
  const updatedApplication = await prisma.roleApplication.update({
    where: { id },
    data: {
      status: ApplicationStatus.APPROVED,
    },
    include: { user: true },
  });

  // Update user roles
  await prisma.user.update({
    where: { id: application.userId },
    data: {
      roles: {
        push: application.requestedRole,
      },
    },
  });

  return updatedApplication;
}

export async function rejectApplication(id: string): Promise<ApplicationWithUser> {
  const application = await prisma.roleApplication.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!application) {
    throw new Error('Application not found');
  }

  if (application.status !== ApplicationStatus.PENDING) {
    throw new Error('Application is not pending');
  }

  return prisma.roleApplication.update({
    where: { id },
    data: {
      status: ApplicationStatus.REJECTED,
    },
    include: { user: true },
  });
} 