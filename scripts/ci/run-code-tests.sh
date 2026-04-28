#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${repo_root}"

. "${repo_root}/scripts/ci/setup-node20.sh"

reports_root="${repo_root}/reports"
backend_report_dir="${reports_root}/backend"
frontend_report_dir="${reports_root}/frontend"
frontend_workspace_report_dir="${repo_root}/frontend/reports"

rm -rf "${backend_report_dir}" "${frontend_report_dir}" "${frontend_workspace_report_dir}"
mkdir -p "${backend_report_dir}" "${frontend_report_dir}" "${frontend_workspace_report_dir}"

export CI=true
export JWT_SECRET="${JWT_SECRET:-codex-ci-jwt-secret}"
export JEST_JUNIT_OUTPUT_DIR="${backend_report_dir}"
export JEST_JUNIT_OUTPUT_NAME="junit.xml"
export JEST_JUNIT_ADD_FILE_ATTRIBUTE="true"

postgres_container_name="campus-market-ci-postgres-${RANDOM}-$$"
postgres_started="false"
postgres_image="${CI_POSTGRES_IMAGE:-postgres:16-alpine}"
postgres_user="${CI_POSTGRES_USER:-postgres}"
postgres_password="${CI_POSTGRES_PASSWORD:-password}"
postgres_db="${CI_POSTGRES_DB:-campus_market}"
postgres_port="${CI_POSTGRES_PORT:-5432}"

cleanup() {
  if [[ "${postgres_started}" == "true" ]]; then
    docker rm -f "${postgres_container_name}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

if [[ -z "${DATABASE_URL:-}" ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "[ci] 未提供 DATABASE_URL，且当前环境缺少 docker，无法启动测试数据库" >&2
    exit 1
  fi

  docker rm -f "${postgres_container_name}" >/dev/null 2>&1 || true
  docker run -d \
    --name "${postgres_container_name}" \
    -e POSTGRES_USER="${postgres_user}" \
    -e POSTGRES_PASSWORD="${postgres_password}" \
    -e POSTGRES_DB="${postgres_db}" \
    -p "${postgres_port}:5432" \
    --health-cmd "pg_isready -U ${postgres_user} -d ${postgres_db}" \
    --health-interval 5s \
    --health-timeout 5s \
    --health-retries 20 \
    "${postgres_image}" >/dev/null
  postgres_started="true"

  for _ in $(seq 1 60); do
    health_status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' "${postgres_container_name}" 2>/dev/null || echo unknown)"
    if [[ "${health_status}" == "healthy" ]]; then
      break
    fi
    sleep 2
  done

  final_status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' "${postgres_container_name}")"
  if [[ "${final_status}" != "healthy" ]]; then
    echo "[ci] PostgreSQL 容器未在预期时间内就绪，当前状态: ${final_status}" >&2
    docker logs "${postgres_container_name}" >&2 || true
    exit 1
  fi

  export DATABASE_URL="postgresql://${postgres_user}:${postgres_password}@127.0.0.1:${postgres_port}/${postgres_db}?schema=public"
fi

npm ci
npm --workspace campus-market-backend run test:prepare-db
npm run test:ci

if [[ -d "${repo_root}/backend/coverage" ]]; then
  mkdir -p "${backend_report_dir}/coverage"
  cp -R "${repo_root}/backend/coverage/." "${backend_report_dir}/coverage/"
fi

if [[ -d "${repo_root}/frontend/coverage" ]]; then
  mkdir -p "${frontend_report_dir}/coverage"
  cp -R "${repo_root}/frontend/coverage/." "${frontend_report_dir}/coverage/"
fi

if [[ -f "${repo_root}/frontend/reports/frontend-junit.xml" ]]; then
  cp "${repo_root}/frontend/reports/frontend-junit.xml" "${frontend_report_dir}/junit.xml"
fi

cat <<EOF > "${reports_root}/code-level-tests-summary.txt"
Node: $(node -v)
NPM: $(npm -v)
Database URL host: ${DATABASE_URL#*@}
Backend JUnit: ${backend_report_dir}/junit.xml
Frontend JUnit: ${frontend_report_dir}/junit.xml
EOF
