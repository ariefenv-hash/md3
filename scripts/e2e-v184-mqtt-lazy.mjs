// ==================== e2e-v184-mqtt-lazy.mjs — #184 MQTT 库懒加载 e2e（v9.69） ====================
// Q1 初始加载：messages 打开后 mqtt.min.js 零请求（329KB 不再同步预下载）
// Q2 打开联机房间弹窗（openRoomModal）不触发库加载（仍 0 请求）
// Q3 真实创建房间（createRoom → connectAndJoin → ensureMqtt）→ mqtt.min.js 动态注入真加载（≥1 请求 + 全局就绪）
// Q4 并发收敛：二次触发 ensureMqtt 不重复注入（script[src="mqtt.min.js"] 恰 1 个）
// Q5 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8989;
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
// 外域全拦（含 Google Fonts 与 wss broker——e2e 只验证懒加载时序，不验证公网连通）
await page.route(/^(?!http:\/\/127\.0\.0\.1)/, (r) => r.abort());

const mqttRequests = [];
page.on('request', (req) => { if (req.url().includes('mqtt.min.js')) mqttRequests.push(req.url()); });

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

  // Q1 打开 messages：mqtt.min.js 零请求
  await openById('msg');
  const frame = await waitFrame('apps/messages/index.html');
  await sleep(1000);
  A('Q1 messages 打开后 mqtt.min.js 零请求（329KB 不再同步预下载）', frame && mqttRequests.length === 0, `requests=${mqttRequests.length}`);

  // Q2 打开联机房间弹窗：不触发库加载
  const q2 = frame ? await frame.evaluate(() => {
    const btn = document.querySelector('button[onclick="openRoomModal()"]');
    if (!btn) return { found: false };
    btn.click();
    const modal = document.getElementById('roomModal');
    return { found: true, open: !!(modal && modal.classList.contains('open')) };
  }) : { found: false };
  await sleep(800);
  A('Q2 打开房间弹窗不触发库加载（modal open + 仍 0 请求）', q2.found && q2.open && mqttRequests.length === 0,
    `modal=${q2.open} requests=${mqttRequests.length}`);

  // Q3 真实创建房间：填昵称 → 点创建 → gate 动态注入 → mqtt.min.js 真加载
  const q3 = frame ? await frame.evaluate(() => {
    document.getElementById('roomNickInput').value = 'e2e 墨客';
    const btn = document.querySelector('button[onclick="createRoom()"]');
    if (!btn) return { found: false };
    btn.click();
    return { found: true };
  }) : { found: false };
  await sleep(2000);
  const libReady = frame ? await frame.evaluate(() => typeof window.mqtt !== 'undefined' && !!document.querySelector('script[src="mqtt.min.js"]')) : false;
  A('Q3 创建房间触发懒加载：mqtt.min.js 真请求 + 全局就绪 + <script> 注入', q3.found && mqttRequests.length >= 1 && libReady,
    `requests=${mqttRequests.length} libReady=${libReady}`);

  // Q4 并发收敛：二次触发不重复注入
  const q4 = frame ? await frame.evaluate(async () => {
    const before = document.querySelectorAll('script[src="mqtt.min.js"]').length;
    await new Promise((res) => ensureMqtt(() => res()));
    const after = document.querySelectorAll('script[src="mqtt.min.js"]').length;
    return { before, after };
  }) : {};
  A('Q4 二次 ensureMqtt 并发收敛（script 标签保持恰 1 个）', q4.before === 1 && q4.after === 1,
    `before=${q4.before} after=${q4.after}`);

  // Q5 零 pageerror
  A('Q5 全程零 pageerror', errors.length === 0, errors.slice(0, 2).join(' | '));
} catch (e) {
  console.log('FATAL', String(e));
  results.push([false, 'e2e 未完成（FATAL）', String(e)]);
} finally {
  await browser.close().catch(() => {});
  server.kill();
}
const pass = results.filter((r) => r[0]).length;
console.log(`\n===== e2e-v184: ${pass}/${results.length} =====`);
process.exit(pass === results.length ? 0 : 1);
