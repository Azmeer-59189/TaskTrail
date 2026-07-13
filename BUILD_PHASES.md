# TaskTrail Build Phases

## Phase 0: Project Foundation

Goal: Set up the codebase and shared conventions.

Steps:

1. Create monorepo structure.
2. Add web app.
3. Add mobile app.
4. Add shared package.
5. Configure TypeScript.
6. Add linting and formatting.
7. Create initial README and environment templates.

Tech:

- npm or pnpm workspaces
- Next.js
- Expo
- TypeScript

Output:

- Empty but runnable web and mobile apps.

## Phase 1: Product Shell And Design System

Goal: Create the basic visual language and navigation.

Steps:

1. Build web dashboard shell.
2. Build mobile app shell.
3. Add common navigation.
4. Add buttons, inputs, badges, status chips, and layout primitives.
5. Add sample mock data.

Tech:

- Tailwind CSS for web
- NativeWind or React Native styles for mobile
- lucide-react for web icons

Output:

- Clickable UI prototype with mock data.

## Phase 2: Authentication And Workspace

Goal: Users can sign in and belong to a workspace.

Steps:

1. Create Supabase project.
2. Add auth to web.
3. Add auth to mobile.
4. Create database schema for profiles, workspaces, and memberships.
5. Add role guards.

Tech:

- Supabase Auth
- Supabase PostgreSQL
- Row Level Security

Output:

- Real login and role-aware app access.

## Phase 3: Jobs MVP

Goal: Managers can create jobs and workers can complete them.

Steps:

1. Build customers and sites tables.
2. Build jobs table.
3. Create web job list.
4. Create web job creation form.
5. Create mobile assigned jobs list.
6. Create mobile job detail.
7. Add status updates.

Tech:

- Next.js
- Expo
- Supabase queries
- Shared Zod schemas

Output:

- End-to-end job assignment flow.

## Phase 4: Proof Of Work

Goal: Workers can prove what happened on site.

Steps:

1. Add GPS check-in/check-out.
2. Add checklist completion.
3. Add photo upload.
4. Add job notes.
5. Add signature capture.
6. Show proof on web job detail.

Tech:

- Expo Location
- Expo Image Picker
- Supabase Storage
- Signature capture package

Output:

- Completed job includes location, photos, checklist, notes, and signature.

## Phase 5: Review And Reporting

Goal: Managers can review completed work and see performance.

Steps:

1. Build completed jobs review view.
2. Add reviewed status.
3. Build report page.
4. Add filtering.
5. Add basic charts.
6. Add completion report page.

Tech:

- PostgreSQL queries
- Recharts
- Web report layout

Output:

- Manager can track job outcomes and team performance.

## Phase 6: Production Hardening

Goal: Make the app reliable enough for real users.

Steps:

1. Add stronger error handling.
2. Add loading and empty states.
3. Add optimistic updates where useful.
4. Add tests for critical flows.
5. Add security review for RLS policies.
6. Add deployment configuration.

Tech:

- Playwright or Vitest for web
- Expo testing tools later
- Vercel
- Expo Application Services

Output:

- Deployable MVP.

## Phase 7: Advanced Features

Goal: Add features that make TaskTrail feel premium.

Options:

1. Push notifications.
2. Offline mode.
3. Recurring jobs.
4. Route optimization.
5. Invoice generation.
6. Customer portal.
7. AI-generated completion summaries.
8. AI photo issue detection later.

Output:

- Stronger product differentiation.
