# TaskTrail Data Model Draft

This is the first database shape. It may evolve during implementation.

## Tables

### users

Supabase Auth owns the main auth user. App profile data lives in `profiles`.

### profiles

- `id`
- `auth_user_id`
- `full_name`
- `phone`
- `avatar_url`
- `created_at`

### workspaces

- `id`
- `name`
- `owner_id`
- `created_at`

### workspace_members

- `id`
- `workspace_id`
- `profile_id`
- `role`
- `status`
- `created_at`

Roles:

- `admin`
- `manager`
- `worker`

### customers

- `id`
- `workspace_id`
- `name`
- `contact_name`
- `email`
- `phone`
- `notes`
- `created_at`

### sites

- `id`
- `workspace_id`
- `customer_id`
- `name`
- `address`
- `latitude`
- `longitude`
- `notes`
- `created_at`

### jobs

- `id`
- `workspace_id`
- `customer_id`
- `site_id`
- `title`
- `description`
- `priority`
- `status`
- `scheduled_date`
- `time_window_start`
- `time_window_end`
- `assigned_to`
- `created_by`
- `completed_at`
- `reviewed_at`
- `created_at`

Priorities:

- `low`
- `normal`
- `high`
- `urgent`

Statuses:

- `draft`
- `scheduled`
- `assigned`
- `in_progress`
- `blocked`
- `completed`
- `reviewed`
- `cancelled`

### job_checklist_items

- `id`
- `job_id`
- `label`
- `is_required`
- `is_completed`
- `completed_at`
- `sort_order`

### job_events

- `id`
- `job_id`
- `profile_id`
- `event_type`
- `message`
- `latitude`
- `longitude`
- `created_at`

Event examples:

- `created`
- `assigned`
- `checked_in`
- `status_changed`
- `photo_uploaded`
- `note_added`
- `signature_collected`
- `completed`
- `reviewed`

### job_photos

- `id`
- `job_id`
- `uploaded_by`
- `storage_path`
- `caption`
- `photo_type`
- `created_at`

Photo types:

- `before`
- `during`
- `after`
- `issue`
- `other`

### job_notes

- `id`
- `job_id`
- `profile_id`
- `body`
- `created_at`

### job_signatures

- `id`
- `job_id`
- `signed_by_name`
- `signature_storage_path`
- `created_at`

## Security Notes

- Every business table should include `workspace_id` directly or through a parent relation.
- Users can only read records inside their workspace.
- Workers can only access jobs assigned to them.
- Managers and admins can access all jobs in their workspace.
- Service role keys should only be used server-side.
