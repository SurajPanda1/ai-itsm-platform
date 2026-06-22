import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from '@jest/globals';
import { AuthUser } from '../auth/auth-user';
import { Roles } from '../auth/roles';
import { enforceClosedTicketPolicy } from './ticket-status.policy';

const user = (role: string): AuthUser => ({
  id: 'user-id',
  organizationId: 'organization-id',
  email: 'user@example.com',
  roles: [Roles.Employee, role],
});

describe('closed ticket policy', () => {
  it.each([Roles.Employee, Roles.Agent, Roles.ServiceManager])(
    'prevents %s from reopening a closed ticket',
    (role: string) => {
      expect(() => enforceClosedTicketPolicy(user(role), 'CLOSED', 'OPEN')).toThrow(
        ForbiddenException,
      );
    },
  );

  it('allows an admin to reopen a closed ticket', () => {
    expect(() => enforceClosedTicketPolicy(user(Roles.Admin), 'CLOSED', 'OPEN')).not.toThrow();
  });

  it('allows service desk roles to change a ticket that is not closed', () => {
    expect(() =>
      enforceClosedTicketPolicy(user(Roles.Agent), 'IN_PROGRESS', 'RESOLVED'),
    ).not.toThrow();
  });
});
