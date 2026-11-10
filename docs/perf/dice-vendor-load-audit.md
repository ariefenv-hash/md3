# dice vendor 大库按需加载审计（#280 · 方案卷）

- **议题**：#280（P2 性能实测——three.module.js + cannon-es.js 全仓唯一消费方是 dice）
- **卷位**：R154 窗 · 2026-11-10 14:00 槽 · Job 2931605 · 第 3 定时消息系列
- **形态**：纯 docs + scripts 生成器 + 审计 JSON——**零滚版（v11.12 维持）、零运行时面改动、零 tests 增量**（#276 信任模型 docs 卷先例同律）；#280 建议②③④的**施工**留后续滚版窗口（本卷只交付取证 + 方案设计 + 检测器可执行化）
- **配套生成件**：`docs/audits/vendor-consumers.json`（`scripts/gen-vendor-audit.mjs --write` 产出，--check 单真源闸）

## 1. 装载路径取证（#280 处置建议①「核查两库的实际装载路径」三问全答）

| 建议①三问 | 实测结论 | 证据位 |
|---|---|---|
| 根壳 script 预加载？ | **零引用**。根壳 `index.html` 与桌面主文档 `ios-desktop/index.html` 均无 `three`/`cannon` 字面；Vite 仅两个 rollup input（`main`+`desktop`，vite.config.js L539-547），apps 目录走 `copyStaticAndPrecache` 插件**原样静态复制**，dice 的 three/cannon 从未被 Vite 打包进公共 chunk | vite.config.js L535-547；`rg three\|cannon index.html ios-desktop/index.html` 零命中 |
| dice 内动态 import？ | **非动态 import**——`apps/dice/index.html` L227-235 `<script type="importmap">`（`three`→`../_shared/vendor/three.module.js`、`three/addons/`→`../_shared/vendor/`、`cannon-es`→`../_shared/vendor/cannon-es.js`）+ L237-240 `<script type="module">` **静态 ESM import** 三行。运行时惰性止步于「应用级」：iframe 打开 dice 才拉取两库（其余 40 应用零解析成本），但打开即全量拉取 + 全量解析 | dice/index.html L227-240；L228 注记「importmap 仅在静态直出（非 Vite 处理）时生效」 |
| SW precache 清单是否含它们？ | **含。** precache 清单 = dist 全产物扫描自动纳入（vite.config.js L422 注释实证），`dist/precache-manifest.json` 21 条 vendor 记录中 `ios-desktop/apps/_shared/vendor/three.module.js` 与 `cannon-es.js` 均在内 → **全体用户 SW install 阶段即预下载两库**，骰子应用首开前载荷已付 | dist/precache-manifest.json（21 vendor 条目）；vite.config.js L422、L499 |

**卡面问题①裁定**：载荷问题真实存在，且主成本不在首载而在 **SW 首装预缓存**（全部用户为单一应用背库）；解析成本维度卡面判断准确（dice 不打开解析为零收益，其余 40 应用不受影响）。

## 2. 预缓存字节账（实测 · dist 压缩复制口径）

`copyStaticAndPrecache` 插件复制时压缩（vite.config.js L147 压缩失败回退原样），故 **SW 实付字节以 dist 侧为准**（小于源码侧）：

| 口径 | three.module.js | cannon-es.js | RoundedBoxGeometry.js（three/addons 消费） | dice 家族合计 |
|---|---|---|---|---|
| 源码 | 1,273,187 B（53,045 行） | 346,497 B（13,024 行） | 4,625 B | 1,624,309 B（1.55 MiB） |
| dist（SW 实付） | 667,353 B | 124,991 B | 1,555 B | **793,899 B（0.76 MiB）** |

- 卡面「2MB+ 级载荷」为**源码口径估算**；本卷修正为实测：SW 实付 **0.76 MiB/用户**（dist 压缩复制后），源码口径 1.55 MiB。方向不变、幅度下修，登记留痕。
- **扩展账（审计增值——单消费方问题不止 dice 两库）**：vendor 全目录 21 文件 **100% 进 precache（0 豁免）**，合计 **18,387,428 B = 17.54 MiB**。其中：
  - **ocr/tesseract 家族 14,347,299 B = 13.68 MiB**（两枚 wasm.js 共 7.87 MiB + 三语种 traineddata 共 6.32 MiB + worker/bundle）——真实消费方仅 **ocr 应用**（运行时构造装载，字面零命中），体量为 dice 家族 **18 倍**，按需化收益更大；
  - **单消费方大库五件**（dist 口径）：three 667K→dice / codemirror-bundle 614K→code-editor / midi-player-bundle 549K→midi-player / epub 225K→books / cannon 125K→dice；
  - 单消费方 11 文件合计 2,642,108 B = 2.52 MiB；
  - 真共享件对照：jszip（archive/books/wallpaper.js 3 家）、marked（calendar/markdown/markdown.js 3 家）、pdf 家族（books/pdf 2 家）——**不得按需化**的对照面。
- 完整逐文件矩阵（bytes/distBytes/precache/consumers/classification/resolution）见生成件 `docs/audits/vendor-consumers.json`（--check 可复核，禁手改）。

## 3. 孤儿库检测现状（#280 处置建议④可执行化）

`scripts/gen-vendor-audit.mjs`（本卷新建，零依赖无时间戳逐字节可重现）已交付三条规则：

1. **字面 basename 匹配**（needle 覆写表防子串误吞：`ocr/worker.min.js` 不得被 `pdf.worker.min.js` 引用误吞、`phosphor/style.css` 不得被任意 `style.css` 文本误吞——两处误报均在本窗取证时实际发生并修正）；
2. **tesseract 家族专案解析**（`ocr/langs/`、`tesseract-core-*.wasm.js`、`tesseract-bundle.mjs` 运行时构造装载 → 消费方 = `[Tt]esseract` 命名空间命中文件；radio-core/stt-core 仅「ocr-core 九代同款 IIFE」注释、零误报）；
3. **phosphor 传递解析**（`Phosphor.woff2` 仅被 `phosphor/style.css` @font-face 内部引用 → 消费方传递；R154 实测该家族**仅 dice/index.html 一家引用**）。

**现值**：孤儿库（消费方=0）**0 件**——当前 vendor 目录无死库；检测器价值在**防将来再积压**（#280 建议④原话）与**单消费方曝光**（11 件，按需化候选清单）。后续卷可将本检测接线 `audit-app-quality.mjs` 评分卡（见 §5）。

## 4. 施工方案②：dice 懒加载（逐行设计 · 本卷零施工）

**目标**：dice 打开时不拉取/不解析 three+cannon，首次真实交互才装载。

**改造位**：`ios-desktop/apps/dice/index.html` L237-240（importmap L227-235 **原样保留**——`import()` 动态导入同样受 importmap 解析，零改动）。

**设计 A（推荐 · 首交互装载）**：静态 import 三行删除，改为惰性装载器：

```js
// 模块顶层仅注册一次性入口（零库依赖，打开页面零解析成本）
let libsPromise = null;
function loadLibs() {
  if (!libsPromise) {
    libsPromise = Promise.all([
      import('three'),
      import('three/addons/geometries/RoundedBoxGeometry.js'),
      import('cannon-es'),
    ]);
  }
  return libsPromise;
}
// 首次 pointerdown/掷骰事件 → await loadLibs() → 原初始化链（initScene/initWorld/render loop）后移至其 then 分支
```

- `RoundedBoxGeometry` 具名导出经解构 `({ RoundedBoxGeometry })` 取回；
- 模块顶层 THREE 字面量（`new THREE.Raycaster()` / `new THREE.Vector2()`）随初始化链后移进装载完成分支（本卷盘点：顶层字面量仅此两处，改造面小）；
- 摇一摇/桌面快捷掷骰等非 pointer 入口统一走 `loadLibs().then(...)`。

**设计 B（保守 · 仅去静态化）**：顶层改 `const [THREE, { RoundedBoxGeometry }, CANNON] = await Promise.all([import('three'), ...])`（module 顶层 await）——加载时机不变（打开即拉），仅满足「动态 import 形态」，收益近零，**不推荐单独立卷**。

**门禁面（施工卷必跑）**：`build`（dist 重建）+ `check:dist-parity` + `verify-dist` + `e2e:dist` dice 探针（45/45 含 dice 通道）+ `e2e:sweep` dice 三通道零异常 + `shot:diff` dice 帧零漂移 + `e2e:pw` 全绿。

## 5. 施工方案③：SW 按需缓存 + 方案④：audit 接线（本卷零施工）

**③ SW 按需缓存设计**：

1. `vite.config.js` `copyStaticAndPrecache` precache 扫描加**排除清单**（建议名 `PRECACHE_EXCLUDE`）：dice 家族五件（three.module.js / cannon-es.js / geometries/RoundedBoxGeometry.js / phosphor/style.css / Phosphor.woff2）与 ocr 家族七件（两 wasm.js + 三 traineddata + worker.min.js + tesseract-bundle.mjs）——**首装 precache 199→187 预登记**（-12 件，-14.44 MiB dist 口径）；
2. `sw.js` fetch handler 加 vendor stash 规则：`/_shared/vendor/` 同源请求**cache-on-first-use**（命中网络后回填 caches，后续离线可用）；ocr 大件建议加「下载中 toast/进度」或首用确认（13.68 MiB 按需拉取的用户体验面，留施工卷裁决）；
3. **锚面漂移预登记**（施工卷必读）：`BUILD_ID` 更新；precache-manifest 条目数 199→187；`check:dist-parity` 5/5 与 `verify-dist` 8 项若含条目数硬编码锚则随卷重锚（实跑判定，不预设）；离线权衡如实登记——被排除 vendor 的应用**离线首开失败一次**（在线 stash 后恢复），与 #282 SW 注册面语义并行不冲突；
4. 施工顺序依赖：③依赖②先行（dice 五件排除后首开即触发 stash 链路，端到端可验）；ocr 家族排除可独立成卷（收益 13.68 MiB 最大）。

**④ audit 接线设计**：`scripts/audit-app-quality.mjs` 加 vendor 段（K 段邻位）：消费方=0 孤儿库 → 违规曝光；单消费方 ≥300KB → 「按需化候选」提示级曝光（不拦发布）。生成器纯逻辑已就绪（`gen-vendor-audit.mjs` 的 needle/专案解析函数可直引或平移），接线需滚版窗口 + tests 锚面（与 #228 评分卡门禁同律）。

## 6. 诚实边界

1. 本卷**零施工**：dice/index.html、vite.config.js、sw.js、audit-app-quality.mjs 四面零改动（防与 #284 批 5 滚版 v11.13 同槽竞速——G5 异槽纪律）；②③④为设计就绪态，施工卷需自行三查认领；
2. 字节账以**盘上 dist** 为准（本窗实测）；未来构建插件压缩策略变化会使 distBytes 漂移，--check 时生成件随之再生（单真源）；
3. 消费矩阵为**静态字面+两条专案规则**的诚实近似：裸导入经 importmap 解析已覆盖（dice 字面直击），运行时完全动态构造的非 tesseract 路径不在检测面（现值零证据存在，留观察位）；
4. 认领帖 6760570286 预登记的「three+cannon SW 实付 837,684B（0.80 MiB）」系检索过滤笔误（混入 threes/core.js 43,785B）——**本卷修正为 793,899B（0.76 MiB）**，以生成件 JSON 与本文 §2 为准。
