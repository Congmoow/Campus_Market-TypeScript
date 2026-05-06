#!/usr/bin/env bash

set -euo pipefail

if command -v node >/dev/null 2>&1; then
  current_major="$(node -p "process.versions.node.split('.')[0]")"
  if [[ "${current_major}" == "20" ]]; then
    return 0 2>/dev/null || exit 0
  fi
fi

uname_s="$(uname -s | tr '[:upper:]' '[:lower:]')"
uname_m="$(uname -m)"

case "${uname_s}" in
  linux) node_os="linux" ;;
  *)
    echo "[ci] 不支持的系统: ${uname_s}" >&2
    return 1 2>/dev/null || exit 1
    ;;
esac

case "${uname_m}" in
  x86_64|amd64) node_arch="x64" ;;
  aarch64|arm64) node_arch="arm64" ;;
  *)
    echo "[ci] 不支持的架构: ${uname_m}" >&2
    return 1 2>/dev/null || exit 1
    ;;
esac

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
tools_dir="${repo_root}/.ci-tools"
install_dir="${tools_dir}/node20"
archive_dir="${tools_dir}/downloads"
base_url="${NODE20_DIST_BASE_URL:-https://nodejs.org/dist/latest-v20.x}"

mkdir -p "${install_dir}" "${archive_dir}"

archive_name="$(
  curl -fsSL "${base_url}/SHASUMS256.txt" | awk -v node_os="${node_os}" -v node_arch="${node_arch}" '
    $2 ~ ("node-v20\\.[0-9]+\\.[0-9]+-" node_os "-" node_arch "\\.tar\\.xz$") { print $2; exit }
  '
)"

if [[ -z "${archive_name}" ]]; then
  echo "[ci] 无法解析 Node 20 发行包名称" >&2
  return 1 2>/dev/null || exit 1
fi

archive_path="${archive_dir}/${archive_name}"

if [[ ! -f "${archive_path}" ]]; then
  curl -fsSL "${base_url}/${archive_name}" -o "${archive_path}"
fi

rm -rf "${install_dir}"
mkdir -p "${install_dir}"
tar -xJf "${archive_path}" -C "${install_dir}" --strip-components=1

export PATH="${install_dir}/bin:${PATH}"
hash -r

echo "[ci] 已切换到 Node $(node -v)"
