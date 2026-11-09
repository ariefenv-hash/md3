// ==================== gen-touch-snapshot.mjs — #294 触控目标 J 项快照再生 ====================
// 向 docs/visual-admission-baseline.json 增量合并 J 段（#294 · v10.99）：
//   apps[].touch = { pass, small, na, total }（逐应用 J 实测）
//   templates[].touch 同构
//   顶层 touch_summary = { min, pass, gap, na_total, small_total, source }
//   admission_bar.touch_target = #294 扩展口径说明
// 其余字段（含 tally/groups/headline/thin_remaining/_readme/generated_at 原值）逐字节保留——
// 分档回退防护仍归 scripts/quality-baseline.json 门禁，本快照不引入第二把锁（v243 D4 边界）。
//
// 用法：node scripts/gen-touch-snapshot.mjs            # 再生合并
//       node scripts/gen-touch-snapshot.mjs --check    # 校验快照 J 段与实跑一致
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runQualityAudit, TOUCH_MIN_PX } from './audit-app-quality.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAP_PATH = path.join(ROOT, 'docs', 'visual-admission-baseline.json');

const snap = JSON.parse(await readFile(SNAP_PATH, 'utf-8'));
const res = await runQualityAudit(ROOT, { log: () => {} });
const live = new Map(res.results.map((r) => [r.appId, r.touch]));
const liveTpl = new Map(res.templates.map((r) => [r.appId, r.touch]));

const checkMode = process.argv.includes('--check');
let drift = 0;

for (const a of snap.apps) {
  const t = live.get(a.id);
  if (!t) { console.error(`[touch-snapshot] 实跑缺应用 ${a.id}`); drift++; continue; }
  const next = { pass: t.pass, small: t.small, na: t.na, total: t.total };
  if (checkMode) {
    const cur = a.touch;
    if (!cur || cur.pass !== next.pass || cur.small !== next.small || cur.na !== next.na || cur.total !== next.total) {
      console.error(`[touch-snapshot] 漂移 ${a.id}: ${JSON.stringify(cur)} → ${JSON.stringify(next)}`);
      drift++;
    }
  } else {
    a.touch = next;
  }
}
for (const t of snap.templates) {
  const l = liveTpl.get(t.id);
  if (!l) { console.error(`[touch-snapshot] 实跑缺模板 ${t.id}`); drift++; continue; }
  if (checkMode) {
    if (!t.touch || t.touch.pass !== l.pass) { console.error(`[touch-snapshot] 模板漂移 ${t.id}`); drift++; }
  } else {
    t.touch = { pass: l.pass, small: l.small, na: l.na, total: l.total };
  }
}

const naTotal = res.results.reduce((s, r) => s + r.touch.na, 0);
const smallTotal = res.results.reduce((s, r) => s + r.touch.small, 0);
if (!checkMode) {
  snap.touch_summary = {
    min: TOUCH_MIN_PX,
    pass: res.touchTally.pass,
    gap: res.touchTally.gap,
    na_total: naTotal,
    small_total: smallTotal,
    source: 'node scripts/gen-touch-snapshot.mjs（audit-app-quality checkJ 实测 · 报告级非硬门禁 #243 先例）',
  };
  snap.admission_bar.touch_target =
    '#294 扩展（v10.99）：J 交互命中区证据（≥44px 静态可证面；系统组件类 md3-list-item ≥52px / md3-fab 56×56 或声明 height|min-height ≥44px）——' +
    '判据 = 零「声明 <44px」可证违规，无法静态证得者 N/A 曝光不入判（真适配不硬造）；' +
    '分档曝光不拦截（#243 先例），新增组目标线 9/9 → 10/10（随存量渐进 + 处置 3 伪元素扩命中区后续卷闭合）';
  await writeFile(SNAP_PATH, JSON.stringify(snap, null, 2) + '\n');
  console.log(`[touch-snapshot] 已合并：apps×${snap.apps.length} templates×${snap.templates.length} · 证据齐 ${res.touchTally.pass}/缺口 ${res.touchTally.gap} · N/A ${naTotal} · 违规锚 ${smallTotal}`);
} else {
  console.log(drift === 0
    ? `[touch-snapshot] --check 一致：J 段与实跑零漂移（${snap.apps.length} 应用 + ${snap.templates.length} 模板）`
    : `[touch-snapshot] --check 失败：${drift} 处漂移`);
  process.exitCode = drift === 0 ? 0 : 1;
}
