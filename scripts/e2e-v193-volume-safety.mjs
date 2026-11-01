// v9.23 = #193 一期安全音量警告 无头回归（R48 补强：真实浏览器交互流）：
// ①音量键 AudioVolumeUp 60→67 越线 → 拦截：警告层可见 + 音量保持原值不预落（源码实证口径）
// ②点确认 → 放行到目标值 + sessionStorage 会话记忆 + 警告隐藏
// ③确认后真实拖拽越线 → 直通无警告（记忆生效）
// ④新 context（无记忆）音量键越线 → 点取消 → 音量保持原值 + 警告隐藏（丢弃 pending）
// ⑤零 pageerror 收敛
// 坑在录：.volume-dialog 默认 pointer-events:none/visibility:hidden（.visible 才 auto）——
// 拖拽场景须先音量键 show()（真实用户流同序），直接盲拖无效。
// 范式同 e2e-v176：dev 服务器（E2E_BASE 可覆写，默认 8080）。
import { chromium } from 'playwright';

const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8080/ios-desktop/index.html?nolock=1';
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'],
});
const errors = [];

/** 真实拖拽主滑条（须先音量键 show，否则 pointer-events:none 盲拖无效） */
async function dragSlider(page, fromPct, toPct) {
  const box = await page.locator('#vdSlider').boundingBox();
  const yFor = (pct) => box.y + box.height - (box.height * pct) / 100;
  await page.mouse.move(box.x + box.width / 2, yFor(fromPct));
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, yFor(toPct), { steps: 6 });
  await sleep(80);
  await page.mouse.up();
  await sleep(150);
}

async function vdState(page) {
  return page.evaluate(async () => {
    const m = await import('/ios-desktop/js/volume-dialog.js');
    const hooks = m.__testHooks();
    const safety = document.getElementById('vdSafety');
    return {
      volume: hooks.currentVolume,
      model: hooks.getSafetyModel(),
      pending: hooks.safeVolume.pendingVolumeCommand,
      safetyHidden: safety.hidden,
      dialogVisible: document.getElementById('volumeDialog').classList.contains('visible'),
      confirmed: sessionStorage.getItem('vd.safety.confirmed') === '1',
    };
  });
}

// ==================== 场景 1-3：同 context（会话记忆延续） ====================
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2200);

let s = await vdState(page);
t('P0 初始态：音量 60 / Invisible / 警告层隐藏 / 无记忆',
  s.volume === 60 && s.model.kind === 'Invisible' && s.safetyHidden === true && !s.confirmed,
  JSON.stringify(s));

// 场景 1：音量键 60 → 66.67→67（KEY_STEP=100/15）越线 → 拦截
await page.keyboard.press('AudioVolumeUp');
await sleep(200);
s = await vdState(page);
t('P1 音量键越线拦截：警告层可见（Interactor 判定）+ 对话框显示',
  s.safetyHidden === false && s.dialogVisible === true, `hidden=${s.safetyHidden} dialog=${s.dialogVisible}`);
t('P2 不预落值：音量保持 60（源码实证口径）', s.volume === 60, `vol=${s.volume}`);
t('P3 pending 暂存(67) + Visible 模型', s.pending && s.pending.index === 67 && s.model.kind === 'Visible',
  JSON.stringify(s.pending));

// 点确认 → 放行
await page.click('[data-safety="confirm"]');
await sleep(180);
s = await vdState(page);
t('P4 确认放行：音量落 67 + pending 消费 + 警告隐藏', s.volume === 67 && s.safetyHidden === true && !s.pending,
  `vol=${s.volume}`);
t('P5 sessionStorage 会话记忆', s.confirmed === true);

// 场景 2：确认后真实拖拽越线 → 直通（对话框已显示；拖拽 67→80）
await dragSlider(page, 67, 80);
s = await vdState(page);
t('P6 已确认拖拽直通：80 落值 + 无警告（sessionStorage 记忆生效）',
  s.volume === 80 && s.model.kind === 'Invisible' && s.safetyHidden === true, `vol=${s.volume}`);

// ==================== 场景 4：新 context（无记忆）→ 音量键越线 + 取消流 ====================
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const page2 = await ctx2.newPage();
page2.on('pageerror', (e) => errors.push(String(e)));
await page2.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2200);

let s2 = await vdState(page2);
t('P7 新会话初始：无记忆（重载重置语义）', !s2.confirmed && s2.volume === 60);

await page2.keyboard.press('AudioVolumeUp');
await sleep(200);
s2 = await vdState(page2);
t('P8 新会话音量键越线：拦截 + 保持 60', s2.safetyHidden === false && s2.volume === 60, `vol=${s2.volume}`);

await page2.click('[data-safety="dismiss"]');
await sleep(180);
s2 = await vdState(page2);
t('P9 取消丢弃：pending 清空 + 警告隐藏 + 音量保持原值（从未落值无需回落）',
  s2.pending === null && s2.safetyHidden === true && s2.volume === 60, `vol=${s2.volume}`);

t('P10 零 pageerror 收敛（两 context）', errors.length === 0, errors.join(' ; ').slice(0, 200));

await browser.close();
console.log(`\n[e2e-v193] 结果：PASS ${pass} / FAIL ${fail}`);
process.exit(fail === 0 ? 0 : 1);
