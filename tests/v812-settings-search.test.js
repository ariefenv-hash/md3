// ==================== v812-settings-search.test.js — #71 设置搜索失效守护 ====================
//
// 背景（#71）：设置左栏搜索胶囊完全不过滤——applySearch() 遍历 .tp-group（分组标题），
// 但 renderSettingsListHTML() 重构为扁平裸列表后全库再无 .tp-group 生成点（实测 0 个），
// forEach 空转 → 任何关键字都不产生 tp-hit-none → 搜索形同虚设。
// v8.12 修复（#71 方案 1 + 可选增强）：
//   ① applySearch 直遍历 .tp-row，命中域 = data-label + data-keywords（别名表）
//   ② AOSP_TOP_LEVEL 每项补 kw 别名（二级项词：深色/省电/WLAN 等 → 一级入口）
//   ③ 空态：有关键字且零命中 → 「没有匹配的设置项」，不留空白
// 守护口径：行为级（jsdom 构造左栏结构直调 applySearch）+ 源码锚定。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'ios-desktop/js/apps/settings-two-pane.js'), 'utf8');

// 循环依赖边界：settings.js ↔ two-pane ↔ state ↔ apps-data 环——必须从 settings.js
// 入口立环（生产路径同序），直接 import two-pane 会命中 AOSP_TOP_LEVEL TDZ
await import('../ios-desktop/js/apps/settings.js');
const { applySearch, renderSettingsListHTML, aospTopLevelList } =
  await import('../ios-desktop/js/apps/settings-two-pane.js');
// 行为级夹具：复刻左栏真实结构（.tp-root > .tp-left > .tp-row[data-label][data-keywords]）
function makeLeft() {
  const root = document.createElement('div');
  root.className = 'tp-root';
  root.innerHTML =
    '<div class="tp-left">' +
    renderSettingsListHTML() +
    '</div>';
  document.body.appendChild(root);
  return { root, st: { root, searchQ: '' } };
}
const visibleRows = (st) =>
  [...st.root.querySelectorAll('.tp-row')].filter((r) => !r.classList.contains('tp-hit-none'));

describe('v8.12 #71 搜索过滤行为级', () => {
  it('输入「电池」→ 仅电池行存活，其余全部加 tp-hit-none（修复前 0 行被过滤 ❌）', () => {
    const { st } = makeLeft();
    const total = st.root.querySelectorAll('.tp-row').length;
    expect(total).toBeGreaterThanOrEqual(19);   // 21 项 - hidden communal

    applySearch(st, '电池');
    const alive = visibleRows(st);
    expect(alive.length).toBe(1);
    expect(alive[0].dataset.label).toBe('电池');
    expect(st.root.querySelectorAll('.tp-row.tp-hit-none').length).toBe(total - 1);
  });

  it('别名表命中：深色→显示、省电→电池、wifi→网络和互联网、勿扰→提示音和振动', () => {
    const { st } = makeLeft();
    for (const [kw, want] of [['深色', '显示'], ['省电', '电池'], ['wifi', '网络和互联网'], ['勿扰', '提示音和振动']]) {
      applySearch(st, kw);
      const alive = visibleRows(st);
      expect(alive.map((r) => r.dataset.label), `kw=${kw}`).toContain(want);
    }
    // 清理 DOM
    st.root.remove();
  });

  it('清空输入 → 全部恢复（DoD：20 行回来，tp-hit-none 全摘）', () => {
    const { st } = makeLeft();
    const total = st.root.querySelectorAll('.tp-row').length;
    applySearch(st, '电池');
    applySearch(st, '');
    expect(visibleRows(st).length).toBe(total);
    expect(st.root.querySelector('.tp-search-empty').style.display).toBe('none');
  });

  it('无匹配词 zzz → 全部隐藏 + 空态提示「没有匹配的设置项」可见（DoD：不留空白）', () => {
    const { st } = makeLeft();
    applySearch(st, 'zzz');
    expect(visibleRows(st).length).toBe(0);
    const empty = st.root.querySelector('.tp-search-empty');
    expect(empty).toBeTruthy();
    expect(empty.textContent).toBe('没有匹配的设置项');
    expect(empty.style.display).toBe('block');
    st.root.remove();
  });

  it('大小写不敏感 + 子串匹配（WIFI/wi→网络行命中）', () => {
    const { st } = makeLeft();
    applySearch(st, 'WIFI');
    expect(visibleRows(st).map((r) => r.dataset.label)).toContain('网络和互联网');
    applySearch(st, '存储');
    expect(visibleRows(st).map((r) => r.dataset.label)).toContain('存储空间');
    st.root.remove();
  });

  it('搜索期间命中行 onclick/data-tp 保留（DoD：过滤后点击仍可进子页）', () => {
    const { st } = makeLeft();
    applySearch(st, '电池');
    const row = visibleRows(st)[0];
    expect(row.getAttribute('onclick')).toContain('__tpNav');
    expect(row.dataset.tp).toBe('2');
    st.root.remove();
  });
});

describe('v8.12 #71 源码锚定', () => {
  it('.tp-group 空转遍历退役：applySearch 直遍历 .tp-row + 联合匹配 data-keywords', () => {
    const block = src.slice(src.indexOf('export function applySearch'));
    expect(block).toContain(".root.querySelectorAll('.tp-row')");
    expect(block).toContain('dataset.keywords');
    expect(block).not.toContain("querySelectorAll('.tp-group')");
  });

  it('别名表随行落 DOM：navRow 输出 data-keywords；21 项 kw 全覆盖（除 hidden communal/security——v8.31 门控隐藏）', () => {
    expect(src).toMatch(/const kwAttr = item\.kw \? ` data-keywords="\$\{item\.kw\}"` : '';/);
    const items = aospTopLevelList();
    for (const it of items) {
      if (it.hidden) continue;
      expect(it.kw, `${it.key} 缺搜索别名表`).toBeTruthy();
    }
    // HTML 产物逐行验证
    const html = renderSettingsListHTML();
    expect(html).toContain('data-keywords="');
    expect((html.match(/data-keywords=/g) || []).length).toBe(items.filter((i) => !i.hidden).length);
  });

  it('空态提示锚点：tp-search-empty 动态创建 + 「没有匹配的设置项」+ kw&&零命中才显示', () => {
    const block = src.slice(src.indexOf('export function applySearch'));
    expect(block).toContain("tp-search-empty");
    expect(block).toContain('没有匹配的设置项');
    expect(block).toContain("(kw && !any) ? 'block' : 'none'");
  });

  it('导出面：applySearch 可导入（测试直调锚定）；.tp-group 相关 CSS 规则保留无害（死规则非病灶）', () => {
    expect(typeof applySearch).toBe('function');
    expect(src).toContain('export function applySearch');
  });
});
