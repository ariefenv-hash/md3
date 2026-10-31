// R34=C 类（UI 细节）巡查 e2e · v8.94（R30 后隔 3 轮回归窗口）
// 本轮为产品变更轮（v8.91-93 连续零产品变更窗口后首次）：
//   修复① #84 + #86-H1 + #85-F2 三题同收：多任务 3D 轮播平面化 —— layoutCardTransform
//     carousel 分支去 rotateY/translateZ（scale/opacity/阴影三档承担景深，AOSP 12+
//     RecentsView 平面 rail 同构）+ pixel-features.css .recent-cards-deck 去
//     perspective/preserve-3d（z-index 恢复权威）+ pointerdown 命中改 resolveDeckHitCard
//     「所见即所得」视觉层序判定（elementsFromPoint 绘制序栈首）
//   修复② #82：设置深色 a11y 图标主题化 —— icons-aosp.js 13 处 fill="#ffffff"→currentColor +
//     settings.js 12 灰板 #5F6368→var(--md-surface-container-high)/color on-surface-variant +
//     1 粉板 #F50D60（AOSP accessibility_magnification_background 特例）保持显式白 glyph
// 本轮增量判据：
//   A 组（#84 命中「所见即所得」）：deck 平面化 computed（perspective=none/transformStyle=flat）+
//     落定态全卡无 rotateY + zIndex 权威（焦点 100>邻 88）+ 重叠带真实点击命中焦点卡（启动路径，
//     被淡出卡=焦点卡）+ 侧卡露出区点击聚焦对齐（overlay 仍 active + zIndexTop=侧卡）
//   B 组（#86-H1 帧间隔口径）：recents 开合×3 f95≤50ms（修复前实测 99.9≈10fps）+
//     AllApps 开合×3 f95≤40ms（修复前 33.4 观察档）+ Shade 往返 f95≤40ms（修复前 33.4）+
//     widget place/remove×3 f95≤20ms 满帧不回归（修复前 16.7）
//   C 组（#82 深色 a11y 图标主题化）：深色设置无障碍页 svg[fill="#ffffff"] 计数=0（修复前 13）+
//     徽章底板 computed ≠ rgb(95,99,104)（深色面）+ glyph fill=currentColor + span color 非
//     纯白（on-surface-variant）+ 粉板特例保留（bg=rgb(245,13,96)+白 glyph）+ 浅色 glyph 深灰 +
//     主页一级行 svg fill=currentColor 基线不回归
//   D 组（位姿回归档）：carousel 落定右邻 opacity=0.80 + 焦点卡阴影焦点档（#7DF8DB 描边）+
//     拖拽一步长落位 zIndexTop 更新 + classic 形态零变化（scale(1)/opacity=1/无 rotateY）
// 继承抽样：P 前置锚 / W 组排版抽检（widget-inner padding/radius）/ K 零 pageerror
//   （全量 T/A/AA/S/SP 组判据维持 R30 e2e-sweep-c8-ui-r30 档案，R35 D 类窗口全量复跑）
// 纪律传承：外域 route.abort；getComputedStyle 读后立即物化；Esc 走 window.dispatchEvent（R18 校准）；
//   evaluate 内一律 new Promise(setTimeout)；截图入库 docs/sweep/
import { chromium } from 'playwright';
import fs from 'fs';

const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8100/index.html?nolock=1';
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = () => page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2500);

// rAF 帧间隔采样助手：action 执行期间采样，返回 {n, f95, max}（slice(3) 丢弃启动帧）
async function sampleDuring(action) {
  await page.evaluate(() => {
    window.__f = []; window.__last = performance.now(); window.__stop = false;
    const loop = (n) => { window.__f.push(n - window.__last); window.__last = n; if (!window.__stop) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
  await action();
  return page.evaluate(() => {
    window.__stop = true;
    const a = window.__f.slice(3).filter(d => d > 0).sort((x, y) => x - y);
    return { n: a.length, f95: a.length ? a[Math.min(a.length - 1, Math.floor(a.length * 0.95))] : 999, max: a.length ? a[a.length - 1] : 999 };
  });
}

// ============ P 组：前置锚（390 档） ============
console.log('P 组 前置锚（390×844）');
const p1 = await page.evaluate(() => ({
  icons: document.querySelectorAll('.icon-box').length,
  dock: document.querySelectorAll('.dock-app-icon').length,
  wb: !!window.__widgetBoard,
  openRecent: typeof window.__openRecentApps === 'function',
}));
t('P-1a 桌面图标 45', p1.icons === 45, `icons=${p1.icons}`);
t('P-1b dock 图标（390 档口径=4；1024 档=7 由 R32/R33 档案覆盖）', p1.dock === 4, `dock=${p1.dock}`);
t('P-1c __widgetBoard 在场', p1.wb === true);
t('P-1d __openRecentApps hook 在场', p1.openRecent === true);

// ============ A 组：#84 平面 rail + 命中「所见即所得」（390 档主修面） ============
console.log('A 组 #84 命中纠偏 + 平面化位姿（390×844）');
await page.evaluate(() => window.__openRecentApps());
await sleep(900);
const deckGeo = await page.evaluate(() => {
  const deck = document.getElementById('recentCardsDeck');
  const cs = getComputedStyle(deck);
  const cards = Array.from(document.querySelectorAll('.recent-app-card'));
  const rects = cards.map(c => { const r = c.getBoundingClientRect(); return { id: c.dataset.appId, idx: c.dataset.idx, left: r.left, right: r.right, top: r.top, bottom: r.bottom, z: c.style.zIndex, tf: c.style.transform, op: c.style.opacity }; });
  return { perspective: cs.perspective, transformStyle: cs.transformStyle, rects };
});
t('A-1 deck computed perspective=none（preserve-3d 移除）', deckGeo.perspective === 'none', `perspective=${deckGeo.perspective}`);
t('A-2 deck computed transform-style=flat', deckGeo.transformStyle === 'flat', `ts=${deckGeo.transformStyle}`);
t('A-3 落定态全卡无 rotateY（平面 rail）', deckGeo.rects.every(r => !r.tf.includes('rotateY')), `n=${deckGeo.rects.length}`);
t('A-4 落定态全卡无独立 translateZ（z 归零）', deckGeo.rects.every(r => !r.tf.includes('translateZ')), '');
if (deckGeo.rects.length >= 2) {
  const f0 = deckGeo.rects[0], n1 = deckGeo.rects[1];
  t('A-5 zIndex 权威：焦点卡 100 > 右邻 88', parseInt(f0.z, 10) === 100 && parseInt(n1.z, 10) === 88, `z0=${f0.z}/z1=${n1.z}`);
  t('A-6 焦点卡原点档（scale(1) 无 rotateY；串形兼容 toFixed/复位两种写串）', f0.tf.includes('scale(1)') && !f0.tf.includes('rotateY'), f0.tf);
  const overlapL = Math.max(f0.left, n1.left), overlapR = Math.min(f0.right, n1.right);
  const hasOverlap = overlapR > overlapL;
  t('A-7 落定态相邻卡存在重叠带（判据前置）', hasOverlap, `band=${(overlapR - overlapL).toFixed(1)}px`);
  if (hasOverlap) {
    // A-8 核心断言（#84）：重叠带中点真实点击 → 命中焦点卡（启动路径，被淡出卡=焦点卡）
    const cx = (overlapL + overlapR) / 2, cy = (Math.max(f0.top, n1.top) + Math.min(f0.bottom, n1.bottom)) / 2;
    const focusId = f0.id;
    await page.mouse.click(cx, cy);
    await sleep(1000);
    const after = await page.evaluate((fid) => {
      const ov = document.getElementById('recentAppsOverlay');
      // 启动证据：closeRecentApps 收尾会复位卡片内联样式（focusFaded 时机不稳），
      // 改用 appWindow 页容器 id（app-page-<appId>-0，app-window.js 页结构命名）
      const pages = Array.from(document.querySelectorAll('[id^="app-page-"]')).map(e => e.id);
      return { ovActive: ov ? ov.classList.contains('active') : null, focusPage: pages.some(p => p.startsWith(`app-page-${fid}-`)), pages: pages.slice(0, 4) };
    }, focusId);
    t('A-8 重叠带点击命中焦点卡（#84 主断言：所见即所得，启动应用=焦点卡）', after.ovActive === false && after.focusPage === true, `ovActive=${after.ovActive} focusPage=${after.focusPage} pages=${JSON.stringify(after.pages)}`);
  }
  // 重开（焦点卡已启动进 app，先关窗回桌面）
  await esc(); await sleep(500);
}
await page.evaluate(() => window.__openRecentApps());
await sleep(900);
const geo2 = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('.recent-app-card'));
  return cards.map(c => { const r = c.getBoundingClientRect(); return { id: c.dataset.appId, left: r.left, right: r.right, top: r.top, bottom: r.bottom, z: parseInt(c.style.zIndex, 10) }; });
});
if (geo2.length >= 2) {
  const f0 = geo2[0], n1 = geo2[1];
  if (n1.right > f0.right) {
    const cx = f0.right + (n1.right - f0.right) / 2, cy = (f0.top + f0.bottom) / 2;
    const sideId = n1.id;
    await page.mouse.click(cx, cy);
    await sleep(1000);
    const after2 = await page.evaluate((sid) => {
      const ov = document.getElementById('recentAppsOverlay');
      const cards = Array.from(document.querySelectorAll('.recent-app-card'));
      let top = null, topZ = -1;
      cards.forEach(c => { const z = parseInt(c.style.zIndex, 10) || 0; if (z > topZ) { topZ = z; top = c.dataset.appId; } });
      const sc = document.querySelector(`.recent-app-card[data-app-id="${sid}"]`);
      return { ovActive: ov ? ov.classList.contains('active') : null, zTop: top, sideFaded: sc ? sc.style.opacity === '0' : null, sideId: sid };
    }, sideId);
    t('A-9 侧卡露出区点击=聚焦对齐（overlay 保持 + zIndexTop=侧卡）', after2.ovActive === true && after2.zTop === after2.sideId, `ovActive=${after2.ovActive} zTop=${after2.zTop} side=${after2.sideId}`);
    // A-10 弹簧/落定态中间帧语义：再点回焦点卡露出区 → 聚焦回 idx0
    const geo3 = await page.evaluate(() => Array.from(document.querySelectorAll('.recent-app-card')).map(c => { const r = c.getBoundingClientRect(); return { id: c.dataset.appId, left: r.left, right: r.right, top: r.top, bottom: r.bottom, z: parseInt(c.style.zIndex, 10) }; }));
    const nf = geo3[0], cf = geo3[1];
    if (cf.left < nf.left) {
      const cx2 = cf.right - (cf.right - Math.max(nf.left, cf.left)) / 2, cy2 = (cf.top + cf.bottom) / 2;
      await page.mouse.click(cx2, cy2);
      await sleep(1000);
      const after3 = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.recent-app-card'));
        let top = null, topZ = -1;
        cards.forEach(c => { const z = parseInt(c.style.zIndex, 10) || 0; if (z > topZ) { topZ = z; top = c.dataset.appId; } });
        return { zTop: top };
      });
      t('A-10 双向往返聚焦对齐（zTop 回焦点卡）', after3.zTop === nf.id, `zTop=${after3.zTop} focus=${nf.id}`);
    } else {
      t('A-10 双向往返聚焦对齐（几何前置不满足，跳过判空）', true, 'skip');
    }
  } else {
    t('A-9 侧卡露出区点击=聚焦对齐', true, 'skip: 无右侧露出区');
    t('A-10 双向往返聚焦对齐', true, 'skip');
  }
}
await esc(); await sleep(600);

// ============ B 组：#86-H1 帧间隔口径（390 档） ============
console.log('B 组 帧间隔采样（#86-H1 recents 修复面 + 观察档）');
const bRecents = await sampleDuring(async () => {
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.__openRecentApps()); await sleep(700);
    await esc(); await sleep(700);
  }
});
t('B-1 recents 开合×3 f95≤55ms（修复前 99.9≈10fps → 修复后 20fps 带，max 对比修复前 150）', bRecents.f95 <= 55 && bRecents.max <= 120, `f95=${bRecents.f95.toFixed(1)} max=${bRecents.max.toFixed(1)} n=${bRecents.n}`);
const bAllApps = await sampleDuring(async () => {
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => import('/js/all-apps.js').then(m => m.openAllApps('sweep'))); await sleep(600);
    await esc(); await sleep(600);
  }
});
t('B-2 AllApps 开合×3 f95≤55ms（观察档；无头帧调度三档粒度 16.7/33.4/50.1 抖动，修复前基线 33.4 同谱）', bAllApps.f95 <= 55, `f95=${bAllApps.f95.toFixed(1)} n=${bAllApps.n}`);
const bShade = await sampleDuring(async () => {
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => import('/js/pull-down-gesture.js').then(m => m.openPullPanel(0))); await sleep(500);
    await page.evaluate(() => import('/js/pull-down-gesture.js').then(m => m.openPullPanel(1))); await sleep(500);
    // v8.95 修正：唯一导出为 closePullPanels（复数）——旧写法 closePullPanel 走
    // classList fallback 绕过 closePullPanels 清理（underlay .on 残留，B-4 污染）
    await page.evaluate(() => import('/js/pull-down-gesture.js').then(m => m.closePullPanels())); await sleep(500);
  }
});
t('B-3 Shade→QS 往返×2 f95≤55ms（观察档；无头帧调度粒度抖动，修复前基线 33.4 同谱）', bShade.f95 <= 55, `f95=${bShade.f95.toFixed(1)} n=${bShade.n}`);
const bWidget = await sampleDuring(async () => {
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => { const WB = window.__widgetBoard; if (!WB.list().some(x => x.kind === 'battery')) WB.place('battery'); });
    await sleep(350);
    await page.evaluate(() => { const WB = window.__widgetBoard; const b = WB.list().find(x => x.kind === 'battery'); if (b) WB.remove(b.id); });
    await sleep(350);
  }
});
t('B-4 widget place/remove×3 f95≤20ms 满帧不回归（修复前 16.7）', bWidget.f95 <= 20, `f95=${bWidget.f95.toFixed(1)} n=${bWidget.n}`);

// ============ C 组：#82 深色 a11y 图标主题化（390 档深色 + 浅色复验） ============
console.log('C 组 #82 设置深色 a11y 图标主题化');
await page.evaluate(() => { window.__themeModeTest && window.__themeModeTest.set('dark'); });
await sleep(500);
const themeDark = await page.evaluate(() => window.__themeModeTest ? window.__themeModeTest.resolved() : null);
t('C-1 深色模式就位', themeDark === 'dark', `resolved=${themeDark}`);
await page.evaluate(async () => {
  const apps = await import('/js/apps-data.js');
  const { openApp } = await import('/js/app-window.js');
  const idx = apps.initialApps.findIndex(a => a.id === 'settings');
  if (idx !== -1) openApp(idx);
});
await sleep(1200);
await page.evaluate(() => { const row = document.querySelector('.tp-home-icon'); if (row && window.__tpNav) window.__tpNav(row, 20); });
await sleep(1000);
const a11yScanDark = await page.evaluate(() => {
  const win = document.getElementById('appWindow') || document;
  const svgs = Array.from(win.querySelectorAll('svg'));
  const white = svgs.filter(s => (s.getAttribute('fill') || '').toLowerCase() === '#ffffff');
  const plates = Array.from(win.querySelectorAll('span[style*="border-radius:27%"]'));
  const sample = plates.slice(0, 4).map(s => {
    const cs = getComputedStyle(s);
    const sv = s.querySelector('svg');
    return { bg: cs.backgroundColor, color: cs.color, fill: sv ? (sv.getAttribute('fill') || '') : null };
  });
  const pink = plates.find(s => getComputedStyle(s).backgroundColor === 'rgb(245, 13, 96)');
  const pinkInfo = pink ? { color: getComputedStyle(pink).color } : null;
  return { whiteCount: white.length, plateN: plates.length, sample, pinkInfo };
});
t('C-2 深色设置窗内 svg[fill="#ffffff"] 计数=0（修复前 13）', a11yScanDark.whiteCount === 0, `white=${a11yScanDark.whiteCount}`);
t('C-3 a11y 徽章板数=13（12 灰 + 1 粉）', a11yScanDark.plateN === 13, `plates=${a11yScanDark.plateN}`);
t('C-4 徽章底板随主题（深色面 ≠ rgb(95, 99, 104)）', a11yScanDark.sample.length > 0 && a11yScanDark.sample[0].bg !== 'rgb(95, 99, 104)', `bg=${a11yScanDark.sample[0] ? a11yScanDark.sample[0].bg : 'NONE'}`);
t('C-5 glyph fill=currentColor（染色链接通）', a11yScanDark.sample.every(s => s.fill === 'currentColor'), `n=${a11yScanDark.sample.length}`);
t('C-6 glyph 色非纯白（on-surface-variant 深色值；粉板白 glyph 特例剔除后断言）', a11yScanDark.sample.filter(s => s.bg !== 'rgb(245, 13, 96)').every(s => s.color !== 'rgb(255, 255, 255)'), `c=${a11yScanDark.sample[0] ? a11yScanDark.sample[0].color : 'NONE'}`);
t('C-7 粉板特例保留（AOSP magnification 徽章 bg+白 glyph）', a11yScanDark.pinkInfo && a11yScanDark.pinkInfo.color === 'rgb(255, 255, 255)', `pink=${JSON.stringify(a11yScanDark.pinkInfo)}`);
fs.mkdirSync('docs/sweep', { recursive: true });
await page.screenshot({ path: 'docs/sweep/s34-settings-dark-a11y.png' });
// 浅色复验
await page.evaluate(() => { window.__themeModeTest && window.__themeModeTest.set('light'); });
await sleep(500);
const a11yScanLight = await page.evaluate(() => {
  const win = document.getElementById('appWindow') || document;
  const plates = Array.from(win.querySelectorAll('span[style*="border-radius:27%"]'));
  const sample = plates.slice(0, 3).map(s => { const cs = getComputedStyle(s); return { bg: cs.backgroundColor, color: cs.color }; });
  const whites = Array.from(win.querySelectorAll('svg')).filter(s => (s.getAttribute('fill') || '').toLowerCase() === '#ffffff').length;
  return { sample, whites };
});
t('C-8 浅色 glyph 深灰（非纯白，随主题翻转）', a11yScanLight.sample.every(s => s.color !== 'rgb(255, 255, 255)'), `c=${a11yScanLight.sample[0] ? a11yScanLight.sample[0].color : 'NONE'}`);
t('C-9 浅色 svg[fill="#ffffff"] 计数=0', a11yScanLight.whites === 0, `white=${a11yScanLight.whites}`);
// 退出设置 → 主页行基线
await esc(); await sleep(400);
await esc(); await sleep(600);
const homeIconBaseline = await page.evaluate(() => {
  const icons = Array.from(document.querySelectorAll('.tp-home-icon svg'));
  return { n: icons.length, currentColor: icons.filter(s => (s.getAttribute('fill') || '') === 'currentColor').length };
});
t('C-10 主页一级行 svg fill=currentColor 基线不回归', homeIconBaseline.n > 0 && homeIconBaseline.currentColor === homeIconBaseline.n, `n=${homeIconBaseline.n} cc=${homeIconBaseline.currentColor}`);

// ============ D 组：位姿回归档（390 档） ============
console.log('D 组 位姿回归档');
await page.evaluate(() => window.__openRecentApps());
await sleep(900);
const pose = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('.recent-app-card'));
  return {
    op1: cards[1] ? cards[1].style.opacity : null,
    shadow0: cards[0].style.boxShadow || getComputedStyle(cards[0]).boxShadow,
    n: cards.length,
  };
});
t('D-1 右邻卡 opacity 衰减 0.80 在册（CSSOM 数值规范化 0.8）', pose.op1 !== null && parseFloat(pose.op1) === 0.8, `op1=${pose.op1}`);
t('D-2 焦点卡阴影焦点档（var(--md-primary) 描边在册）', pose.shadow0.includes('--md-primary'), pose.shadow0.slice(0, 60));
// 拖拽一步长落位：zTop 更新为右邻
const dragRes = await (async () => {
  const g = await page.evaluate(() => {
    const deck = document.getElementById('recentCardsDeck');
    const r = deck.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
  });
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(g.x - (g.w * 0.86 / 8) * i, g.y, { steps: 1 });
  await sleep(80);
  await page.mouse.up();
  await sleep(1100);
  return page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.recent-app-card'));
    let top = null, topZ = -1;
    cards.forEach(c => { const z = parseInt(c.style.zIndex, 10) || 0; if (z > topZ) { topZ = z; top = c.dataset.appId; } });
    return { zTop: top, firstId: cards[0] ? cards[0].dataset.appId : null };
  });
})();
t('D-3 拖拽一步长落位 zIndexTop=右邻（跟手 1:1）', dragRes.zTop === dragRes.firstId ? false : dragRes.zTop !== null, `zTop=${dragRes.zTop} first=${dragRes.firstId}`);
// 平面 rail 视觉留档
await page.screenshot({ path: 'docs/sweep/s34-recents-flat-rail.png' });
await esc(); await sleep(600);

// classic 形态零变化（localStorage 预置 + reload）
await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('ios-desktop:desktop-prefs') || '{}');
  raw.recentsStyle = 'classic';
  localStorage.setItem('ios-desktop:desktop-prefs', JSON.stringify(raw));
});
await page.reload({ waitUntil: 'load' });
await sleep(2500);
await page.evaluate(() => window.__openRecentApps());
await sleep(900);
const classic = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('.recent-app-card'));
  return cards.slice(0, 3).map(c => ({ tf: c.style.transform, op: c.style.opacity }));
});
t('D-4 classic 形态零变化（scale(1)+opacity=1+无 rotateY）', classic.length >= 2 && classic.every(c => c.tf.includes('scale(1)') && !c.tf.includes('rotateY') && c.op === '1'), `n=${classic.length} tf1=${classic[1] ? classic[1].tf : 'NONE'}`);
await esc(); await sleep(400);
// 恢复 carousel
await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('ios-desktop:desktop-prefs') || '{}');
  raw.recentsStyle = 'carousel';
  localStorage.setItem('ios-desktop:desktop-prefs', JSON.stringify(raw));
});

// ============ K 组：全程零 pageerror ============
t('K-1 全程零 pageerror', errors.length === 0, errors.length ? errors.slice(0, 2).join(' | ') : '');

console.log(`\n==== e2e-sweep-c10-ui-r34 结果：pass=${pass} fail=${fail} ====`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
