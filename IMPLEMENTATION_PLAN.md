# Microfinance Tracker — Implementation Plan

> **Scope:** Internal, role-based microfinance tracking app. Admin manages users, yearly contribution targets, contributions, and loans/repayments; normal users get read-only reports. One shared pool. Mobile-first, bilingual (EN/አማ), ETB. React 19 + Vite 8 + TS 6 + Tailwind v4, Firebase Auth + Firestore, Vercel hosting, Vercel serverless `/api` functions.
>
> **Status as of this document:** Phases 0–2 are complete.

---

## Architecture snapshot (current)

### Stack

- **Frontend:** Vite + React 19 + TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), React Router, react-i18next.
- **Backend:** Firebase Auth + Firestore (realtime `onSnapshot`). Sign-in is **phone number + password**; Firebase has no such credential, so `src/lib/phone.ts` maps a normalised number to an internal address and the email/password provider authenticates that. Roles stored as **Firebase custom claims** (`role`).
- **Serverless:** Vercel serverless functions under `/api` using `firebase-admin` (service-account JSON via `FIREBASE_SERVICE_ACCOUNT`).
- **Hosting:** Vercel (React build + `/api` functions). Firebase is data/auth only.
- **Testing:** Vitest (jsdom for UI, node for emulator rules tests). Oxlint + Prettier. Firebase Emulator Suite.

### Data model (Firestore)

| Collection                | Key fields                                                                                               | Read          | Write      |
| ------------------------- | -------------------------------------------------------------------------------------------------------- | ------------- | ---------- |
| `users/{uid}`             | name, phone, role, expectedYearly, active, createdAt                                                     | any signed-in | admin only |
| `targets/{userId}_{year}` | userId, year, amount                                                                                     | any signed-in | admin only |
| `contributions/{id}`      | userId, year, amount, date, note, recordedBy, createdAt                                                  | any signed-in | admin only |
| `loans/{id}`              | borrowerName, borrowerPhone, principal, monthlyRatePct, startDate, dueDate, status, createdBy, createdAt | any signed-in | admin only |
| `repayments/{id}`         | loanId, amount, date, recordedBy, createdAt                                                              | any signed-in | admin only |

Dates are stored as ISO `yyyy-mm-dd` strings (not Timestamps) so the pure calc engine is deterministic.

### Pure calculation engine (`src/lib/calc/`) — all unit-tested, no React/Firebase deps

- `money.ts`: `round2`, `sum`.
- `date.ts`: `toUtcMillis`, `daysBetween` (UTC, DST-safe, clamps negatives), `addMonths`, `monthsBetween`, `compareIso`, `maxIso`, `minIso`. **No clock**: "today" lives in `src/lib/clock.ts`, which syncs the server date via `/api/time` before the first render.
- `contributions.ts`: `summarizeUser`, `summarizeContributions` (year-scoped), `totalExpected`, `totalContributed`.
- `loans.ts`: `accrueInterest`, `loanBalanceAt(loan, repayments, asOf)` — replays repayments date-ordered, accrues **simple interest** on outstanding principal (monthly rate, segmented between events and frozen at the due date), applies payments **interest-first then principal**, clamps overpayments, returns `LoanBalance` (principal/interest outstanding, paid totals, per-repayment allocations, `isPaid`).
- `pool.ts`: `summarizePool` → `{ totalExpected, totalContributed, outstandingContributions, totalDisbursed, totalRepaid, interestEarned, loanBookOutstanding, cashOnHand, projectedPool }`.

**Interest model (verified):** simple, no compounding, charged **per month** of the term. `interest = principal × monthlyRate/100 × months`, rounded to 2 decimals at each accrual segment, where `months` is whole calendar months plus leftover days prorated at 1/30 each (so 1 Jan → 1 Jun is exactly 5 months). If a repayment arrives, accrued interest is satisfied first; the remainder reduces principal. Accrual stops at the loan's due date, so an overdue loan never exceeds its agreed total. A live balance accrues from the last event up to `asOf`.

### Auth & routing (`src/features/auth/`)

- `AuthProvider` subscribes to `onAuthStateChanged`, loads `users/{uid}`, resolves role from the ID-token custom claim (falls back to the profile doc). Exposes `signIn`, `signOut`, `refreshRole`.
- `useAuth()` throws if used outside the provider.
- Guards: `ProtectedRoute` (loading spinner → `/login` with return path), `RequireRole`.
- `loginErrorKey(error)` maps Firebase error codes → i18n keys (unit-tested).

### Data layer (`src/lib/`, `src/features/<domain>/`)

- `src/lib/db.ts`: module-level query constants (`usersQuery`, `targetsQuery`, …) so `useCollection` never resubscribes on render.
- `src/lib/hooks/useCollection.ts`: generic `onSnapshot` hook → `{ data, loading, error }`.
- Each domain has `service.ts` (mappers + writes) and `hooks.ts` (realtime collections).
- `src/lib/api.ts`: `postJson(path, body)` attaches the current user's ID token.

### Privileged API (`api/`)

- `api/_lib/firebaseAdmin.ts`: singleton `firebase-admin` app (from `FIREBASE_SERVICE_ACCOUNT` env or ADC).
- `api/_lib/requireAdmin.ts`: `requireAdmin(req)` verifies bearer token + `role === 'admin'`, throws `HttpError(status, message)`.
- `api/admin/create-user.ts` and `api/admin/set-role.ts` both call `requireAdmin`.
- `scripts/seed-admin.mjs`: one-off Admin SDK bootstrap (creates user, sets `role: admin` claim, writes profile doc).

### Security rules (`firestore.rules`)

Admin-only writes; any signed-in user reads. Custom claim `role` is enforced. Rules test (16 tests) covers reads and writes for all collections.

---

## Remaining phases

### Phase 3 — Admin: user management

**Goal:** Admin can create users, edit profiles, and set yearly contribution targets.

#### 3.1 `api/admin/update-user.ts`

- `requireAdmin` + PUT body `{ uid, name?, phone?, expectedYearly?, active? }`.
- Calls `updateDoc` on `users/{uid}` for the provided fields.
- `vercel.json` already rewrites `/api/*`; no route change needed.

#### 3.2 Users service + UI (`src/features/users/`)

- **`service.ts`** (extend): `deleteUser(uid)` calls `adminAuth.deleteUser` via a new serverless endpoint (never client-side Admin SDK), then deletes the `users/{uid}` doc. Also `setUserActive`.
- **`hooks.ts`** (exists): `useUsers` returns `{ data, loading, error }`.
- **Pages/form components:**
  - **User list page** (`src/features/users/pages/UserListPage.tsx`): table/card list of users (name, phone, role, expected yearly, active toggle). Each row has an edit button and a delete button (admin only). Mobile: card list.
  - **Create user form** (`src/features/users/components/CreateUserForm.tsx`): fields name, phone, password, role (admin or user), initial expected yearly. Calls `postJson('/api/admin/create-user', ...)` with bearer token from `useAuth`. Shows error messages mapped through `authErrorKey`.
  - **Edit user modal/page** (`src/features/users/components/EditUserForm.tsx`): editable name, phone, expected yearly, active toggle. Calls `PUT /api/admin/update-user`.
  - **Set yearly target** inline in the user row or a dedicated `TargetInput`. Calls `setYearlyTarget(userId, year, amount)` (client-side write is admin-only via rules).
- **Routing:** `/admin/users` already wired under `RequireRole role="admin"`.

#### 3.3 Reports → user summary

- The dashboard/reports should reflect each user's expected target and contributed amount (reuse `summarizeContributions`).

#### 3.4 Tests

- Unit: user service mapper, `summarizeContributions` edge cases (no target, multiple years, over-contribution).
- Emulator: ensure non-admin cannot write `users` or `targets` (extend `rules.emulator.test.ts`).

#### Acceptance criteria

- Admin can create a user; the user can log in (Phase 1 login works) and appears in reports.
- Admin can edit a user's name, phone, expected yearly, and active status.
- Admin can set/change a user's yearly target; reports update in realtime via `useCollection`.
- Deleting a user removes them from all reports (cascade not required — orphaned contributions/loans stay but reference a removed user; acceptable; could note in rules).

---

### Phase 4 — Admin: contributions

**Goal:** Admin records when users pay money into the shared pool; per-user progress updates live.

#### 4.1 Contributions service (`src/features/contributions/service.ts` — exists)

- `addContribution(input)` already exists. `mapContribution` exists.
- Add `updateContribution`/`deleteContribution` if not already present.

#### 4.2 UI components

- **Contribution form** (`src/features/contributions/components/ContributionForm.tsx`):
  - Fields: user (dropdown populated from `useUsers`), year, amount, date (`yyyy-mm-dd`), note.
  - Realtime preview of remaining target for the selected user (`summarizeUser`).
  - Calls `addContribution` → `postJson('/api/contributions', ...)`? Contributions are written client-side via Firestore security rules (admin-only). Use `addDoc(contributionsQuery, ...)` directly with `recordedBy = auth.currentUser.uid`. **Do not** route through `/api`; the Firestore rules already enforce admin-only writes. This keeps latency low and realtime.
  - Validation: amount > 0, date valid, user selected.
- **Contribution list** (`src/features/contributions/components/ContributionList.tsx`):
  - Filtered by year (default current year), sorted by date desc.
  - Each item shows user, amount, date, note; admin can edit/delete (inline).
  - `useContributions()` returns realtime data; edits reflect immediately.
- **Per-user progress cards** (on dashboard):
  - For each user: target, contributed, remaining, progress bar, `{ progress × 100 }%`.
  - Use `summarizeContributions(targets, contributions, year)`.
  - Mobile-first: stacked cards, horizontal progress bar.

#### 4.3 Routing

- Add `/admin/contributions` route (under `RequireRole admin`). Dashboard (admin view) links here; normal-user dashboard links to reports.

#### 4.4 Reports page enhancement

- Add a contributions table (read-only for users) with totals row.

#### Acceptance criteria

- Admin records a contribution; the user's remaining target decreases instantly for all viewers.
- Year selector filters contributions and targets.
- Progress bar shows `{ contributed } / { expected }` with percentage.
- Contribution list is sortable/filterable and updates in realtime.

---

### Phase 5 — Admin: loans and repayments

**Goal:** Admin adds loans (borrower, amount, start, due, rate) and records partial repayments; outstanding balance recalculates live including time-based interest.

#### 5.1 Loan service (`src/features/loans/service.ts` — exists)

- `addLoan`, `updateLoan`, `deleteLoan`, `mapLoan` exist.
- Add `updateLoanStatus` (set `status = 'paid'` when fully repaid, or keep auto-detected in UI).
- Repayment service: `addRepayment`, `deleteRepayment`, `mapRepayment` exist.

#### 5.2 UI components

- **Add loan form** (`src/features/loans/components/AddLoanForm.tsx`):
  - Fields: borrower name, phone, principal, monthly rate %, start date, due date.
  - Live preview: projected total due (principal + interest from start to due using `loanBalanceAt`). Show `ETB { amount }` formatted.
  - Calls `addLoan` directly (Firestore admin-only write).
- **Loan list** (`src/features/loans/components/LoanList.tsx`):
  - Each loan card: borrower name, principal, rate, start/due, status badge (active/paid), live outstanding (via `loanBalanceAt(loan, repayments, todayIso)`).
  - Sorted by due date / status.
- **Record repayment form** (`src/features/loans/components/RecordRepaymentForm.tsx`):
  - Searchable dropdown of active loans (by borrower name).
  - Field: repayment amount, date.
  - **Live preview** before submit: shows new principal outstanding, interest accrued to date, total outstanding, and updated `isPaid` status — computed via `loanBalanceAt`.
  - On submit calls `addRepayment` (direct Firestore write).
- **Loan detail / repayment history** (`src/features/loans/components/LoanDetail.tsx`):
  - Expandable card showing the list of repayments with allocation breakdown (interest vs principal per payment) from `LoanBalance.allocations`.

#### 5.3 Integration with pool

- After adding a repayment, the pool summary updates live (via `useRepayments` + `summarizePool`).

#### Acceptance criteria

- Admin adds a loan; projected total due is shown using `loanBalanceAt`.
- Recording a partial repayment updates the outstanding balance live, applying interest-first then principal.
- `isPaid` flips to true when outstanding reaches ~0.
- Repayment history shows per-payment allocation.
- Pool report reflects new disbursements and repayments instantly.

---

### Phase 6 — Reports (both roles)

**Goal:** Every user sees a read-only dashboard with contributions, loans, and the pool summary. Admin sees the same plus management links.

#### 6.1 Reports page (`src/features/reports/pages/ReportsPage.tsx`)

- **Contributions log** (`ContributionsLogTable`): one row per payment, newest first — date | member | amount | note. Totals row: entry count and the period's total. Built by `contributionLog`.
- **Repayments log** (`RepaymentsLogTable`): one row per repayment, newest first — date | borrower | paid | interest | principal | balance after. Totals row: the period's repaid/interest/principal. Built by `repaymentLog`, which replays each loan's full history so the split matches the loan book.
- Both are filtered by the shared reporting period (a date range, not a year), paginated (`usePagination`, 10 per page), and exportable to CSV.
- Per-member progress (`summarizeContributions`) and the pool summary live on **Home**; the reports page is the ledger view.
- **Pool summary (the headline numbers):**
  - Cash on hand = `totalContributed − totalDisbursed + totalRepaid`.
  - Outstanding contributions (targets not yet paid).
  - Loan book outstanding (principal + accrued interest).
  - Projected final pool = `cashOnHand + outstandingContributions + projectedLoanOutstandingAtDue`.
  - Interest earned to date.
  - Use `summarizePool(targets, contributions, loans, repayments, todayIso(), range)`.

#### 6.2 Mobile-first design

- Desktop: full-width table with columns.
- Phone (`max-w-screen-sm`): convert each row to a card. Contributions show as stacked cards per user; loans as cards with a summary line. Pool summary as a set of stat cards (large numbers, ETB formatted) at the top.
- Use `formatETB` for all monetary values.
- Bottom navigation or a compact top nav with back/forward.

#### 6.3 Auth-dependent UI

- Normal users see the same reports but with no edit buttons.
- Admin sees a link to each management page (users, contributions, loans) from the dashboard.

#### 6.4 Tests

- Unit: `summarizePool` with various loan states (active, partially repaid, fully repaid, overdue), contributions edge cases.
- Visual: screenshot/element checks at phone width (Vitest + jsdom; or manual).

#### Acceptance criteria

- Both roles can see contributions, loans, and pool reports updated in realtime.
- Pool summary numbers are correct against the calc engine.
- Mobile layout stacks reports into cards; numbers formatted in ETB.

---

### Phase 7 — UX polish, responsive, and internationalization

**Goal:** Phone-first experience polished; bilingual EN/አማ fully covering all labels, empty states, errors, and help text.

#### 7.1 Navigation

- **Bottom tab bar** on mobile (Home, Reports, Loans [admin only], Admin [admin only]).
- **Top nav** on desktop: app title, user name + role badge, language toggle, sign-out.
- Use React Router `<NavLink>` for active state styling.

#### 7.2 Empty / loading / error states

- Every list shows a skeleton/placeholder while `loading === true`.
- Empty state illustration/text when data is empty (e.g., "No contributions yet").
- `error` from `useCollection` shows a retry-able error message.
- Global error boundary (optional but recommended).

#### 7.3 i18n completeness

- Extend `src/i18n/en.json` and `src/i18n/am.json` to cover **every** user-visible string (form labels, buttons, table headers, validation messages, error messages, empty states, tooltips, nav items, report labels, loan statuses).
- Verify Amharic layout doesn't overflow (Amharic strings can be longer; use `truncate` and flexible widths).
- `LanguageToggle` persists choice to `localStorage` and calls `i18n.changeLanguage`.
- Add `dir` attribute? Amharic is LTR, so no `dir` change needed.

#### 7.4 Formatting & accessibility

- All currency via `formatETB` with `Intl.NumberFormat('en-ET'/'am-ET', {style:'currency', currency:'ETB'})`.
- Dates formatted consistently (`yyyy-mm-dd` display).
- Labels use `<label>` with `htmlFor`; inputs have `aria-describedby` for errors.
- Keyboard navigable: focus rings visible, `tabindex` sensible.
- Color contrast meets WCAG AA; brand green `#059669` on white passes.

#### 7.5 Phone-first CSS

- Tailwind mobile-first breakpoints (`sm:`, `md:`).
- Touch targets ≥ 44 px.
- `viewport-fit=cover` already in `index.html`.
- Test on a phone or Chrome DevTools phone mode.

#### 7.6 Performance

- Lazy-load heavy pages with `React.lazy` + `<Suspense>` (Phase 9 candidate).
- Code-split the Firebase bundle if bundle stays > 500 kB (the current build warns).

#### Acceptance criteria

- Full app works end-to-end on a phone with a thumb-friendly layout.
- Every label translated to Amharic; switching language is instant.
- All monetary values formatted in ETB; all dates consistent.
- Loading/empty/error states present on every screen.

---

### Phase 8 — Deployment (Vercel + Firebase)

**Goal:** Deploy to production and verify end-to-end.

#### 8.1 Firebase setup

1. Replace `.firebaserc` placeholder project id with the real project id.
2. Enable **Email/Password** auth in Firebase Console → Authentication → Sign-in method.
3. Seed the admin account: `FIREBASE_SERVICE_ACCOUNT_PATH=... ADMIN_PHONE=... ADMIN_PASSWORD=... npm run seed:admin` (or run `scripts/seed-admin.mjs`). See `DEPLOYMENT.md` for the full deploy.
   - Add npm script `"seed:admin": "node --loader ts-node/esm scripts/seed-admin.mjs"` or just `node scripts/seed-admin.mjs` with env vars. The `.mjs` uses ESM, so `node scripts/seed-admin.mjs` works directly.
4. Deploy Firestore rules and indexes: `firebase deploy --only firestore:rules,firestore:indexes`.
5. Optionally enable **App Check** (recommended for production) — requires a provider (e.g., Play Integrity, App Check with debug provider for dev).

#### 8.2 Vercel setup

1. Connect the repo to Vercel.
2. Set environment variables in Vercel dashboard:
   - Client (safe to expose): `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
   - Server (secret): `FIREBASE_SERVICE_ACCOUNT` (full service-account JSON as a single line).
   - `VITE_USE_FIREBASE_EMULATORS=false` in production.
3. Ensure `vercel.json` is configured (already present; framework `vite`, build command `npm run build`, output `dist`, SPA rewrite).
4. Deploy: `vercel --prod` or push to the connected branch.

#### 8.3 Post-deploy verification

1. Open the deployed URL; confirm the login page loads.
2. Sign in as admin (the seeded account).
3. Create a test user, set a target, record a contribution, add a loan, record a repayment, view reports — confirm all numbers match the calc engine.
4. Sign in as a normal user; confirm read-only access (management links absent, edits blocked).
5. Check the browser console for no auth/Firestore permission errors.
6. Verify `firestore.rules` are active in the Firebase Console.

#### Acceptance criteria

- App is live on Vercel with the real Firebase project.
- Admin can create users and manage contributions/loans.
- Normal users have read-only report access.
- No 403/permission errors in production.

---

### Phase 9 — Hardening and optional features

**Goal:** Production robustness and nice-to-have features.

#### 9.1 Audit log

- Add an `audit/{id}` collection recording every admin write: `{ adminUid, action, collection, docId, before, after, timestamp }`.
- Serverless functions could emit these, or client-side with an admin-only write rule.

#### 9.2 Multi-year rollover

- When the year changes, optionally auto-create the next year's targets (copy previous year's targets as the new baseline).
- Reports support a year selector for historical views.

#### 9.3 Export

- **CSV export** of contributions, loans, and repayments (client-side, admin only). Use `JSON` → `Blob` → `URL.createObjectURL`.
- **PDF export** (optional): use a library like `@react-pdf/renderer` or print-to-PDF.

#### 9.4 Offline support

- Firestore offline persistence is enabled by default in the Web SDK. Add a UI indicator for offline mode (`firebase.firestore().disableNetwork()` / `enableNetwork()`).
- Service worker for app shell caching (Phase 7/9 candidate).

#### 9.5 Security hardening

- **App Check** enforced in production rules (`request.appCheck.token.valid === true`).
- Tighten rules: `users/{uid}` read only self + admin; keep `targets`/`contributions`/`loans`/`repayments` admin-only writes.
- Rate-limit API endpoints (Vercel supports rate limiting per project).
- Rotate the service account periodically; never commit `FIREBASE_SERVICE_ACCOUNT`.

#### 9.6 Backups & monitoring

- Scheduled Firestore export (Google Cloud Console → Firestore → Export).
- Vercel Analytics + Firebase Performance Monitoring.
- Error tracking (Sentry or Firebase Crashlytics).

#### 9.7 Performance & code quality

- **Code splitting:** `React.lazy` for admin pages and reports.
- **Dynamic imports** for heavy chart libraries if reports become visual.
- **Lint/typecheck as CI gates** (GitHub Actions or Vercel pre-deploy).

#### Acceptance criteria

- Audit trail exists for all admin actions.
- Data can be exported to CSV.
- Offline mode is indicated to the user.
- App Check is enforced in production rules.

---

## Technical decisions & constraints (must not be violated)

| Decision                                             | Rationale                                                                                                                                                                                          |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Roles = Firebase custom claims**                   | Cheap Firestore rule checks (`request.auth.token.role`); avoids per-document role reads. Changing a role requires the user to re-login or call `refreshRole()`.                                    |
| **Serverless `/api` functions use `firebase-admin`** | Client SDK `createUser` signs in the new user and logs out the admin. Vercel functions keep the admin session intact. Service-account JSON is `FIREBASE_SERVICE_ACCOUNT` (never `VITE_`-prefixed). |
| **Dates as ISO `yyyy-mm-dd` strings**                | Timestamps are non-deterministic across timezones; strings keep the calc engine pure and unit-testable.                                                                                            |
| **`useCollection` with stable query+mapper**         | `onSnapshot` resubscribes when its reference changes; module-level query constants prevent unnecessary re-subscriptions.                                                                           |
| **Pool is one shared balance**                       | `cashOnHand = totalContributed − totalDisbursed + totalRepaid`. Loans are disbursed from the pool and repayments (with interest) return to it.                                                     |
| **Vitest `pool: 'threads'`**                         | The default `forks` pool times out on Windows in this environment.                                                                                                                                 |
| **Firestore emulator port 8181**                     | Port 8080 is commonly taken (e.g., Apache). Keep `firebase.json`, `src/lib/firebase.ts`, and the emulator test in sync.                                                                            |
| **oxlint (not ESLint)**                              | The Vite template ships oxlint; `npm run lint` runs it. Prettier handles formatting.                                                                                                               |
| **TS 6 `paths` only, no `baseUrl`**                  | `baseUrl` is deprecated in TS 6. `@/*` → `src/*` is configured via `paths`.                                                                                                                        |
| **Tailwind CSS v4 + `@tailwindcss/vite`**            | Tailwind v4 uses the Vite plugin; `@import "tailwindcss"` in `src/index.css`.                                                                                                                      |
| **React 19 `<Context value>`**                       | React 19 supports using context as a JSX provider directly; no `.Provider` wrapper needed.                                                                                                         |

---

## Known operational notes

- `npm run test:emulator` — requires Java and the global `firebase` CLI. The Firestore emulator starts on port 8181 (Auth on 9099). After tests report success, the CLI may linger on Windows; trust the reported pass count and stop it if the shell times out.
- `npm run dev` starts the Vite dev server; it does **not** serve `/api`. Use `vercel dev` for functions, or set `VITE_USE_FIREBASE_EMULATORS=true` and run `firebase emulators:start`.
- `.env.example` documents client and server env vars. Never commit `.env` files (gitignored via `*.local`).
- The `.firebaserc` project id is a placeholder; replace before running Firebase CLI commands.

---

## Test strategy summary

| Layer              | Tool                        | Coverage                                                               |
| ------------------ | --------------------------- | ---------------------------------------------------------------------- |
| Pure calc engine   | Vitest (unit)               | `money`, `date`, `contributions`, `loans` (accrual/allocation), `pool` |
| Auth error mapping | Vitest (unit)               | `authErrorKey`                                                         |
| Security rules     | Vitest + Firestore emulator | Read/write for all collections (16 tests)                              |
| Component/UI       | Vitest (unit)               | Auth context, guards (Phase 3+)                                        |
| Integration        | Firestore emulator          | Service-layer writes/reads (Phase 4+)                                  |
| E2E                | Manual                      | Post-deploy verification (Phase 8)                                     |

---

## Phasing summary

| Phase | Scope                                                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------ |
| **0** | Scaffold Vite + React + TS, Tailwind, Vitest, oxlint, Prettier, Vercel/Firebase configs, folder structure                      |
| **1** | Auth & roles: login, AuthProvider, useAuth, ProtectedRoute/RequireRole, create-user API, set-role API, seed-admin              |
| **2** | Data layer & calc engine: Firestore query constants, useCollection, services, hooks, pure engine + tests, rules emulator tests |
| **3** | Admin user management: create/edit/delete users, set yearly targets                                                            |
| **4** | Admin contributions: record contributions, per-user progress, realtime list                                                    |
| **5** | Admin loans & repayments: add loans, record partial repayments, live outstanding preview                                       |
| **6** | Reports (both roles): contributions, loans, pool summary, mobile-first cards                                                   |
| **7** | UX polish: bottom nav, i18n completeness, empty/error states, accessibility, phone-first CSS                                   |
| **8** | Deployment: Firebase project setup, Vercel deploy, seed admin, post-deploy verification                                        |
| **9** | Hardening: audit log, CSV export, offline support, App Check, backups, code splitting                                          |
