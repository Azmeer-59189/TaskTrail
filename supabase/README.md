# Supabase Setup

This folder contains TaskTrail database migrations, policies, storage setup notes, and seed data.

## Phase 3 Setup

Authentication, workspace onboarding, team management, customers, sites, job assignment, and mobile job actions are implemented. To activate them in your Supabase project:

1. Open the Supabase dashboard for the project configured in the root `.env` file.
2. Open **SQL Editor** and create a new query.
3. Run `migrations/0001_initial_schema.sql` if the initial tables have not been created yet.
4. Run `migrations/0002_auth_and_rls.sql` to add the Auth profile trigger, workspace bootstrap function, and row-level security policies.
5. Run `migrations/0003_jobs_mvp.sql` to add the secure mobile job-status transition function.
6. In **Authentication -> URL Configuration**, set the local site URL to `http://localhost:3000`.
7. Restart the web and mobile development servers after applying migrations or changing environment variables.

If migrations `0001` and `0002` were already applied, run only `0003`.

## First End-to-End Test

1. Sign in to the web portal as the workspace admin.
2. Open **Customers**, create a customer, then add a site for that customer.
3. Open **Team** and create a worker. Keep the temporary password shown there.
4. Open **Jobs**, create a job, and assign it to the worker.
5. Sign in to the mobile app with the worker email and temporary password.
6. Open the assigned job, complete its required checklist items, and use the status buttons to start and complete it.

Never place `SUPABASE_SERVICE_ROLE_KEY` in a mobile or browser-prefixed environment variable.

## Planned Setup Order

1. Create Supabase project.
2. Add environment variables to the repository root `.env` file.
3. Run the database migrations in filename order.
4. Create storage buckets for job photos and signatures during Phase 4.
5. Add seed data for local/demo use.
