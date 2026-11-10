#!/usr/bin/node
// gen-e2e-inventory.mjs — #272 e2e playwright 化三档清单化生成器（R151 窗 · Job 2932311 · 第 1 定时消息系列）
//
// 职责：
//   ① 对 scripts/e2e-*.mjs 全量裸脚本做只读盘点（零删除零改写零改名）：机械事实
//      （v 前缀 / 行数 / playwright 导入 / 产物写面信号 / npm+workflows 引用面）逐家登记；
//   ② 按 #272 卡面建议②分三档：A 常青回归候选（无 vNNN[a-z]?- 前缀）/ B 一次性取证
//      （有前缀，标记归档可运行保留）/ C 已被 smoke 覆盖删除候选（机械不可判——本批
//      规则性记 0，删除须逐脚本功能对账批，禁止机械判删）；
//   ③ 输出 docs/audits/e2e-inventory.json（内容全派生零时间戳，逐字节可重现）；
//      --check 模式重新生成并与盘上文件逐字节比对，不一致 exit 1（check:docs-index 同律）。
//
// 纯逻辑出口（测试锚钉扎面）：V_PREFIX_RE / detectArtifactSignals / classifyTier /
// buildInventory / verifyArtifact——missing-refs-triage.mjs 先例同律。
//
// 零依赖（node:fs/node:path only）；无时间戳输出。

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(new URL('..', import.meta.url).pathname);
const OUT = join(ROOT, 'docs/audits/e2e-inventory.json');
const SCAN_DIR = 'scripts';
const CHECK = process.argv.includes('--check');

// v 前缀判别：e2e-vNNN[a-z]?- 形态锚（#291 命名纪律 v\d+[a-z]?- 同族正则；
// 前缀锚定——e2e-live-v779.mjs 类中段引用不算前缀）
export const V_PREFIX_RE = /^e2e-v\d+[a-z]?-/;

// 产物写面信号（登记事实用，非档位判据）：这些信号命中说明脚本会改写盘上
// 基线/快照产物，接入 config projects 前须评审其写面行为
export const ARTIFACT_SIGNALS = ['--update', '--write', 'writeFileSync(', '--snapshot'];
export function detectArtifactSignals(text) {
  return ARTIFACT_SIGNALS.filter((s) => text.includes(s));
}

// 三档判别（机械规则，卡面建议②逐字兑现；A 档是「候选」非「判定」——接入须逐脚本评审）
export function classifyTier(basename) {
  if (V_PREFIX_RE.test(basename)) return 'B';
  return 'A';
}

export function buildInventory(files) {
  // files: [{ file, basename, text, referencedByNpm, referencedByWorkflows }]
  const rows = files
    .slice()
    .sort((a, b) => (a.basename < b.basename ? -1 : a.basename > b.basename ? 1 : 0))
    .map((f) => {
      const lines = f.text.split('\n');
      const tier = classifyTier(f.basename);
      const headMatch = f.text.match(/^\/\/\s*=+\s*(.+?)\s*=+\s*$/m);
      return {
        file: f.file,
        basename: f.basename,
        tier,
        vPrefix: V_PREFIX_RE.test(f.basename),
        lines: lines.length,
        importsPlaywright: /^import\s+\{[^}]*chromium[^}]*\}\s+from\s+'playwright';/m.test(f.text),
        writesArtifacts: detectArtifactSignals(f.text),
        referencedByNpm: f.referencedByNpm,
        referencedByWorkflows: f.referencedByWorkflows,
        head: headMatch ? headMatch[1] : '',
      };
    });
  const counts = { A: 0, B: 0, C: 0 };
  for (const r of rows) counts[r.tier]++;
  counts.total = rows.length;
  return {
    card: '#272 e2e playwright 化三档清单（R151 窗 · Job 2932311 · 第 1 定时消息系列；版本随滚版 stamp，不内嵌）',
    scanDir: SCAN_DIR,
    pattern: 'e2e-*.mjs',
    tierRules: {
      A: '无 vNNN[a-z]?- 前缀（常青命名）→ 常青回归候选；接入 config projects 须逐脚本评审（渐进批）',
      B: '有 vNNN[a-z]?- 前缀 → 一次性取证（标记归档、可运行保留；改名属 #291 命名纪律延伸批）',
      C: '已被 smoke 覆盖删除候选——机械不可判：须逐脚本功能对账批（issue 卷对账），本批规则性记 0，禁止机械判删',
    },
    read_only_pledge: '本清单为只读盘点：对 230 家裸脚本（生成时点现值）零删除零改写零改名；既有三通道（npm e2e:dist / npm e2e:sweep / 直跑）零触碰',
    counts,
    scripts: rows,
  };
}

// 产物对账闸（防清单漂移/洗账）：新增或删除脚本而清单未再生 → mismatch
export function verifyArtifact(files, artifact) {
  const rebuilt = buildInventory(files);
  const rebuiltNames = rebuilt.scripts.map((s) => s.file);
  const artifactNames = artifact.scripts.map((s) => s.file);
  for (const n of rebuiltNames) if (!artifactNames.includes(n)) return { ok: false, reason: `missing in artifact: ${n}` };
  for (const n of artifactNames) if (!rebuiltNames.includes(n)) return { ok: false, reason: `stale in artifact: ${n}` };
  if (rebuilt.counts.total !== artifact.counts.total) return { ok: false, reason: `total drift: rebuilt=${rebuilt.counts.total} artifact=${artifact.counts.total}` };
  return { ok: true, reason: '' };
}

function scan() {
  const dir = join(ROOT, SCAN_DIR);
  const names = readdirSync(dir).filter((n) => /^e2e-.*\.mjs$/.test(n)).sort();
  const pkgRaw = readFileSync(join(ROOT, 'package.json'), 'utf8');
  const wfDir = join(ROOT, '.github/workflows');
  let wfRaw = '';
  if (existsSync(wfDir)) {
    for (const w of readdirSync(wfDir)) wfRaw += readFileSync(join(wfDir, w), 'utf8') + '\n';
  }
  const files = names.map((n) => {
    const text = readFileSync(join(dir, n), 'utf8');
    return {
      file: `${SCAN_DIR}/${n}`,
      basename: n,
      text,
      referencedByNpm: pkgRaw.includes(n),
      referencedByWorkflows: wfRaw.includes(n),
    };
  });
  return files;
}

function main() {
  const files = scan();
  const inv = buildInventory(files);
  const json = JSON.stringify(inv, null, 2) + '\n';
  if (CHECK) {
    if (!existsSync(OUT)) {
      console.error(`--check FAIL: ${'docs/audits/e2e-inventory.json'} 缺失`);
      process.exit(1);
    }
    const onDisk = readFileSync(OUT, 'utf8');
    if (onDisk !== json) {
      console.error('--check FAIL: 盘上产物与再生结果逐字节不一致（清单漂移——须再生提交）');
      process.exit(1);
    }
    console.log(`--check OK: total=${inv.counts.total} A=${inv.counts.A} B=${inv.counts.B} C=${inv.counts.C}`);
    return;
  }
  writeFileSync(OUT, json);
  console.log(`written: docs/audits/e2e-inventory.json total=${inv.counts.total} A=${inv.counts.A} B=${inv.counts.B} C=${inv.counts.C}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
