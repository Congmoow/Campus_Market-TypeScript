#!/bin/sh
set -eu

cd /app

UPLOAD_ROOT="${UPLOAD_DIR:-uploads}"

mkdir -p "${UPLOAD_ROOT}" "${UPLOAD_ROOT}/avatars" "${UPLOAD_ROOT}/products" "${UPLOAD_ROOT}/chat"

attempt=1
max_attempts=10

until npm exec --workspace campus-market-backend prisma migrate deploy --schema backend/prisma/schema.prisma; do
  if [ "${attempt}" -ge "${max_attempts}" ]; then
    echo "Prisma migrate deploy failed after ${max_attempts} attempts." >&2
    exit 1
  fi

  echo "Prisma migrate deploy failed, retrying in 3 seconds (${attempt}/${max_attempts})..." >&2
  attempt=$((attempt + 1))
  sleep 3
done

exec npm run start --workspace campus-market-backend
