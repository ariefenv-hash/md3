# 开放议题关单条件台账（2026-11-14 02:4x 时点快照）

> **目的**：56 条开放议题里，真正「还没做」的只是一部分；大量条目是**交付已闭环但按制度留给用户核 / 裁决**，或**常设真源本来就不该关**。此前几轮汇报反复出现「XX 条仍 open」的粗口径，容易让人误判为欠账。本台账逐条写清「要关掉它需要满足什么、谁有权关」，供一次性拍板。
>
> **数据来源**：GitHub REST `GET /issues?state=all`（307 条全量，过滤 PR）+ 逐条 `GET /issues/{n}/comments?per_page=100` 取首/末评；产地、门禁、`tsc` 结论为本地 v11.22 实树（`c9c8596d`）实跑。
>
> **本台账不做什么**：不关单、不改议题正文、不发交付帖、不替用户立项、不替施工方补帖。纯实证与分类。

## 一、七档总览

| 档 | 含义 | 条数 | 关单权 |
| --- | --- | --- | --- |
| **A** | 常设 / 真源 / 锚点 | 10 | **不应关** |
| **B** | 交付闭环，交付帖明确写「待真机核」 | 3 | 用户真机 |
| **C** | 交付闭环，无留项口子，可按 §7.7 补关 | 4 | 用户一句话 |
| **D** | 等用户裁决（方案 / 制度终审 / 范围） | 12 | 用户裁决 |
| **E** | 实质未完成，需施工或取证 | 23 | 施工交付后 |
| **F** | 对方车道在途 / 疑似断链 | 1 | 不接管不释放 |
| **G** | 一句话想法 / 待具体化 | 3 | 先转成可执行议题 |
| | **合计** | **56** | |

**一句话读法**：真正需要写代码的只有 **E 档 23 条**；A 档 10 条永远不关；B/C/D 共 19 条是「做完了在等签字」；F/G 共 4 条是流程态。

## 二、A 档 · 常设 / 真源 / 锚点（10 条，不应关）

| 议题 | 为什么不该关 |
| --- | --- |
| #17 每日简报 | #80 后改造为驾驶舱单条评论，仍是机器汇报落点 |
| #18 置顶 SOP | 全量上下文 + 新会话启动 SOP，245 条评论，唯一真源 |
| #21 远景议题池 | 12 项候选的孵化池，孵化记账持续写入 |
| #54 Launcher3 对标总入口 | 源码锚点 + 模块地图 + 全局取值纪律的挂载位 |
| #76 leash 架构依据 | 「md3 可超越部分」的边界依据文档，被 #75 引用 |
| #77 常设巡查循环 | 正文写明「永不关闭」，已跑到第 31 轮 + 启动态销账 |
| #178 数据孤岛审计总纲 | 判据 / 已确认清单 / 通用自查表，新增孤岛应用时继续增补 |
| #192 加餐规则 | 调度退役后仍生效（§7.5 循环填槽），已发状态澄清帖明确保持 open |
| #212 35 条想法蓝图 | 202 议题去重对照表 + 剩余排期，含 CI 复盘插队项 |
| #265 源码阅读完备性闸门 | 流程规范，含「返工记录登记」持续写入口 |

> #77 曾被误关过一次，已重开并在 #18 §12 写明「常设 / 依据 / 锚点类豁免 §7.7 完成即关」。**关闭这一档等于拆掉真源**，后续零上下文会话会失去挂载位。

## 三、B 档 · 交付闭环，明确写「待用户真机核」（3 条）

| 议题 | 交付依据 | 关单条件 |
| --- | --- | --- |
| **#225** P0 开窗卡 44×44 | v10.33 `15d961a9`；本侧 `fbb737e0` 补证 390×844 全屏 / `launchOpacity=0` / 内部文档 115183 字符 | 用户在 iOS / Android / Windows 真机跨设备确认恢复 |
| **#226** P0 时钟整图崩塌 | v10.35 `ffa50362` 五条；本侧补证直载 `clock-app` 零 pageerror、`__clockCore` 就绪、5 tab 正常 | 真机确认「时钟崩了」不再复现 |
| **#231** 壁纸相位跳变 | v10.36 `a17c3fb1` 四根因；e2e-v231 6/6，jump 2.23~92.33 / 恢复 7~12ms | 用户验收；另有 §7 口径裁决（动画结束后恢复 vs 同步起手）待定 |

**本侧能补的已经补了**：无头 Chromium 覆盖不到真机解码 / 后台 rAF 节流 / iOS Safari。这三条**不能靠自动化关单**，交付帖都写明了。

## 四、C 档 · 交付闭环、无留项口子（4 条，可按 §7.7 补关）

| 议题 | 交付依据 | 备注 |
| --- | --- | --- |
| **#247** P0 窗口快速切换竞态 | v10.47 `8033f02e` 三通道根治 + `tests/v247-window-actor-lease.test.js` 15 例 + 真机截图 `docs/reports-r120/` | 交付帖未写「待核」 |
| **#248** P1 连字裸奔 + 键帽 | 同版；material-symbols-outlined 残留 0，2176×1600 无头实测 | 交付帖未写「待核」 |
| **#249** P1 天气平板横屏右溢 | 同版；`min-width:0` 修复，section 回归 680/680/330…、body.scrollWidth 3204→1366 | 交付帖未写「待核」 |
| **#228** P0 制度性根因（三合一） | **产物在库**：`vite.config.js:242` 已删 `ADMITTED_APPS` 白名单改全量扫描、`scripts/audit-app-quality.mjs` 在库、`_shared/idle-slider.css` 4342 B 在库 | ⚠️ **议题里只有 R118 认领帖，没有交付帖** —— 产物属另一条会话，不替它写交付帖 |

**为什么不擅自补关**：用户此前「全部核验后补关」的裁决是针对 #317/#282/#291/#294/#304 那 5 条的，不自动扩展到本档。C 档共 4 条列在这里，**一句话即可批量核验补关**；#228 建议先要求施工方补交付帖或由用户直接裁决。

## 五、D 档 · 等用户裁决（12 条）

| 议题 | 已完成 | 待裁决的那个点 |
| --- | --- | --- |
| #49 | LOS 24 四轮研究产出（diff / Expressive 形态族 / AOSP-only 30 / LOS-only 60 归属映射） | 研究是否收束；采纳决策表转施工卡的取舍 |
| #224 | 时钟 APK 反编译 + `docs/reference/deskclock/` 二期供料（六维考证） | README 里「应用字体 / 锁屏字体两套五轴调节面」方向 |
| #251 | A/B/C 三方案征询帖（推荐 A：歌词制作融入歌词面板） | **明确「不动工，等确认」**，选哪个方案 |
| #252 | 候选池占位卡 A（资料识别卷已归档） | 是否并入形态语言议题；占位卡是否保留 |
| #255 | 候选池占位卡 B（深析卷已归档） | 归一建议是否执行；是否并入既有形态语言议题 |
| #268 | dist 累积膨胀实证（201 新增 / 零删除 / 1650 blob 保留）+ 两条处置建议 | dist 是否退出入库、三闸读盘面的替代数据源 |
| #269 | 同 md5 多副本检测生成器 + 清单 + 5 锚守护 | 卡面建议②「单源化路线 a/b」明确留裁决（需评估 `file://` 直开） |
| #273 | v11.18 存量清零；**本批复测 `npx tsc --noEmit` rc=0、零输出**，`checkJs=false` + `include` 仅 `ios-desktop/js/**` | **是否挂进 CI（deploy test job 加 `npx tsc --noEmit`）** —— 新增硬 fail 面，#235 教训；第 3 段 aosp/ 扩面 opt-in |
| #275 | v11.17 两入口 CSP meta enforcing；Report-Only 纯静态不可行的技术结论 | 建议②「41 子应用逐应用灰度」，议题明确「保持 open」 |
| #280 | dice 懒装载 + SW 按需缓存 + audit O 段接线（v11.16） | codemirror-bundle / midi-player-bundle / epub.min 三件单消费方大库余量 |
| #283 | 处置①注册表 + 处置②首两裸键收编（v11.17） | **其余 37 裸键**收编，明确「终审权留用户」；裸键③硬门禁等②批完成 |
| #286 | core 提取 13 批，52 应用终态归置（core 45/45、ref-only 8） | 终账裁决权留用户；暂缓五家 / books / reminders 的后续 |

> **#273 本侧新增实证**：当前树 `npx tsc --noEmit` EXIT=0、零诊断输出，`tsconfig.json` 仍是 `checkJs:false` + `include` 仅 `ios-desktop/js/**/*.js` + `*.d.ts`。即「全绿」是 **5 个 `@ts-check` 文件范围内**的全绿，不是全库类型覆盖 —— 挂 CI 闸保的是这 5 个文件不回退，别误读成全仓类型安全。

## 六、E 档 · 实质未完成（23 条，需施工 / 取证）

**空白基建 / help wanted（6）**：#65 输入法（LatinIME 对标）、#93 PIP（PipTaskOrganizer）、#106 全局按键派发层（PhoneWindowManager）、#126 模拟器集成（V86）、#133 Vim/DevTools、#167 真正文档编辑器三件套

> 这 6 条打了 `help wanted`，需先做 AOSP 取证再动工；建议顺序 #65 → #93 → #106 → #126 → #133 → #167（前三条是系统层，后三条引大库）。

**系统 / 形态（6）**：#87 锁屏 iOS 风格背离 A17 Keyguard、#97 多用户 / 访客、#99 通知渠道与按应用设置、#221 CSS 主题 zip 导入、#222 多级菜单预测式返回、#227 带手柄滑条（M3 Handle）全库统一（原「怠速柄」为 ASR 误识别术语，见 `docs/reference/material3/slider/README.md`；与 #228 三合一同一处）

**应用扩充 / 思路提取（8）**：#119 二轮盘点、#125 QuickEye 阅读器、#127 定位独立应用、#130 画图 Paint、#131 视频播放器、#170 波形进度条思路提取、#171 Meting 整源接入、#189 moyugang 接入规格

**基建 / 安全 / 纪律（3）**：#271 `js/` 与 `js/aosp/` 同名三对唯一真源未裁决、#274 innerHTML 269 处数据来源分级、#277 js 内 805 处硬编码 hex token 化

> 合计 6 + 6 + 8 + 3 = **23**。（#264 时钟 APK 重分析归 G 档，不在本档计数。）

## 七、F 档 · 对方车道在途 / 疑似断链（1 条）

**#284 批 11**：`COLOR_MOTION_PAGE_SCRIPT` 簇单源搬迁 `settings-pages/color-motion.js`，认领帖 11-13 12:38Z（北京 20:38），声明 v11.23 / §7.5 加餐卷三。

**现状**：main 停在 `c9c8596d`（11-13 18:29Z），本地 `package.json` 仍 11.22.0，无 v11.23 提交；议题里**只有认领帖、无交付帖、无释放帖、无窗报**。距今约 6 小时。

**处置**：按你 11-13 定的方针「不强行澄清、让他们自己改」，本侧**不接管、不释放、不发回收帖**。批 2–10 已交付在库不受影响。这条只在台账里留痕，下轮若仍无动静且你决定清理，再走 #233 ⑤ 人工回收路径（上次 #235 用过）。

## 八、G 档 · 一句话想法 / 待具体化（3 条）

| 议题 | 现状 | 建议 |
| --- | --- | --- |
| **#259「反思」** | **用户长文反馈，11-08 挂到 11-14 0 评论；本批已回帖确认收到**。内含至少 12 个具体点：音量键捕获无反应、音量展开菜单缺失、后台卡片白底、应用主题色令牌闪烁、控制中心磁贴数量、图标扩散/收回开关、状态栏快速滑动重叠、分屏二级菜单上浮阴影、开关小球难看见、应用内壁纸映射可读性（建议取主题色底板）、权限窗口被移到右侧、双栏版式被滥用；另有「别为简洁手搓、可连外部资源」的取向要求 | **最高优先级待处理**：用户原话「看到请回复」。建议下一批逐条拆成可执行议题并先做去重比对（与 #227/#228/#79/#78/#106/#231/#55 等可能重合），不擅自立项 |
| **#263** | 正文只有一个字母「A」，标题是「歌词与逐秒升级合并到同一页面」 | 意图可推断但**信息不足**，需用户补一句再立卡；与 #251 歌词制作信息架构同域，合并前先对齐 |
| **#264** | 「重新把时钟 APK 详细分析响应式 + 矢量图，改良主义不行」 | 与 #224 二期供料（已含响应式限定符全景 + 矢量图体系六维）**高度重合**，建议先核 #224 产物是否已覆盖，避免重复取证 |

## 九、批量关单前置检查（照此办理，别跳）

1. 先按档位过滤：**A 档永远排除**；F 档不碰；G 档先具体化。
2. C/D 档每条 REST 验产物在库 + commit 在 main 历史（`GET /commits/{sha}` 返 200），逐条发交付/裁决帖，**逐条 close**（§7.7 禁攒批）。
3. B 档必须有用户真机结论，自动化证据不能替代。
4. 关单后按 `docs/ops-boundary-post-schedule.md §5.1` 跑**生成件 --check 全量清单**（A 档 15 / B 档 2 不适用）；新增 docs 文件先 `audit-docs-index.mjs --write` 再生索引 —— 这条是 `c9c8596d` 修 CI 停摆换来的纪律，别再靠手写子集。
5. `TZ=UTC`；推送走 `api-commit.mjs`（本侧 `git push` 稳定 403）；REST 回读确权。

## 十、诚实边界

- 本台账是 **2026-11-14 02:4x 的时点快照**，议题状态随时会变；分类依据是该时点的标题、标签、里程碑、首/末评，**未逐字精读 56 条正文全文**（正文只取了前 4 行）。E 档归类可能有偏差，施工前仍以议题正文为准。
- #228 的「产物在库」是本地 `vite.config.js` / `idle-slider.css` / `audit-app-quality.mjs` 三处实读，未逐项核对三合一认领帖里列的 15 个应用改造是否全部完成 —— **不据此判定三合一 100% 兑现**。
- #284 批 11 只查了 main HEAD 与本地版本号，未扫描 backup 分支；「疑似断链」是形态判断，不是断言对方会话已死。
- 零运行时代码改动、零滚版、零关单、零立项。

关联：#18 §7.7 / #233 §九② / #80 / #192 / #284 / #259

## 十二、术语勘误登记（2026-11-14）

用户澄清「带手柄」被 ASR 误识别为「怠速柄」，全仓 49 文件 / 59 处 `idle-slider` 引用受影响。已按 `docs/reference/material3/slider/README.md` 完成：41 活跃文件正名、3 硬断言同步、2 组件头注加勘误块；`worklog.md` / R160 报告 / `dist/` / 已关议题保留史实；物理名不重命名；**几何对齐归 #227**（权威 4×44 / CornerFull / Track 16dp / 交互减半，现实现 6×22→24×22 方向相反）。

对台账的影响：**#325 的「读法 B」作废**，该卡回到读法 A；#227 从「规格统一已完成」修正为「统一到了非源码规格，待按 #54 对齐」；G/E 档条数不变（65 条 / E 33）。


## 十三、#227 几何对齐收口（2026-11-14）

§十二 登记的「几何对齐归 #227」已完成。`_shared/idle-slider.css` 按 `SliderTokens` 原值落地（4×44 / 16dp track / 交互 4→2dp 减半变细 / CornerFull / 0.38），无头像素实证见 `docs/audits/m3-handle-alignment.md`。唯一允许偏离为 input 容器保持 20px（17 应用父行实测 22–30px，48dp 会撑破），已按 #54 第②条写明理由。**#227 / #328 可关**；C 档可补关清单同步减 2。


## 十四、四卡 pending-verification 取证收窄（2026-11-14）

`docs/audits/pending-verification-259-probe.md` 为报告。**#327 卡面前提证伪**：权限弹窗挂在 BODY、`insideTpRight=false`，并非被塞进 `.tp-right`；真因是复用电源菜单 `.power-dialog-card` 的 `right:16px` 侧边列形态（平板实测 x=544/w=260、中心偏右 264px），与右 pane 387–690 视觉重叠造成错觉。已用 `#md3PermissionOverlay` ID 限定覆盖为居中模态，全局类零改动、电源菜单零回归。#318 桌面三通道闭环（完全展开态属功能降级）；#323 / #325 本侧探针覆盖不足，不作产品结论。四条仍 pending-verification，关单权留真机。


## 十五、#228 五项要求逐条核验（2026-11-14）

`docs/audits/issue-228-requirement-audit.md` 为报告。真实调用 `runQualityAudit` 实证：**① 全量扫描**（41 目录 = checked 41，白名单已删）、**② 语义检查**（9 项 A–I + V8 + J + K + O，剥注释/判空/真调用/滑块硬 fail/基线回退）、**③ 模板双件达标**（multi 9/9+V8/8、单文件 9/9；正文记的 app.mjs 0 令牌、app-template.html 0 @media 均已修复）、**④ 12/13 偏薄应用转达标**（terminal 0 令牌→8/9、driving 0 断点→9/9，仅 stocks 仍 6/9）。全库达标 35 / 偏薄 6 / 严重 0。

**⑤ 是唯一口径差**：造零令牌假应用实测 phase1 **0 fail**（只 warn 曝光）、phase2 1 fail、phase3 7 fail；`vite.config.js:258` 固定 phase=1，故「构建必须 fail」按字面未兑现，属 #230 §四分期刻意设计。切 phase 会让 6 个偏薄存量应用立刻全红、部署跳过（#235 形态），**裁决权留用户**（A 保持 phase1 改口径 / B 先清 6 个再切）。

本卡仍 open / P0 / 无交付帖；本侧不替 R118 施工方补帖、不改 vite.config.js。关单条件收窄为：phase 裁决 + 真机确认新建应用不再 MVP 化。


## 十六、#228 裁决 A 落地（2026-11-14 · 用户平台内选择确认）

保持 `vite.config.js:258` 的 `phase: 1` **不动**，正文要求⑤按「**warn 曝光 + D 滑块单源门禁 / 基线回退门禁 两类硬 fail**」口径修订。B 方案（先清 6 个偏薄再切 phase 2→3）**作废、不排期**。理由：phase3 实测 7 条硬失败会让部署全跳过（#235 形态），而 phase1 已根治制度性根因（白名单已删、41/41 覆盖、缺口持续曝光、两类硬防线不受分期豁免）。`docs/audits/issue-228-requirement-audit.md` §五与关单条件已更新。

**关单条件收窄为唯一一条**：用户真机确认「新建应用不再 MVP 化」。本卡仍 open / P0 / 无交付帖。


## 十七、三条老 P0 静态复核（2026-11-14）

报告 `docs/audits/legacy-p0-225-226-231-verification.md`。逐条核 commit 祖先链 / 产物在库 / 源码锚 / 相关测试：

| 议题 | 交付卷 | 祖先链 | 静态面 | 剩余 |
| --- | --- | --- | --- | --- |
| #225 开窗 44×44 | `15d961a9` | ahead 294 / behind 0 | ✅ launch-watchdog.js + 3 测试 + e2e + 7 截图 + launching-boot-audit.md | 跨设备真机确认 |
| #226 时钟单点依赖 | `ffa50362` | ahead 290 / behind 0 | ✅ stopwatch.mjs 顶层直读已改惰性访问器 ensureSw，clock-core 双形态 + resilience 测试 + 3 截图 | 弱网/SW 更新后首开真机确认 |
| #231 壁纸重新播放 | `a17c3fb1` | ahead 289 / behind 0 | ✅ 相位时钟 + 视频恢复守卫 + e2e-v231 + 6 截图 | 用户验收 + **§7 口径裁决**（动画结束后恢复 vs 同步起手） |

相关 vitest **8 文件 / 117 用例全绿**。三条均**不关单**（真机/视觉裁决权在用户），只发核验帖。本批零运行时代码、零滚版、未刷 #18。


## 十八、#274 二期 C 档定性（2026-11-14）

报告 `docs/audits/innerhtml-phase2-triage.md`。52 处词表命中逐条实读定性：**① 已施工补转义 4**（search-service.js:460 的 query 回显是最高危 / folder.js:99 用户重命名 / taskbar.js:127 溢出菜单属性 / at-a-glance.js:55 钉选城市）、**② 实际已转义·生成器白名单盲点 4**（`esc(` 未入 `ESCAPE_HELPERS`）、**③ 词表误命中 25**（静态骨架/ICONS/内部常量/数值，显式豁免）、**④ builder 或内部页面片段 7**、**⑤ 用户可达未转义待施工 12**（跨 8 个核心运行时文件，本批不动）。

施工后生成件再生：总数 **271 = A 136 + B 11 + C 124**（原 B 7 / C 128），短名单 52 → 48。新增常青测试 `tests/innerhtml-escape-regression.test.js` 守护 4 处正/负向锚。

**#274 仍 open / P2**：③ CSP 试点、④ check:comments 契约未做；⑤ 类 12 处属 ② 未完成面；`ESCAPE_HELPERS` 的 `esc(` 盲点（含 `desc(` 子串误匹配风险）已量化登记，待制度裁决，本批刻意不改生成器口径。


## 十九、#283 处置②批次1（2026-11-14）

报告 `docs/audits/issue-283-batch-plan.md` + 引用图谱 `docs/audits/storage-keys-ref-map.md`（411 行逐键引用点）。

**实测全貌与登记偏差**：37 待收编键 = **150 处源码引用 + 84 处测试字面锚 + 20+ 无头 e2e 脚本 + 4 组跨应用共享键**，不是「37 个字符串」。三处口径发现：① `wallpaper-video-blob` 实为 **IndexedDB 键**（`VIDEO_IDB_KEY`/`idbDel`/`IDB_OWNER_RULES`），被生成器 Pass2 误捕进 bare 组，应豁免；② `vd.safety.confirmed` 在 e2e 里是 **sessionStorage** 语义，收编前需先定语义；③ `visited` 侦察里 vendor 英文词与 `import-graph.test.js` 的 `r.visited` 变量名造成大量假阳性，真键仅 4 处。

**按项目分批纪律（#284 分 11 批先例）不一次全清**：风险分层 A / A′ / B / C / D / F 六档，6 个批次 DoD 见方案文档。特别登记 **LS_OWNER_RULES 顺序陷阱**：收编成 `ios-desktop:` 后具体规则必须排在 `['ios-desktop:', '__system']` 之前，否则 `ownerOf()` 全误归 __system、v219 测试连带全红。

**本批闭环**：A + A′ 共 **9 键 / 10 处常量**（books ×2 / messages ×2 / music / safari / stocks / typing / rippleCfg ×2 文件）改新键名 + 幂等迁移 IIFE（v11.17 同款：回落读 + 搬移 + 清除旧键），读写点全走常量零改动。生成器再生后 **113 键 = ios-desktop 67 / settings 6 / android17 1 / bare 39**（bare 不降是设计使然：旧键字面仅存迁移回落引用，回落期收口批次才清零）。新增常青测试 `tests/storage-key-migration-batch1.test.js`。

**#283 仍 open / P2**：② 剩 **28 键**分 4 批（B 轻锚 / C 跨应用双端 / D 归属规则重排 / F 豁免）；③ 硬门禁必须等 ② 全清 + 回落期收口后再开（先开会开工即红）。



## 二十一、#283 处置②批次2（2026-11-15 · 网页侧单会话窗）

**B 档游戏域前 8 键收编**（认领帖 6885735039 先于动工）：`dice_lab_stats`→`ios-desktop:dice-lab-stats`（STATS_KEY，dice module 顶部——loadStats 于 init L364 先于定义被调的时序防线）/ `flow11_best`→`ios-desktop:flow11-best`（FLOW_BEST_KEY）/ `flow11_powerups`→`ios-desktop:flow11-powerups`（FLOW_POWERUPS_KEY）/ `flow11-vol-v1`→`ios-desktop:flow11-vol-v1`（FLOW_VOL_KEY）/ `threes_hi`→`ios-desktop:threes-hi`（HI_KEY）/ `threes_records`→`ios-desktop:threes-records`（RECORDS_KEY，7 处读写全走常量）/ `typing.best.v1`→`ios-desktop:typing-best-v1`（BEST_KEY 改值，批 1 FONT_KEY 同款）/ `launch-seed-hue`→`ios-desktop:launch-seed-hue`（SEED_HUE_KEY，launch.html 根壳 IIFE 内）——8 常量 + 幂等迁移 IIFE（回落读+搬移+清除），读写点全走常量零改动。

**LS_OWNER_RULES 顺序陷阱兑现（批 1 登记项）**：dice/threes×2/flow11_best 四规则原位在通用 `['ios-desktop:','__system']` 之后（ownerOf 先匹配先返回=死规则），本批六条 flow11/dice/threes 专规则前移至通用规则之前（v11.17 files 规则先例同款），旧裸键规则位删除；typing/launch 沿批 1 壳层先例走 generic 归 `__system`；camera/terminal 两处历史死规则位零触碰（留批次 5 收口）。

**测试与登记同步**：batch3:97/batch6×7/batch12:84/v219×2 锚同步（typing.test.js:175 与 v283:70 经 IIFE 回落字面天然兼容零触碰——批 1 files/pixel 先例同款）；新增常青 `tests/storage-key-migration-batch2.test.js` 16 锚（8 键 CASES+时序防线+registry 快照 121/75/6/1/39+LS 前移断言+mock 语义四组）；batch1 快照行随树演进（113/67→121/75）；e2e-v181-batch6 键名对齐新键；registry.json 再生 **121 键 = ios-desktop 75 / settings 6 / android17 1 / bare 39**（bare 不降系设计使然）+ registry.md 人读版总账/8 行收编注记/§二十一同步；batch-plan 批次表登记批 2 ✅（37→28→**20**，剩 3 批）。

**#283 仍 open / P2**：② 剩 **20 键**分 3 批（批 3=B 档后半 8 键：media-output×2/md3.tbTransientEdu/md3_weather×2/ocr-res-font-v1/one_handed_timeout_v1/sttHistory；批 4=C 档 5 键双端同批；批 5=D 档 6 键+LS_OWNER_RULES 前移收口+camera/terminal 死规则位清理；批 6=F 档豁免+回落期收口）；③ 硬门禁维持待 ② 全清+收口。



## 二十二、#283 处置②批次3（2026-11-15 · 网页侧单会话窗加餐）

**B 档后半 8 键收编**：`md3_weather_loc_v1`→`ios-desktop:weather-loc-v1`（LOC_KEY）/ `md3_weather_relocate_min_v1`→`ios-desktop:weather-relocate-min-v1`（REFRESH_KEY）/ `md3.tbTransientEdu`→`ios-desktop:tb-transient-edu`（EDU_KEY）/ `media-output:active`→`ios-desktop:media-output:active`（MO_ACTIVE_KEY，**双冒子命名空间先例**，ref-map 注记建议形态）/ `media-output:spatial`→`ios-desktop:media-output:spatial`（MO_SPATIAL_KEY）/ `ocr-res-font-v1`→`ios-desktop:ocr-res-font-v1`（KEY，ocr app.mjs initResFontSlider 函数内）/ `one_handed_timeout_v1`→`ios-desktop:one-handed-timeout-v1`（TIMEOUT_STORAGE_KEY）/ `sttHistory`→`ios-desktop:stt-history`（ST_HIST_KEY）——8 常量改值 + 幂等迁移 IIFE（先改值后插 IIFE，批 2 时序教训兑现），读写点全走常量零改动；无既有 LS 专规则 → 沿批 1/2 壳层先例走 generic 归 `__system`（批次 5 收口复评）。

**测试与登记同步**：taskbar-transient（E1 清理位+标记断言→新键，旧键兼容清理保留）/media-output（运行时断言→新键）/batch4（ocr 标题+KEY 正则）/text-bridge（stt 三处）/one-handed（标题）/batch2（weather 双键新键正断言追加）+ e2e 五脚本七处字面对齐（v181-batch2/v862×2/v92×3/v181-batch4/v177）；新增常青 `tests/storage-key-migration-batch3.test.js` 19 锚（8 键 CASES+registry 快照 129/83+双冒先例锚+mock 语义四组）；batch1/batch2 快照行随树演进（121/75→129/83）；registry.json 再生 **129 键 = ios-desktop 83 / settings 6 / android17 1 / bare 39** + registry.md 八行收编注记 + batch-plan 批次表（37→28→20→**12** 剩 2 批）。

**#283 仍 open / P2**：② 剩 **12 键**分 2 批（批 4=C 档 5 键双端同批：calevents_v1/calnotes_v2/md3_contacts/md3_messages_bots_v1/android_clock_state；批 5=D 档 6 键+LS_OWNER_RULES 前移收口+camera/terminal 死规则位清理+批 6=F 档豁免+回落期收口并入）；③ 硬门禁维持待 ② 全清+收口。



## 二十三、#283 处置②批次4a（2026-11-15 · 网页侧单会话窗加餐二）

**C 档共享双键双端同批**：`calevents_v1`→`ios-desktop:calevents-v1`（写端 calendar EV_DB_KEY 常量改值+迁移 IIFE；**读端 clock-app/app.mjs loadAgenda 主读新键+旧键回落不清除**——v11.17 vfs.js camera-gallery 读端回落先例同款；ref-map 漏项自纠：clock-app/index.html 两处注记口径同步）· `calnotes_v2`→`ios-desktop:calnotes-v2`（写端 calendar DB_KEY+迁移 IIFE；读端 cal-sync.js CAL_DB_KEY 改值+readCalendarNotes 回落读——notifications.js 经 CAL_DB_KEY 单源导入自动随迁）。清除权归写端 IIFE，读端纯回落兼容未迁移会话。

**测试与登记同步**：v219 两锚（规则 regex+ownerOfLs 新键归属）+ cal-sync.test 回落读两组（旧键回落不清除/新键优先）+ e2e-v157-phase3 种子直灌新键（addInitScript 先于应用装载，旧键种子不迁移）；registry.json 再生 **131 键 = ios-desktop 85 / settings 6 / android17 1 / bare 39** + registry.md 两行收编注记 + batch-plan 批 4a 登记（37→28→20→12→**10**）+ batch1/2/3 快照演进（129/83→131/85）。

**#283 仍 open / P2**：② 剩 **10 键**分 2 批（批 4b=C 档余 3 键：md3_contacts contacts写/phone读、md3_messages_bots_v1 messages+20 处 e2e、android_clock_state clock-app+25 处 e2e；批 5=D 档 6 键+LS_OWNER_RULES 前移收口；批 6=F 档豁免+回落期收口）；③ 硬门禁维持待 ② 全清+收口。

**教训**：①**读端回落不清除**——共享键收编的清除权唯一归写端迁移 IIFE，读端若也搬移/清除会与写端竞争（v11.17 先例同律成文）；②**e2e 种子时机**——addInitScript 先于应用装载时旧键种子不会被写端 IIFE 迁移（IIFE 在装载时跑一次），种子必须直灌新键；③ref-map 漏项（clock-app/index.html 注记两处）靠全库 rg 复核兜住——引用图谱是线索不是真源，动工前全库复核是硬纪律。


## 二十四、#283 处置②批次4b（2026-11-15 · 网页侧单会话窗）

**C 档余 3 键双端同批，C 档全清**：`md3_contacts`→`ios-desktop:contacts-v1`（写端 contacts `KEY` 常量改值+迁移 IIFE；**读端 phone/index.html `readContacts` 主读新键+旧键回落不清除**——批4a loadAgenda rawEv null 判定先例同款；phone/core.js 与 phone/index.html 注记口径随批同步）· `md3_messages_bots_v1`→`ios-desktop:messages-bots-v1`（messages `BOT_STATE_KEY` 常量改值+迁移 IIFE，批1 MSG/ROOM_STATE_KEY 同款；单端写读）· `android_clock_state`→`ios-desktop:clock-state-v1`（**直读形态常数化**：`CLOCK_STATE_KEY` 新常量+迁移 IIFE 插入共享状态段之前=先于装载首读的时序防线；装载读/save 写/onRefresh 重读三落点全走常量；storage-stats 规则改新名**并前移至通用规则前**=批2 顺序陷阱兑现）。

**e2e 51 处字面直灌新键**：clock 九脚本 30 处（sweep-c1/v157-bedtime/v157-phase3/v157-wakelink/v158-crescendo/v158-ringtones/v208-alarmstate/v209-dnd-bridge/v849-clock-m3e，种子面沿批4a 直灌纪律）+ messages 三脚本 21 处（e2e-v856-chatbot/probe-v856-burst/**probe-v856-dispatch——ref-map 漏载 2 处，全库 rg 复核自纠**）。

**测试与登记同步**：v219 双锚扩展（contacts 规则 regex+ownerOfLs 新键归属+clock 前移规则双组）+ v286 PHONE_APP_SRC 读取面（主读新键+旧键回落双锚）+ chatbot.test BOT_STATE_KEY 锚 + clock-m3e.test onRefresh 锚（标题+断言同滚）+ m3e-theme-pull-stretch clock 接线 needle + 新增常青 `tests/storage-key-migration-batch4b.test.js` **21 锚**（3 键 CASES 写端四要素+旧键引号字面=2 守恒+读端回落分支+clock 时序防线+三落点常量+e2e 12 脚本零残留+registry 快照+LS 前移+测试锚在录+mock 语义四组）+ batch1/2/3/4a 快照演进（131/85→134/88）；registry.json 再生 **134 键 = ios-desktop 88 / settings 6 / android17 1 / bare 39** + registry.md 三行收编注记+总账/分组演进 + batch-plan 批 4b 登记（37→28→20→12→10→**7**）。

**#283 仍 open / P2**：② 剩 **7 键**分 2 批（批 5=D 档 6 键：memos/visited/md3_groups/md3_tasks/vd.safety.confirmed/translationHistory + LS_OWNER_RULES 前移收口复评；批 6=F 档豁免+回落期收口）；③ 硬门禁维持待 ② 全清+收口。

**教训**：①**持久锚插入式编辑必须自带幂等去重**——IIFE 块/规则行的插入锚（`export const A=`、`['ios-desktop:', '__system'],`）在重跑场景永远命中，手术脚本须「块已在位则跳过+重跑坍缩去重」双防线（本批首跑中断重续时插入块×3/规则行×4 实录，断言即拦零入库）；②**IIFE 回落字面=2 处**（getItem+removeItem），回读终验口径按此预期，误按 1 断言即假红；③ref-map 漏项再现（probe-v856-dispatch 2 处）——引用图谱是线索不是真源，全库 rg 复核硬纪律第三次兑现。


## 二十五、#283 处置②批次5（2026-11-15 · 网页侧单会话窗加餐）

**D 档 5 键收编（直读形态常数化）+ LS 规则前移收口**：`memos`→`ios-desktop:notes-memos`（notes `MEMOS_KEY`，装载读/save 写/onRefresh 重读三落点）· `md3_groups`→`ios-desktop:reminders-groups` + `md3_tasks`→`ios-desktop:reminders-tasks`（reminders `GROUPS_KEY`/`TASKS_KEY` 双键同文件同批，五落点）· `translationHistory`→`ios-desktop:translate-history`（translate `HISTORY_KEY`，装载读/save/清空 removeItem/onRefresh/VFS 镜像回写五落点）· `visited`→`ios-desktop:translate-visited`（`VISITED_KEY`，首访判定+双写三落点）——五键迁移 IIFE 均先于装载首读=时序防线。**LS_OWNER_RULES 七条前移**：5 新名规则 + **camera 死规则 `ios-desktop:camera-gallery`（v11.17 收编后滞留通用规则后）+ terminal 死规则 `ios-desktop:terminal-history`（v8.40 起键名即命名空间化而规则滞留，owner 误归 __system；terminal HIST_KEY 活跃写读实证）** 复活前移=存储占用页归属真实修复（批 2/3 登记「留批次 5 收口」兑现）。

**vd.safety.confirmed 语义裁决**：实读 volume-dialog.js :85 常量定义但 :240/:266 全走 **sessionStorage**（e2e-v117/v193 同口径）——非 localStorage 键，归 F 档**豁免登记不收编**（`_localforage_support_test` 注记豁免先例同款；键名维持零代码改动；生成器无键级豁免机制，bare 计数如实维持）。D 档原列 6 键实为 5 键收编。

**测试与登记同步**：v219 六面（A1 负向锚新名/B1 新键归属×5+camera+terminal 复活断言/B3、C1、C2、C3 fixture 全量换新键——归属语义随规则走）+ text-bridge.test setItem 锚改常数形态 + e2e-v177 读取字面直灌新键 + m3e-theme-pull-stretch notes/reminders/translate 三 needle + 新增常青 `tests/storage-key-migration-batch5.test.js` **28 锚**（5 键×4 组 CASES+LS 七条前移+vd 豁免在案+e2e 对齐+测试锚在录+registry 快照 139/93/6/1/39+bare 五旧键+vd 维持+mock 语义七组）+ batch1/2/3/4a/4b 快照演进（134/88→139/93）；registry 再生 **139 键 = ios-desktop 93 / settings 6 / android17 1 / bare 39** + registry.md 五新键入表+五行注记+vd 豁免注记 + batch-plan D/F 档登记（37→28→20→12→10→7→**2**）。

**#283 仍 open / P2**：② 剩 **2 键**皆 F 档（批 6=wallpaper-video-blob 豁免登记+vd.safety.confirmed 已豁免维持+回落期收口删 IIFE bare 清零→③硬门禁才开启）。

**教训**：①**持久锚插入式编辑的幂等三段式**（先清全部新行副本→删旧行→插恰一份）——批 4b「相邻判定」对非末位规则失效（插入序列中仅末位规则与通用规则相邻），本批改为「先清后插」终获稳定幂等；②**同文件双键同批**（md3_groups/md3_tasks 双 IIFE 各自幂等，save() 同写两键）；③语义裁决先于收编（vd.safety.confirmed 实读避免误收编 sessionStorage 键进 localStorage 命名空间=登记面失真）。


## 二十六、#283 处置②批次6a（2026-11-15 · 网页侧单会话窗加餐二）

**F 档豁免登记卷（零代码零滚版 v11.36 维持）**：`wallpaper-video-blob` 语义裁决=纯 **IndexedDB 键**（video-wallpaper.js :32 `VIDEO_IDB_KEY`；:398/:440/:468 全走 idbSet/idbDel/idbGet；procedural-wallpaper.js:385 idbDel 同键；storage-stats.js:56 已在 IDB_OWNER_RULES 归 `__system`）——生成器 Pass2 因同文件 localStorage 访问误捕进 bare，注记豁免（vd.safety.confirmed 批 5 先例同款）。**至此 F 档两键（wallpaper-video-blob/vd.safety.confirmed）裁决全落，②待收编键清零**。

**批 6b 回落期收口裁决请求登记**：收口=删批 1-5 全部迁移 IIFE（v11.26 首批 2026-11-14 20:48+08 上线，全部 IIFE 上线不足 24h）→bare 真清零→③硬门禁开启→批 1-5 常青测试锚翻面。**当日删迁移层=放弃未迁移会话旧键数据**——收口时点属数据面裁决，按 registry §处置建议映射「终审权留用户」纪律留用户显式裁决（判据：回落期 ≥7 天或用户明示放弃兼容），本卷仅登记请求与判据、零触碰 IIFE。

**登记面**：registry.md 一行注记（registry.json 零再生键面零变化）+ batch-plan F 档/§四/§五 三处（6a/6b 拆分）+ 台账本节 + HANDOFF 新卷；d556a187 文档卷先例同款零滚版。


## 二十七、#322 图标波浪场设置开关（2026-11-15 · 网页侧单会话窗加餐三 · v11.37）

**#259-⑤ 落地（radialField 波浪场设置内开关）**：单一关断点 = `prepareRadialField()` 入口闸（app-window-parallel.js `if (!isIconWaveEnabled()) return;`）——关闭态零建场（radialField.items 恒空），下游消费面（retarget 空数组 no-op / radialIdle 判定 / items.length===0 早退 / popHomeIcon 幂等）天然零波浪场；**不 clear**（在飞场自然收敛复位零突跳）；radialField 算法/RADIAL_PARAMS/createTransitionRunner/#75 双引擎零触碰（#76 保留超越项性质不变，只是可关）。键 `ios-desktop:icon-wave`（dev-options.js 常数化，**默认开**——键缺失/'1'=开 '0'=关，存量用户零行为变化；#283 零裸键）；设置 › 开发者选项 页新增开关行+副文案 **md3 扩展（无 AOSP 对应实现）**（#70 接线范式+toast）。

**DoD 实证（无头 e2e e2e-v1137-icon-wave 10/10）**：关闭态开窗采样相邻图标 **inline transform 逐帧恒初值**（27 帧 0 非空+计算态单值）——不是只查稳态；开启态同路径 24/25 帧非初值+计算态多值（波浪场在飞）；两态 #appWindow.open 均成立+全程零 pageerror=其余开合动画零变化；seed 持久化读路径生效。

**登记面**：registry 再生 **140 键=ios-desktop 94**（#322 新增命名空间键，#283 零裸键纪律）+ registry.md 新键入表 + 台账本节 + 常青 `tests/icon-wave-toggle.test.js` 5 锚 + 批 1-5 快照演进（139/93→140/94）+ 生成件随树（e2e-inventory 232/test-prefix 339/docs-index/矩阵）+ 滚版 350 文件 11.36→11.37+pkg 11.37.0。

**教训两条**：①**「old 为 new 前缀」的追加式替换不可用计数幂等**——旧串在应用后仍命中，重跑必重复（本批 dev-options 头注/常量/import/闸三文件五处 ×3 实录，git restore 后改用「先查完整新串在位」幂等逻辑重跑即净）；②**rAF 采样帧数阈值按无头实测定**（~30fps 得 27 帧/900ms，桌面 60fps 直觉的 40 帧阈值即假红）。


## 二十八、#286 对账卷（2026-11-15 · 网页侧单会话窗加餐四 · 零代码零滚版 v11.37 维持）

**core 提取范式覆盖率三建议逐条核销 + 独立复核零差**：建议①矩阵在库且随树再生（生成件防腐闸 --check 逐字节，本窗六度随批再生实证）· 建议②zero-touch 清零（十三批提取史，risk_order 字段在产现值空）· 建议③评分卡 H 项量化版落地（档位计数+v286 H3 锚）。**独立复扫**（不信任生成器）：`window.__*Core` 运行时桥 **45/45 全消费（100%）** 与矩阵零差；首扫漏 4 核溯源=`root.__xCore=` 参数别名多宿主形态（dice/threes/shortcuts/contacts）——审计扫描须双模式教训；多捕 1 个= `__quoteCore` 实为 **ESM 直连形态**（lock-quotes.js:265 `export const __quoteCore`，vitest import 直驱非沙箱）——范式三形态学（window 桥/ESM 直连/混合）登记，矩阵口径如实排除非缺口。报告件 `docs/audits/issue-286-coverage-adjudication.md`（含关单三选项 A 关单/B 转跟踪/C 维持，终审权留用户，不代关）。

**R165 续点顺位说明**：#284 music 簇因 G4「读完再动手」门（内联主逻辑 ~1,439 行细读）超出本窗余量诚实跳过，非回避。


## 二十、候选池 5 条具体化（2026-11-14 · 队列④收尾）

规格总表 `docs/audits/candidate-pool-specification.md`。**不重新考证**——把散在交付帖评论 / 已入库参考 / 台账待裁决栏的结论转成带施工面与 DoD 的可执行规格。

| 卡 | 真实状态 | 关键发现 |
| --- | --- | --- |
| #224 | 考证完成（R115/R116/R130，`docs/reference/deskclock/` 23 文件） | 施工 4 条未立卡；README 已载「两套五轴调节面互不干扰」裁决 |
| #252 | 候选池占位卡 A 已归档 | 仅归档无施工面，待裁决是否归一 |
| #255 | 候选池占位卡 B 已归档 | 仅供料；归档资料不得当 AOSP 依据（#76「无需对齐」档） |
| #263 | **v9.13 #180 已把独立歌词应用并入 music** | 两种读法：A 已完成 / **B 同屏并存未做**（`updateViewState():2108` 互斥切换实证） |
| #264 | 正文自带 6 条指路标 + #224 供料 | 六条逐一映射到 #79/#325/#227/#106/#231 与「无独立卡」面 |

**本批唯一新劳动**是 #263 实树取证：`#lyricsPanel` + `#lyricMakerView` + `lyric-core.js`(323 行) + `tests/lyric-merge.test.js` 全在位，但制作态整体隐藏播放器 → 读法 B 成立。

**术语与待核验**：#264 正文「怠速柄」按 #328 §八 史实保留、施工按 Handle；`damping1/stiffness1600/spatial0.8` 待回源核验（#54 第⑥条），不据此施工。

**处置**：5 条**全部保持 open**（具体化 ≠ 施工完成）、不改里程碑、不新建议题。合并建议（#252+#255 归一 / #224↔#264 互挂不合并）**留用户裁决，本批一律不执行**。


## R167 · v11.44 四卡施工卷（#325/#323/#271/#277 · 2026-11-15）

| 卡 | 本卷动作 | 关单条件 |
| --- | --- | --- |
| #325 | 施工交付：组件级 AOSP 基线令牌（暗 #938F99/浅 #74777F）四处落地 + 混合极性收口（theme-mode.js 补写 html[data-theme-mode]）；实测 3.79/3.25 ≥3:1；16 测试锚+e2e 11 锚 | 用户真机确认「小球看得清了」→ 关单 |
| #323 | 取证卷二+施工：逐帧探针六组×三视口；复现闭环三通道（CSS 滑道解耦/commit 陈旧 pending/α 补间起点陈旧）；已修 flush 强制重算+commit 权威终态（dragVisualAt 单源）；dragging 压制试挂净负向已回滚登记；**残余根治=层带裁决**（status-bar z 900 > pull-panels 850；A. bar=845 入面板下 / B. α 二值跟顶带覆盖） | 维护者裁决 A/B 并实施 + 用户真机复核 → 关单 |
| #271 | 裁决交付：「aosp 核+js 壳」分层契约（非重复实现）；零 script 标签纯 ESM；对账 JSON+报告 md+守卫 7 锚（禁新增同名） | 维护者认可裁决口径 → 可关 |
| #277 | 建议①交付：hex 清单 1099 处/60 文件（卡面 805=v10.72 时点）+三分初判报告+守卫 5 锚；建议②评分卡接线留后续卷 | 建议②接线卷交付后 → 可关 |
