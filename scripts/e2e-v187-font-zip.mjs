// ==================== e2e-v187-font-zip.mjs — #187 zip 多字重字体包 行为真跑（v9.51） ====================
// 宿主桌面全链路（真 zip 字节 → fontInput → wallpaper.js 解包 → IDB → 恢复 → UI 清除）：
// Q1 zip 导入：manifest 显式声明压过文件名推断（600 命中 SemiBold 文件）→ 3 档 @font-face
//    （400/600/700，含 italic）+ IDB {__multi,files×3} + localStorage fontName + font-changed 事件
// Q2 reload 恢复：restoreFont 双形态 __multi 分支 → 样式重注入 3 face
// Q3 单文件字重推断：X-Bold.ttf → 单 face font-weight:700（100–900 全距不再出现）
// Q4 设置 UI 清除：设置 → 壁纸与样式 → 字体区状态行/恢复默认 → 样式摘除 + IDB 全清 + 状态行回「系统默认」
// Q5 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8955;
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- 造 zip fixture：MyFont 包（manifest 把 SemiBold 显式声明为 610 压过文件名推断） ----------
const JSZip = (await import(join(root, 'ios-desktop/apps/_shared/vendor/jszip.min.js'))).default || globalThis.JSZip;
const zip = new JSZip();
zip.file('MyFont-Regular.ttf', 'FAKE-TTF-REGULAR-' + 'A'.repeat(2048));
zip.file('weights/MyFont-SemiBold.ttf', 'FAKE-TTF-SEMIBOLD-' + 'B'.repeat(2048));
zip.file('weights/MyFont-Bold.ttf', 'FAKE-TTF-BOLD-' + 'C'.repeat(2048));
zip.file('__MACOSX/junk.ttf', 'SHOULD-BE-SKIPPED');
zip.file('notes.txt', 'not a font');
zip.file('manifest.json', JSON.stringify({
  family: 'MyFont',
  files: [{ path: 'weights/MyFont-SemiBold.ttf', weight: 610 }],
}));
const zipPath = join(mkdtempSync(join(tmpdir(), 'md3-e2e-')), 'MyFont.zip');
writeFileSync(zipPath, await zip.generateAsync({ type: 'nodebuffer' }));
// 单文件 fixture（文件名推断 700）
const ttfPath = join(dirname(zipPath), 'X-Bold.ttf');
writeFileSync(ttfPath, 'FAKE-TTF-BOLD-' + 'D'.repeat(2048));

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());   // 外域断网（e2e 惯例）

try {
  // 捕获 font-changed 事件（初始化前注入监听）
  await page.addInitScript(() => {
    window.__fontChangedLog = [];
    window.addEventListener('font-changed', (e) => window.__fontChangedLog.push(e.detail));
  });

  // Q1 zip 导入
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${BASE}/ios-desktop/index.html`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500); // 桌面启动（service worker 注册等）
  await page.setInputFiles('#fontInput', zipPath);
  await sleep(1500); // JSZip 懒加载 + 解包 + IDB 落库
  const q1 = await page.evaluate(() => {
    const el = document.getElementById('custom-font-style');
    const css = el ? el.textContent : '';
    const faces = (css.match(/@font-face/g) || []).length;
    return {
      hasStyle: !!el,
      faces,
      w400: /font-weight: 400;/.test(css),
      w610: /font-weight: 610;/.test(css),
      w700: /font-weight: 700;/.test(css),
      italic: /font-style: italic;/.test(css) === false, // 包内无 italic 文件 → 不应有 italic face
      family: css.includes("font-family: 'MyFont'"),
      rootVar: css.includes("--custom-user-font: 'MyFont'"),
      events: window.__fontChangedLog,
    };
  });
  const q1idb = await page.evaluate(async () => new Promise((res) => {
    const req = indexedDB.open('ios-desktop-files');
    req.onsuccess = () => {
      const db = req.result;
      try {
        const tx = db.transaction('kv', 'readonly');
        const g = tx.objectStore('kv').get('font-blob');
        g.onsuccess = () => {
          const v = g.result;
          res({ multi: !!(v && v.__multi), n: v && v.files ? v.files.length : 0, w: v && v.files ? v.files.map((f) => f.weight).sort((a, b) => a - b) : [] });
        };
        g.onerror = () => res({ multi: false, n: 0, w: [] });
      } catch (e) { res({ multi: false, n: 0, w: [], err: String(e) }); }
    };
    req.onerror = () => res({ multi: false, n: 0, w: [], err: 'idb open fail' });
  }));
  const q1ls = await page.evaluate(() => localStorage.getItem('ios-desktop:font-name'));
  A('Q1 zip 导入：3 档 face（400/610/700）+ 族名接线 + font-changed 广播',
    q1.hasStyle && q1.faces === 3 && q1.w400 && q1.w610 && q1.w700 && q1.italic && q1.family && q1.rootVar
      && Array.isArray(q1.events) && q1.events.some((e) => e && e.name === 'MyFont' && e.count === 3),
    `faces=${q1.faces} w400=${q1.w400} w610=${q1.w610} w700=${q1.w700}`);
  A('Q1 IDB 既有域结构化记录 {__multi,×3}（manifest 610 压过文件名推断）+ localStorage 字体名',
    q1idb.multi && q1idb.n === 3 && String(q1idb.w) === '400,610,700' && q1ls === 'MyFont',
    `idb=${JSON.stringify(q1idb)} ls=${q1ls}`);

  // Q2 reload 恢复
  await page.reload({ waitUntil: 'load' });
  await sleep(2000);
  const q2 = await page.evaluate(() => {
    const css = document.getElementById('custom-font-style')?.textContent || '';
    return { faces: (css.match(/@font-face/g) || []).length, w610: /font-weight: 610;/.test(css), family: css.includes("'MyFont'") };
  });
  A('Q2 reload 恢复：__multi 分支重注入 3 face（含 manifest 档 610）',
    q2.faces === 3 && q2.w610 && q2.family, `faces=${q2.faces} w610=${q2.w610}`);

  // Q3 单文件字重推断（覆盖 zip 记录：IDB 换新 Blob 形态）
  await page.setInputFiles('#fontInput', ttfPath);
  await sleep(1200);
  const q3 = await page.evaluate(() => {
    const css = document.getElementById('custom-font-style')?.textContent || '';
    return {
      faces: (css.match(/@font-face/g) || []).length,
      w700: /font-weight: 700;/.test(css),
      range: /font-weight: 100 900;/.test(css),
      family: css.includes("'X-Bold'"),
    };
  });
  A('Q3 单文件推断：X-Bold.ttf → 单 face font-weight:700（非全距）+ 族名去扩展名',
    q3.faces === 1 && q3.w700 && !q3.range && q3.family, `faces=${q3.faces} w700=${q3.w700} range=${q3.range}`);

  // Q4 设置 UI：壁纸与样式子页字体区（右键桌面 → 壁纸与样式 → 状态行 + 恢复默认）
  // 走生产暴露的真函数 openThemePicker（设置应用 + 壁纸与样式子页），与用户路径等价
  let uiOpened = false;
  try { await page.evaluate(() => window.openThemePicker()); uiOpened = true; } catch (e) { uiOpened = false; }
  await sleep(2200); // 设置应用开 + 子页推入
  const q4sub = await page.evaluate(() => {
    const sub = document.querySelector('#setFontSub');
    const clear = document.querySelector('#setFontClearBtn');
    return {
      section: !!document.querySelector('[data-test="font-section"]'),
      sub: sub ? sub.textContent : '',
      clearVisible: clear ? clear.style.display !== 'none' : false,
    };
  });
  A('Q4 设置子页字体区：状态行「X-Bold · 700」+ 恢复默认按钮可见',
    q4sub.section && /X-Bold/.test(q4sub.sub) && q4sub.clearVisible,
    `section=${q4sub.section} sub=${JSON.stringify(q4sub.sub)} clear=${q4sub.clearVisible}`);
  if (uiOpened && q4sub.section) {
    await page.evaluate(() => { const b = document.querySelector('#setFontClearBtn'); if (b) b.scrollIntoView({ block: 'center' }); b.click(); });
    await sleep(1200);
    const q4clear = await page.evaluate(() => ({
      styleGone: !document.getElementById('custom-font-style'),
      sub: document.querySelector('#setFontSub')?.textContent || '',
      clearHidden: document.querySelector('#setFontClearBtn')?.style.display === 'none',
    }));
    const q4idb = await page.evaluate(async () => new Promise((res) => {
      const req = indexedDB.open('ios-desktop-files');
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction('kv', 'readonly');
          const g = tx.objectStore('kv').get('font-blob');
          g.onsuccess = () => res({ gone: !g.result });
          g.onerror = () => res({ gone: true });
        } catch (e) { res({ gone: true, err: String(e) }); }
      };
      req.onerror = () => res({ gone: true, err: 'idb open fail' });
    }));
    A('Q4 恢复默认：样式摘除 + IDB 全清 + 状态行回「系统默认」+ 按钮隐藏',
      q4clear.styleGone && q4clear.sub.includes('系统默认') && q4clear.clearHidden && q4idb.gone,
      `styleGone=${q4clear.styleGone} sub=${JSON.stringify(q4clear.sub)} idbGone=${q4idb.gone}`);
  } else {
    A('Q4 恢复默认：样式摘除 + IDB 全清 + 状态行回「系统默认」+ 按钮隐藏', false, 'UI 未打开（菜单/子页导航失败）');
  }

  // Q5 全程零 pageerror
  A('Q5 全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  A('e2e 流程异常终止', false, String(e).slice(0, 200));
} finally {
  await browser.close();
  server.kill();
}

const failed = results.filter((r) => !r[0]);
console.log(`\n==== e2e-v187-font-zip: ${results.length - failed.length}/${results.length} passed ====`);
process.exit(failed.length ? 1 : 0);
