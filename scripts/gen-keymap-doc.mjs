#!/usr/bin/env node
// gen-keymap-doc.mjs — #305 全局键位契约真源生成器（keymap.md 生成 + 对账闸落地）
//
// 职责（#305 处置建议 ①③ 的生成面；建议② README 挂链由交付提交落地并由 v305 锚守护）：
//   ① 组合键契约：解析 ios-desktop/js 全树 createKeyDispatcher 接线点（chord id / keys / holdMs
//      / onTrigger 体字面去向）——系统组合键真源 = aosp/key-dispatcher.js + 两处接线（volume-dialog
//      无障碍双键与截图 sysrq、quick-settings 电源长按）；
//   ② 键绑定注册表：扫描全树 addEventListener('keydown', …) 注册点，按块扫描提取消费键面
//      （e.key === 'X' 字面比较，块界 = 注册行缩进封闭），登记 target（document/window/element
//      三类）与 capture 相位 + 注册行前注释尾注（verbatim）；
//   ③ 消费键面比较点全表：全树 *.key === 'X' 字面比较点逐一登记（含具名/移位处理器面），
//      Escape 仲裁表由比较点派生（capture 层先于 bubble 层，源码相位实证），同相位按文件字典序；
//   ④ 裁决面（源码实证，全部由扫描数据派生，零手写事实）：
//      · D 键：全树 0 处 'd'/'D' 消费 + lock-screen.js 0 处 keydown 注册 + 解锁沿 = pointerdown
//        手势/按钮（行号扫描派生）→ 解锁手势-only 裁决成立（#305 实测「D 键不解锁」根因闭环）；
//      · A 键：0 处 'a'/'A' 消费；锁屏任意键仅 aod-ui activity 标记（行号扫描派生）→
//        实测「A：锁屏感」= 键盘无解锁沿的必然结果（非绑定行为）；
//   ⑤ 生成 docs/keymap.md + docs/keymap-inventory.json（生成件单真源禁手改，check:docs-index /
//      check:apps-doc 同律；无时间戳，逐字节可重现，否则 --check 永红）；
//   ⑥ 边界：js/apps/* 的 element 级焦点键不入系统契约 v1（窗口内应用层随窗口文档自治），
//      iframe 目录数沿用 #267 countIframeApps 口径（apps/ 含 index.html 目录数）——
//      边界数字由扫描派生，本生成器不做清单级登记（#285 车道已立）。
//
// 阴性钩子（仅测试用，CI 不设）：MD3_KEYMAP_PATH 可指向 js/taskbar.js 的临时替换副本
//   （v285 MD3_APPSDATA_PATH 同律）——绑定删除 / 键面增删 → 重新生成与盘上生成件不一致 →
//   --check 即红（exit 1），守护「注册点即契约」。
//
// 用法：node scripts/gen-keymap-doc.mjs            # 生成两件 + stdout 汇总
//       node scripts/gen-keymap-doc.mjs --check    # 重新生成并与盘上逐字节比对（不一致 exit 1）

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(new URL('..', import.meta.url).pathname);
const SRC = join(ROOT, 'ios-desktop');
const JS_DIR = join(SRC, 'js');
const DOCS = join(ROOT, 'docs');
const MODE_CHECK = process.argv.includes('--check');
// 阴性钩子：taskbar.js 单文件替换（仅测试用）
const TASKBAR_OVERRIDE = process.env.MD3_KEYMAP_PATH || null;

const fail = (msg) => { console.error(`[keymap] ERROR: ${msg}`); process.exit(1); };

// ---------- 源文件集（ios-desktop/js 全树 .js，排除 .mjs 生成变体） ----------
function walkJs(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walkJs(p));
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}
function readSrc(relPath) {
  // relPath 形如 'js/taskbar.js'（相对 ios-desktop）
  if (TASKBAR_OVERRIDE && relPath === 'js/taskbar.js') return readFileSync(TASKBAR_OVERRIDE, 'utf8');
  return readFileSync(join(SRC, relPath), 'utf8');
}
const allFiles = walkJs(JS_DIR).map((p) => 'js/' + relative(JS_DIR, p).split(join.sep).join('/')).sort();
if (allFiles.length === 0) fail('扫描集为空：ios-desktop/js 下零 .js 文件');

// ---------- ① createKeyDispatcher 接线点解析 ----------
function parseDispatcherWiring() {
  const rows = [];
  for (const rel of allFiles) {
    const text = readSrc(rel);
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (!/createKeyDispatcher\s*\(/.test(lines[i])) continue;
      // 向后截取接线体（至多 30 行或至闭合「});」）解析 chords 数组字面与 onTrigger 体
      let body = '';
      let closed = false;
      for (let j = i; j < Math.min(i + 30, lines.length); j++) {
        body += lines[j] + '\n';
        if (j > i && /\}\)\s*;\s*$/.test(lines[j])) { closed = true; break; }
      }
      if (!closed) body = lines.slice(i, Math.min(i + 30, lines.length)).join('\n');
      const chordRe = /\{\s*id:\s*'([^']+)',\s*keys:\s*\[([^\]]+)\],\s*holdMs:\s*([A-Z_]+|\d+)\s*\}/g;
      let m;
      while ((m = chordRe.exec(body)) !== null) {
        const keys = m[2].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
        // holdMs：字面数字或导入常量名（常量名 → 从 key-dispatcher.js export 行解析真值）
        let holdMs = /^\d+$/.test(m[3]) ? Number(m[3]) : null;
        let holdMsSrc = /^\d+$/.test(m[3]) ? 'literal' : m[3];
        if (holdMs === null) {
          const kd = readFileSync(join(SRC, 'js/aosp/key-dispatcher.js'), 'utf8');
          const cst = kd.match(new RegExp(`export const ${m[3]}\\s*=\\s*(\\d+)`));
          if (cst) holdMs = Number(cst[1]);
        }
        // onTrigger 体字面去向（字面串包含判定，零语义推断）——按 chord 分支切片：
        //   取 onTrigger 内 chord.id === '<id>' 分支段至下一 chord.id 分支，sink 只认本分支字面
        const trigIdx = body.indexOf('onTrigger');
        const trigBody = trigIdx >= 0 ? body.slice(trigIdx) : '';
        const branchRe = new RegExp(`chord\\.id\\s*===\\s*'${m[1]}'`);
        const bm = trigBody.match(branchRe);
        const branchBody = bm
          ? trigBody.slice(bm.index, (() => {
              const rest = trigBody.slice(bm.index + 10);
              const nm = rest.match(/chord\.id\s*===/);
              return nm ? bm.index + 10 + nm.index : undefined;
            })())
          : trigBody;
        const sink = [];
        if (/openPowerDialog/.test(branchBody)) sink.push('openPowerDialog（GlobalActionsDialog 电源菜单）');
        if (/screenshot|Screenshot/.test(branchBody)) sink.push('screenshot（系统截图沿）');
        if (/accessibility|Accessibility/.test(branchBody)) sink.push('accessibility shortcut（无障碍快捷键沿）');
        if (sink.length === 0) sink.push('（onTrigger 体未见已知去向字面，接线点实查）');
        rows.push({ wiring: `${rel}:${i + 1}`, chordId: m[1], keys, holdMs, holdMsSrc, sinks: sink });
      }
    }
  }
  rows.sort((a, b) => (a.wiring < b.wiring ? -1 : a.wiring > b.wiring ? 1 : a.chordId < b.chordId ? -1 : 1));
  return rows;
}

// ---------- ② 键绑定注册点块扫描 ----------
const REG_RE = /(.+?)\.addEventListener\(\s*['"]keydown['"]\s*,/;
const KEY_CMP_RE = /\b(?:e|ev|evt|event)\.key\s*===\s*(['"])((?:[^'"\n\\])+)\1/g;
const KEY_LOWER_RE = /\b(?:e|ev|evt|event)\.key\.toLowerCase\(\)\s*===\s*(['"])([a-z0-9]+)\1['"]/g;
const KEY_GUARD_RE = /\b(?:e|ev|evt|event)\.key\s*!==\s*(['"])((?:[^'"\n\\])+)\1/g;
const EVAR_OK = true;

function classifyTarget(targetExpr) {
  const t = targetExpr.trim();
  if (/^(document|window)\b/.test(t)) return t.startsWith('document') ? 'document' : 'window';
  return 'element';
}
function precedingCommentTail(lines, idx) {
  // 注册行上方连续 // 注释块尾行 verbatim（截尾空白；仅取尾行语义提示，零改写）
  let tail = '';
  for (let j = idx - 1; j >= 0 && j >= idx - 4; j--) {
    const mm = lines[j].match(/^\s*\/\/\s?(.*)$/);
    if (!mm) break;
    tail = mm[1].trim();
  }
  return tail;
}
function parseComparisonSites() {
  // 全树键面比较点（含具名/移位处理器）：每处 e.key === 'X' / toLowerCase 比较独立成行登记；
  // context = 同文件内向上最近（≤30 行）keydown 注册点（target/capture 派生自注册行）
  const rows = [];
  for (const rel of allFiles) {
    const text = readSrc(rel);
    const lines = text.split('\n');
    // 预登记本文件全部 keydown 注册行（行号 → {target, capture}）
    const regs = [];
    for (let i = 0; i < lines.length; i++) {
      const rm = lines[i].match(REG_RE);
      if (rm) regs.push({ line: i + 1, target: classifyTarget(rm[1]), capture: /\s*,\s*true\s*\)\s*;?\s*$/.test(lines[i]) });
    }
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let km;
      const hits = [];
      const guards = [];
      KEY_CMP_RE.lastIndex = 0;
      while ((km = KEY_CMP_RE.exec(line)) !== null) hits.push(km[2]);
      KEY_LOWER_RE.lastIndex = 0;
      while ((km = KEY_LOWER_RE.exec(line)) !== null) hits.push(km[2].toUpperCase());
      KEY_GUARD_RE.lastIndex = 0;
      while ((km = KEY_GUARD_RE.exec(line)) !== null) guards.push(km[2]);
      if (hits.length === 0 && guards.length === 0) continue;
      let ctx = null;
      for (const r of regs) { if (r.line <= i + 1 && i + 1 - r.line <= 30) ctx = r; }
      for (const k of new Set(hits).values()) {
        rows.push({ key: k, op: '===', site: `${rel}:${i + 1}`, contextSite: ctx ? `${rel}:${ctx.line}` : null, contextTarget: ctx ? ctx.target : null, contextCapture: ctx ? ctx.capture : null });
      }
      for (const k of new Set(guards).values()) {
        rows.push({ key: k, op: '!==', site: `${rel}:${i + 1}`, contextSite: ctx ? `${rel}:${ctx.line}` : null, contextTarget: ctx ? ctx.target : null, contextCapture: ctx ? ctx.capture : null });
      }
    }
  }
  rows.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.op < b.op ? -1 : a.op > b.op ? 1 : a.site < b.site ? -1 : 1));
  return rows;
}

function parseBindings() {
  const rows = [];
  for (const rel of allFiles) {
    const text = readSrc(rel);
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const rm = lines[i].match(REG_RE);
      if (!rm) continue;
      const target = classifyTarget(rm[1]);
      const capture = /\s*,\s*true\s*\)\s*;?\s*$/.test(lines[i]);
      // 块扫描：注册行缩进为界，向下一路收集更深缩进非空行内的键面比较
      const regIndent = (lines[i].match(/^\s*/) || [''])[0].length;
      const keys = new Set();
      let lowerHit = false;
      for (let j = i + 1; j < Math.min(i + 60, lines.length); j++) {
        const line = lines[j];
        if (line.trim() === '') continue;
        const ind = (line.match(/^\s*/) || [''])[0].length;
        if (ind <= regIndent && j > i) break; // 块封闭
        let km;
        KEY_CMP_RE.lastIndex = 0;
        while ((km = KEY_CMP_RE.exec(line)) !== null) keys.add(km[2]);
        KEY_LOWER_RE.lastIndex = 0;
        while ((km = KEY_LOWER_RE.exec(line)) !== null) { keys.add(km[2].toUpperCase()); lowerHit = true; }
      }
      const keyList = [...keys].sort();
      rows.push({
        site: `${rel}:${i + 1}`,
        target, capture,
        keys: keyList,
        lowerNormalized: lowerHit,
        note: precedingCommentTail(lines, i),
      });
    }
  }
  rows.sort((a, b) => (a.site < b.site ? -1 : a.site > b.site ? 1 : 0));
  return rows;
}

// ---------- ③④ 派生面 ----------
function deriveEscape(comparisons) {
  const esc = comparisons.filter((r) => r.key === 'Escape');
  // 仲裁序：capture 相位（注册 context）在前，同相位按 site 字典序；无注册 context（移位/具名）殿后
  esc.sort((a, b) => {
    const ca = a.contextCapture === true ? 0 : a.contextCapture === false ? 1 : 2;
    const cb = b.contextCapture === true ? 0 : b.contextCapture === false ? 1 : 2;
    if (ca !== cb) return ca - cb;
    return a.site < b.site ? -1 : 1;
  });
  return esc;
}

// 守卫式消费面（op=!==）不入「消费键面」判定口径：!== 'X' 为非该键即 return，
// 判定 a/d 键是否被「消费」只认 === 面与 toLowerCase 面（v305 锚同律）。
function scanFileLine(rel, re) {
  const text = readSrc(rel);
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) if (re.test(lines[i])) return i + 1;
  return 0;
}
function deriveVerdicts(bindings) {
  const hasKey = (k) => bindings.some((r) => r.keys.includes(k));
  const lockKeydown = bindings.filter((r) => r.site.startsWith('js/lock-screen.js')).length;
  const dBound = hasKey('d') || hasKey('D');
  const aBound = hasKey('a') || hasKey('A');
  const aodActivity = scanFileLine('js/aod-ui.js', /addEventListener\(\s*['"]keydown['"]/);
  const lockPointer = scanFileLine('js/lock-screen.js', /lockEl\.addEventListener\(\s*['"]pointerdown['"]/);
  const spaceCount = bindings.filter((r) => r.keys.includes(' ')).length;
  return {
    dKey: {
      bound: dBound,
      lockScreenKeydownSites: lockKeydown,
      unlockGestureAnchor: lockPointer > 0 ? `js/lock-screen.js:${lockPointer}` : '（pointerdown 注册未命中，实查）',
      verdict: (!dBound && lockKeydown === 0 && lockPointer > 0)
        ? `成立：全树 0 处 'd'/'D' 键面消费 + lock-screen.js 0 处 keydown 注册 + 解锁唯一沿 = pointerdown 手势/按钮（${`js/lock-screen.js:${lockPointer}`}）→ 解锁手势-only，D 键不解锁为设计意图（#305 实测根因闭环）`
        : '不成立或扫描面漂移：绑定面/锁屏注册面出现键入沿，实查再裁决',
    },
    aKey: {
      bound: aBound,
      aodAnyKeyActivityAnchor: aodActivity > 0 ? `js/aod-ui.js:${aodActivity}` : '（aod activity 注册未命中，实查）',
      verdict: (!aBound && aodActivity > 0)
        ? `成立：全树 0 处 'a'/'A' 键面消费；锁屏任意 keydown 仅 activity 标记（${`js/aod-ui.js:${aodActivity}`}）→ 实测「A：锁屏感」= 键盘无解锁沿的必然结果，非绑定行为`
        : '不成立或扫描面漂移：A 键面出现绑定，实查再裁决',
    },
    spaceSites: spaceCount,
  };
}
function deriveBoundary(allFiles) {
  const appFiles = allFiles.filter((f) => f.startsWith('js/apps/'));
  const appsDir = join(SRC, 'apps');
  let iframeDirs = 0;
  if (existsSync(appsDir)) {
    for (const e of readdirSync(appsDir, { withFileTypes: true })) {
      if (e.isDirectory() && existsSync(join(appsDir, e.name, 'index.html'))) iframeDirs++;
    }
  }
  return { scannedFiles: allFiles.length, appLayerFiles: appFiles.length, iframeDirs, nativeApps: appFiles.length - 0 };
}

// ---------- ⑤ 渲染（无时间戳，确定性排序） ----------
const fmtKeys = (ks) => ks.map((k) => (k === ' ' ? 'Space' : k === 'Escape' ? 'Escape' : k === 'Enter' ? 'Enter' : JSON.stringify(k).replace(/^"|"$/g, '') )).join(' | ') || '（无键面比较——行为性监听）';
function render(md, inv) {
  const L = [];
  L.push('# 全局键位契约（keymap.md · #305）');
  L.push('');
  L.push('> **生成件单真源，禁手改**（check:docs-index / check:apps-doc 同律）：由 `scripts/gen-keymap-doc.mjs` 从');
  L.push('> ios-desktop/js 全树键处理源码扫描生成，无时间戳逐字节可重现；再生成 `node scripts/gen-keymap-doc.mjs`，');
  L.push('> 对账闸 `npm run check:keymap`（--check 逐字节）。绑定注册点即契约：源码增删键面 → 本件随树再生。');
  L.push('');
  L.push('## ① 组合键契约（createKeyDispatcher 接线点）');
  L.push('');
  L.push('真源：`js/aosp/key-dispatcher.js`（#111 组合键路由：键集精确匹配 + 最短保持时长；任一键提前释放取消；凑齐前混入集合外键破坏取消）。接线点解析：');
  L.push('');
  L.push('| 接线点 | chord id | 键集 | holdMs | holdMs 真源 | 触发去向（onTrigger 体字面） |');
  L.push('|---|---|---|---|---|---|');
  if (inv.dispatcherWiring.length === 0) L.push('| （零接线点——实查） | | | | | |');
  for (const w of inv.dispatcherWiring) {
    L.push(`| ${w.wiring} | ${w.chordId} | ${w.keys.join(' + ')} | ${w.holdMs} | ${w.holdMsSrc} | ${w.sinks.join('；')} |`);
  }
  L.push('');
  L.push('## ② 键绑定注册表（keydown 注册点 × 消费键面）');
  L.push('');
  L.push(`扫描集：ios-desktop/js 全树 ${inv.boundary.scannedFiles} 个 .js（含 aosp/ 与 apps/）。target 三类：document / window / element（组件内焦点层）。键面 = 注册块内 \`*.key === 'X'\` 字面比较（lower-case 比较已归一登记）。`);
  L.push('');
  L.push('| 注册点 | target | capture | 消费键面 | 注册行前注释尾注（verbatim） |');
  L.push('|---|---|---|---|---|');
  for (const b of inv.bindings) {
    L.push(`| ${b.site} | ${b.target} | ${b.capture ? 'true' : 'false'} | ${fmtKeys(b.keys)} | ${b.note ? b.note.replace(/\|/g, '\\|') : ''} |`);
  }
  L.push('');
  L.push('## ③ 消费键面比较点（全树）');
  L.push('');
  L.push(`全树 ${inv.comparisons.length} 处 *.key ===/!== 'X' 字面比较点（含具名/移位处理器面与守卫式消费；lower-case 比较归一为大写登记；op=!== 为守卫面「非该键即 return」，与 === 同为键面契约事实）。context = 同文件向上 ≤30 行内最近 keydown 注册点。`);
  L.push('');
  L.push('| 键面 | op | 比较点 | context 注册点 | context target | context 相位 |');
  L.push('|---|---|---|---|---|---|');
  for (const c of inv.comparisons) {
    const kk = c.key === ' ' ? 'Space' : c.key;
    L.push(`| ${kk.replace(/\|/g, '\\|')} | ${c.op} | ${c.site} | ${c.contextSite || '（移位/具名处理器）'} | ${c.contextTarget || ''} | ${c.contextCapture === true ? 'capture' : c.contextCapture === false ? 'bubble' : ''} |`);
  }
  L.push('');
  L.push('## ④ Escape 消费与仲裁');
  L.push('');
  L.push('仲裁序（源码相位实证）：**capture 相位先于 bubble 相位**，无注册 context（移位/具名处理器）殿后；同相位按比较点字典序（运行时还要叠加 DOM 层叠与 stopPropagation 路径，此处登记注册面事实）。');
  L.push('');
  L.push('| 序 | 比较点 | 相位（context 注册点） |');
  L.push('|---|---|---|');
  inv.escapeArbitration.forEach((b, i) => {
    L.push(`| ${i + 1} | ${b.site}${b.op === '!==' ? '（守卫）' : ''} | ${b.contextCapture === true ? `capture（${b.contextSite}）` : b.contextCapture === false ? `bubble（${b.contextSite}）` : '移位/具名处理器'} |`);
  });
  L.push('');
  L.push('## ⑤ 裁决面（源码实证，扫描数据派生）');
  L.push('');
  L.push(`- **D 键解锁**：${inv.verdicts.dKey.verdict}`);
  L.push('');
  L.push(`- **A 键锁屏感**：${inv.verdicts.aKey.verdict}`);
  L.push('');
  L.push(`- **Space 键面**：${inv.verdicts.spaceSites} 处注册点消费（组件内焦点沿为主，逐行见 ②）。`);
  L.push('');
  L.push('## ⑥ 边界声明');
  L.push('');
  L.push(`- 系统契约 v1 面 = ios-desktop/js 全树 keydown 注册点（${inv.bindings.length} 处，target=document/window/element）；`);
  L.push(`- js/apps/ 应用层 ${inv.boundary.appLayerFiles} 个 .js 文件的 element 级焦点键（Enter 提交等）随窗口文档自治，不入系统契约 v1（应用清单口径见 docs/APPS.md，#285 车道）；`);
  L.push(`- iframe 应用 ${inv.boundary.iframeDirs} 家（#267 countIframeApps 口径）内部键面随各自 index.html 文档自治；`);
  L.push('- 锁屏解锁沿唯一性见 ④ D 键裁决（lock-screen.js 零 keydown 注册为本件扫描实证，回归即随树再生暴露）。');
  L.push('');
  return L.join('\n');
}

// ---------- 主流程 ----------
const wiring = parseDispatcherWiring();
const bindings = parseBindings();
const comparisons = parseComparisonSites();
const escapeArbitration = deriveEscape(comparisons);
const verdicts = deriveVerdicts(bindings);
const boundary = deriveBoundary(allFiles);

// 三源对账：组合键真源常量必须在 key-dispatcher.js 实存
const kdSrc = readFileSync(join(SRC, 'js/aosp/key-dispatcher.js'), 'utf8');
if (!/export const POWER_LONG_PRESS_MS\s*=\s*500/.test(kdSrc)) fail('key-dispatcher.js POWER_LONG_PRESS_MS=500 真值漂移');
if (!/export const ACCESSIBILITY_CHORD_HOLD_MS\s*=\s*3000/.test(kdSrc)) fail('key-dispatcher.js ACCESSIBILITY_CHORD_HOLD_MS=3000 真值漂移');
if (bindings.length === 0) fail('键绑定注册表为空——扫描器失效');

const inv = { generatedBy: '#305 scripts/gen-keymap-doc.mjs（单真源禁手改，无时间戳逐字节可重现）', dispatcherWiring: wiring, bindings, comparisons, escapeArbitration, verdicts, boundary };
const md = render(null, inv) + '\n';
const json = JSON.stringify(inv, null, 2) + '\n';

const MD_PATH = join(DOCS, 'keymap.md');
const JSON_PATH = join(DOCS, 'keymap-inventory.json');

if (MODE_CHECK) {
  const diskMd = existsSync(MD_PATH) ? readFileSync(MD_PATH, 'utf8') : '';
  const diskJson = existsSync(JSON_PATH) ? readFileSync(JSON_PATH, 'utf8') : '';
  if (diskMd !== md) fail(`docs/keymap.md 与重新生成不一致（注册点/键面漂移？随树再生：node scripts/gen-keymap-doc.mjs）`);
  if (diskJson !== json) fail(`docs/keymap-inventory.json 与重新生成不一致（随树再生）`);
  console.log(`[keymap] check PASS：wiring ${wiring.length} / bindings ${bindings.length} / comparisons ${comparisons.length} / escape ${escapeArbitration.length} / scanned ${allFiles.length}`);
} else {
  mkdirSync(DOCS, { recursive: true });
  writeFileSync(MD_PATH, md);
  writeFileSync(JSON_PATH, json);
  console.log(`[keymap] generated：docs/keymap.md + docs/keymap-inventory.json（wiring ${wiring.length} / bindings ${bindings.length} / comparisons ${comparisons.length} / escape ${escapeArbitration.length} / scanned ${allFiles.length}）`);
}
