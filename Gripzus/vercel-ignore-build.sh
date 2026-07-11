#!/usr/bin/env bash
#
# Vercel "Ignored Build Step" — one branch per brand.
#
# Structure:
#   - Each brand has its own long-lived branch: crosscoin, velmique, knitwink,
#     gripzus, velquira (the lowercase folder name).
#   - Each brand has its own Vercel project with:
#       Root Directory   = this brand's folder (e.g. Crosscoin)
#       Production Branch = this brand's branch (e.g. crosscoin)
#       Ignored Build Step (Custom) = bash vercel-ignore-build.sh
#
# This script builds ONLY when the branch being deployed is this brand's own
# branch. Every other branch (main, other brands' branches, and their preview
# deploys) is skipped — so a push to one brand never rebuilds another.
#
# Vercel exit contract: exit 0 = SKIP the build, exit 1 = BUILD.

# The brand branch is the lowercase folder name (Vercel runs this from the
# project's Root Directory, so $PWD's basename is the brand folder).
BRAND_BRANCH="$(basename "$PWD" | tr '[:upper:]' '[:lower:]')"
REF="${VERCEL_GIT_COMMIT_REF:-}"

if [ -z "$REF" ]; then
  echo "⚠️  No VERCEL_GIT_COMMIT_REF — building to be safe."
  exit 1
fi

if [ "$REF" != "$BRAND_BRANCH" ]; then
  echo "🚫 Deploying branch '$REF', but this project builds only '$BRAND_BRANCH' — skipping."
  exit 0
fi

echo "✅ On this brand's branch ('$BRAND_BRANCH') — proceeding with build."
exit 1
