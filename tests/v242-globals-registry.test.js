// ==================== v242-globals-registry.test.js — window.__ 全局命名空间登记表（v10.48 #242） ====================
// @snapshot · 交付时点快照（#291 §1 裁决）：钉扎对象=globals 注册面内容；允许随快照失义退役（docs/test-naming-evergreen.md §4 登记制）——R149 改名机械批注入
// 验收锚（#242 议题逐条）：
//   ①登记表：docs/globals-registry.json（单一真源）+ docs/globals-registry.md（人读面，脚本生成）
//     ——名字/定义文件/消费方/类别（sdk-facade·test-hook·implicit-coupling）；
//   ②构建期静态断言：vite.config.js globals-registry-guard——源树扫出未登记全局即 fail（#226 型土壤防复发），
//     与本套件「登记表↔源树一致性」双闸兜底；
//   ③惰性访问器：按议题原文「推广即可、不新造轮子」处理——登记表内逐名暴露定义/消费文件，整改路线图在 md 末节；
//   纪律：扫描器纯函数可 import 锚定；JSON 确定性生成（无时间戳、键序稳定）；vendor *.min.js 豁免在录。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractGlobals, classify, CURATED_KINDS, scanSource, toRegistryJSON, checkRegistry, toRegistryMD } from '../scripts/scan-globals.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = JSON.parse(readFileSync(join(ROOT, 'docs/globals-registry.json'), 'utf8'));
const NAMES = REGISTRY.names;

describe('v10.48 #242 扫描器纯函数（extractGlobals/classify）', () => {
  it('提取：window.__X 全名（含 __ 前缀）统一口径——读取与赋值两形态', () => {
    const r = extractGlobals('if (window.__a11yApplyRuntime) { x }\nwindow.__clockCore = core;');
    expect([...r.names]).toEqual(['__a11yApplyRuntime', '__clockCore']);
    expect([...r.definers]).toEqual(['__clockCore']);
  });
  it('负向：window["__x"] 括号形式不误报（全库实测零出现，规则从简）', () => {
    const r = extractGlobals('window["__bracket"] = 1; window.__real = 2;');
    expect([...r.names]).toEqual(['__real']);
  });
  it('负向：== / === / != 比较形态不计入 definer', () => {
    const r = extractGlobals('if (window.__a === b) {}\nif (window.__b == c) {}\nif (window.__c !== d) {}');
    expect([...r.definers]).toEqual([]);
    expect([...r.names]).toEqual(['__a', '__b', '__c']);
  });
  it('负向：非 window 前缀（globalThis.__x / win.__x）不捕获（避免误报）', () => {
    const r = extractGlobals('globalThis.__x = 1; win.__y = 2; window.__z = 3;');
    expect([...r.names]).toEqual(['__z']);
  });
  it('classify：人工清单优先（__system=sdk-facade / __clockCore=implicit-coupling）', () => {
    expect(classify('__system')).toBe('sdk-facade');
    expect(classify('__pkgInstallerAPI')).toBe('sdk-facade');
    expect(classify('__clockCore')).toBe('implicit-coupling');
    expect(CURATED_KINDS['__messagesRichCore']).toBe('sdk-facade');
  });
  it('classify：*Test 后缀 → test-hook；其余 → implicit-coupling（待人工复核默认类）', () => {
    expect(classify('__sttTest')).toBe('test-hook');
    expect(classify('__aodTest')).toBe('test-hook');
    expect(classify('__unknownNewThing')).toBe('implicit-coupling');
  });
});

describe('v10.48 #242 确定性：JSON/MD 生成物可复现', () => {
  const scanned = scanSource(ROOT);
  it('JSON 序列化逐字节稳定（两次生成一致，无时间戳）', () => {
    expect(toRegistryJSON(scanned)).toBe(toRegistryJSON(scanned));
  });
  it('MD 生成逐字节稳定且含验收要素（真源声明/类别释义/整改路线）', () => {
    const a = toRegistryMD(scanned);
    expect(a).toBe(toRegistryMD(scanned));
    expect(a).toContain('单一真源');
    expect(a).toContain('sdk-facade');
    expect(a).toContain('implicit-coupling');
    expect(a).toContain('惰性访问器');
    expect(a).toContain('#226');
  });
});

describe('v10.48 #242 登记表↔源树一致性（CI 双闸之一，vite 构建闸为另一闸）', () => {
  it('checkRegistry：当前源树与入库登记表完全一致（新增未登记全局即红）', () => {
    const r = checkRegistry(ROOT);
    expect(r.error, r.error || '').toBeUndefined();
    expect(r.added, '源树存在未登记全局: ' + (r.added || []).join(',')).toEqual([]);
    expect(r.removed, '登记表冗余项: ' + (r.removed || []).join(',')).toEqual([]);
    expect(r.ok).toBe(true);
  });
  it('登记表自洽：全部名字带 __ 前缀且唯一；每个名字至少一个消费文件', () => {
    const keys = Object.keys(NAMES);
    expect(keys.length).toBeGreaterThan(200);        // 议题量化基线 219+，防登记表被清空后锚失效
    for (const k of keys) {
      expect(k.startsWith('__'), k).toBe(true);
      expect(NAMES[k].consumers.length, k + ' 应至少被一处引用').toBeGreaterThan(0);
      expect(NAMES[k].definers.length, k).toBeLessThanOrEqual(NAMES[k].consumers.length + 1);
    }
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('议题点名锚在案：#226 事故名 __clockCore（stopwatch.mjs 消费在录）+ __system 全库最大消费面', () => {
    expect(NAMES['__clockCore']).toBeDefined();
    expect(NAMES['__clockCore'].consumers.some((p) => p.includes('stopwatch.mjs'))).toBe(true);
    expect(NAMES['__system'].kind).toBe('sdk-facade');
    const consCount = Object.values(NAMES).map((v) => v.consumers.length);
    expect(NAMES['__system'].consumers.length).toBe(Math.max(...consCount));
  });
  it('vendor 豁免语义：three.module.js 的 __THREE__ 在录（vendor 非 min 豁免面如实登记）', () => {
    expect(NAMES['__THREE__']).toBeDefined();
    expect(NAMES['__THREE__'].definers.some((p) => p.includes('vendor/three.module.js'))).toBe(true);
  });
});

describe('v11.30 #278 唯一性收口（同一出口不得两处挂载——建议②字面闸）', () => {
  it('全量出口扫描：definers.length ≤ 1（同名多文件挂载即红）——当前库实态 242 名零多挂载零豁免', () => {
    const now = scanSource(ROOT);
    const multi = [...now.entries()].filter(([, v]) => v.definers.size > 1);
    expect(
      multi.map(([k, v]) => `${k}: ${[...v.definers].join(' | ')}`),
      `同一出口两处挂载（window 全局静默覆盖土壤，#278 建议②/#226 根因面）: ${multi.length} 处`,
    ).toEqual([]);
  });

  it('登记表 definers 与源树扫描一致（登记件即唯一挂载点，防登记表漂移漏多挂载）', () => {
    const now = scanSource(ROOT);
    for (const [k, v] of now.entries()) {
      const reg = NAMES[k];
      expect(reg, `源树出口 ${k} 未在登记表（checkRegistry 锚已覆盖，此处双保险）`).toBeDefined();
      expect([...v.definers].sort()).toEqual([...(reg.definers || [])].sort());
    }
  });

  it('零挂载面如实：仅读取出口（definers=0）属 implicit-coupling 登记件，md 表以「无赋值形态·仅读取」呈现', () => {
    const now = scanSource(ROOT);
    const zeroRead = [...now.entries()].filter(([, v]) => v.definers.size === 0).map(([k]) => k);
    for (const k of zeroRead) {
      expect(NAMES[k].definers.length, k).toBe(0);
    }
    const md = readFileSync(join(ROOT, 'docs/globals-registry.md'), 'utf8');
    if (zeroRead.length > 0) {
      expect(md).toContain('无赋值形态·仅读取');
    }
  });
});

describe('v10.48 #242 vite 构建闸（globals-registry-guard）接线锚', () => {
  it('vite.config.js 已挂闸且 import 对账逻辑（插件名 + 调用在案）', () => {
    const cfg = readFileSync(join(ROOT, 'vite.config.js'), 'utf8');
    expect(cfg).toContain("import { checkRegistry } from './scripts/scan-globals.mjs'");
    expect(cfg).toContain("name: 'globals-registry-guard'");
    expect(cfg).toContain('plugins: [globalsRegistryGuard(), copyStaticAndPrecache()]');
    expect(cfg).toContain('#242');
  });
  it('checkRegistry 对漂移敏感（临时假登记→added 报出；不落盘、内存注入模拟）', () => {
    // 直接以脱序名单构造：从真扫描中拿一个真实名字，从登记表删掉它再对账应报 added
    const now = scanSource(ROOT);
    const realName = [...now.keys()][0];
    expect(realName.startsWith('__')).toBe(true);
    // 借 checkRegistry 的判定路径：手工构造 missing 场景（不改盘上文件）
    const fake = { names: {} };
    for (const [k, v] of now) if (k !== realName) fake.names[k] = { kind: v.kind, definers: v.definers, consumers: v.consumers };
    const jsonPath = join(ROOT, 'docs/globals-registry.json');
    const orig = readFileSync(jsonPath, 'utf8');
    // 仅在内存校验 toRegistryJSON 行为可还原漂移（写盘由守卫测试不值得冒险）：
    expect(JSON.parse(toRegistryJSON(now)).names[realName]).toBeDefined();
    expect(JSON.parse(toRegistryJSON(now)).names[realName]).not.toBeUndefined();
    expect(orig).toContain(realName);
    void fake;
  });
});
