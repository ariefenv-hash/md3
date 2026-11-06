// ==================== v181-batch5.test.js — #181 第五批整改：bytebeat 六条准入 v10.15 ====================
//
// 覆盖（R65 窗加餐同域顺延 #192 规则）：
//   · bytebeat 588→~660 行：令牌化收尾（四处裸 rgba(0,0,0,.24) → --bb-well scrim color-mix 派生 +
//     滑条轨道 --bb-track）+ @media 400px 紧凑 + 760px 平板真分栏（grid 1fr/300px 左主操作右
//     经典库+收藏常驻面板跨全行，手机态 flex 零变化）+ SDK（notify 收藏/存曲库/终端深链三处 +
//     clipboard.write 优先→navigator→execCommand 三级链）+ 形态语言（音量滑条升格 .mdslider 怠速柄
//     --p 同步+reload 回填 + lib/favs chips 整排 pressRipple 距离衰减）
//   · 回归锚：#176 VFS 镜像 / 终端深链 / 分享码 / 收藏链路零变化
//   · 准入门：ADMITTED_APPS 扩至 10 应用（+bytebeat）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(join(ROOT, 'ios-desktop/apps/bytebeat/index.html'), 'utf-8');
const VITE = readFileSync(join(ROOT, 'vite.config.js'), 'utf-8');

describe('v10.15 #181 五批 bytebeat：令牌化收尾', () => {
  it('四处裸 rgba(0,0,0,.24) 清零 → --bb-well scrim color-mix 语义派生', () => {
    expect(HTML).not.toContain('rgba(0,0,0,.24)');
    expect(HTML).toMatch(/--bb-well: color-mix\(in srgb, var\(--md-scrim, #000\) 24%, transparent\);/);
    expect(HTML).toMatch(/--bb-track: color-mix\(in srgb, var\(--md-on-surface\) 9%, transparent\);/);
    // 三消费点接线（formula/select/panel）
    expect(HTML).toMatch(/\.bb-formula \{[^}]*background: var\(--bb-well\);/);
    expect(HTML).toMatch(/\.bb-select \{ background: var\(--bb-well\);/);
    expect(HTML).toMatch(/border-radius: 12px; background: var\(--bb-well\); overflow: hidden; \}/);
  });
});

describe('v10.15 #181 五批 bytebeat：响应式 + 760px 平板真分栏', () => {
  it('@media 400px 紧凑（双图纵向堆叠）+ 760px grid 两列（右面板跨全行）', () => {
    expect(HTML).toMatch(/@media \(max-width: 400px\) \{/);
    expect(HTML).toMatch(/@media \(min-width: 760px\) \{/);
    expect(HTML).toMatch(/\.bb-canvas-row \{ flex-direction: column; \}/);
    expect(HTML).toMatch(/\.bb-app \{ display: grid; grid-template-columns: 1fr 300px; grid-template-rows: auto auto auto auto 1fr auto;/);
    expect(HTML).toMatch(/\.bb-lib \{ grid-column: 2; grid-row: 1 \/ -1; max-height: 100%; overflow-y: auto;/);
    // 左列六段逐行落位（head/formula/err/controls/canvas/foot）
    expect(HTML).toMatch(/\.bb-head \{ grid-column: 1; grid-row: 1; \}/);
    expect(HTML).toMatch(/\.bb-canvas-row \{ grid-column: 1; grid-row: 5; \}/);
    expect(HTML).toMatch(/\.bb-foot \{ grid-column: 1; grid-row: 6; \}/);
    // 手机态本体零变化：.bb-app 默认仍是 flex column
    expect(HTML).toMatch(/\.bb-app \{ position: absolute; inset: 0; display: flex; flex-direction: column;/);
  });
});

describe('v10.15 #181 五批 bytebeat：SDK 接入（notify + clipboard 三级链）', () => {
  it('notify 三处（收藏/存曲库/终端深链）+ sysAvail 守卫降级', () => {
    expect(HTML).toMatch(/var sysAvail = function \(\) \{ return !!\(window\.__system && window\.__system\.notify\); \};/);
    expect(HTML).toMatch(/function sysNotify\(title, body\)/);
    expect(HTML).toMatch(/sysNotify\('ByteBeat', '已收藏 ' \+ name\)/);
    expect(HTML).toMatch(/sysNotify\('ByteBeat', '已存入曲库：\/music\/bytebeat\/' \+ name\)/);
    expect(HTML).toMatch(/sysNotify\('ByteBeat', '来自终端的公式已开奏'\)/);
  });
  it('clipboard.write 优先 → navigator.clipboard → execCommand 兜底', () => {
    expect(HTML).toMatch(/window\.__system\.clipboard\.write\(text\)/);
    expect(HTML).toMatch(/navigator\.clipboard\.writeText\(text\)/);
    expect(HTML).toContain('function fallbackCopy(text)');
  });
});

describe('v10.15 #181 五批 bytebeat：形态语言（怠速柄 + 整排联动）', () => {
  it('音量滑条升格 .mdslider 怠速柄（--p 同步 + init 回填 + ocr 同款胶囊展开）', () => {
    expect(HTML).toMatch(/<input id="bbVol" class="mdslider" type="range" min="0" max="100" value="80" style="--p:80%">/);
    // 裸语义锚（R64 坑⑤纪律：apps/*.html 不在 roll-version 扫描范围，版本字样锚下轮必失配——勿再锁版本）
    expect(HTML).toContain("volInput.style.setProperty('--p', state.vol + '%')");
    expect(HTML).toMatch(/\.mdslider:hover::-webkit-slider-thumb, \.mdslider:active::-webkit-slider-thumb \{ width: 24px; border-radius: 11px; \}/);
  });
  it('lib/favs chips 整排 pressRipple（距离衰减 scale + 事件委托四事件）', () => {
    expect(HTML).toMatch(/function pressRipple\(row, ev\)/);
    expect(HTML).toMatch(/Math\.max\(0\.9, 1 - d \/ 900\)/);
    expect(HTML).toMatch(/\[libEl, favsEl\]\.forEach\(function \(row\) \{/);
    expect(HTML).toMatch(/row\.addEventListener\('pointerdown', function \(e\) \{ pressRipple\(row, e\); \}\);/);
  });
});

describe('v10.15 #181 五批：准入门与回归锚', () => {
  it('ADMITTED_APPS 扩容（含 bytebeat；v10.15 六批 +flow11 后包含语义不破）', () => {
    // 包含语义（R65 batch4 惯例：清单扩容不破旧锚）
    expect(VITE).toContain("'ocr', 'bytebeat'");
    expect(VITE).toMatch(/const ADMITTED_APPS = \[[^\]]*'bytebeat'[^\]]*\];/);
  });
  it('回归锚：#176 VFS 镜像 / 终端深链 / 分享码 / 收藏存储零变化', () => {
    expect(HTML).toContain("fsPut('/music/bytebeat/favorites.json'");
    expect(HTML).toContain("'bytebeat_favs_v1'");
    expect(HTML).toContain("d.event !== 'bytebeat/play'");
    expect(HTML).toContain('core.decodeShare(location.hash)');
    expect(HTML).toContain("fsPut('/music/bytebeat/' + name");
    // 缺载守卫不变
    expect(HTML).toContain('核心模块缺载');
  });
});
