# TaskTrail

TaskTrail is a field-operations platform for service teams. Admins and managers use the web dashboard to organize customers, sites, workers, and jobs. Field workers use the Expo mobile app to receive assignments, update job status, and complete required checklists.

The repository is an npm-workspaces monorepo containing a Next.js dashboard, an Expo React Native application, shared TypeScript domain code, and Supabase database migrations.

## Current Features

### Web dashboard

- Admin registration, login, logout, and workspace onboarding
- Role-aware access for admins and managers
- Worker and manager account creation
- Customer and service-site management
- Job scheduling, prioritization, and assignment
- Dashboard status metrics and recent jobs
- Checklist progress on the job list
- Job details with checklist completion timestamps and activity history

### Mobile application

- Persistent worker authentication
- Assigned-job list and job details
- Required checklist completion
- Controlled job transitions: start, block, resume, and complete
- Changes reflected in the manager dashboard

### Backend and security

- Supabase Auth and PostgreSQL
- Row Level Security scoped by workspace and role
- Secure database function for worker job transitions
- Automatic profile creation for new Auth users

## Technology

- Next.js 14, React 18, Tailwind CSS
- Expo SDK 54, React Native 0.81, React 19
- TypeScript and npm workspaces
- Supabase Auth, PostgreSQL, and Row Level Security
- Shared types and formatting utilities in `packages/shared`

## Repository Structure

```text
apps/
  web/                 Next.js admin and manager dashboard
  mobile/              Expo worker application
packages/
  shared/              Shared domain types and utilities
supabase/
  migrations/          Ordered database migrations
  seed/                Seed-data notes and future helpers
```

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- A Supabase project
- Expo Go compatible with Expo SDK 54 for device testing

## Local Setup

1. Clone the repository and install dependencies.

   ```bash
   git clone <repository-url>
   cd TaskTrail
   npm install
   ```

2. Create the local environment file.

   PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   macOS or Linux:

   ```bash
   cp .env.example .env
   ```

3. Add the Supabase values to `.env`.

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   EXPO_PUBLIC_SUPABASE_URL=
   EXPO_PUBLIC_SUPABASE_ANON_KEY=
   ```

   The web and mobile public values can reference the same Supabase project. Keep `SUPABASE_SERVICE_ROLE_KEY` server-side and never place it in an `EXPO_PUBLIC_*` or `NEXT_PUBLIC_*` variable.

4. In the Supabase SQL Editor, run these migrations in order:

   1. `supabase/migrations/0001_initial_schema.sql`
   2. `supabase/migrations/0002_auth_and_rls.sql`
   3. `supabase/migrations/0003_jobs_mvp.sql`

   See [Supabase setup](supabase/README.md) for additional details.

5. In Supabase Authentication URL Configuration, set the local site URL to `http://localhost:3000`.

## Running the Applications

Start the web dashboard:

```bash
npm run dev:web
```

Open `http://localhost:3000`.

Start the Expo mobile application in a second terminal:

```bash
npm run dev:mobile
```

Scan the QR code with Expo Go. If Metro has stale cached data, run:

```bash
npm run start:clean -w @tasktrail/mobile
```

## First End-to-End Workflow

1. Register an admin account on the web and create a workspace.
2. Create a customer and at least one service site.
3. Create a worker from the Team page and retain the temporary password.
4. Create a job with checklist items and assign it to that worker.
5. Sign into the mobile app with the worker credentials.
6. Start the job, complete its checklist, and mark it complete.
7. Refresh the web Jobs page to review status, progress, timestamps, and activity.

## Useful Commands

| Command              | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| `npm run dev:web`    | Start the Next.js development server              |
| `npm run dev:mobile` | Start Expo in offline mode                        |
| `npm run typecheck`  | Type-check all workspaces                         |
| `npm run build`      | Validate the shared package and build the web app |
| `npm run lint`       | Run available workspace linters                   |

## Documentation

- [Project overview](PROJECT_OVERVIEW.md)
- [Architecture](ARCHITECTURE.md)
- [Complete product flow](PROJECT_FLOW.md)
- [Data model](DATA_MODEL.md)
- [Technology choices](TECH_STACK.md)
- [Build phases and roadmap](BUILD_PHASES.md)
- [Decision log](DECISIONS.md)

These files are intentionally versioned because they document product scope, architecture decisions, and planned implementation phases.

## Current Scope

TaskTrail currently covers the Phase 3 jobs MVP and checklist tracking. Photo proof, notes, signatures, GPS check-in, manager review, reports, realtime subscriptions, and production deployment are planned follow-up phases.

## Security

- Never commit `.env` or real credentials.
- Treat the Supabase service-role key as a server-only secret.
- Review Row Level Security policies before production deployment.
- Rotate any credential immediately if it is accidentally exposed.
