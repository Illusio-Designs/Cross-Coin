#!/usr/bin/env bash
#
# Vercel "Ignored Build Step" for this monorepo folder.
#
# Point each Vercel project at this file:
#   Project Settings → Git → Ignored Build Step → "Custom" →
#     bash vercel-ignore-build.sh
#   (Root Directory must be this project's folder; Production Branch = main.)
#
# Exit code contract (Vercel): exit 0 => SKIP the build, exit 1 => BUILD.
#
# It does two things:
#   1. Skips every deploy that is not a Production (main) deploy — so pushes to
#      feature branches / preview deploys never build.
#   2. On Production, builds only when THIS folder changed in the last commit —
#      so a push to main that only touched another brand's folder is skipped.

set -o pipefail

# 1) Only ever build Production (the main branch). Skip previews/branches.
if [ "$VERCEL_ENV" != "production" ]; then
  echo "🚫 VERCEL_ENV=$VERCEL_ENV (not production) — skipping build."
  exit 0
fi

# 2) Build only if files in this project's Root Directory changed.
#    Vercel runs this command from the project's Root Directory, so "." is the
#    folder. If HEAD^ can't be resolved (shallow clone edge case) git returns
#    non-zero and we fall through to building — the safe default.
if git diff --quiet HEAD^ HEAD .; then
  echo "🚫 No changes in this folder since the last commit — skipping build."
  exit 0
fi

echo "✅ Changes detected in this folder — proceeding with build."
exit 1
