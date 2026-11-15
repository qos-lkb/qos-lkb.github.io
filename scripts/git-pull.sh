#!/usr/bin/env bash
# Safe git pull when data_dictionary.md was regenerated locally (blocks default pull).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

remote="${1:-origin}"
branch="${2:-main}"

if ! git diff --quiet -- data_dictionary.md 2>/dev/null \
    || ! git diff --cached --quiet -- data_dictionary.md 2>/dev/null; then
    echo "還原本機 data_dictionary.md（自動產生檔，pull 後可再跑 php update_data_dictionary.php）…"
    git restore --staged --worktree data_dictionary.md 2>/dev/null \
        || git checkout -- data_dictionary.md
fi

echo "git pull ${remote} ${branch} …"
git pull "${remote}" "${branch}"

if command -v php >/dev/null 2>&1; then
    php update_data_dictionary.php || true
else
    echo "未找到 php；略過 update_data_dictionary.php。"
fi