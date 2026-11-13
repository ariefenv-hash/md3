# AOSP 移植纪律与候选池终局核销（#147 收口）

> **本文补的是 #147 正文「筛选判据建议固化为纪律」那一块**——首盘（v8.93）与 R95 / R103 两度对账盘点都做了「池面对账 + 核销 + 增补」，但判据与纪律一直只活在议题正文和评论里，从未落成仓内文档。本文不再做第四轮盘点，只固化规则 + 给一次终局状态。

## 一、筛选判据（立项前必过）

**优先选 · 可 1:1 逐字译**

- 纯 Kotlin / Java，无 `Context` / `View` / `Binder` / `Handler` 依赖
- 输入输出为数值或数据结构
- 行数 < 500

**不选**

- 依赖 `Canvas` 绘制、而 md3 已有等价 CSS 实现（除非形态差异大到必须换）
- 依赖系统服务：`AudioService` / `WindowManager` / `PackageManager` 等
- 依赖真实窗口管理架构（leash / SurfaceControl / 跨进程 Binder）的机制 —— 详见 #76「移植边界依据」，这类在网页里没有对应物，去找对标只会白费功夫

**复用基建**：`js/aosp/interpolators.js` 已导出 `cubicBezier` / `pathInterpolator` / `EMPHASIZED` / `STANDARD` / `FAST_OUT_SLOW_IN`。新移植**必须复用**，不得另起炉灶。

## 二、三条纪律

1. **每个移植必须留源锚**。文件头写清「源文件路径 + 关键常量出处」，范式见 `js/aosp/shade-interpolation.js` 头注。反面教材 #135：设置图标注释 34/40 与实现不符、源锚缺失导致落地缩水。
2. **注释必须等于代码**。#140（注释「pill 顶」实为中心）、#142（注释七态实为四态）、#135（注释 40dp 实为 34px）连续三处注释超前于实现。仓内已有 `check:comments`（`scripts/check-comment-claims.mjs`）做数值声明失配门禁，新增移植须过闸。
3. **优先补「已移植但未完整」**，再开新坑。#143（圆角弹簧分态）、#142（缺两态）这类性价比高于新增候选。

## 三、池面终局状态（v11.22 实读，不再逐轮盘点）

- `ios-desktop/js/aosp/` **68 个模块**（首盘 9 → R95 55 → R103 58 → 现 68），范式已从「能跑通」进入流水线化。
- **首盘第二节候选表**：`ShadeInterpolation.kt` → `shade-interpolation.js`（#144）✅；`FontInterpolator.kt` → `font-interpolator.js` + `font-variation-utils.js` ✅；`BackTransformation.kt` / `BackAnimationSpec.kt` → `back-animation.js` ✅；`TextInterpolator.kt` / `TextAnimator.kt` 与字体同域，留待评估。4 组**全部有落点**。
- **首盘第三节「下一轮待探测」6 项原料已全部入库**（`docs/reference/frameworks-base/SystemUI/...`）：

| 候选 | 仓内原料 |
|---|---|
| `NotificationRoundnessManager.java` | ✅ `statusbar/notification/stack/` |
| `NotificationStackSizeCalculator.kt` | ✅ 同目录 |
| `AnimationFilter.java` / `AnimationProperties.java` | ✅ 同目录（2 件） |
| `ViewHierarchyAnimator.kt` | ✅ `animation/` |
| `TransitionAnimator.kt` | ⚠️ 同目录实存 `DelegateTransitionAnimatorController.kt` / `ViewDialogTransitionAnimatorController.kt`，**无同名 `TransitionAnimator.kt`** —— 立题时须按实存文件重取锚，勿照抄议题旧名 |

> 原料已在库 = 「不建议直接开工」的门槛已消除，按需立卡即可，**不再保持一个常设盘点议题**。

## 四、与既有文档的关系

| 文档 | 分工 |
|---|---|
| `docs/reference/README.md` | 原料库索引（拉了什么、服务哪条议题） |
| `docs/aosp-porting-discipline.md`（本文） | 判据 + 纪律 + 池面终局 |
| `docs/test-naming-evergreen.md` | 测试命名常青 / 快照分档（#291） |
| #76 议题 | 移植边界（哪些是架构限制、哪些应保留超越） |
| #265 议题 | 动手前阅读清单规则 |

## 五、后续约定

- 新候选**按需立卡**（各自编号，如 #144 / #145 / #146），不再追加「第 N 度对账增补盘点」评论——前三轮已把池面从 9 核到 68，重复盘点只会制造理解困惑。
- 立卡时把本文 §一 判据、§二 三条纪律写进验收清单。
- 本文零代码改动、零滚版；`docs/index.md` 由 `audit-docs-index.mjs --write` 同步。

## 六、验收

- [x] 筛选判据 / 三条纪律从议题正文固化为仓内文档
- [x] 68 模块池面 + 第二节候选 + 第三节 6 项原料逐项实读核销
- [x] `TransitionAnimator.kt` 名称偏差如实登记（不静默照抄）
- [x] 明确「停止逐轮盘点」，避免第四轮重复
- [x] 零运行时代码改动

关联：#147 / #144 / #145 / #146 / #135 / #140 / #142 / #143 / #76 / #265 / #291
