// ==================== v181-batch6.test.js — #181 第六批整改：flow11 六条准入 v10.21 ====================
//
// 覆盖（R66 窗加餐同域顺延 #192 规则，渐进累计 7/13）：
//   · flow11 令牌化收尾（非棋子类裸色：board 白高光 color-mix 派生 --fl-highlight + --fl-track；
//     棋子身份色板按 #181 ②口径豁免保留——头注声明在录）
//   · 响应式：@media 400px 手机紧凑 + 760px 平板真分栏（grid 1fr/300px 左主操作右面板，手机 flex 零变化）
//   · SDK：notify（破纪录/奇点圣晶低频语义）+ VFS /documents/flow11-history.json 最近 20 条镜像
//     （fs.write Promise 形态 + fsAvailable 守卫降级零炸）+ sysAvail 双守卫
//   · 形态语言：音效音量怠速柄 .mdslider（--p 同步 + localStorage flow11-vol-v1 持久化 reload 回填 +
//     SoundEngine gain 乘算三 play 方法）+ pressRipple 整排联动（mode-pills/crafting-chips/powerups-bar
//     三排事件委托 + pointerup/cancel/leave 三释放 + 距离衰减）
//   · 回归锚：连接消除核心（canConnectGems 万能/炸弹/激光/2X 任意连）+ 道具持久化键
//     flow11_powerups + 最高分键 flow11_best + 模式四档 + v7.45 定高让位链路零变化
//   · 准入门：ADMITTED_APPS 扩至 11 应用（+flow11）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(join(ROOT, 'ios-desktop/apps/flow11/index.html'), 'utf-8');
const VITE = readFileSync(join(ROOT, 'vite.config.js'), 'utf-8');

describe('v10.21 #181 第六批 flow11：令牌化收尾（非棋子类裸色）', () => {
  it('board 白高光 color-mix 派生 --fl-highlight + 轨道 --fl-track（棋子身份色板豁免声明在录）', () => {
    expect(HTML).toContain('--fl-track: color-mix(in srgb, var(--md-on-surface) 14%, transparent);');
    expect(HTML).toContain('--fl-highlight: color-mix(in srgb, var(--md-surface-bright) 65%, transparent);');
    // 消费点接线（原裸 rgba(255,255,255,0.6) inset 退役）
    expect(HTML).toContain('inset 0 2px 4px var(--fl-highlight);');
    expect(HTML).not.toContain('inset 0 2px 4px rgba(255, 255, 255, 0.6)');
    // #181 ②豁免口径声明（棋子身份色板不机械化替换）
    expect(HTML).toContain('#181 ②豁免口径：棋子身份色板');
  });
});

describe('v10.21 #181 第六批 flow11：响应式 + 760px 平板真分栏', () => {
  it('@media 400px 紧凑 + 760px grid 两列（左主操作右常驻面板，手机 flex 零变化）', () => {
    expect(HTML).toMatch(/@media \(max-width: 400px\) \{/);
    expect(HTML).toMatch(/@media \(min-width: 760px\) \{/);
    expect(HTML).toMatch(/\.game-container \{\s*\n\s*max-width: 880px;\s*\n\s*display: grid;\s*\n\s*grid-template-columns: 1fr 300px;/);
    // 左列四区纵向定位（header/target/board/powerups）
    expect(HTML).toContain('.header { grid-column: 1; grid-row: 1; }');
    expect(HTML).toContain('.board-wrapper { grid-column: 1; grid-row: 3; }');
    expect(HTML).toContain('.powerups-bar { grid-column: 1; grid-row: 4; }');
    // 右列常驻面板（vol + crafting 纵向铺开）
    expect(HTML).toContain('.vol-row { grid-column: 2; grid-row: 1; }');
    expect(HTML).toMatch(/\.special-crafting-bar \{\s*\n\s*grid-column: 2;\s*\n\s*grid-row: 2 \/ -1;/);
    expect(HTML).toContain('flex-direction: column;\n        overflow-x: visible;');
    // 手机态零变化锚：基础 .game-container 保持 flex column
    expect(HTML).toMatch(/\.game-container \{\s*\n\s*width: 100%;\s*\n\s*max-width: 420px;[\s\S]*?display: flex;\s*\n\s*flex-direction: column;/);
  });
});

describe('v10.21 #181 第六批 flow11：SDK 双通道（notify + VFS 历史镜像）', () => {
  it('sysAvail/fsAvail 守卫 + notify 低频两事件（破纪录/奇点圣晶）', () => {
    expect(HTML).toContain("!!(window.__system && window.__system.notify)");
    expect(HTML).toContain("try { window.__system.notify({ title: title, body: body }); } catch (err)");
    expect(HTML).toContain("pushNotify('新纪录', 'FLOW 11：' + score + ' 分')");
    expect(HTML).toContain("pushNotify('奇点圣晶', '合成了终极圣晶 FLOW 11！')");
  });
  it('VFS /documents/flow11-history.json 最近 20 条镜像 + fs.write Promise 降级 + 三落点', () => {
    expect(HTML).toContain("'/documents/flow11-history.json'");
    expect(HTML).toContain('FLOW_HISTORY_CAP = 20');
    expect(HTML).toContain('.catch(function () {})');
    expect(HTML).toMatch(/recordFlowHistory\('record'\)/);
    expect(HTML).toMatch(/recordFlowHistory\('singularity'\)/);
    expect(HTML).toMatch(/recordFlowHistory\('session-end'\)/);
    // session-end 免噪声守卫（零分/首局不落）
    expect(HTML).toContain('if (score > 0) recordFlowHistory(\'session-end\');');
  });
});

describe('v10.21 #181 第六批 flow11：形态语言（怠速柄 + 整排联动）', () => {
  it('音效音量怠速柄 .mdslider：--p 同步 + flow11-vol-v1 持久化 + SoundEngine gain 乘算三 play', () => {
    expect(HTML).toContain('class="mdslider" id="flowVol"');
    expect(HTML).toContain("volEl.style.setProperty('--p', clamped + '%')");
    expect(HTML).toContain("localStorage.getItem('flow11-vol-v1')");
    expect(HTML).toContain("localStorage.setItem('flow11-vol-v1', String(clamped))");
    expect(HTML).toContain('volFactor() { return Math.max(0, Math.min(1, this.volume)); }');
    expect(HTML).toContain('0.12 * this.volFactor()');
    expect(HTML).toContain('0.2 * this.volFactor()');
    expect(HTML).toContain('0.15 * this.volFactor()');
  });
  it('pressRipple 三排事件委托 + 三释放 + 距离衰减（240px 步进 0.08）', () => {
    expect(HTML).toContain("document.querySelector('.mode-pills')");
    expect(HTML).toContain("document.querySelector('.crafting-chips')");
    expect(HTML).toContain("document.querySelector('.powerups-bar')");
    expect(HTML).toContain("'pointerup', 'pointercancel', 'pointerleave'");
    expect(HTML).toContain("1 - d / 240");
    expect(HTML).toContain("'scale(' + (1 - 0.08 * k).toFixed(3) + ')'");
  });
});

describe('v10.21 #181 第六批 flow11：回归锚（游戏核心零变化）', () => {
  it('连接消除核心/道具持久化/最高分/模式四档/v7.45 定高让位 零变化', () => {
    // 万能彩晶/炸弹/激光/2X 任意连接语义
    expect(HTML).toContain("if (nodeBVal === 'W' || nodeBVal === 'B' || nodeBVal === 'L' || nodeBVal === '2X') return true;");
    // 道具余量持久化键（v7.44）与最高分键不动
    expect(HTML).toContain("localStorage.getItem('flow11_powerups')");
    expect(HTML).toContain("localStorage.setItem('flow11_best', bestScore)");
    // 模式四档
    expect(HTML).toContain('data-mode="classic"');
    expect(HTML).toContain('data-mode="expansion"');
    expect(HTML).toContain('data-mode="zen"');
    expect(HTML).toContain('data-mode="rush"');
    // v7.45 定高让位（#5 img2 红框修复）不动
    expect(HTML).toContain('height: 100dvh;');
    expect(HTML).toContain('padding: 10px 14px 66px;');
    // 重力下落与补充核心
    expect(HTML).toContain('function applyGravityAndRefill() {');
  });
});

describe('v10.21 #181 第六批：准入门扩容（ADMITTED_APPS 11 应用）', () => {
  it('清单含 flow11 且包含语义不破（R63 坑在录：七批 +game2048 扩容后仍过）', () => {
    expect(VITE).toContain("'bytebeat', 'flow11'");
    expect(VITE).toMatch(/const ADMITTED_APPS = \[[^\]]*'flow11'[^\]]*\];/);
    expect((VITE.match(/'flow11'/g) || []).length).toBe(1);
  });
});
