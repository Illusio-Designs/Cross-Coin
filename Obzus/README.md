# Obzus — public parent-company website

A standalone, informative marketing site for **Obzus**, the parent company that
builds, owns and operates the storefront brands (CrossCoin, Gripzus, Morbix,
Soxbae, Knitwink, Velmique, Velquira).

This is **separate** from:
- the storefront brand apps (each in their own folder), and
- the admin dashboard (`../Dashboard`, deployed on its own domain).

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
```

## Build

```bash
npm run build && npm start
```

## Deploy (Vercel)

1. Create a new Vercel project with **Root Directory = `Obzus`**.
2. Framework preset: **Next.js** (auto-detected).
3. Create a **Deploy Hook** on branch `main` and add it as the GitHub repo
   secret `VERCEL_HOOK_OBZUS`. Pushes that change `Obzus/**` then fire the hook
   via `.github/workflows/vercel-deploy-all.yml` (Vercel git auto-deploy is off
   via `vercel.json`).

## Configuration

| Env var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_ADMIN_URL` | If set (e.g. `https://admin.obzus.com`), shows an "Admin sign in" link that points at the separate admin dashboard. Left unset, the public site omits it. |

To change the brands shown, edit `BRANDS` in `src/pages/index.jsx` and drop the
logo files into `public/brands/`. Contact email lives in the same file
(`CONTACT_EMAIL`).
