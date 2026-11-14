# 四卡 `pending-verification` 静态 + 无头取证报告

> 2026-11-14 · #318 / #323 / #325 / #327（均出自 #259 拆解）· 真实 Chromium `/usr/bin/google-chrome`
> 入口：`ios-desktop/index.html?nolock=1`（根 `/` 只是 LAUNCHING 启动屏 iframe 包装，桌面本体在前者）
> 本报告**不关单**：四条仍挂 `pending-verification`，关单权留真机核。

## 结论速览

| 卡 | 本侧结论 | 剩余待真机 |
| --- | --- | --- |
| **#327** | **卡面前提证伪 + 根因钉死 + 已修** | 居中模态的视觉回归（三视口/深浅主题） |
| **#318** | 桌面侧三通道闭环；「完全展开态」是**功能降级**不是入口难找 | 移动端硬件键是否产生 keydown |
| **#323** | 91 帧未复现双重渲染，但**手势未走完整周期 → 不作证伪** | DoD 六种手势序列逐帧 |
| **#325** | **卡面「一帧回落」假设证伪**：派发式实证放大态 16/16 帧保持 28px | 对比度 + 触摸 `pointercancel` 抢占 |

---

## 一、#327 权限弹窗「被套进双栏右侧」—— 前提证伪

### 卡面假设

> 「权限申请窗口被放进平板双栏布局的**右侧 pane**」「定位双栏判据（是否所有 dialog 一律走右 pane）」

### 实证（820×1180，`#md3PermissionOverlay` 精确取，等 `.active` + 0.38s 过渡落定）

| 项 | 实测 |
| --- | --- |
| overlay 父节点 | **BODY**（`light-theme taskbar-on`） |
| overlay position / rect | `fixed` / `0,0,820,1180` 全屏遮罩 |
| `insideTpRight` | **false** |
| card `role` | `alertdialog` |
| card 最终态 rect | **x=544 / y=514 / w=260 / h=153** |
| card computed | `left:544px` · **`right:16px`** · `width:260px` · `transform: matrix(1,0,0,1,0,-76.39)` |
| 卡片中心 vs 屏中 | 674 vs 410 → **偏右 264px** |
| 设置双栏右 pane | `x=387 / w=303`（即 387–690），`hostedInRight=1`，`permRowPresent=true` |

**关键**：弹窗从未被 `appendChild` 进 `.tp-right`。但卡片落在 544–804，与右 pane 387–690 **大面积重叠** —— 这才是用户看到「移到右侧」的来源，是视觉巧合，不是双栏路由。

### 真因（文件 + 行号）

`ios-desktop/css/pull-panels.css:1617-1646`：

```css
/* A12+ GlobalActionsColumnLayout：侧边竖向卡片列（非居中大菜单）——
 * 列贴视口右缘（inset 16dp 同构） */
.power-dialog-card {
  position: fixed;
  right: 16px;              /* ← 贴右缘 */
  top: 50%;
  width: min(260px, ...);
  transform: translateY(-50%) ... scale(0.35);
}
```

`ios-desktop/js/permissions.js:357` 头注明写「**复用电源弹窗的 .power-dialog-overlay / .power-dialog-card 结构类保持视觉一致**」，`:397` 落地。**运行时权限对话框借用了电源菜单的侧边列形态。**

AOSP 依据（按 #54 源码优先）：`GrantPermissionsActivity` 用 `Theme.Material.Settings.Dialog` / `windowIsFloating`，是**居中模态 Dialog**，不参与 `SettingsHomepageActivity` 的 `ActivityEmbedding` two-pane；`GlobalActionsDialog` 才是侧边竖列。两者窗口形态不同，共用容器 CSS 是形态错配。

### 修复（本批唯一产品改动）

在 `pull-panels.css` 追加 **`#md3PermissionOverlay` ID 限定**覆盖：`left:50% / right:auto / width:min(340px, …) / translate(-50%,-50%)`，入场 `scale(0.9)`。特异性 `(1,2,0)` 高于原 `.power-dialog-overlay.active .power-dialog-card` `(0,3,0)`；**全局 `.power-dialog-card` 一字未动 → 电源菜单零回归**。

**修复后同条件复验（等 `.active` + 0.38s 过渡落定）**：

| 项 | 修复前 | 修复后 |
| --- | --- | --- |
| card rect | x=544 / w=260 | **x=240 / w=340** |
| 中心偏移 | **+264px（偏右）** | **0（完美居中）** |
| computed | `right:16px` | `left:410px / right:70px` / `transform: matrix(1,0,0,1,-170,-65.2)` |
| 按钮数 / role | — | 6 个完整 / `alertdialog` |
| pageerror | — | 0 |

**零回归抽检**：全局 `.power-dialog-card { right: 16px }` 规则仍在（读 CSSOM 实证 `16px`），关闭权限弹窗后电源菜单卡片仍是独立实例（`nonPermissionCards=1`）—— ID 限定没有外溢。

### 双栏适用清单（兑现 #327 DoD 第 1 条）

| 类别 | 形态 | 依据 |
| --- | --- | --- |
| 设置一级 → 二级 / 三级 | **双栏 detail pane** | `SettingsHomepageActivity` + `ActivityEmbeddingRulesController`；#53/#174/#220 |
| 运行时权限申请 | **居中模态** | `GrantPermissionsActivity` / `windowIsFloating` |
| 确认框 / 单选弹层 / 应用信息 sheet | **居中模态或全屏遮罩 bottom sheet** | `AlertDialog` / `windowIsFloating`；`apps.js` `.adr-sheet` 已是 `position:fixed;inset:0` |
| 电源菜单 | **贴右缘侧边竖列** | `GlobalActionsColumnLayout`（**唯一**适用 `.power-dialog-card` 默认形态者） |

**判据收口结论**：`settings-two-pane.js` 的 `tpNav` / `syncAllSessions` 只处理 `.app-page` 栈页，**从不路由 dialog**；越界不在双栏判据，而在**权限弹窗的容器类选择**。施工方向据此修正。

---

## 二、#318 音量键三通道（桌面侧闭环）

| 通道 | 是否出火 | 可见反馈 | 完全展开态 |
| --- | --- | --- | --- |
| 移动端硬件键 | **待真机** | — | — |
| 三键导航等价物 | ✓ 渲染 `.nvb-btn.nvb-vol` ×2 | ✓ `aria`「音量减」「音量加」 | — |
| 桌面媒体键 `AudioVolumeUp` | ✓ `volume-dialog visible` | ✓ 折叠单条（w=60） | **✗ 不存在** |

- **口径差明确回答**（DoD 第 2 条）：当时说的「可捕获」指 `volume-dialog.js:805-830` 的**桌面浏览器媒体键**链路（本侧派发 `AudioVolumeUp` 确实弹面板），与 #115「移动端硬件键在网页中不可捕获」**并不矛盾**；问题是交付时没说清**适用域**，属**沟通口径问题**，不是等价物缺失。
- **「完全展开的菜单在哪里」**（DoD 第 3 条）：`volume-dialog.js:905` 原文 —— *「省略号：打开系统设置（**真机 = 展开完整音量面板，网页以 Settings App 声音区承接**）」*；实测 `#vdSettingsBtn`「更多声音设置」是**跳转设置应用**，不是展开。故完整展开态（多流 media/ring/alarm/notification + 更多控件）在网页侧**根本不存在**，是**功能降级**，不是「入口难找」。若要补齐，需按 AOSP `VolumeDialogImpl` 的展开语义另立施工卡，不在本卡现状复核范围。

---

## 三、#323 状态栏双重渲染 —— 未复现，不作证伪

91 帧采样（5 轮「快速下拉 12 步 + 立即上推 6 步」，每步间 ~16ms 级）：

- `#statusBar` / `.status-bar` **恒 1 个实例**，`distinctNodes` 仅 `statusBar|status-bar`，`multiInstanceFrames=0`
- 但 opacity 由 `1 → 0` 后**未回 1**，说明手势未走完整开合周期（起点 y=8 的下拉未稳定驱动 shade 状态机）

→ 这是**探针覆盖不足导致的未复现**，不能反推「问题不存在」。仍按 DoD 六组手势（慢速对照 / 快下拉到底 / 下拉即回卷 / 连击 5 次 / 合体态 / 三视口）真机逐帧核，并采 `.app-window-status-bar` 与 `.status-bar` 同帧像素指纹。

---

## 四、#325 开关小球「一闪而过」—— 时长假设证伪

**静态（`m3-controls.js`）**：`pointerdown` → `snapTo(...pressGeo(input.checked))` 瞬时置 `sizeSpring.x = THUMB_PRESSED(28)`；按住期间 `isDown=true` 且无回落路径；`pointerup` 才 `settleTo(...restGeo())` 回到 24。

**第一次探针失效（登记）**：390×844 视口下设置应用内 50 个可见开关 rect 为 `x=684`（**超出 390 视口**，应用窗口按桌面宽度布局），`page.mouse.down(x≈710)` 未命中 → 20 帧全 24px、`dragFrames=0`。按 #54 纪律**不拿这份假数据反推根因**，改为向 `.md3-switch` 直接派发 `PointerEvent`。

**派发式实证（16 帧，每 24ms 采样）**：

| 阶段 | thumb width |
| --- | --- |
| 派发前 | 23.85px（`style.width=24px`） |
| `pointerdown` 后 **16/16 帧** | **27.9 ~ 28px**（`style.width=28px`） |
| `pointerup` + 350ms | 回 24px（`24.01px` 弹簧收敛） |

→ **放大态完整保持整个按住期，没有一帧回落。** 卡面「SnapSpec 实现成一帧回落 / `isPressed` 被过早清除」两类假设**均证伪**；`AOSP SnapSpec 瞬时膨胀但保持到释放` 的语义在 md3 是落实的。

**根因收窄到两项（均需真机）**：

1. **未选中态对比度不足** —— 小球与轨道描边同为 `--md-outline` 灰（#70 同款同色问题），静息 24px 球在浅色轨道上本身就「很难看到」，放大态是否出现用户都未必能察觉。
2. **触摸 `pointercancel` 抢占** —— 桌面鼠标不产生该事件，真机上浏览器滚动手势可能立刻抢走指针，使放大态只存在一帧。这是桌面无头**永远测不到**的路径。

DoD 的「逐帧给出放大态持续帧数」本侧已给出（16/16 帧），但**判定哪一项是真因必须真机触摸逐帧**（轻点 / 慢滑 / 快甩 / 长按 / 键盘空格）。施工方向据此从「修时长」改为「修可见性 + 触摸抢占」，避免按错误假设改 `m3-controls.js`。

---

## 五、诚实边界

- 全部为 Linux Chromium，无 Gecko / 无真机；`dist/` 未重建（本批只改一条 CSS 规则，构建产物随下轮）。
- #327 修复仅改定位，**未做真机视觉回归**；`aria-modal` 当前为 null（`role="alertdialog"` 已在），无障碍标注是否补齐留待 #327 真机核时一并裁决。
- 四条**均未关闭**，标签 `pending-verification` 不动；本侧只把「待真机」范围从「整卡」缩到上表右列的具体几项。

关联：#259、#318、#323、#325、#327、#115、#107、#195、#53、#54 第①条、`docs/open-issues-close-ledger.md`
