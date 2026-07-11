#!/bin/bash
# write-mobile-env.sh — write mobile/.env for the Metro bundler from CI env vars.
# Used by both the ota-update and ios-testflight Codemagic workflows so the
# EXPO_PUBLIC_* variable list can't drift out of sync between them.
set -e

cd "$(dirname "$0")/.."

echo "EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL" > mobile/.env
echo "EXPO_PUBLIC_API_KEY=$EXPO_PUBLIC_API_KEY" >> mobile/.env
echo "EXPO_PUBLIC_REVENUECAT_IOS_KEY=$EXPO_PUBLIC_REVENUECAT_IOS_KEY" >> mobile/.env
echo "EXPO_PUBLIC_ANTHROPIC_API_KEY=$EXPO_PUBLIC_ANTHROPIC_API_KEY" >> mobile/.env
echo "EXPO_PUBLIC_ADMIN_BYPASS_CODE=$EXPO_PUBLIC_ADMIN_BYPASS_CODE" >> mobile/.env

echo "--- mobile/.env contents (keys only) ---"
cut -d= -f1 mobile/.env || true
