import { RoleApplication, User, RequestedRole, ApplicationStatus } from '@prisma/client';

export type ApplicationWithUser = RoleApplication & {
  user: User;
};

export type ApplicationAction = 'approve' | 'reject';

export type ApplicationActionRequest = {
  action: ApplicationAction;
  applicationId: string;
}; 