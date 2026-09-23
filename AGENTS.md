# AGENTS.md

Internal role-based microfinance tracker. React 19 + Vite 8 + TS 6 + Tailwind v4 frontend; Firebase Auth + Firestore; hosted on Vercel with serverless `/api` functions. Mobile-first, bilingual (en / am), ETB amounts.

## Commands (verified)

- `npm run dev` — Vite dev server; also serves `/api/**` via `scripts/dev-api-plugin.ts`.
- `npm run build` — `tsc -b && vite build`.
- `npm run lint` / `lint:fix` — **oxlint**, not ESLint.
- `npm run format` / `format:check` — Prettier.
- `npm run typecheck` — `tsc -b` over `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.api.json`.
- `npm run test` — Vitest; single file: `npx vitest run src/lib/calc/money.test.ts` (or `npm test -- money`).
- `npm run test:emulator` — starts the Firestore emulator and runs `*.emulator.test.ts` (needs Java + the `firebase` CLI). `npm run emulators` starts Auth + Firestore for manual dev.
- Preferred order: `lint -> typecheck -> test -> build`.

## Layout

- `src/app/router.tsx` — route table; `src/features/<domain>/` holds auth, users, contributions, loans, reports.
- `src/lib/calc/` — **pure** calculation engine. `contributions.ts` (targets vs. paid), `loans.ts` (simple interest **per month** on outstanding principal, interest-first allocation, segmented at each repayment and frozen at the due date), `pool.ts` (shared pool summary), plus `date.ts`/`money.ts`. Keep it free of React/Firebase imports and unit-tested; UI derives all figures from it.
- `src/lib/clock.ts` — **the app's only source of "today"**. `syncServerClock()` resolves `/api/time` once, before React mounts (`main.tsx`), because every form default, live balance and year selector reads `todayIso()` and anything seeded from a device clock would stay wrong all session. The device clock is the fallback when the endpoint is unreachable (`clockSource()` reports which is in force). The calc engine has no clock of its own: it takes `asOf` explicitly, so keep it that way.
- `api/time.ts` — the server clock. Public and unauthenticated (it exposes nothing but the time) and returns the date in `APP_TIMEZONE` (`Africa/Addis_Ababa`, UTC+3, no DST), so a payment taken just after local midnight is not filed on the previous day.
- `src/lib/db.ts` — module-level Firestore query constants. Keep them stable references so `useCollection` does not resubscribe each render.
- `src/lib/hooks/useCollection.ts` — generic realtime `onSnapshot` hook; pass a stable query + mapper.
- `src/features/<domain>/service.ts` + `hooks.ts` — Firestore reads/writes and realtime hooks per domain. Dates are stored as ISO `yyyy-mm-dd` strings (not Timestamps) to keep the calc engine deterministic.
- `src/lib/firebase.ts` — client SDK init; connects to emulators when `VITE_USE_FIREBASE_EMULATORS=true`.
- `api/` — Vercel serverless functions using `firebase-admin`. `api/_lib/` is shared and not routed. Privileged ops (user creation, role changes) live here, never in the browser.
- **Relative imports in `api/` need explicit `.js` extensions.** Vercel typechecks the functions under nodenext rules (the package is `type: module`), while the repo's own `tsc -b` uses bundler resolution — extensionless imports pass locally and deploy broken. `../../src/lib/phone.js` style resolves back to the `.ts` source. See DEPLOYMENT.md.
- **`package.json` pins `jwks-rsa` to 3.2.2 via `overrides`** — firebase-admin's own 4.x pulls ESM-only `jose` v6, which crashes every `/api` function at cold start on Vercel with `ERR_REQUIRE_ESM`. Don't remove the override; see DEPLOYMENT.md.
- `scripts/seed-admin.mjs` / `seed-admin-emulator.mjs` — one-off admin bootstrap via Admin SDK (real project / emulators).
- `scripts/dev-api-plugin.ts` — dev-only Vite plugin that mounts the `api/**` handlers on the dev server; excluded from the build by `apply: 'serve'`.
- `firestore.rules` / `firestore.indexes.json` — deploy with the Firebase CLI.

## Conventions and gotchas

- **The sign-in credential is a phone number, not an email.** Firebase has no phone+password credential, so `src/lib/phone.ts` maps a normalised number to an internal address (`912345678@users.microfinance.local`) and the email/password provider authenticates that. The same mapping must hold on both sides — `api/admin/create-user.ts` imports that file — or accounts are created under one address and signed in with another. Store phones normalised (nine digits); the `users/{uid}` profile has no `email` field, and the Auth user's synthetic `email` must never be shown or edited.
- **Roles are Firebase custom claims** (`request.auth.token.role`), set via Admin SDK. A changed role needs a re-login to refresh the ID token. `firestore.rules` allows authenticated reads but **admin-only writes**.
- **Auth state** lives in `src/features/auth/` (`AuthProvider` + `useAuth`). The role is read from the ID-token claim and falls back to the `users/{uid}` profile; `refreshRole()` forces a token refresh. Guard routes with `ProtectedRoute` / `RequireRole` in `src/features/auth/guards.tsx`.
- **Privileged `/api` endpoints** must call `requireAdmin()` from `api/_lib/requireAdmin.ts`; it verifies the bearer ID token and throws `HttpError`.
- **Emulator ports:** Firestore `8181`, Auth `9099` (8080 is commonly taken by other services). Keep `firebase.json`, `src/lib/firebase.ts`, and the emulator test in sync if you change them.
- **`/api` under `npm run dev`.** Vite on its own answers `/api/*` with 404 (it never SPA-falls-back non-GET requests), so `scripts/dev-api-plugin.ts` mounts the handlers at the same paths Vercel uses and recreates just what they touch of the Node runtime (`req.body`, `req.query`, chainable `res.status().json()`). It also copies the `.env` files into `process.env`, which Vite otherwise only exposes as `import.meta.env`. Use `npx vercel dev` (first run links the project, needs login) when you want Vercel's real function runtime.
- **Local `/api` needs a Firebase target.** `firebase-admin` reads `FIREBASE_AUTH_EMULATOR_HOST`, `FIRESTORE_EMULATOR_HOST` and `GCLOUD_PROJECT` **when its modules are imported**; `.env.local` sets all three. Emulator flow: `npm run emulators` → `npm run seed:emulator` (bootstraps `admin@local.test` / `password123` with the `role: admin` claim `requireAdmin()` demands) → `npm run dev`. Without those vars the client still signs into the emulator, but `/api` tries the real project and fails on credentials.
- **Vitest must use `pool: 'threads'`** (set in `vitest.config.ts`) — the default `forks` pool times out on Windows here.
- **`test:emulator` may appear to hang after passing** — the Firebase CLI lingers on Windows; trust the reported test count and stop it if the shell times out.
- **TS 6 removed `baseUrl`**; path aliases use `paths` only. `@/*` maps to `src/*` in both Vite and tsconfig.
- Env: client vars must be `VITE_FIREBASE_*`; `FIREBASE_SERVICE_ACCOUNT` is server-only and must never be exposed. `.env.example` documents both.
- The app shell is mobile-first (`max-w-screen-sm`); design and test at phone widths first.
- `.firebaserc` has a placeholder project id — replace before running Firebase CLI commands.
