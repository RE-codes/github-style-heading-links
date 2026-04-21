#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "${repo_root}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${repo_root}/.env"
  set +a
fi

: "${OBSIDIAN_VAULT_PLUGIN_DIR:?OBSIDIAN_VAULT_PLUGIN_DIR is not set. Define it in .env or the environment.}"
vault_plugin_dir="${OBSIDIAN_VAULT_PLUGIN_DIR}"

artifacts=(
  "manifest.json"
  "main.js"
  "styles.css"
)

if [[ ! -f "${repo_root}/main.js" ]]; then
  echo "main.js is missing. Run 'npm run build' or 'npm run dev' first." >&2
  exit 1
fi

mkdir -p "${vault_plugin_dir}"

for artifact in "${artifacts[@]}"; do
  cp "${repo_root}/${artifact}" "${vault_plugin_dir}/${artifact}"
done
