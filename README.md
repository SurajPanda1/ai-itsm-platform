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
- Per-organization branding with client logo, favicon, portal text, colours, and Nextris Dark/Light/System themes
- Admin-configured attachment storage with live connection testing
- Ticket attachment upload, listing, download, deletion, metadata, permissions, and audit logging
- Storage adapters for local/on-premises filesystems, Amazon S3, Azure Blob, Google Cloud Storage, and MinIO/S3-compatible services
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

Attachment metadata is stored in PostgreSQL while file content is stored through the organization's configured provider. Files are isolated by organization and ticket using `<organization-id>/<ticket-id>/...` storage keys. Branding assets use `<organization-id>/branding/...`. Attachments remain unavailable until an administrator successfully tests and enables storage.

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
```

Storage provider, location, file-size limit, branding, and theme are configured per organization in **Admin Console -> Branding & Storage**. Credentials are not stored in PostgreSQL:

- AWS S3 uses the standard AWS credential chain or an ECS/EC2 IAM role.
- Azure Blob uses `AZURE_STORAGE_CONNECTION_STRING`, or `AZURE_STORAGE_ACCOUNT_URL` with managed identity.
- Google Cloud Storage uses Application Default Credentials or `GOOGLE_APPLICATION_CREDENTIALS` locally.
- MinIO uses `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`.
- Local/on-premises storage uses a backend-accessible absolute folder path.

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
npx.cmd prisma db execute --file prisma/manual/008_sla_lifecycle.sql --schema prisma/schema.prisma
npx.cmd prisma db execute --file prisma/manual/009_organization_settings.sql --schema prisma/schema.prisma
npx.cmd prisma db execute --file prisma/manual/010_ticket_attachments.sql --schema prisma/schema.prisma
npx.cmd prisma db execute --file prisma/manual/011_nextris_dark_theme.sql --schema prisma/schema.prisma
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
- `GET /api/tickets/:ticketId/attachments`
- `POST /api/tickets/:ticketId/attachments`
- `GET /api/tickets/:ticketId/attachments/:attachmentId/download`
- `DELETE /api/tickets/:ticketId/attachments/:attachmentId`
- `GET /api/branding`
- `GET /api/branding/assets/:organizationId/:kind`
- `GET /api/admin/organization-settings`
- `PATCH /api/admin/organization-settings`
- `POST /api/admin/organization-settings/test-storage`
- `POST /api/admin/organization-settings/branding/:kind`
- `DELETE /api/admin/organization-settings/branding/:kind`
- `GET /api/admin/slas`
- `POST /api/admin/slas`

## SLA foundation

SLA policies are organization-specific and versioned. New incidents snapshot the matching response and resolution targets so later policy changes do not rewrite historical performance. First work notes record response performance; incident resolution records resolution performance. The engine supports 24×7 and timezone-aware business-hours calendars, holiday exclusion, Awaiting Customer pause/resume, live countdowns, and scheduled at-risk/breach evaluation. The initial Admin calendar form creates Monday–Friday 09:00–17:00 calendars; a richer per-day and holiday editor remains planned.

## Verification

```powershell
cd backend
npm.cmd run build

cd ../frontend
npm.cmd run build
```

Both builds must pass before committing.

Run the self-cleaning SLA database verification when changing SLA persistence or lifecycle behavior:

```powershell
cd backend
npm.cmd run verify:sla
```

The verification creates temporary SLA records, checks start/pause/resume events, and removes all temporary data before exiting.

## Deployment direction

Development remains local to avoid unnecessary cloud cost. The prepared backend image is provider-neutral and can later connect to managed cloud PostgreSQL or customer-managed on-premises PostgreSQL through `DATABASE_URL`.

The production path is:

```text
Local development -> Dockerized MVP -> low-cost demonstration environment -> client deployment
```

Before production use, the project still requires automated tests, managed migrations, refresh-token revocation, rate limiting, monitoring, backups, HTTPS, secret management, and a production deployment pipeline.

## Next milestones

1. Add browser-level regression tests for incident, attachment, branding, and Admin Console workflows.
2. Build the service-request module and request catalogue.
3. Implement problems and changes/approvals.
4. Implement CMDB and knowledge management.
5. Add the Analytics Console, notifications, and AI-assisted operations.
