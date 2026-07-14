# Supabase Setup

This folder contains TaskTrail database migrations, Row Level Security policies, and seed-data notes.

## Migration Order

Run migrations through the Supabase SQL Editor in filename order:

1. `0001_initial_schema.sql` creates the original workspace, membership, and task records.
2. `0002_auth_and_rls.sql` adds Auth integration, workspace bootstrap, and access policies.
3. `0003_jobs_mvp.sql` adds secure assigned-task transitions.
4. `0004_proof_of_work.sql` is retained as migration history from the field-service prototype.
5. `0005_software_workflow.sql` adds projects and software-delivery fields, developer updates, code-review/testing states, and replaces the old worker workflow.
6. `0006_realtime.sql` publishes task, update, checklist, event, and project changes for live dashboard and mobile refreshes.
7. `0007_notifications.sql` adds private in-app notifications for assignments, status changes, and developer updates.

If `0001` through `0006` are already applied, run only `0007` now. Do not rerun or delete `0004` from an existing database.

Migration `0005` removes the old field-proof policies and function, but intentionally leaves the private `job-proof` bucket and any existing objects intact. This avoids destructive data loss during the product pivot.

After applying migrations or changing environment variables, restart the web and mobile development servers.

## Authentication Configuration

In **Authentication -> URL Configuration**, set the local site URL to `http://localhost:3000`.

The root `.env` file must contain the Supabase URL and public anonymous key for both clients. The service-role key is used only by trusted web server actions. Never expose `SUPABASE_SERVICE_ROLE_KEY` through a browser-prefixed or mobile environment variable.

## First End-to-End Test

1. Sign in to the web portal as the workspace admin.
2. Open **Projects** and create a software project.
3. Open **Team** and create a developer account. Keep the temporary password shown there.
4. Open **Tasks**, create a task with subtasks, and assign it to the developer.
5. Sign in to the mobile app with the developer email and temporary password.
6. Start the task, complete subtasks, add progress or time updates, and send it to code review.
7. Confirm that status, progress, logged time, blockers, and updates appear on the web task detail page.
