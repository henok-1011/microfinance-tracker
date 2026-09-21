# AGENTS.md

Internal role-based microfinance tracker. React 19 + Vite 8 + TS 6 + Tailwind v4 frontend; Firebase Auth + Firestore; hosted on Vercel with serverless `/api` functions. Mobile-first, bilingual (en / am), ETB amounts.

## Commands (verified)

- `npm run dev` — Vite dev server.
- `npm run build` — `tsc -b && vite build`.
- `npm run lint` / `lint:fix` — **oxlint**, not ESLint.
- `npm run format` / `format:check` — Prettier.
- `npm run typecheck` — `tsc -b` over `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.api.json`.
- `npm run test` — Vitest; single file: `npx vitest run src/lib/calc/money.test.ts` (or `npm test -- money`).
- `npm run test:emulator` — starts the Firestore emulator and runs `*.emulator.test.ts` (needs Java + the `firebase` CLI). `npm run emulators` starts Auth + Firestore for manual dev.
- Preferred order: `lint -> typecheck -> test -> build`.

## Layout

- `src/app/router.tsx` — route table; `src/features/<domain>/` holds auth, users, contributions, loans, reports.
- `src/lib/calc/` — **pure** calculation engine. `contributions.ts` (targets vs. paid), `loans.ts` (time-based simple interest: 365-day basis on outstanding principal, interest-first allocation, segmented at each repayment), `pool.ts` (shared pool summary), plus `date.ts`/`money.ts`. Keep it free of React/Firebase imports and unit-tested; UI derives all figures from it.
- `src/lib/db.ts` — module-level Firestore query constants. Keep them stable references so `useCollection` does not resubscribe each render.
- `src/lib/hooks/useCollection.ts` — generic realtime `onSnapshot` hook; pass a stable query + mapper.
- `src/features/<domain>/service.ts` + `hooks.ts` — Firestore reads/writes and realtime hooks per domain. Dates are stored as ISO `yyyy-mm-dd` strings (not Timestamps) to keep the calc engine deterministic.
- `src/lib/firebase.ts` — client SDK init; connects to emulators when `VITE_USE_FIREBASE_EMULATORS=true`.
- `api/` — Vercel serverless functions using `firebase-admin`. `api/_lib/` is shared and not routed. Privileged ops (user creation, role changes) live here, never in the browser.
- `scripts/seed-admin.mjs` — one-off admin bootstrap via Admin SDK.
- `firestore.rules` / `firestore.indexes.json` — deploy with the Firebase CLI.

## Conventions and gotchas

- **Roles are Firebase custom claims** (`request.auth.token.role`), set via Admin SDK. A changed role needs a re-login to refresh the ID token. `firestore.rules` allows authenticated reads but **admin-only writes**.
- **Auth state** lives in `src/features/auth/` (`AuthProvider` + `useAuth`). The role is read from the ID-token claim and falls back to the `users/{uid}` profile; `refreshRole()` forces a token refresh. Guard routes with `ProtectedRoute` / `RequireRole` in `src/features/auth/guards.tsx`.
- **Privileged `/api` endpoints** must call `requireAdmin()` from `api/_lib/requireAdmin.ts`; it verifies the bearer ID token and throws `HttpError`.
- **Emulator ports:** Firestore `8181`, Auth `9099` (8080 is commonly taken by other services). Keep `firebase.json`, `src/lib/firebase.ts`, and the emulator test in sync if you change them.
- **`vite dev` does not serve `/api`.** Use `vercel dev` for functions locally; otherwise point the app at the emulators.
- **Vitest must use `pool: 'threads'`** (set in `vitest.config.ts`) — the default `forks` pool times out on Windows here.
- **`test:emulator` may appear to hang after passing** — the Firebase CLI lingers on Windows; trust the reported test count and stop it if the shell times out.
- **TS 6 removed `baseUrl`**; path aliases use `paths` only. `@/*` maps to `src/*` in both Vite and tsconfig.
- Env: client vars must be `VITE_FIREBASE_*`; `FIREBASE_SERVICE_ACCOUNT` is server-only and must never be exposed. `.env.example` documents both.
- The app shell is mobile-first (`max-w-screen-sm`); design and test at phone widths first.
- `.firebaserc` has a placeholder project id — replace before running Firebase CLI commands.
