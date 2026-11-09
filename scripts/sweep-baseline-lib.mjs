// ==================== sweep-baseline-lib.mjs — sweep 运行时健康基线纯逻辑层（#304） ====================
//
// #304 提议固化：深测全绿面落 docs/sweep-baseline.json（应用×三通道计数表），
// sweep 每次运行与之对比——新增异常即红、已知异常走精确计数豁免、改善提示重切基线。
//
// 本模块零依赖零 DOM 零副作用（真身直连可测；消费方 = scripts/e2e-app-sweep.mjs
// 默认对比闸 + tests/sweep-baseline.test.js 锚组）。
//
// 三通道口径与 e2e-app-sweep 逐字对齐（踩坑④同律）：
//   pageerror  —— 页面未捕获异常（#260 防线）
//   consoleRes —— 同源资源加载失败 console error（#260 防线）
//   netfail    —— 同源 4xx + requestfailed（#299 防线）
//
// 对比规则（新增异常即红 · 已知异常精确计数豁免 · 双向防漂移）：
//   ① 实测三通道全零                        → green（绿面）
//   ② 实测与基线逐通道精确相等（基线非零）  → exempt（豁免命中：已知异常，计数钉死防劣化）
//   ③ 实测 > 基线（任一通道）               → regression（劣化，红）
//   ④ 实测 < 基线（任一通道且无超，含实测清零而基线非零）→ below（改善，提示 --write-baseline
//      重切；#297/#298 修复后的清零可断言形态——改善仅提示不翻红，verdict 仍 green）
//   ⑤ 实测出现基线没有的应用                → unknown（覆盖面增长未重切，红）
//   ⑥ 基线出现实测没有的应用                → missingApps（覆盖面静默收缩，红——防无声劣化）
// verdict：regressions/unknownApps/missingApps 任一非空 → 'red'，否则 'green'；
//          improvements 非空 → rebaselineNeeded = true（仅提示，不翻红）。

export const SWEEP_BASELINE_SCHEMA = 1;
export const SWEEP_CHANNELS = ['pageerror', 'consoleRes', 'netfail'];

const isCount = (v) => Number.isInteger(v) && v >= 0;

/** 三通道计数归一：非整数/负数/缺通道一律抛错（数据源契约，静默钳制即假绿） */
export function normalizeCounts(raw) {
  if (!raw || typeof raw !== 'object') throw new TypeError('counts 必须是对象');
  for (const ch of SWEEP_CHANNELS) {
    if (!isCount(raw[ch])) throw new TypeError(`counts.${ch} 必须是非负整数，实得 ${JSON.stringify(raw[ch])}`);
  }
  return { pageerror: raw.pageerror, consoleRes: raw.consoleRes, netfail: raw.netfail };
}

/**
 * 由 sweep 实跑报告构建基线快照。
 * @param apps [{id, dir?, ok?, pageerror, consoleRes, netfail}]
 * @param meta {generated?, head?, stamp?, note?}
 */
export function buildBaseline(apps, meta = {}) {
  if (!Array.isArray(apps) || apps.length === 0) throw new TypeError('apps 必须是非空数组');
  const seen = new Set();
  const outApps = {};
  let appsWithError = 0, totalErrors = 0;
  for (const a of apps) {
    if (!a || typeof a.id !== 'string' || !a.id) throw new TypeError('app.id 缺失');
    if (seen.has(a.id)) throw new TypeError(`app.id 重复：${a.id}`);
    seen.add(a.id);
    const c = normalizeCounts(a);
    const errSum = c.pageerror + c.consoleRes + c.netfail;
    if (errSum > 0) appsWithError++;
    totalErrors += errSum;
    outApps[a.id] = { dir: a.dir ?? null, ok: errSum === 0, ...c };
  }
  return {
    schema: SWEEP_BASELINE_SCHEMA,
    generated: meta.generated || null,
    head: meta.head || null,
    stamp: meta.stamp || null,
    note: meta.note || null,
    apps: outApps,
    summary: { apps: apps.length, appsWithError, totalErrors },
  };
}

/**
 * 单应用三通道对比状态机（unknown 已在调用侧前置分流，此处不会收到无 pinned 的输入）。
 * 返回 { state: 'green'|'exempt'|'regression'|'below', channels }。
 */
function compareApp(actual, pinned) {
  const sum = actual.pageerror + actual.consoleRes + actual.netfail;
  const pinnedSum = pinned.pageerror + pinned.consoleRes + pinned.netfail;
  // 双零 = 绿面；实测清零但基线非零 = 改善（修复落地，below 而非 green——清零可断言形态）
  if (sum === 0 && pinnedSum === 0) return { state: 'green', channels: [] };
  const over = SWEEP_CHANNELS.filter((c) => actual[c] > pinned[c]);
  const under = SWEEP_CHANNELS.filter((c) => actual[c] < pinned[c]);
  if (over.length) return { state: 'regression', channels: over };
  if (under.length) return { state: 'below', channels: under };
  return { state: 'exempt', channels: SWEEP_CHANNELS.filter((c) => actual[c] > 0) };
}

/**
 * sweep 实跑报告对比基线。
 * @param apps 同 buildBaseline 的 apps（实测报告；id 唯一）
 * @param baseline buildBaseline 产物（或同构已解析 JSON）
 */
export function compareReportToBaseline(apps, baseline) {
  if (!Array.isArray(apps) || apps.length === 0) throw new TypeError('apps 必须是非空数组');
  if (!baseline || baseline.schema !== SWEEP_BASELINE_SCHEMA || typeof baseline.apps !== 'object' || Array.isArray(baseline.apps)) {
    throw new TypeError(`基线不合法：schema 必须为 ${SWEEP_BASELINE_SCHEMA} 且含 apps 映射`);
  }
  const pinnedIds = new Set(Object.keys(baseline.apps));
  const regressions = [], exemptionsHit = [], improvements = [], unknownApps = [], missingApps = [];
  const seen = new Set();
  for (const a of apps) {
    if (!a || typeof a.id !== 'string' || !a.id) throw new TypeError('app.id 缺失');
    if (seen.has(a.id)) throw new TypeError(`app.id 重复：${a.id}`);
    seen.add(a.id);
    const c = normalizeCounts(a);
    if (!pinnedIds.has(a.id)) {
      unknownApps.push(a.id);
      regressions.push({ id: a.id, channels: SWEEP_CHANNELS.filter((x) => c[x] > 0), reason: '基线未登记的新应用（unknown）' });
      continue;
    }
    const p = normalizeCounts(baseline.apps[a.id]);
    const r = compareApp(c, p);
    if (r.state === 'green') continue;
    if (r.state === 'exempt') exemptionsHit.push({ id: a.id, channels: r.channels });
    else if (r.state === 'regression') regressions.push({ id: a.id, channels: r.channels, reason: '实测超基线（劣化）' });
    else if (r.state === 'below') improvements.push({ id: a.id, channels: r.channels, reason: '实测低于基线（改善→建议重切）' });
  }
  for (const id of pinnedIds) if (!seen.has(id)) missingApps.push(id);
  const verdict = regressions.length || unknownApps.length || missingApps.length ? 'red' : 'green';
  return {
    verdict,
    rebaselineNeeded: improvements.length > 0,
    regressions, exemptionsHit, improvements, unknownApps, missingApps,
    summary: { apps: apps.length, baselineApps: pinnedIds.size },
  };
}
