# TaskTrail Decision Log

## Product Name

Decision: Use `TaskTrail`.

Reason:

- Clear connection to tasks, field movement, and job history.
- Broad enough for multiple service industries.
- Works well for both web and mobile branding.

## Initial Product Direction

Decision: Build a field operations app with manager web dashboard and worker mobile app.

Reason:

- Strong real-world use case.
- Natural fit for mobile plus web.
- Clear MVP flow.
- Good portfolio and potential SaaS value.

## Backend Direction

Decision: Use Supabase for the first version.

Reason:

- Faster MVP.
- Built-in auth, database, storage, and security policies.
- Avoids custom backend work until product behavior is clearer.

## Architecture Direction

Decision: Use a TypeScript monorepo.

Reason:

- Shared types and validation between web and mobile.
- Cleaner long-term code organization.
