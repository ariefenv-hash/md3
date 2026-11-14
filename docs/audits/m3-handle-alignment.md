# #227 几何对齐无头取证报告（M3 Handle 原值落地）

> 2026-11-14 · 关联 #227 / #328 / #54 / #76 · 口径只读 `docs/reference/material3/slider/unified-errata.md`
> 本报告是**取证记录**，不是新口径；不在 `scripts/` 下新增 e2e 文件（避免 `gen-e2e-inventory.mjs` 清单与 `e2e-playwright-skeleton.test.js` 计数锚漂移，§5.1 教训）。

## 一、结论

`ios-desktop/apps/_shared/idle-slider.css` 已按 `SliderTokens.kt` 原值落地，**无头 Chromium 像素级实证通过**：4×44 竖条真实绘制 44px、交互态缩到 2px、17 个接入应用布局零改动。

| 项 | AOSP M3 | 对齐前 | 对齐后 | 判定 |
| --- | --- | --- | --- | --- |
| HandleWidth | 4dp | 6px | **4px** | ✅ |
| HandleHeight | 44dp | 22px | **44px** | ✅ |
| HandleShape | CornerFull | 3px | **2px** | ✅ |
| TrackHeight | 16dp | 6px | **16px** | ✅ |
| Track 圆角 | CornerFull | 3px | **8px** | ✅ |
| HoverHandleWidth | 4dp（不变宽） | 24px 胶囊 | **4px** | ✅ |
| Focus / Pressed | 2dp（减半变细） | 24px 胶囊 | **2px** | ✅ |
| DisabledOpacity | 0.38 | 0.38 | 0.38 | ✅ 原已吻合 |
| M2 白色 halo 描边 | 无 | `box-shadow 0 0 0 2px` | **退役** | ✅ |

**最关键的一条**：交互方向从 `6→24px 变宽成胶囊` 纠正为 `4→2px 减半变细`，与 `Slider.kt:2762-2783` 同向。

## 二、允许偏离（#54 第②条 · 实测 + 写明理由）

`input[type=range]` 容器 `height` **保持 20px**，未抬到 AOSP Slider 的 48dp 组件高度。

**改前基线实测**（17 个接入应用，390×780 视口，父行高度）：

| 应用 | input | 父容器 |
| --- | --- | --- |
| radio | 230×20 | `.rd-ctlrow` 336×**24** |
| typing | 104×20 | `SPAN` 192×**20** |
| weather | 104×20 | `.refresh-row` 358×**22** |
| contacts | 104×20 | `.density-row` 390×**29** |
| bytebeat | 96×20 | `.bb-vol` 128×**24** |
| flow11 | 287×20 | `.vol-row` 370×**30** |
| dice | 228.4×19 | `.setting-row` 228.4×58.9 |

抬到 48px 会撑破全部紧凑设置行。且 `Slider.kt` 的 48dp 是 Compose 组件 `minimumTouchTargetSize()` 的 minHeight（`slider_sizes` 测试 `.assertHeightIsEqualTo(48.dp)`），**不是 thumb 本身的约束**。

**解法**：让 44px 竖条溢出 input 边界绘制——`margin-top: -14px = (16 − 44)/2`，父链无 `overflow` 裁剪。视觉与源码一致、17 个应用零改动；触摸命中由整个 input 行承担，等价 AOSP 的 48dp 目标区。

## 三、无头像素实证（真实 Chromium，非 CSSOM 推断）

方法：注入组件 CSS + `--md-primary: #FF0000` 纯红，300×20 的 `.mdslider` 放在 `height:24px` 的 `.row` 内；`page.screenshot` 后用 `sharp` 解 raw 像素，统计红色像素的列/行分布。

| 态 | 竖条列（红色像素数/列） | 竖条宽 | 竖条高 | input 高 | row 高 |
| --- | --- | --- | --- | --- | --- |
| 静态 | `202:44`、`203:44`、`201:42`、`204:42` | **4px** | **44px**（y 31–74） | 20 | 26 |
| `:active` | `202:42`、`203:42` | **2px** | 42px（圆角吃 1px×2） | 20 | 26 |
| 轨道 | `60:16`、`61:16` | — | **16px** | — | — |

四条同时成立：**竖条真画满 44px 未被裁剪**、**交互减半到 2px**、**轨道 16px**、**容器与父行高度不变**。CSSOM 另确认规则为 `.mdslider:focus-visible::-webkit-slider-thumb, .mdslider:active::-webkit-slider-thumb { width: 2px; border-radius: 1px; }`。

<details><summary>复跑脚本（可整段复制，需 <code>npm ci</code> + 系统 Chrome + sharp）</summary>

```js
// /tmp/m3-handle-probe.mjs
import { chromium } from 'file:///opt/md3-src/node_modules/playwright/index.mjs';
import sharp from '/usr/local/lib/node_modules/sharp/dist/index.cjs';
import { readFileSync } from 'node:fs';
const CSS = readFileSync('/opt/md3-src/ios-desktop/apps/_shared/idle-slider.css', 'utf8');
const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 420, height: 200 }, deviceScaleFactor: 1 });
await page.setContent(`<style>body{margin:0;background:#fff;padding:40px 30px}
:root{--md-primary:#FF0000;--md-surface-container-highest:#CCC;--md-background:#fff}
.row{height:24px;display:flex;align-items:center;gap:12px}${CSS}</style>
<div class="row"><input type="range" class="mdslider" id="s" min="0" max="100" value="50" style="width:300px"></div>`);
const shot = await page.screenshot();
const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
const col = {};
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  const i = (y * info.width + x) * info.channels;
  if (data[i] > 230 && data[i+1] < 40 && data[i+2] < 40) col[x] = (col[x] || 0) + 1;
}
const top = Object.entries(col).sort((a, b) => b[1] - a[1]).slice(0, 4);
console.log('竖条列(期望 4 列各 44px):', top);
await browser.close();
```

</details>

## 四、同步改动的断言（6 处活跃真源）

| 文件 | 改动 |
| --- | --- |
| `tests/markdown.test.js` | `6px/24px` → `4px/44px/2px` |
| `tests/admission-rework.test.js` | 标题 + 两条几何正则 |
| `tests/v1037-app-quality-audit.test.js` | 标题 + 常态/交互正则 + 新增 `margin-top: -14px` / track 16px 断言 |
| `tests/batch2.test.js` / `tests/batch5.test.js` | 活跃描述注释同步（不再写「hover 胶囊」） |
| `scripts/e2e-v1037-slider-unify.mjs` | S1d 样式表直探的 `thumbRule` / `activeRule` |
| `ios-desktop/apps/pdf/index.html` | 页码滑条头注（描述当前组件行为，非史实） |

`docs/worklog.md`、`reflection-259-breakdown-r160.md`、`dist/`、已关闭议题按史实契约保留。

## 五、诚实边界

- 实测在 Linux Chromium（`/usr/bin/google-chrome`）完成；**Firefox 的 `-moz-range-*` 分支只做了 CSSOM 规则核对，未跑 Gecko 像素实证**。
- `:hover` 的 M3 state layer（半透明圆）在网页原生 `input[type=range]` 无可挂载伪元素，本次按 `HoverHandleWidth 4dp` 落实为「不变宽」，未模拟 halo —— 这是形态层的最小可实现，已在组件头注注明。
- 未做真机触摸回归；44px 竖条的触摸命中依赖整个 input 行，建议后续真机核一次拖拽手感。
- `docs/reference/material3/slider/README.md` §三 的「现实现 6×22→24×22」为**对齐前时点状态**，属 `374911b1` 考证报告，按史实契约不改写；当前状态以 `unified-errata.md` §八 为准。

关联：#227、#328、#54 第①②条、#76、`docs/reference/material3/slider/{README,official-spec-chain,unified-errata}.md`
