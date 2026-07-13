# TaskTrail Tech Stack

## Recommended Stack

### Monorepo

- Package manager: npm workspaces or pnpm workspaces
- Structure:
  - `apps/web` for the web dashboard
  - `apps/mobile` for the mobile app
  - `packages/shared` for shared types, validation, and utilities

### Web App

- Framework: Next.js
- Language: TypeScript
- UI: Tailwind CSS
- Icons: lucide-react
- Forms: React Hook Form
- Validation: Zod
- Charts: Recharts

### Mobile App

- Framework: Expo React Native
- Language: TypeScript
- Navigation: Expo Router
- Styling: NativeWind or React Native StyleSheet
- Device features:
  - Expo Location
  - Expo Image Picker
  - Expo Camera later
  - Signature capture package

### Backend

- Backend platform: Supabase
- Auth: Supabase Auth
- Database: Supabase PostgreSQL
- Storage: Supabase Storage
- Realtime: Supabase Realtime later
- Security: Row Level Security policies

### Reports

- MVP: Web report page
- Later: PDF export with server-side rendering or a PDF library

### Deployment

- Web: Vercel
- Mobile: Expo Application Services
- Backend: Supabase hosted project

## Why This Stack

- One language across web, mobile, and shared packages
- Fast MVP development
- Supabase gives auth, database, storage, and policies without building a custom backend first
- Expo makes mobile development practical without immediately dealing with native build complexity
- Next.js gives a strong dashboard foundation

## Environment Variables

Expected future variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Never commit real secrets to the repository.
