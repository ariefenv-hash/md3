// e2e-v803-sound-subpage.mjs — v8.03 #23 差距矩阵①回审计 E2E 核验
// ① 一级菜单提示音和振动行 → 页 4（宽栏双栏 openPane 路径）
// ② 页 4 权威结构：五通道音量滑条（媒体/通话/铃声/通知/闹钟）+ 13 行条目 + Web 扩展卡
// ③ 滑条真交互：拖动闹钟滑条 → __settingsSoundStore.set('alarm') + settings-sound-changed 事件
// ④ 单源持久化 settings:sound-v1（alarm 写回 + 重载恢复，#11 时钟消费点）
// ⑤ touch_sounds 开关 ↔ sound-haptics sfxEnabled 同一真源融合
// ⑥ 零 pageerror + 截图三张落盘 docs/v803/
//
// 用法：MD3_BASE=http://127.0.0.1:8081/ios-desktop/index.html?nolock=1 node scripts/e2e-v803-sound-subpage.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const LIVE = process.env.MD3_BASE || 'http://127.0.0.1:8081/ios-desktop/index.html?nolock=1';
const OUT = process.env.E2E_OUT || '/home/z/my-project/md3-repo/docs/v803';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
let failures = 0;
const check = (name, cond, detail = '') => {
  log(`${cond ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
  if (!cond) failures++;
};

const browser = await chromium.launch({
  executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});

const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
let pageErrors = 0;
page.on('pageerror', (e) => { pageErrors++; log('[pageerror]', e.message.slice(0, 200)); });

await page.goto(LIVE, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await sleep(2500);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await sleep(1200);

// 清态：确保 sound 单源从默认开始
await page.evaluate(() => localStorage.removeItem('settings:sound-v1'));

// ① 打开设置 → 宽栏双栏
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(1600);

// ② 左栏提示音和振动行（idx 4）
const sndRow = await page.evaluate(() => {
  const row = document.querySelector('.tp-row[data-tp-key="sound"]');
  return row ? { label: row.querySelector('.tp-row-label, .tp-row-title')?.textContent.trim(), tp: row.dataset.tp } : null;
});
check('提示音和振动行存在于左栏且 data-tp=4', !!sndRow && sndRow.tp === '4', JSON.stringify(sndRow));

// 点行 → 右栏打开页 4
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="sound"]').click());
await sleep(1400);

const p4 = await page.evaluate(() => {
  const pageEl = document.getElementById('app-page-settings-4');
  if (!pageEl) return null;
  const txt = pageEl.textContent;
  const q = (id) => !!pageEl.querySelector('#' + id);
  return {
    mounted: true,
    hosted: !!pageEl.classList.contains('tp-hosted'),
    title: txt.includes('提示音和振动') && txt.includes('音量、铃声、提示音（AOSP SoundSettings）'),
    // 五通道音量
    rMedia: txt.includes('媒体音量') && q('sndMediaSlider'),
    rCall: txt.includes('通话音量') && q('sndCallSlider'),
    rRing: txt.includes('铃声音量') && q('sndRingSlider'),
    rNotif: txt.includes('通知音量') && q('sndNotifSlider'),
    rAlarm: txt.includes('闹钟音量') && q('sndAlarmSlider'),
    // 条目行
    rMediaOutput: txt.includes('音频播放位置：') && txt.includes('此设备'),
    rPhoneRingtone: txt.includes('手机铃声'),
    rMediaControls: txt.includes('媒体') && txt.includes('显示播放器'),
    rVibration: txt.includes('振动和触感反馈') && txt.includes('已开启'),
    rPreventRinging: txt.includes('阻止响铃的快捷方式') && q('sndPreventRingingToggle'),
    rNotifRingtone: txt.includes('默认通知提示音'),
    rAlarmRingtone: txt.includes('默认闹钟提示音'),
    rDtmf: txt.includes('拨号键盘提示音') && q('sndDtmfToggle'),
    rScreenLock: txt.includes('屏幕锁定提示音') && q('sndScreenLockToggle'),
    rCharging: txt.includes('充电提示音和振动') && q('sndChargingToggle'),
    rDocking: txt.includes('基座提示音') && q('sndDockingToggle'),
    rTouchSounds: txt.includes('点按和点击提示音') && q('sndTouchSoundsToggle'),
    rVibrateIcon: txt.includes('使用振动模式时一律显示振动图标') && q('sndVibrateIconToggle'),
    // Web 扩展卡
    rExtCard: txt.includes('系统音效（Web 扩展 · AOSP 无对应条目）') && q('sfxVolSlider') && q('sndHapticToggle'),
    // 五通道图标（模板插值已展开为 SVG，按 DOM 结构查）
    icons: (function() {
      const rows = [...pageEl.querySelectorAll('.md3-list-item')].filter((r) => r.querySelector('#sndMediaSlider,#sndCallSlider,#sndRingSlider,#sndNotifSlider,#sndAlarmSlider'));
      const withIcon = rows.filter((r) => r.querySelector('.md3-list-item-icon svg'));
      return { rows: rows.length, withIcon: withIcon.length };
    })(),
  };
});
check('页 4 挂载（栈页被双栏移动 hosted）', !!p4 && p4.mounted && p4.hosted, String(!!p4 && p4.hosted));
check('页 4 标题「提示音和振动」+ 副题', !!p4 && p4.title);
check('五通道音量滑条齐（媒体/通话/铃声/通知/闹钟）', !!p4 && p4.rMedia && p4.rCall && p4.rRing && p4.rNotif && p4.rAlarm);
check('13 行条目齐（输出/铃声×3/媒体控制/振动/防响铃/六开关）', !!p4 && p4.rMediaOutput && p4.rPhoneRingtone && p4.rMediaControls && p4.rVibration && p4.rPreventRinging && p4.rNotifRingtone && p4.rAlarmRingtone && p4.rDtmf && p4.rScreenLock && p4.rCharging && p4.rDocking && p4.rTouchSounds && p4.rVibrateIcon);
check('Web 扩展卡（sfx 音量 + 触感振动）保留', !!p4 && p4.rExtCard);
check('五通道图标引用齐（五滑条行各含 .md3-list-item-icon svg）', !!p4 && p4.icons.rows === 5 && p4.icons.withIcon === 5, JSON.stringify(p4?.icons));
await page.screenshot({ path: `${OUT}/p4-sound-page.png` });

// 五通道滑条区特写（媒体→闹钟 76dp 行 + 24dp 单色图标视觉核验）
const clip5 = await page.evaluate(() => {
  const first = document.querySelector('#app-page-settings-4 [data-test="snd-media"]');
  const last = document.querySelector('#app-page-settings-4 [data-test="snd-alarm"]');
  if (!first || !last) return null;
  const a = first.getBoundingClientRect(), b = last.getBoundingClientRect();
  return { top: a.top, height: b.bottom - a.top };
});
if (clip5) {
  await page.screenshot({ path: `${OUT}/p4-five-channels-closeup.png`, clip: { x: 640, y: Math.max(0, clip5.top - 8), width: 640, height: Math.min(760, clip5.height + 16) } });
}

// ③ 五通道滑条初值（store 默认 call 50/ring 70/notif 70/alarm 70 + 单一真源注册）
const initVals = await page.evaluate(() => ({
  call: document.getElementById('sndCallVal')?.textContent,
  ring: document.getElementById('sndRingVal')?.textContent,
  notif: document.getElementById('sndNotifVal')?.textContent,
  alarm: document.getElementById('sndAlarmVal')?.textContent,
  storeAlive: typeof window.__settingsSoundStore === 'object' && !!window.__settingsSoundStore,
  alarm0: window.__settingsSoundStore?.get('alarm'),
}));
check('四通道初值 = AOSP 默认语义换算（50/70/70/70%）', initVals.call === '50%' && initVals.ring === '70%' && initVals.notif === '70%' && initVals.alarm === '70%', JSON.stringify(initVals));
check('单一真源 __settingsSoundStore 注册（#11 时钟消费点）', initVals.storeAlive && initVals.alarm0 === 70, JSON.stringify({ alive: initVals.storeAlive, alarm0: initVals.alarm0 }));

// ④ 滑条真交互：拖动闹钟滑条到 ~80%（slPaint 走 rAF 异步帧，派发后需等帧）
await page.evaluate(() => {
  const slider = document.getElementById('sndAlarmSlider');
  if (!slider) return;
  const r = slider.getBoundingClientRect();
  const x = r.left + r.width * 0.8, y = r.top + r.height / 2;
  const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1 };
  slider.dispatchEvent(new PointerEvent('pointerdown', opts));
  slider.dispatchEvent(new PointerEvent('pointermove', opts));
  slider.dispatchEvent(new PointerEvent('pointerup', opts));
});
await sleep(400);
const evtOk = await page.evaluate(() => {
  return new Promise((resolve) => {
    let fired = 0;
    // 事件已在拖动帧中触发过（一次性补验：直接读终态 + 重放一个 move 验证事件链仍活）
    const slider = document.getElementById('sndAlarmSlider');
    const handler = (e) => { if (e.detail && e.detail.key === 'alarm') fired++; };
    document.addEventListener('settings-sound-changed', handler);
    const r = slider.getBoundingClientRect();
    const x = r.left + r.width * 0.75, y = r.top + r.height / 2;
    const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1 };
    slider.dispatchEvent(new PointerEvent('pointerdown', opts));
    slider.dispatchEvent(new PointerEvent('pointermove', opts));
    slider.dispatchEvent(new PointerEvent('pointerup', opts));
    setTimeout(() => {
      document.removeEventListener('settings-sound-changed', handler);
      resolve({ fired, alarm: window.__settingsSoundStore.get('alarm'), label: document.getElementById('sndAlarmVal').textContent, stored: JSON.parse(localStorage.getItem('settings:sound-v1') || '{}') });
    }, 350);
  });
});
await sleep(200);
check('拖动闹钟滑条 → store.set alarm + settings-sound-changed 事件链活', evtOk && evtOk.fired >= 1 && evtOk.alarm === 75 && evtOk.label === '75%', JSON.stringify(evtOk));
check('settings:sound-v1 持久化写回 alarm=75', evtOk && evtOk.stored.alarm === 75, JSON.stringify(evtOk?.stored));
await page.screenshot({ path: `${OUT}/p4-alarm-drag.png` });

// ⑤ touch_sounds ↔ sound-haptics sfxEnabled 同一真源融合
const touch = await page.evaluate(() => {
  const sw = document.getElementById('sndTouchSoundsToggle');
  const before = window.__sfx ? window.__sfx.sfxEnabled() : null;
  sw.checked = !sw.checked;
  sw.dispatchEvent(new Event('change'));
  const after = window.__sfx ? window.__sfx.sfxEnabled() : null;
  return { before, after, sw: sw.checked };
});
check('touch_sounds 开关翻转 → sfx.setSfxEnabled 同步（SOUND_EFFECTS_ENABLED 同一语义）', touch.before !== null && touch.before !== touch.after && touch.after === touch.sw, JSON.stringify(touch));
// 复原
await page.evaluate(() => {
  const sw = document.getElementById('sndTouchSoundsToggle');
  sw.checked = true;
  sw.dispatchEvent(new Event('change'));
});

// ⑥ 重载恢复（alarm=80 持久化，#11 时钟前置语义）
await page.reload({ waitUntil: 'domcontentloaded' });
await sleep(2500);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await sleep(1200);
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(1600);
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="sound"]').click());
await sleep(1400);
const restored = await page.evaluate(() => ({
  alarmLabel: document.getElementById('sndAlarmVal')?.textContent,
  alarm: window.__settingsSoundStore?.get('alarm'),
}));
check('重载恢复：闹钟音量仍 75%（单源持久化）', restored.alarm === 75 && restored.alarmLabel === '75%', JSON.stringify(restored));
// 复原默认（会话一致性）
await page.evaluate(() => localStorage.removeItem('settings:sound-v1'));

check('零 pageerror', pageErrors === 0, `errors=${pageErrors}`);

await browser.close();
log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
