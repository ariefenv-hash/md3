# ROADMAP · 功能推进队列（每日一板块）

> 本文件是「大清单」的**唯一持久化真源**（会话记忆会丢失，本文件随仓库走）。
> 每日推进一个板块；做完自行往后扩充。状态当日回写，中断安全。

---

## 每日触发方式

- **推荐触发语**（客户端若支持定时消息，设为每天 **08:00（Asia/Shanghai，cron `0 8 * * *`**）发送）：

  > 按 ROADMAP 队列推进下一个小板块

- 会话收到触发语后的**固定动作**：
  1. 读 `docs/ROADMAP.md`（本文件）+ `worklog.md` 末两条 → 恢复上下文；
  2. 取队列中第一个「进行中 [~]」或「待办 [ ]」板块；
  3. 侦查/联网求证 → 实现 → 测试全绿 → E2E → 提交推送 main → 核验 Pages；
  4. 回写本文件（勾选状态 + 日期 + 版本号）并追加 worklog.md；
  5. 当日时间不足时：至少完成「侦查 + 设计定稿」，实现留次日，状态标 `[~]`。
- 队列见底（全部 `[x]`）→ **自行扩充**：当日先联网搜 Material 3 / Android 最新特性
  与仓库遗留问题盘点，再补 3–5 个新板块进队列，然后照常推进一个。
- 环境限制说明：本环境未向会话暴露定时调度工具（无法自注册 cron 会话），
  自动触发依赖客户端定时消息 / 手动发送触发语；队列与协议保证任何会话零上下文接力。

---

## 队列（按序推进）

- [x] **板块 1 · M3E 组件全系统铺开（v7.73，「扩展」路线①）** — LoadingIndicator 铺进 4 场景
  （settings 存储统计✅ / installer 解析✅ / 翻译 iframe 内嵌 mini 引擎 / 录音机麦克风检查）
  + installer 待安装/已安装 tabs → M3E connected ButtonGroup + mail FAB → SplitButton
  （lead 写邮件 + trail 真实菜单）+ tests/v773 + E2E + sw geek-v82 + 推送。
  **断点**：A1/A2 已改未提交（语法已验），worklog 有记录，从 A3（translate mini 引擎）续。
- [ ] **板块 2 · 预测性返回覆盖面扩展（「扩展」路线②）** — 评估 back-to-home 形态
  （应用关闭手势对齐官方 0.9 缩放 + 圆角渐现透出桌面；注意与现有归巢动画的取舍）+
  小窗/分屏返回路径统一体检。
- [ ] **板块 3 · Live Updates 实时通知（「值得搜」#3）** — 联网搜 Android 16 Live Updates
  规格（进度条/计时器通知卡片结构、尺寸、动效）→ 还原进通知中心与状态栏（进度型通知）。
- [ ] **板块 4 · 桌面模式精修（「值得搜」#4，材料 `scripts/search_desk.json`）** —
  自由窗口任务栏、最小化到任务栏行为对齐 AOSP 桌面模式。
- [ ] **板块 5 · 平板 taskbar 常驻形态（「值得搜」#5，材料 `scripts/search_tab.json`）** —
  Android 12L taskbar 还原评估（常驻底栏 + 分屏快捷拖拽），与现有 Overview 网格互补。
- [ ] **板块 6 · Themed Icons 单色主题图标全量体检** — 全部内置应用与后期安装应用
  的单色图标路径核对（Material You monochrome 语义），缺漏补齐。
- [ ] **板块 7 · 通知中心保真度复查** — 阴影/层级/清除动效对齐 Android 16
  （结合板块 3 的 Live Updates 成果一起验）。

---

## 已完成（原清单核销）

- [x] **值得搜 #1 · Predictive Back 官方规格** — developer.android.com 直读：Exit Scale
  100%→90% / Exit Fade 35% 全隐 / Enter Scale 110%→100% / 插值器 (.1,.1,0,1) / STANDARD_DECELERATE（v7.72）
- [x] **值得搜 #2 · M3E 组件全家桶规格** — m3.material.io 直读：LoadingIndicator 七形循环 /
  SplitButton spin+变形 / connected ButtonGroup（v7.72）
- [x] **值得还原 #1 · 预测性返回动画全系统** — page-stack + files 手势桥官方双通道（v7.72）
- [x] **值得还原 #2 · 开关膨胀挤压 + 圆角变形** — QS squish/grow/squeeze + 图标 pop 同相位（v7.64/65/72）
- 历史遗留队列（后台模糊/平铺单卡/平板多任务/2048 主题色/通知图标/OPFS 文件应用/
  动画流畅性等）已于 v7.55–v7.72 全部核销，详见 `改动说明.md` 与 worklog.md。

---

## 状态日志（每日追加一行，最新在上）

- 2026-10-11 · 板块 1（v7.73）完成 ✅：LoadingIndicator 4 场景（settings 统计 / installer 解析 / 翻译 m3e-mini / 录音机）+ installer tabs→ButtonGroup + mail FAB→SplitButton；851/851 测试绿 + E2E 15/15 PASS + sw geek-v82 + BUILD_ID mv3l39r5，已推送。
- 2026-10-11 · 队列建立；板块 1（v7.73）进行中：A1 settings 统计 loader ✅ / A2 installer 解析 loader ✅，余 A3/A4/B/C/D。
