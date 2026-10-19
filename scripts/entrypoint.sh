#!/bin/sh
set -e

echo "=========================================="
echo "🚀 100% DESIGN Studio OS — Booting Container"
echo "=========================================="

MAX_RETRIES=6
RETRY_DELAY=6
ATTEMPT=1

echo "⏳ Checking database connectivity and applying schema..."

while [ $ATTEMPT -le $MAX_RETRIES ]; do
  echo "📡 [Attempt $ATTEMPT/$MAX_RETRIES] Running prisma db push..."
  if npx prisma db push --accept-data-loss; then
    echo "✅ Database schema verified and synchronized successfully!"
    break
  else
    echo "⚠️ Database connection attempt $ATTEMPT failed."
    if [ $ATTEMPT -eq $MAX_RETRIES ]; then
      echo "❌ ERROR: Unable to reach database after $MAX_RETRIES attempts."
      echo "👉 Troubleshooting checklist for TiDB Cloud / Remote MySQL:"
      echo "   1. Ensure your TiDB Cloud cluster is ACTIVE (not Paused or Suspended in TiDB Cloud Console)."
      echo "   2. In TiDB Cloud -> Security -> IP Access List: ensure 0.0.0.0/0 is allowed."
      echo "   3. Ensure DATABASE_URL includes '?sslaccept=strict' for secure TLS handshake."
      echo "   4. Verify DATABASE_URL username and password on your Render Dashboard."
      exit 1
    fi
    echo "⏳ Waiting ${RETRY_DELAY}s for database server (e.g. TiDB Serverless cold start)..."
    sleep $RETRY_DELAY
    ATTEMPT=$((ATTEMPT + 1))
  fi
done

echo "🎉 Starting 100% DESIGN Studio OS Web Server on port ${PORT:-3000}..."
exec npm run start
