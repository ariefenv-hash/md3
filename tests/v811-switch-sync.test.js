// ==================== v811-switch-sync.test.js — #70 开关「状态 ↔ 视觉」同步守护 ====================
//
// 背景（#70）：15+ 处同步代码直接 input.checked = x（不派发 change）——CSS :checked
// 立即生效（填充色 + ✓），但 JS 弹簧几何不知情 →「真值=开 / CSS=开 / 几何=关」三者打架；
// 设置 DOM 关闭不销毁（_m3Bound 守卫），二次进入（app-page-active）一直错。
// 实测复现（议题 §实测）：dark 磁贴切主题 → app-page-active pageIdx=1 → dispDarkToggle
// checked=true / thumb 仍 translateX(4px)。
//
// v8.11 修复（A + B' 双通道）：
//   A. setSwitchChecked(inputEl, on) 统一入口 —— 23 处调用点全部收敛（同值幂等不派发；
//      未绑定/原生 checkbox 安全：change 无监听者零副作用）
//   B'. 引擎侧 property 拦截 —— initM3Switch 重定义 input.checked setter（getter 透传/
//       原生赋值后通知引擎），任何路径的裸赋值都驱动几何。不用议题 B 原案的
//       MutationObserver：input.checked = x 是 IDL property 赋值，不产生 attribute
//       变更（attribute 只反映 defaultChecked），attributeFilter:['checked'] 观察不到。
//   守卫复用既有语义：selfChange（引擎自源防双动画）、isDown（拖拽中不打断）；
//   settleTo 幂等（同 target 不重锚，双通道叠加零跳变）。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const engine = readFileSync(join(root, 'ios-desktop/js/m3-controls.js'), 'utf8');
const R = (p) => readFileSync(join(root, p), 'utf8');

const { initM3Switch, setSwitchChecked } = await import('../ios-desktop/js/m3-controls.js');

function makeSwitch(checked = false) {
  const label = document.createElement('label');
  label.className = 'md3-switch';
  label.innerHTML =
    `<input type="checkbox"${checked ? ' checked' : ''}>` +
    `<span class="slider"><span class="thumb"></span></span>`;
  document.body.appendChild(label);
  return label;
}

let rafQueue = [];
let simNow = 0;
beforeEach(() => {
  rafQueue = [];
  simNow = performance.now();
  vi.stubGlobal('requestAnimationFrame', (cb) => { rafQueue.push(cb); return rafQueue.length; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(() => vi.unstubAllGlobals());

/** 步进弹簧至收敛，返回 thumb 最终落笔 { w, tx, ty } */
function settle(thumb, maxFrames = 200) {
  let guard = 0;
  while (rafQueue.length && guard++ < maxFrames) {
    simNow += 16.7;
    rafQueue.shift()(simNow);
  }
  const tx = /translate\(([-\d.]+)px/.exec(thumb.style.transform)[1] | 0;
  const ty = /,\s*([-\d.]+)px\)/.exec(thumb.style.transform)[1] | 0;
  return { w: parseFloat(thumb.style.width), tx, ty };
}

describe('v8.11 #70 A 通道：setSwitchChecked 统一入口', () => {
  it('程序化赋值驱动几何：false→true 落位静息开 (24, -12)（#70 复现路径根治）', () => {
    const label = makeSwitch(false);
    initM3Switch(label);
    const input = label.querySelector('input');
    const thumb = label.querySelector('.thumb');
    expect(input.checked).toBe(false);

    setSwitchChecked(input, true);
    expect(input.checked).toBe(true);
    const g = settle(thumb);
    expect(g).toEqual({ w: 24, tx: 24, ty: -12 });   // 几何与真值对齐（旧版停在 4px ❌）
    label.remove();
  });

  it('反向：true→false 落位静息关 (4, -12)；null/同值幂等（不派发 change、无动画）', () => {
    const label = makeSwitch(true);
    initM3Switch(label);
    const input = label.querySelector('input');
    const thumb = label.querySelector('.thumb');

    let changes = 0;
    input.addEventListener('change', () => changes++);
    setSwitchChecked(input, null);            // !!null = false
    expect(input.checked).toBe(false);
    expect(settle(thumb)).toEqual({ w: 24, tx: 4, ty: -12 });

    rafQueue.length = 0;
    setSwitchChecked(input, false);           // 同值 → 早退
    expect(changes).toBe(1);                  // 仅真变化那一次
    expect(rafQueue.length).toBe(0);          // 无动画派生
    setSwitchChecked(null, true);             // 空参数安全
    label.remove();
  });

  it('change 派发走既有同步通道：外部监听者收到 bubbles 事件（业务回调语义不变）', () => {
    const label = makeSwitch(false);
    initM3Switch(label);
    const input = label.querySelector('input');
    const seen = [];
    input.addEventListener('change', (e) => seen.push({ v: input.checked, b: e.bubbles }));
    setSwitchChecked(input, true);
    expect(seen).toEqual([{ v: true, b: true }]);
    label.remove();
  });
});

describe('v8.11 #70 B’ 通道：引擎 property 拦截（防回归兜底）', () => {
  it('裸赋值 input.checked = true（不经统一入口）同样驱动几何（拦截器兜底）', () => {
    const label = makeSwitch(false);
    initM3Switch(label);
    const input = label.querySelector('input');
    const thumb = label.querySelector('.thumb');

    input.checked = true;                     // 裸赋值 —— 未来新代码也免疫
    const g = settle(thumb);
    expect(g).toEqual({ w: 24, tx: 24, ty: -12 });
    label.remove();
  });

  it('getter 透传 + 同值赋值零动画；绑定前赋值 → 绑定时 snapTo 用最新真值（双时序覆盖）', () => {
    const label = makeSwitch(false);
    initM3Switch(label);
    const input = label.querySelector('input');
    const thumb = label.querySelector('.thumb');

    input.checked = true;
    settle(thumb);
    rafQueue.length = 0;
    input.checked = true;                     // 同值 → setter 早退（!!v !== prev 不成立）
    expect(rafQueue.length).toBe(0);
    expect(input.checked).toBe(true);         // getter 透传

    // 绑定前赋值时序：新建开关，赋值先于 initM3Switch
    const label2 = makeSwitch(false);
    const input2 = label2.querySelector('input');
    input2.checked = true;                    // 未绑定 → 纯赋值无拦截
    initM3Switch(label2);                     // 绑定 → snapTo(restGeo(true))
    const thumb2 = label2.querySelector('.thumb');
    expect(parseFloat(thumb2.style.width)).toBe(24);
    expect(/translate\(24\.00px, -12\.00px\)/.test(thumb2.style.transform)).toBe(true);
    label.remove(); label2.remove();
  });

  it('引擎自源翻转不受拦截器干扰：轻点一次恰一次 change、落位正确（selfChange 守卫）', () => {
    const label = makeSwitch(false);
    initM3Switch(label);
    const input = label.querySelector('input');
    const thumb = label.querySelector('.thumb');
    const pe = (type, x) => {
      const e = new Event(type, { bubbles: true, cancelable: true });
      e.button = 0; e.pointerId = 3; e.clientX = x;
      return e;
    };

    let changes = 0;
    input.addEventListener('change', () => changes++);
    label.dispatchEvent(pe('pointerdown', 100));
    label.dispatchEvent(pe('pointerup', 100));
    settle(thumb);
    expect(changes).toBe(1);                  // selfChange 守卫：引擎派发不再走外部通道，外部监听恰一次
    expect(input.checked).toBe(true);
    expect(parseFloat(thumb.style.width)).toBe(24);
    expect(/translate\(24\.00px, -12\.00px\)/.test(thumb.style.transform)).toBe(true);
    label.remove();
  });
});

describe('v8.11 #70 源码锚定（DoD：grep 无裸赋值 + 双通道在场）', () => {
  it('统一入口导出且签名正确（同值早退在原生赋值之前）', () => {
    expect(engine).toContain('export function setSwitchChecked(inputEl, on) {');
    const block = engine.slice(engine.indexOf('export function setSwitchChecked'));
    const iGuard = block.indexOf('inputEl.checked === !!on');
    const iAssign = block.indexOf('inputEl.checked = !!on');
    expect(iGuard).toBeGreaterThan(-1);
    expect(iAssign).toBeGreaterThan(iGuard);
    expect(block).toContain("new Event('change', { bubbles: true })");
  });

  it('B’ property 拦截在场：nativeChecked + defineProperty + selfChange/isDown 双守卫', () => {
    expect(engine).toContain("getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')");
    expect(engine).toContain("Object.defineProperty(input, 'checked', {");
    const block = engine.slice(engine.indexOf('Object.defineProperty(input, \'checked\''));
    expect(block).toContain('!selfChange && !isDown');
    expect(block).toContain('settleTo(...restGeo(!!v))');
  });

  it('议题 B 原案陷阱不回潮：不引入 attributeFilter checked 观察（property 赋值观察不到）', () => {
    expect(engine).not.toContain("attributeFilter: ['checked']");
  });

  it('全库裸赋值清零：四文件 23 处调用点全部收敛统一入口（引擎内部合法路径除外）', () => {
    for (const p of ['ios-desktop/js/apps/settings.js', 'ios-desktop/js/apps/settings-battery.js',
                     'ios-desktop/js/quick-settings.js', 'ios-desktop/js/theme-engine.js']) {
      const src = R(p);
      const bare = (src.match(/[^.\w]([\w$]+)\.checked\s*=[^=]/g) || [])
        .filter((m) => !m.includes('inputEl.checked = !!on'))
        .filter((m) => !m.includes('a.checked=!'));   // #70 模板内防御降级函数（桥未就绪时纯赋值，B’/snapTo 双兜底）
      expect(bare, `${p} 残留裸赋值: ${JSON.stringify(bare)}`).toEqual([]);
      expect(src, `${p} 缺 setSwitchChecked 接线`).toContain('setSwitchChecked');
    }
  });

  it('子页内联脚本桥接（主文档全局作用域执行非 ESM）：window.__setSwitchChecked 暴露 + 模板内防御式调用', () => {
    // PAGE_SCRIPT 字符串无法访问 ESM 作用域 —— 与 __bindAppDocListener/__md3SliderSet 同款桥惯例
    const settings = R('ios-desktop/js/apps/settings.js');
    expect(settings).toContain('window.__setSwitchChecked = setSwitchChecked;');
    expect(settings).toContain("(window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})");
    // 模板内直调已清零（它们在运行时会 ReferenceError）
    expect(settings).not.toMatch(/(?<!window\.__set)\bsetSwitchChecked\(/);
  });

  it('引擎内部两处赋值为合法自源路径（selfChange 守卫内派发 change）', () => {
    // 拖拽落位 & 轻点翻转：紧邻 selfChange = true + dispatchEvent(change)
    expect(engine).toMatch(/input\.checked = targetChecked;\s*\n\s*selfChange = true;/);
    expect(engine).toMatch(/input\.checked = !input\.checked;\s*\n\s*selfChange = true;/);
  });
});
