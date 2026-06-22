export const Roles = {
  Employee: 'EMPLOYEE',
  Agent: 'IT_AGENT',
  ServiceManager: 'IT_SERVICE_MANAGER',
  Admin: 'ADMIN',
} as const;

export const serviceDeskRoles: string[] = [
  Roles.Agent,
  Roles.ServiceManager,
  Roles.Admin,
];
