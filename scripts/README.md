# 项目脚本

## eas.sh —— 项目级 EAS 入口

不修改全局 Expo 登录态，只读本项目 `.env.local` 里的 `EXPO_TOKEN`：

```bash
echo 'EXPO_TOKEN=你的个人访问令牌' > .env.local   # .gitignore 已忽略 .env*
./scripts/eas.sh whoami
./scripts/eas.sh init                              # 首次：写入 app.json 的 projectId
./scripts/eas.sh build -p ios --profile production
./scripts/eas.sh submit -p ios --latest            # 上传 TestFlight
```

令牌在 https://expo.dev → Account Settings → Access Tokens 生成（选对账号/组织）。
