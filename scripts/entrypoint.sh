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
  echo "📡 [Attempt $ATTEMPT/$MAX_RETRIES] Running prisma db push using pre-installed binary..."
  if ./node_modules/.bin/prisma db push --skip-generate; then
    echo "✅ Database schema verified and synchronized successfully!"
    break
  else
    echo "⚠️ Database connection attempt $ATTEMPT failed."
    if [ $ATTEMPT -eq $MAX_RETRIES ]; then
      echo "❌ ERROR: Unable to reach database after $MAX_RETRIES attempts."
      echo "👉 Troubleshooting checklist for Remote MySQL / TiDB Cloud:"
      echo "   1. Ensure your database cluster is active and accepting connections."
      echo "   2. Ensure the firewall / security group permits traffic from this container IP."
      echo "   3. Ensure DATABASE_URL includes valid Prisma MySQL parameters: '?sslmode=require' (or 'prefer')."
      echo "   4. For custom CA roots, append '&sslcert=/path/to/ca.pem' in DATABASE_URL."
      echo "   5. Note: 'sslaccept=strict' is NOT a valid MySQL parameter; use 'sslmode=require'."
      exit 1
    fi
    echo "⏳ Waiting ${RETRY_DELAY}s for database server..."
    sleep $RETRY_DELAY
    ATTEMPT=$((ATTEMPT + 1))
  fi
done

echo "🎉 Starting 100% DESIGN Studio OS Web Server on port ${PORT:-3000}..."
exec npm run start
