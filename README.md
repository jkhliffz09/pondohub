# Pondo Hub

A native iOS and Android allowance companion built with **Expo / React Native**, **Node.js / Express**, and **Supabase Auth + Postgres**. Adapted from the 16 original Stitch designs in `stitch/`.

## Start locally

Use Node.js **24.x** and npm. Vercel is pinned to Node 24. Run commands from this folder.

```sh
npm install
npm run dev
```

This starts Express on port **3001** and Expo. Open the Expo QR code in **Expo Go** on a phone connected to the same Wi-Fi network. Press `i` for an installed iOS Simulator, `a` for an Android emulator, or `w` for the web preview.

This computer's Homebrew Node binary currently has a missing `simdjson` library. A launcher can use the working Codex-bundled Node runtime without changing the system installation:

```sh
./scripts/run-local.sh dev
```

For separate terminals, use `./scripts/run-local.sh api` and `./scripts/run-local.sh mobile`. `./scripts/run-local.sh web` runs the browser preview.

Select **Take a look around — try the demo** to try the complete app immediately. Demo changes are stored on that device and never written to Supabase. Profile has **Preview parent view** and **Reset demo data** buttons. Real accounts always use Supabase and the Express API; configuration or connection failures never silently fall back to demo data.

## Finish the Supabase setup

The supplied project URL and publishable key are already saved in ignored local `.env` files. They are not committed. The project responds and a `profiles` table was detected on October 8, 2026. This does not verify the entire migration or a real-account flow. The previously connected Supabase plugin account did not have administrative access to this project.

1. Open the project's [SQL Editor](https://supabase.com/dashboard/project/gtdeejvbgpslnyppawzx/sql/new).
2. Run the complete contents of [`supabase/migrations/20260925053108_pondo_initial_schema.sql`](supabase/migrations/20260925053108_pondo_initial_schema.sql) once if the Pondo Hub schema has not been installed. Do not rerun the initial migration on existing tables.
3. In **Authentication → URL Configuration**, configure the site URL for your deployed app/confirmation page. Email confirmation is currently enabled: confirm your email, then return to the app and sign in. The app creates your profile after the first authenticated sign-in.
4. Restart Expo and the API if you change environment variables.

Alternatively, connect the Supabase plugin to an account with access to the project, or use an authenticated Supabase CLI to link and push the checked-in migration. Keep migration history aligned if you apply the SQL manually before adopting CLI deployment.

No service-role key is required. Never put a secret/service-role key in `EXPO_PUBLIC_*` variables.

| App | Environment variables |
| --- | --- |
| Express | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `PORT`, `CORS_ORIGINS` |
| Expo | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_URL` |

Examples are included in each app's `.env.example`. For native development, a configured `localhost` API hostname is replaced with the Expo development host automatically. For a deployed build, set `EXPO_PUBLIC_API_URL` to your **HTTPS** API address. The development computer and phone must be able to reach each other; Expo's tunnel does not tunnel the separate Express API.

## Included flows

- Native splash, onboarding, sign-up with student/guardian role, email/password sign-in, persistent sessions, and sign-out.
- Student dashboard with real balance, reserved savings, remaining weekly plan, and safe daily spending.
- Cash-in and expense recording with category, payment channel, date, validation, and success states.
- “Can I afford this?” comparison against remaining funds and daily essentials; create a savings goal from an item.
- Clickable savings goals, full activity history, contributions, partial/full withdrawals, and deletion that returns remaining savings to pondo while archiving goal activities.
- Searchable and filterable transaction history, transaction details, spending charts, and native sharing of a text summary.
- One-time guardian pairing codes, native code sharing, optional savings visibility, and access revocation.
- Read-only parent dashboard and current in-app budget/goal updates. Alerts are derived from shared records; they are not push notifications or scheduled messages.
- Personal details, weekly budget, daily essentials, and configurable budget start day.

Pondo Hub is a **manual financial ledger**. It does not connect to GCash, Maya, or bank accounts and does not execute transfers. Channel names describe a recorded transaction. Savings contributions reserve existing recorded money; they cannot exceed the available balance or the goal target. Ledger entries are immutable in this version. Live accounts require a network connection; demo data is persisted locally. There is no offline mutation queue.

## Project structure

```text
apps/mobile/       Expo native app, screens, components, encrypted native auth storage
apps/api/          Express REST API, input validation, Supabase user-scoped access
packages/shared/   Centavo arithmetic, calendar cycles, types, category definitions
tests/             API validation, money calculations, PostgreSQL/RLS integration tests
supabase/          CLI config and the database migration
stitch/            Original exported HTML and PNG references
```

## Money and privacy rules

- All stored amounts are integer **centavos**. Calendar calculations use **Asia/Manila**.
- Available pondo = all recorded cash-in − expenses − savings contributions + savings withdrawals. Starting a new week never creates money.
- Safe daily spend = max(0, min(available pondo, weekly budget − this week's expenses − max(0, this week's contributions − withdrawals))) ÷ days remaining, rounded down to a centavo. Today is included in the remaining days.
- Every API request verifies the Supabase access token with `auth.getUser()`. Database calls carry that user's JWT; the API never uses a service-role bypass.
- RLS protects every public table. Privileged database functions live in `private`, check `auth.uid()`, fix `search_path`, and have explicit execution grants. Public RPCs are invoker wrappers.
- Ledger writes lock the student's profile row to serialize balance checks. Client-generated transaction IDs make matching retries idempotent. Direct ledger writes are not granted to authenticated clients.
- Guardian visibility is enforced in database summary functions. Balance, category totals, and budget rhythm are always shared for connected guardians; only savings/goals can be hidden. Guardians cannot read raw transaction or goal rows, even by bypassing the Express API. Detailed receipts and notes are never included. Revocation applies on the next request; the active parent dashboard refreshes every 30 seconds and on app foregrounding.
- Invitation codes contain 64 random bits, are hashed before storage, expire after 24 hours, and can be accepted once. The Express pairing routes are rate limited.

## Verification

```sh
npm run typecheck
npm test
npm run export
```

The PostgreSQL tests run the actual migration in **PGlite**, with authenticated and anonymous roles and simulated `auth.uid()` values. They cover account isolation, immutable roles, restricted ledger writes, retries, overspending, goal ownership, pairing, guardian field permissions, and revocation. They do not replace deployment verification on the hosted Supabase instance.

Dependency audit on October 8, 2026: the critical `shell-quote` finding was patched via an override. Expo/Metro tooling still inherits upstream `braces` and `node-forge` advisories without a newer compatible release available at verification time. Review these before the deferred native release; the deployed Express bundle does not include Expo build tooling.

Expo export produces web assets and iOS/Android JavaScript/Hermes bundles in `apps/mobile/dist/`. It is a compilation check, **not a signed APK/IPA** or a physical-device test.

## Native builds and API deployment

From `apps/mobile`, configure your Expo/EAS account and project, then use the included `eas.json`:

```sh
npx eas-cli build --profile preview --platform android
npx eas-cli build --profile production --platform ios
```

Android preview produces an installable APK. iOS builds require Apple signing credentials; App Store distribution requires the appropriate developer account. Set the real HTTPS API and Supabase environment values in EAS before building. Review the `com.pondohub.app` bundle/application identifiers before publishing.

The API includes a Dockerfile. Build it from the repository root:

```sh
docker build -f apps/api/Dockerfile -t pondo-api .
docker run --env-file apps/api/.env -p 3001:3001 pondo-api
```

Use HTTPS at your hosting proxy and set `CORS_ORIGINS` for deployed browser origins. The default rate-limit store is per process; a multi-instance deployment should use a shared store and configure proxy trust for its specific host. The web app and API use Vercel (see below). No APK, signed iOS build, or store submission has been performed.


## Vercel web app and API

Production: https://pondohub.vercel.app

The project is deployed via Vercel CLI. GitHub source updates are pushed, but automatic Git deployments are not connected: Vercel requires a GitHub login connection on the owning account. Add that connection in Vercel account settings, then connect `jkhliffz09/pondohub` in project Git settings. Until then, deploy from the repository root with `npx vercel@62.7.0 deploy --prod`. Local `.vercel` project linkage is ignored by Git.

The responsive public home page includes desktop navigation, a phone menu, sign-up and login, a demo entry, and an Android download section. `/login` and `/register` support direct links and refresh. The same React Native screens are included in Android and iOS source builds. Authentication still requires a valid Supabase account and the installed database schema.

Import `jkhliffz09/pondohub` into Vercel with the **repository root** as Root Directory and **Other** as the framework. `vercel.json` configures installation, build output, API routing, and SPA fallbacks. The build bundles Express and the shared TypeScript package into `apps/api/dist/vercel.cjs`, exports Expo web into `apps/mobile/dist`, and serves the API through `api/index.js`. No Docker container is needed on Vercel.

Configure these environment variables for Production and Preview:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Optional `ANDROID_APK_URL`: public HTTPS download URL of the signed Android APK.

Leave `EXPO_PUBLIC_API_URL` **unset** in Vercel. Production web requests use the same site's `/api` endpoints. Native releases use the HTTPS origin in `eas.json`. Local Expo development continues to use `http://localhost:3001` and replaces localhost with the Expo host on phones.

In Supabase **Authentication → URL Configuration**, set Site URL to `https://pondohub.vercel.app` and add `https://pondohub.vercel.app/login` to Redirect URLs. Add `http://localhost:8081/login` for local testing. Registration requests that URL for confirmation; native users can confirm in the browser, then return to the app and sign in. Only add preview redirect origins you intend to test.

Checks after deployment:

- `/api/health`: JSON status `ok` and `supabaseConfigured: true`.
- `/api/data` without a bearer token: JSON `401`, not HTML or a server error.
- `/api/downloads/android`: public JSON describing the current APK availability.
- `/login`: login form, including after browser refresh.

The API rate limiter uses per-instance memory. Configure a shared store or Vercel Firewall limits before relying on a global request quota across multiple function instances.

### Publish the APK later

The APK build was deferred at the user's request. The home page does not advertise a working installer until one exists.

1. Sign in to Expo/EAS and configure the project's EAS ID.
2. Add the Supabase URL and publishable key to the EAS **preview** environment (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). These are public client configuration, not service-role credentials.
3. Run `npx eas-cli build --profile preview --platform android` from `apps/mobile`. The profile produces a signed APK and uses the live Vercel API.
4. Test the APK on a physical Android device, then upload it to a public HTTPS release location (for example, a GitHub Release asset).
5. Set `ANDROID_APK_URL` in Vercel to the actual APK asset URL and redeploy. The Download Android APK button becomes enabled automatically. Keep the APK outside Git and outside Vercel Functions.

The download API also exposes `/api/downloads/android/file`, which redirects to the configured release. An unset or invalid URL returns a clear 404 instead of a broken download.


## Savings activity update — October 8, 2026

Before deploying this update to production, apply `supabase/migrations/20261007174314_goal_withdrawals_and_guardian_visibility.sql` once in the project's SQL Editor (after the initial schema). The complete migration is transactional. No hosted database changes were applied from this workspace during implementation.

- Open a goal to see all its contributions and withdrawals, newest transaction date first, with actual recorded timestamps used to break ties.
- Take out any amount up to the goal's current saved balance. It returns to available pondo without being counted as new income or spending.
- Delete a goal to return its remaining balance atomically, mark it deleted, and preserve its activity. Deleted goals are accessible through **View deleted goals** and linked History entries. They cannot receive further transfers.
- All savings writes and deletion lock the student's profile row. Matching transaction retries and repeated deletion cannot duplicate returns.
- Existing guardian links are migrated to always share balance, spending categories, and budget health. Only savings/goals visibility remains configurable. Unlinking remains available; raw individual transaction details remain private.
- History and dashboard recent activity both sort by transaction date descending, then recorded timestamp descending (with timezone offsets normalized), then ID for stable ties.

Verified locally with 20 tests, including the full migration in PostgreSQL/PGlite, plus TypeScript and Expo web/iOS/Android bundle exports. Demo UI verification: a ₱200 withdrawal from ₱300 savings left ₱100; deleting that goal returned the remaining ₱100 and raised available pondo from ₱1,250 to ₱1,550. This is not a physical-device test or verification of the hosted migration.
