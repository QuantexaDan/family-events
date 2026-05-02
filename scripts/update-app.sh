#!/bin/bash
set -e

APP_DIR="/home/ubuntu/family-events"
STANDALONE_DIR="$APP_DIR/.next/standalone"
DB_FILE="$STANDALONE_DIR/data/family-events.db"

cd "$APP_DIR"

echo "=== Pulling latest code ==="
git pull

echo "=== Installing dependencies ==="
npm ci

echo "=== Backing up live database ==="
if [ -f "$DB_FILE" ]; then
  cp "$DB_FILE" "$APP_DIR/data/family-events.db.backup-$(date +%Y%m%d-%H%M%S)"
  cp "$DB_FILE" /tmp/family-events-live.db
  echo "Database backed up"
else
  echo "No existing standalone database found"
fi

echo "=== Building ==="
npm run build

echo "=== Copying static files ==="
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/

echo "=== Restoring live database ==="
mkdir -p "$STANDALONE_DIR/data"
if [ -f /tmp/family-events-live.db ]; then
  cp /tmp/family-events-live.db "$DB_FILE"
  echo "Live database restored"
elif [ -f "$APP_DIR/data/family-events.db" ]; then
  cp "$APP_DIR/data/family-events.db" "$DB_FILE"
  echo "Seed database copied (first deploy)"
fi

echo "=== Running migrations ==="
cd "$STANDALONE_DIR"
node -e "
const path = require('path');
process.chdir('$STANDALONE_DIR');
const { initDb } = require('./server/chunks/ssr/src_lib_db_ts_2c48af._.js');
initDb();
console.log('Migrations applied');
" 2>/dev/null || echo "Migration via require failed, will run on first request"
cd "$APP_DIR"

echo "=== Restarting service ==="
sudo systemctl restart family-events

sleep 2
if sudo systemctl is-active --quiet family-events; then
  echo "=== Update complete! App is running ==="
else
  echo "=== WARNING: Service failed to start ==="
  sudo journalctl -u family-events --no-pager -n 20
fi
