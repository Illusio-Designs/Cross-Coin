# Runbook #5 — Staging + PR previews (stop developing on `main`)

**Goal:** every change is reviewed on a preview/staging copy and passes tests
*before* it reaches production. No more editing `main` directly.

Your stack: backend = cPanel + Passenger (FTP deploy via GitHub Actions),
frontends = 7 Next.js apps on Vercel (Hobby/free). Everything below fits the
free tier.

---

## Branching model (adopt this)

```
feature/*  ──PR──▶  main (production)
                    ▲
                    └── CI test gate must be green to merge
```

- `main` = **production only**. Never commit to it directly.
- Do work on `feature/<thing>` branches → open a **Pull Request** → review → merge.
- The backend **test gate** (already built) runs on the PR; a red suite blocks merge.

### Turn on branch protection (5 min, GitHub → Settings → Branches → Add rule)
Target `main`:
- ☑ Require a pull request before merging
- ☑ Require status checks to pass → select the **`test`** job (from `backend-deploy-ftp.yml`)
- ☑ Require branches to be up to date before merging
- ☑ Do not allow bypassing (optional but recommended)

That alone stops "developing on main" and makes the test gate mandatory.

---

## Frontend previews (Vercel, free)

Vercel already builds a **preview deployment** for every PR — but your
`vercel.json` `ignoreCommand` currently cancels non-production builds
(`if VERCEL_ENV != production → exit 0`). Two options:

### Option A — Preview only the changed brand on a PR (recommended)
Change each brand's `ignoreCommand` so it builds when **(production) OR (preview AND this brand's folder changed in the PR)**:

```json
{
  "ignoreCommand": "if [ \"$VERCEL_ENV\" = \"production\" ]; then git diff --quiet HEAD^ HEAD . && exit 0 || exit 1; fi; git diff --quiet origin/main...HEAD . && exit 0 || exit 1"
}
```
- Production push: builds only if the brand's folder changed (unchanged today).
- PR/preview: builds only the brand(s) whose folder changed in the PR → you get a
  clickable preview URL on the PR, and it costs at most 1 build per changed brand.
- Low PR volume keeps you well under the 100 deploys/day free cap.

### Option B — Keep previews off, rely on `npm run build` + local check
If you want zero preview spend, keep the current production-only `ignoreCommand`
and review frontends by running `npm run build` + `npm run dev` locally on the PR
branch. Cheaper, but no shareable preview URL.

> Recommendation: Option A. A preview URL per PR is the single biggest quality win.

---

## Backend staging (optional, do when you can)

The backend has no staging today. Minimum viable staging on cPanel:

1. **Create a second Node app** in cPanel (*Setup Node.js App*) on a subdomain,
   e.g. `staging-api.crosscoin.in`, pointing at a **separate staging database**
   (clone the schema; use test data). Copy the env vars but with staging DB creds
   and its **own** Redis DB index (`REDIS_DB=1`) so staging + prod don't share queues.
2. **Add a `staging` branch** and a copy of `backend-deploy-ftp.yml`
   (`backend-deploy-staging.yml`) that triggers on `push: [staging]` and uploads to
   the staging app's directory. Keep the same `test` gate.
3. Flow: PR → merge to `staging` → smoke-test on `staging-api` → fast-forward
   `staging` into `main` for production.

If a full staging backend is too much right now, the **test gate + frontend PR
previews** already cover ~80% of the risk. Add backend staging later.

---

## Definition of done
- [ ] Branch protection on `main` (PR required, `test` check required)
- [ ] Team develops on `feature/*` and merges via PR (no direct `main` commits)
- [ ] Frontend PR previews working (Option A) **or** documented local-review step
- [ ] (Later) `staging` branch + `staging-api.crosscoin.in` + staging DB/Redis
