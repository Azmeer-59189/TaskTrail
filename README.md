# TaskTrail

TaskTrail is a lightweight project and task-tracking platform for software teams. Admins and managers use the web dashboard to create projects, organize tasks, assign developers, and monitor delivery. Developers use the Expo mobile app to work through subtasks, post progress updates, log time, report blockers, and move work through code review and testing.

The repository is an npm-workspaces monorepo containing a Next.js dashboard, an Expo React Native application, shared TypeScript domain code, and Supabase migrations.

## Current Features

### Web dashboard

- Admin registration, login, logout, and workspace onboarding
- Role-aware access for admins and managers
- Developer and manager account creation
- Project creation with repository links
- Task creation, prioritization, estimates, due dates, subtasks, and assignment
- Dashboard status metrics and recent tasks
- Task details with subtask progress, time logged, developer updates, and activity

### Mobile application

- Persistent developer authentication
- Assigned-task list and task details
- Required subtask completion
- Progress, blocker, time, and link updates
- GitHub issue or pull-request links
- Controlled workflow: start, block, resume, code review, testing, and complete
- Changes reflected in the manager dashboard

### Backend and security

- Supabase Auth and PostgreSQL
- Row Level Security scoped by workspace and role
- Secure database functions for developer task updates and status transitions
- Automatic profile creation for new Auth users

## Technology

- Next.js 14, React 18, and Tailwind CSS
- Expo SDK 54, React Native 0.81, and React 19
- TypeScript and npm workspaces
- Supabase Auth, PostgreSQL, and Row Level Security
- Shared domain types and formatting utilities in `packages/shared`

## Repository Structure

```text
apps/
  web/                 Next.js admin and manager dashboard
  mobile/              Expo developer application
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
   git clone https://github.com/Azmeer-59189/TaskTrail.git
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

   The web and mobile public values can reference the same Supabase project. Keep `SUPABASE_SERVICE_ROLE_KEY` server-side and never expose it through an `EXPO_PUBLIC_*` or `NEXT_PUBLIC_*` variable.

4. In the Supabase SQL Editor, run the files in `supabase/migrations` in filename order.

   Migration `0004` is retained as historical migration history from the original field-service prototype. Migration `0005` safely supersedes it with the software-team workflow. Existing installations that already ran `0004` should run only `0005` next.

   See [Supabase setup](supabase/README.md) for details.

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
2. Create a project and optionally add its repository URL.
3. Create a developer from the Team page and retain the temporary password.
4. Create a task with subtasks and assign it to the developer.
5. Sign into the mobile app with the developer credentials.
6. Start the task, complete subtasks, log progress or time, and send it to code review.
7. Move the task through testing and completion while monitoring it from the web portal.

## Useful Commands

| Command              | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| `npm run dev:web`    | Start the Next.js development server              |
| `npm run dev:mobile` | Start Expo in offline mode                        |
| `npm run typecheck`  | Type-check all workspaces                         |
| `npm run build`      | Validate the shared package and build the web app |
| `npm run lint`       | Run available workspace linters                   |

## Documentation

- [Supabase setup and migration order](supabase/README.md)

## Current Scope

TaskTrail currently covers the core software-delivery workflow: projects, team accounts, task assignment, subtasks, estimates, time logging, developer updates, blockers, GitHub links, code review, testing, and completion. Realtime subscriptions, notifications, sprint planning, reporting, and production deployment remain future phases.

## Security

- Never commit `.env` or real credentials.
- Treat the Supabase service-role key as a server-only secret.
- Review Row Level Security policies before production deployment.
- Rotate any credential immediately if it is accidentally exposed.
