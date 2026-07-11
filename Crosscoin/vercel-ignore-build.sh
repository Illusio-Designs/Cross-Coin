#!/usr/bin/env bash
#
# Vercel "Ignored Build Step" — folder-scoped, and works whether this project's
# Production Branch is `main` (shared monorepo model) OR this brand's own branch.
#
# Each Vercel project: Root Directory = this brand's folder; Ignored Build Step
# (Custom) = bash vercel-ignore-build.sh
#
# It BUILDS when either:
#   • the deployed branch is this brand's own branch (crosscoin, velmique, … =
#     the lowercase folder name), or
#   • the deployed branch is main/master AND files in this folder changed in the
#     last commit.
# Everything else (other brands' branches, feature branches, preview deploys) is
# skipped, so one brand's change never rebuilds another.
#
# Vercel contract: exit 0 = SKIP the build, exit 1 = BUILD.

BRAND_BRANCH="$(basename "$PWD" | tr '[:upper:]' '[:lower:]')"
REF="${VERCEL_GIT_COMMIT_REF:-}"

# No branch info available → build to be safe.
if [ -z "$REF" ]; then
  echo "⚠️  No VERCEL_GIT_COMMIT_REF — building to be safe."
  exit 1
fi

# This brand's dedicated deploy branch → always build.
if [ "$REF" = "$BRAND_BRANCH" ]; then
  echo "✅ On this brand's branch ('$BRAND_BRANCH') — building."
  exit 1
fi

# Shared integration branch → build only if THIS folder changed.
if [ "$REF" = "main" ] || [ "$REF" = "master" ]; then
  if git diff --quiet HEAD^ HEAD .; then
    echo "🚫 On '$REF' but no changes in this folder — skipping."
    exit 0
  fi
  echo "✅ On '$REF' with changes in this folder — building."
  exit 1
fi

# Any other branch (another brand, a feature branch, a preview) → skip.
echo "🚫 Branch '$REF' is neither this brand's branch nor main — skipping."
exit 0
