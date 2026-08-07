# Obzus Dashboard (standalone)

The admin dashboard extracted from the CrossCoin storefront into its own
runnable Next.js app. It talks to the **same Backend API** as the storefront.

## Run locally
    cd Dashboard
    npm install
    npm run dev        # http://localhost:3000  ->  redirects to /dashboard

Routes: `/dashboard/*` (admin panel) and `/auth/adminlogin` (login).

## Configure the API base
Set the same env the storefront uses so the dashboard hits the live backend:
    NEXT_PUBLIC_API_URL=https://api.crosscoin.in     # example
(Check src/services / src/config for the exact env name the code reads.)

## Deploy on Vercel (its own project)
1. Vercel → **New Project** → import the `Illusio-Designs/Cross-Coin` repo.
2. Set **Root Directory** = `Dashboard`.
3. Framework preset: **Next.js** (auto). Build cmd is `npm run build`.
4. Add the env var(s) above under the project's Environment Variables.
5. Deploy. The included `vercel.json` `ignoreCommand` makes it **only rebuild
   when files under `Dashboard/` change**, so storefront/backend pushes don't
   trigger a dashboard deploy.

(Or generate a Deploy Hook for it and fire it from CI like the storefronts.)

## Migration status
First extraction pass. The old dashboard still lives inside `Crosscoin/` and is
untouched — both run in parallel. Once this standalone is verified, the
dashboard code will be removed from `Crosscoin/`.
