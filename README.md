# Microfinance Tracker

Internal, role-based microfinance tracking web app. Admin records users, yearly
contribution targets, contributions, and loans/repayments; normal users get
read-only reports. One shared pool of money. Mobile-first, bilingual (English /
አማርኛ), amounts in ETB.

## Stack

- React 19 + TypeScript + Vite 8, Tailwind CSS v4
- Firebase Auth + Firestore (realtime), Firebase custom claims for roles
- Vercel for hosting and server-side `/api` functions (firebase-admin)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Firebase web config
npm run dev
```

Run against the Firebase Emulator Suite with `VITE_USE_FIREBASE_EMULATORS=true`
and `firebase emulators:start`. Use `vercel dev` when you need the `/api`
functions locally.

## Scripts

| Script                  | Purpose                                   |
| ----------------------- | ----------------------------------------- |
| `npm run dev`           | Vite dev server                           |
| `npm run build`         | Typecheck + production build              |
| `npm run preview`       | Preview the production build              |
| `npm run lint`          | Oxlint                                    |
| `npm run format`        | Prettier write                            |
| `npm run typecheck`     | `tsc -b` across app, node, and api        |
| `npm run test`          | Vitest (run once)                         |
| `npm run test:emulator` | Firestore emulator + security-rules tests |

See `AGENTS.md` for architecture notes and gotchas.
