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

## Admin Console roadmap

- Users, roles, departments, assignment groups, and memberships.
- Organization settings and lookup values.
- Session policy: inactivity timeout and maximum session duration.
- Attachment storage provider, quotas, file limits, and retention.
- Audit-log access and security configuration.
