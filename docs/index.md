# docs/ 索引（#295 · 生成件）

> 本文件由 `scripts/audit-docs-index.mjs` 生成，`npm run check:docs-index` 逐字节校验一致性——**禁手改**；
> 数据真源 = `docs/` 实树（.gitignore 同步排除）+ `docs/worklog.md` 轮次头 + `scripts/*.mjs` 引用扫描。

## 策略裁决（#295 处置建议三选一 → 取 c）

- **c 维持现状 + 索引收敛**（本卡落地）：零搬迁零删除——worklog/议题相对链接不可断；
- a（迁 LFS）：需远端 git-lfs 依赖与历史重写，缓议；
- b（压缩归档/搬迁/Release 附件）：断链风险，缓议；
- #223 联动：目录名 vNNN 语义歧义（v100=v10.0? v1.00? v96=v9.6?）如实登记不擅断，重编号裁决留 #223；
- v207c 带后缀变体与 v\d+ 纯数字目录同列版本截图档（^v\d+[a-z]?$ 统一在册）。

## 门槛规则（#295 建议③，提示级不拦发布）

- 单版本目录 png > 20 → 「归档提示」节列出（提示归档）；
- docs/ 递归文件总数 > 700 → 「归档提示」节列出（提示瘦身）；
- 触发与否均如实登记（无触发即「无」，不留空洞节）。

## 概览

| 指标 | 值 |
|---|---|
| docs/ 顶层条目 | 123 |
| 版本截图目录（含变体） | 85 |
| 其他目录 | 7 |
| 顶层文件 | 31 |
| 递归文件总数（.gitignore 排除后） | 434 |
| 其中 png | 239 |

## 版本截图目录（85 个 · 命名随当时版本号，语义歧义留 #223）

| 目录 | 文件 | png | 引用依据 |
|---|---|---|---|
| v96 | 6 | 6 | scripts/e2e-v96-wellbeing-focus.mjs、scripts/e2e-v96-wellbeing.mjs |
| v100 | 2 | 2 | scripts/e2e-v100-battery-health.mjs |
| v101 | 3 | 3 | scripts/e2e-v101-watchface-gen.mjs |
| v146 | 1 | 1 | scripts/e2e-v146-back-animation.mjs、scripts/e2e-v146-fling-back-r53.mjs |
| v154 | 1 | 1 | scripts/e2e-v154-word-books.mjs |
| v191 | 2 | 2 | scripts/e2e-v191-shell-back.mjs |
| v195 | 3 | 3 | scripts/e2e-v195-permission-grant.mjs、scripts/e2e-v195b-photo-picker.mjs、scripts/e2e-v195c-photo-upgrade.mjs |
| v207c | 1 | 1 | scripts/e2e-v207c-appnotif.mjs |
| v210 | 3 | 3 | scripts/e2e-v210-lock-pin.mjs |
| v220 | 3 | 3 | docs/worklog.md（R118）、scripts/e2e-v220-shade-mode.mjs |
| v223 | 1 | 1 | docs/worklog.md（R119）、scripts/e2e-v223-version-live.mjs |
| v799 | 3 | 3 | —（引用缺失，重编号裁决留 #223） |
| v800 | 3 | 3 | —（引用缺失，重编号裁决留 #223） |
| v801 | 3 | 3 | scripts/e2e-v801-notifications-subpage.mjs |
| v802 | 3 | 3 | scripts/e2e-v802-accessibility-subpage.mjs |
| v803 | 3 | 3 | scripts/e2e-v803-sound-subpage.mjs |
| v804 | 3 | 3 | scripts/e2e-v804-display-subpage.mjs |
| v805 | 3 | 3 | scripts/e2e-v805-apps-subpage.mjs |
| v806 | 3 | 3 | scripts/e2e-v806-battery-subpage.mjs |
| v808 | 2 | 2 | scripts/e2e-v808-wallpaper-subpage.mjs |
| v809 | 2 | 2 | scripts/e2e-v809-storage-subpage.mjs |
| v810 | 2 | 2 | scripts/e2e-v810-switch-thumb-vertical.mjs |
| v811 | 2 | 2 | scripts/e2e-v811-switch-sync.mjs |
| v812 | 2 | 2 | scripts/e2e-v812-settings-search.mjs |
| v813 | 3 | 3 | scripts/e2e-v813-ripple-overlay.mjs |
| v814 | 2 | 2 | scripts/e2e-v814-qs-sheet-quick-tap.mjs |
| v815 | 3 | 3 | scripts/e2e-v815-media-card-single-source.mjs |
| v816 | 1 | 1 | scripts/e2e-v816-media-wave-smooth.mjs |
| v817 | 2 | 2 | scripts/e2e-v817-brightness-two-layer.mjs |
| v818 | 1 | 1 | scripts/e2e-v818-cookie4.mjs |
| v819 | 1 | 1 | scripts/e2e-v819-icon-drag-decouple.mjs |
| v820 | 2 | 2 | scripts/e2e-v820-slider-m3-layout.mjs |
| v821 | 1 | 1 | scripts/e2e-v821-back-pill.mjs |
| v822 | 2 | 2 | scripts/e2e-v822-music-import.mjs |
| v823 | 3 | 2 | scripts/e2e-v823-video-wallpaper-resume.mjs |
| v824 | 2 | 2 | scripts/e2e-v824-settings-plates.mjs |
| v825 | 2 | 2 | scripts/e2e-v825-music-a17-sync.mjs |
| v826 | 2 | 2 | scripts/e2e-v826-about-device.mjs |
| v827 | 2 | 2 | scripts/e2e-v827-qs-edit-scene.mjs |
| v828 | 2 | 2 | scripts/e2e-v828-two-pane-backstack.mjs |
| v829 | 2 | 2 | scripts/e2e-v829-location.mjs |
| v830 | 1 | 1 | scripts/e2e-v830-modes.mjs |
| v831 | 1 | 1 | scripts/e2e-v831-safety.mjs |
| v832 | 1 | 1 | scripts/e2e-v832-emergency.mjs |
| v833 | 3 | 3 | scripts/e2e-v833-accounts.mjs |
| v834 | 1 | 1 | scripts/e2e-v834-support.mjs |
| v836 | 3 | 3 | scripts/e2e-v836-reaction.mjs |
| v837 | 2 | 2 | scripts/e2e-v837-lock-quote.mjs |
| v838 | 2 | 2 | scripts/e2e-v838-fx-convert.mjs |
| v839 | 2 | 2 | scripts/e2e-v839-word-app.mjs |
| v840 | 2 | 2 | scripts/e2e-v840-terminal.mjs |
| v841 | 2 | 2 | scripts/e2e-v841-piano.mjs |
| v842 | 3 | 3 | scripts/e2e-v842-bytebeat.mjs |
| v843 | 3 | 3 | scripts/e2e-v843-python.mjs |
| v844 | 3 | 3 | scripts/e2e-v844-ping.mjs |
| v849 | 3 | 3 | scripts/e2e-v849-clock-m3e.mjs |
| v850 | 3 | 3 | scripts/e2e-v850-code-editor.mjs |
| v851 | 3 | 3 | scripts/e2e-v851-midi-player.mjs |
| v852 | 3 | 3 | scripts/e2e-v852-ocr.mjs |
| v853 | 4 | 4 | scripts/e2e-v853-stt.mjs |
| v854 | 4 | 4 | scripts/e2e-v854-radio.mjs |
| v855 | 5 | 5 | scripts/e2e-v855-driving.mjs |
| v856 | 1 | 1 | scripts/e2e-v856-chatbot.mjs |
| v857 | 1 | 1 | scripts/e2e-v857-recents-cap.mjs |
| v858 | 3 | 3 | scripts/e2e-v858-all-apps.mjs |
| v859 | 3 | 3 | scripts/e2e-v859-widget-board.mjs |
| v860 | 4 | 4 | scripts/e2e-v860-taskbar.mjs |
| v861 | 3 | 3 | scripts/e2e-v861-allapps-form.mjs |
| v862 | 3 | 3 | scripts/e2e-v862-taskbar-transient.mjs |
| v863 | 2 | 2 | scripts/e2e-v863-anim-native.mjs |
| v897 | 1 | 1 | scripts/e2e-dist-smoke.mjs |
| v901 | 1 | 1 | —（引用缺失，重编号裁决留 #223） |
| v902 | 1 | 1 | scripts/e2e-v123-gravity-r38.mjs |
| v903 | 1 | 1 | —（引用缺失，重编号裁决留 #223） |
| v905 | 1 | 1 | scripts/e2e-v124-drawcircle-r39.mjs |
| v906 | 1 | 1 | scripts/e2e-v122-typing-r40.mjs |
| v910 | 2 | 2 | scripts/e2e-v163-allapps-sidepad-r41.mjs |
| v913 | 1 | 1 | scripts/e2e-v180-lyric-merge-r42.mjs |
| v916 | 2 | 2 | scripts/e2e-v165-markdown-r43.mjs |
| v917 | 2 | 2 | scripts/e2e-v166-archive-r43.mjs |
| v1030 | 4 | 4 | scripts/e2e-v1030-appstore-market.mjs |
| v1031 | 6 | 6 | scripts/e2e-v1031-online-catalog.mjs |
| v1032 | 3 | 3 | scripts/e2e-v1032-external-health.mjs |
| v1033 | 7 | 7 | scripts/e2e-v1033-clock-resilience.mjs |
| v1034 | 6 | 6 | —（引用缺失，重编号裁决留 #223） |

## 其他目录

| 目录 | 文件 | 说明 |
|---|---|---|
| audits | 2 | 审计产物（历史轮产出） |
| diag-r39 | 2 | R39 诊断产物 |
| history | 2 | 历史归档（#290 根目录杂散中文文档收编 git mv 入此） |
| reference | 162 | AOSP 语料（#295 议题正文实证 6 子目录） |
| reports-r120 | 7 | 巡检报告（R120） |
| reports-r128 | 1 | 巡检报告（R128） |
| shot-baseline | 21 | shot:diff 视觉基线（门禁对照真源） |

## 顶层文件

| 文件 | 说明 |
|---|---|
| APPS.md | — |
| HANDOFF.md | 交接快照入口（#234②，新实例先读本件） |
| ROADMAP.md | 路线图 |
| apps-inventory.json | — |
| bounce-mid.png | 顶层散置 png（调试样张） |
| external-repos-patrol-r116.md | 外部仓库巡检（R116） |
| globals-registry.json | 全局注册表（机读） |
| globals-registry.md | 全局注册表（人读） |
| ios-quirks.md | 浏览器 quirk 台账（#287） |
| keymap-inventory.json | — |
| keymap.md | — |
| media-card-solid.png | 顶层散置 png（调试样张） |
| nightsky-apps.png | nightsky 截图（#16 交付入库） |
| nightsky-desktop.png | nightsky 截图（#16 交付入库） |
| nightsky-desktop2.png | nightsky 截图（#16 交付入库） |
| nightsky-mobile.png | nightsky 截图（#16 交付入库） |
| nightsky-pc.png | nightsky 截图（#16 交付入库） |
| nightsky-quikie.png | nightsky 截图（#16 交付入库） |
| ops-discipline.md | 运维纪律 |
| research-harmony-multiwindow.md | 研究文档（multiwindow 考证） |
| shade-full.png | 顶层散置 png（调试样张） |
| test-coverage-matrix.json | — |
| test-coverage-matrix.md | — |
| test-naming-evergreen.md | — |
| ui-detail-baseline.md | UI 细节基线 |
| vendor-ledger.md | — |
| visual-admission-baseline.json | 视觉准入基线（#243，机读） |
| visual-admission-baseline.md | 视觉准入基线（#243，人读） |
| visual-baseline.md | V 清单水位文档 |
| visual-token-adoption.md | 令牌采纳记录 |
| worklog.md | 轮次真源（#18 SOP 第 2 步） |

## 归档提示（提示级，不拦发布）

- 无（全部版本目录 png ≤ 20，递归文件总数 ≤ 700）。
