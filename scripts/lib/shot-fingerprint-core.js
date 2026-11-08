// ==================== shot-fingerprint-core.js — 截图指纹 diff 纯逻辑核（#256） ====================
//
// #246 建议③ 承载卡（视觉快照回归基建）的纯逻辑层：零 DOM / 零网络 / 零 Playwright 依赖，
// 供 scripts/shot-baseline.mjs（IO 层）与 tests/v256-shot-diff-core.test.js 共同消费。
//
// 指纹语义：应用窗口元素截图 → 浏览器内 createImageBitmap 降采样为 FP_SIZE×FP_SIZE 亮度阵
// （0~1 浮点，4 位小数）→ 两个指纹的 L1 平均距离即 diff 分数（0 = 完全一致，1 = 全反相）。
// 浏览器 canvas 即 PNG 解码器——零第三方像素 diff 依赖（#246 边界④）。
//
// 分档语义（#235 教训 / #246 边界①固化）：
//   match  (score <  DRIFT_THRESHOLD)  视觉一致
//   drift  (DRIFT ≤ score < MAJOR)     轻度漂移（抗锯齿/字体微变/时间显示类）
//   major  (score ≥ MAJOR)             显著漂移（布局坍缩/配色走样/基线被覆盖）
//   missing（IO 层语义）：基线无此条目 —— 需 --update 录制
//   resized（IO 层语义）：截图尺寸与基线不符 —— 视口变更，需重录
//
// 阻断语义：默认恒 exit 0（告警分档不硬阻断）；仅 --strict 时漂移及以上才 exit 1。

export const FP_SIZE = 16;               // 指纹边长（16×16 = 256 维亮度阵）
export const DRIFT_THRESHOLD = 0.02;     // match 上界（不含）
export const MAJOR_THRESHOLD = 0.08;     // drift 上界（不含）

// 默认目标组：刚升达标档的新增组代表 10 家（#229 摸底车道）
// v10.54 P0 批 3 家（terminal/driving/code-editor）+ v10.58 P1 二批 7 家
export const DEFAULT_APPS = [
  'terminal', 'driving', 'code-editor',
  'drawcircle', 'markdown', 'ocr',
  'bytebeat', 'midi-player', 'archive', 'ping',
];

// 双视口（#18 §2.1 准入准则②：手机/平板两套布局；平板档顺带验「真分栏不坍缩」视觉事实）
export const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 800, height: 1080 },
];

// ---------- 指纹距离 ----------
/** L1 平均距离。输入为等长数值数组（0~1）；长度不等 / 任一为空 → null（调用方按
 * resized 语义处置，不虚构分数）。返回四舍五入 6 位小数，避免浮点尾噪进报告。 */
export function fingerprintDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return null;
  if (a.length === 0 || a.length !== b.length) return null;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const da = Number(a[i]);
    const db = Number(b[i]);
    if (!Number.isFinite(da) || !Number.isFinite(db)) return null;
    sum += Math.abs(da - db);
  }
  return Math.round((sum / a.length) * 1e6) / 1e6;
}

// ---------- 分档 ----------
/** 边界语义（tests/v256 B 组固化）：score < 0.02 match；0.02 ≤ score < 0.08 drift；
 * score ≥ 0.08 major。返回 { level, score }；score 为 null 时 level='invalid'。 */
export function classifyDiff(score) {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return { level: 'invalid', score: null };
  }
  if (score < DRIFT_THRESHOLD) return { level: 'match', score };
  if (score < MAJOR_THRESHOLD) return { level: 'drift', score };
  return { level: 'major', score };
}

// ---------- 报告组装 ----------
/** currents: [{ key, app, vp, ok, fp, size, why? }]（IO 层产出；ok=false 时 fp/size 缺省）
 * baselines: { [key]: { fp, size, at } }（fingerprints.json 直读）
 * 输出五桶 + skip（应用不可达/目录未注册等 IO 层主动跳过项）。 */
export function buildReport(currents, baselines) {
  const report = { match: [], drift: [], major: [], missing: [], resized: [], skip: [] };
  const base = baselines && typeof baselines === 'object' ? baselines : {};
  for (const c of currents || []) {
    if (!c.ok) { report.skip.push({ key: c.key, app: c.app, vp: c.vp, why: c.why || '' }); continue; }
    const b = base[c.key];
    if (!b || !Array.isArray(b.fp)) {
      report.missing.push({ key: c.key, app: c.app, vp: c.vp, size: c.size || null });
      continue;
    }
    if (Array.isArray(b.size) && Array.isArray(c.size)
      && (b.size[0] !== c.size[0] || b.size[1] !== c.size[1])) {
      report.resized.push({ key: c.key, app: c.app, vp: c.vp, base: b.size, now: c.size });
      continue;
    }
    const { level, score } = classifyDiff(fingerprintDistance(b.fp, c.fp));
    if (level === 'match') report.match.push({ key: c.key, app: c.app, vp: c.vp, score });
    else if (level === 'drift') report.drift.push({ key: c.key, app: c.app, vp: c.vp, score });
    else if (level === 'major') report.major.push({ key: c.key, app: c.app, vp: c.vp, score });
    else report.skip.push({ key: c.key, app: c.app, vp: c.vp, why: '指纹不可比（invalid）' });
  }
  return report;
}

// ---------- 报告渲染 ----------
export function renderReport(report) {
  const n = (arr) => (arr || []).length;
  const lines = [];
  lines.push(`[shot-diff] 结果：一致 ${n(report.match)} / 漂移 ${n(report.drift)} / 显著 ${n(report.major)} / 缺基线 ${n(report.missing)} / 需重录 ${n(report.resized)} / 跳过 ${n(report.skip)}`);
  for (const e of report.major) lines.push(`  MAJOR  ${e.key}  score=${e.score}  ← 基线疑被覆盖，请人工核对或 --update 重录`);
  for (const e of report.drift) lines.push(`  DRIFT  ${e.key}  score=${e.score}`);
  for (const e of report.missing) lines.push(`  MISS   ${e.key}  （基线缺失 → npm run shot:diff -- --update 录制）`);
  for (const e of report.resized) lines.push(`  RESIZE ${e.key}  基线 ${JSON.stringify(e.base)} → 当前 ${JSON.stringify(e.now)}（视口变更需重录）`);
  for (const e of report.skip) lines.push(`  SKIP   ${e.key}  ${e.why || ''}`);
  lines.push('[shot-diff] 告警分档非硬阻断（#235 教训 / #246 边界①）；--strict 时漂移及以上才 fail。');
  return lines.join('\n');
}

// ---------- 退出码 ----------
/** #256 验收①固化：非 strict 恒 0（告警不阻断）；strict 时 drift/major/missing/resized
 * 任一非空 → 1。skip（应用自身不可达）不计入 fail——基建不为产品缺陷变红。 */
export function computeExitCode(report, strict) {
  if (!strict) return 0;
  const bad = n_(report.drift) + n_(report.major) + n_(report.missing) + n_(report.resized);
  return bad > 0 ? 1 : 0;
}
function n_(arr) { return Array.isArray(arr) ? arr.length : 0; }

// ---------- CLI 参数 ----------
export function parseArgs(argv) {
  const args = Array.isArray(argv) ? argv : [];
  const out = { update: false, strict: false, apps: null, port: 8096, threshold: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--update') out.update = true;
    else if (a === '--strict') out.strict = true;
    else if (a === '--apps') { out.apps = String(args[++i] || '').split(',').map((s) => s.trim()).filter(Boolean); }
    else if (a === '--port') { const v = Number(args[++i]); if (Number.isFinite(v) && v > 0) out.port = v; }
    else if (a === '--threshold') { const v = Number(args[++i]); if (Number.isFinite(v) && v >= 0 && v <= 1) out.threshold = v; }
  }
  return out;
}
