// ==================== e2e-v104-folder.mjs — #104 文件夹完整行为 e2e（Launcher3 folder/ 对标） ====================
//
// Q1 打开：点击桌面文件夹 → 面板展开 + 标题/网格 2 图标/「+」添加面齐备
// Q2 内联命名：点击标题 → .folder-title-input 现值全选 → 键入替换 → Enter 提交 →
//    标题 + 桌面标签 + localStorage 三面同步（FolderNameEditText 对标）
// Q3 空名守卫：清空 → Enter → 恢复原名称且不落盘（Launcher3 空输入恢复原名同律）
// Q4 Esc 取消：改名中 Esc → 恢复原名称不落盘
// Q5 自动排列：#folderSortBtn → zh-Hans-CN 拼音序（阿尔法 < 伽马）+ slot 重排落盘（FolderGridOrganizer 对标）
// Q6 「+」添加区：添加面候选 = 桌面条目 − 文件夹成员（文件夹本体不出现）→ 点击收编 →
//    网格 +1 / 桌面 -1 / localStorage 同步
// Q7 添加面 Esc 收口 + 关闭按钮 + aria 标注齐备（role=dialog / aria-label）
// Q8 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8994;
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
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
let pageErrors = 0;
page.on('pageerror', (e) => { pageErrors++; console.log('[pageerror]', String(e).slice(0, 200)); });
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await sleep(2500);
// 首启弹窗一次性放行（v105 同款）
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await sleep(1000);

// 种子：data-version 门控双写（loadPagesApps 版本闸）——文件夹(伽马/阿尔法) + 天气/音乐 + 页 2 记事本
await page.evaluate(() => {
  localStorage.setItem('ios-desktop:data-version', 'v7_2026_08_16_threes_dice_flow11_parallel');
  localStorage.setItem('ios-desktop:pages-apps', JSON.stringify([
    [
      { id: 'folder_t1', type: 'folder', name: '整理', slot: 0, apps: [
        { id: 'clock', name: '伽马', slot: 0 },
        { id: 'calculator', name: '阿尔法', slot: 1 },
      ] },
      { id: 'weather', name: '天气', slot: 1 },
      { id: 'music', name: '音乐', slot: 2 },
    ],
    [],
    [{ id: 'notes', name: '记事本', slot: 0 }],
  ]));
});
await page.reload({ waitUntil: 'domcontentloaded' });
await sleep(2200);

// Q1 打开文件夹
await page.evaluate(() => document.querySelector('#desktopSlider .app-folder[data-id="folder_t1"]').click());
await sleep(700);
const q1 = await page.evaluate(() => ({
  active: document.getElementById('folderOverlay').classList.contains('active'),
  title: document.getElementById('folderTitle').textContent,
  icons: document.querySelectorAll('#folderGrid .app-icon').length,
  addTile: !!document.querySelector('#folderGrid .folder-add-tile'),
  addTileAria: document.querySelector('#folderGrid .folder-add-tile')?.getAttribute('aria-label'),
}));
A('Q1 打开：面板展开 + 标题「整理」+ 网格 2 图标 + 「+」添加面（aria）',
  q1.active && q1.title === '整理' && q1.icons === 2 && q1.addTile && q1.addTileAria === '添加应用', JSON.stringify(q1));

// Q2 内联命名：点击标题 → 全选 → 键入替换 → Enter 提交
await page.click('#folderTitle');
await sleep(300);
const q2sel = await page.evaluate(() => {
  const i = document.querySelector('#folderTitle .folder-title-input');
  return i ? { present: true, value: i.value, s: i.selectionStart, e: i.selectionEnd } : { present: false };
});
await page.keyboard.type('工作集');
await page.keyboard.press('Enter');
await sleep(500);
const q2after = await page.evaluate(() => ({
  title: document.getElementById('folderTitle').textContent,
  inputGone: !document.querySelector('#folderTitle .folder-title-input'),
  deskLabel: document.querySelector('#desktopSlider .app-folder[data-id="folder_t1"] span')?.textContent,
  saved: JSON.parse(localStorage.getItem('ios-desktop:pages-apps'))[0][0].name,
}));
A('Q2a 内联命名：输入即现 + 现值全选（FolderNameEditText 对标）',
  q2sel.present && q2sel.value === '整理' && q2sel.s === 0 && q2sel.e === 2, JSON.stringify(q2sel));
A('Q2b Enter 提交：标题/桌面标签/落盘三面同步',
  q2after.title === '工作集' && q2after.inputGone && q2after.deskLabel === '工作集' && q2after.saved === '工作集', JSON.stringify(q2after));

// Q3 空名守卫
await page.click('#folderTitle');
await sleep(300);
await page.keyboard.press('Backspace');
await page.keyboard.press('Enter');
await sleep(400);
const q3 = await page.evaluate(() => ({
  title: document.getElementById('folderTitle').textContent,
  saved: JSON.parse(localStorage.getItem('ios-desktop:pages-apps'))[0][0].name,
}));
A('Q3 空名守卫：清空提交 → 恢复原名不落盘', q3.title === '工作集' && q3.saved === '工作集', JSON.stringify(q3));

// Q4 Esc 取消
await page.click('#folderTitle');
await sleep(300);
await page.keyboard.type('临时名');
await page.keyboard.press('Escape');
await sleep(400);
const q4 = await page.evaluate(() => ({
  title: document.getElementById('folderTitle').textContent,
  saved: JSON.parse(localStorage.getItem('ios-desktop:pages-apps'))[0][0].name,
}));
A('Q4 Esc 取消：恢复原名不落盘', q4.title === '工作集' && q4.saved === '工作集', JSON.stringify(q4));

// Q5 自动排列（按名称，zh 拼音序：阿尔法 < 伽马）
await page.evaluate(() => document.getElementById('folderSortBtn').click());
await sleep(400);
const q5 = await page.evaluate(() => ({
  order: [...document.querySelectorAll('#folderGrid .app-icon')].map((el) => el.dataset.appId),
  slots: JSON.parse(localStorage.getItem('ios-desktop:pages-apps'))[0][0].apps.map((a) => `${a.id}:${a.slot}`),
}));
A('Q5 自动排列：网格序 阿尔法(calculator)→伽马(clock) + slot 重编落盘',
  JSON.stringify(q5.order) === '["calculator","clock"]' && JSON.stringify(q5.slots) === '["calculator:0","clock:1"]', JSON.stringify(q5));

// Q6 「+」添加区：候选=桌面条目−文件夹成员
await page.evaluate(() => document.querySelector('#folderGrid .folder-add-tile').click());
await sleep(300);
const q6open = await page.evaluate(() => {
  const sheet = document.getElementById('folderAddSheet');
  return {
    visible: sheet && !sheet.hidden,
    role: sheet?.getAttribute('role'),
    aria: sheet?.getAttribute('aria-label'),
    items: [...document.querySelectorAll('#folderAddGrid .folder-add-item')].map((el) => el.dataset.id),
  };
});
A('Q6a 添加面：可见 + role=dialog + aria + 种子候选在列 + 文件夹成员/本体排除（开机补位后候选为全量−成员，故按成员资格断言）',
  q6open.visible && q6open.role === 'dialog' && q6open.aria === '添加应用到文件夹'
  && ['weather', 'music', 'notes'].every((id) => q6open.items.includes(id))
  && ['clock', 'calculator', 'folder_t1'].every((id) => !q6open.items.includes(id)), JSON.stringify({ ...q6open, items: q6open.items.length }));

await page.evaluate(() => document.querySelector('#folderAddGrid .folder-add-item[data-id="weather"]').click());
await sleep(400);
const q6after = await page.evaluate(() => ({
  hidden: document.getElementById('folderAddSheet').hidden,
  icons: document.querySelectorAll('#folderGrid .app-icon').length,
  deskWeather: document.querySelectorAll('#desktopSlider .app-icon[data-id="weather"]').length,
  folderApps: JSON.parse(localStorage.getItem('ios-desktop:pages-apps'))[0][0].apps.map((a) => a.id),
}));
A('Q6b 收编天气：网格 3 图标 / 桌面剔除 / 落盘 apps 3 项',
  q6after.hidden && q6after.icons === 3 && q6after.deskWeather === 0
  && JSON.stringify(q6after.folderApps) === '["calculator","clock","weather"]', JSON.stringify(q6after));

// Q7 添加面 Esc 收口 + 关闭按钮
await page.evaluate(() => document.querySelector('#folderGrid .folder-add-tile').click());
await sleep(200);
await page.keyboard.press('Escape');
await sleep(200);
const escClosed = await page.evaluate(() => document.getElementById('folderAddSheet').hidden);
await page.evaluate(() => document.querySelector('#folderGrid .folder-add-tile').click());
await sleep(200);
await page.evaluate(() => document.getElementById('folderAddClose').click());
await sleep(200);
const btnClosed = await page.evaluate(() => document.getElementById('folderAddSheet').hidden);
const q7aria = await page.evaluate(() => ({
  sortAria: document.getElementById('folderSortBtn')?.getAttribute('aria-label'),
  closeAria: document.getElementById('folderAddClose')?.getAttribute('aria-label'),
}));
A('Q7 添加面收口：Esc + 关闭按钮双通道 + 排序/关闭钮 aria',
  escClosed && btnClosed && q7aria.sortAria === '按名称自动排列' && q7aria.closeAria === '关闭添加面板', JSON.stringify({ escClosed, btnClosed, ...q7aria }));

// Q8 零 pageerror
A('Q8 全程零 pageerror', pageErrors === 0, `errors=${pageErrors}`);

await browser.close();
server.kill();
const fail = results.filter(([c]) => !c).length;
console.log(`\n=== e2e-v104: ${results.length - fail}/${results.length} ${fail ? 'FAIL' : 'ALL PASS'} ===`);
process.exit(fail ? 1 : 0);
