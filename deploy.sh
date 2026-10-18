#!/usr/bin/env bash
# 一键发布到 GitHub Pages（需要已登录的 gh CLI：gh auth login）
set -euo pipefail
REPO="${1:-miband10-configurator}"
OWNER="$(gh api user -q .login)"

if ! gh repo view "$OWNER/$REPO" >/dev/null 2>&1; then
  gh repo create "$REPO" --public --source=. --remote=origin \
    --description "Xiaomi Smart Band 10 high-fidelity Web 3D configurator"
fi

git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$OWNER/$REPO.git"
git branch -M main
git push -u origin main

# 开启 Pages（GitHub Actions 源）
gh api -X POST "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 || \
  gh api -X PUT "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 || true

echo "推送完成。Actions 构建结束后访问："
echo "  https://$OWNER.github.io/$REPO/"
