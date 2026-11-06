// ==================== v181-batch7.test.js — #181 第七批整改：game2048 六条准入 v10.10 ====================
//
// 覆盖（R68 窗主作业，渐进累计 8/13）：
//   · game2048 令牌化收尾（非棋子类裸色：面板白面 --md-surface-bright 派生 / 遮罩阴影 --md-scrim 派生 /
//     slot 文字 --md-on-surface 派生；卡面棋子身份色板按 #181 ②口径豁免保留——头注声明在录）
//   · 响应式：@media 400px 手机紧凑 + 760px 平板真分栏（grid 1fr/300px 左主操作右【战绩·常驻面板】
//     aside#side-panel grid-row:1/-1 跨全行，手机 flex 零变化）
//   · SDK：notify（破纪录首越/2048 王牌首达低频语义）+ VFS /documents/game2048-history.json
//     最近 20 条镜像（fs.write Promise 形态 + fsAvail 守卫降级零炸）+ 落点三处
//   · 形态语言：pressRipple 整排联动（controls-top/bottom-area/preset-theme-list 三排事件委托 +
//     pointerup/cancel/leave 三释放 + 距离衰减 240px/0.08；动态容器 document 级 closest 命中）
//   · 回归锚：落牌合并核心（checkAndMerge wildcard 双倍/连击积分）+ 存储五键零变化 + AI 引擎零变化
//   · 准入门：ADMITTED_APPS 扩至 12 应用（+game2048）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(join(ROOT, 'ios-desktop/apps/game2048/index.html'), 'utf-8');
const VITE = readFileSync(join(ROOT, 'vite.config.js'), 'utf-8');

describe('v10.10 #181 第七批 game2048：令牌化收尾（非棋子类裸色）', () => {
  it('面板白面/遮罩/阴影/占位线 color-mix 从 --md-* 派生（卡面棋子色豁免声明在录）', () => {
    // 遮罩与阴影：--md-scrim 派生（modal 遮罩 light/dark + modal-content 阴影 + dark glass-shadow）
    expect((HTML.match(/var\(--md-scrim,/g) || []).length).toBeGreaterThanOrEqual(4);
    expect(HTML).toContain('--glass-shadow:0 14px 40px color-mix(in srgb,var(--md-scrim,#000) 50%,transparent);');
    expect(HTML).toContain('background:color-mix(in srgb,var(--md-scrim,hsl(var(--sol-h) 80% 12%)) 45%,transparent);');
    expect(HTML).toContain('[data-theme-mode="dark"] .modal-overlay{background:color-mix(in srgb,var(--md-scrim,#000) 55%,transparent)}');
    // 面板白面：--md-surface-bright 派生（board/column/hand/banner-tip/modal-desc/stats/badge 等）
    expect((HTML.match(/var\(--md-surface-bright,/g) || []).length).toBeGreaterThanOrEqual(12);
    expect(HTML).toContain('background:color-mix(in srgb,var(--md-surface-bright,#fff) 25%,transparent);');
    expect(HTML).toContain('background:color-mix(in srgb,var(--md-surface-bright,#fff) 22%,transparent);cursor:pointer;');
    // slot 占位文字：--md-on-surface 派生（原裸 rgba(77,111,128,.4) 退役）
    expect(HTML).toContain('color:color-mix(in srgb,var(--md-on-surface,hsl(var(--sol-h) 25% 40%)) 40%,transparent);');
    expect(HTML).not.toContain('rgba(77,111,128');
    // 裸色收尾：全文件剩余 rgba 仅卡面棋子豁免 4 处（卡面白高光/卡面阴影/2048 glow/wildcard 边）
    expect((HTML.match(/rgba\(/g) || []).length).toBe(4);
    // #181 ②豁免口径声明（卡面棋子身份色板不机械化替换）
    expect(HTML).toContain('#181 ②豁免口径：卡面棋子身份色板');
  });
});

describe('v10.10 #181 第七批 game2048：响应式 + 760px 平板真分栏', () => {
  it('@media 400px 紧凑 + 760px grid 两列（左主操作右常驻面板，手机 flex 零变化）', () => {
    expect(HTML).toMatch(/@media \(max-width:400px\)\{/);
    expect(HTML).toMatch(/@media \(min-width:760px\)\{/);
    // 平板：.game-wrapper flex→grid 1fr/300px 左四区 + 右面板跨全行
    expect(HTML).toMatch(/\.game-wrapper\{\s*\n\s*max-width:920px;height:100dvh;max-height:920px;padding:16px;display:grid;\s*\n\s*grid-template-columns:1fr 300px;grid-template-rows:auto auto 1fr auto;gap:10px;\s*\n\s*\}/);
    expect(HTML).toContain('.top-bar{grid-column:1;grid-row:1;margin-bottom:0}');
    expect(HTML).toContain('.board{grid-column:1;grid-row:3}');
    expect(HTML).toContain('.bottom-area{grid-column:1;grid-row:4;margin-top:0}');
    expect(HTML).toMatch(/\.side-panel\{\s*\n\s*display:flex;flex-direction:column;gap:8px;grid-column:2;grid-row:1\/-1;/);
    // 手机态零变化锚：基础 .game-wrapper 保持 flex column
    expect(HTML).toMatch(/\.game-wrapper\{\s*\n\s*position:relative;width:100%;max-width:440px;height:100dvh;max-height:860px;padding:12px;\s*\n\s*display:flex;flex-direction:column;/);
    // 手机紧凑断点锚（按钮/棋盘/内边距收缩；卡面尺寸由 renderAll JS 动态计算——v7.x 既有机制）
    expect(HTML).toContain('.icon-btn{width:30px;height:30px;border-radius:8px}');
    expect(HTML).toContain('.board{gap:4px;padding:4px;border-radius:12px}');
    // JS 动态卡面响应式回归锚（renderAll 内联 --card-w 派生，钳制 32–60px）
    expect(HTML).toContain('const cardW = Math.max(32, Math.min(colW - 8, 60)), cardH = Math.round(cardW * 1.32);');
    expect(HTML).toContain("colEl.style.setProperty('--card-w', cardW + 'px'); colEl.style.setProperty('--card-h', cardH + 'px');");
  });
});

describe('v10.10 #181 第七批 game2048：SDK 双通道（notify + VFS 历史镜像）', () => {
  it('sysAvail/fsAvail 双守卫 + notify 低频两事件（破纪录首越/2048 王牌首达）', () => {
    expect(HTML).toContain('!!(window.__system && window.__system.notify)');
    expect(HTML).toContain('try{ window.__system.notify({ title: title, body: body }); }catch(err){ /* 静默降级 */ }');
    expect(HTML).toContain("pushNotify('新纪录', '2048 纸牌接龙：' + score + ' 分')");
    expect(HTML).toContain("pushNotify('达成 2048', '纸牌接龙里程碑：合成王牌 2048！')");
    // 低频语义：对局内仅首越旧纪录发一次（recordNotified 对局门 + prevBest > 0 免首局刷屏）
    expect(HTML).toContain('if(!recordNotified && prevBest > 0){ recordNotified = true;');
    expect(HTML).toContain('stopAIMode(); cancelEraserTargeting(); recordNotified = false;');
  });
  it('VFS /documents/game2048-history.json 最近 20 条镜像 + fs.write Promise 降级 + 三落点', () => {
    expect(HTML).toContain("'/documents/game2048-history.json'");
    expect(HTML).toContain('G2048_HISTORY_CAP = 20');
    expect(HTML).toContain("window.__system.fs.write(G2048_HISTORY_PATH, JSON.stringify({ app: 'game2048', records: g2048History.slice(-G2048_HISTORY_CAP) })).catch(function(){});");
    expect(HTML).toMatch(/recordG2048History\('record'\)/);
    expect(HTML).toMatch(/recordG2048History\('game-over'\)/);
    // game-over 免噪声守卫（零分不落）
    expect(HTML).toContain('if(score > 0) recordG2048History(\'game-over\');');
  });
  it('战绩常驻面板 renderSidePanel 渲染 + saveStats/updateScore 双挂钩', () => {
    expect(HTML).toContain("const grid = $('#side-stats'); if(!grid) return;");
    expect(HTML).toContain("function saveStats(){ try{ LS.setItem('2048_solitaire_stats', JSON.stringify(stats)); }catch(e){} renderSidePanel(); }");
    expect(HTML).toContain("$('#high-score').innerText = highScore;\n  renderSidePanel();");
  });
});

describe('v10.10 #181 第七批 game2048：形态语言（pressRipple 整排联动）', () => {
  it('三排事件委托 + 三释放 + 距离衰减（240px 步进 0.08）+ 动态容器 document 级命中', () => {
    expect(HTML).toContain("const REACH = 240, STEP = 0.08, SEL = '.controls-top, .bottom-area, .preset-theme-list';");
    expect(HTML).toContain("'pointerup', 'pointercancel', 'pointerleave'");
    expect(HTML).toContain("const k = Math.max(0, 1 - Math.abs(e.clientX - (r.x + r.width / 2)) / REACH);");
    expect(HTML).toContain("el.style.transform = 'scale(' + (1 - STEP * k).toFixed(3) + ')';");
    // 动态容器（modal 重建 .preset-theme-list）→ 委托挂 document 级 closest 命中
    expect(HTML).toContain('const row = e.target.closest(SEL);');
    expect(HTML).toContain('setupPressRipple();');
  });
});

describe('v10.10 #181 第七批 game2048：回归锚（游戏核心零变化）', () => {
  it('落牌合并核心/存储五键/AI 引擎/冻结协议 零变化', () => {
    // 合并核心：wildcard 双倍语义与连击积分链零变化
    expect(HTML).toContain("let val = (t.isWildcard && n.isWildcard) ? 64 : (t.isWildcard ? n.val*2 : (n.isWildcard ? t.val*2 : t.val*2));");
    expect(HTML).toContain('const pts = val * comboCount;');
    // 存储五键不动（hi/stats/state/theme/wallpaper）
    expect(HTML).toContain("LS.getItem('2048_solitaire_hi')");
    expect(HTML).toContain("LS.setItem('2048_solitaire_stats'");
    expect(HTML).toContain("LS.setItem('2048_solitaire_state'");
    expect(HTML).toContain("const SOL_THEME_KEY = '2048_solitaire_theme';");
    expect(HTML).toContain("LS.getItem('2048_solitaire_wallpaper')");
    // 游戏结束语义零变化（五列全满 8 张）
    expect(HTML).toContain('const allFull = columns.every(c => c.length >= 8);');
    // AI 引擎入口零变化
    expect(HTML).toContain('function findBest2PlyMove(){');
    expect(HTML).toContain('function evaluateBoard(cols, gain, combos){');
    // 冻结协议与调试桥零变化
    expect(HTML).toContain('window.__g2048 = {');
    expect(HTML).toContain('columnLens: columns.map(c => c.length),');
  });
});

describe('v10.10 #181 第七批：准入门扩容（ADMITTED_APPS 12 应用）', () => {
  it('清单含 game2048 且包含语义不破（R63 坑在录：八批 +ping 扩容后仍过）', () => {
    expect(VITE).toContain("'flow11', 'game2048'");
    expect(VITE).toMatch(/const ADMITTED_APPS = \[[^\]]*'game2048'[^\]]*\];/);
    expect((VITE.match(/'game2048'/g) || []).length).toBe(1);
  });
});
