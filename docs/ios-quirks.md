<!-- docs/ios-quirks.md — 浏览器 quirk 台账（#287 落地 · 常青文档） -->
<!-- 维护纪律：新条目必须附 议题号/提交锚 + 涉及文件:行 + 回归锚（tests/e2e 文件名）；无实证不录入。 -->
<!-- 新应用开发前必读本表（scripts/new-app.mjs 顶部指路注释同步）；翻新规避代码前先核对本表回归锚清单。 -->

# 浏览器 quirk 台账（按浏览器分节 · #216 建议形态）

> 目的：quirk 知识从已关议题散落状态收拢为单表真源——新应用开发时不再翻旧账，规避代码不再被后人当"冗余"清理（#287 问题陈述）。
> 录入纪律：每条 = qurik 现象 / 影响面 / 本仓已采用的规避模式 / 涉及文件 / 回归锚。**无实证不录入**。

## iOS Safari

### ① `audio.volume` 只读恒 1（首条 · #116 · v9.94 已修）

- **现象**：iOS Safari 中 `HTMLMediaElement.volume` 只读（赋值静默无效，恒为 1）——直接写 `audio.volume` 的音量控制在 iOS 上等于白写。
- **影响面**：媒体类应用全部音量路径（音乐/视频/音效）。
- **本仓规避模式**：WebAudio **GainNode 音量链**——音量真值移交 `gainChain`，媒体元素"中性化"恒 1（防双层衰减），桌面端 `audio.volume` 直连路径语义零变化（接管与否按音源类型分流）。
- **涉及文件**：`ios-desktop/js/media-service.js:26`（链地基注释）、`:85`（levelToGain 真值）、`:143`（元素中性化）。
- **回归锚（清理规避代码前必跑）**：`tests/media-gain.test.js` · `tests/audio-graph.test.js` · `e2e-v116-media-gain.mjs` · `e2e-v117-audio-graph.mjs`。

### ② SW 与 Cache API 存储面限制（#189 pixel-xxl 实录 · 跨仓证据）

- **现象**：iOS Safari 会在存储压力下**清除 Cache API**（PWA 离线缓存静默蒸发）；微信内置内核**禁用 Service Worker**（#189 实录原话）。
- **影响面**：一切"依赖 SW 离线可用"的功能承诺——离线不可当作唯一存储层。
- **本仓/姊妹仓规避模式**：pixel-xxl 仓侧被迫引入 **IndexedDB 双保险**（关键数据 Cache API 之外再落一份 IndexedDB）；本仓暂未做同构双保险，**新应用禁止把唯一数据副本放进 Cache API**（#287 原文风险句：勿再依赖 SW 离线）。
- **涉及文件**：本仓 SW 注册面见 `#282`（根 index.html 注册、ios-desktop/index.html 不注册——深链与离线入口不对称，该议题在册未结）。
- **回归锚**：暂无专项锚（#282 结题时应补）。

### ③ PWA 安装面：iOS 走 apple-touch-icon（#292 审计固化）

- **现象**：iOS 添加到主屏不读 manifest.icons，只认 `<link rel="apple-touch-icon">`（180×180 标准）；Android 启动器才看 manifest maskable。
- **本仓规避模式**：双轨并存——`index.html:14` apple-touch-icon 180×180 + `manifest.webmanifest` maskable 512（绿底全出血+字形安全区 PIL 实证 117.5px≤204.8px）。
- **涉及文件**：`index.html:8/9/14` · `icons/` 四件 · `scripts/audit-manifest-icons.mjs`。
- **回归锚**：`npm run check:manifest`（22/22 · #292 v10.77）+ `tests/v292-manifest-icons.test.js`。

## 微信内置内核（X5/WKWebView）

### ④ Service Worker 全禁（#189 实录 · 跨仓证据）

- **现象**：微信内打开页面 SW 注册/拦截不可用——离线缓存、预缓存路由全部失效。
- **规避模式**：不做 SW 可用性假设；依赖 SW 的功能必须有可见的离线降级错误态（本仓先例：appstore 目录全失走「目录暂不可达 · 离线模式」可见错误态，#183 裁决纪律）。
- **涉及文件**：`ios-desktop/js/pkg/pkg-catalog.js`（降级语义）。
- **回归锚**：`tests/catalog-dist.test.js`（降级可见错误态语义维持锚）。

## Edge（#216 联动分节）

### ⑤ 待录入

- #216（Edge 兼容实录）的具体 quirk 条目**待按录入纪律补全**（需回读 #216 原文提取实证后录入，本表不预填无实证内容）。

## e2e 侧 iOS 规避回归锚索引（#287 建议③ · 防后人"清理"规避代码）

| 回归锚 | 守护的 quirk |
|---|---|
| `tests/media-gain.test.js` / `tests/audio-graph.test.js` / `e2e-v116-media-gain.mjs` / `e2e-v117-audio-graph.mjs` | ① audio.volume 只读 → GainNode 链 |
| `tests/catalog-dist.test.js` / `e2e-v1031-online-catalog.mjs` | ④ SW/网络不可用 → 可见离线降级态 |
| `tests/v292-manifest-icons.test.js` + `check:manifest` | ③ iOS 主屏图标双轨 |

> 就地注释标注（在各 e2e 文件头加 quirk 指路注释）**暂缓**：check:comments 对 317 文件做失配扫描，改动旧测试文件注释面有引入新失配的风险——以本表索引为唯一指路真源，待 check:comments 口径评估后再就地标注。
