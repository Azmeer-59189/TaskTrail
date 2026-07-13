# TaskTrail Project Overview

TaskTrail is a mobile and web based field operations product for small service teams. The web app is used by admins and managers to create, assign, monitor, and review jobs. The mobile app is used by field workers to view assigned work, check in on site, upload proof, complete checklists, collect signatures, and submit completion notes.

## Product Goal

Build a practical job tracking system that helps teams answer four questions quickly:

1. What work needs to be done today?
2. Who is responsible for each job?
3. What is the live status of the work?
4. What proof exists that the work was completed?

## Target Users

- Admin: owns the company workspace, users, settings, and billing later.
- Manager or dispatcher: creates jobs, assigns workers, watches progress, and reviews reports.
- Field worker: uses the mobile app to complete jobs on site.
- Customer or client contact: signs completion reports and may receive job summaries later.

## Core Workflow

1. Admin creates a company workspace.
2. Admin invites managers and workers.
3. Manager creates a customer or site.
4. Manager creates a job with location, schedule, checklist, priority, and assigned worker.
5. Worker receives the job in the mobile app.
6. Worker checks in when arriving on site.
7. Worker follows the checklist and uploads photos or notes.
8. Worker collects a customer signature when needed.
9. Worker marks the job complete.
10. Manager reviews completion proof from the web dashboard.
11. System generates a completion report.

## MVP Feature Set

- Email/password authentication
- Role based access: admin, manager, worker
- Web dashboard
- Mobile worker app
- Customer and site management
- Job creation and assignment
- Worker job list
- Job status tracking
- GPS check-in/check-out
- Photo proof uploads
- Checklist completion
- Completion notes
- Customer signature capture
- Basic PDF-style completion report view

## Later Feature Ideas

- Push notifications
- Offline mobile mode
- Route planning
- Recurring jobs
- Invoices
- Timesheets
- Inventory or tools tracking
- Customer portal
- AI summary of job notes and uploaded photos
- Advanced analytics
- Multi-language support

## First Build Principle

The first version should be useful before it is clever. We will prioritize the end-to-end job flow over advanced automation.
