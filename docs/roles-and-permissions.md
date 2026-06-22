# Roles and permissions

## EMPLOYEE

- Create incidents and comments.
- View only tickets they created.
- Cannot view internal work notes, related items, assignment controls, or operational queues.

## IT_AGENT

- Work organization tickets.
- Update ticket details, status, assignment group, and assignee.
- Add internal work notes and related items.
- Move tickets between assignment groups.
- Cannot reopen closed tickets or administer platform configuration.

## IT_SERVICE_MANAGER

- All IT agent operational capabilities.
- Oversee all service queues and assignment groups.
- Manage escalations, operational reporting, and service approvals as those modules are added.
- Cannot reopen closed tickets or administer platform-wide security configuration.

## ADMIN

- All operational capabilities.
- Manage users, roles, groups, departments, and platform configuration.
- Reopen closed tickets.

The backend must enforce permissions. Frontend visibility is a usability layer, not a security boundary.

## Role assignment model

- Every active user receives `EMPLOYEE` access automatically.
- `assignment_group_roles` grants elevated roles to groups.
- Users inherit roles through `assignment_group_members`.
- `user_roles` supports exceptional direct grants and preserves existing access during migration.
- Effective JWT roles are the union of the Employee baseline, group grants, and direct grants.
- The legacy `users.role_id` column is retained only for rollback compatibility and should not be used for new authorization decisions.

## Admin Console roadmap

- Users, roles, departments, assignment groups, and memberships.
- Organization settings and lookup values.
- Session policy: inactivity timeout and maximum session duration.
- Attachment storage provider, quotas, file limits, and retention.
- Audit-log access and security configuration.
