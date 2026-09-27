#!/usr/bin/env bash
#
# 项目级 EAS 入口：只认本项目 .env.local 里的 EXPO_TOKEN，
# 不读写全局登录态（~/.expo、macOS 钥匙串），因此不会影响其它项目的 Expo 账号。
#
# 用法：
#   ./scripts/eas.sh whoami                       # 看当前用的是哪个账号
#   ./scripts/eas.sh init                         # 首次：在本账号下建/关联 EAS 项目，写入 app.json 的 projectId
#   ./scripts/eas.sh build -p ios --profile preview-device
#   ./scripts/eas.sh build -p ios --profile production
#   ./scripts/eas.sh submit -p ios --latest       # 把最新构建上传 TestFlight
#   ./scripts/eas.sh credentials -p ios           # 初始化/修复 Apple 证书与描述文件
#
set -euo pipefail
cd "$(dirname "$0")/.."

# .env.local 在 .gitignore 里（.env*），不会被提交
if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.local
  set +a
fi

if [ -z "${EXPO_TOKEN:-}" ]; then
  echo "缺少 EXPO_TOKEN。"
  echo "1) 用新账号登录 https://expo.dev → Account Settings → Access Tokens → Create token"
  echo "2) 在本项目根目录建 .env.local，内容写一行：EXPO_TOKEN=你的token"
  exit 1
fi

echo "使用项目级 EXPO_TOKEN（${#EXPO_TOKEN} 位），全局登录态不受影响"
exec npx --yes eas-cli "$@"
