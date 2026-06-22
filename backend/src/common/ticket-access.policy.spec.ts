import { describe, expect, it } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { Roles } from '../auth/roles';
import { canAccessInternalTicketData, employeeTicketScope, requireServiceDeskRole } from './ticket-access.policy';

const user = (role: string): AuthUser => ({ id: 'user-1', organizationId: 'org-1', email: 'user@example.com', roles: [Roles.Employee, role] });

describe('ticket access policy', () => {
  it('limits employees to tickets they created', () => {
    expect(employeeTicketScope(user(Roles.Employee))).toEqual({ createdById: 'user-1' });
  });

  it.each([Roles.Agent, Roles.ServiceManager, Roles.Admin])('does not add creator scope for %s', (role: string) => {
    expect(employeeTicketScope(user(role))).toEqual({});
  });

  it('blocks employees from service desk actions', () => {
    expect(() => requireServiceDeskRole(user(Roles.Employee))).toThrow(ForbiddenException);
  });

  it.each([Roles.Agent, Roles.ServiceManager, Roles.Admin])('allows %s to perform service desk actions', (role: string) => {
    expect(() => requireServiceDeskRole(user(role))).not.toThrow();
  });

  it('keeps internal ticket data hidden from employees', () => {
    expect(canAccessInternalTicketData(user(Roles.Employee))).toBe(false);
    expect(canAccessInternalTicketData(user(Roles.Agent))).toBe(true);
  });
});
