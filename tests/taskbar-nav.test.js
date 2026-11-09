// ==================== taskbar-nav.test.js — #162 平板三键导航×任务栏重叠修复 ====================
//
// AOSP 权威（Launcher3 lineage-24.0）：平板导航键画在任务栏内部（TaskbarNavLayoutter），
// 不是独立浮条。md3 旧状：taskbar 内已有 .taskbar-navbuttons（#72 二期）+ 独立浮条
// .sys-nav-bar（bottom 10px，z-index 845）Z 轴同层并存 → 重叠区 [10,56] 达 46px。
// 修复 = 三期形态分派（NavButtonLayoutFactory.kt:164-181 同构）：
//   · taskbar-core.js 新增纯函数 navButtonHost（'taskbar' | 'floating' 裁决）
//   · taskbar.js syncPresence 消费 → body[data-nav-host] 权威落 DOM
//   · nav-bar.css body[data-nav-host="taskbar"] .sys-nav-bar { display:none } 让位
//   · 手机 / taskbar 关闭态 floating：浮条照常（拖移吸附三档超越项保留）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORE = readFileSync(join(ROOT, 'ios-desktop/js/taskbar-core.js'), 'utf-8');
const TB = readFileSync(join(ROOT, 'ios-desktop/js/taskbar.js'), 'utf-8');
const NBCSS = readFileSync(join(ROOT, 'ios-desktop/css/nav-bar.css'), 'utf-8');
const NAVJS = readFileSync(join(ROOT, 'ios-desktop/js/nav-bar.js'), 'utf-8');

import { navButtonHost } from '../ios-desktop/js/taskbar-core.js';

describe('#162 形态分派纯函数（NavButtonLayoutFactory 同构）', () => {
  it('四组合裁决：平板+开→taskbar；其余→floating', () => {
    expect(navButtonHost({ taskbarEnabled: true, tabletSize: true })).toBe('taskbar');
    expect(navButtonHost({ taskbarEnabled: false, tabletSize: true })).toBe('floating');
    expect(navButtonHost({ taskbarEnabled: true, tabletSize: false })).toBe('floating');
    expect(navButtonHost({ taskbarEnabled: false, tabletSize: false })).toBe('floating');
    expect(navButtonHost(null)).toBe('floating');
    expect(navButtonHost(undefined)).toBe('floating');
  });

  it('taskbar-core 源码锚：同构头注 + 导出在库', () => {
    expect(CORE).toContain('NavButtonLayoutFactory.kt:164-181 同构');
    expect(CORE).toContain("export function navButtonHost(o)");
    expect(CORE).toContain("TaskbarNavLayoutter");
  });
});

describe('#162 taskbar.js 消费（分派结果落 DOM，非空转）', () => {
  it('syncPresence 写 body[data-nav-host]', () => {
    expect(TB).toContain('runningProjection, navButtonHost,');
    expect(TB).toContain("document.body.setAttribute('data-nav-host', navButtonHost({ taskbarEnabled: !!prefs.taskbarEnabled, tabletSize: isTabletSize() }));");
    // 分派头注（#149 坑预防：注释与代码同在）
    expect(TB).toContain('#162 三期形态分派（NavButtonLayoutFactory 同构）');
  });
});

describe('#162 nav-bar.css 让位规则（消重叠）', () => {
  it('host=taskbar 时独立浮条 display:none + floating 不命中', () => {
    expect(NBCSS).toContain('body[data-nav-host="taskbar"] .sys-nav-bar { display: none; }');
    expect(NBCSS).toContain('#162 三期形态分派');
    // 手机态零变化锚：基础浮条样式原值（bottom 10px / z-index 845）不动
    expect(NBCSS).toContain('bottom: 10px;');
    expect(NBCSS).toContain('z-index: 845;');
  });
});

describe('#162 nav-bar.js 手机态回归锚（拖移吸附/融合手势零变化）', () => {
  it('ENABLE/POS 双键 + 长按拖移 + 吸附三档 + 融合手势路由 零触碰', () => {
    expect(NAVJS).toContain("const ENABLE_KEY = 'ios-desktop:navbar-enabled';");
    expect(NAVJS).toContain("const POS_KEY = 'ios-desktop:navbar-pos';");
    expect(NAVJS).toContain("const target = cx < third ? 'left' : cx > third * 2 ? 'right' : 'center';");
    expect(NAVJS).toContain('onDown(x, fusion.startY, \'BOTTOM\')');
    expect(NAVJS).toContain('if (btn.dataset.nvb === \'back\') sysBack();');
    // sysBack 预览式返回路由（模块返回 > iframe PB > 关窗）零变化
    expect(NAVJS).toContain('if (mb) { mb.triggerBack(); return; }');
    expect(NAVJS).toContain('pbSend(pb.win, { type: \'PB_TRIGGER_BACK\' });');
  });
});

describe('#162 taskbar 内导航键既有锚（#72 二期，AOSP 几何）', () => {
  it('.taskbar-navbuttons 容器 + 44dp 键 + 三键分发在库', () => {
    expect(TB).toContain('<div class="taskbar-navbuttons">');
    expect(TB).toContain("taskbarEl.querySelector('.taskbar-navbuttons').addEventListener('click'");
    expect(TB).toContain('if (nav === \'back\') sysBack();');
  });
});
