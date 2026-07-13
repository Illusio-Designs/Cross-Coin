#!/usr/bin/env bash
#
# Vercel "Ignored Build Step" — production-only, folder-scoped.
#
# Each Vercel project: Root Directory = this brand's folder; Ignored Build Step
# (Custom) = bash vercel-ignore-build.sh
#
#   1. Skips EVERY preview build — any non-production branch, PR, or feature
#      branch. No preview deployments are built.
#   2. On the Production Branch, builds ONLY when files in this folder changed,
#      so one brand's change never rebuilds another.
#
# Works whatever the project's Production Branch is (main, or a brand branch).
# Vercel contract: exit 0 = SKIP the build, exit 1 = BUILD.

# 1) Stop all preview builds (VERCEL_ENV is "production" only for the project's
#    Production Branch; everything else is "preview").
if [ "$VERCEL_ENV" != "production" ]; then
  echo "🚫 ${VERCEL_ENV:-non-production} deploy — preview build skipped."
  exit 0
fi

# 2) Production deploy: build only if this folder changed in the last commit.
if git diff --quiet HEAD^ HEAD .; then
  echo "🚫 Production deploy, but no changes in this folder — skipping."
  exit 0
fi

echo "✅ Production deploy with changes in this folder — building."
exit 1
