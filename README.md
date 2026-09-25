# Pondo Hub

A native iOS and Android allowance companion built with **Expo / React Native**, **Node.js / Express**, and **Supabase Auth + Postgres**. Adapted from the 16 original Stitch designs in `stitch/`.

## Start locally

Use Node.js **22.13+** and npm. Run commands from this folder.

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

Select **Explore the demo** to try the complete app immediately. Demo changes are stored on that device and never written to Supabase. Profile has **Preview parent view** and **Reset demo data** buttons. Real accounts always use Supabase and the Express API; configuration or connection failures never silently fall back to demo data.

## Finish the Supabase setup

The supplied project URL and publishable key are already saved in ignored local `.env` files. They are not committed. The project responds, but currently has **no Pondo Hub tables**. The connected Supabase plugin account does not have administrative access to this project.

1. Open the project's [SQL Editor](https://supabase.com/dashboard/project/gtdeejvbgpslnyppawzx/sql/new).
2. Run the complete contents of [`supabase/migrations/20260925053108_pondo_initial_schema.sql`](supabase/migrations/20260925053108_pondo_initial_schema.sql) once, on this empty project.
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
- Savings goals, deadlines, contribution tracking, and target progress.
- Searchable and filterable transaction history, transaction details, spending charts, and native sharing of a text summary.
- One-time guardian pairing codes, native code sharing, per-guardian permissions, and access revocation.
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
- Available pondo = all recorded cash-in − expenses − savings contributions. Starting a new week never creates money.
- Safe daily spend = max(0, min(available pondo, weekly budget − this week's expenses − this week's savings)) ÷ days remaining, rounded down to a centavo. Today is included in the remaining days.
- Every API request verifies the Supabase access token with `auth.getUser()`. Database calls carry that user's JWT; the API never uses a service-role bypass.
- RLS protects every public table. Privileged database functions live in `private`, check `auth.uid()`, fix `search_path`, and have explicit execution grants. Public RPCs are invoker wrappers.
- Ledger writes lock the student's profile row to serialize balance checks. Client-generated transaction IDs make matching retries idempotent. Direct ledger writes are not granted to authenticated clients.
- Guardian permissions are enforced in database summary functions. Guardians cannot read raw transaction or goal rows, even by bypassing the Express API. Detailed receipts and notes are never included. Revocation applies on the next request; the active parent dashboard refreshes every 30 seconds and on app foregrounding.
- Invitation codes contain 64 random bits, are hashed before storage, expire after 24 hours, and can be accepted once. The Express pairing routes are rate limited.

## Verification

```sh
npm run typecheck
npm test
npm run export
```

The PostgreSQL tests run the actual migration in **PGlite**, with authenticated and anonymous roles and simulated `auth.uid()` values. They cover account isolation, immutable roles, restricted ledger writes, retries, overspending, goal ownership, pairing, guardian field permissions, and revocation. They do not replace deployment verification on the hosted Supabase instance.

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

Use HTTPS at your hosting proxy and set `CORS_ORIGINS` for deployed browser origins. The default rate-limit store is per process; a multi-instance deployment should use a shared store and configure proxy trust for its specific host. No cloud deployment or store submission has been performed.
