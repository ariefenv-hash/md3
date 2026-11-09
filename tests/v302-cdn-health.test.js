// ==================== v10.96 #302：CDN 源健康检查（失败拉黑本会话 + 链过滤 + 破黑逃生门） ====================
//
// 议题 #302（[P2][兼容][实测] jsDelivr gh 代理对本仓全局 403——所有 jsDelivr@main 回退通道
// 需体检与降级策略）交付守护：
//   ① 全仓 jsdelivr 引用清点 33 处分类：运行时跨域源 3 处（catalog gh 通道 / pyodide /
//     tesseract npm）+ 注释性引用 + 测试锚 —— 清点结论固化于本文件 C 组与 pkg-catalog ⑤。
//   ② 决定性复测（2026-11-09 00:15Z）：gh 通道 403(#298, 11-08) ↔ 200×3（11-09）交替，
//     「通道可用性会变」(#18 §7.1②) 成立 → 交付从「换通道」修正为「健康检查先行」
//     （换通道不可依赖波动窗口；raw.githubusercontent 本沙箱实测 000 不可达不作为方向）。
//   ③ 落地面：ios-desktop/js/pkg/cdn-health.js 纯逻辑核（零依赖零 DOM，注入式存储）+
//     appstore.fetchChainJson 接线（失败源拉黑 sessionStorage / 成功复活 / 链过滤 /
//     全滤空破黑保「重试」逃生门）。
//   ④ 边界：同源相对地址永不拉黑（SW cacheFirst 管辖口径）；仅跨域 CDN 源参与黑名单。
//
// 测试纪律：indexOf 切片锚点用定义形态；负断言用 not.toMatch 正则防注释误报；
// 存储一律注入（node 环境无 sessionStorage，defaultStore 走内存 Map 兜底）。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  CDN_HEALTH_KEY_PREFIX,
  CDN_HEALTH_TTL_MS,
  CDN_HEALTH_REASON_MAX,
  isRemoteSource,
  blacklistKey,
  isSourceBlocked,
  blockSource,
  reviveSource,
  filterChainByHealth,
} from '../ios-desktop/js/pkg/cdn-health.js';

import { CATALOG_URL, CDN_CATALOG_URL, catalogFetchChain } from '../ios-desktop/js/pkg/pkg-catalog.js';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');

const CDN = 'https://cdn.jsdelivr.net/gh/ariefenv-hash/md3@main/ios-desktop/catalog.json';
const T0 = 1762900000000; // 固定时间基（2026-11-12 前后量级，测试不受真实时钟影响）

/** 极简 Map 存储（Storage 语义子集：getItem/setItem/removeItem） */
function memStore() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}

describe('v10.96 #302 cdn-health 纯逻辑核：拉黑 / 复活 / TTL', () => {
  it('A1 拉黑后黑名单命中，复活后解除', () => {
    const st = memStore();
    expect(isSourceBlocked(CDN, T0, st)).toBe(false);
    expect(blockSource(CDN, 'HTTP 403', T0, st)).toBe(true);
    expect(isSourceBlocked(CDN, T0 + 1000, st)).toBe(true);
    expect(reviveSource(CDN, st)).toBe(true);
    expect(isSourceBlocked(CDN, T0 + 2000, st)).toBe(false);
  });

  it('A2 同源相对地址拒绝拉黑（边界裁决：SW cacheFirst 管辖，不弱化本地真源）', () => {
    const st = memStore();
    expect(blockSource('catalog.json', 'HTTP 404', T0, st)).toBe(false);
    expect(blockSource('./catalog.json', 'HTTP 404', T0, st)).toBe(false);
    expect(isSourceBlocked('catalog.json', T0, st)).toBe(false);
    // 过滤器同样永保留同源位
    const r = filterChainByHealth(['catalog.json'], { now: T0, store: st });
    expect(r.chain).toEqual(['catalog.json']);
    expect(r.skipped).toEqual([]);
  });

  it('A3 TTL 24h 过期自动失效 + 过期条目惰性清除', () => {
    const st = memStore();
    blockSource(CDN, 'HTTP 403', T0, st);
    expect(isSourceBlocked(CDN, T0 + CDN_HEALTH_TTL_MS - 1, st)).toBe(true);
    expect(isSourceBlocked(CDN, T0 + CDN_HEALTH_TTL_MS, st)).toBe(false);
    expect(st.getItem(blacklistKey(CDN))).toBe(null); // 过期顺手清
  });

  it('A4 重复拉黑覆盖旧条目（刷新 at 延长 TTL —— 连续失败证明通道仍死）', () => {
    const st = memStore();
    blockSource(CDN, 'HTTP 403', T0, st);
    blockSource(CDN, 'HTTP 403', T0 + 3600_000, st);
    // 若未覆盖，T0+24h+3600s 处应已过期；覆盖后仍拉黑
    expect(isSourceBlocked(CDN, T0 + CDN_HEALTH_TTL_MS + 1800_000, st)).toBe(true);
  });

  it('A5 非法源与理由规约：非串/空串拒绝、理由超限截断', () => {
    const st = memStore();
    expect(blockSource(undefined, 'x', T0, st)).toBe(false);
    expect(blockSource('', 'x', T0, st)).toBe(false);
    expect(blockSource('x'.repeat(2000), 'x', T0, st)).toBe(false);
    blockSource(CDN, 'E'.repeat(500), T0, st);
    const raw = JSON.parse(st.getItem(blacklistKey(CDN)));
    expect(raw.reason.length).toBe(CDN_HEALTH_REASON_MAX);
  });

  it('A6 坏 JSON 条目 / 缺 at 字段 → 视为未拉黑且顺手清除', () => {
    const st = memStore();
    st.setItem(blacklistKey(CDN), '{not-json');
    expect(isSourceBlocked(CDN, T0, st)).toBe(false);
    expect(st.getItem(blacklistKey(CDN))).toBe(null);
    st.setItem(blacklistKey(CDN), JSON.stringify({ reason: 'no-at' }));
    expect(isSourceBlocked(CDN, T0, st)).toBe(false);
    expect(st.getItem(blacklistKey(CDN))).toBe(null);
  });

  it('A7 isRemoteSource 判据与常量冻结', () => {
    expect(isRemoteSource('https://cdn.jsdelivr.net/x')).toBe(true);
    expect(isRemoteSource('http://example.com/y')).toBe(true);
    expect(isRemoteSource('catalog.json')).toBe(false);
    expect(isRemoteSource('data:image/png;base64,x')).toBe(false);
    expect(CDN_HEALTH_KEY_PREFIX).toBe('ios-desktop:cdn-health:');
    expect(CDN_HEALTH_TTL_MS).toBe(24 * 60 * 60 * 1000);
    expect(CDN_HEALTH_REASON_MAX).toBe(120);
  });

  it('A8 默认存储内存兜底：无注入时不抛错且与注入实例隔离', () => {
    // node 环境无 sessionStorage → defaultStore 走 memStore（模块级单例）
    expect(blockSource(CDN, 'net error', T0)).toBe(true);
    expect(isSourceBlocked(CDN, T0 + 1)).toBe(true);
    // 注入实例不受影响
    const st = memStore();
    expect(isSourceBlocked(CDN, T0 + 1, st)).toBe(false);
    // 清理模块级兜底，防跨用例污染
    reviveSource(CDN);
    expect(isSourceBlocked(CDN, T0 + 1)).toBe(false);
  });
});

describe('v10.96 #302 filterChainByHealth 链过滤与破黑逃生门', () => {
  it('B1 黑名单内跨域源被过滤，同源位与 healthy 源保留', () => {
    const st = memStore();
    blockSource(CDN, 'HTTP 403', T0, st);
    const healthy = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/package.json';
    const r = filterChainByHealth(['catalog.json', CDN, healthy], { now: T0, store: st });
    expect(r.chain).toEqual(['catalog.json', healthy]);
    expect(r.skipped).toEqual([CDN]);
  });

  it('B2 链全滤空 → 破黑返回原链并清全部跨域黑名单（重试逃生门）', () => {
    const st = memStore();
    const c1 = 'https://cdn.jsdelivr.net/gh/a@main/x.json';
    const c2 = 'https://unpkg.com/y.json';
    blockSource(c1, 'HTTP 403', T0, st);
    blockSource(c2, 'network error', T0, st);
    const r = filterChainByHealth([c1, c2], { now: T0, store: st });
    expect(r.chain).toEqual([c1, c2]);
    expect(r.skipped).toEqual([c1, c2]);
    expect(isSourceBlocked(c1, T0, st)).toBe(false);
    expect(isSourceBlocked(c2, T0, st)).toBe(false);
  });

  it('B3 空/非数组链安全返回空结果', () => {
    expect(filterChainByHealth([], { now: T0, store: memStore() })).toEqual({ chain: [], skipped: [] });
    expect(filterChainByHealth(undefined, { now: T0, store: memStore() })).toEqual({ chain: [], skipped: [] });
  });

  it('B4 同源与跨域混合链在同源也被「伪造拉黑尝试」下仍保留同源位', () => {
    const st = memStore();
    // 尝试拉黑同源被 A2 守卫拒绝 → 链过滤永远给同源机会
    blockSource('catalog.json', 'HTTP 404', T0, st);
    const r = filterChainByHealth(['catalog.json', CDN], { now: T0, store: st });
    expect(r.chain).toContain('catalog.json');
  });
});

describe('v10.96 #302 appstore.fetchChainJson 接线锚（源码串锚）', () => {
  const appstore = src('ios-desktop/js/apps/appstore.js');

  it('B5 import 与 window 桥九件套在册', () => {
    expect(appstore).toContain("import { filterChainByHealth, blockSource, reviveSource } from '../pkg/cdn-health.js';");
    expect(appstore).toContain('filterChainByHealth, blockSource, reviveSource }');
    expect(appstore.match(/window\.__asCatalogCore = \{[^}]*\}/)[0]).toContain('filterChainByHealth');
    expect(appstore.match(/window\.__asCatalogCore = \{[^}]*\}/)[0]).toContain('blockSource');
    expect(appstore.match(/window\.__asCatalogCore = \{[^}]*\}/)[0]).toContain('reviveSource');
  });

  it('B6 链过滤接线：filterChainByHealth(baseChain, Date.now()) + skipped 提示', () => {
    expect(appstore).toContain('core.filterChainByHealth');
    expect(appstore).toContain('core.filterChainByHealth(baseChain, Date.now())');
    expect(appstore).toContain("'[appstore] 目录源健康过滤，本会话跳过已失败源：'");
  });

  it('B7 失败拉黑 / 成功复活 / 网络失败拉黑三路在册', () => {
    const chainFn = appstore.slice(appstore.indexOf('function fetchChainJson'), appstore.indexOf('function loadCatalog'));
    expect(chainFn).toContain("core.blockSource(url, 'HTTP ' + res.status, Date.now())");
    expect(chainFn).toContain('core.reviveSource(url)');
    expect(chainFn).toContain('__asHealthBlocked');
    expect(chainFn).toContain("core.blockSource(url, (err && err.message) ? err.message : 'network error', Date.now())");
  });

  it('B8 首跳前过滤、i 越界拒绝语义保留（#183 降级纪律零漂移）', () => {
    const chainFn = appstore.slice(appstore.indexOf('function fetchChainJson'), appstore.indexOf('function loadCatalog'));
    expect(chainFn).toContain("if (i >= chain.length) return Promise.reject(new Error('目录全链不可达'))");
    expect(chainFn).toContain('if (i < chain.length) return tryNext();');
    expect(chainFn).toContain('return res.json()');
  });
});

describe('v10.96 #302 通道清点锚（33 处清点结论固化）', () => {
  it('C1 CDN 兜底位保留（通道波动实证：403↔200 交替，不依赖波动窗口换通道）', () => {
    expect(CDN_CATALOG_URL).toBe('https://cdn.jsdelivr.net/gh/ariefenv-hash/md3@main/ios-desktop/catalog.json');
    const chain = catalogFetchChain();
    expect(chain[0]).toBe(CATALOG_URL);
    expect(chain[1]).toBe(CDN_CATALOG_URL);
  });

  it('C2 pyodide / OCR 通道零触碰（复测 200 健康车道边界锚）', () => {
    const py = src('ios-desktop/js/python-core.js');
    expect(py).toContain("var PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/' + PYODIDE_VERSION + '/full/pyodide.js';");
    // OCR vendor 两处兜底归 v852 锚管，此处仅锚文件未被本轮改动形态（jsdelivr 兜底仍恰两处的载体存在）
    expect(src('ios-desktop/apps/_shared/vendor/ocr/worker.min.js')).toContain('cdn.jsdelivr.net');
  });

  it('C3 cdn-health.js 纯逻辑核零环判据（#147 同款）：零 import 零 require 零 DOM', () => {
    const s = src('ios-desktop/js/pkg/cdn-health.js');
    expect(s).not.toMatch(/(^|[^.\w])import\s/);
    expect(s).not.toMatch(/require\(/);
    expect(s).not.toMatch(/document\.|window\./);
  });

  it('C4 pkg-catalog ⑤ 通道波动实录注释在册（清点结论文档化锚）', () => {
    const s = src('ios-desktop/js/pkg/pkg-catalog.js');
    expect(s).toContain('#302 复测 2026-11-09');
    expect(s).toContain('cdn-health.js 源健康检查兜底');
  });
});
