#!/usr/bin/env node
// ==================== daily-advance.mjs — ROADMAP 队列推进助手（v7.73） ====================
//
// 用途：每日触发语「按 ROADMAP 队列推进下一个小板块」的会话开场工具。
//   node scripts/daily-advance.mjs            → 报告下一个应推进的板块（[~] 优先于 [ ]）
//   node scripts/daily-advance.mjs --done 1   → 把板块 1 标记为完成 [x]（并追加状态日志）
//   node scripts/daily-advance.mjs --pause 3  → 把板块 3 标记为进行中 [~]（侦查/实现跨日时用）
//   node scripts/daily-advance.mjs --all      → 列出全部板块与状态
//
// 队列格式约定（docs/ROADMAP.md「队列（按序推进）」小节内）：
//   - [ ] **板块 N · 标题** — 描述…
//   - [~] …进行中
//   - [x] …完成

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'docs', 'ROADMAP.md');
const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });

const md = readFileSync(file, 'utf8');
const queueHead = '## 队列（按序推进）';
const queueTail = '## 已完成';
const qStart = md.indexOf(queueHead);
const qEnd = md.indexOf(queueTail);
if (qStart < 0 || qEnd < 0) { console.error('ROADMAP.md 缺少队列小节标记'); process.exit(1); }
const before = md.slice(0, qStart + queueHead.length);
const queue = md.slice(qStart + queueHead.length, qEnd);
const after = md.slice(qEnd);

const RE = /^- \[([ x~])\] \*\*板块 (\d+) · (.*?)\*\*(.*)$/gm;
const items = [];
let m;
while ((m = RE.exec(queue)) !== null) {
  items.push({ mark: m[1], id: m[2], title: m[3], rest: m[4], idx: m.index });
}

function renderQueue(list) {
  if (!list.length) return queue;
  let out = '';
  let cursor = 0;
  for (const it of list) {
    out += queue.slice(cursor, it.idx);
    out += `- [${it.mark}] **板块 ${it.id} · ${it.title}**${it.rest}`;
    cursor = it.idx + `- [${it.mark}] **板块 ${it.id} · ${it.title}**${it.rest}`.length;
  }
  out += queue.slice(cursor);
  return out;
}

function setStatus(id, mark) {
  const it = items.find((x) => x.id === String(id));
  if (!it) { console.error(`找不到板块 ${id}`); process.exit(1); }
  it.mark = mark;
  writeFileSync(file, before + renderQueue(items) + after);
}

const arg = process.argv[2];
if (arg === '--done' || arg === '--pause') {
  const mark = arg === '--done' ? 'x' : '~';
  setStatus(process.argv[3], mark);
  const md2 = readFileSync(file, 'utf8');
  const logHead = '## 状态日志（每日追加一行）';
  const li = md2.indexOf(logHead);
  if (li >= 0) {
    const head2 = md2.slice(0, li + logHead.length);
    const restLines = md2.slice(li + logHead.length).replace(/^\n+/, '');
    const action = mark === 'x' ? '完成 ✅' : '进行中 [~]';
    const line = `\n- ${today} · 板块 ${process.argv[3]} ${action}（daily-advance）\n`;
    writeFileSync(file, head2 + line + '\n' + restLines);
  }
  console.log(`板块 ${process.argv[3]} → [${mark}]，状态日志已追加`);
} else {
  const inProgress = items.filter((x) => x.mark === '~');
  const pending = items.filter((x) => x.mark === ' ');
  const done = items.filter((x) => x.mark === 'x');
  if (arg === '--all') {
    for (const it of items) console.log(`[${it.mark}] 板块 ${it.id} · ${it.title}`);
    console.log(`\n共 ${items.length} 项：完成 ${done.length} / 进行 ${inProgress.length} / 待办 ${pending.length}`);
  } else if (inProgress.length) {
    console.log(`▶ 下一个板块（进行中，先续断点）：板块 ${inProgress[0].id} · ${inProgress[0].title}`);
    console.log(`  ${inProgress[0].rest.trim() || '(见 docs/ROADMAP.md)'}`);
  } else if (pending.length) {
    console.log(`▶ 下一个板块：板块 ${pending[0].id} · ${pending[0].title}`);
    console.log(`  ${pending[0].rest.trim() || '(见 docs/ROADMAP.md)'}`);
  } else {
    console.log('✔ 队列已清空 → 按协议自行扩充：联网搜 Material 3 / Android 最新特性 + 遗留问题盘点，补 3–5 个新板块后再推进一个。');
  }
}
