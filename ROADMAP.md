# ROADMAP.md — 项目拓展总路线图

> 本文是将「项目拓展方向建议」评审后采纳形成的下一步大计划。
> 核心思路：**先做"连接"（总线/权限/通知/VFS），再做"应用"（文件管理器/录音机），最后做"工程化"（SDK/测试/TS）**。
> 不再单纯堆应用数量——让前 29 个应用互通，比加第 30 个应用价值大得多。

## 前置完成（上一轮 4 项优化，全部落地并实测）

- [x] Vite 工程化 + sw.js cacheFirst 全量预缓存（离线秒开）
- [x] 真双应用分屏（Spring2D 双弹簧 + 可拖拽隔离带 + 并行动画）
- [x] APP_CLOSE 生命周期广播 + 子应用定时器清理（内存泄漏治理）
- [x] 设置 › 备份与恢复（localStorage + IndexedDB 全量导出/导入）

---

## 批次一：连接层（✅ 本轮已交付）

| # | 能力 | 实装文件 | 状态 |
|---|------|----------|------|
| 1 | **应用间通信总线** | 新增 `ios-desktop/js/app-bus.js`：定向投递/广播、目标未启动时排队、实例挂载后补投递、后台代发通知；`main.js` 注入子应用 SDK `window.__system` | ✅ |
| 2 | **统一通知 API** | `notifications.js` 新增 `NOTIFY` 消息分支：任意子应用经 `__system.notify()` 发 Heads-up 横幅 + 进通知中心 + 锁屏可见，尊重勿扰模式 | ✅ |
| 3 | **统一权限系统** | 新增 `ios-desktop/js/permissions.js`：MD3 权限对话框（拒绝/仅本次/允许）、五类权限（相机/麦克风/位置/通知/剪贴板）、localStorage 持久化（`ios-desktop:permissions`） | ✅ |
| 4 | **设置 › 应用权限管理** | `apps/settings.js` 新增第 5 页：已授权应用列表 + 逐项开关改判 + 重置全部权限 | ✅ |
| 5 | **联动① 便签→信息** | notes 卡片新增分享按钮 → `share/memo` → 信息"自我对话与备忘"自动生成消息；目标后台时桌面代发通知横幅 | ✅ |
| 6 | **联动② 相机→相册** | 拍照保存后 `photo/captured` → 相册自动出现新照片（含排队补投） | ✅ |
| 7 | **敏感 API 权限前置** | camera `getUserMedia` 前请求相机权限；weather 定位前请求位置权限（拒绝自动降级 IP 定位） | ✅ |

无头浏览器端到端实测：排队→打开→补投递、权限对话框三选项、持久化、开关改判、通知横幅全部通过。

## 批次二：系统级体验（✅ 本轮已交付）

- [x] 设置应用重构为"真设置"：声音与震动真实开关（WebAudio 合成音效 + `navigator.vibrate` 全局门控，状态广播给子应用）、应用管理整合（页 6：全部应用一览 + 卸载/恢复，与编辑模式移除同链路）、存储占用统计（页 7：localStorage 逐键 + IDB `storage.estimate` 配额 + 按应用归属聚合）、开发者选项（页 8：FPS 悬浮层 / 禁用 CSS 动画 / 重置桌面布局 / 清空全部数据）
- [x] 多 Profile / 多主题方案：工作/个人模式一键切换（新模块 `js/profiles.js`——壁纸交叉淡入 + 主题色相渐变补间 + 图标逐格弹簧重排；每模式独立记忆色相/外观模式/壁纸形态/桌面排列；快捷设置新增「Modes」动作磁贴）
- [x] 通知持久化：通知中心落盘 localStorage（上限 30 条），增删/清空/刷新全程一致
- [x] 世界时钟城市"钉"到 At a Glance 微件（走 app-bus 事件流：`clock/pin-city` / `clock/unpin-city` / `clock/request-pins` / `clock/pins-changed`，桌面 ⇄ 时钟双向同步，钉选列表持久化，chip 点击直达时钟）
- [x] 附加：系统音效引擎 `js/sound-haptics.js`（零音频文件，WebAudio 实时合成 8 种音效）、存储统计模块 `js/storage-stats.js`、开发者选项模块 `js/dev-options.js`、总线新增 `payload.__silent` 抑制位（系统同步事件不代发通知）
- [x] 部署加固：全站相对路径改造（Vite `base:'./'` + SW 相对回退 + manifest 相对 start_url/scope/icons），根路径与 GitHub Pages 项目子路径部署均可直接运行；新增 `.nojekyll` 与 GitHub Actions 自动部署工作流

## 批次三：数据层（✅ 本轮已交付）

- [x] `js/vfs.js` 虚拟文件系统：复用既有 `ios-desktop-files/kv` 存储库（IndexedDB），双键设计
      （`vfs:<path>` 存 Blob 主体 / `vfs-meta:<path>` 存 JSON 元数据，保证备份链路零改动兼容）；
      API：write / read / readText / readBlob / readURL / list / mkdir / move / copy / del /
      exists / stat / subscribe（前缀订阅）/ usage（用量统计），路径规范化（`.`/`..` 消解）、
      dataURL 自动转 Blob、孤儿键自愈、首次启动播种标准目录树 + 欢迎文档 + 相机胶卷迁移；
      子应用经注入 SDK `__system.fs` 桥接（FS_REQUEST/FS_RESULT，Blob 结构化克隆直传）
- [x] 「文件管理器」应用（`js/apps/files.js`，模块渲染型）：目录浏览（面包屑导航）、
      图片/音频/视频/文本内嵌预览、新建文件夹/文本文档、重命名、删除、从电脑导入、
      导出到电脑、存储概览卡；轻量拖拽（长按文件拖到文件夹行即移动，ghost + 全局指针接管）；
      分享到信息（files/share）/ 相册（photo/captured）/ 便签；应用内复制/剪切/粘贴
      （对接全局剪贴板，同名自动加序号）；桌面图标矢量新绘（app-icons.js `files`）
- [x] 全局剪贴板 `js/clipboard.js`：三类载荷（text / image / files），文本镜像真实系统剪贴板，
      剪切粘贴后才真正 move；子应用经 `__system.clipboard.write/read` 桥接，
      写入后广播 CLIPBOARD_CHANGED 供活跃应用刷新
- [x] 相册真持久化（附带修复）：photos 子应用接入 VFS（此前重启即清空）——启动时从
      `/photos` 恢复（Blob → objectURL），导入/拍摄/编辑保存/删除/清空全部同步落盘
- [x] 配套接线：state.js 无痕升级合并（版本号不变时新应用自动追加到末页，不重置用户布局）；
      app-bus 新增 files/share 默认文案；messages 子应用新增 files/share 接收分支（📄 消息）；
      storage-stats 归属规则（vfs: / vfs-meta: → 文件）；备份/恢复/恢复出厂零改动自动覆盖 VFS
- [x] 实测：agent-browser 端到端 —— 播种/写入/浏览/预览/新建/重命名/复制粘贴/剪切移动/拖拽/
      相册持久化（重载后仍在）/相册删除同步 VFS/分享到信息（排队→补投→会话出现）/剪贴板桥接
      （写入归因 + 读取回包）/存储页归属统计/备份键覆盖（3 内容键 + 9 元数据键）；
      过程中发现并修复面包屑导航无事件委托缺陷

## 批次四：大功能（✅ 已交付，详见下方实施明细）

- [x] 场景模式增强（勿扰纳入快照）+ Focus 番茄钟
- [x] 计算器升级：科学计算 + 单位换算 + 实时汇率
- [x] 录音机应用（MediaRecorder → VFS）

## 批次五：工程化（✅ 本轮全部交付）

- [x] **TypeScript 渐进迁移（第一步：基建 + spring/state/utils 全量类型化）**：
      采用「JS 优先 + 按文件 opt-in」路线（零构建双轨架构不破坏，Svelte/Vue 生态同款）——
      `tsconfig.json`（strict + allowJs + noEmit，全局 checkJs 关闭）+ `npm run typecheck`
      （tsc 7 原生编译器）；已迁移文件顶部加 `// @ts-check` 即获严格检查，未迁移文件
      照常解析与推断不报错。本轮类型化：spring.js（SpringParams typedef + 全方法签名 +
      RK4 加速度函数）、state.js（AppInfo/AppPage/DeskItem/FolderItem/IconDragState/
      GestureDrag/DesktopState 七个共享契约 typedef + localStorage 链路类型收口）、
      utils.js（含 ScreenRect 与可空参数契约）。负面验证：字段/参数/拼写三类错误均被
      拦截；迁移前后删除行逐行审计零运行时变化。后续迁移任何模块 = 加一行 @ts-check

- [x] **Vitest 单元测试（基础套件）**：`tests/spring.test.js` 11 例（makeSpringParams 公式、
      RK4 收敛与数值稳定性、高刚度 response=0.1s 不发散、欠阻尼过冲有界、临界阻尼无过冲、
      开关收敛对称、setTarget 中途改道、Spring2D 双轴）+ `tests/utils.test.js` 10 例
      （clamp 边界与 NaN 透传、smoothstep 端点/中点/钳制/单调性/负向区间/退化区间语义固化）；
      happy-dom 环境 + `tests/setup.js` 全局补桩；`npm test` 一键运行（21/21 通过）。
      page-stack APP_CLOSE 时序与备份往返仍由 agent-browser 端到端覆盖
- [x] **子应用 SDK 模板 + `npm run new-app <name> [中文标题]` CLI**：
      `scripts/app-template.html`（自包含 MD3 暗色 iframe 子应用，含 `__system` 总线/通知/
      权限/fs/剪贴板 SDK 用法示例与独立运行降级）+ `scripts/new-app.mjs`（kebab-case 校验、
      模块型应用撞名守卫、占位符替换、接入指引输出）；只新增文件，不自动改写既有源码
- [x] **性能监控面板 + a11y 基础**：FPS 悬浮层升级为性能面板（FPS + 平均帧耗时 +
      60s 火花图 + JS 堆内存 + 卡顿帧计数，Chromium 外优雅降级）；桌面图标补
      `role=button`/`tabindex`/`aria-label` 与 Enter/Space 键盘激活，页点 `aria-hidden`；
      `base.css` 增 `:focus-visible` 焦点环与 `prefers-reduced-motion` 全局降动效
      （CSS 层；JS 弹簧属直接操纵反馈不动）。高对比度主题留待主题系统扩展
- [ ] TypeScript 渐进迁移后续步骤：按模块逐步追加 `// @ts-check`（建议顺序：
      page-stack.js → app-window.js → desktop.js → recent-apps.js），并逐步收紧 tsconfig
      （全库 checkJs 开启）

---

## 场景测试深化轮：无头端到端场景网（✅ 本轮已交付）

- [x] **场景基座（tests/scenario-helpers.js）**：把真实 `ios-desktop/index.html` 的 body 骨架
      装入 happy-dom，动态 `import main.js` 触发与真机一致的模块级启动链
      （initDOM → 20+ init* → renderDesktopPages → initLockScreen）——不再是"纯函数 +
      手搓 DOM mock"，而是**全应用真引导**。测试层补桩只做三件事：canvas 2D 上下文
      Proxy 桩（happy-dom 未实现，返回 null 会炸启动链）、fetch 断网桩（at-a-glance
      天气同步零真实网络）、逻辑屏幕锁定 412×915 真机竖屏。vitest 配置补
      `disableIframePageLoading`（iframe 子应用不真加载，零噪声）。
      已有测试钩子（`window.__lockTest` / `__handleIframeGesture` / `__state`）直接复用
- [x] **六个场景文件 43 例**（合计 64/64 通过，`npm test` 14.6s）：
      · 引导冒烟（7）：启动链零崩溃、默认锁屏在场、桌面按数据渲染、图标 a11y 契约、
        后台骨架注入 —— 基座地基，其余文件失败先看这里
      · 锁屏解锁（6）：Pointer 事件真实驱动上滑手势 —— 慢速小幅回弹（弹簧归零）、
        大幅过 25% 屏高提交飞出、快速轻扫速度提交、相机快捷键解锁直开、锁屏手势闸门
      · Live Pager（10）：1:1 跟手精确 -110px、越界橡皮筋 60→21.0px（0.35 阻尼）、
        位移过半吸附落回 100vw 基准、快速轻甩惯性翻页、慢速小位移防误翻、
        飞行接管 matrix/matrix3d 双格式基点续算（readSliderTx 历史 bug 回归阵地）、
        none/畸形值兜底、图标起点防误触、滑动收尾 350ms click 吞噬
      · 应用开关（5）：点按图标真 click 链路展开、打开期桌面分页拖拽锁、
        底部手势桥接上滑关闭状态全复位、键盘 Enter 激活（a11y 同路径）、
        小幅上拖弹簧回弹不误关（拟人化时序过阈值线判定）
      · 后台多任务（7）：历史栈置顶去重上限 10 弹最老、卡片顺序/索引/焦点档位断言、
        差分量化档位精断（步长 220px / blur 0.5px 桶 1.5 / zIndex 88 / opacity 0.80）、
        **keyed 复用节点 identity（toBe 同一节点 = iframe 零重建契约）**、
        单卡上滑删除就地修剪其余卡 identity 不变、焦点卡点按几何直启、波浪全部清除归零
      · 数据持久化（8）：损坏/结构非法静默降级、合法存档恢复自定义排列 + initialApps
        字段回填、无痕升级末页追加新应用、removedApps 尊重卸载意图、末页满溢出新页、
        savePagesApps 往返一致（vi.resetModules 重导入全新模块图）
- [x] **场景测试抓出并修复真实 bug（桌面 velocity 尖峰）**：main.js 在越阈帧同步调用
      `beginLiveSwipe(startX)` + `moveLiveSwipe(currentX)`，两调用落在同一 tick，
      `dt` 被 1ms 下限兜底 → 越阈前累计位移被计成虚假高速尖峰（约 -7px/ms 写入 EMA），
      「慢速短拖 + 快速松手」被误判为轻甩翻页。修复：moveLiveSwipe 首帧只建立采样基准
      不更新速度（`livePager.seeded` 标志），第 2 帧起才是真实采样；轻甩/橡皮筋/跟手
      行为不变（场景测试全绿验证）。这也是"场景测试深化"价值的第一个实证：
      纯函数单测永远测不到事件接线层的时序伪影
- [x] **附带修正**：tsconfig.json 的重复 `"//"` 键注释改为标准 JSONC 注释
      （tsconfck 每次运行都会告警）；修复过程中确认既有依赖环
      apps-data → apps/* → quick-settings → lock-screen → procedural-wallpaper → state
      在 ESM 求值顺序下安全（main.js 的 state 先行策略，测试文件同策略遵守并留注释）
- **方法沉淀**：合成手势必须拟人化 —— down→move 同帧连发会让所有"释放速度"类判定
  （轻甩翻页/惯性投影/上滑关闭）拿到超人值；测试里分帧 + sleep 才等价真手。三条阈值线
  （位移 128px / 速度 380px/s / 复合 35px+120px/s）由 config.js 单一真源约束

---

## 架构说明：连接层如何工作

```
┌─ 根壳 index.html ──────────────────────────────┐
│  ┌─ 桌面 iframe (ios-desktop) ───────────────┐  │
│  │  main.js: initAppBus() / initPermissions()│  │
│  │  ┌─ app-bus.js ─────────────────────────┐ │  │
│  │  │ BUS_EMIT 路由 → BUS_DELIVER 投递      │ │  │
│  │  │ 未启动目标 → 排队 → onload 后补投     │ │  │
│  │  │ 后台目标 → 送达 + 代发通知横幅        │ │  │
│  │  └──────────────────────────────────────┘ │  │
│  │  ┌─ iframe 子应用 ──────────────────────┐ │  │
│  │  │ window.__system（桌面注入 SDK）       │ │  │
│  │  │  .emit(event, payload, target)       │ │  │
│  │  │  .notify({appId,title,desc})         │ │  │
│  │  │  .requestPermission('camera')        │ │  │
│  │  └──────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

- **时序保证**：总线以 iframe 的 `onload` 标记（`dataset.loaded`）为就绪信号——实例创建瞬间文档未加载，`postMessage` 会打进 about:blank 丢失，因此未就绪一律排队，`flushPendingForIframe` 轮询就绪后补投。
- **权限握手**：`REQUEST_PERMISSION → PERMISSION_ACK（存在性握手，兼容旧桌面 1.2s 超时放行）→ PERMISSION_RESULT`，权限对话框强制显式选择。
- **分屏兼容**：分屏窗格带 `data-bus-app-id` 标记，总线可向窗格内 iframe 定向投递。

## 批次四：大功能（✅ 本轮已交付）

- [x] **场景模式增强**：profiles 快照新增勿扰记忆（快照/恢复统一走 `setDndActive` 单一真源，
      与手动勿扰磁贴互不打架）；新增「Focus」番茄钟磁贴（新模块 `js/focus.js`）：
      25 分钟专注 ⇄ 5 分钟休息循环，专注期自动开启勿扰、休息期自动恢复，阶段切换走系统通知链
      （专注期 DND 抑制横幅但保留通知中心记录），磁贴副标题每秒倒计时（轻量 DOM patch）
- [x] **计算器升级**：转换器新增「汇率」类（18 主流币种）：ER-API 主源 + ECB frankfurter 备源
      + 12h localStorage 缓存 + 离线估算兜底；状态行明示来源与更新时间，一键刷新；
      兑换方向以「每 1 单位外币兑多少 CNY」归一（应用时取倒数），实测双向换算正确
- [x] **录音机应用**（`js/apps/recorder.js`，模块渲染型）：MediaRecorder 采集（webm/opus，
      Safari 回退 mp4）→ VFS `/recordings` 落盘（owner:'recorder'，meta 记时长）→
      文件管理器直读直通；统一权限系统麦克风前置 + 快速设置全局「Mic access」闸门尊重；
      电平条（AnalyserNode 驱动）、单实例播放/暂停、重命名（VFS move）、删除、分享到信息
      （files/share）；桌面图标矢量新绘（app-icons.js `recorder`）；应用 31 个
- [x] **附带修复（模块应用事件路由 bug）**：files/recorder 等桌面级模块应用的 BUS_EMIT
      旧实现只发 `window.parent` —— 桌面被根壳 iframe 包裹时 parent 是外壳，总线收不到，
      分享静默丢失（直连桌面测试时恰为顶层故未暴露）；现改为必发桌面自身窗口
      （parent 仅冗余兜底）。实测：直连拓扑 + 壳内拓扑均正确入队 `msg` 目标

## 体验深化轮：滑动闪屏修复 + 桌面跟手分页（✅ 本轮已交付）

- [x] **后台多任务滑动闪屏修复（根因三连）**：
      ① `updateCardsTransform` 旧实现每帧无条件重写 filter / boxShadow / zIndex / opacity ——
      filter（blur↔none 翻转）与 boxShadow 是重绘属性，且 CSS 还挂着 `transition: filter/box-shadow`
      → 每帧重启过渡 + 每帧全卡重绘 = 左右滑动闪屏。现改为「量化 + 差分写入」（WeakMap 每卡缓存）：
      transform 纯合成器属性保持每帧写（跟手）；opacity 两位小数量化、zIndex 取整、
      blur 0.5px 量化桶、阴影离散三档（焦点/邻近/远端，档位切换由保留的 box-shadow 过渡平滑衔接），
      全部只在值跨档时才碰 DOM
      ② `pointermove` 高频事件改走 rAF 调度（`scheduleDeckUpdate`），120Hz 触屏每帧最多落一次 DOM
      ③ CSS 侧移除 `.recent-app-card` 的 `transition: filter`（与每帧量化写入互为死敌），
      `will-change` 收窄为 transform, opacity
- [x] **后台卡片生命周期零重建**：单卡上滑删除后改「就地修剪」（`pruneDismissedCard`：只摘除已飞出的卡
      + 重排 data-idx + 焦点吸附），不再 innerHTML 全量重建（重建会销毁全部预览 iframe → 整屏白闪）；
      `renderRecentCards` 升级为 keyed 复用：同 appId 且尺寸档位未变的卡片原样保留，重开后台 iframe 零重建
- [x] **桌面分页升级 Live Pager（Android 原生级跟手）**：从「松手后 50px 阈值一次性跳转」升级为
      1:1 跟手 + 速度吸附：拖拽期 transition 关闭、位移 1:1 映射（纯合成器写）、越界 0.35 橡皮筋阻尼、
      松手按「位移 + 速度惯性投影（~140ms）」综合判定吸附页；吸附飞行中再次按下从 CSS 插值矩阵
      无缝接管（`readSliderTx`，matrix/matrix3d 双格式解析）绝不跳变；触摸/鼠标统一状态机，
      touchcancel 吸附回最近页，滑动收尾后 350ms 内吞掉落点 click（防误开另一页图标的老隐患）
- [x] **关键 bug（实测抓出）**：`readSliderTx` 初版正则误写为 `matrix3d?\(` —— 正则语义是
      「matrix3 + 可选 d」，永远匹配不到 2D `matrix(...)`，导致从第 2 页起滑 / 飞行中接管时
      基点归零剧跳；修正为 `matrix(?:3d)?` 并补 matrix3d 的 tx 分量（第 13 元）解析。
      端到端实测：page1 拖 80px → -340px 精确续算；飞行中 80ms 接管 → -226.7→-296.7px 连续无跳变
- [x] **搜索胶囊手势直通**：`.desktop-search-pill` 容器改 `pointer-events: none`（底部手势带穿透），
      三个可点子区（左区/麦克风/镜头）`pointer-events: auto` + `makeZoneSwipeAware` 手势直通
      （横滑转发 Live Pager、上滑唤出后台、位移后吞 click），真机底部 70px 手势带不再被胶囊吞掉
- [x] **附带加固**：`switchDesktopPage(animate=false)` 的 transition 恢复改 double-rAF（贴帧边界，
      120Hz 屏更稳）；`exitEditMode` 补清 `iconDragState`（异常中断的编辑拖拽残留会锁死桌面滑动）；
      动态图标 RAF 循环在页面后台化/锁屏/多任务打开时跳过样式写入（遮挡期降载）
- **端到端实测（agent-browser）**：桌面跟手（-110px 精确 1:1）、越界橡皮筋（60px→21px 阻尼）、
  小位移高速轻甩翻页、飞行中无缝接管（数学连续）、后台卡片差分量化（blur 0.5px 桶落位）、
  卡片删除后其余 iframe 身份保持、后台重开 iframe 零重建、胶囊上滑唤后台且不误开搜索、
  图标单击正常打开、键盘方向键切页、应用内上滑关闭回桌面分页保持；全程控制台零错误

---

## 体验修复轮：分屏合拢 + 电量同步收尾 + 录音图标 + 动画曲线预设（✅ 本轮已交付）

- [x] **分屏"拖拽调比例后两窗格分家"修复（根因级）**：`renderPane()` 每帧无条件重写开/关动画
      transform（"窗格中心-屏幕中心"平移 + 源点缩放），落定态靠 phase='opening' 分支清内联样式；
      但拖拽结束 endDrag 会重启弹簧循环，此时 phase 已是 'open'，清样式分支永不触发 →
      transform 被重新挂回，两窗格被"窗格中心-屏幕中心"平移各推出 ±半屏（实测 msg y=-231 /
      calculator y=692，从分隔带两侧飞开成永久裂缝）。修复：帧循环对 `phase==='open' && settled`
      的窗格跳过 renderPane 并清残留内联样式，几何完全交还 relayout（left/top/width/height）。
      实测：分隔带拖 226px 两窗格 1:1 跟随重排，上缘/下缘与分隔带全程贴合，松手不再漂移
- [x] **分屏双层状态栏 + 硬编码 78% 电量修复**：窗格内置 `.split-pane-status-bar`（时间 + 5G + 78%
      硬编码）与常驻主状态栏在 y=0 叠压出"重影"，第二条状态栏永远显示假电量。修复：
      彻底移除窗格状态栏（标记 + CSS），窗格从主状态栏下缘开始铺（statusBarH() 实时量取
      兼容 safe-area-inset），paneRects / applyDividerLayout / 拖拽 ratio 计算同步偏移；
      电量单一真源回归 battery-service（主状态栏实时同步）
- [x] **录音机话筒图标过小修复**：录音按钮图标 SVG 走全局 `svg.ic { width:1em }` 随字号渲染
      （~14px）缩在 34px 容器里；补 `font-size:30px` 使图标按 30×30 渲染，与 76px 主按钮比例协调
- [x] **动画曲线预设系统（新模块 `js/animation-presets.js`）**：5 套开/关弹簧手感
      （标准=原 iOS 26 参数 / 利落 ζ0.95 / 果冻 ζ0.52 大过冲 / 柔和长缓冲 / 戏剧重弹簧+大惯量），
      localStorage 持久化（`ios-desktop:anim-preset`）；app-window / split-screen / state 三处
      弹簧创建与 reconfigure 全部改读预设真源；`window.__animPresets.apply(id)` 热更新运行中弹簧
      （reconfigure 保留位置速度，切换零跳变）；主窗口 render 进度钳制设计保持
      （scale 过冲不畸变画面，位置路径与时机差异承担手感区分）
- [x] **设置 › 动画与动效（新子页，索引 10 追加不打乱既有 pushSubPage 索引）**：预设卡片
      （emoji + 名称 + 手感说明 + 当前态高亮），点击即时切换 + toast 反馈 + 主页
      「动画与动效曲线」行实时徽标；键盘 Enter/Space 可选（a11y）；app-page-active 激活刷新
- **端到端实测（agent-browser，本地构建）**：分屏拖拽贴合（479→705px 双窗格跟手）、状态栏唯一
  （y=0 仅一条，78% 残留 0 处）、话筒图标 30×30、预设卡片切换（toast + 高亮 + 持久化 + 当前 id）、
  弹簧物理参数逐档核实（标准 k=273.4/c=26.5 ↔ 果冻 k=130.5 ↔ 利落 k=685.4，热切换生效）；
  typecheck 干净，64/64 单测全绿
