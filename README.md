# AI-ITSM Platform

AI-first, lightweight IT service management platform for small and mid-sized organizations. The product is being designed for portable deployment on developer laptops, public cloud infrastructure, and customer-managed on-premises environments.

## Current status

The PostgreSQL foundation and the first end-to-end incident-management slice are operational.

Completed in the current MVP:

- React and TypeScript web application
- NestJS and TypeScript REST API
- Prisma integration with PostgreSQL
- Password login with bcrypt hashing
- JWT access tokens and secure HTTP-only refresh cookies
- One-hour inactivity timeout and twelve-hour maximum session
- Organization-level data isolation
- Incident creation, listing, details, editing, assignment, status, resolution, comments, and work notes
- Sequential incident numbers such as `INC000002`
- Assignment groups and group membership
- Related child incidents, changes, and problems
- Ticket activities and audit logging
- Search and status filtering
- Role-based permissions
- Reusable closed-ticket policy: only Admin can reopen a closed ticket
- Dormant attachment-storage interface and configuration endpoint
- Backend Docker and Compose preparation; no image is currently built or deployed

The service request, problem, change, CMDB, knowledge, reporting, and AI interfaces are not yet implemented in the application layer. Their original database tables are present.

## Architecture

```text
React frontend (port 5173)
        |
        | HTTPS / JSON API
        v
NestJS backend (port 3000)
        |
        | Prisma
        v
PostgreSQL (ai_itsm)
```

Planned attachment architecture stores metadata in PostgreSQL and file content in configurable object storage such as Amazon S3, Azure Blob, or MinIO. Attachments remain disabled until a provider is configured.

## Repository layout

```text
backend/     NestJS API, Prisma schema, and manual database migrations
frontend/    React/Vite application
database/    Original schema documentation, exports, and PostgreSQL backup
docs/        Product and permission documentation
compose.yaml Prepared backend container definition
```

## Prerequisites

- Node.js 22 or newer
- npm
- PostgreSQL with the `ai_itsm` database restored
- Windows users may need `npm.cmd` instead of `npm` because of PowerShell execution policy

## Backend setup

```powershell
cd backend
npm.cmd install
Copy-Item .env.example .env
```

Configure `backend/.env`:

```env
PORT=3000
DATABASE_URL="postgresql://postgres:URL_ENCODED_PASSWORD@localhost:5432/ai_itsm?schema=public"
JWT_SECRET="replace-with-at-least-32-random-characters"
CORS_ORIGIN="http://localhost:5173"
ATTACHMENTS_ENABLED=false
```

Never commit `.env`. It is excluded by `.gitignore`.

Apply the current manual migrations in order when preparing an existing v1 database:

```powershell
npx.cmd prisma db execute --file prisma/manual/001_assignment_groups.sql --schema prisma/schema.prisma
npx.cmd prisma db execute --file prisma/manual/002_ticket_relationships.sql --schema prisma/schema.prisma
npx.cmd prisma db execute --file prisma/manual/003_it_service_manager_role.sql --schema prisma/schema.prisma
npx.cmd prisma db execute --file prisma/manual/004_admin_console.sql --schema prisma/schema.prisma
npx.cmd prisma db execute --file prisma/manual/005_group_based_roles.sql --schema prisma/schema.prisma
npx.cmd prisma db execute --file prisma/manual/006_sla_foundation.sql --schema prisma/schema.prisma
npx.cmd prisma db execute --file prisma/manual/007_normalize_service_request_type.sql --schema prisma/schema.prisma
npx.cmd prisma generate
```

Set an initial user password interactively:

```powershell
npm.cmd run auth:set-password
```

Start the API:

```powershell
npm.cmd run start:dev
```

Health check: `GET http://localhost:3000/api/health`

## Frontend setup

Open a second terminal:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:5173`.

## Roles and access grants

Every active user receives the `EMPLOYEE` baseline. Elevated roles are normally granted to assignment groups, and users inherit the union of roles from all groups they belong to. Exceptional direct grants are retained for controlled or emergency administration. The legacy `users.role_id` field remains temporarily for rollback compatibility but is no longer the authorization source.

- `EMPLOYEE`: creates tickets and sees their own records and public comments.
- `IT_AGENT`: works organization queues, assignments, work notes, and related items.
- `IT_SERVICE_MANAGER`: IT Agent capabilities plus service oversight, escalations, approvals, and reporting as those features are added.
- `ADMIN`: platform administration and the exclusive ability to reopen closed tickets.

See [roles and permissions](docs/roles-and-permissions.md) for the current permission matrix and Admin Console roadmap.

## Current API

Authentication:

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

Incidents:

- `POST /api/incidents`
- `GET /api/incidents`
- `GET /api/incidents/:id`
- `PATCH /api/incidents/:id`
- `PATCH /api/incidents/:id/assignment`
- `PATCH /api/incidents/:id/status`
- `PATCH /api/incidents/:id/resolve`
- `POST /api/incidents/:id/comments`

Supporting endpoints:

- `GET /api/assignment-groups`
- `GET /api/tickets/:ticketId/related-items`
- `POST /api/tickets/:ticketId/related-items`
- `GET /api/attachments/configuration`
- `GET /api/admin/slas`
- `POST /api/admin/slas`

## SLA foundation

SLA policies are organization-specific and versioned. New incidents snapshot the matching response and resolution targets so later policy changes do not rewrite historical performance. First work notes record response performance; incident resolution records resolution performance. The current calculation engine supports 24×7 elapsed-time calendars. Custom business-hours schedules, holidays, and pause/resume processing are modeled but must be completed before those calendar types are enabled.

## Verification

```powershell
cd backend
npm.cmd run build

cd ../frontend
npm.cmd run build
```

Both builds must pass before committing.

## Deployment direction

Development remains local to avoid unnecessary cloud cost. The prepared backend image is provider-neutral and can later connect to managed cloud PostgreSQL or customer-managed on-premises PostgreSQL through `DATABASE_URL`.

The production path is:

```text
Local development -> Dockerized MVP -> low-cost demonstration environment -> client deployment
```

Before production use, the project still requires automated tests, managed migrations, refresh-token revocation, rate limiting, monitoring, backups, HTTPS, secret management, and a production deployment pipeline.

## Next milestones

1. Finish incident workflow testing and inverse related-item display.
2. Build Admin Console v1 for users, roles, departments, groups, memberships, and session settings.
3. Implement service requests.
4. Implement problems and changes/approvals.
5. Implement CMDB and knowledge management.
6. Add reporting, SLA management, notifications, attachments, and AI capabilities.
