# A17 分屏窗格投影权威考证：真源无投影（窗影体系全部属桌面自由窗/PiP）

> **触发**：`ios-desktop/css/split-screen.css` v11.25 #324 收敛注记「超越项待补源锚」——
> 当时 AOSP 分屏窗格投影原值固件站墙内不可实拉（#54 第⑥条口径）。2026-11-21 换
> **LineageOS 24.0 = Android 17 基线**（用户明示「以安卓17为底的类原生也行」许可）经
> GitHub contents API 实拉补锚，**源锚已闭合**。
>
> **取证方式**：`api.github.com/repos/LineageOS/android_frameworks_base/contents`（raw media type，
> `ref=lineage-24.0`）+ code search API。通道可达性依据
> `docs/reference/frameworks-base/android17-shade/README.md` §一复测表（raw 直链被墙，contents API 可达）。
>
> **本目录内容**：`BoxShadowHelper.java`（83 行 · 实拉原文）、`shell-styles.xml`（255 行 · 实拉原文，
> BoxShadowParams 四 style 在 L161-192）、本 README。

## 一、结论先行

**A17 真源分屏窗格（手机侧 split-screen）不带任何投影**；全库窗影体系只服务三个域：桌面自由窗装饰（windowdecor）、PiP、Bubbles。md3 分屏窗格保留的 `0 2px 12px rgba(0,0,0,0.45)` 属 **md3 扩展（浮窗隐喻）**，按 #54 第②条标注披露，值不动。

**三重否定证据（ negatives 全量检索）**：

| # | 检索面 | 结果 |
| --- | --- | --- |
| N1 | `libs/WindowManager/Shell/src/com/android/wm/shell/splitscreen/`（33 文件）code search `shadow` | **total: 0** —— 分屏壳源码零阴影引用 |
| N2 | `setShadowRadius` 全 Shell src 调用方 | 仅 `pip/PipSurfaceTransactionHelper`、`pip2/PipSurfaceTransactionHelper`、`windowdecor/WindowDecoration(.java/.2.kt)`、`bubbles/transitions/BubbleTransitions` —— **无 splitscreen** |
| N3 | `common/split/DividerView.java` L696-699 | 注释逐字：「Lift handle as well so it doesn't get behind the background, even though it **doesn't cast shadow**.」——连分隔柄都不投阴影 |

## 二、A17 窗影权威值（桌面自由窗装饰，分屏不可引用但作观感参照）

`WindowDecoration.java` L331-341 读 `mBoxShadowSettingsIds` → `BoxShadowHelper.getBoxShadowSettings`（L51-77：
styleable `BoxShadowSettings` 五属性 boxShadowBlurRadius / SpreadRadius / OffsetX / OffsetY / Color）→
L591-594 `Transaction.setBoxShadowSettings` 应用到任务 Surface。`DefaultWindowDecoration.kt` L633-646：
聚焦窗 = `BoxShadowParamsKeyFocused + BoxShadowParamsAmbientFocused`，失焦窗 = `…Unfocused` 两件套；
L671-685 旧回退路径 `freeform_decor_shadow_focused_thickness=20dp` / `unfocused=5dp`（`res/values/dimen.xml` L439-443）。

四 style 实值（`shell-styles.xml` L161-192 逐字）：

| style | boxShadowColor | OffsetX/Y | BlurRadius | Spread |
| --- | --- | --- | --- | --- |
| `BoxShadowParamsKeyUnfocused` | `#0A000000`（4% 黑） | 0 / 0 | 12dp | 0 |
| `BoxShadowParamsKeyFocused` | `#19000000`（10% 黑） | 0 / 0 | 24dp | 0 |
| `BoxShadowParamsAmbientUnfocused` | `#1F000000`（12% 黑） | 0 / 6dp | 12dp | 0 |
| `BoxShadowParamsAmbientFocused` | `#33000000`（20% 黑） | 0 / 16dp | 24dp | 0 |

PiP 阴影半径参照：`pip_shadow_radius = 5dp`（`dimen.xml` L70）；桌面菜单阴影 `desktop_mode_layout_menu_shadow_radius=8dp`（L552）、caption 菜单 `2dp`（L615）。

## 三、对 md3 现树的裁决

| # | 现树形态 | 真源对照 | 裁决 |
| --- | --- | --- | --- |
| S1 | `.split-pane { box-shadow: 0 2px 12px rgba(0,0,0,0.45) }`（v11.25 #324 收敛值） | 真源分屏窗格**无投影**（N1/N2/N3） | **保留 = md3 扩展披露**：Web 侧分栏卡片浮窗隐喻 + #324 邻格内容保护约束（blur 12px 裙边收在 24px 分栏带内消散）。注释自「待补源锚」升级为「已核验 md3 扩展」，值不动——投影浓度（45% 黑）远高于 AOSP 最重窗影（20% 黑）已是刻意偏离，按 #54 第②条不得伪装原生 |
| S2 | `.split-pane.settled` 稳态 `will-change:auto` | —— | 零触碰（#324 因果实验结论不受影响：邻格裙边 12px 收敛仍是防越栏关键） |
| S3 | 分隔带 24px 本体 | `DividerView` 分隔柄形态（触摸提升仅 translationZ） | 零触碰（#34 域） |

## 四、复现命令

```bash
TOKEN=<PAT>; B=https://api.github.com/repos/LineageOS/android_frameworks_base/contents
# styles.xml（BoxShadowParams 四 style 在 L161-192）
curl -s -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github.raw" \
  "$B/libs/WindowManager/Shell/res/values/styles.xml?ref=lineage-24.0"
# BoxShadowHelper.java
curl -s -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github.raw" \
  "$B/libs/WindowManager/Shell/src/com/android/wm/shell/common/BoxShadowHelper.java?ref=lineage-24.0"
# 否定证据检索（code search）
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/search/code?q=shadow+repo:LineageOS/android_frameworks_base+path:libs/WindowManager/Shell/src/com/android/wm/shell/splitscreen"
```

---
*2026-11-21 回源核验卷；关联 #324、#54 第②/⑥条、#329 §五（用户实测驱动单条闭环）、tests/v324-split-pane-shadow.test.js。*
