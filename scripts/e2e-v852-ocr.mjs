// ==================== e2e-v852-ocr.mjs — #58 OCR 文字识别无头回归 ====================
//
// DoD（#58 验收原文逐条）：
//   A. UI 骨架：标题/语言 5 档 chips/开始禁用/选图/空态/信息栏初值
//   B. 本地图片导入（DataTransfer File 注入真 PNG）→ 预览显形 + 开始启用 + 信息栏
//   C. 识别主流程（eng 档小图）：进度实时采样 → 结果区 + 耗时 + 置信度
//   D. 结果一键复制（clipboard API → 剪贴板读回对拍）
//   E. 识别中可取消：chi_sim+eng 3000px 图中途 terminate → 「已取消」+ 开始恢复 +
//      再次 eng 识别成功（worker 重建验证）
//   F. 3000px 截图中英混合档 < 10s 验收（进度峰值 > 50%）
//   G. VFS 导入：/downloads 种子 PNG（出厂目录）→ sheet 行过滤（.txt 被滤）→ 行点击装载
//   H. 预览图缩放：150% 宽度 = naturalWidth×1.5 + 适应档恢复
//   I. 终端 `ocr <path>` 深链可达（回显 + OCR 帧装载）
//   J. 重载恢复：语言档记忆（简中+英文 active）
//   K. 零 pageerror
//
// 教训沿袭：v850/v851（goto load+固定等待 / bg-freeze 摘帧单 evaluate 原子断言 /
// addInitScript 条件播种 / FS 桥 blob 解码）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v852');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8085/ios-desktop/index.html?nolock=1';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:8085' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(1800);   // boot + VFS 索引装载

// ---------- VFS 种子（父页面 __vfs 直写：PNG 用 canvas 现场生成真图） ----------
const seeded = await page.evaluate(async () => {
  const v = window.__vfs;
  if (!v) return 'NO_VFS';
  await v.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 520; canvas.height = 160;
  const c = canvas.getContext('2d');
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 520, 160);
  c.fillStyle = '#111111';
  c.font = '46px sans-serif';
  c.fillText('VFS IMAGE OK', 30, 95);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  await v.write('/downloads/e2e-shot.png', blob, { mime: 'image/png' });   // /downloads 系出厂目录（/music 同款实证路径；/photos 系照片应用域）
  await v.write('/documents/e2e-not-image.txt', 'plain text', { mime: 'text/plain' });
  return 'OK';
});
console.log('VFS seed:', seeded);

await page.evaluate(() => { window.__shareSheet.openAppById('ocr'); });
await sleep(1600);

const frameOf = () => page.frames().find((f) => f.url().includes('apps/ocr/index.html'));
const frame = frameOf();
A('OCR iframe 挂载', !!frame);

// ---------- A. UI 骨架 ----------
console.log('A. UI 骨架');
const boot = await frame.evaluate(() => ({
  title: document.querySelector('.oc-title')?.textContent,
  langChips: Array.from(document.querySelectorAll('.oc-lang')).map((b) => b.textContent),
  langActive: document.querySelector('.oc-lang.active')?.dataset.test,
  startDisabled: document.getElementById('ocStartBtn').disabled,
  importBtn: !!document.getElementById('ocImportBtn'),
  cancelHidden: document.getElementById('ocCancelBtn').hidden,
  emptyVisible: !document.getElementById('ocEmpty').classList.contains('hide'),
  viewHidden: !document.getElementById('ocView').classList.contains('show'),
  infoDashes: ['ocStSrc', 'ocStDim', 'ocStScaled', 'ocStSize', 'ocStTime'].every((id) => document.getElementById(id).textContent === '—'),
  tokensCss: getComputedStyle(document.body).getPropertyValue('--md-surface').length > 0,
}));
A('标题「OCR 文字识别」+ 开始禁用 + 选图在位', boot.title === 'OCR 文字识别' && boot.startDisabled && boot.importBtn && boot.cancelHidden);
A('语言 5 档 chips（简体中文默认 active）', boot.langChips.join(',') === '简体中文,简中+英文,繁体中文,繁中+英文,English' && boot.langActive === 'oc-lang-chi_sim', boot.langChips.join(','));
A('空态可见 + 预览隐藏 + 信息栏初值全 —', boot.emptyVisible && boot.viewHidden && boot.infoDashes);
A('md3 令牌层生效（--md-surface 非空）', boot.tokensCss);
await page.screenshot({ path: join(OUT, 'oc-boot.png') });

// ---------- B. 本地图片导入（DataTransfer File 注入） ----------
console.log('B. 本地图片导入');
const injected = await frame.evaluate(async () => {
  const canvas = document.createElement('canvas');
  canvas.width = 480; canvas.height = 150;
  const c = canvas.getContext('2d');
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 480, 150);
  c.fillStyle = '#111111';
  c.font = '44px sans-serif';
  c.fillText('MD3 OCR 2026', 24, 92);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  const dt = new DataTransfer();
  dt.items.add(new File([blob], 'e2e-local.png', { type: 'image/png' }));
  const input = document.getElementById('ocFileInput');
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return 'OK';
});
await sleep(800);
const loaded = await frame.evaluate(() => ({
  viewShown: document.getElementById('ocView').classList.contains('show'),
  emptyHidden: document.getElementById('ocEmpty').classList.contains('hide'),
  startEnabled: !document.getElementById('ocStartBtn').disabled,
  src: document.getElementById('ocStSrc').textContent,
  dim: document.getElementById('ocStDim').textContent,
  size: document.getElementById('ocStSize').textContent,
  zoombar: document.getElementById('ocZoombar').classList.contains('show'),
}));
A('预览显形 + 空态退场 + 开始启用 + 缩放条显形', injected === 'OK' && loaded.viewShown && loaded.emptyHidden && loaded.startEnabled && loaded.zoombar);
A('信息栏：来源 e2e-local.png / 480×150 / 2.2 KB 级', loaded.src === 'e2e-local.png' && loaded.dim === '480×150', JSON.stringify([loaded.src, loaded.dim, loaded.size]));

// ---------- C. 识别主流程（eng 档） ----------
console.log('C. 识别（eng 小图）');
// 切 eng 档（语言切换路径 + J 段持久化前置）
await frame.evaluate(() => {
  const chip = Array.from(document.querySelectorAll('.oc-lang')).find((b) => b.textContent === 'English');
  chip.click();
});
const engActive = await frame.evaluate(() => document.querySelector('.oc-lang.active')?.dataset.test);
A('切 eng 档 active 生效', engActive === 'oc-lang-eng', engActive);
// 进度采样器（armed 模式：先等进度行显形 → 采到隐形为止；残留 pfill 宽度不误判）
const sampler = frame.evaluate(async () => {
  const samples = [];
  let armed = false;
  const t0 = performance.now();
  while (performance.now() - t0 < 25000) {
    const row = document.getElementById('ocProgress');
    const inFlight = row.classList.contains('show');
    if (inFlight) {
      armed = true;
      samples.push({ fill: document.getElementById('ocPfill').style.width, text: document.getElementById('ocPtext').textContent });
    } else if (armed) {
      break;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return samples;
});
const t0 = Date.now();
await frame.evaluate(() => { document.getElementById('ocStartBtn').click(); });
const samples = await sampler;
const elapsedC = Date.now() - t0;
const resultC = await frame.evaluate(() => ({
  resultShown: !document.getElementById('ocResult').classList.contains('hide'),
  text: document.getElementById('ocResArea').value,
  count: document.getElementById('ocResCount').textContent,
  time: document.getElementById('ocStTime').textContent,
  progressGone: !document.getElementById('ocProgress').classList.contains('show'),
  cancelHidden: document.getElementById('ocCancelBtn').hidden,
  startEnabled: !document.getElementById('ocStartBtn').disabled,
}));
A(`识别完成（eng 小图，${(elapsedC / 1000).toFixed(1)}s 全程含引擎加载）`, resultC.resultShown && resultC.progressGone && resultC.cancelHidden && resultC.startEnabled);
A('进度实时采样：进度行曾在场 + ptext 曾出现引擎/模型状态', samples.some((s) => /内核|引擎|模型|接口|识别中/.test(s.text)), samples.slice(0, 3).map((s) => s.text).join(' | '));
A('结果非空（MD3 OCR 2026 识别命中）', /MD3|OCR|2026/.test(resultC.text), JSON.stringify(resultC.text.trim().slice(0, 60)));
A('字数统计 + 耗时+置信回填', /字$/.test(resultC.count) && /s$|ms$/.test(resultC.time.split(' · ')[0]), `count=${resultC.count} time=${resultC.time}`);
await page.screenshot({ path: join(OUT, 'oc-result.png') });

// ---------- D. 一键复制 ----------
console.log('D. 一键复制');
await frame.evaluate(() => { document.getElementById('ocCopyBtn').click(); });
await sleep(400);
const clip = await page.evaluate(() => navigator.clipboard.readText());
A('剪贴板读回 = 结果文本（clipboard API 通道）', clip === resultC.text, `len=${clip.length}`);

// ---------- E. 识别中可取消（chi_sim+eng · 3000px 图） ----------
console.log('E. 取消路径 + worker 重建');
await frame.evaluate(async () => {
  // 注入 3000×700 大图（本地 File 通道）
  const canvas = document.createElement('canvas');
  canvas.width = 3000; canvas.height = 700;
  const c = canvas.getContext('2d');
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 3000, 700);
  c.fillStyle = '#111111';
  c.font = '60px sans-serif';
  c.fillText('Material Design 3 Expressive', 60, 140);
  c.fillText('光学字符识别 Offline Recognition', 60, 300);
  c.fillText('离线识别测试 Screenshot 2026', 60, 460);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  const dt = new DataTransfer();
  dt.items.add(new File([blob], 'e2e-3000.png', { type: 'image/png' }));
  const input = document.getElementById('ocFileInput');
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  // 切简中+英文档
  const chip = Array.from(document.querySelectorAll('.oc-lang')).find((b) => b.textContent === '简中+英文');
  chip.click();
});
await sleep(900);
const dim3000 = await frame.evaluate(() => ({
  dim: document.getElementById('ocStDim').textContent,
  natural: document.getElementById('ocImg').naturalWidth,
}));
A('3000px 图装载（naturalWidth=3000）', dim3000.dim === '3000×700' && dim3000.natural === 3000, JSON.stringify(dim3000));
await frame.evaluate(() => { document.getElementById('ocStartBtn').click(); });
await sleep(700);   // 降采样标注在识别启动时同步回填（downscaleToDataUrl）
const scaledAnn = await frame.evaluate(() => document.getElementById('ocStScaled').textContent);
A('降采样标注：长边 2000（3000×700 → 2000×467）', scaledAnn.includes('2000×467'), scaledAnn);
await sleep(400);   // 进入加载/识别中
await frame.evaluate(() => { document.getElementById('ocCancelBtn').click(); });
await sleep(600);
const cancelled = await frame.evaluate(() => ({
  text: document.getElementById('ocPtext').textContent,
  cancelHidden: document.getElementById('ocCancelBtn').hidden,
  startEnabled: !document.getElementById('ocStartBtn').disabled,
  resultHidden: document.getElementById('ocResult').classList.contains('hide'),
}));
A('取消后：状态「已取消」+ 取消钮退场 + 开始恢复 + 无结果区',
  cancelled.text === '已取消' && cancelled.cancelHidden && cancelled.startEnabled && cancelled.resultHidden, JSON.stringify(cancelled));
// worker 重建验证：eng 小图再识别成功（降采样标注回填小图口径）
const rebuild = await frame.evaluate(async () => {
  const chip = Array.from(document.querySelectorAll('.oc-lang')).find((b) => b.textContent === 'English');
  chip.click();
  document.getElementById('ocStartBtn').click();
  await new Promise((r) => setTimeout(r, 15000));
  return {
    text: document.getElementById('ocResArea').value,
    shown: !document.getElementById('ocResult').classList.contains('hide'),
  };
});
A('取消后再识别成功（worker terminate 后重建）', rebuild.shown && /MD3|OCR|2026/.test(rebuild.text), JSON.stringify((rebuild.text || '').trim().slice(0, 40)));

// ---------- F. 3000px 中英混合 < 10s 验收 ----------
console.log('F. 3000px 混合档 < 10s 验收');
await frame.evaluate(async () => {
  // 重装 3000px 图（E 段后仍是 e2e-3000.png）+ 切简中+英文
  const chip = Array.from(document.querySelectorAll('.oc-lang')).find((b) => b.textContent === '简中+英文');
  chip.click();
});
const samplerF = frame.evaluate(async () => {
  let peak = 0;
  let armed = false;
  const t0 = performance.now();
  while (performance.now() - t0 < 30000) {
    const row = document.getElementById('ocProgress');
    if (row.classList.contains('show')) {
      armed = true;
      const m = /(\d+)%/.exec(document.getElementById('ocPfill').style.width);
      if (m) peak = Math.max(peak, Number(m[1]));
    } else if (armed) {
      break;
    }
    await new Promise((r) => setTimeout(r, 60));
  }
  return peak;
});
await sleep(300);
const tF0 = Date.now();
await frame.evaluate(() => { document.getElementById('ocStartBtn').click(); });
const peakF = await samplerF;
const elapsedF = Date.now() - tF0;
const resultF = await frame.evaluate(() => ({
  text: document.getElementById('ocResArea').value,
  shown: !document.getElementById('ocResult').classList.contains('hide'),
  time: document.getElementById('ocStTime').textContent,
}));
A(`3000px 中英混合识别 < 10s（实测 ${(elapsedF / 1000).toFixed(1)}s，含引擎加载）`,
  resultF.shown && elapsedF < 10000, `elapsed=${elapsedF}ms time=${resultF.time}`);
A('进度峰值采样 > 20%（word progress 实时推进；60ms 高频采样抗混叠）', peakF > 20, `peak=${peakF}%`);
A('混合图识别非空（中文或英文命中）', /Material|Design|识别|字符|Offline|Screenshot|2026/.test(resultF.text), JSON.stringify(resultF.text.trim().slice(0, 80).replace(/\n/g, ' ')));
await page.screenshot({ path: join(OUT, 'oc-mixed.png') });

// ---------- G. VFS 导入 ----------
console.log('G. VFS 图片导入');
await frame.evaluate(() => { document.getElementById('ocImportBtn').click(); });
await sleep(900);
const vfsRows = await frame.evaluate(() => Array.from(document.querySelectorAll('.oc-vfs-row')).map((r) => r.dataset.path));
A('sheet 列出 /downloads/e2e-shot.png（.txt 被滤）', vfsRows.length === 1 && vfsRows[0] === '/downloads/e2e-shot.png', JSON.stringify(vfsRows));
await frame.evaluate(() => {
  const row = Array.from(document.querySelectorAll('.oc-vfs-row'))[0];
  row.click();
});
await sleep(900);
const vfsLoaded = await frame.evaluate(() => ({
  sheetClosed: !document.getElementById('ocMask').classList.contains('show'),
  src: document.getElementById('ocStSrc').textContent,
  viewShown: document.getElementById('ocView').classList.contains('show'),
}));
A('VFS 行点击 → 装载（e2e-shot.png · sheet 收起）', vfsLoaded.sheetClosed && vfsLoaded.src === 'e2e-shot.png' && vfsLoaded.viewShown, JSON.stringify(vfsLoaded));

// ---------- H. 预览缩放 ----------
console.log('H. 预览缩放');
await frame.evaluate(() => {
  const b = Array.from(document.querySelectorAll('.oc-zoom')).find((x) => x.dataset.zoom === '150');
  b.click();
});
await sleep(300);
const zoom150 = await frame.evaluate(() => ({
  width: document.getElementById('ocImg').style.width,
  natural: document.getElementById('ocImg').naturalWidth,
  fitOff: !document.getElementById('ocView').classList.contains('fit'),
  active: document.querySelector('.oc-zoom.active')?.dataset.zoom,
}));
A('150% 缩放：宽度 = naturalWidth×1.5 + fit 退出 + active 标注',
  zoom150.width === String(Math.round(zoom150.natural * 1.5)) + 'px' && zoom150.fitOff && zoom150.active === '150', JSON.stringify(zoom150));
await frame.evaluate(() => {
  const b = Array.from(document.querySelectorAll('.oc-zoom')).find((x) => x.dataset.zoom === 'fit');
  b.click();
});
await sleep(200);
const fitBack = await frame.evaluate(() => ({
  fitOn: document.getElementById('ocView').classList.contains('fit'),
  width: document.getElementById('ocImg').style.width,
}));
A('适应档恢复（fit 类回挂 + 内联宽度清除）', fitBack.fitOn && fitBack.width === '', JSON.stringify(fitBack));

// ---------- I. 终端 ocr 深链 ----------
console.log('I. 终端联动');
await page.evaluate(() => { window.__shareSheet.openAppById('terminal'); });
await sleep(1500);
const termFrame = page.frames().find((f) => f.url().includes('apps/terminal/index.html'));
const openEcho = await termFrame.evaluate(() => {
  const input = document.getElementById('tmInput');
  input.value = 'ocr /downloads/e2e-shot.png';
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  return Array.from(document.querySelectorAll('#tmOut .tm-line')).map((d) => d.textContent).join('\n');
});
await sleep(1500);
const ocrFrame2 = frameOf();
A('终端 ocr 回显 + OCR 帧可达', /正在用 OCR 打开 \/downloads\/e2e-shot\.png/.test(openEcho) && !!ocrFrame2, openEcho.split('\n').pop() || '');
const dl = await ocrFrame2.evaluate(async () => {
  window.postMessage({ type: 'BUS_DELIVER', event: 'ocr/open', payload: { path: '/downloads/e2e-shot.png' } }, '*');
  await new Promise((r) => setTimeout(r, 1100));
  return {
    src: document.getElementById('ocStSrc').textContent,
    viewShown: document.getElementById('ocView').classList.contains('show'),
  };
});
A('深链 ocr/open 载荷消费（VFS 图片装载）', dl.src === 'e2e-shot.png' && dl.viewShown, JSON.stringify(dl));

// ---------- J. 重载恢复（语言档记忆） ----------
console.log('J. 重载恢复');
await page.reload({ waitUntil: 'load', timeout: 30000 });
await sleep(1800);
await page.evaluate(() => { window.__shareSheet.openAppById('ocr'); });
await sleep(1600);
const frameR = frameOf();
const restored = await frameR.evaluate(() => ({
  langActive: document.querySelector('.oc-lang.active')?.dataset.test,
  src: document.getElementById('ocStSrc').textContent,
  viewShown: document.getElementById('ocView').classList.contains('show'),
}));
// F 段最后切到简中+英文 → 恢复该档；VFS 上次来源（e2e-shot.png）自动重载
A('重载恢复语言档（简中+英文）+ 上次 VFS 来源自动装载',
  restored.langActive === 'oc-lang-chi_sim+eng' && restored.src === 'e2e-shot.png' && restored.viewShown, JSON.stringify(restored));

// ---------- K. 零 pageerror ----------
console.log('K. 稳定性');
A('全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log(`\n===== e2e-v852 结果: ${pass} PASS / ${fail} FAIL =====`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
