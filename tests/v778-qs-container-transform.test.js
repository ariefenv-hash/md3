// ==================== v778-qs-container-transform.test.js — QS 面板容器变换（去底部上升）+ 分体磁贴激活语义 + 矢量图官方化 ====================
//
// 依据：B 站 4 段 Android 16/17 真机录屏逐帧拆解（download/android16-17-控制中心参考分析.md）
//   ① 旧 .qs-sheet 是「自底部整体上滑」底部菜单（flex-end + translateY(60%)），AOSP 无此形态 ——
//      模式/设备/网络面板从源磁贴矩形原地扩张（container transform），关闭收缩回磁贴。
//      实现：JS 将源→终态位移+缩放写入 --qs-tf-src（FLIP），open 后 CSS 过渡到 none；
//      内容层 .qs-sheet-body 反向缩放对冲（净缩放恒近 1，内容不变形）。
//   ② 分体磁贴（蓝牙/Modes，带 zone2 子仓）激活语义对齐真机：整体保持中性药丸，
//      仅前导图标块填充动态主色（--md-primary）方圆角 + 反色图标（替代旧 on-primary 20% 淡染）。
//   ③ 矢量图修正：QS 相关 37 键全部替换为 @material-symbols/svg-400（Google 官方同步包）
//      Rounded fill 变体路径（viewBox 0 -960 960 960），不发明路径。

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

// ---------- A. 容器变换面板（CSS） ----------

describe('v7.78 · QS 面板容器变换（pull-panels.css）', () => {
  const css = src('ios-desktop/css/pull-panels.css');

  test('底部上升形态全部移除：flex-end / translateY(60%) / 底部单侧圆角', () => {
    const overlayBlock = css.slice(css.indexOf('.qs-sheet-overlay {'), css.indexOf('.qs-sheet-overlay.open'));
    expect(overlayBlock).not.toContain('align-items: flex-end');
    expect(overlayBlock).not.toContain('justify-content: center');
    expect(css).not.toContain('translateY(60%)');
    expect(css).not.toContain('border-radius: 28px 28px 0 0');
  });

  test('面板为居中浮层 + FLIP 变量驱动：absolute + margin auto + --qs-tf-src', () => {
    const block = css.slice(css.indexOf('.qs-sheet {'), css.indexOf('.qs-sheet-title'));
    expect(block).toContain('position: absolute;');
    expect(block).toContain('inset: 0;');
    expect(block).toContain('margin: auto;');
    expect(block).toContain('height: fit-content;');
    expect(block).toContain('transform: var(--qs-tf-src, none);');
    expect(block).toContain('border-radius: 28px;');
    // open 态归零（收缩回磁贴 = 反向过渡回 --qs-tf-src）
    expect(css).toContain('.qs-sheet-overlay.open .qs-sheet {\n  transform: none;\n}');
  });

  test('内容对冲层 .qs-sheet-body：反向缩放变量 + open 归零 + reduced-motion 静帧', () => {
    expect(css).toContain('.qs-sheet-body {\n  transform: var(--qs-tf-body-src, none);');
    expect(css).toContain('.qs-sheet-overlay.open .qs-sheet-body {\n  transform: none;\n}');
    // 定位紧随 .qs-sheet-body 规则之后的 reduced-motion 块（文件尾部另有 stagger 块，不可用 lastIndexOf）
    const anchor = css.indexOf('.qs-sheet-overlay.open .qs-sheet-body {\n  transform: none;\n}');
    const rm = css.slice(anchor, anchor + 420);
    expect(rm).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.qs-sheet,[\s\S]*\.qs-sheet-body[\s\S]*transform: none;/);
  });

  test('v7.79 分体磁贴激活语义：整体保持中性 stadium，仅图标底座填 --md-primary（特异性置后于 .qs-tile-pill.active）', () => {
    // 整体覆盖（中性面回归；v7.79 形状恒 stadium，不再写 border-radius 覆盖）
    expect(css).toContain('.qs-tile-pill.active[data-tile-id="bluetooth"],\n.qs-tile-pill.active[data-tile-id="modes"] {\n  background: var(--md-surface-container-high, rgba(255, 255, 255, 0.12));\n  color: var(--md-on-surface, #e8eaed);');
    // 图标底座动态主色实底 + 方圆角（置于 .qs-tile-pill.active 之后，同特异性后者胜出）
    const anchor = css.indexOf('.qs-tile-pill.active[data-tile-id="bluetooth"] > .qs-tile-icon-wrap,\n.qs-tile-pill.active[data-tile-id="modes"] > .qs-tile-icon-wrap {\n  border-radius: 15px;');
    expect(anchor).toBeGreaterThan(-1);
    const tail = css.slice(anchor, anchor + 300);
    expect(tail).toContain('border-radius: 15px;');
    expect(tail).toContain('background: var(--md-primary, #a8c7fa);');
    expect(tail).toContain('color: var(--md-on-primary, #042e4e);');
    // 旧淡染规则已删除
    expect(css).not.toContain('rgba(4, 46, 78, 0.2)');
  });
});

// ---------- B. 容器变换面板（JS） ----------

describe('v7.78 · QS 面板容器变换（quick-settings.js）', () => {
  const js = src('ios-desktop/js/quick-settings.js');

  test('openQsSheet 三参签名 + FLIP 反解 + 零矩形退化路径', () => {
    expect(js).toContain('export function openQsSheet(title, rows, sourceEl) {');
    expect(js).toContain("sheet.style.setProperty('--qs-tf-src'");
    expect(js).toContain("body.style.setProperty('--qs-tf-body-src'");
    expect(js).toContain("sheet.style.removeProperty('--qs-tf-src')");
    expect(js).toContain("body.style.removeProperty('--qs-tf-body-src')");
    expect(js).toContain('const sx = Math.max(src.width / dst.width, 0.05);');
    expect(js).toContain('const sy = Math.max(src.height / dst.height, 0.03);');
  });

  test('DOM：.qs-sheet-body 对冲包裹层', () => {
    expect(js).toContain('qs-sheet-body');
    expect(js).toContain('<div class="qs-sheet-body"><div class="qs-sheet-title"></div><div class="qs-sheet-rows"></div></div>');
  });

  test('v7.79：三面板全部传 FLIP 源 —— internet 磁贴 / 蓝牙磁贴 / 模式磁贴 / 蓝牙长按（zone2 已删）', () => {
    expect(js).toContain('openNetworkSheet(pill);');
    expect(js).not.toContain('openBluetoothSheet(zone2Btn);');
    expect(js).toContain('openBluetoothSheet(pill);'); // 点击磁贴 + 1×1 蓝牙长按
    expect(js).toContain('openModesSheet(pill);');
    expect(js).toContain('], sourceEl);');
    expect(js).toMatch(/function openNetworkSheet\(sourceEl\)/);
    expect(js).toMatch(/function openBluetoothSheet\(sourceEl\)/);
    expect(js).toMatch(/function openModesSheet\(sourceEl\)/);
  });
});

// ---------- C. 矢量图官方化 ----------

describe('v7.78 · 矢量图官方化（icons.js ← @material-symbols/svg-400）', () => {
  const icons = src('ios-desktop/js/icons.js');

  test('官方 Material Symbols 路径规模：viewBox 0 -960 960 960 ≥ 38 键（37 新换 + wifi 既有）', () => {
    const count = (icons.match(/viewBox="0 -960 960 960"/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(38);
  });

  test('关键磁贴图标为官方路径（抽查 fill 变体几何特征前缀）', () => {
    // flashlight_on-fill 官方路径以 M240-764 起笔（提把段）
    expect(icons).toMatch(/torch: `<svg viewBox="0 -960 960 960"[^]*M240-764/);
    // do_not_disturb_on-fill 官方路径含 M310-453h340（横杠段）
    expect(icons).toMatch(/modes: `<svg viewBox="0 -960 960 960"[^]*M310-453h340/);
    // qr_code_scanner-fill 官方路径含 M109.82-707（左上定位角）
    expect(icons).toMatch(/qrcode: `<svg viewBox="0 -960 960 960"[^]*M109\.82-707/);
  });

  test('旧手绘路径退场：torch 旧「H8zm3 6h2v3h-2v-3z」与 bluetooth 旧 17.71 起笔不再出现', () => {
    expect(icons).not.toContain('M6 2h12v3l-3 4v11c0 1.1-.9 2-2 2h-2c-1.1 0-2-.9-2-2V9L6 5V2z');
    expect(icons).not.toContain('M17.71 7.71L12 2h-1v7.59');
  });

  test('尺寸保持：替换后沿用原 width/height 属性（22/20 族）', () => {
    expect(icons).toMatch(/bluetooth: `<svg viewBox="0 -960 960 960" width="22" height="22" fill="currentColor"/);
    expect(icons).toMatch(/mic_access: `<svg viewBox="0 -960 960 960" width="20" height="20" fill="currentColor"/);
  });
});

// ---------- D. 运行时（happy-dom 引导真实 main.js） ----------

describe('v7.78 · 容器变换面板运行时', () => {
  let sleep;

  test('internet 磁贴点击 → overlay 挂 .open、含对冲层、零矩形路径无 --qs-tf-src 残留', async () => {
    const helpers = await import('./scenario-helpers.js');
    sleep = helpers.sleep;
    if (!document.body.dataset.__v778Booted) {
      document.body.innerHTML = helpers.buildShellHTML();
      helpers.setScreenSize();
      helpers.installCanvasStub();
      helpers.installFetchStub();
      document.body.dataset.__v778Booted = '1';
      await import('../ios-desktop/js/main.js');
    }
    const qs = await import('../ios-desktop/js/quick-settings.js');
    const container = document.getElementById('qsTilesContainer');
    expect(container).toBeTruthy();
    const internet = container.querySelector('.qs-tile-pill[data-tile-id="internet"]');
    expect(internet).toBeTruthy();

    internet.click(); // 动作型磁贴：弹网络面板（不翻转开关态）
    const overlay = document.getElementById('qsSheetOverlay');
    expect(overlay).toBeTruthy();
    const body = overlay.querySelector('.qs-sheet-body');
    expect(body).toBeTruthy();
    const sheet = overlay.querySelector('.qs-sheet');
    // happy-dom 无布局 → getBoundingClientRect 零矩形 → 走退化路径（变量被移除）
    expect(sheet.style.getPropertyValue('--qs-tf-src')).toBe('');
    await sleep(60); // rAF 后挂 .open
    expect(overlay.classList.contains('open')).toBe(true);

    // 点击遮罩关闭
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(overlay.classList.contains('open')).toBe(false);
  });

  test('直接调 openQsSheet 传带矩形 sourceEl → 写入 --qs-tf-src 与反向对冲变量', async () => {
    const helpers = await import('./scenario-helpers.js');
    sleep = helpers.sleep;
    const qs = await import('../ios-desktop/js/quick-settings.js');
    // happy-dom 零矩形下手工桩一个非零源（验证 FLIP 反解分支）
    const fakeSource = {
      getBoundingClientRect: () => ({ left: 40, top: 300, width: 180, height: 64, right: 220, bottom: 364 }),
    };
    // 桩面板终态矩形（happy-dom 无布局）
    const overlay = document.getElementById('qsSheetOverlay');
    const sheet = overlay.querySelector('.qs-sheet');
    const body = overlay.querySelector('.qs-sheet-body');
    const realRect = sheet.getBoundingClientRect.bind(sheet);
    sheet.getBoundingClientRect = () => ({ left: 11, top: 120, width: 390, height: 420, right: 401, bottom: 540 });
    try {
      qs.openQsSheet('测试面板', [], fakeSource);
      const tf = sheet.style.getPropertyValue('--qs-tf-src');
      const tfBody = body.style.getPropertyValue('--qs-tf-body-src'); // 对冲变量写在 body 层
      expect(tf).toContain('translate(');
      expect(tf).toContain('scale(');
      expect(tfBody).toContain('scale(');
      const sx = 180 / 390;
      const sy = 64 / 420;
      expect(tf).toBe(`translate(${(40 + 90 - (11 + 195)).toFixed(1)}px, ${(300 + 32 - (120 + 210)).toFixed(1)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`);
      expect(tfBody).toBe(`scale(${(1 / sx).toFixed(4)}, ${(1 / sy).toFixed(4)})`);
    } finally {
      sheet.getBoundingClientRect = realRect;
      sheet.style.removeProperty('--qs-tf-src');
      body.style.removeProperty('--qs-tf-body-src');
    }
  });
});
