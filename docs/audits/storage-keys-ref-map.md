# #283 剩余 37 键 · 引用点全貌（侦察件）

> 生成自 registry.md 非命名空间段 39 行 − 2 已收编 = 37。


## android_clock_state  [direct]  源码 32 处 / 测试 3 处
  注记：裸键 → 建议 ios-desktop:*
  源码：
    ios-desktop/apps/clock-app/app.mjs:23  try{const s=localStorage.getItem('android_clock_state');if(s)Object.assign(A,JSON.parse(s))}catch(e){}
    ios-desktop/apps/clock-app/app.mjs:24  const save=()=>{try{localStorage.setItem('android_clock_state',JSON.stringify(A))}catch(e){}};
    ios-desktop/apps/clock-app/app.mjs:444  const fresh = JSON.parse(localStorage.getItem('android_clock_state'));
    ios-desktop/js/storage-stats.js:31  ['android_clock_state', 'clock_app'],
    scripts/e2e-sweep-c1-clock-switch.mjs:144  const st = JSON.parse(localStorage.getItem('android_clock_state') || 'null');
    scripts/e2e-sweep-c1-clock-switch.mjs:153  const st = JSON.parse(localStorage.getItem('android_clock_state') || 'null');
    scripts/e2e-v157-bedtime.mjs:79  stored: JSON.parse(localStorage.getItem('android_clock_state')).bedtime,
    scripts/e2e-v157-bedtime.mjs:91  storedDays: JSON.parse(localStorage.getItem('android_clock_state')).bedtime.days,
    scripts/e2e-v157-bedtime.mjs:97  const st = JSON.parse(localStorage.getItem('android_clock_state'));
    scripts/e2e-v157-bedtime.mjs:104  localStorage.setItem('android_clock_state', JSON.stringify(st));
    scripts/e2e-v157-bedtime.mjs:112  enabled: JSON.parse(localStorage.getItem('android_clock_state')).bedtime.enabled,
    scripts/e2e-v157-bedtime.mjs:117  const st = JSON.parse(localStorage.getItem('android_clock_state'));
    scripts/e2e-v157-bedtime.mjs:119  localStorage.setItem('android_clock_state', JSON.stringify(st));
    scripts/e2e-v157-bedtime.mjs:132  const st = JSON.parse(localStorage.getItem('android_clock_state'));
    scripts/e2e-v157-bedtime.mjs:138  localStorage.setItem('android_clock_state', JSON.stringify(st));
    scripts/e2e-v157-phase3.mjs:52  localStorage.setItem('android_clock_state', JSON.stringify(st));
    scripts/e2e-v157-wakelink.mjs:25  localStorage.setItem('android_clock_state', JSON.stringify({
    scripts/e2e-v158-crescendo.mjs:38  const q1 = await page.evaluate(() => ({ v: document.getElementById('crescendoSelect')?.value, stored: Number(JSON.parse(localStorage.getItem('android_
    scripts/e2e-v158-crescendo.mjs:48  const k = window.__clockRingGainFromVolumes(JSON.parse(localStorage.getItem('android_clock_state')).masterVolume, window.__clockAlarmVolumePct());
    scripts/e2e-v158-crescendo.mjs:69  const k = window.__clockRingGainFromVolumes(JSON.parse(localStorage.getItem('android_clock_state')).masterVolume, window.__clockAlarmVolumePct());
    scripts/e2e-v158-ringtones.mjs:43  return { opts: sel ? sel.options.length : 0, val: sel ? sel.value : null, mode: probe ? probe.mode : null, stored: (JSON.parse(localStorage.getItem('a
    scripts/e2e-v158-ringtones.mjs:64  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('android_clock_state') || '{}').globalRingtone);
    scripts/e2e-v158-ringtones.mjs:67  const q3 = await page.evaluate(() => ({ sel: document.getElementById('globalRingtoneSelect').value, stored: JSON.parse(localStorage.getItem('android_c
    scripts/e2e-v158-ringtones.mjs:86  await page3.addInitScript(() => localStorage.setItem('android_clock_state', JSON.stringify({ globalRingtone: 'osmium' }))); // 确定性预置（newPage 独立 contex
    scripts/e2e-v208-alarmstate.mjs:37  localStorage.setItem('android_clock_state', JSON.stringify({
    scripts/e2e-v208-alarmstate.mjs:86  const st = JSON.parse(localStorage.getItem('android_clock_state'));
    scripts/e2e-v208-alarmstate.mjs:149  const st = JSON.parse(localStorage.getItem('android_clock_state'));
    scripts/e2e-v209-dnd-bridge.mjs:32  localStorage.setItem('android_clock_state', JSON.stringify({
    scripts/e2e-v849-clock-m3e.mjs:48  if (!localStorage.getItem('android_clock_state')) {
    scripts/e2e-v849-clock-m3e.mjs:49  localStorage.setItem('android_clock_state', JSON.stringify({
    scripts/e2e-v849-clock-m3e.mjs:121  const st = JSON.parse(localStorage.getItem('android_clock_state'));
    scripts/e2e-v849-clock-m3e.mjs:133  const st = JSON.parse(localStorage.getItem('android_clock_state'));
  测试：
    tests/clock-m3e.test.js:200  it('v7.77 M3E 下拉刷新接线在册（onRefresh 重读 android_clock_state）', () => {
    tests/clock-m3e.test.js:202  expect(s).toContain("JSON.parse(localStorage.getItem('android_clock_state'))");
    tests/m3e-theme-pull-stretch.test.js:155  ['clock', 'apps/clock-app/index.html', ['_shared/m3e-pull.js', 'android_clock_state', 'rA()']],

## calevents_v1  [constant/direct]  源码 5 处 / 测试 5 处
  注记：裸键 → 建议 ios-desktop:*
  源码：
    ios-desktop/apps/calendar/index.html:662  const EV_DB_KEY = 'calevents_v1'; // v7.76 真日程（与笔记分库，时钟应用同源直读）
    ios-desktop/apps/clock-app/app.mjs:370  try { db = JSON.parse(localStorage.getItem('calevents_v1') || 'null') || {}; } catch (_) {}
    ios-desktop/js/storage-stats.js:21  ['calevents_v1', 'calendar'],                           // v11.26 #219：apps/calendar/index.html 实测
    scripts/e2e-v157-phase3.mjs:53  localStorage.setItem('calevents_v1', JSON.stringify(ev));
    scripts/e2e-v157-phase3.mjs:103  await page2.addInitScript(([ev]) => { localStorage.setItem('calevents_v1', JSON.stringify(ev)); }, [cal2]);
  测试：
    tests/clock-m3e.test.js:205  it('v7.19 计时器深链 timer/start + v7.76 日程卡 calevents_v1 双通道保留', () => {
    tests/clock-m3e.test.js:207  expect(s).toContain("localStorage.getItem('calevents_v1')");
    tests/v219-app-data-registry.test.js:12  //     calevents_v1→calendar / flow11 双键→flow11 / files_clean_freed_total→files /
    tests/v219-app-data-registry.test.js:78  expect(statsJs).toMatch(/\['calevents_v1', 'calendar'\]/);
    tests/v219-app-data-registry.test.js:99  expect(ownerOfLs('calevents_v1')).toBe('calendar');

## calnotes_v2  [constant]  源码 2 处 / 测试 1 处
  注记：裸键 → 建议 ios-desktop:*
  源码：
    ios-desktop/apps/calendar/index.html:661  const DB_KEY = 'calnotes_v2';
    ios-desktop/js/cal-sync.js:8  export const CAL_DB_KEY = 'calnotes_v2';
  测试：
    tests/cal-sync.test.js:10  //   - 日历应用（iframe）写入 calnotes_v2 → 宿主 storage 事件 → 通知中心 n2 条目刷新为真实摘要

## dice_lab_stats  [direct]  源码 3 处 / 测试 1 处
  注记：游戏域裸键（#286 ref 池应用）→ 建议 ios-desktop:<app>-*
  源码：
    ios-desktop/apps/dice/index.html:663  localStorage.setItem('dice_lab_stats', JSON.stringify(state.stats));
    ios-desktop/apps/dice/index.html:671  function loadStats() { const data = localStorage.getItem('dice_lab_stats'); if (data) state.stats = JSON.parse(data); renderStatsUI(); }
    ios-desktop/js/storage-stats.js:38  ['dice_lab_stats', 'dice'],
  测试：
    tests/batch3.test.js:97  expect(DICE).toMatch(/localStorage\.setItem\('dice_lab_stats'/);

## flow11_best  [direct]  源码 3 处 / 测试 2 处
  注记：游戏域裸键（#286 ref 池应用）→ 建议 ios-desktop:<app>-*
  源码：
    ios-desktop/apps/flow11/index.html:800  let bestScore = parseInt(localStorage.getItem('flow11_best') || '0', 10);
    ios-desktop/apps/flow11/index.html:1159  localStorage.setItem('flow11_best', bestScore);
    ios-desktop/js/storage-stats.js:30  ['flow11_best', 'flow11'],
  测试：
    tests/batch6.test.js:13  //     flow11_powerups + 最高分键 flow11_best + 模式四档 + v7.45 定高让位链路零变化
    tests/batch6.test.js:104  expect(HTML).toContain("localStorage.setItem('flow11_best', bestScore)");

## flow11_powerups  [direct]  源码 3 处 / 测试 3 处
  注记：游戏域裸键（#286 ref 池应用）→ 建议 ios-desktop:<app>-*
  源码：
    ios-desktop/apps/flow11/index.html:804  const p = JSON.parse(localStorage.getItem('flow11_powerups') || 'null');
    ios-desktop/apps/flow11/index.html:815  const savePowerups = () => { try { localStorage.setItem('flow11_powerups', JSON.stringify(powerups)); } catch (e) {} };
    ios-desktop/js/storage-stats.js:23  ['flow11_powerups', 'flow11'],                          // v11.26 #219：同上
  测试：
    tests/batch6.test.js:13  //     flow11_powerups + 最高分键 flow11_best + 模式四档 + v7.45 定高让位链路零变化
    tests/batch6.test.js:103  expect(HTML).toContain("localStorage.getItem('flow11_powerups')");
    tests/v219-app-data-registry.test.js:80  expect(statsJs).toMatch(/\['flow11_powerups', 'flow11'\]/);

## flow11-vol-v1  [direct]  源码 4 处 / 测试 5 处
  注记：游戏域裸键（#286 ref 池应用）→ 建议 ios-desktop:<app>-*
  源码：
    ios-desktop/apps/flow11/index.html:746  var savedVol = parseInt(localStorage.getItem('flow11-vol-v1') || '70', 10);
    ios-desktop/apps/flow11/index.html:754  try { localStorage.setItem('flow11-vol-v1', String(clamped)); } catch (err) {}
    ios-desktop/js/storage-stats.js:22  ['flow11-vol-v1', 'flow11'],                            // v11.26 #219：apps/flow11/index.html 实测
    scripts/e2e-v181-batch6.mjs:62  ls: localStorage.getItem('flow11-vol-v1'),
  测试：
    tests/batch6.test.js:9  //   · 形态语言：音效音量带手柄 .mdslider（--p 同步 + localStorage flow11-vol-v1 持久化 reload 回填 +
    tests/batch6.test.js:76  it('音效音量带手柄 .mdslider：--p 同步 + flow11-vol-v1 持久化 + SoundEngine gain 乘算三 play', () => {
    tests/batch6.test.js:79  expect(HTML).toContain("localStorage.getItem('flow11-vol-v1')");
    tests/batch6.test.js:80  expect(HTML).toContain("localStorage.setItem('flow11-vol-v1', String(clamped))");
    tests/v219-app-data-registry.test.js:79  expect(statsJs).toMatch(/\['flow11-vol-v1', 'flow11'\]/);

## launch-seed-hue  [direct]  源码 2 处 / 测试 0 处
  注记：launch.html 入口键（根壳域）→ 建议 ios-desktop:launch-seed-hue
  源码：
    launch.html:683  try { saved = localStorage.getItem('launch-seed-hue'); } catch (e) {}
    launch.html:687  if (persist) { try { localStorage.setItem('launch-seed-hue', h); } catch (e) {} }

## md3_books_progress_v1  [constant]  源码 1 处 / 测试 0 处
  注记：应用域裸键 → 建议 ios-desktop:<app>-*（#178 数据孤岛维度）
  源码：
    ios-desktop/apps/books/index.html:619  const BOOKS_PROGRESS_KEY = 'md3_books_progress_v1';

## md3_books_settings_v1  [constant]  源码 1 处 / 测试 0 处
  注记：应用域裸键 → 建议 ios-desktop:<app>-*（#178 数据孤岛维度）
  源码：
    ios-desktop/apps/books/index.html:620  const BOOKS_SETTINGS_KEY = 'md3_books_settings_v1';

## md3_contacts  [constant/direct]  源码 3 处 / 测试 4 处
  注记：应用域裸键 → 建议 ios-desktop:<app>-*（#178 数据孤岛维度）
  源码：
    ios-desktop/apps/contacts/index.html:396  const KEY = 'md3_contacts';
    ios-desktop/apps/phone/index.html:465  try { return JSON.parse(localStorage.getItem('md3_contacts') || '[]'); } catch (e) { return []; }
    ios-desktop/js/storage-stats.js:20  ['md3_contacts', 'phone'],                              // v11.26 #219：apps/phone/index.html 实测
  测试：
    tests/v219-app-data-registry.test.js:11  //   · storage-stats.js 归属规则补登记（R120 窗全库盘点实测勘误：md3_contacts→phone /
    tests/v219-app-data-registry.test.js:77  expect(statsJs).toMatch(/\['md3_contacts', 'phone'\]/);
    tests/v219-app-data-registry.test.js:98  expect(ownerOfLs('md3_contacts')).toBe('phone');
    tests/v286-refonly-core.test.js:715  expect(PHONE_APP_SRC).toContain("localStorage.getItem('md3_contacts')");

## md3_groups  [direct]  源码 4 处 / 测试 3 处
  注记：应用域裸键 → 建议 ios-desktop:<app>-*（#178 数据孤岛维度）
  源码：
    ios-desktop/apps/reminders/index.html:223  groups: JSON.parse(localStorage.getItem('md3_groups')) || DEFAULTS.groups,
    ios-desktop/apps/reminders/index.html:233  function save() { localStorage.setItem('md3_groups', JSON.stringify(state.groups)); localStorage.setItem('md3_tasks', JSON.stringify(state.tasks)); }
    ios-desktop/apps/reminders/index.html:402  state.groups = JSON.parse(localStorage.getItem('md3_groups')) || state.groups;
    ios-desktop/js/storage-stats.js:28  ['md3_groups', 'reminders'],
  测试：
    tests/m3e-theme-pull-stretch.test.js:154  ['reminders', 'apps/reminders/index.html', ['_shared/m3e-pull.js', 'md3_groups', 'renderTasks()']],
    tests/v219-app-data-registry.test.js:126  'memos': 'note1', 'md3_groups': 'g1', 'md3_tasks': 't1',
    tests/v219-app-data-registry.test.js:135  expect(reminders.ls).toEqual(['md3_groups', 'md3_tasks']);

## md3_messages_bots_v1  [constant]  源码 22 处 / 测试 2 处
  注记：应用域裸键 → 建议 ios-desktop:<app>-*（#178 数据孤岛维度）
  源码：
    ios-desktop/apps/messages/index.html:1428  const BOT_STATE_KEY = 'md3_messages_bots_v1';
    scripts/e2e-v856-chatbot.mjs:121  const store = JSON.parse(localStorage.getItem('md3_messages_bots_v1') || '{}');
    scripts/e2e-v856-chatbot.mjs:136  const store = JSON.parse(localStorage.getItem('md3_messages_bots_v1') || '{}');
    scripts/e2e-v856-chatbot.mjs:144  if (!(await waitUntil(() => JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages.filter(m => !m.self).length >= 2, 8000))
    scripts/e2e-v856-chatbot.mjs:147  const msgs = JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages;
    scripts/e2e-v856-chatbot.mjs:152  const store = JSON.parse(localStorage.getItem('md3_messages_bots_v1') || '{}');
    scripts/e2e-v856-chatbot.mjs:166  const beforeBotCount = await evalJs(() => JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages.filter(m => !m.self).lengt
    scripts/e2e-v856-chatbot.mjs:172  const store = JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages;
    scripts/e2e-v856-chatbot.mjs:179  if (!(await waitUntil((n) => JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages.filter(m => !m.self).length >= n, 8000,
    scripts/e2e-v856-chatbot.mjs:182  botMsgs: JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages.filter(m => !m.self).length,
    scripts/e2e-v856-chatbot.mjs:183  lastSelfTs: (() => { const s = JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages.filter(m => m.self); return s.length 
    scripts/e2e-v856-chatbot.mjs:184  lastBotTs: (() => { const s = JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages.filter(m => !m.self); return s.length 
    scripts/e2e-v856-chatbot.mjs:194  const store = JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages;
    scripts/e2e-v856-chatbot.mjs:238  const store = JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages;
    scripts/e2e-v856-chatbot.mjs:258  const store = JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'];
    scripts/e2e-v856-chatbot.mjs:287  const store = JSON.parse(localStorage.getItem('md3_messages_bots_v1') || '{}');
    scripts/e2e-v856-chatbot.mjs:293  const store = JSON.parse(localStorage.getItem('md3_messages_bots_v1') || '{}');
    scripts/probe-v856-burst.mjs:41  selfCount: JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages.filter(m => m.self).length,
    scripts/probe-v856-burst.mjs:53  selfCount: JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages.filter(m => m.self).length,
    scripts/probe-v856-burst.mjs:60  msgs: JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages.map(m => (m.self ? 'U:' : 'B:') + m.text.slice(0, 12)),
    scripts/probe-v856-dispatch.mjs:52  store: JSON.parse(localStorage.getItem('md3_messages_bots_v1') || '{}').chats?.['b-kefu']?.messages?.map(m => ({ s: m.self, r: m.receipt, t: m.text.sl
    scripts/probe-v856-dispatch.mjs:58  store: JSON.parse(localStorage.getItem('md3_messages_bots_v1') || '{}').chats?.['b-kefu']?.messages?.map(m => ({ s: m.self, t: m.text.slice(0, 20) }))
  测试：
    tests/chatbot.test.js:355  it('页面读写键 md3_messages_bots_v1 + normalizeBotState 接线', () => {
    tests/chatbot.test.js:356  expect(PAGE_SRC).toContain("const BOT_STATE_KEY = 'md3_messages_bots_v1'");

## md3_messages_rooms_v1  [constant]  源码 1 处 / 测试 0 处
  注记：应用域裸键 → 建议 ios-desktop:<app>-*（#178 数据孤岛维度）
  源码：
    ios-desktop/apps/messages/index.html:787  const ROOM_STATE_KEY = 'md3_messages_rooms_v1';

## md3_messages_state_v1  [constant]  源码 1 处 / 测试 0 处
  注记：应用域裸键 → 建议 ios-desktop:<app>-*（#178 数据孤岛维度）
  源码：
    ios-desktop/apps/messages/index.html:388  const MSG_STATE_KEY = 'md3_messages_state_v1';

## md3_music_prefs_v1  [constant]  源码 1 处 / 测试 0 处
  注记：应用域裸键 → 建议 ios-desktop:<app>-*（#178 数据孤岛维度）
  源码：
    ios-desktop/apps/music/index.html:1156  const MUSIC_PREFS_KEY = 'md3_music_prefs_v1';

## md3_safari_session_v1  [constant]  源码 1 处 / 测试 0 处
  注记：应用域裸键 → 建议 ios-desktop:<app>-*（#178 数据孤岛维度）
  源码：
    ios-desktop/apps/safari/index.html:683  const SESSION_KEY = 'md3_safari_session_v1';

## md3_stocks_prefs_v1  [constant]  源码 1 处 / 测试 0 处
  注记：应用域裸键 → 建议 ios-desktop:<app>-*（#178 数据孤岛维度）
  源码：
    ios-desktop/apps/stocks/index.html:295  const PREFS_KEY = 'md3_stocks_prefs_v1';

## md3_tasks  [direct]  源码 4 处 / 测试 2 处
  注记：应用域裸键 → 建议 ios-desktop:<app>-*（#178 数据孤岛维度）
  源码：
    ios-desktop/apps/reminders/index.html:224  tasks: JSON.parse(localStorage.getItem('md3_tasks')) || DEFAULTS.tasks,
    ios-desktop/apps/reminders/index.html:233  function save() { localStorage.setItem('md3_groups', JSON.stringify(state.groups)); localStorage.setItem('md3_tasks', JSON.stringify(state.tasks)); }
    ios-desktop/apps/reminders/index.html:403  state.tasks = JSON.parse(localStorage.getItem('md3_tasks')) || state.tasks;
    ios-desktop/js/storage-stats.js:29  ['md3_tasks', 'reminders'],
  测试：
    tests/v219-app-data-registry.test.js:126  'memos': 'note1', 'md3_groups': 'g1', 'md3_tasks': 't1',
    tests/v219-app-data-registry.test.js:135  expect(reminders.ls).toEqual(['md3_groups', 'md3_tasks']);

## md3_weather_loc_v1  [constant]  源码 2 处 / 测试 1 处
  注记：应用域裸键 → 建议 ios-desktop:<app>-*（#178 数据孤岛维度）
  源码：
    ios-desktop/apps/weather/index.html:608  const LOC_KEY = 'md3_weather_loc_v1';
    scripts/e2e-v181-batch2.mjs:122  saved: JSON.parse(localStorage.getItem('md3_weather_loc_v1') || '{}').src,
  测试：
    tests/batch2.test.js:116  expect(WEATHER).toMatch(/md3_weather_loc_v1/);

## md3_weather_relocate_min_v1  [constant]  源码 2 处 / 测试 1 处
  注记：应用域裸键 → 建议 ios-desktop:<app>-*（#178 数据孤岛维度）
  源码：
    ios-desktop/apps/weather/index.html:640  const REFRESH_KEY = 'md3_weather_relocate_min_v1';
    scripts/e2e-v181-batch2.mjs:110  saved: localStorage.getItem('md3_weather_relocate_min_v1'),
  测试：
    tests/batch2.test.js:104  expect(WEATHER).toMatch(/md3_weather_relocate_min_v1/);

## md3.tbTransientEdu  [constant]  源码 3 处 / 测试 3 处
  注记：点分命名（taskbar-transient）→ 建议 ios-desktop:*
  源码：
    ios-desktop/js/taskbar-transient.js:61  const EDU_KEY = 'md3.tbTransientEdu';
    scripts/e2e-v862-taskbar-transient.mjs:189  edu: window.localStorage.getItem('md3.tbTransientEdu'),
    scripts/e2e-v862-taskbar-transient.mjs:208  edu: window.localStorage.getItem('md3.tbTransientEdu'),
  测试：
    tests/taskbar-transient.test.js:39  try { W.localStorage.removeItem('md3.tbTransientEdu'); } catch (e) { /* 忽略 */ }
    tests/taskbar-transient.test.js:401  expect(W.localStorage.getItem('md3.tbTransientEdu')).toBe('1');
    tests/v283-storage-keys.test.js:72  expect(names).toContain('md3.tbTransientEdu');

## media-output:active  [constant]  源码 2 处 / 测试 2 处
  注记：孤儿前缀 media-output:（volume-dialog 域）→ 建议 ios-desktop:media-output:*
  源码：
    ios-desktop/js/volume-dialog.js:154  const MO_ACTIVE_KEY = 'media-output:active';
    scripts/e2e-v92-media-output.mjs:84  stored: localStorage.getItem('media-output:active'),
  测试：
    tests/media-output.test.js:201  expect(localStorage.getItem('media-output:active')).toBe(btBtn.getAttribute('data-device'));
    tests/v283-storage-keys.test.js:69  expect(names).toContain('media-output:active');

## media-output:spatial  [constant]  源码 3 处 / 测试 1 处
  注记：孤儿前缀 media-output:（volume-dialog 域）→ 建议 ios-desktop:media-output:*
  源码：
    ios-desktop/js/volume-dialog.js:155  const MO_SPATIAL_KEY = 'media-output:spatial';
    scripts/e2e-v92-media-output.mjs:106  const on = sw.getAttribute('aria-checked') === 'true' && localStorage.getItem('media-output:spatial') === '1';
    scripts/e2e-v92-media-output.mjs:109  return { on, offStored: localStorage.getItem('media-output:spatial') };
  测试：
    tests/media-output.test.js:215  expect(localStorage.getItem('media-output:spatial')).toBe('1');

## memos  [direct]  源码 4 处 / 测试 18 处
  注记：应用域裸键 → 建议 ios-desktop:<app>-*（#178 数据孤岛维度）
  源码：
    ios-desktop/apps/notes/index.html:145  let memos = JSON.parse(localStorage.getItem('memos')) || window.__notesCore.defaultSeed();
    ios-desktop/apps/notes/index.html:157  const save = () => { localStorage.setItem('memos', JSON.stringify(memos)); };
    ios-desktop/apps/notes/index.html:399  memos = JSON.parse(localStorage.getItem('memos')) || memos;
    ios-desktop/js/storage-stats.js:27  ['memos', 'notes'],
  测试：
    tests/destructive-guard.test.js:51  expect(seg).toContain('memos.filter(x=>x.id!==id); render();');
    tests/destructive-guard.test.js:52  expect(seg).not.toMatch(/memos\.filter\(x=>x\.id!==id\); save\(\);/); // 窗口内 save 回归即红
    tests/destructive-guard.test.js:60  expect(seg).toContain('memos.splice(Math.min(idx, memos.length), 0, m)');
    tests/m3e-theme-pull-stretch.test.js:153  ['notes', 'apps/notes/index.html', ['_shared/m3e-mini.js', '_shared/m3e-pull.js', "localStorage.getItem('memos')"]],
    tests/v219-app-data-registry.test.js:66  expect(registryJs).not.toContain("['memos', 'notes']");
    tests/v219-app-data-registry.test.js:97  expect(ownerOfLs('memos')).toBe('notes');
    tests/v219-app-data-registry.test.js:114  const ls = makeLs({ memos: 'a' });
    tests/v219-app-data-registry.test.js:126  'memos': 'note1', 'md3_groups': 'g1', 'md3_tasks': 't1',
    tests/v219-app-data-registry.test.js:132  expect(notes.ls).toEqual(['memos']);
    tests/v219-app-data-registry.test.js:146  'memos': 'my-note', 'ios-desktop:theme-hue': '200', 'unknown_key': 'keep-me',
    tests/v219-app-data-registry.test.js:152  expect(snap.ls).toEqual({ memos: 'my-note' });
    tests/v219-app-data-registry.test.js:155  expect(ls.getItem('memos')).toBeNull();
    tests/v219-app-data-registry.test.js:164  const ls = makeLs({ memos: 'my-note' });
    tests/v219-app-data-registry.test.js:169  expect(ls.getItem('memos')).toBeNull();
    tests/v219-app-data-registry.test.js:172  expect(ls.getItem('memos')).toBe('my-note');
    tests/v286-refonly-core.test.js:549  const memosLike = [C, A, D, B]; // 本体零变异：render 消费 filterMemos 新数组
    tests/v286-refonly-core.test.js:550  const renderList = ncore.sortMemos(ncore.filterMemos(memosLike, 'all', ''));
    tests/v286-refonly-core.test.js:551  expect(memosLike.map((m) => m.id)).toEqual([3, 1, 4, 2]);

## ocr-res-font-v1  [constant]  源码 2 处 / 测试 2 处
  注记：裸键 → 建议 ios-desktop:*
  源码：
    ios-desktop/apps/ocr/app.mjs:424  var KEY = 'ocr-res-font-v1';
    scripts/e2e-v181-batch4.mjs:61  saved: localStorage.getItem('ocr-res-font-v1'),
  测试：
    tests/batch4.test.js:85  it('结果字号带手柄：.mdslider 0.85–1.3× → --res-font-scale 乘算 .oc-res-area + --p 同步 + localStorage ocr-res-font-v1', () => {
    tests/batch4.test.js:88  expect(APP).toMatch(/var KEY = 'ocr-res-font-v1';/);

## one_handed_timeout_v1  [constant]  源码 1 处 / 测试 2 处
  注记：裸键 → 建议 ios-desktop:*
  源码：
    ios-desktop/js/one-handed.js:35  const TIMEOUT_STORAGE_KEY = 'one_handed_timeout_v1';
  测试：
    tests/one-handed.test.js:208  it('持久化键 one_handed_timeout_v1（Settings.Secure.ONE_HANDED_MODE_TIMEOUT 同构）', () => {
    tests/one-handed.test.js:209  expect(js).toContain("'one_handed_timeout_v1'");

## rippleCfg_v1  [constant]  源码 2 处 / 测试 0 处
  注记：裸键 → 建议 ios-desktop:*
  源码：
    ios-desktop/js/apps/settings-ripple.js:15  const RIPPLE_CFG_KEY = 'rippleCfg_v1';
    ios-desktop/js/charging-ripple.js:181  const RIPPLE_CFG_KEY = 'rippleCfg_v1';

## sttHistory  [constant]  源码 2 处 / 测试 3 处
  注记：应用域裸键 → 建议 ios-desktop:<app>-*（#178 数据孤岛维度）
  源码：
    ios-desktop/apps/stt/index.html:548  var ST_HIST_KEY = 'sttHistory';
    scripts/e2e-v177-text-bridge.mjs:90  const raw = JSON.parse(localStorage.getItem('sttHistory') || '[]');
  测试：
    tests/text-bridge.test.js:4  //   1. stt：会话级历史三通道（localStorage sttHistory / VFS /documents/stt-history.json 镜像 /
    tests/text-bridge.test.js:19  it('历史引擎在库：ST_HIST_KEY=sttHistory + VFS 镜像路径 + fsCall 桥（FS_REQUEST/FS_RESULT 同款）', () => {
    tests/text-bridge.test.js:20  expect(src).toContain("var ST_HIST_KEY = 'sttHistory'");

## threes_hi  [direct]  源码 3 处 / 测试 0 处
  注记：游戏域裸键（#286 ref 池应用）→ 建议 ios-desktop:<app>-*
  源码：
    ios-desktop/apps/threes/index.html:388  constructor() { this.hi = +(localStorage.getItem('threes_hi') || 0); this.init(); }
    ios-desktop/apps/threes/index.html:657  game.hi = game.score; localStorage.setItem('threes_hi', game.hi);
    ios-desktop/js/storage-stats.js:36  ['threes_hi', 'threes'],

## threes_records  [direct]  源码 8 处 / 测试 1 处
  注记：游戏域裸键（#286 ref 池应用）→ 建议 ios-desktop:<app>-*
  源码：
    ios-desktop/apps/threes/index.html:646  const records = JSON.parse(localStorage.getItem('threes_records') || '[]');
    ios-desktop/apps/threes/index.html:649  localStorage.setItem('threes_records', JSON.stringify(records));
    ios-desktop/apps/threes/index.html:786  const records = JSON.parse(localStorage.getItem('threes_records') || '[]');
    ios-desktop/apps/threes/index.html:800  $('#clearStatsBtn').onclick = () => { if (confirm('确定清空记录吗？')) { localStorage.removeItem('threes_records'); $('#histBtn').click(); refreshSidePanel();
    ios-desktop/apps/threes/index.html:882  const local = JSON.parse(localStorage.getItem('threes_records') || '[]');
    ios-desktop/apps/threes/index.html:892  localStorage.setItem('threes_records', JSON.stringify(local.slice(0, 50)));
    ios-desktop/apps/threes/index.html:900  const records = JSON.parse(localStorage.getItem('threes_records') || '[]');
    ios-desktop/js/storage-stats.js:37  ['threes_records', 'threes'],
  测试：
    tests/batch12.test.js:84  expect(HTML).toContain("localStorage.getItem('threes_records')");

## translationHistory  [direct]  源码 7 处 / 测试 2 处
  注记：应用域裸键 → 建议 ios-desktop:<app>-*（#178 数据孤岛维度）
  源码：
    ios-desktop/apps/translate/index.html:909  let history = JSON.parse(localStorage.getItem('translationHistory') || '[]');
    ios-desktop/apps/translate/index.html:1137  localStorage.setItem('translationHistory', JSON.stringify(history));
    ios-desktop/apps/translate/index.html:1422  localStorage.removeItem('translationHistory');
    ios-desktop/apps/translate/index.html:1489  history = JSON.parse(localStorage.getItem('translationHistory') || '[]');
    ios-desktop/apps/translate/index.html:1550  try { localStorage.setItem('translationHistory', JSON.stringify(history)); } catch (e) {}
    ios-desktop/js/storage-stats.js:33  ['translationHistory', 'translate'],
    scripts/e2e-v177-text-bridge.mjs:121  const raw = JSON.parse(localStorage.getItem('translationHistory') || '[]');
  测试：
    tests/m3e-theme-pull-stretch.test.js:157  ['translate', 'apps/translate/index.html', ['_shared/m3e-pull.js', 'translationHistory', 'renderHistory()']],
    tests/text-bridge.test.js:55  expect(src).toContain("localStorage.setItem('translationHistory'"); // 既有存储保持

## typing.best.v1  [constant]  源码 1 处 / 测试 2 处
  注记：点分命名（typing 应用）→ 建议 ios-desktop:typing-*
  源码：
    ios-desktop/apps/typing/index.html:222  var BEST_KEY = 'typing.best.v1';
  测试：
    tests/typing.test.js:175  'id="panel"', 'id="chipBest"', 'id="chipReset"', '__typingUI', 'typing.best.v1', 'id="freeText"']) {
    tests/v283-storage-keys.test.js:70  expect(names).toContain('typing.best.v1');

## typing.fontsize.v1  [constant]  源码 1 处 / 测试 0 处
  注记：点分命名（typing 应用）→ 建议 ios-desktop:typing-*
  源码：
    ios-desktop/apps/typing/index.html:421  var FONT_KEY = 'typing.fontsize.v1';

## vd.safety.confirmed  [constant]  源码 4 处 / 测试 4 处
  注记：点分命名（volume-dialog）→ 建议 ios-desktop:vd-* 或并入 media-output 组
  源码：
    ios-desktop/js/volume-dialog.js:85  const SAFETY_CONFIRMED_KEY = 'vd.safety.confirmed';
    scripts/e2e-v117-audio-graph.mjs:62  sessionStorage.setItem('vd.safety.confirmed', '1');
    scripts/e2e-v117-audio-graph.mjs:84  sessionStorage.setItem('vd.safety.confirmed', '1');
    scripts/e2e-v193-volume-safety.mjs:50  confirmed: sessionStorage.getItem('vd.safety.confirmed') === '1',
  测试：
    tests/v283-storage-keys.test.js:71  expect(names).toContain('vd.safety.confirmed');
    tests/volume-safety.test.js:175  expect(vd).toContain("const SAFETY_CONFIRMED_KEY = 'vd.safety.confirmed';");
    tests/volume-safety.test.js:206  try { sessionStorage.removeItem('vd.safety.confirmed'); } catch { /* noop */ }
    tests/volume-safety.test.js:241  expect(sessionStorage.getItem('vd.safety.confirmed')).toBe('1');

## visited  [direct]  源码 6 处 / 测试 11 处
  注记：应用域裸键 → 建议 ios-desktop:<app>-*（#178 数据孤岛维度）
  源码：
    ios-desktop/apps/_shared/vendor/codemirror-bundle.mjs:25  }`,{label:"class",detail:"definition",type:"keyword"}),J('import {${names}} from "${module}"\n${}',{label:"import",detail:"named",type:"keyword"}),J('
    ios-desktop/apps/_shared/vendor/highlight.min.js:318  }),re=["a","abbr","address","article","aside","audio","b","blockquote","body","button","canvas","caption","cite","code","dd","del","details","dfn","di
    ios-desktop/apps/translate/index.html:1453  if (!localStorage.getItem('visited')) {
    ios-desktop/apps/translate/index.html:1456  if (sourceText.value) { localStorage.setItem('visited', '1'); return; }
    ios-desktop/apps/translate/index.html:1460  localStorage.setItem('visited', '1');
    ios-desktop/js/storage-stats.js:35  ['visited', 'translate'],
  测试：
    tests/import-graph.test.js:142  expect(r.visited).toEqual(['ios-desktop/apps/clock-app/alarm.mjs']);
    tests/import-graph.test.js:148  test('C2 补齐后闭包收敛（目标在集内 → 零 missing + 目标入 visited）', () => {
    tests/import-graph.test.js:159  expect(r.visited).toContain('ios-desktop/js/aosp/alarm-ringtone.js');
    tests/import-graph.test.js:162  test('C3 链式发散（a→b→c 三跳全部入 visited）', () => {
    tests/import-graph.test.js:170  expect(r.visited).toEqual(['a.js', 'b.js', 'c.js']);
    tests/import-graph.test.js:180  expect(r.visited).toEqual(['a.js', 'b.js']);
    tests/import-graph.test.js:190  expect(r.visited).toContain('peer.js');
    tests/import-graph.test.js:196  expect(r1.visited).toEqual([]);
    tests/import-graph.test.js:198  expect(r2.visited).toEqual(['ghost.js']);
    tests/import-graph.test.js:223  // app.mjs（alarm.mjs 的兄弟依赖）置空内容：入 visited 不发散，测域聚焦根因文件
    tests/import-graph.test.js:231  expect(r.visited).toContain('ios-desktop/js/aosp/alarm-ringtone.js');

## wallpaper-video-blob  [constant]  源码 3 处 / 测试 0 处
  注记：裸键 → 建议 ios-desktop:*
  源码：
    ios-desktop/js/procedural-wallpaper.js:385  if (idbAvailable()) idbDel('wallpaper-video-blob');
    ios-desktop/js/storage-stats.js:56  ['wallpaper-video-blob', '__system'],
    ios-desktop/js/video-wallpaper.js:32  export const VIDEO_IDB_KEY = 'wallpaper-video-blob';
