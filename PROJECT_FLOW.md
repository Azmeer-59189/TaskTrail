# TaskTrail Complete Project Flow

This file describes the full user and system flow before implementation starts.

## 1. Account And Workspace Flow

### Web

1. User visits TaskTrail web app.
2. User signs up as the first admin.
3. User creates a company workspace.
4. User lands on dashboard with empty-state actions.
5. Admin invites workers or creates demo workers.

### Data Created

- User account
- Workspace
- Membership record
- Role assignment

### Tech Involved

- Next.js web app
- Supabase Auth
- PostgreSQL tables
- Row Level Security policies

## 2. Team Management Flow

### Web

1. Admin opens Team page.
2. Admin creates or invites a worker.
3. Admin assigns role: manager or worker.
4. Team member appears in user list.

### Mobile

1. Worker signs in.
2. Worker sees only assigned jobs.

### Tech Involved

- Supabase Auth
- Role based application guards
- Workspace membership table

## 3. Customer And Site Flow

### Web

1. Manager opens Customers page.
2. Manager creates customer profile.
3. Manager adds one or more sites or service locations.
4. Sites become selectable during job creation.

### Data Created

- Customer
- Site
- Address and optional coordinates

### Tech Involved

- PostgreSQL
- Optional geocoding later
- Form validation

## 4. Job Creation Flow

### Web

1. Manager opens Jobs page.
2. Manager clicks Create Job.
3. Manager selects customer and site.
4. Manager enters title, description, date, time window, priority, and assignee.
5. Manager adds checklist items.
6. Manager saves the job.
7. Job appears on dashboard and worker mobile app.

### Job Statuses

- Draft
- Scheduled
- Assigned
- In Progress
- Blocked
- Completed
- Reviewed
- Cancelled

### Tech Involved

- Next.js forms
- Server actions or API routes
- Supabase database insert/update
- Shared validation schema

## 5. Worker Mobile Job Flow

### Mobile

1. Worker signs in.
2. Worker sees today's assigned jobs.
3. Worker opens job detail.
4. Worker taps Start / Check In.
5. App captures GPS location and timestamp.
6. Worker completes checklist.
7. Worker uploads before/after photos.
8. Worker adds notes.
9. Worker collects customer signature if required.
10. Worker taps Complete Job.
11. Job status updates for manager in web app.

### Tech Involved

- Expo React Native
- Expo Location
- Expo Image Picker or Camera
- Signature capture component
- Supabase Storage
- Supabase Realtime later

## 6. Manager Review Flow

### Web

1. Manager opens completed job.
2. Manager reviews check-in time, check-out time, GPS points, photos, checklist, notes, and signature.
3. Manager approves job.
4. Job becomes Reviewed.
5. Completion report is available.

### Tech Involved

- Web dashboard views
- File preview from Supabase Storage
- Report page
- Optional PDF generation later

## 7. Reporting Flow

### Web

1. Manager opens Reports.
2. Manager filters by date range, worker, customer, status, or priority.
3. Manager views job completion metrics.
4. Manager exports report later.

### Metrics

- Total jobs
- Completed jobs
- Open jobs
- Blocked jobs
- Average completion time
- Jobs by worker
- Jobs by customer

### Tech Involved

- PostgreSQL queries
- Dashboard charts
- Optional export service later
