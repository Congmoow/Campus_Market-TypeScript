#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${repo_root}"

. "${repo_root}/scripts/ci/setup-node20.sh"

reports_root="${repo_root}/reports"
acceptance_report_dir="${reports_root}/acceptance"
docker_report_dir="${reports_root}/docker"

rm -rf "${acceptance_report_dir}" "${docker_report_dir}"
mkdir -p "${acceptance_report_dir}" "${docker_report_dir}"

export CI=true
export DOCKER_ACCEPTANCE_FRONTEND_URL="${DOCKER_ACCEPTANCE_FRONTEND_URL:-http://localhost}"
export DOCKER_ACCEPTANCE_BACKEND_URL="${DOCKER_ACCEPTANCE_BACKEND_URL:-http://localhost:3000}"

compose_args=(compose --env-file .env.docker.example)
acceptance_exit_code=0

collect_docker_artifacts() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "[ci] 当前环境缺少 docker，无法收集 Docker 诊断信息" > "${docker_report_dir}/docker-missing.txt"
    return
  fi

  docker version > "${docker_report_dir}/docker-version.txt" 2>&1 || true
  docker compose version > "${docker_report_dir}/docker-compose-version.txt" 2>&1 || true
  docker "${compose_args[@]}" ps > "${docker_report_dir}/compose-ps.txt" 2>&1 || true
  docker "${compose_args[@]}" config > "${docker_report_dir}/compose-config.txt" 2>&1 || true
  docker "${compose_args[@]}" logs --timestamps --no-color > "${docker_report_dir}/compose.log" 2>&1 || true
  cp "${docker_report_dir}/compose.log" "${reports_root}/docker-compose.log" 2>/dev/null || true
  for service in postgres backend frontend; do
    docker "${compose_args[@]}" logs --timestamps --no-color "${service}" > "${docker_report_dir}/${service}.log" 2>&1 || true
  done
}

cleanup() {
  collect_docker_artifacts
  if command -v docker >/dev/null 2>&1; then
    docker "${compose_args[@]}" down -v --remove-orphans > "${docker_report_dir}/compose-down.txt" 2>&1 || true
  fi
}

trap cleanup EXIT

if ! command -v docker >/dev/null 2>&1; then
  echo "[ci] 当前环境缺少 docker，无法执行 Docker 验收" >&2
  exit 1
fi

npm ci
docker "${compose_args[@]}" up -d --build

set +e
npm run test:acceptance 2>&1 | tee "${acceptance_report_dir}/acceptance.log"
acceptance_exit_code="${PIPESTATUS[0]}"
set -e

cat <<EOF > "${acceptance_report_dir}/summary.txt"
Node: $(node -v)
NPM: $(npm -v)
Frontend URL: ${DOCKER_ACCEPTANCE_FRONTEND_URL}
Backend URL: ${DOCKER_ACCEPTANCE_BACKEND_URL}
Exit Code: ${acceptance_exit_code}
EOF

if [[ "${acceptance_exit_code}" -ne 0 ]]; then
  exit "${acceptance_exit_code}"
fi
