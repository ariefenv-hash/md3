# 整合说明（aosp17-shade-port 分支）

本分支向仓库**新增** `aosp17-shade/` 自包含子应用——AOSP `android-17.0.0_r1`
（Cinnamon Bun）SystemUI 通知中心 + 控制中心的 Web 1:1 移植（Vite + TypeScript，
无 UI 框架，28 个源文件，产物 gzip ≈34KB）。**未改动任何既有文件**：vite 多入口、
tsconfig（include 仅 `ios-desktop/js/**/*.js`）、vitest（仅 `tests/`）均不受影响。

## 为什么是"独立子应用"而不是改写 dual-shade.js
本移植以 AOSP r1 源码为唯一事实来源逐文件对照（文件/类名/常量 1:1，注释标明
资源名出处）。仓库现有的 shade 体系是早期独立复现路线，含历史取舍；按"源码忠诚"
原则，二者应**并存比对、按磁贴级逐步收敛**，而不是互相覆写。

## 本地预览
```bash
cd aosp17-shade
npm install
npm run dev        # http://localhost:3000（或任意静态服务器托管 dist/）
```
`dist/` 为已构建产物，可直接被任何静态服务器/`npx serve` 托管；
`base: './'` 允许挂任意子路径（例如 `https://ariefenv-hash.github.io/md3/shade/`）。

## 与主工程后续接线建议（未实施，待定夺）
- 数据层：`TilesState` ↔ 主工程 qs-tiles 状态互为镜像时，以本工程四态
  （active/inactive/unavailable + dual-target）为准（TileDefaults.getColorForState）。
- 手势层：`ShadeWindowRootView` 的拖拽/fling/越界阻尼与主工程 pull-down-gesture
  二选一收敛到源码规格（NotificationPanelViewController 语义）。
- 测试锚定：`tests/` 可仿 v785 模式以本工程 `src/res/values/dimens.ts` 常量逐字断言。

## 本轮四项源码考证修复（详见 README.md「源码考证与修复记录」）
1. 面板开合「挤压」中间态：constrainSquishiness(0.1+0.9×expansion) → verticalSquish
   布局高度压缩 + 两态圆角 spring 320ms（inactive 50dp 胶囊 ↔ active 24dp 圆方）
2. 亮度滑块怠速柄：r1 基准必须带 4×52dp 竖条 thumb + 6dp gap + 图标轨内右端双色
   （PlatformSlider 为超前路线未采用；音量条确认不属 QS 面板）
3. 表达性涟漪：修复时间轴 NaN（函数引用未调用）根因——此前涟漪从未渲染
4. 矢量图：23 处 stroke-only 补 fill="none" + 电池框 body 轮廓补齐 + 逐 key 回源核对
