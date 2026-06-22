import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { Roles, serviceDeskRoles } from '../auth/roles';

export function requireServiceDeskRole(user: AuthUser) {
  if (!user.roles.some((role) => serviceDeskRoles.includes(role))) {
    throw new ForbiddenException('This action requires a service desk role');
  }
}

export function employeeTicketScope(user: AuthUser): { createdById: string } | object {
  return canAccessInternalTicketData(user) ? {} : { createdById: user.id };
}

export function canAccessInternalTicketData(user: AuthUser) {
  return user.roles.some((role) => serviceDeskRoles.includes(role));
}
