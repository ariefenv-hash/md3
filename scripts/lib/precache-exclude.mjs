// ==================== precache-exclude.mjs — SW 安装期预缓存排除清单（单一真源） ====================
//
// #184 v9.69 立项（mqtt.min.js 首例）· #280 建议③ R155 窗 v11.14 扩容（R154 审计卷
// docs/perf/dice-vendor-load-audit.md §5 方案兑现）：单消费方 vendor 大库改按需缓存
// （cache-on-first-use）——全体用户 SW 首装不再为单一应用背库，运行时经 sw.js 既有
// cacheFirst「未命中回源并回填」自动获得 stash 语义（sw.js 零改动）。
//
// 消费方：vite.config.js（copyStaticAndPrecache 生成 precache-manifest.json 时过滤）+
// scripts/verify-dist.mjs（③b dist→清单双向自洽豁免）——两处必须同源同值，
// R155 窗前为双拷贝手工同步（#184 遗留），本卷收敛为本单一真源模块。
//
// 条目语义：站点相对路径（相对 dist 根，与 toSiteUrl 输出同构）。新增条目须：
// ① 消费方唯一或近唯一（gen-vendor-audit.mjs 矩阵 consumerCount 判读）；
// ② 大体量（dist 口径 ≥100KB 量级）；③ 离线首开失败一次可接受（在线一次即 stash）；
// ④ 本表登记 + gen-vendor-audit --write 再生（precache 标志翻转）+ verify-dist 自洽。

export const PRECACHE_EXCLUDE_ENTRIES = [
  // #184 v9.69：mqtt.min.js（329KB，仅 messages 联机房间使用）
  'ios-desktop/apps/messages/mqtt.min.js',
  // #280 建议③（v11.14）：dice 家族五件（dice/index.html importmap + 首交互懒装载 #280 ②）
  'ios-desktop/apps/_shared/vendor/three.module.js',
  'ios-desktop/apps/_shared/vendor/cannon-es.js',
  'ios-desktop/apps/_shared/vendor/geometries/RoundedBoxGeometry.js',
  'ios-desktop/apps/_shared/vendor/phosphor/style.css',
  'ios-desktop/apps/_shared/vendor/phosphor/Phosphor.woff2',
  // #280 建议③（v11.14）：ocr/tesseract 家族七件（消费方仅 ocr 应用，dist 口径 13.68 MiB 按需化最大收益位）
  'ios-desktop/apps/_shared/vendor/ocr/tesseract-bundle.mjs',
  'ios-desktop/apps/_shared/vendor/ocr/worker.min.js',
  'ios-desktop/apps/_shared/vendor/ocr/tesseract-core-simd-lstm.wasm.js',
  'ios-desktop/apps/_shared/vendor/ocr/tesseract-core-lstm.wasm.js',
  'ios-desktop/apps/_shared/vendor/ocr/langs/eng.traineddata.gz',
  'ios-desktop/apps/_shared/vendor/ocr/langs/chi_sim.traineddata.gz',
  'ios-desktop/apps/_shared/vendor/ocr/langs/chi_tra.traineddata.gz',
];
