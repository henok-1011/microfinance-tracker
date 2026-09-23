# Microfinance Tracker

Internal, role-based microfinance tracking web app. Admin records users, yearly
contribution targets, contributions, and loans/repayments; normal users get
read-only reports. One shared pool of money. Mobile-first, bilingual (English /
አማርኛ), amounts in ETB.

Members sign in with a **phone number and password**. Firebase has no such
credential, so each number maps to an internal address
(`912345678@users.microfinance.local`) and the email/password provider does the
rest — see `src/lib/phone.ts`. Dates come from the **server**, not the device
clock: `src/lib/clock.ts` syncs `/api/time` before the first render.

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

`npm run dev` also serves the `/api` functions (see
`scripts/dev-api-plugin.ts`), so the emulator flow is:

```bash
npm run emulators      # terminal 1
npm run seed:emulator  # once per emulator run; creates the admin
npm run dev            # terminal 2
```

That seeds `0912345678` / `password123` by default; override with `ADMIN_PHONE`,
`ADMIN_PASSWORD` and `ADMIN_NAME`. Emulator data lives in memory, so re-seed
after every restart of `npm run emulators`. Use `vercel dev` when you want to
verify against Vercel's real function runtime.

To deploy, follow **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

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
| `npm run emulators`     | Auth + Firestore emulators locally        |
| `npm run seed:emulator` | Create the admin account against them     |

See `AGENTS.md` for architecture notes and gotchas.
