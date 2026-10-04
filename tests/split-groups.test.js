// ==================== tests/split-groups.test.js — v7.33 分屏组合：多组持久化与桌面托盘 ====================
//
// 覆盖 v7.33「分屏组合」核心契约：
//   · 保存 / 去重刷新（同配对逆序保存不新增，比例轴更新 + MRU 置顶）
//   · 上限 4 组 LRU 淘汰（最旧一组让位）
//   · 非法配对（应用不存在 / 同应用）拒绝保存
//   · localStorage 载入校验（失效与重复条目过滤）
//   · 移除后持久化同步
//   · 托盘 keyed 复用（同组 chip 元素 identity 不变）、.has-split-tray 桌面让位开合
//
// 注：happy-dom 无真实布局（getBoundingClientRect 恒 0），“指哪打哪”的展开原点
//     与组合/恢复动画属端到端范畴，由 agent-browser 覆盖（__splitE2E 通道）。

import { describe, it, expect, beforeEach } from 'vitest';
// 求值顺序对齐 main.js：state.js 先于 apps-data（split-groups → apps-data → 应用 → state
// 的环在反序入口下会触发 TDZ；先锚定 state.js 即复刻桌面真实引导顺序）
import '../ios-desktop/js/state.js';
import {
  initSplitGroups,
  saveSplitGroup,
  removeSplitGroup,
  getSplitGroup,
  listSplitGroups,
  buildPairIconHTML,
} from '../ios-desktop/js/split-groups.js';

const STORAGE_KEY = 'ios-desktop:split-groups';

beforeEach(() => {
  localStorage.removeItem(STORAGE_KEY);
  document.getElementById('desktop')?.remove();
  const d = document.createElement('div');
  d.id = 'desktop';
  d.className = 'desktop';
  document.body.appendChild(d);
  initSplitGroups();
});

describe('saveSplitGroup — 保存 / 去重 / 上限', () => {
  it('保存新配对：列表置顶 + 持久化 + id 为排序键', () => {
    const { group, evicted } = saveSplitGroup('camera', 'msg', 0.62, 'y');
    expect(group).toBeTruthy();
    expect(evicted).toBeNull();
    expect(group.id).toBe('camera|msg');
    expect(group.ratio).toBe(0.62);
    expect(group.axis).toBe('y');
    expect(listSplitGroups()).toHaveLength(1);
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(raw).toHaveLength(1);
    expect(raw[0].aId).toBe('camera');
    expect(raw[0].bId).toBe('msg');
  });

  it('同配对逆序保存 → 去重刷新（比例/轴更新 + MRU 置顶），不新增条目', () => {
    saveSplitGroup('settings', 'music', 0.5, 'y');
    saveSplitGroup('weather', 'camera', 0.5, 'y');
    const { group } = saveSplitGroup('music', 'settings', 0.7, 'x'); // 逆序同对
    expect(listSplitGroups()).toHaveLength(2);
    expect(group.ratio).toBe(0.7);
    expect(group.axis).toBe('x');
    expect(listSplitGroups()[0].id).toBe(group.id); // 最近使用置顶
  });

  it('超过 4 组 → LRU 淘汰最旧（返回被淘汰组）', () => {
    saveSplitGroup('camera', 'msg');
    saveSplitGroup('settings', 'music');
    saveSplitGroup('weather', 'photo');
    saveSplitGroup('clock_app', 'notes');
    const { evicted } = saveSplitGroup('calculator', 'translate');
    expect(listSplitGroups()).toHaveLength(4);
    expect(evicted).toBeTruthy();
    expect(evicted.id).toBe('camera|msg');
    expect(getSplitGroup('camera|msg')).toBeNull();
    expect(getSplitGroup('calculator|translate')).toBeTruthy();
  });

  it('非法配对（应用不存在 / 同应用）拒绝保存', () => {
    expect(saveSplitGroup('nonexistent-app', 'msg').group).toBeNull();
    expect(saveSplitGroup('msg', 'msg').group).toBeNull();
    expect(listSplitGroups()).toHaveLength(0);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull(); // 无有效保存 → 不写盘
  });

  it('比例越界钳制到 [0.24, 0.76]', () => {
    const { group } = saveSplitGroup('camera', 'msg', 0.95, 'y');
    expect(group.ratio).toBe(0.76);
    const g2 = saveSplitGroup('music', 'weather', 0.05, 'y').group;
    expect(g2.ratio).toBe(0.24);
  });
});

describe('持久化恢复 — 载入校验', () => {
  it('localStorage 失效条目（未知应用 / 同应用 / 重复配对 / 非对象）全部过滤', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { aId: 'camera', bId: 'msg', ratio: 0.6, axis: 'y', ts: 1 },
      { aId: 'ghost-app', bId: 'msg', ratio: 0.5, axis: 'y', ts: 2 },
      { aId: 'msg', bId: 'msg', ratio: 0.5, axis: 'y', ts: 3 },
      { aId: 'msg', bId: 'camera', ratio: 0.4, axis: 'x', ts: 4 }, // 与首条重复（逆序）
      'garbage',
      null,
    ]));
    initSplitGroups();
    const list = listSplitGroups();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('camera|msg');
    expect(list[0].ratio).toBe(0.6);
  });

  it('removeSplitGroup 删除并同步持久化', () => {
    saveSplitGroup('camera', 'msg');
    expect(removeSplitGroup('camera|msg')).toBe(true);
    expect(removeSplitGroup('camera|msg')).toBe(false); // 幂等
    expect(listSplitGroups()).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toHaveLength(0);
  });
});

describe('托盘归拢 — Android 16 设计纪律（v7.35：组合全面归拢多任务，桌面无常驻托盘）', () => {
  it('保存后不渲染桌面托盘；#desktop 永不挂 has-split-tray；历史残留托盘元素被清除', () => {
    const desktop = document.getElementById('desktop');
    expect(desktop.classList.contains('has-split-tray')).toBe(false);

    // 预置一个历史残留托盘（模拟旧版本升级/残留 DOM）
    const stale = document.createElement('div');
    stale.id = 'splitGroupTray';
    desktop.appendChild(stale);

    saveSplitGroup('camera', 'msg');
    const tray = document.getElementById('splitGroupTray');
    expect(tray).toBe(null); // 残留托盘被 renderTray 清除，且不再新建
    expect(desktop.classList.contains('has-split-tray')).toBe(false);

    // 清空后仍保持无托盘状态
    removeSplitGroup('camera|msg');
    expect(document.getElementById('splitGroupTray')).toBe(null);
    expect(desktop.classList.contains('has-split-tray')).toBe(false);
  });

  it('多组共存：MRU 置顶语义由持久化列表承载（新/刷新组恒在首位）', () => {
    saveSplitGroup('camera', 'msg');      // A（键 camera|msg）
    saveSplitGroup('settings', 'music');  // B（键 music|settings —— 字母序）
    let list = listSplitGroups();
    expect(list[0].id).toBe('music|settings'); // B 最新 → 持久化列表首位

    saveSplitGroup('camera', 'msg', 0.5, 'y'); // A 刷新 → MRU 置顶
    list = listSplitGroups();
    expect(list[0].id).toBe('camera|msg');
    expect(list[1].id).toBe('music|settings');
    expect(list).toHaveLength(2);
    // 同步持久化层顺序一致（多任务 buildEntries 直接读 localStorage）
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(persisted.map((g) => g.id)).toEqual(['camera|msg', 'music|settings']);
  });

  it('buildPairIconHTML：双图标结构 + 非法应用返回空串', () => {
    const html = buildPairIconHTML('camera', 'msg');
    expect(html).toContain('sgi-a');
    expect(html).toContain('sgi-b');
    expect(buildPairIconHTML('nope', 'msg')).toBe('');
  });
});
