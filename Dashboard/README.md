# Obzus Dashboard (standalone)

Admin dashboard extracted from the CrossCoin storefront app into its own
runnable Next.js app. Talks to the same Backend API.

## Run
    npm install
    npm run dev      # http://localhost:3000 -> redirects to /dashboard

## Notes
- Routes: `/dashboard/*` (admin panel) + `/auth/adminlogin` (login).
- Set the API base via the same env the storefront uses (e.g. NEXT_PUBLIC_API_URL).
- This is the first extraction pass: shared storefront components that the
  dashboard doesn't use are still present and can be pruned incrementally.
