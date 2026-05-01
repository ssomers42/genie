# Genie

Cross-platform wishlist app (Expo + React Native for **iOS** and **web PWA**), with [Expo Router](https://docs.expo.dev/router/introduction/), [Supabase](https://supabase.com/) (Postgres + Edge Functions), and [NativeWind](https://www.nativewind.dev/) (Tailwind for RN).

## Prerequisites

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local Edge Functions and deploy)

## Environment variables

Copy `.env.example` to `.env.local`, then paste your real values:

```bash
cp .env.example .env.local
```

Use either Expo-style or legacy Vite names (both are supported via [app.config.js](app.config.js)):

- `EXPO_PUBLIC_SUPABASE_URL` — or `VITE_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — or `VITE_SUPABASE_ANON_KEY`

## Supabase: `product-preview` Edge Function

The app no longer fetches raw HTML in the client. Deploy the Edge Function that replaces the old Vite dev proxy / serverless handler: it fetches the page with browser-like headers and parses HTML server-side (see [supabase/functions/product-preview/index.ts](supabase/functions/product-preview/index.ts)).

```bash
supabase functions deploy product-preview
```

JWT verification for this function is disabled in [supabase/config.toml](supabase/config.toml) (`verify_jwt = false`) so anonymous clients can get previews; tighten when you add Supabase Auth.

Ensure the deployed function name matches `product-preview` (used in [src/services/productPreviewApi.ts](src/services/productPreviewApi.ts)).

## Scripts

| Command | Description |
|--------|-------------|
| `npm start` | Expo dev server (press `w` for web, `i` for iOS) |
| `npm run web` | Start with web target |
| `npm run ios` | iOS simulator (macOS) |
| `npm run android` | Android emulator |
| `npx expo export --platform web` | Static web build into `dist/` (PWA-oriented settings live under `expo.web` in [app.json](app.json)) |

## Project layout

- [app/](app/) — Expo Router routes (thin); modal add flow under `app/add/`.
- [src/features/](src/features/) — `wishlist`, `scraper` (add-item wizard), `profile`.
- [src/services/](src/services/) — Supabase client and API wrappers (invoked from hooks only).
- [src/lib/](src/lib/) — Pure helpers (URLs, filters, emoji card data URLs, image picking).
- [supabase/functions/product-preview/](supabase/functions/product-preview/) — Fetch + HTML parse → JSON.

## iOS / EAS

Configure bundle identifier in [app.json](app.json) (`ios.bundleIdentifier`). For device builds and TestFlight, use [EAS Build](https://docs.expo.dev/build/introduction/).
