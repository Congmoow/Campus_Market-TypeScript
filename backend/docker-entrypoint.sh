#!/bin/sh
set -eu

cd /app

UPLOAD_ROOT="${UPLOAD_DIR:-uploads}"

mkdir -p "${UPLOAD_ROOT}" "${UPLOAD_ROOT}/avatars" "${UPLOAD_ROOT}/products" "${UPLOAD_ROOT}/chat"

attempt=1
max_attempts=5

while true; do
  if node backend/dist/scripts/docker-db-init.js; then
    break
  fi

  if [ "${attempt}" -ge "${max_attempts}" ]; then
    echo "Database initialization failed after ${max_attempts} attempts." >&2
    exit 1
  fi

  echo "Database initialization failed, retrying in 3 seconds (${attempt}/${max_attempts})..." >&2
  attempt=$((attempt + 1))
  sleep 3
done

exec node backend/dist/server.js
