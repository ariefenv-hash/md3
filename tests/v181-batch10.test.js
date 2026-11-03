// ==================== v181-batch10.test.js — #181 第十批整改：python 六条准入 ====================
//
// 覆盖（渐进累计 11/13）：
//   · python 令牌化收尾（--py-well 从 --md-scrim color-mix 派生：编辑器/包名输入/输出面板
//     三处消费；fallback 兜底不算裸写）
//   · 响应式：@media 400px 手机紧凑 + 760px 平板真分栏（grid 1fr/300px 左六区右运行历史
//     chips 纵向铺开 grid-row:1/6 + foot 沉底，手机 flex 零变化）
//   · SDK：notify（运行时就绪首次跃迁低频一次，每会话至多一次）+ VFS
//     /documents/python-history.json 最近 20 条镜像（运行写入/启动恢复双落点 +
//     fsAvail 守卫降级零炸）
//   · 形态语言：pressRipple 两排事件委托（py-controls/py-chips 欧氏距离衰减 240px/0.08；
//     chips 动态重建 → document 级 closest 命中；三释放）
//   · 回归锚：懒加载纪律（打开绝不拉 CDN）/BUSY 互斥/输出封顶/零 innerHTML/深链 python/run
//     /Tab 缩进/Ctrl+Enter 零变化
//   · 准入门：ADMITTED_APPS 扩至 15 应用（+python）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(join(ROOT, 'ios-desktop/apps/python/index.html'), 'utf-8');
const VITE = readFileSync(join(ROOT, 'vite.config.js'), 'utf-8');

describe('#181 第十批 python：令牌化收尾', () => {
  it('下沉面 --py-well 派生 + 编辑器/包名/输出三处消费 + 裸 rgba 仅剩 fallback 兜底', () => {
    expect(HTML).toContain('--py-well: color-mix(in srgb, var(--md-scrim, #000) 24%, transparent);');
    // 三处消费点接线（原裸 rgba(0,0,0,.24) 退役）
    expect((HTML.match(/background: var\(--py-well\)/g) || []).length).toBe(3);
    // 裸 rgba 仅剩 1 处 var() 内 fallback 兜底（--py-line，准入口径不算裸写）
    expect((HTML.match(/rgba\(/g) || []).length).toBe(1);
  });
});

describe('#181 第十批 python：响应式 + 760px 平板真分栏', () => {
  it('@media 400px 紧凑 + 760px grid 两列（左六区右历史纵向，手机 flex 零变化）', () => {
    expect(HTML).toMatch(/@media \(max-width:400px\) \{/);
    expect(HTML).toMatch(/@media \(min-width:760px\) \{/);
    expect(HTML).toMatch(/\.py-app \{ display: grid; grid-template-columns: 1fr 300px; gap: 10px 14px; padding: 16px 18px;/);
    expect(HTML).toContain('.py-head { grid-column: 1; grid-row: 1; }');
    expect(HTML).toContain('.py-code { grid-column: 1; grid-row: 2; max-height: none; min-height: 130px; }');
    expect(HTML).toContain('.py-outwrap { grid-column: 1; grid-row: 5; }');
    expect(HTML).toContain('.py-foot { grid-column: 1; grid-row: 6; }');
    expect(HTML).toMatch(/\.py-hist \{ grid-column: 2; grid-row: 1 \/ 6; \}/);
    expect(HTML).toMatch(/\.py-chips \{ flex-direction: column; flex-wrap: nowrap; max-height: none;/);
    // 手机紧凑锚
    expect(HTML).toContain('.py-code { min-height: 92px; max-height: 150px; font-size: 12px; padding: 8px 9px; }');
    // 手机态零变化锚：基础 .py-app 保持 flex column
    expect(HTML).toContain('.py-app { position: absolute; inset: 0; display: flex; flex-direction: column; padding: 12px 14px; gap: 9px; }');
  });
});

describe('#181 第十批 python：SDK 双通道（notify + VFS 历史镜像）', () => {
  it('sysAvail/fsAvail 双守卫 + 就绪门低频 notify + VFS 最近 20 条双落点', () => {
    expect(HTML).toContain('!!(window.__system && window.__system.notify)');
    expect(HTML).toContain("try { window.__system.notify({ title: title, body: body }); } catch (err) { /* 静默降级 */ }");
    expect(HTML).toContain("if (runtimeReadyNotified) return;   // 低频门：每会话至多一次");
    expect(HTML).toContain("pushNotify('Python', '运行时就绪 —— 可以写代码了');");
    expect(HTML).toContain("'/documents/python-history.json'");
    expect(HTML).toContain('PY_HISTORY_CAP = 20');
    expect(HTML).toContain("window.__system.fs.write(PY_HISTORY_PATH, JSON.stringify({ app: 'python', records: hist.slice(-PY_HISTORY_CAP) })).catch(function () {})");
    // 双落点：运行写入 + 启动恢复
    expect(HTML).toMatch(/mirrorPyHistory\(\);   \/\/ #181 准入④：运行历史 → VFS 镜像（落点一）/);
    expect(HTML).toMatch(/mirrorPyHistory\(\);   \/\/ #181 准入④：启动时恢复镜像（宿主在库时同步，落点二）/);
  });
});

describe('#181 第十批 python：形态语言（pressRipple 整排联动）', () => {
  it('两排事件委托 + 三释放 + 欧氏距离衰减（240px 步进 0.08，动态 chips 委托命中）', () => {
    expect(HTML).toContain("var REACH = 240, STEP = 0.08, SEL = '.py-controls, .py-chips';");
    expect(HTML).toContain("'pointerup', 'pointercancel', 'pointerleave'");
    expect(HTML).toContain('Math.hypot(e.clientX - (r.x + r.width / 2), e.clientY - (r.y + r.height / 2)) / REACH');
    expect(HTML).toContain("el.style.transform = 'scale(' + (1 - STEP * k).toFixed(3) + ')';");
    expect(HTML).toContain('setupPressRipple();');
    expect(HTML).toContain('init();               // #181：初始化置于 SDK 块后（fsAvail 已赋值——R68 坑①同源纪律）');
  });
});

describe('#181 第十批 python：回归锚（REPL 核心零变化）', () => {
  it('懒加载纪律/互斥/输出封顶/零 innerHTML/深链/Tab 缩进 零变化', () => {
    expect(HTML).toContain("if (!core) {\n        errEl.hidden = false; // 缺载守卫：绝不白屏");
    expect(HTML).toContain('rt.cdnFetches++; // 验收锚：首次加载恰 1 次 CDN 拉取');
    expect(HTML).toContain('var BUSY = false; // 运行/安装互斥（同步 runPython 期间按钮不可重入）');
    expect(HTML).toContain('while (outEl.childNodes.length > MAX_LINES) {');
    expect(HTML).toContain("div.textContent = text;");
    expect(HTML).not.toMatch(/\.innerHTML\s*=/);
    expect(HTML).toContain("d.event !== 'python/run'");
    expect(HTML).toContain('e.key === \'Tab\'');
    expect(HTML).toContain('e.key === \'Enter\' && (e.ctrlKey || e.metaKey)');
    // 打开绝不自动拉运行时：init 不触 ensureRuntime
    const initSeg = HTML.slice(HTML.indexOf('function init()'), HTML.indexOf('#181 第十批准入④⑤'));
    expect(initSeg).not.toContain('ensureRuntime');
  });
});

describe('#181 第十批：准入门扩容（ADMITTED_APPS 15 应用）', () => {
  it('清单含 python 且包含语义不破（R63 坑在录）', () => {
    expect(VITE).toContain("'ping', 'midi-player', 'python']");
    expect(VITE).toMatch(/const ADMITTED_APPS = \[[^\]]*'python'[^\]]*\];/);
    expect((VITE.match(/'python'/g) || []).length).toBe(1);
  });
});
