// ==================== scenario-persistence.test.js — 场景：桌面数据持久化 ====================
//
// 用户数据健壮性场景（只装载 state.js —— 持久化逻辑全部发生在模块导入期）：
//   · 首次启动 / 数据损坏 / 结构非法 → 降级默认布局，绝不白屏
//   · 合法存档 → 恢复用户排列，缺失字段由 initialApps 基准补全
//   · 无痕升级：后续版本新增应用 → 老用户存档末页追加新图标（removedApps 尊重卸载意图）
//   · 末页已满 → 溢出落新页
//   · savePagesApps 往返一致
// 每个用例通过 vi.resetModules + 重导入获得全新模块图（loadPagesApps 在导入期读取 localStorage）。

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { seedLocalStorage } from './scenario-helpers.js';
// 求值顺序守卫：apps-data ← apps/* → quick-settings → lock-screen → procedural-wallpaper → state
// 构成依赖环，state.js 必须先于 apps-data 完成求值（与 main.js 的导入顺序同策略），
// 否则 state.js 模块体内 initialApps 尚为 undefined。
import '../ios-desktop/js/state.js';
import { initialApps } from '../ios-desktop/js/apps-data.js';

const DATA_VERSION = 'v7_2026_08_16_threes_dice_flow11_parallel';
const K_PAGES = 'ios-desktop:pages-apps';
const K_VERSION = 'ios-desktop:data-version';
const K_REMOVED = 'ios-desktop:removed-apps';

/** 重置模块图后重导入 state.js，返回新 state */
async function freshState() {
  vi.resetModules();
  const mod = await import('../ios-desktop/js/state.js');
  return mod.state;
}

const ids = initialApps.map((a) => a.id);

describe('场景：桌面数据持久化', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('首次启动（空存储）→ 默认两页布局，版本号落盘', async () => {
    const state = await freshState();
    expect(state.pagesApps.length).toBe(2);
    expect(state.pagesApps[0].length).toBe(24);
    expect(state.pagesApps[1].length).toBe(initialApps.length - 24);
    expect(localStorage.getItem(K_VERSION)).toBe(DATA_VERSION);
    // 默认布局槽位连续
    state.pagesApps[0].forEach((app, i) => expect(app.slot).toBe(i));
  });

  test('存档损坏（非法 JSON）→ 静默降级默认布局', async () => {
    localStorage.setItem(K_VERSION, DATA_VERSION);
    localStorage.setItem(K_PAGES, '{oops-not-json');
    const state = await freshState();
    expect(state.pagesApps.length).toBe(2);
    expect(state.pagesApps[0].length).toBe(24);
  });

  test('存档结构非法（页不是数组/条目缺 id）→ 降级默认布局', async () => {
    localStorage.setItem(K_VERSION, DATA_VERSION);
    localStorage.setItem(K_PAGES, JSON.stringify([['not-an-app-array']]));
    let state = await freshState();
    expect(state.pagesApps[0].length).toBe(24); // 降级

    localStorage.setItem(K_PAGES, JSON.stringify([[{ slot: 3 }]])); // 缺 id
    state = await freshState();
    expect(state.pagesApps[0].length).toBe(24);
  });

  test('合法存档 → 恢复用户排列，展示字段由 initialApps 基准回填', async () => {
    // 完整 31 应用的存档（上一会话落盘的真实形态），用户交换过两个图标位置
    const page1 = ids.slice(0, 24).map((id, i) => ({ id: i === 1 ? ids[5] : i === 5 ? ids[1] : id, slot: i }));
    const page2 = ids.slice(24).map((id, i) => ({ id, slot: i }));
    localStorage.setItem(K_VERSION, DATA_VERSION);
    localStorage.setItem(K_PAGES, JSON.stringify([page1, page2]));

    const state = await freshState();
    expect(state.pagesApps.length).toBe(2);
    expect(state.pagesApps[0].length).toBe(24);
    // 用户的自定义排列被恢复（ids[1] 与 ids[5] 交换）
    expect(state.pagesApps[0][1].id).toBe(ids[5]);
    expect(state.pagesApps[0][5].id).toBe(ids[1]);
    // 存档只存 id+slot：name 等 UI 字段必须从 initialApps 基准补全
    const base = initialApps.find((a) => a.id === ids[5]);
    expect(state.pagesApps[0][1].name).toBe(base.name);
    expect(state.pagesApps[1][0].slot).toBe(0);
  });

  test('无痕升级：存档缺新应用 → 追加到末页且不动既有排列', async () => {
    // 存档只含前 30 个应用 → 第 31 个视为"后续版本新增"
    const saved = [[...ids.slice(0, 30)].map((id, i) => ({ id, slot: i % 24 }))]; // 单页 30 个
    localStorage.setItem(K_VERSION, DATA_VERSION);
    localStorage.setItem(K_PAGES, JSON.stringify(saved));
    const state = await freshState();
    const flatIds = state.pagesApps.flat().map((a) => a.id);
    expect(flatIds.length).toBe(31);
    expect(flatIds).toContain(ids[30]);           // 新应用在场
    expect(state.pagesApps[0][0].id).toBe(ids[0]); // 原排列未被重置
    // 追加位置：末页末尾
    const lastPage = state.pagesApps[state.pagesApps.length - 1];
    expect(lastPage[lastPage.length - 1].id).toBe(ids[30]);
  });

  test('removedApps 尊重：用户卸载的应用不参与无痕追加', async () => {
    const saved = [[...ids.slice(0, 30)].map((id, i) => ({ id, slot: i % 24 }))];
    localStorage.setItem(K_VERSION, DATA_VERSION);
    localStorage.setItem(K_PAGES, JSON.stringify(saved));
    localStorage.setItem(K_REMOVED, JSON.stringify([ids[30]]));
    const state = await freshState();
    const flatIds = state.pagesApps.flat().map((a) => a.id);
    expect(flatIds.length).toBe(30);
    expect(flatIds).not.toContain(ids[30]);
  });

  test('末页已满 24 → 溢出应用落新页', async () => {
    // 第 1 页 24 个真实应用 + 第 2 页 24 个未知 id（模拟满页自定义内容）→ 剩余 7 个溢出第 3 页
    const page1 = ids.slice(0, 24).map((id, i) => ({ id, slot: i }));
    const page2 = Array.from({ length: 24 }, (_, i) => ({ id: `unknown-${i}`, slot: i }));
    localStorage.setItem(K_VERSION, DATA_VERSION);
    localStorage.setItem(K_PAGES, JSON.stringify([page1, page2]));
    const state = await freshState();
    expect(state.pagesApps.length).toBe(3);
    expect(state.pagesApps[2].length).toBe(7);
    expect(state.pagesApps[2].map((a) => a.id)).toEqual(ids.slice(24));
    // 未知 id 条目原样保留（不在 initialApps 基准内的用户数据不丢）
    expect(state.pagesApps[1][0].id).toBe('unknown-0');
  });

  test('savePagesApps 往返：变更排列 → 落盘 → 重导入一致', async () => {
    const state = await freshState(); // 默认布局
    // 模拟用户把第 1 页第 0 个应用拖到第 2 页
    const [moved] = state.pagesApps[0].splice(0, 1);
    moved.slot = state.pagesApps[1].length;
    state.pagesApps[1].push(moved);
    state.pagesApps[0].forEach((a, i) => { a.slot = i; });
    const mod = await import('../ios-desktop/js/state.js');
    mod.savePagesApps();

    const state2 = await freshState();
    expect(state2.pagesApps[0].length).toBe(23);
    expect(state2.pagesApps[1].length).toBe(initialApps.length - 24 + 1);
    expect(state2.pagesApps[1][state2.pagesApps[1].length - 1].id).toBe(moved.id);
  });
});
