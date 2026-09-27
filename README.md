# CibaMusic

按意群分类记忆 TOEFL 词汇的跨平台移动端应用。基于 **React Native + Expo + EAS** 构建。

- **4,123 托福核心高频词**：包含意群分类、词根助记、释义与真题例句。
- **艾宾浩斯间隔复习算法 (SRS)**：智能调度记忆曲线，按 稍后重来 · 1天(困难) · 3天(一般) · 7天(容易) 动态推算下次复习时间。
- **沉浸式闪卡**：卡片翻转、音标朗读（英音/美音）、生词本标记。
- **纯本地数据私密存储**：无账号、无广告、纯离线运行。
- **免本地 Xcode**：支持浏览器 Web 端直接开发预览，支持通过 EAS (Expo Application Services) 云端一键打出 iOS (.ipa) 与 Android (.apk)。

---

## 项目结构

```
ciba/
├── src/
│   ├── assets/              # Logo、风车图标、App 图标
│   ├── data/
│   │   └── words.json       # 4,123 词托福词库完整数据库
│   ├── types/
│   │   └── index.ts         # 单词、进度模型、统计类型定义
│   ├── theme/
│   │   └── colors.ts        # 糍粑设计系统（琥珀橙、米白底、风车四色分类）
│   ├── storage/
│   │   └── progressStore.tsx# AsyncStorage 持久化与艾宾浩斯复习调度算法
│   ├── navigation/
│   │   └── RootNavigator.tsx# 底部 3 大 Tab + 页面路由栈
│   ├── screens/
│   │   ├── HomeScreen.tsx   # 今日学习看板 + 34 个大类意群列表
│   │   ├── WordListScreen.tsx # 意群单词列表 + 即时中英文搜索筛选
│   │   ├── FlashcardScreen.tsx# 核心闪卡背词界面（翻转、发音、4档打分）
│   │   ├── BookmarksScreen.tsx# 生词本
│   │   └── ProfileScreen.tsx  # 学习统计、目标设置、发音偏好、数据导出
│   └── components/
│       ├── WordCard.tsx     # 单词卡片组件
│       ├── Header.tsx       # 统一样式原生导航头
│       └── ProgressBar.tsx  # 细致圆角进度条
├── app.json                 # Expo 应用元数据（Bundle ID、图标、权限等）
├── eas.json                 # EAS 云端打包 Profile 配置
├── package.json             # 依赖管理
└── tsconfig.json            # TypeScript 配置文件
```

---

## 本地快速开发与预览

> 本机只需要 Node.js (推荐 v18 或 v20)，**无需安装任何 Xcode**！

```bash
# 1. 启动 Web 调试（在浏览器直接体验 App 全部功能）
npm run web

# 2. 或者启动 Expo 开发服务器（可通过 Expo Go App 扫码在真机运行）
npm start
```

---

## Apple Music 订阅检测（MusicKit）

App 启动后会读一次设备上的 Apple Music 订阅状态，未订阅时在首页给一条**非阻断**的引导条
（最多两次、可永久关闭），点「去订阅」跳 `https://music.apple.com/subscribe`。
播放页如果播的是试听片段，也会显示「试听片段 · 订阅 Apple Music 听完整版」。

### 需要的一次性配置

1. Apple Developer → Certificates, Identifiers & Profiles → Identifiers → 打开
   `com.yugusoft.CibaEnglish.music` → **App Services → 勾选 MusicKit** → 保存
   （这一步同时是 Apple 官方「Automatic Developer Token Generation」的开关，
   所以 iOS 端不需要自建 developer token/JWT 服务）
2. 重新打 EAS 包才生效：`eas build -p ios --profile preview-device`
   （Expo Go / 模拟器一律拿不到订阅状态，代码会按「未知」处理，不弹任何提示）

### 代码结构

| 位置 | 作用 |
| --- | --- |
| `modules/apple-music-subscription/` | 本地 Expo 原生模块（Swift，`MusicSubscription.current`） |
| `src/services/appleMusic.ts` | 统一门面：三态状态、24h 缓存、提示次数、跳转订阅 |
| `src/hooks/useAppleMusicSubscription.ts` | 组件用：挂载校准 + 回前台校准 |
| `src/components/AppleMusicPrompt.tsx` | 首页引导条 |

状态三态：`subscribed` 已订阅 / `eligible` 未订阅可引导 / `unknown` 读不到（安卓、Expo Go、
没登录 Apple Music、模拟器）—— 只有 `eligible` 才会提示。

### 方案 B（全曲播放）接入点

`src/services/player/` 已经把播放源抽象好：`preview`（expo-av 试听）和 `appleMusic`（MusicKit 全曲）
实现同一个 `PlayerBackend` 接口，`musicPlayer` 按可用性选源，页面层不感知。
接通全曲时只改两处：`appleMusicBackend.ts` 里把 `APPLE_MUSIC_PLAYBACK_ENABLED` 置 true 并实现播放方法。

---

## 云端全自动打包 (EAS Build)

借助 Expo 官方的 EAS (Expo Application Services)，你可以在**无需本地 Mac、无需本地 Xcode** 的情况下，由 Expo 云端服务器自动构建打包：

### 1. 安装与登录 EAS CLI

```bash
npm install -g eas-cli
eas login
```

### 2. 云端构建

- **iOS 构建**（生成用于测试侧载或模拟器的 `.ipa`）：
  ```bash
  eas build --platform ios --profile preview
  ```
- **Android 构建**（生成可直接安装的 `.apk`）：
  ```bash
  eas build --platform android --profile preview
  ```
- **双端同时构建**：
  ```bash
  eas build --platform all --profile preview
  ```

构建完成后，EAS 会直接在终端提供下载链接，点击即可下载安装包。

---

## 真机签名包与 TestFlight 内测

> 云端构建 workflow 已重新启用：`.github/workflows/ios-eas-build.yml`，
> 打 tag（`v*`）或在 Actions 里手动 Run workflow 都会触发。
> 注意 `.github/workflows/ios-build-release.yml` **也监听 `v*` tag**（走 GitHub 的 macOS
> runner 出未签名 IPA + GitHub Release），两个一起跑会重复构建，按需二选一或改掉其中一个的触发条件。

本机是 macOS 13 + Xcode 15 的情况下无法调试 iOS 18+ 真机，上架/内测包统一走 **EAS 云端构建**：云端自带 Xcode 16，自动完成编译、签名、上传 TestFlight。

### 一次性准备（在本机执行，只需做一次）

本项目用**项目级账号**操作 EAS，不碰全局登录态（`eas login` 会改全局 `~/.expo`/钥匙串，影响其它项目）：

```bash
# 1. 用新账号登录 https://expo.dev → Account Settings → Access Tokens → Create token
# 2. 把令牌写进项目根目录的 .env.local（.gitignore 已忽略 .env*，不会提交）
echo 'EXPO_TOKEN=你的个人访问令牌' > .env.local

./scripts/eas.sh whoami                        # 确认用的是新账号
./scripts/eas.sh init                          # 生成项目，把 extra.eas.projectId 写入 app.json
./scripts/eas.sh credentials --platform ios    # 按提示登录 Apple，让 EAS 托管分发证书与描述文件
```

> ⚠️ 菜单里 profile 要选 **production**（App Store 分发，**无需注册测试设备**）。
> 若选了 internal 类 profile，EAS 会要求 Ad Hoc 设备 UDID 并报
> `Run 'eas device:create' to register your devices first`——那是另一条路，见文末。

在 [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens) 生成 **Personal Access Token**；
在 App Store Connect → 用户和访问 → 密钥 生成 **API Key**，下载 `.p8`（只能下载一次）。

### 配置 GitHub Secrets

仓库 Settings → Secrets and variables → Actions：

| Secret | 说明 |
| --- | --- |
| `EXPO_TOKEN` | Expo Personal Access Token |
| `EXPO_PROJECT_ID` | `eas init` 后 `app.json` 里的 `extra.eas.projectId` |
| `ASC_API_KEY_ID` | App Store Connect API Key 的 Key ID |
| `ASC_API_KEY_ISSUER_ID` | App Store Connect API Key 的 Issuer ID |
| `ASC_API_KEY_P8` | `.p8` 文件**内容**（不是路径，见下方说明） |
| `APPLE_TEAM_ID` | Apple Developer Team ID（选填） |
| `ASC_APP_ID` | App Store Connect 里 App 的 Apple ID（选填，可跳过创建 App 步骤） |

#### `ASC_API_KEY_P8` 怎么填

Secret 是纯文本框，填的是**文件内容**。推荐先把内容拷到剪贴板：

```bash
pbcopy < ~/Downloads/AuthKey_XXXXXXXXXX.p8
```

然后在 Secret 的 **Value** 框里 `Cmd+V` 粘贴即可（会带换行，GitHub 能正常保存）。

如果粘贴后换行被吃掉，改用 base64 一行版（workflow 两种都认）：

```bash
base64 -i ~/Downloads/AuthKey_XXXXXXXXXX.p8 | pbcopy
```

填好后**把本地的 `.p8` 删掉或移出仓库目录**，切勿提交进 git。

### 触发构建

- 推 tag：`git tag v1.1.1 && git push origin v1.1.1`
- 或手动：Actions → **EAS Build & Submit iOS** → Run workflow（可选 `production` / `preview-device`，以及是否上传 TestFlight）

构建产物与下载链接在 [expo.dev](https://expo.dev) 对应项目页；上传成功约 10~15 分钟后可在 TestFlight 安装，沙箱内购即可正常测试。

### 附：绕过 TestFlight 直接装到手机（Ad Hoc）

`preview-device` profile 是 internal 分发，依赖 Ad Hoc 描述文件，需要先注册设备 UDID：

```bash
eas device:create   # 终端会给出一个链接，用 iPhone 打开并点击注册即可
eas device:list     # 确认设备已入列表
eas build --platform ios --profile preview-device
```

之后这份构建在 expo.dev 上会给出安装链接，注册过的设备可直接打开安装，无需等待 TestFlight 处理。
