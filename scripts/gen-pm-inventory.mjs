// #276 postMessage 监听点全量盘点 v2（行级扫描+注释行跳过，grep 口径可复核）
// 三态: origin-guard / data-whitelist / bare（零校验曝光）
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOTS = ['ios-desktop', 'index.html', 'sw.js', 'launch.html'];
const LISTEN_RE = /addEventListener\(\s*['"]message['"]|\.onmessage\s*=/;

function* walkFiles(p) {
  const st = statSync(p);
  if (st.isFile()) { if (/\.(html|js|mjs)$/.test(p)) yield p; return; }
  for (const e of readdirSync(p)) {
    if (e === 'node_modules' || e === 'aosp') continue;
    yield* walkFiles(join(p, e));
  }
}

const entries = [];
for (const root of ROOTS) {
  for (const file of walkFiles(root)) {
    const text = readFileSync(file, 'utf8');
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const trimmed = raw.trim();
      if (LISTEN_RE.test(raw) && !trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('/*')) {
        // handler 窗口：起 30 行（跳过纯注释行）
        let win = '';
        for (let j = i; j < Math.min(i + 30, lines.length); j++) {
          const t2 = lines[j].trim();
          if (!t2.startsWith('//') && !t2.startsWith('*') && !t2.startsWith('/*')) win += lines[j] + '\n';
        }
        win = win.slice(0, 2400);
        const hasOrigin = /\w+\.origin\s*(?:===|!==|==|!=)/.test(win);
        const hasDataCheck = /\w+\.data\s*(?:\.|;|\)|&&|\?\.)/.test(win) && /(?:type|kind|cmd|action|channel)['"]?\s*(?:===|!==|==|!=|:)/.test(win);
        const hasSource = /\.source\s*(?:===|!==|==|!=)/.test(win);
        let cls = 'bare';
        if (hasOrigin) cls = 'origin-guard';
        else if (hasDataCheck) cls = 'data-whitelist';
        entries.push({
          file: relative('.', file), line: i + 1, cls,
          originCheck: hasOrigin, dataCheck: hasDataCheck, sourceCheck: hasSource,
          head: raw.trim().slice(0, 90),
        });
      }
    }
  }
}

// 发送面：行级注释跳过口径
let sendStar = 0, sendTotal = 0;
const sendStarFiles = [];
for (const root of ROOTS) {
  for (const file of walkFiles(root)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    for (const raw of lines) {
      const t = raw.trim();
      if (!/postMessage\(/.test(raw) || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) continue;
      sendTotal++;
      if (/postMessage\([^)]*,\s*['"]\*['"]\)/.test(raw)) { sendStar++; sendStarFiles.push(relative('.', file)); }
    }
  }
}

const tally = { 'origin-guard': 0, 'data-whitelist': 0, bare: 0 };
for (const e of entries) tally[e.cls]++;
const out = {
  generator: 'scripts/gen-pm-inventory.mjs（#276 机械盘点 v2·行级+注释跳过·零时间戳）',
  total_listeners: entries.length,
  tally,
  postMessage_send: { total_calls: sendTotal, targetOrigin_star: sendStar, targetOrigin_concrete: sendTotal - sendStar, star_files_note: 'vendor/jszip.min.js 2 处为第三方库内调用' },
  entries,
};
writeFileSync('docs/audits/postmessage-inventory.json', JSON.stringify(out, null, 2) + '\n');
console.log(`listeners=${entries.length} origin-guard=${tally['origin-guard']} data-whitelist=${tally['data-whitelist']} bare=${tally.bare}`);
console.log(`send: total=${sendTotal} star=${sendStar} concrete=${sendTotal - sendStar}`);
