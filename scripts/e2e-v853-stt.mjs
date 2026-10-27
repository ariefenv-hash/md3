// ==================== e2e-v853-stt.mjs — #59 语音转文字无头回归 ====================
//
// DoD（#59 验收原文逐条；headless 无语音引擎 → stub SpeechRecognition 驱动真状态机）：
//   A. UI 骨架：标题/语言 2 档 chips/徽章待开始/空态/字数 0/无降级横幅
//   B. 麦克风权限流程与 #55 统一权限对话框联动：点麦 → 弹 MD3 对话框 → 允许 →
//      recognition 就绪（continuous/interimResults/lang=zh-CN 配置锚）+ 聆听中
//   C. 中间结果上屏 < 300ms（onresult 同步直写 DOM，零节流实测）
//   D. 最终结果落分段卡（首段无标点 + 中间区清空）
//   E. 本地停顿标点：700ms 停顿 → 逗号；1450ms 停顿 → 句号；句末已有标点不追加
//   F. 一键复制：复制全部 → 剪贴板读回逐字节对拍；分段卡单卡复制
//   G. 连续听写不断流（60s 压缩模拟）：高频 final/interim 连发 stub 不停表不重建 +
//      no-speech 断流 → 自动重启（新实例重建、状态保持聆听中）
//   H. 停止：stub stop() 调用 + 徽章待开始
//   I. 终端深链：open stt / stt en 可达 + BUS_DELIVER stt/start 运行时注入（EN 档+自动开始）
//   J. APP_FREEZE 生命周期：abort 调用 + 状态干净复位
//   K. 重载恢复：语言档 EN + 分段卡转录恢复 + 深链重放自动开始（打开即听写语义）
//   L. 降级：删除 SpeechRecognition（无 Web Speech 浏览器）→ 横幅 + 徽章 + 点麦无崩溃
//   M. 零 pageerror
//
// 教训沿袭：v850/v851/v852（?nolock=1 跳锁屏物理点击 / goto load+固定等待 /
// 单 evaluate 原子断言 / 出厂 VFS 目录 / bg-freeze 摘帧隔离）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v853');
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

// ---------- stub SpeechRecognition（addInitScript 全帧注入：主文档 + iframe 同源生效） ----------
await context.addInitScript(() => {
  window.__sttE2E = { instances: [], log: [] };
  class FakeRecognition {
    constructor() {
      this.continuous = false; this.interimResults = false; this.lang = '';
      this.onresult = null; this.onerror = null; this.onend = null; this.onstart = null;
      window.__sttE2E.instances.push(this);
    }
    start() { window.__sttE2E.log.push(['start', this.lang]); }
    stop() { window.__sttE2E.log.push(['stop']); }
    abort() { window.__sttE2E.log.push(['abort']); }
  }
  window.SpeechRecognition = FakeRecognition;
  window.webkitSpeechRecognition = FakeRecognition;
  // 事件构造助手（SpeechRecognitionResultList 数组形态模拟）
  window.__sttE2E.mk = function (text, isFinal, conf) {
    const r = [{ transcript: text, confidence: conf }];
    r.isFinal = isFinal; r.length = 1;
    return r;
  };
  window.__sttE2E.last = function () {
    return window.__sttE2E.instances[window.__sttE2E.instances.length - 1] || null;
  };
});

const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(1800);   // boot

const openApp = async () => { await page.evaluate(() => { window.__shareSheet.openAppById('stt'); }); await sleep(1500); };
const frameOf = () => page.frames().find((f) => f.url().includes('apps/stt/index.html'));
await openApp();
const frame = frameOf();
A('STT iframe 挂载', !!frame);

// ---------- A. UI 骨架 ----------
console.log('A. UI 骨架');
const boot = await frame.evaluate(() => ({
  title: document.querySelector('.st-title')?.textContent,
  sub: document.querySelector('.st-sub')?.textContent,
  langs: Array.from(document.querySelectorAll('.st-lang')).map((b) => ({ text: b.textContent, active: b.classList.contains('active') })),
  badge: document.getElementById('stBadge').textContent,
  dur: document.getElementById('stDur').textContent,
  interim: document.getElementById('stInterim').textContent,
  empty: !!document.querySelector('[data-test="st-empty"]'),
  segCount: document.getElementById('stSegCount').textContent,
  count: document.getElementById('stCount').textContent,
  bannerShown: document.getElementById('stBanner').classList.contains('show'),
  supported: !!window.__sttCore && window.__sttCore.hasSpeechSupport(window),
}));
A('标题 + 副题（零外发口径）', boot.title === '语音转文字' && boot.sub.includes('零外发'), boot.title);
A('语言 2 档 chips（中文默认激活）', boot.langs.length === 2 && boot.langs[0].active && !boot.langs[1].active, JSON.stringify(boot.langs.map((l) => l.active)));
A('徽章待开始 + 时长 00:00 + 空态在场', boot.badge === '待开始' && boot.dur === '00:00' && boot.empty, boot.badge);
A('分段 0 + 字数 0', boot.segCount === '0' && boot.count === '0 字');
A('能力检测通过（stub 在场）+ 无降级横幅', boot.supported && !boot.bannerShown);
await page.screenshot({ path: join(OUT, 'stt-boot.png') });

// ---------- B. 权限对话框联动 + recognition 配置锚 ----------
console.log('B. 权限对话框联动');
await frame.click('[data-test="st-mic"]');
await sleep(700);   // __system 轮询（100ms 步进）+ 对话框 spring 入场
const dlgVisible = await page.evaluate(() => {
  const o = document.getElementById('md3PermissionOverlay');
  return { present: !!o, text: o ? o.textContent : '', micWord: o ? o.textContent.includes('麦克风') : false, appName: o ? o.textContent.includes('语音转文字') : false };
});
A('#55 统一权限对话框弹出（允许「语音转文字」使用麦克风）',
  dlgVisible.present && dlgVisible.micWord && dlgVisible.appName, dlgVisible.text.slice(0, 60));
await page.click('#md3PermissionOverlay button[data-act="granted"]');
await sleep(900);   // PERMISSION_RESULT 回包 + start()
const recB = await frame.evaluate(() => {
  const r = window.__sttE2E.last();
  return r ? {
    continuous: r.continuous, interim: r.interimResults, lang: r.lang,
    starts: window.__sttE2E.log.filter((l) => l[0] === 'start').length,
    badge: document.getElementById('stBadge').textContent,
    listening: document.getElementById('stMic').classList.contains('listening'),
    dlgGone: !document.getElementById('md3PermissionOverlay'),
  } : null;
});
A('允许后 recognition 就绪（continuous+interim+zh-CN）',
  recB && recB.continuous === true && recB.interim === true && recB.lang === 'zh-CN', JSON.stringify(recB));
A('徽章聆听中 + 麦克风按钮激活态 + 对话框已散', recB && recB.badge === '聆听中…' && recB.listening && recB.dlgGone);

// ---------- C. 中间结果上屏 < 300ms ----------
console.log('C. 中间结果上屏');
const interimMs = await frame.evaluate(() => {
  const rec = window.__sttE2E.last();
  const t0 = performance.now();
  rec.onresult({ resultIndex: 0, results: [window.__sttE2E.mk('今天天气', false, 0)] });
  // 同帧轮询 DOM 显形（<300ms 验收口径）
  const el = document.getElementById('stInterim');
  while (performance.now() - t0 < 300) {
    if (el.textContent === '今天天气' && el.classList.contains('live')) return performance.now() - t0;
  }
  return -1;
});
A('中间结果上屏 < 300ms（实测同步直写）', interimMs >= 0 && interimMs < 300, `${interimMs.toFixed(1)}ms`);

// ---------- D. 最终结果落分段卡 ----------
console.log('D. 最终结果落卡');
await sleep(50);
const cardD = await frame.evaluate(() => {
  const rec = window.__sttE2E.last();
  rec.onresult({ resultIndex: 0, results: [window.__sttE2E.mk('今天天气很好', true, 0.93)] });
  const cards = document.querySelectorAll('[data-test="st-seg-card"]');
  const first = cards[0]?.querySelector('[data-test="st-seg-text"]')?.textContent || '';
  return {
    cards: cards.length, firstText: first,
    interim: document.getElementById('stInterim').textContent,
    segCount: document.getElementById('stSegCount').textContent,
    meta: cards[0]?.querySelector('.st-segmeta span')?.textContent || '',
  };
});
A('首段落卡：文本 + 无前导标点 + 中间区清空',
  cardD.cards === 1 && cardD.firstText === '今天天气很好' && cardD.interim === '' && cardD.segCount === '1', JSON.stringify(cardD));
A('分段卡元信息（语言档 + 置信度 93%）', cardD.meta.includes('zh-CN') && cardD.meta.includes('93%'), cardD.meta);

// ---------- E. 本地停顿标点（真实时钟停顿） ----------
console.log('E. 本地停顿标点');
await sleep(700);   // ≥600ms <1400ms → 逗号
await frame.evaluate(() => { window.__sttE2E.last().onresult({ resultIndex: 0, results: [window.__sttE2E.mk('我们出门吧', true, 0.9)] }); });
await sleep(1450);  // ≥1400ms → 句号
await frame.evaluate(() => { window.__sttE2E.last().onresult({ resultIndex: 0, results: [window.__sttE2E.mk('到家再说', true, 0.9)] }); });
await sleep(60);    // <600ms → 不打点；且句末已有标点不追加
await frame.evaluate(() => { window.__sttE2E.last().onresult({ resultIndex: 0, results: [window.__sttE2E.mk('好的。', true, 0.9)] }); });
await sleep(100);
const punct = await frame.evaluate(() =>
  Array.from(document.querySelectorAll('[data-test="st-seg-text"]')).map((n) => n.textContent));
A('停顿标点回写前段三态（700ms→前段逗号 / 1450ms→前段句号 / <600ms 不打点）',
  punct[0] === '今天天气很好，' && punct[1] === '我们出门吧。' && punct[2] === '到家再说' && punct[3] === '好的。', JSON.stringify(punct));

// ---------- F. 一键复制 ----------
console.log('F. 一键复制');
await frame.evaluate(() => { document.getElementById('stCopyAll').click(); });   // v852 同款：evaluate 点击（物理 click 后 readText 偶发空串）
await sleep(400);
const copied = await page.evaluate(() => navigator.clipboard.readText());   // 父页读回（iframe 未聚焦 readText 会 NotAllowedError——v852 同款）
const toastF = await frame.evaluate(() => document.getElementById('stToast').textContent);
A('复制全部 → 剪贴板读回逐字节对拍（标点属前段句尾）', copied === '今天天气很好，我们出门吧。到家再说好的。', `toast=${toastF} clip=${JSON.stringify(copied.slice(0, 24))}`);
await frame.evaluate(() => { document.querySelectorAll('[data-test="st-seg-copy"]')[1].click(); });
await sleep(300);
const copied2 = await page.evaluate(() => navigator.clipboard.readText());
A('分段卡单卡复制', copied2 === '我们出门吧。', JSON.stringify(copied2));

// ---------- G. 连续听写不断流（60s 压缩模拟） + 断流自动重启 ----------
console.log('G. 连续不断流 + 断流重启');
const stress = await frame.evaluate(() => {
  const before = window.__sttE2E.instances.length;
  for (let i = 0; i < 12; i++) {
    const rec = window.__sttE2E.last();
    rec.onresult({ resultIndex: 0, results: [window.__sttE2E.mk('词' + i, false, 0)] });       // interim
    rec.onresult({ resultIndex: 0, results: [window.__sttE2E.mk('第' + i + '句', true, 0.88)] }); // final
  }
  const rec0 = window.__sttE2E.instances[before - 1];
  rec0.onerror({ error: 'no-speech' });   // 静默超时 → 断流
  rec0.onend({});                          // 意外 end → 自动重启
  return {
    instancesBefore: before,
    badge: document.getElementById('stBadge').textContent,
    stops: window.__sttE2E.log.filter((l) => l[0] === 'stop').length,
    segCount: document.getElementById('stSegCount').textContent,
  };
});
await sleep(500);   // 重启 150ms 延迟 + 重建
const restart = await frame.evaluate(() => ({
  instances: window.__sttE2E.instances.length,
  badge: document.getElementById('stBadge').textContent,
  lang: window.__sttE2E.last()?.lang,
  starts: window.__sttE2E.log.filter((l) => l[0] === 'start').length,
}));
A('60s 压缩连发：stub 未被 stop、状态保持聆听、分段累计 16',
  stress.stops === 0 && stress.badge === '聆听中…' && stress.segCount === '16', JSON.stringify(stress));
A('no-speech 断流自动重启：实例重建 + 仍聆听中 + start 二次',
  restart.instances === stress.instancesBefore + 1 && restart.badge === '聆听中…' && restart.starts === 2,
  `instances ${stress.instancesBefore}→${restart.instances} starts=${restart.starts}`);

// ---------- H. 停止 ----------
console.log('H. 停止');
await frame.click('[data-test="st-mic"]');
await sleep(300);
const stopped = await frame.evaluate(() => ({
  badge: document.getElementById('stBadge').textContent,
  stops: window.__sttE2E.log.filter((l) => l[0] === 'stop').length,
  micOn: document.getElementById('stMic').classList.contains('listening'),
  hint: document.getElementById('stHint').textContent,
}));
A('停止：stub stop() + 徽章待开始 + 按钮态复位', stopped.badge === '待开始' && stopped.stops === 1 && !stopped.micOn, JSON.stringify(stopped));
await page.screenshot({ path: join(OUT, 'stt-segments.png') });

// ---------- I. 终端深链（open stt + stt en） + 运行时 stt/start 注入 ----------
console.log('I. 深链');
await page.evaluate(() => { window.__shareSheet.openAppById('terminal'); });
await sleep(1600);
const tframe = page.frames().find((f) => f.url().includes('apps/terminal/index.html'));
const appsOut = await tframe.evaluate(() => {
  const input = document.getElementById('tmInput');
  input.value = 'apps';
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  return Array.from(document.querySelectorAll('#tmOut .tm-line')).map((d) => d.textContent).join('\n');
});
await sleep(200);
A('终端 apps 列表含 stt 语音转文字', appsOut.includes('stt') && appsOut.includes('语音转文字'));
await tframe.evaluate(() => {
  const input = document.getElementById('tmInput');
  input.value = 'stt en';
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
});
await sleep(1500);
const frameI = frameOf();   // 深链重开 iframe 可能重建（v850 bg-freeze 摘帧教训：重新寻帧）
const deepI = await frameI.evaluate(() => ({
  langActive: document.querySelector('.st-lang.active')?.textContent,
  badge: document.getElementById('stBadge').textContent,
  recLang: window.__sttE2E.last()?.lang,
}));
A('终端 stt en → EN 档激活 + 自动开始（打开即听写）',
  deepI.langActive === 'English (US)' && deepI.badge === '聆听中…' && deepI.recLang === 'en-US', JSON.stringify(deepI));
// 运行时 BUS_DELIVER 注入（应用已开二次深链）：英文档下补一句 + 权限已持久化免弹窗
await sleep(120);
await frameI.evaluate(() => {
  window.__sttE2E.last().onresult({ resultIndex: 0, results: [window.__sttE2E.mk('spoken in english', true, 0.9)] });
});
await sleep(80);

// 英文标点核验（en 档逗号）
await sleep(700);
await frameI.evaluate(() => { window.__sttE2E.last().onresult({ resultIndex: 0, results: [window.__sttE2E.mk('and then we left', true, 0.9)] }); });
await sleep(120);
const enPunct = await frameI.evaluate(() => {
  const texts = Array.from(document.querySelectorAll('[data-test="st-seg-text"]')).map((n) => n.textContent);
  return { en: texts.find((t) => t.startsWith('spoken')) || '', next: texts.find((t) => t.startsWith('and then')) || '' };
});
A('英文档标点（无前导 + 逗号回写前段）+ 英文转录空格拼接', enPunct.en === 'spoken in english,' && enPunct.next === 'and then we left', JSON.stringify(enPunct));
await frameI.click('[data-test="st-mic"]');   // 停止，落静默态
await sleep(300);

// ---------- J. APP_FREEZE 生命周期 ----------
console.log('J. APP_FREEZE');
const frameJ = frameOf();
await frameJ.click('[data-test="st-mic"]');   // 先回到聆听
await sleep(200);
const beforeJ = await frameJ.evaluate(() => window.__sttE2E.instances.length);
await frameJ.evaluate(() => window.postMessage({ type: 'APP_FREEZE' }, '*'));
await sleep(400);
const frozen = await frameJ.evaluate(() => ({
  badge: document.getElementById('stBadge').textContent,
  aborts: window.__sttE2E.log.filter((l) => l[0] === 'abort').length,
  micOn: document.getElementById('stMic').classList.contains('listening'),
  interim: document.getElementById('stInterim').textContent,
}));
A('APP_FREEZE → abort 调用 + 状态干净复位（无残留监听/无聆听态）',
  frozen.badge === '待开始' && frozen.aborts === 1 && !frozen.micOn && frozen.interim === '',
  `instances ${beforeJ} aborts=${frozen.aborts}`);

// ---------- K. 重载恢复（语言档 + 分段卡 + 深链重放） ----------
console.log('K. 重载恢复');
await page.reload({ waitUntil: 'load', timeout: 30000 });
await sleep(1800);
await page.evaluate(() => { window.__shareSheet.openAppById('stt'); });
await sleep(1500);
const frameK = frameOf();
const restored = await frameK.evaluate(() => ({
  langActive: document.querySelector('.st-lang.active')?.textContent,
  segCount: document.getElementById('stSegCount').textContent,
  firstCard: document.querySelector('[data-test="st-seg-text"]')?.textContent || '',
  badge: document.getElementById('stBadge').textContent,
  recLang: window.__sttE2E.last()?.lang,
  starts: window.__sttE2E.log.filter((l) => l[0] === 'start').length,
}));
A('重载恢复：EN 档 + 分段卡转录在（18 段）',
  restored.langActive === 'English (US)' && restored.segCount === '18' && restored.firstCard === '今天天气很好，', JSON.stringify({ seg: restored.segCount, lang: restored.langActive, first: restored.firstCard }));
A('重载不自动开麦（初始化绝不自动开麦纪律）',
  restored.badge === '待开始' && restored.starts === 0, JSON.stringify({ badge: restored.badge, starts: restored.starts }));
await frameK.click('[data-test="st-mic"]');
await sleep(200);
await page.screenshot({ path: join(OUT, 'stt-restored.png') });

// ---------- L. 降级（删除 SpeechRecognition 模拟无 Web Speech 浏览器） ----------
console.log('L. 降级');
await context.addInitScript(() => {
  delete window.SpeechRecognition;
  delete window.webkitSpeechRecognition;
  window.__sttE2E = { instances: [], log: [] };   // 重置观测面（降级态不产生实例）
});
await page.reload({ waitUntil: 'load', timeout: 30000 });
await sleep(1800);
await page.evaluate(() => { window.__shareSheet.openAppById('stt'); });
await sleep(1500);
const frameL = frameOf();
const degraded = await frameL.evaluate(() => {
  const before = window.__sttE2E.instances.length;
  document.getElementById('stMic').click();       // 点麦不应崩、不应产生实例
  return {
    badge: document.getElementById('stBadge').textContent,
    banner: document.getElementById('stBanner').textContent,
    bannerShown: document.getElementById('stBanner').classList.contains('show'),
    instances: window.__sttE2E.instances.length - before,
    supported: window.__sttCore.hasSpeechSupport(window),
  };
});
A('降级：能力检测 false + 横幅提示 + 徽章「浏览器不支持」',
  !degraded.supported && degraded.badge === '浏览器不支持' && degraded.banner.includes('此浏览器不支持 Web Speech'),
  JSON.stringify({ badge: degraded.badge, banner: degraded.banner.slice(0, 30) }));
A('降级点麦零实例零崩溃', degraded.instances === 0 && degraded.bannerShown);
await page.screenshot({ path: join(OUT, 'stt-degraded.png') });

// ---------- M. 零 pageerror ----------
console.log('M. 稳定性');
A('全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log(`\n===== e2e-v853 结果: ${pass} PASS / ${fail} FAIL =====`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
