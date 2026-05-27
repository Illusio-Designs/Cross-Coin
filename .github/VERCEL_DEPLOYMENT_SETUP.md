# Vercel Deployment Setup Guide

This guide explains how to set up automated Vercel deployments for all frontend projects.

## Overview

Two deployment workflows are available:

1. **vercel-deploy-all.yml** (Recommended) - Handles all projects (Crosscoin, Gripzus, Knitwink, Velmique, jewellery)
2. **vercel-deploy-crosscoin.yml** - Handles only Crosscoin (simpler alternative)

The backend deployment (Backend → FTP) uses `backend-deploy-ftp.yml` and does NOT trigger Vercel.

## Smart Deployment Behavior

### When Vercel Deploys:
- Any change to `Crosscoin/**` → Deploy Crosscoin
- Any change to `Gripzus/**` → Deploy Gripzus
- Any change to `Knitwink/**` → Deploy Knitwink
- Any change to `Velmique/**` → Deploy Velmique
- Any change to `jewellery/**` → Deploy jewellery

### When Vercel Does NOT Deploy:
- Changes to `Backend/**` only → No Vercel deployment (only FTP deployment)
- Changes to docs or configuration files only → No deployment (unless paths are updated)

## Required GitHub Secrets Setup

1. Go to: **Settings → Secrets and variables → Actions**
2. Add the following secrets:

### Required for all deployments:

```
VERCEL_TOKEN              → Your Vercel API token
VERCEL_ORG_ID             → Your Vercel Organization ID
```

### Required for each project:

```
CROSSCOIN_VERCEL_PROJECT  → Crosscoin project ID from Vercel
GRIPZUS_VERCEL_PROJECT    → Gripzus project ID from Vercel
KNITWINK_VERCEL_PROJECT   → Knitwink project ID from Vercel
VELMIQUE_VERCEL_PROJECT   → Velmique project ID from Vercel
JEWELLERY_VERCEL_PROJECT  → jewellery project ID from Vercel
```

## How to Get These Values

### Vercel Token:
1. Go to https://vercel.com/account/tokens
2. Click "Create New Token"
3. Set Name: `GitHub Actions`
4. Set Scope: `Full Access`
5. Click Create and copy the token immediately (won't be shown again)

### Vercel Organization ID (Team ID):
1. Go to https://vercel.com/account/teams
2. Or go to any project Settings → General
3. Look for "Team ID" in the settings
4. Copy the ID

### Project IDs (one per frontend project):
1. Go to https://vercel.com/dashboard
2. For EACH project (Crosscoin, Gripzus, Knitwink, Velmique, jewellery):
   - Click on the project name
   - Go to Settings → General
   - Find "Project ID" field
   - Copy and save it with the project name

## Vercel Project Configuration

Each frontend project on Vercel must be configured with:

**Build Settings:**
- Framework: Next.js
- Root Directory: `{ProjectName}` (e.g., `Crosscoin`)
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm ci`

**Environment Variables:**
- Copy any `.env.example` variables needed
- Add any API URLs, keys, or configuration

## Manual Deployment

To manually trigger a deployment:

1. Go to **Actions → Deploy Frontend Projects to Vercel (Multi-Project)**
2. Click **Run workflow**
3. Select which project to deploy (or leave empty for auto-detect)
4. Click **Run workflow**

## Deployment Flow

```
Commit to main
    ↓
GitHub detects changed files
    ↓
Workflow triggers for affected projects
    ↓
For each changed project:
  - Check out code
  - Install Vercel CLI
  - Run: vercel deploy --prod
    ↓
Project deployed to Vercel (live)
```

## Troubleshooting

### Error: "you forgot to specify `VERCEL_PROJECT_ID`"
**Cause:** GitHub secret `CROSSCOIN_VERCEL_PROJECT` (or other project) is not configured
**Fix:**
1. Go to GitHub → Settings → Secrets and variables → Actions
2. Check that ALL required secrets are added:
   - `VERCEL_TOKEN` (not empty)
   - `VERCEL_ORG_ID` (not empty)
   - `CROSSCOIN_VERCEL_PROJECT` (not empty)
   - Other project secrets as needed
3. Re-run the deployment after adding/updating secrets

### Deployment doesn't trigger:
- Verify all secrets are set correctly (copy-paste carefully, no extra spaces)
- Check that workflow file has correct project paths
- Ensure commit changes match project directories (`Crosscoin/**`, `Gripzus/**`, etc.)
- For manual trigger: ensure project name matches exactly (case-sensitive)

### Deployment fails with build error:
- Check workflow logs: GitHub → Actions → recent run → Logs
- Verify Vercel project settings:
  - Root Directory: `Crosscoin` (or project name)
  - Framework: `Next.js`
  - Build Command: `npm run build`
  - Install Command: `npm ci`
- Confirm `package.json` exists in project root
- Check for build errors in Vercel dashboard logs

### Multiple projects deployed unintentionally:
- This is expected if you modified multiple projects in one commit
- Each changed project gets its own deployment
- Verify file changes didn't accidentally touch other projects
- Use more focused commits (one project per commit) to avoid this

### Secret shows as empty even though I set it:
- Don't copy the GitHub secret name (e.g., `VERCEL_TOKEN`) as the value
- Copy the actual secret VALUE from Vercel (the token itself)
- Verify no extra spaces or newlines when pasting
- Try deleting and re-creating the secret if it still fails

## Security Notes

- Never commit `.env` files with secrets
- Vercel secrets are separate from GitHub secrets
- Rotate tokens regularly
- Use dedicated "GitHub Actions" token on Vercel (limited scope)
- All deployments must pass build checks before going live

## Workflow Files

- **vercel-deploy-all.yml** - Main multi-project deployment (RECOMMENDED)
- **vercel-deploy-crosscoin.yml** - Single-project Crosscoin deployment (OPTIONAL)
- **backend-deploy-ftp.yml** - Backend FTP deployment (existing)

## Example: Deploying Crosscoin

```bash
# 1. Make changes to Crosscoin/
git add Crosscoin/...
git commit -m "Update Crosscoin styles"
git push origin main

# 2. GitHub Actions automatically:
# - Detects Crosscoin/** changed
# - Skips other projects
# - Deploys only Crosscoin to Vercel
# - Leaves Backend FTP untouched

# 3. Check deployment:
# - Go to Actions tab to see workflow status
# - Check Vercel dashboard for live deployment
```

## Example: Deploying Backend (FTP only)

```bash
# 1. Make changes to Backend/
git add Backend/...
git commit -m "Fix API endpoint"
git push origin main

# 2. GitHub Actions automatically:
# - Detects Backend/** changed
# - Skips all Vercel deployments (no matching paths)
# - Runs FTP deployment to production server
# - Backend is live, frontend projects untouched
```
