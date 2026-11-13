// ==================== v283 · localStorage 键名注册表守护（#283 处置建议①落地 · R155 窗加餐） ====================
// @snapshot · 交付时点快照（#291 §1 裁决）：钉扎对象=#283 处置① localStorage 键名注册表四组口径（14→56 / 1→6 / 1→1 / 裸 3→39）的登记时点；允许随快照失义退役（docs/test-naming-evergreen.md §4 登记制）—— 2026-11-13 补标记批（承 #291 补关评论登记的 10 例新违规，非 R149 原注入批）
// A 生成器结构锚（--check 闸/零时间戳/schema 1）
// B 注册表真源对账（四组口径 + 卡面证据演进对账：ios-desktop 14→56/settings 1→6/android17 1→1/裸 3→39）
// C 非命名空间键现状登记组（处置②收编前如实登记，非硬门禁——先收编后门禁）
// D 文档面单真源（storage-keys-registry.md 为人读版随树再生）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const R = (p) => readFileSync(resolve(__dirname, '..', p), 'utf-8');
const reg = JSON.parse(R('docs/audits/storage-keys-registry.json'));

describe('v283 · A 生成器结构锚', () => {
  it('A1 --check 逐字节可重现（exit 0）', () => {
    const out = execSync('node scripts/gen-storage-keys-registry.mjs --check', { encoding: 'utf-8' });
    expect(out).toContain('--check OK');
  });

  it('A2 schema 1 + 零时间戳 + 生成器署名', () => {
    expect(reg.schema).toBe(1);
    expect(JSON.stringify(reg)).not.toMatch(/(generated|timestamp)"\s*:/i);
    expect(reg.generator).toContain('gen-storage-keys-registry.mjs');
    expect(reg.generator).toContain('#283');
  });

  it('A3 四组口径在册（groups 键集封域）', () => {
    expect(Object.keys(reg.groups).sort()).toEqual(['android17', 'bare', 'ios-desktop', 'settings']);
    expect(reg.totals.all).toBe(reg.totals['ios-desktop'] + reg.totals.settings + reg.totals.android17 + reg.totals.bare);
  });
});

describe('v283 · B 注册表真源对账（卡面证据演进）', () => {
  it('B1 ios-desktop: 主力命名空间在册且 ≥ 卡面 14 键（v10.72 → 现值只增）', () => {
    expect(reg.totals['ios-desktop']).toBeGreaterThanOrEqual(14);
    for (const k of reg.groups['ios-desktop']) expect(k.name.startsWith('ios-desktop:')).toBe(true);
  });

  it('B2 卡面点名键全数在册（wallpaper/theme-hue/split-groups/data-version/volume-side + display-v1 + shadeMode + 两裸键已收编重锚；_localforage_support_test 为 vendor 内部键走排除口径见 C4）', () => {
    const names = new Set([...reg.groups['ios-desktop'], ...reg.groups.settings, ...reg.groups.android17, ...reg.groups.bare].map(k => k.name));
    for (const n of ['ios-desktop:wallpaper', 'ios-desktop:theme-hue', 'ios-desktop:split-groups', 'ios-desktop:data-version', 'ios-desktop:volume-side',
      'settings:display-v1', 'android17:shadeMode', 'ios-desktop:files-clean-freed-total', 'ios-desktop:camera-gallery']) {
      expect(names.has(n), `${n} 应在册`).toBe(true);
    }
  });

  it('B3 settings: 域 *-v1 结构版本先例集中地（6 键全带 -v1 后缀）', () => {
    expect(reg.totals.settings).toBeGreaterThanOrEqual(1);
    for (const k of reg.groups.settings) expect(k.name).toMatch(/-v\d$/);
  });
});

describe('v283 · C 非命名空间键现状登记（处置②收编前如实登记 · 非硬门禁）', () => {
  it('C1 现状登记：bare 组在册（收编候选池基线）；卡面两裸键主读写已收编（新键入 ios-desktop: 组），旧键字面仅存迁移回落引用（扫描器直接调用点口径如实登记，回落期结束随②批移出）', () => {
    expect(reg.totals.bare).toBeGreaterThanOrEqual(3);
    const names = reg.groups.bare.map(k => k.name);
    expect(names).toContain('files_clean_freed_total');  // v11.17 #283 后仅存迁移回落字面
    expect(names).toContain('pixel_camera_gallery');     // 同上
    const ios = reg.groups['ios-desktop'].map(k => k.name);
    expect(ios).toContain('ios-desktop:files-clean-freed-total'); // 收编主键
    expect(ios).toContain('ios-desktop:camera-gallery');          // 收编主键
  });

  it('C2 卡面未载新孤儿前缀如实登记（media-output:/typing./vd./md3. 点分形态）', () => {
    const names = reg.groups.bare.map(k => k.name);
    expect(names).toContain('media-output:active');
    expect(names).toContain('typing.best.v1');
    expect(names).toContain('vd.safety.confirmed');
    expect(names).toContain('md3.tbTransientEdu');
  });

  it('C3 处置②③边界注记在文档面（先收编后门禁，硬门禁留②收编后另批）', () => {
    const md = R('docs/storage-keys-registry.md');
    expect(md).toContain('先收编后门禁');
    expect(md).toContain('一次性迁移读');
    expect(md).toContain('留主任务窗施工');
  });

  it('C4 vendor 排除口径验证：_localforage_support_test（localforage 库内部探测键）不在册且排除口径在档（卡面在录为外来先例，收编注记=豁免候选）', () => {
    const names = reg.groups.bare.map(k => k.name);
    expect(names).not.toContain('_localforage_support_test');
    expect(reg.exclusion).toContain('vendor');
    const md = R('docs/storage-keys-registry.md');
    expect(md).toContain('_localforage_support_test'); // md 裸键表内保留注记行（豁免候选）
  });
});

describe('v283 · D 文档面单真源', () => {
  it('D1 storage-keys-registry.md 与 JSON 总账一致', () => {
    const md = R('docs/storage-keys-registry.md');
    expect(md).toContain(String(reg.totals.all) + ' 键');
    expect(md).toContain('gen-storage-keys-registry.mjs');
    expect(md).toContain('#283 处置建议①');
  });
});
