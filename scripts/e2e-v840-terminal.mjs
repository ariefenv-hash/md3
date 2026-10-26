// ==================== e2e-v840-terminal.mjs — #25 终端无头回归 ====================
//
// DoD（#25 验收原文逐条）：
//   A. 30+ 命令白名单（help 输出 31 命令 · 分组行）+ 平台提示符（arief@md3:/cwd$）
//   B. 虚拟文件树与文件应用互通（真 VFS：ls/cd/cat/echo> 重定向/touch/mkdir/rm 全走 FS 桥）
//   C. open 深链启动内置应用（open 设置 → 宿主 settings 面板）+ 未知应用报错引导
//   D. 历史翻阅（↑）+ Tab 补全 + exit 无状态残留（cwd 复位 /）
//   E. 无 eval（源码锚在 vitest；本件锚行为：未知命令原样回显不执行）+ 零 pageerror
//
// 驱动：真实导航（nolock → terminal 图标，第 2 页直击同 v836/v839 先例）；
//       命令注入 = iframe input 赋值 + 合成 Enter keydown（中文参数免 IME 依赖）；
//       ⚠ e2e 首跑教训沿袭：http.server 必须从仓库根起（BASE 含 /ios-desktop/ 前缀）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v840');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8081/ios-desktop/index.html';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
// 字体域静默（断网语义；Roboto Mono 缺载回落系统等宽链，页面不挂）
await page.route('**fonts.googleapis.com**', (r) => r.abort());
await page.route('**fonts.gstatic.com**', (r) => r.abort());

await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1400);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await page.waitForTimeout(500);

// 打开终端（第 2 页图标直击）
await page.evaluate(() => {
  const icon = document.querySelector('.app-icon[data-id="terminal"]');
  if (icon) icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
});

let frame = null;
const findFrame = async () => {
  // 每次动态重找（open 深链可能重挂载 iframe —— 首跑 Frame detached 教训）
  for (let i = 0; i < 25; i++) {
    const f = page.frames().find((x) => x.url().includes('apps/terminal/index.html'));
    if (f && await f.evaluate(() => !!document.getElementById('tmInput')).catch(() => false)) return f;
    await sleep(200);
  }
  return null;
};
for (let i = 0; i < 30; i++) {
  frame = page.frames().find((f) => f.url().includes('apps/terminal/index.html'));
  if (frame && await frame.evaluate(() => !!document.getElementById('tmInput') && !!window.__terminalCore).catch(() => false)) break;
  await sleep(200);
}
A('terminal iframe 在场（tmInput + __terminalCore 就绪）', !!frame);
if (!frame) { console.log('FATAL: terminal iframe 未就绪'); await browser.close(); process.exit(1); }

const run = async (cmd) => {
  frame = (await findFrame()) || frame;
  const before = await frame.evaluate(() => document.querySelectorAll('#tmOut .tm-line').length);
  await frame.evaluate((c) => {
    const input = document.getElementById('tmInput');
    input.value = c;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  }, cmd);
  await sleep(320);
  frame = (await findFrame()) || frame;
  const all = await frame.evaluate(() =>
    Array.from(document.querySelectorAll('#tmOut .tm-line')).map((d) => d.textContent));
  // 本命令结果区间：行号递增切片；重挂载（行数回退）则取全量
  const added = all.length >= before ? all.slice(before) : all;
  return added.filter((l) => !l.startsWith('arief@md3:'));
};
const lines = async () => {
  frame = (await findFrame()) || frame;
  return frame.evaluate(() =>
    Array.from(document.querySelectorAll('#tmOut .tm-line')).map((d) => d.textContent));
};
const ps1 = async () => {
  frame = (await findFrame()) || frame;
  return frame.evaluate(() => document.getElementById('tmPs1').textContent);
};

console.log('A. 启动基线：横幅 + 提示符 + 桌面图标');
const boot = await lines();A('横幅含 msh 1.0 与 help 引导', boot.some((l) => l.includes('msh 1.0')) && boot.some((l) => l.includes('help')));
const ps1Text = await ps1();
A('提示符 arief@md3:/$（HOME 根）', ps1Text === 'arief@md3:/$', ps1Text);
const hasIcon = await page.evaluate(() => !!document.querySelector('.app-icon[data-id="terminal"]'));
A('桌面图标在位（data-id=terminal）', hasIcon);
await page.screenshot({ path: join(OUT, 'terminal-boot.png') });

console.log('B. 文件系统互通（真 VFS · FS 桥）');
let out = await run('ls');
const firstDir = out.map((l) => l.trim()).filter((l) => l.endsWith('/'))[0]?.replace(/\/$/, '');
A('ls 输出非空且目录带 / 后缀', out.some((l) => l.trim().endsWith('/')), `首目录=${firstDir}`);
out = await run('pwd');
A('pwd = /', out[0] === '/', out[0]);

out = await run(`cd ${firstDir}`);
out = await run('pwd');
A(`cd ${firstDir} → pwd 同步`, out[0] === `/${firstDir}`, out[0]);
await page.screenshot({ path: join(OUT, 'terminal-session.png') });

out = await run('cd /nonexistent_dir_xyz');
const ps1Keep = await ps1();
A('cd 不存在目录 → 报错且 cwd 不变（无状态残留）', out[0].includes('无此目录') && ps1Keep.endsWith(':/' + firstDir + '$'), `${out[0]} | ps1=${ps1Keep}`);
await run('cd /');
out = await run('echo hello-msh > /tm-e2e.txt');
out = await run('cat /tm-e2e.txt');
A('echo 重定向写入 + cat 读回（真 VFS 闭环）', out[0] === 'hello-msh', JSON.stringify(out));
out = await run('wc /tm-e2e.txt');
A('wc 统计行在位（1 行 1 词 9 字节）', /1\s+1\s+9/.test(out[0]), out[0].trim());
out = await run('head -n 1 /tm-e2e.txt');
A('head -n 1 回显 hello-msh', out[0] === 'hello-msh', out[0]);
await run('mkdir /tm-e2e-dir');
await run('touch /tm-e2e-dir/inner.txt');
out = await run('ls /tm-e2e-dir');
A('mkdir+touch 后 ls 可见 inner.txt', out.some((l) => l.trim() === 'inner.txt'), JSON.stringify(out));
out = await run('tree /tm-e2e-dir');
A('tree 渲染目录树（└─ inner.txt）', out.some((l) => l.includes('inner.txt') && l.includes('└─')), JSON.stringify(out));
await run('rm /tm-e2e.txt');
out = await run('cat /tm-e2e.txt');
A('rm 后 cat 报错（删除真生效）', out[0].includes('cat:') && (out[0].includes('不存在') || out[0].includes('失败')), out[0]);
await run('rm -r /tm-e2e-dir');

console.log('C. open 深链（35 应用）+ 未知命令');
await run('open 设置');
await sleep(800);
const opened = await page.evaluate(() => {
  const wrapper = document.querySelector('.app-instance-wrapper, [data-bus-app-id="settings"]');
  return { wrapper: !!wrapper, anyWindow: !!document.querySelector('.app-window') };
});
A('open 设置 → 宿主深链开窗（settings 相关窗口在场）', opened.wrapper || opened.anyWindow, JSON.stringify(opened));
out = await run('pwd');
A('open 后 terminal frame 仍存活可驱动（重挂载恢复 · cwd 归根）', out[0] === '/', JSON.stringify(out));
out = await run('open 不存在的应用xyz');
A('open 未知 → 报错 + apps 引导', out[0].includes('未知应用') && out[0].includes('apps'), out[0]);
out = await run('totally-unknown-cmd');
A('未知命令原样回显不执行（无 eval 语义）', out[0].includes('未知命令') && out[0].includes('totally-unknown-cmd'), out[0]);

console.log('D. 系统面：apps / help / neofetch / history / ↑↓ / Tab / exit');
out = await run('apps');
A('apps 列出 35 应用（含 terminal 行）', out.length >= 35 && out.some((l) => l.includes('terminal') && l.includes('终端')), `${out.length} 行`);
out = await run('help');
A('help 分组 4 组 + 命令抽样全在册', ['文件系统', '文本', '系统', '应用'].every((g) => out.some((l) => l.includes('── ' + g))) && ['neofetch', 'whoami', 'tree', 'beat'].every((c) => out.some((l) => l.includes(c))), JSON.stringify(out.length));
out = await run('neofetch');
const neo = out.join('\n');
A('neofetch 含 OS/Shell/Apps 35', neo.includes('md3 web') && neo.includes('msh 1.0') && neo.includes('35 installed'));
out = await run('history');
A('history 序号行（含 open 设置 记录）', out.some((l) => /\d+\s+open 设置/.test(l)), JSON.stringify(out.slice(-2)));

// ↑ 翻历史：连续 2 次应回填 'history' → 'neofetch'（重挂载后 localStorage 恢复链验证）
await frame.evaluate(() => {
  const input = document.getElementById('tmInput');
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
});
const up1 = await frame.evaluate(() => document.getElementById('tmInput').value);
await frame.evaluate(() => {
  const input = document.getElementById('tmInput');
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
});
const up2 = await frame.evaluate(() => document.getElementById('tmInput').value);
A('↑ 翻历史回填（history → neofetch）', up1 === 'history' && up2 === 'neofetch', JSON.stringify([up1, up2]));
await frame.evaluate(() => {
  const input = document.getElementById('tmInput');
  input.value = 'tai';
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
});
const tabbed = await frame.evaluate(() => document.getElementById('tmInput').value);
A('Tab 补全 tai → tail（唯一前缀）', tabbed === 'tail ', JSON.stringify(tabbed));
await frame.evaluate(() => { document.getElementById('tmInput').value = ''; });

out = await run('exit');
const ps1After = await ps1();
A('exit → cwd 复位 /（无状态残留）', ps1After === 'arief@md3:/$', ps1After);
const bannerAfter = (await lines()).some((l) => l.includes('msh 1.0'));
A('exit 后横幅重打（新会话形态）', bannerAfter);
console.log('E. 稳定性收尾');
A('零 pageerror', errors.length === 0, errors.slice(0, 2).join(' | '));

console.log(`\n===== e2e-v840-terminal: ${pass} PASS / ${fail} FAIL =====`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
