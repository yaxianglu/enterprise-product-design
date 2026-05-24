#!/usr/bin/env bash
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
WEB_DIR="$REPO/apps/web"
PORT=3014
LOG="/Users/mac/.doc-cloud/logs/enterprise-product-design-frontend.log"

pkill -f "PORT=$PORT.*standalone/server.js" 2>/dev/null || true
pkill -f "standalone/server.js" 2>/dev/null || true
sleep 1

cd "$WEB_DIR"
mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static && cp -R .next/static .next/standalone/.next/static
[ -d public ] && { rm -rf .next/standalone/public && cp -R public .next/standalone/public; } || true

JWT_SECRET=enterprise-demo-shared-secret-2026 \
HOSTNAME=0.0.0.0 PORT=$PORT \
nohup node .next/standalone/server.js > "$LOG" 2>&1 &
echo $! > "$REPO/.runtime/web.pid"
echo "web started on :$PORT (PID $!)"
