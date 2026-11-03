// ==================== e2e-v177-text-bridge.mjs — #177 文本三应用互通 e2e ====================
//
// Q1 OCR→翻译串联：ocr 注入识别结果 → 点「翻译」→ toast「已发送到翻译」
// Q2 排队补投接收：translate 打开 → app-bus 定向投递排队补送 → sourceText 预填（自动翻译触发）
// Q3 stt 会话历史：驱动 settleHistory（注入 segments）→ localStorage sttHistory 落档 + chips 渲染
// Q4 stt 历史回填：点击历史 chip → 分段卡回填
// Q5 translate VFS 镜像：驱动 addToHistory → mirrorHistoryToVfs 调用 + localStorage 双写
// Q6 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8986;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome' });
const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());

// 应用打开与 frame 辅助（v176-audio 同款先例）
const openById = (id) => page.evaluate(async (appId) => {
  const { initialApps } = await import('/ios-desktop/js/apps-data.js');
  const { openApp } = await import('/ios-desktop/js/app-window.js');
  openApp(initialApps.findIndex((a) => a.id === appId));
}, id);
const frameOf = (frag) => page.frames().find((f) => f.url().includes(frag));
const waitFrame = async (frag) => {
  for (let i = 0; i < 15 && !frameOf(frag); i++) await sleep(300);
  return frameOf(frag);
};

try {
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2200);
  await page.evaluate(() => {
    const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
    if (btn) btn.click();
  });
  await sleep(400);

  // Q1 OCR→翻译串联：打开 ocr → 注入识别结果 → 点「翻译」
  await openById('ocr');
  const frame1 = await waitFrame('apps/ocr/index.html');
  await sleep(600);
  const q1 = frame1 ? await frame1.evaluate(() => {
    const box = document.getElementById('ocResArea');
    if (!box) return { found: false };
    box.value = '今天天气很好，我们出门吧';
    const btn = document.getElementById('ocTranslateBtn');
    if (!btn) return { found: false, noBtn: true };
    btn.click();
    const toast = document.querySelector('.oc-toast, #ocToast');
    return { found: true, toast: toast ? (toast.textContent || '') : '', toastVisible: toast ? !toast.hidden : false };
  }) : { frame: false };
  A('Q1 OCR→翻译串联：注入结果 → 点「翻译」→ toast「已发送到翻译」',
    q1.found && String(q1.toast).includes('已发送到翻译'), JSON.stringify(q1));

  // Q2 排队补投接收：打开 translate → BUS_DELIVER 补投 → sourceText 预填
  await openById('translate');
  const frame2 = await waitFrame('apps/translate/index.html');
  await sleep(1800);
  const q2 = frame2 ? await frame2.evaluate(() => {
    const st = document.getElementById('sourceText');
    return { found: !!st, value: st ? st.value : '' };
  }) : { frame: false };
  A('Q2 排队补投接收：translate 打开 → 信封补投 → sourceText 预填 OCR 文本',
    q2.found && q2.value.includes('今天天气很好'), JSON.stringify(q2));

  // Q3 stt 会话历史：打开 stt → 注入 segments + 驱动 settleHistory → localStorage + chips
  await openById('stt');
  const frame3 = await waitFrame('apps/stt/index.html');
  await sleep(1200);
  const q3 = frame3 ? await frame3.evaluate(() => {
    try {
      window.__sttTest.setSegments([{ text: '语音转写的测试内容', punct: '', lang: 'zh-CN', at: Date.now(), conf: null }]);
      window.__sttTest.settleHistory();
      const raw = JSON.parse(localStorage.getItem('sttHistory') || '[]');
      const row = document.getElementById('stHistRow');
      const chips = document.querySelectorAll('.st-hist-chip');
      return { found: true, histLen: raw.length, firstPrev: raw[0] && raw[0].prev, rowHidden: row ? row.hidden : null, chips: chips.length };
    } catch (e) { return { found: true, err: String(e).slice(0, 120) }; }
  }) : { frame: false };
  A('Q3 stt 会话历史：settleHistory → localStorage sttHistory 落档 + chips 渲染',
    q3.found && q3.histLen === 1 && String(q3.firstPrev || '').includes('语音转写') && q3.chips >= 1, JSON.stringify(q3));

  // Q4 stt 历史回填：清空分段卡 → 点击 chip → 回填
  const q4 = frame3 ? await frame3.evaluate(() => {
    try {
      window.__sttTest.setSegments([]);
      const chip = document.querySelector('.st-hist-chip');
      if (!chip) return { noChip: true };
      chip.click();
      const segs = window.__sttTest.getSegments();
      return { filled: segs.length >= 1, text: (segs[0] && segs[0].text || '').slice(0, 20) };
    } catch (e) { return { err: String(e).slice(0, 120) }; }
  }) : { frame: false };
  A('Q4 stt 历史回填：点击 chip → 分段卡回填全文',
    q4.filled && String(q4.text || '').includes('语音转写'), JSON.stringify(q4));

  // Q5 translate 历史：重新打开 translate（单窗切换冻结旧实例 frame detached）→ 驱动 addToHistory
  await openById('translate');
  const frame2b = await waitFrame('apps/translate/index.html');
  await sleep(1200);
  const q5 = frame2b ? await frame2b.evaluate(() => {
    try {
      const before = (typeof window.mirrorHistoryToVfs === 'function');
      window.addToHistory({ source: 'hello bridge', target: '你好桥接', sourceLang: 'en', targetLang: 'zh-CN', timestamp: Date.now() });
      const raw = JSON.parse(localStorage.getItem('translationHistory') || '[]');
      return { mirrorFn: before, histLen: raw.length, first: raw[0] && raw[0].source };
    } catch (e) { return { err: String(e).slice(0, 120) }; }
  }) : { frame: false };
  A('Q5 translate 历史：addToHistory → localStorage 落档 + mirrorHistoryToVfs 在场',
    q5.mirrorFn && q5.histLen >= 1 && q5.first === 'hello bridge', JSON.stringify(q5));

  A('Q6 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 300));
} catch (e) {
  A('e2e 异常中断', false, String(e).slice(0, 300));
}

await browser.close();
server.kill();
const passed = results.filter((r) => r[0]).length;
console.log(`\n===== e2e-v177-text-bridge: ${passed}/${results.length} =====`);
process.exit(passed === results.length ? 0 : 1);
