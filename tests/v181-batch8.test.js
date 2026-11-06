// ==================== v181-batch8.test.js — #181 第八批整改：ping 六条准入 v10.28 ====================
//
// 覆盖（R68 窗加餐 #192 同域顺延，渐进累计 9/13）：
//   · ping 令牌化收尾（面板下沉面 --pg-well/--pg-well-soft 从 --md-scrim color-mix 派生 +
//     canvas 网格基线 --pg-grid 从 --md-on-surface 派生经 getComputedStyle 合成——Canvas 2D
//     不解析 CSS 变量，drawcircle R62 同源纪律；fallback 兜底不算裸写）
//   · 响应式：@media 400px 手机紧凑 + 760px 平板真分栏（grid 1fr/300px 左六区右历史 chips
//     纵向铺开 grid-row:1/6 + note 沉底，手机 flex 零变化）
//   · SDK：notify（停止时统计有效发一次低频）+ VFS /documents/ping-history.json 最近 20 条镜像
//     （start 写入/init 恢复双落点 + fsAvail 守卫降级零炸）
//   · 形态语言：pressRipple 两排事件委托（欧氏距离衰减 240px/0.08——纵向排同样适用；
//     histrow chips 动态重建 → document 级 closest 命中）
//   · 回归锚：状态机/AbortController 全回收/日志封顶/零 innerHTML/ping-core 纯函数桥零变化
//   · 准入门：ADMITTED_APPS 扩至 13 应用（+ping）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(join(ROOT, 'ios-desktop/apps/ping/index.html'), 'utf-8');
const VITE = readFileSync(join(ROOT, 'vite.config.js'), 'utf-8');

describe('v10.28 #181 第八批 ping：令牌化收尾', () => {
  it('面板下沉面 --pg-well 派生 + canvas 网格线 --pg-grid getComputedStyle 合成', () => {
    expect(HTML).toContain('--pg-well: color-mix(in srgb, var(--md-scrim, #000) 24%, transparent);');
    expect(HTML).toContain('--pg-well-soft: color-mix(in srgb, var(--md-scrim, #000) 18%, transparent);');
    expect(HTML).toContain('--pg-grid: color-mix(in srgb, var(--md-on-surface) 8%, transparent);');
    // 四处消费点接线（原裸 rgba(0,0,0,.24/.18) 退役）
    expect(HTML).toContain('background: var(--pg-well); color: var(--pg-text);');
    expect(HTML).toContain('background: var(--pg-well-soft);');
    expect((HTML.match(/var\(--pg-well\)/g) || []).length).toBeGreaterThanOrEqual(3);
    // canvas 基线合成（R62 纪律：Canvas 2D 不解析 CSS 变量）
    expect(HTML).toContain("getComputedStyle(document.documentElement).getPropertyValue('--pg-grid').trim() || 'rgba(255,255,255,.08)'");
    // 裸 rgba 仅剩 2 处 fallback 兜底（var() 兜底 + JS fallback，准入口径不算裸写）
    expect((HTML.match(/rgba\(/g) || []).length).toBe(2);
  });
});

describe('v10.28 #181 第八批 ping：响应式 + 760px 平板真分栏', () => {
  it('@media 400px 紧凑 + 760px grid 两列（左六区右历史纵向，手机 flex 零变化）', () => {
    expect(HTML).toMatch(/@media \(max-width:400px\) \{/);
    expect(HTML).toMatch(/@media \(min-width:760px\) \{/);
    expect(HTML).toMatch(/\.pg-app \{ display: grid; grid-template-columns: 1fr 300px; gap: 10px 14px; padding: 16px 18px;/);
    expect(HTML).toContain('.pg-head { grid-column: 1; grid-row: 1; }');
    expect(HTML).toContain('.pg-outwrap { grid-column: 1; grid-row: 6; }');
    expect(HTML).toMatch(/\.pg-histrow \{ grid-column: 2; grid-row: 1 \/ 6; flex-direction: column; flex-wrap: nowrap;/);
    expect(HTML).toContain('.pg-note { grid-column: 2; grid-row: 6; white-space: normal; align-self: end; }');
    // 手机紧凑锚
    expect(HTML).toContain('.pg-chart { height: 52px; }');
    // 手机态零变化锚：基础 .pg-app 保持 flex column
    expect(HTML).toContain('.pg-app { position: absolute; inset: 0; display: flex; flex-direction: column; padding: 12px 14px; gap: 9px; }');
  });
});

describe('v10.28 #181 第八批 ping：SDK 双通道（notify + VFS 历史镜像）', () => {
  it('sysAvail/fsAvail 双守卫 + notify 停止时低频一次 + VFS 最近 20 条双落点', () => {
    expect(HTML).toContain('!!(window.__system && window.__system.notify)');
    expect(HTML).toContain("try { window.__system.notify({ title: title, body: body }); } catch (err) { /* 静默降级 */ }");
    expect(HTML).toContain("pushNotify('PING 完成', '' + st.sent + ' 次探测' + (st.ok ? ' · avg ' + core.roundMs(st.avg) + ' ms' : ''))");
    expect(HTML).toContain("'/documents/ping-history.json'");
    expect(HTML).toContain('PING_HISTORY_CAP = 20');
    expect(HTML).toContain("window.__system.fs.write(PING_HISTORY_PATH, JSON.stringify({ app: 'ping', records: hist.slice(-PING_HISTORY_CAP) })).catch(function () {})");
    // 双落点：start 写入 + init 恢复
    expect(HTML).toMatch(/mirrorPingHistory\(\);   \/\/ #181 准入④：VFS 历史镜像/);
    expect(HTML).toMatch(/mirrorPingHistory\(\);   \/\/ #181 准入④：启动时恢复镜像/);
  });
});

describe('v10.28 #181 第八批 ping：形态语言（pressRipple 整排联动）', () => {
  it('两排事件委托 + 三释放 + 欧氏距离衰减（240px 步进 0.08，纵向排适用）', () => {
    expect(HTML).toContain("var REACH = 240, STEP = 0.08, SEL = '.pg-targetrow, .pg-histrow';");
    expect(HTML).toContain("'pointerup', 'pointercancel', 'pointerleave'");
    expect(HTML).toContain('Math.hypot(e.clientX - (r.x + r.width / 2), e.clientY - (r.y + r.height / 2)) / REACH');
    expect(HTML).toContain("el.style.transform = 'scale(' + (1 - STEP * k).toFixed(3) + ')';");
    expect(HTML).toContain('setupPressRipple();');
  });
});

describe('v10.28 #181 第八批 ping：回归锚（核心状态机零变化）', () => {
  it('状态机/AbortController 回收/日志封顶/零 innerHTML/ping-core 桥/深链 零变化', () => {
    expect(HTML).toContain("if (!core) return; // 缺载守卫：绝不白屏（顶部样式仍渲染）");
    expect(HTML).toContain('var running = false;          // 状态机唯一真源');
    expect(HTML).toContain('curController = controller;');
    expect(HTML).toContain('while (outEl.children.length > LOG_MAX) outEl.removeChild(outEl.firstChild);');
    expect(HTML).toContain("row.textContent = text; // 在线目标不可信面：零 innerHTML");
    expect(HTML).toContain('core.appendHistory(hist, t.url, Date.now(), core.MAX_HISTORY)');
    expect(HTML).toContain("d.event !== 'ping/run'");
    expect(HTML).toContain("window.addEventListener('pagehide', stopAll);");
    // 六统计卡在册
    expect(HTML).toContain('data-test="pg-jitter"');
    expect(HTML).toContain('data-test="pg-loss"');
  });
});

describe('v10.28 #181 第八批：准入门扩容（ADMITTED_APPS 13 应用）', () => {
  it('清单含 ping 且包含语义不破（R63 坑在录）', () => {
    expect(VITE).toContain("'flow11', 'game2048', 'ping',");
    expect(VITE).toMatch(/const ADMITTED_APPS = \[[^\]]*'ping'[^\]]*\];/);
    expect((VITE.match(/'ping'/g) || []).length).toBe(1);
  });
});
