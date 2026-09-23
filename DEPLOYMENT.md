# Deploying

Two services carry this app:

| Piece                      | Where        | Why                                                                 |
| -------------------------- | ------------ | ------------------------------------------------------------------- |
| The web app (static React) | **Vercel**   | Builds `dist/` and serves it, with `/api/*` as serverless functions |
| Auth + database            | **Firebase** | Firebase Auth for sign-in, Firestore for data and realtime sync     |

Firebase Hosting is **not** used — Vercel serves the front end. Only Auth,
Firestore (and Firestore rules/indexes) come from Firebase.

Roughly 20 minutes end to end.

---

## 1. Create the Firebase project

1. <https://console.firebase.google.com> → **Add project**. Note the **project
   ID** (not the display name).
2. **Build → Authentication → Get started**, then **Sign-in method → Email/Password
   → Enable**.

   > **This is required even though members sign in with a phone number.** There
   > is no phone-plus-password credential in Firebase, so each phone number is
   > mapped to an internal address like `912345678@users.microfinance.local` and
   > authenticated by the email/password provider. See `src/lib/phone.ts`.
   > **Do not enable the Phone provider** — it is unused, costs money per SMS,
   > and would not fit the password flow.
   >
   > Because the internal addresses look like real ones, members "exist" as
   > users with emails. That is expected; never edit those addresses by hand.

3. **Build → Firestore Database → Create database.** Production mode. Pick a
   region close to the users (`europe-west1` or `me-central1` for Ethiopia).
4. **Project settings → General → Your apps → Web (`</>`)** to register a web
   app. Copy the config values — they become the `VITE_FIREBASE_*` variables in
   step 3.

## 2. Deploy the rules and indexes

Firestore starts locked down and empty, and it stays insecure or broken without
this step — rules are what enforce admin-only writes.

```bash
npm install -g firebase-tools
firebase login
firebase use --add        # pick your project; writes .firebaserc
firebase deploy --only firestore:rules,firestore:indexes
```

`.firebaserc` now points at the live project id. For a fresh clone, `firebase
use --add` (or editing that file) selects the project before any `firebase
deploy` will work.

Let the indexes finish building. **Firestore → Indexes** shows their state.

## 3. Create the Vercel project

1. <https://vercel.com/new> → import this repository. Vercel reads
   `vercel.json`: framework **Vite**, build `npm run build`, output `dist`. Don't
   override those.
2. Add the environment variables (**Settings → Environment Variables**,
   Production _and_ Preview). Values come from step 1.4:

   | Variable                            | Value                                                   |
   | ----------------------------------- | ------------------------------------------------------- |
   | `VITE_FIREBASE_API_KEY`             | from the web app config                                 |
   | `VITE_FIREBASE_AUTH_DOMAIN`         | `<project-id>.firebaseapp.com`                          |
   | `VITE_FIREBASE_PROJECT_ID`          | your project id                                         |
   | `VITE_FIREBASE_STORAGE_BUCKET`      | from the config                                         |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | from the config                                         |
   | `VITE_FIREBASE_APP_ID`              | from the config                                         |
   | `FIREBASE_SERVICE_ACCOUNT`          | the full service-account JSON, on **one line** (step 4) |

   > **Do not set `VITE_USE_FIREBASE_EMULATORS`.** If it is left as `true` the
   > deployed app tries to reach `127.0.0.1:9099` for Auth and `:8181` for
   > Firestore, and nobody can sign in. It belongs in `.env.local` only.

   The `VITE_*` values are compiled into the JavaScript at build time, so
   **changing one needs a redeploy**, not just a restart.

3. **Deploy.** Leave **Deployment Protection / Vercel Authentication** off for
   the production domain — a protected deployment answers 401 and the app can
   never load.

## 4. Service account for the `/api` functions

The privileged endpoints (creating users, editing profiles, deleting accounts)
run under `firebase-admin` and need credentials. They are the reason roles and
account creation happen server-side at all.

1. Firebase → **Project settings → Service accounts → Generate new private
   key**. A `.json` file downloads.
2. Minify it to one line and set it as the Vercel variable `FIREBASE_SERVICE_ACCOUNT`:

   ```bash
   node -e "console.log(JSON.stringify(require('./the-downloaded-key.json')))"
   ```

   Paste that single line as the value. Multi-line values get mangled and
   `cert()` fails with _Failed to parse private key_.

3. **This key is a full admin credential for Auth and Firestore.** Never commit
   it, never prefix it with `VITE_` (that would ship it to the browser), and
   never paste it into client code. Rotate it from the same console page if it
   ever leaks.
4. Redeploy so the functions pick it up.

## 5. Seed the first admin

There is no self-service sign-up: an admin creates every account. So the first
one has to be seeded out of band.

```bash
FIREBASE_SERVICE_ACCOUNT_PATH=./the-downloaded-key.json \
ADMIN_PHONE=0912345678 \
ADMIN_PASSWORD='a-strong-password' \
node scripts/seed-admin.mjs
```

`ADMIN_PHONE` accepts `0912345678`, `+251912345678` and friends; it is stored
normalised to nine digits. The script sets the `admin` **custom claim**, which is
what `firestore.rules` and `/api` actually check.

Re-running it is safe: it updates the existing account instead of failing.

## 6. Authorise your domain

Firebase Auth refuses sign-ins from unknown origins. Go to **Authentication →
Settings → Authorized domains** and add the Vercel domain
(`your-app.vercel.app`, plus any custom domain). `localhost` is already there for
development.

Symptom if you skip this: sign-in fails with
`auth/unauthorized-domain` — and the login form shows the generic error, not
that message.

## 7. Verify the deployment

In order, on the deployed URL:

- [ ] The page loads and shows the sign-in form (not a blank screen). A blank
      screen usually means a missing `VITE_FIREBASE_*` variable.
- [ ] Signing in with the seeded `ADMIN_PHONE` / `ADMIN_PASSWORD` works.
- [ ] The header shows the name and the **Admin** badge.
- [ ] **Admin → Users** lists the admin. Create a member: name, a phone number, a
      password, role _User_.
- [ ] Sign out, sign in as that member: no admin tab, reports are read-only.
- [ ] Recording a contribution updates the dashboard figures.
- [ ] `/api/time` returns `{"today":"…","timeZone":"Africa/Addis_Ababa"}`. The
      whole app takes its current date from here, so if this 404s every balance
      silently falls back to the device clock.

## Operating notes

- **Roles are custom claims.** After a role changes the affected user must sign
  out and back in; the old ID token keeps the old claim for up to an hour. The
  app calls `refreshRole()` where it can, but a re-login is the reliable fix.
- **Changing a phone number is not supported in the UI.** The phone is the
  credential, so it has to reissue the Auth account, and `/api/admin/update-user`
  deliberately refuses to touch it. Recreate the account instead.
- **Anyone can read once signed in; only admins can write.** That is
  `firestore.rules`; it is enforced server-side, so editing the client cannot
  bypass it.
- **Back up Firestore** before bulk changes:
  `gcloud firestore export gs://<bucket>` (requires a billing-enabled project).
- **The app's date is `Africa/Addis_Ababa`**, a constant in `api/time.ts`, not the
  browser's timezone and not UTC. Change it there if the ledger moves.

## Gotchas that have bitten before

- `VITE_USE_FIREBASE_EMULATORS=true` in production — see step 3.2.
- `FIREBASE_SERVICE_ACCOUNT` pasted with real newlines — see step 4.2.
- Forgetting to redeploy after changing a `VITE_*` variable: they are baked in at
  build time.
- `.firebaserc` still holding the placeholder project id, so `firebase deploy`
  writes to the wrong project or fails.
- **Vercel typechecks `api/` under nodenext rules** (the package is `type:
module`): relative imports there need explicit `.js` extensions or the admin
  functions deploy broken with only build-log TS2835/TS5097 errors. `tsc -b`
  alone will not catch this — the repo's own config uses `bundler` resolution.
- **`firebase-admin` needs `jwks-rsa` pinned to 3.x** (see `package.json`
  `overrides`): 4.x require()s ESM-only `jose` v6, which crashes every `/api`
  function at module load with `ERR_REQUIRE_ESM` on Vercel's runtime. The
  symptom is a 500 `FUNCTION_INVOCATION_FAILED` on any admin endpoint, even
  unauthenticated ones. Don't remove the override.
