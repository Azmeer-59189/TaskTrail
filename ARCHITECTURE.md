# TaskTrail Architecture

TaskTrail is organized as a TypeScript monorepo with separate applications for the manager web dashboard and the worker mobile app.

## Repository Layout

```text
apps/
  web/              Next.js dashboard for admins and managers
  mobile/           Expo React Native app for workers
packages/
  shared/           Shared domain types, constants, and validation
supabase/
  migrations/       Database schema and policy migrations
  seed/             Demo data and local setup helpers
```

## Application Boundaries

### Web App

The web app owns manager workflows:

- Dashboard metrics
- Team management
- Customers and sites
- Job creation and assignment
- Job review and reporting

### Mobile App

The mobile app owns field worker workflows:

- Assigned jobs list
- Job detail
- Check-in/check-out
- Checklist completion
- Photo proof
- Notes and signatures

### Shared Package

The shared package owns product language and cross-platform contracts:

- Role names
- Job statuses
- Priority names
- TypeScript types
- Zod schemas later
- Formatting helpers later

## Data Boundary

Supabase will provide:

- Authentication
- PostgreSQL database
- Row Level Security
- File storage for job photos and signatures
- Realtime status updates later

All business records should be scoped to a workspace. Workers should only access jobs assigned to them. Managers and admins should access all records inside their workspace.

## First Implementation Order

1. Shared domain package
2. Web shell with mock data
3. Mobile shell with mock data
4. Supabase schema
5. Auth and workspace membership
6. Real job flow
