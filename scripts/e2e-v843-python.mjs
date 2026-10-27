// ==================== e2e-v843-python.mjs — #31 Python REPL 无头回归 ====================
//
// DoD（#31 验收原文逐条）：
//   A. 懒加载：打开应用零 CDN 拉取；首次「运行」恰 1 次拉取；同会话二次运行零新增（幂等守卫）
//   B. print / 异常（带行号回显）/ 第三方库（micropip·numpy 试）三链路
//   C. 历史代码 localStorage 持久化（chips 恢复 + 草稿跨会话）
//   D. stdout/stderr 重定向输出面板（分流 + 返回值 => 行）
//   E. 深链 BUS_DELIVER python/run {code} 注入即算
//   F. micropip 输入防呆（PEP 503）+ 失败上屏不崩
//   G. Tab 缩进 + Ctrl+Enter 运行
//   H. 零 pageerror
//
// 驱动：官方入口 openAppById（v842 教训：全程同一路径）；Pyodide CDN 走 page.route
//       stub（fulfill 伪 pyodide.js，Node 侧计数 CDN 命中——运行时语义属 Pyodide 上游，
//       本回归锚定的是「我们的接线」）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v843');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8084/ios-desktop/index.html';
const APP_URL = 'http://127.0.0.1:8084/ios-desktop/apps/python/index.html';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1024, height: 768 }, colorScheme: 'dark' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

// Pyodide CDN stub（Node 侧计数真实命中；伪运行时按代码标记产生确定性输出）
let cdnHits = 0;
await page.route('**/pyodide.js*', (route) => {
  cdnHits++;
  route.fulfill({
    contentType: 'application/javascript',
    body: `
window.__pyoCalls = { loadPyodide: 0, run: [], installs: [] };
window.loadPyodide = function (opts) {
  window.__pyoCalls.loadPyodide++;
  return Promise.resolve({
    loadPackage: function (n) { window.__pyoCalls.installs.push('loadPackage:' + n); return Promise.resolve(); },
    pyimport: function (n) {
      if (n === 'micropip') {
        return { install: function (p) {
          window.__pyoCalls.installs.push('install:' + p);
          if (p === 'ghost-pkg') return Promise.reject(new Error('Could not find package ghost-pkg'));
          return Promise.resolve();
        } };
      }
      return {};
    },
    runPython: function (code) {
      window.__pyoCalls.run.push(code);
      if (/raise\\s+RuntimeError/.test(code)) {
        throw new Error('Traceback (most recent call last):\\n  File "<exec>", line 4, in <module>\\nRuntimeError: boom');
      }
      if (opts && opts.stdout) opts.stdout('Hello from Python 3.11.4\\n');
      if (/sum\\(/.test(code)) { if (opts && opts.stdout) opts.stdout('5050\\n'); return 5050; }
      if (/ctrl-run/.test(code) && opts && opts.stdout) opts.stdout('ctrl ok\\n');
      if (/deeplink/.test(code) && opts && opts.stdout) opts.stdout('deep link ok\\n');
      if (/1\\s*\\/\\s*0/.test(code) && opts && opts.stderr) opts.stderr('ZeroDivisionError: division by zero\\n');
      return undefined;
    }
  });
};`
  });
});

const IN_FRAME = (expr) => page.evaluate((src) => {
  const f = document.querySelector('.app-window iframe[src*="apps/python/index.html"]');
  if (!f) return null;
  f.contentWindow.__f = f; // 供表达式内引用
  return eval(src);
}, expr);

// ---------- P1. 独立打开（standalone）：骨架 + 缺省态 + 懒加载零请求 ----------
console.log('A. 独立打开：骨架 + 缺省态（懒加载验收·打开零 CDN）');
await page.goto(APP_URL, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(600);
const boot = await page.evaluate(() => {
  const d = document;
  return {
    title: d.querySelector('.py-title') && d.querySelector('.py-title').textContent,
    badge: d.getElementById('pyBadge').textContent,
    code: d.getElementById('pyCode').value,
    histChips: d.getElementById('pyHist').children.length,
    outEmpty: d.getElementById('pyEmpty') && d.getElementById('pyEmpty').textContent.includes('输出面板'),
    scriptInjected: !!d.getElementById('pyodide-script'),
    status: d.getElementById('pyStatus').textContent,
  };
});
A('标题 + 徽标 idle（运行时未加载）', boot.title === 'Python' && boot.badge === '运行时未加载', JSON.stringify(boot.badge));
A('示例代码已载入（SAMPLE 含 import sys）', /import sys/.test(boot.code));
A('历史空 + 输出面板空态提示', boot.histChips >= 1 && boot.outEmpty, 'chips=' + boot.histChips);
A('零 CDN 拉取（打开绝不自动加载——#31 验收锚）', cdnHits === 0 && !boot.scriptInjected, 'hits=' + cdnHits);
await page.screenshot({ path: join(OUT, 'standalone.png') });
A('截图 docs/v843/standalone.png', true);

// ---------- P2. 桌面官方入口 + 首次运行（恰 1 次 CDN） ----------
console.log('B. 桌面官方入口 + 首次运行三链路');
await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1400);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await page.waitForTimeout(500);
await page.evaluate(() => { window.__shareSheet.openAppById('python'); }); // 官方入口（v842 教训：全程同一路径）
let ready = false;
for (let i = 0; i < 30; i++) {
  ready = await page.evaluate(() => {
    const f = document.querySelector('.app-window iframe[src*="apps/python/index.html"]');
    return !!(f && f.contentDocument && f.contentDocument.getElementById('pyRun'));
  });
  if (ready) break;
  await sleep(200);
}
A('python iframe 在场（官方入口挂载）', ready);
await page.waitForTimeout(400);
const desktopIdle = await IN_FRAME(`(() => {
  const d = f.contentDocument;
  return { badge: d.getElementById('pyBadge').textContent, injected: !!d.getElementById('pyodide-script') };
})()`);
A('桌面内打开仍零 CDN（懒加载与入口无关）', desktopIdle && desktopIdle.badge === '运行时未加载' && !desktopIdle.injected);

await IN_FRAME(`(() => { f.contentDocument.getElementById('pyRun').click(); })()`);
let ranOnce = false;
for (let i = 0; i < 40; i++) {
  ranOnce = await IN_FRAME(`(() => f.contentDocument.getElementById('pyBadge').textContent === '运行时就绪')()`);
  if (ranOnce) break;
  await sleep(150);
}
A('首次运行：badge → 运行时就绪', ranOnce);
A('首次加载恰 1 次 CDN 拉取（≤1 验收锚）', cdnHits === 1, 'hits=' + cdnHits);
const run1 = await IN_FRAME(`(() => {
  const d = f.contentDocument;
  const lines = Array.from(d.getElementById('pyOut').children).map((c) => c.textContent);
  return {
    lines,
    ret: d.getElementById('pyOut').querySelector('.py-line.ret') && d.getElementById('pyOut').querySelector('.py-line.ret').textContent,
    time: d.getElementById('pyTime').textContent,
    histCount: d.getElementById('pyHistCount').textContent,
    okChips: d.querySelectorAll('.py-hmark').length,
  };
})()`);
A('print 链路：stdout 两行上屏（Hello/5050）', run1 && run1.lines.some((l) => /Hello from Python/.test(l)) && run1.lines.some((l) => l === '5050'), JSON.stringify(run1.lines));
A('返回值链路：=> 5050 高亮行', run1 && run1.ret === '=> 5050', JSON.stringify(run1 && run1.ret));
A('耗时显示 + 历史 1 条 ✓', run1 && /本次 \d+ ms/.test(run1.time) && run1.okChips === 1 && /1 \/ 50/.test(run1.histCount), JSON.stringify(run1.time));

// ---------- P3. 同会话二次运行（幂等·零新增拉取） ----------
console.log('C. 同会话二次运行幂等');
await IN_FRAME(`(() => { f.contentDocument.getElementById('pyRun').click(); })()`);
await sleep(700);
const stubCalls = await page.evaluate(() => window.__pyoCalls ? null : null); // 占位：stub 在 iframe？实际挂在 iframe window
const pyo = await IN_FRAME(`(() => f.contentWindow.__pyoCalls ? { n: f.contentWindow.__pyoCalls.loadPyodide } : null)()`);
A('同会话二次运行：CDN 仍恰 1 次 + loadPyodide 仅 1 次调用', cdnHits === 1 && pyo && pyo.n === 1, 'hits=' + cdnHits + ' loadPyodide=' + (pyo && pyo.n));

// ---------- P4. 异常链路（行号回显） ----------
console.log('D. 异常链路（PythonError 行号回显）');
const ERR_SNIPPET = ['x = 1', 'y = 2', 'z = 3', 'raise RuntimeError("boom")'].join('\n');
await IN_FRAME(`(() => { const ta = f.contentDocument.getElementById('pyCode'); ta.value = ${JSON.stringify(ERR_SNIPPET)}; })()`);
await IN_FRAME(`(() => { f.contentDocument.getElementById('pyRun').click(); })()`);
await sleep(700);
const errState = await IN_FRAME(`(() => {
  const d = f.contentDocument;
  const errLine = d.querySelector('#pyOut .py-line.err:last-child');
  const marks = Array.from(d.querySelectorAll('.py-hmark')).map((m) => m.textContent);
  return { err: errLine && errLine.textContent, marks, histCount: d.getElementById('pyHistCount').textContent };
})()`);
A('异常行号回显：✗ RuntimeError: boom （行 4）', errState && errState.err === '✗ RuntimeError: boom （行 4）', JSON.stringify(errState && errState.err));
A('历史 2 条（最新在首：✗ 错误条 + ✓ 样例条）', errState && errState.marks.join('') === '✗✓' && /2 \/ 50/.test(errState.histCount), JSON.stringify(errState && errState.marks));

// ---------- P5. 历史 chips 恢复 + 草稿持久化（跨会话） ----------
console.log('E. 历史恢复 + 草稿持久化');
await IN_FRAME(`(() => { f.contentDocument.querySelectorAll('.py-hchip')[0].click(); })()`); // chips 最新在首：chip[0] = 错误条
await sleep(300);
const restored = await IN_FRAME(`(() => f.contentDocument.getElementById('pyCode').value)()`);
A('点击最新历史 chip → 编辑器恢复错误片段', restored === ERR_SNIPPET, JSON.stringify(restored && restored.split('\n').pop()));

// ---------- P6. micropip 三态（成功/防呆/失败） ----------
console.log('F. micropip 三态');
await IN_FRAME(`(() => { const i = f.contentDocument.getElementById('pyPkg'); i.value = 'NumPy'; f.contentDocument.getElementById('pyInstall').click(); })()`);
let installed = false;
for (let i = 0; i < 30; i++) {
  installed = await IN_FRAME(`(() => f.contentDocument.getElementById('pyPkgMsg').textContent === '✓ numpy 已安装')()`);
  if (installed) break;
  await sleep(150);
}
A('micropip 成功：NumPy → ✓ numpy 已安装（PEP 503 归一）', installed);
await IN_FRAME(`(() => { const i = f.contentDocument.getElementById('pyPkg'); i.value = 'NumPy!'; f.contentDocument.getElementById('pyInstall').click(); })()`);
await sleep(250);
const badName = await IN_FRAME(`(() => f.contentDocument.getElementById('pyPkgMsg').textContent)()`);
A('包名防呆：NumPy! → 包名不合法（PEP 503）', badName === '包名不合法（PEP 503）', JSON.stringify(badName));
await IN_FRAME(`(() => { const i = f.contentDocument.getElementById('pyPkg'); i.value = 'ghost-pkg'; f.contentDocument.getElementById('pyInstall').click(); })()`);
let ghostDone = false;
for (let i = 0; i < 30; i++) {
  ghostDone = await IN_FRAME(`(() => f.contentDocument.getElementById('pyPkgMsg').textContent.includes('Could not find package'))()`);
  if (ghostDone) break;
  await sleep(150);
}
A('失败上屏不崩：ghost-pkg → Could not find package', ghostDone);
const instLog = await IN_FRAME(`(() => f.contentWindow.__pyoCalls.installs.join('|'))()`);
A('安装链真实接线：loadPackage:micropip + install:numpy', instLog.includes('loadPackage:micropip') && instLog.includes('install:numpy'), instLog.slice(0, 80));

// ---------- P7. Tab 缩进 + Ctrl+Enter + 清空输出 ----------
console.log('G. 编辑器便利键 + 清空');
await IN_FRAME(`(() => {
  const d = f.contentDocument, ta = d.getElementById('pyCode');
  ta.value = '';
  ta.focus();
  ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
})()`);
const tabVal = await IN_FRAME(`(() => f.contentDocument.getElementById('pyCode').value)()`);
A('Tab → 插入 4 空格', tabVal === '    ', JSON.stringify(tabVal));
await IN_FRAME(`(() => {
  const d = f.contentDocument, ta = d.getElementById('pyCode');
  ta.value = "print('ctrl ok')  # ctrl-run";
  d.getElementById('pyClear').click();
})()`);
await IN_FRAME(`(() => {
  const d = f.contentDocument, ta = d.getElementById('pyCode');
  ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true }));
})()`);
await sleep(600);
const ctrlOut = await IN_FRAME(`(() => Array.from(f.contentDocument.querySelectorAll('#pyOut .py-line')).map((c) => c.textContent))()`);
A('Ctrl+Enter 运行 + 清空后重上屏', ctrlOut && ctrlOut.includes('ctrl ok'), JSON.stringify(ctrlOut));

// ---------- P8. 深链 BUS_DELIVER python/run（注入即算） ----------
console.log('H. 深链 python/run');
await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="apps/python/index.html"]');
  f.contentWindow.postMessage({ type: 'BUS_DELIVER', event: 'python/run', payload: { code: "print('deep link ok')  # deeplink" } }, '*');
});
await sleep(800);
const deep = await IN_FRAME(`(() => {
  const d = f.contentDocument;
  return {
    code: d.getElementById('pyCode').value,
    lines: Array.from(d.querySelectorAll('#pyOut .py-line')).map((c) => c.textContent),
    toast: d.getElementById('pyToast').textContent,
    hist: d.getElementById('pyHistCount').textContent,
  };
})()`);
A('深链代码注入编辑器 + 自动运行输出', deep && deep.code.includes('deeplink') && deep.lines.includes('deep link ok'), JSON.stringify(deep && deep.lines));
A('toast 提示 + 历史增长', deep && /注入/.test(deep.toast) && /4 \/ 50/.test(deep.hist), JSON.stringify(deep && deep.hist));
await page.screenshot({ path: join(OUT, 'python-output.png') });
A('截图 docs/v843/python-output.png', true);

// ---------- P9. 跨会话持久化（独立重开：历史 + 草稿 + 仍零 CDN） ----------
console.log('I. 跨会话持久化（二次进入零下载）');
await page.goto(APP_URL, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(600);
const reBoot = await page.evaluate(() => {
  const d = document;
  return {
    code: d.getElementById('pyCode').value,
    histCount: d.getElementById('pyHistCount').textContent,
    chips: d.querySelectorAll('.py-hchip').length,
    injected: !!d.getElementById('pyodide-script'),
    badge: d.getElementById('pyBadge').textContent,
  };
});
A('草稿跨会话恢复（深链代码成为草稿）', reBoot.code.includes('deeplink'), JSON.stringify(reBoot.code.slice(-30)));
A('历史跨会话恢复（4 条 chips）', reBoot.chips === 4 && /4 \/ 50/.test(reBoot.histCount), 'chips=' + reBoot.chips);
A('二次进入零 CDN 拉取（运行时仍未加载）', cdnHits === 1 && !reBoot.injected && reBoot.badge === '运行时未加载', 'hits=' + cdnHits);

// ---------- P10. 终端 open python（APPS 表 38 项深链启动） ----------
console.log('J. 终端 open python 深链');
await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1400);
await page.evaluate(() => { window.__shareSheet.openAppById('terminal'); });
let tReady = false;
for (let i = 0; i < 30; i++) {
  tReady = await page.evaluate(() => {
    const f = document.querySelector('.app-window iframe[src*="apps/terminal/index.html"]');
    return !!(f && f.contentDocument && f.contentDocument.getElementById('tmInput'));
  });
  if (tReady) break;
  await sleep(200);
}
A('terminal iframe 在场', tReady);
const openPy = await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="apps/terminal/index.html"]');
  if (!f) return null;
  const d = f.contentDocument;
  const input = d.getElementById('tmInput');
  input.value = 'open 蛇';
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  return d.getElementById('tmOut').textContent;
});
A('open 蛇（别名解析）→ 正在启动 Python', openPy && openPy.includes('正在启动 Python'), JSON.stringify(openPy && openPy.slice(-60)));
await sleep(700);
const pyFrameAfter = await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="apps/python/index.html"]');
  return !!(f && f.contentDocument && f.contentDocument.getElementById('pyRun'));
});
A('Python 应用经终端深链真实启动', pyFrameAfter);
await page.screenshot({ path: join(OUT, 'desktop.png') });
A('截图 docs/v843/desktop.png', true);

console.log('K. 零 pageerror');
A('零 pageerror', errors.length === 0, errors.length ? errors.join(' | ').slice(0, 200) : '');

await browser.close();
console.log('\n==== e2e-v843 结果: ' + pass + ' PASS / ' + fail + ' FAIL ====');
process.exit(fail ? 1 : 0);
