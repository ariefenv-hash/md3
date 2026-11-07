// ==================== v200-chooser-rank.test.js — #200 Chooser 双池排序/直享/密度/折叠 v10.42 ====================
//
// 覆盖（R72 窗加餐）：
//   · aosp/chooser-rank.js 纯逻辑真跑：byScore 评分降序（稳定排序）/ azCompare 两级比较器
 //       （Collator localeCompare + 第二键）/ rankChooserTargets 双池分离（评分池 vs
 //       alphabetical pool，L1931）/ shouldExpandDirectShare 最少目标数护栏（L3636）/
 //       directShareVisibleCount 折叠 4 展开 8（L719）/ isCopyAllowed action 白名单
 //       （L1015-1046）/ createShareHistory 去重更新+封顶+降序（ShortcutManager dynamic
 //       shortcuts 同构）
//   · share-registry.js 接线锚：buildShareTargetsRanked 分池导出（既有 buildShareTargets
 //       curated 顺序零触碰）/ share-sheet.js 直享区渲染 + recordShareCompletion 调用点 +
 //       copy 校验消费 + 滚动扩行延迟决策
//   · 回归锚：share-registry 既有护栏（发起方剔除/无内容拒/卸载过滤/system 永不过滤）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CONFIG_CHOOSER_MAX_TARGETS_PER_ROW, DIRECT_SHARE_COLLAPSED_COUNT, DIRECT_SHARE_EXPANDED_COUNT,
  DIRECT_SHARE_HISTORY_KEY, DIRECT_SHARE_HISTORY_MAX, COPY_ALLOWED_ACTIONS,
  byScore, azCompare, shouldExpandDirectShare, directShareVisibleCount, isCopyAllowed,
  rankChooserTargets, createShareHistory,
} from '../ios-desktop/js/aosp/chooser-rank.js';
import { buildShareTargetsRanked, SHARE_TARGET_DEFS } from '../ios-desktop/js/share-registry.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RANK_JS = readFileSync(join(ROOT, 'ios-desktop/js/aosp/chooser-rank.js'), 'utf-8');
const REG = readFileSync(join(ROOT, 'ios-desktop/js/share-registry.js'), 'utf-8');
const SHEET = readFileSync(join(ROOT, 'ios-desktop/js/share-sheet.js'), 'utf-8');

// —— 内存 storage 桩 ——
function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

const BASE = [
  { id: 'msg', label: '信息' },
  { id: 'notes', label: '备忘录' },
  { id: 'photo', label: '存入相册' },
  { id: 'clipboard', label: '拷贝' },
];

describe('v10.42 #200 常量区（AOSP 资源同值）', () => {
  it('每行密度 config_chooser_max_targets_per_row = 4（L700/L1084）', () => {
    expect(CONFIG_CHOOSER_MAX_TARGETS_PER_ROW).toBe(4);
  });

  it('直享区折叠 4 / 展开 8（L719 "expand/shrink direct share 4 -> 8"）', () => {
    expect(DIRECT_SHARE_COLLAPSED_COUNT).toBe(4);
    expect(DIRECT_SHARE_EXPANDED_COUNT).toBe(8);
  });

  it('copy 白名单 = ACTION_SEND / ACTION_SEND_MULTIPLE（L1015-1046）', () => {
    expect(COPY_ALLOWED_ACTIONS).toEqual(['ACTION_SEND', 'ACTION_SEND_MULTIPLE']);
  });

  it('历史封顶 20 + 持久化键在录', () => {
    expect(DIRECT_SHARE_HISTORY_MAX).toBe(20);
    expect(DIRECT_SHARE_HISTORY_KEY).toBe('ios-desktop:chooser-direct-share-history');
  });
});

describe('v10.42 #200 双池排序纯函数', () => {
  it('byScore：score 降序（-Float.compare 同构）+ 同分稳定', () => {
    const sorted = [
      { id: 'a', score: 0.9 }, { id: 'b', score: 0.5 }, { id: 'c', score: 0.9 }, { id: 'd', score: 0.1 },
    ].sort(byScore);
    expect(sorted.map((t) => t.id)).toEqual(['a', 'c', 'b', 'd']); // 同分保持输入序
  });

  it('azCompare：label localeCompare 两级 + 第二键 id 稳定', () => {
    const input = [
      { id: 'x', label: '信息' }, { id: 'y', label: '备忘录' }, { id: 'z', label: '拷贝' },
    ];
    // Collator locale 序（AOSP AzInfoComparator 同构）：Node root locale 为码点序
    // （信息 4FE1 < 备忘录 5907 < 拷贝 62F7），浏览器 zh ICU 为拼音序——两者均为
    // 合法 Collator 语义，断言以 root 序锚定跨环境稳定
    const sorted = [...input].sort(azCompare);
    expect(sorted.map((t) => t.label)).toEqual(['信息', '备忘录', '拷贝']);
    // 与 String.prototype.localeCompare root 序逐对一致（Collator 等价性）
    expect(azCompare(input[0], input[1])).toBe(input[0].label.localeCompare(input[1].label, undefined, { sensitivity: 'base' }));
    // 同 label → 第二键 id 决胜（userHandle 槽位的 md3 单用户域等价物）
    expect(azCompare({ id: 'a', label: '同' }, { id: 'b', label: '同' })).toBeLessThan(0);
  });

  it('rankChooserTargets：直享池按 directIds 序回排 + 失效命中剔除 + rest 保持 curated 序', () => {
    const { direct, rest } = rankChooserTargets(BASE, ['photo', 'ghost', 'clipboard', 'photo']);
    expect(direct.map((t) => t.id)).toEqual(['photo', 'clipboard']); // ghost 无效剔除、重复去重
    expect(rest.map((t) => t.id)).toEqual(['msg', 'notes']); // 剩余保持注册表 curated 序
  });

  it('双池分离语义：直享目标不再出现于 rest（L1931 "alphabetical pool" 分离）', () => {
    const { direct, rest } = rankChooserTargets(BASE, ['notes']);
    expect(direct.map((t) => t.id)).toEqual(['notes']);
    expect(rest.some((t) => t.id === 'notes')).toBe(false);
  });
});

describe('v10.42 #200 折叠/展开与 copy 校验', () => {
  it('shouldExpandDirectShare：直享数 > 折叠数才允许展开（L3636 最少目标数护栏）', () => {
    expect(shouldExpandDirectShare(4)).toBe(false);
    expect(shouldExpandDirectShare(5)).toBe(true);
    expect(shouldExpandDirectShare(3, 2)).toBe(true);
  });

  it('directShareVisibleCount：折叠 4 / 展开 8 + 越界钳位', () => {
    expect(directShareVisibleCount(6, false)).toBe(4);
    expect(directShareVisibleCount(6, true)).toBe(6);
    expect(directShareVisibleCount(10, true)).toBe(8); // 展开上限 8
    expect(directShareVisibleCount(2, false)).toBe(2);
    expect(directShareVisibleCount(0, false)).toBe(0);
  });

  it('isCopyAllowed：白名单外拒绝 + 缺省视为 ACTION_SEND（md3 单载荷语义）', () => {
    expect(isCopyAllowed('ACTION_SEND')).toBe(true);
    expect(isCopyAllowed('ACTION_SEND_MULTIPLE')).toBe(true);
    expect(isCopyAllowed(undefined)).toBe(true);
    expect(isCopyAllowed('')).toBe(true);
    expect(isCopyAllowed('ACTION_VIEW')).toBe(false);
    expect(isCopyAllowed('ACTION_INSTALL_PACKAGE')).toBe(false);
  });
});

describe('v10.42 #200 createShareHistory（直享缓存真源）', () => {
  it('record 去重更新时间戳 + directHits 最近使用降序', () => {
    const st = memStorage();
    const h = createShareHistory(st);
    h.record('msg', 1000);
    h.record('notes', 2000);
    h.record('msg', 3000); // 更新而非追加
    expect(h.directHits()).toEqual(['msg', 'notes']);
    const raw = JSON.parse(st.getItem(DIRECT_SHARE_HISTORY_KEY));
    expect(raw).toHaveLength(2);
    expect(raw[0]).toEqual({ id: 'msg', at: 3000 });
  });

  it('record 封顶 DIRECT_SHARE_HISTORY_MAX（裁最旧）', () => {
    const st = memStorage();
    const h = createShareHistory(st);
    for (let i = 0; i < 25; i++) h.record('t' + i, i + 1);
    expect(h.directHits()).toHaveLength(DIRECT_SHARE_HISTORY_MAX);
    expect(h.directHits()[0]).toBe('t24'); // 最新在前
    expect(h.directHits().includes('t0')).toBe(false); // 最旧被裁
  });

  it('clear 清空 + 损坏存档静默回退 + record 空目标忽略', () => {
    const st = memStorage();
    const h = createShareHistory(st);
    h.record('msg', 1);
    h.clear();
    expect(h.directHits()).toEqual([]);
    st.setItem(DIRECT_SHARE_HISTORY_KEY, 'not-json{');
    expect(h.directHits()).toEqual([]);
    h.record('', 2);
    h.record(null, 2);
    expect(st.getItem(DIRECT_SHARE_HISTORY_KEY)).toBe('not-json{'); // 空目标未写盘
  });
});

describe('v10.42 #200 share-registry.js 分池导出接线', () => {
  it('buildShareTargetsRanked：纯文本载荷直享 msg → {direct:[msg], rest: curated 剩余}', () => {
    const { direct, rest } = buildShareTargetsRanked({ text: 'hi' }, '', [], ['msg']);
    expect(direct.map((t) => t.id)).toEqual(['msg']);
    expect(rest.map((t) => t.id)).toEqual(['notes', 'cal', 'reminders', 'files', 'translate', 'clipboard']);
  });

  it('直享失效命中（已卸载/类型不符）被剔除，不占直享位', () => {
    // photo 不接受 text（类型不符）→ 不进直享池
    const { direct } = buildShareTargetsRanked({ text: 'hi' }, '', [], ['photo', 'msg']);
    expect(direct.map((t) => t.id)).toEqual(['msg']);
    // notes 已卸载 → 过滤后不在 base → 剔除
    const r2 = buildShareTargetsRanked({ text: 'hi' }, '', [{ id: 'notes' }], ['notes', 'msg']);
    expect(r2.direct.map((t) => t.id)).toEqual(['msg']);
  });

  it('既有 buildShareTargets curated 顺序零触碰（回归锚）', () => {
    expect(buildShareTargetsRanked && SHARE_TARGET_DEFS).toBeTruthy();
    // 既有测试文件仍在册且断言注册表顺序
    const legacy = readFileSync(join(ROOT, 'tests/share-registry.test.js'), 'utf-8');
    expect(legacy).toContain("toEqual(['msg', 'notes', 'cal', 'reminders', 'files', 'translate', 'clipboard'])");
  });

  it('share-sheet.js 接线锚：直享区渲染 + recordShareCompletion + copy 校验 + 滚动扩行延迟决策', () => {
    expect(SHEET).toContain("from './aosp/chooser-rank.js'");
    expect(SHEET).toContain('buildShareTargetsRanked(');
    expect(SHEET).toMatch(/directShareHistory\.record\(/); // 分享完成落档
    expect(SHEET).toContain('isCopyAllowed('); // copy action 校验消费
    expect(SHEET).toMatch(/shouldExpandDirectShare\(/); // 扩行护栏
    expect(SHEET).toMatch(/directShareVisibleCount\(/); // 折叠/展开展示数
    expect(SHEET).toContain('share-direct-row'); // 直享区 DOM
  });
});
