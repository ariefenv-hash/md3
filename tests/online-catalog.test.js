// ==================== v11.29 #183 二期：在线目录 CDN 链 + #172 外部项目轻量壳 ====================
//
// 议题 #183 二期交付守护（一期交付帖 6701149610 二期续点 verbatim）：
//   ① 目录 fetch 链：catalogFetchChain() 纯函数 —— 同源 catalog.json 首选 → jsdelivr CDN 兜底
//     → 全失降级（#298 链序翻转：jsdelivr 对本仓全局 403 实证，首选位恒死拖慢失败路径）
//   ② #172 外部条目：normalizeExternalEntry / normalizeExternals 纯核（url http(s) 白名单）
//      + catalog.json externals 账（R114 四站点入库；R115 窗 #172 余项扩至十一站点，全量重锚 v11.29）
//   ③ 外部应用轻量壳：pkg-store 'externals' store（DB v2）+ pkg-registry addExternalApp /
//      removeExternalApp（对齐包应用挂载/卸载链）+ initInstaller 启动重挂 + 桥三口
//   ④ 目录版本语义：compareVersions 纯函数 + appstore 三态（获取/已安装/可更新）
//   ⑤ appstore 接线锚：fetch 链消费 / 外部区块 / 添加移除确认组（m3e-btngroup 范式）
//
// 测试纪律：indexOf 切片锚点用定义形态；负断言用 not.toMatch 正则防注释误报。

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  normalizeCatalog,
  normalizeExternalEntry,
  normalizeExternals,
  isUsableCatalog,
  catalogFetchChain,
  compareVersions,
  CATALOG_URL,
  CDN_CATALOG_URL,
  EXTERNALS_MAX,
  EXTERNAL_APP_PREFIX,
  EXTERNAL_URL_MAX,
} from '../ios-desktop/js/pkg/pkg-catalog.js';

import { pkgStore, __forceMemoryBackendForTests, __resetBackendForTests } from '../ios-desktop/js/pkg/pkg-store.js';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');

describe('v11.29 #183② pkg-catalog 二期常量与零环判据', () => {
  it('CDN 地址 / 外部前缀 / 外部上限常量在册', () => {
    expect(CATALOG_URL).toBe('catalog.json');
    expect(CDN_CATALOG_URL).toBe('https://cdn.jsdelivr.net/gh/ariefenv-hash/md3@main/ios-desktop/catalog.json');
    expect(EXTERNAL_APP_PREFIX).toBe('ext-');
    expect(EXTERNALS_MAX).toBe(50);
    expect(EXTERNAL_URL_MAX).toBe(512);
  });

  it('#147 判据同款零环维持：纯核二期扩展后仍零 import 零 require 零 DOM 触碰', () => {
    const s = src('ios-desktop/js/pkg/pkg-catalog.js');
    expect(s).not.toMatch(/(^|[^.\w])import\s/);
    expect(s).not.toMatch(/require\(/);
    expect(s).not.toMatch(/document\.|window\./);
  });
});

describe('v11.29 #183② catalogFetchChain fetch 候选链（#298 链序翻转重锚）', () => {
  it('同源首选 → CDN 兜底，有序 ≥2 条且无重复', () => {
    const chain = catalogFetchChain();
    expect(Array.isArray(chain)).toBe(true);
    expect(chain.length).toBeGreaterThanOrEqual(2);
    expect(chain[0]).toBe(CATALOG_URL);
    expect(chain.indexOf(CDN_CATALOG_URL)).toBeGreaterThan(0);
    expect(new Set(chain).size).toBe(chain.length);
  });
});

describe('v11.29 #183② normalizeExternalEntry 外部条目归一', () => {
  const VALID = {
    id: 'moyugang',
    name: '墨韵战纪',
    url: 'https://ariefenv-hash.github.io/moyugang/?embed=1&perf=low',
    icon: '',
    version: '',
    description: '水墨风火柴人武道',
  };

  it('合法条目全字段收敛 + kind:external 标记', () => {
    const r = normalizeExternalEntry(VALID);
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
    expect(r.entry).toEqual({
      id: 'moyugang',
      name: '墨韵战纪',
      url: 'https://ariefenv-hash.github.io/moyugang/?embed=1&perf=low',
      icon: '',
      version: '',
      description: '水墨风火柴人武道',
      kind: 'external',
    });
  });

  it('三缺一即整条拒绝：id / name / url', () => {
    expect(normalizeExternalEntry({ name: 'x', url: 'https://a.b/' }).ok).toBe(false);
    expect(normalizeExternalEntry({ id: 'a', url: 'https://a.b/' }).ok).toBe(false);
    expect(normalizeExternalEntry({ id: 'a', name: 'x' }).ok).toBe(false);
    expect(normalizeExternalEntry('string').ok).toBe(false);
    expect(normalizeExternalEntry(null).ok).toBe(false);
    expect(normalizeExternalEntry([{ id: 'a' }]).ok).toBe(false);
  });

  it('url 仅 http(s)：危险 scheme / 协议相对 / 同源相对全拒', () => {
    expect(normalizeExternalEntry({ id: 'a', name: 'x', url: 'javascript:alert(1)' }).issues.join('')).toContain('危险');
    expect(normalizeExternalEntry({ id: 'a', name: 'x', url: 'data:text/html,x' }).ok).toBe(false);
    expect(normalizeExternalEntry({ id: 'a', name: 'x', url: 'file:///etc/passwd' }).ok).toBe(false);
    expect(normalizeExternalEntry({ id: 'a', name: 'x', url: '//evil.example/' }).ok).toBe(false);
    expect(normalizeExternalEntry({ id: 'a', name: 'x', url: 'page/index.html' }).ok).toBe(false);
    expect(normalizeExternalEntry({ id: 'a', name: 'x', url: 'http://a.b/' }).entry.url).toBe('http://a.b/');
    expect(normalizeExternalEntry({ id: 'a', name: 'x', url: 'https://a.b/' }).entry.url).toBe('https://a.b/');
  });

  it('icon 白名单（http(s)/data:image）与 id 非法形态拒绝', () => {
    expect(normalizeExternalEntry({ ...VALID, icon: 'javascript:x' }).entry.icon).toBe('');
    expect(normalizeExternalEntry({ ...VALID, icon: 'data:image/png;base64,xx' }).entry.icon).toContain('data:image/');
    expect(normalizeExternalEntry({ ...VALID, icon: 'https://a.b/i.png' }).entry.icon).toBe('https://a.b/i.png');
    expect(normalizeExternalEntry({ ...VALID, id: '1 bad id' }).ok).toBe(false);
    expect(normalizeExternalEntry({ ...VALID, id: 42 }).ok).toBe(false);
  });
});

describe('v11.29 #183② normalizeExternals 数组收敛', () => {
  const ok1 = { id: 'a', name: 'A', url: 'https://a.example/' };
  const ok2 = { id: 'b', name: 'B', url: 'https://b.example/' };

  it('宽容解析：坏条目跳过记序号、id 重复首见保留、null 宽容', () => {
    const r = normalizeExternals([ok1, { name: '无url' }, ok2, ok1]);
    expect(r.externals.map((e) => e.id)).toEqual(['a', 'b']);
    expect(r.issues.some((s) => s.startsWith('ext[1]'))).toBe(true);
    expect(r.issues.some((s) => s.includes('重复'))).toBe(true);
    expect(normalizeExternals(null).externals).toEqual([]);
    expect(normalizeExternals(undefined).issues).toEqual([]);
    expect(normalizeExternals('garbage').issues.some((s) => s.includes('非数组'))).toBe(true);
  });

  it('上限截断：EXTERNALS_MAX 独立于 apps 账', () => {
    const many = [];
    for (let i = 0; i < EXTERNALS_MAX + 3; i++) many.push({ id: 'e' + i, name: 'E' + i, url: 'https://e' + i + '.example/' });
    const r = normalizeExternals(many);
    expect(r.externals.length).toBe(EXTERNALS_MAX);
    expect(r.issues.some((s) => s.includes('截断'))).toBe(true);
  });
});

describe('v11.29 #183② normalizeCatalog externals 接线与可用判定', () => {
  it('对象载荷带 externals → 结果分账携带；坏外部账不拖垮 apps', () => {
    const r = normalizeCatalog({
      apps: [{ id: 'a.b', name: 'A' }],
      externals: [{ id: 'e1', name: 'E', url: 'https://e.example/' }, { name: '无url' }],
    });
    expect(r.ok).toBe(true);
    expect(r.apps.length).toBe(1);
    expect(r.externals.length).toBe(1);
    expect(r.externals[0].kind).toBe('external');
    expect(r.issues.some((s) => s.startsWith('ext[1]'))).toBe(true);
  });

  it('externals 缺省 → 空账（一期载荷形态完全向后兼容）', () => {
    const r = normalizeCatalog({ apps: [{ id: 'a.b', name: 'A' }] });
    expect(r.externals).toEqual([]);
    const arr = normalizeCatalog([{ id: 'a.b', name: 'A' }]);
    expect(arr.externals).toEqual([]);
  });

  it('apps 缺失仍整体 degraded（externals 救不了整册）；externals 非空可独立撑起可用', () => {
    const degraded = normalizeCatalog({ externals: [{ id: 'e', name: 'E', url: 'https://e.example/' }] });
    expect(degraded.ok).toBe(false);
    expect(degraded.degraded).toBe(true);
    expect(isUsableCatalog(degraded)).toBe(false);
    expect(isUsableCatalog({ ok: true, apps: [], externals: [{ id: 'e', name: 'E', url: 'https://e.example/' }] })).toBe(true);
    expect(isUsableCatalog({ ok: true, apps: [{ id: 'a', name: 'A' }], externals: [] })).toBe(true);
    expect(isUsableCatalog({ ok: true, apps: [], externals: [] })).toBe(false);
  });
});

describe('v11.29 #183② compareVersions 版本语义', () => {
  it('数字段比较 / 缺段补零 / 相等 / 大小序', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('2.0', '1.9.9')).toBe(1);
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.2', '1.10')).toBe(-1);
    expect(compareVersions('99.31.0', '99.30.0')).toBe(1);
  });

  it('非串 / 空串 → null（未知态）；非数字段按前导数字收敛', () => {
    expect(compareVersions('', '1.0')).toBe(null);
    expect(compareVersions('1.0', null)).toBe(null);
    expect(compareVersions(42, '1.0')).toBe(null);
    expect(compareVersions('1.0.0-beta', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.0', 'beta')).toBe(1);
  });
});

describe('v11.29 #183② pkg-store externals 账（内存后端同形）', () => {
  beforeEach(() => {
    __forceMemoryBackendForTests();
  });

  it('put/get/list/del 全链 + 缺 appId 拒绝', async () => {
    const rec = { appId: 'ext-moyugang', extId: 'moyugang', name: '墨韵战纪', url: 'https://ariefenv-hash.github.io/moyugang/' };
    await pkgStore.putExternal(rec);
    const got = await pkgStore.getExternal('ext-moyugang');
    expect(got.name).toBe('墨韵战纪');
    const list = await pkgStore.listExternals();
    expect(list.length).toBe(1);
    expect(list[0].appId).toBe('ext-moyugang');
    await pkgStore.delExternal('ext-moyugang');
    expect(await pkgStore.getExternal('ext-moyugang')).toBe(undefined);
    expect(pkgStore.listExternals()).toBeTruthy();
    await expect(pkgStore.putExternal({ name: '无id' })).rejects.toThrow(/appId/);
  });

  it('installed / pending 老账不受 DB v2 影响（同库三 store 同形 API）', async () => {
    await pkgStore.putInstalled({ appId: 'pkg-com.demo.hello', name: '你好世界' });
    expect((await pkgStore.listInstalled()).length).toBe(1);
    await pkgStore.putPending({ key: 'k1', zipName: 'x.mdapp' });
    expect((await pkgStore.listPending()).length).toBe(1);
    expect((await pkgStore.listExternals()).length).toBe(0);
    __resetBackendForTests();
  });
});

describe('v11.29 #183② catalog.json externals 账（#172 R114 四站点 → R115 十一站点）', () => {
  const raw = JSON.parse(readFileSync(resolve(ROOT, 'ios-desktop/catalog.json'), 'utf8'));
  const res = normalizeCatalog(raw);

  it('归一通过、零 issue、白名单域对齐（数量锚随 R115 巡查合法增长 4→11，v1032 套件接手全量账序）', () => {
    expect(res.ok).toBe(true);
    expect(isUsableCatalog(res)).toBe(true);
    expect(res.issues).toEqual([]);
    expect(res.apps.length).toBe(1); // 一期 demo 包账不变
    expect(res.externals.length).toBe(11); // v11.29 #172 余项：R115 全量 Pages 巡查 +7 站点（原 4，P-1a 同律重锚）
    for (const e of res.externals) {
      expect(e.url.startsWith('https://ariefenv-hash.github.io/')).toBe(true);
      expect(e.kind).toBe('external');
    }
  });

  it('moyugang 条目按 #189 规格默认携带 embed/perf 参数；id 唯一', () => {
    const mo = res.externals.find((e) => e.id === 'moyugang');
    expect(mo).toBeTruthy();
    expect(mo.url).toContain('embed=1');
    expect(mo.url).toContain('perf=low');
    const ids = res.externals.map((e) => e.id);
    expect(new Set(ids).size).toBe(11);
  });
});

describe('v11.29 #183② 接线锚：appstore fetch 链 / 外部区块 / registry 外部三链', () => {
  const appstore = src('ios-desktop/js/apps/appstore.js');
  const registry = src('ios-desktop/js/pkg/pkg-registry.js');
  const store = src('ios-desktop/js/pkg/pkg-store.js');

  it('appstore 消费 fetch 链与版本比较（桥九件套 · v11.29 #302 重锚升级保义：六件+健康检查三件）', () => {
    expect(appstore).toContain('catalogFetchChain');
    expect(appstore).toContain('compareVersions');
    expect(appstore.indexOf('catalogFetchChain')).toBeGreaterThan(-1);
    // 桥注出：页面脚本经 window.__asCatalogCore 九件套（#298 增注 CDN_CATALOG_URL 供命中位同串判据；
    // v11.29 #302 增注 filterChainByHealth/blockSource/reviveSource 源健康检查三件 —— 六件旧口径退役，
    // v823 先例同律：历代旧口径退役断言升级，保义不删义）
    expect(appstore).toContain('__asCatalogCore = { normalizeCatalog, isUsableCatalog, CATALOG_URL, CDN_CATALOG_URL, catalogFetchChain, compareVersions, filterChainByHealth, blockSource, reviveSource }');
    expect(appstore).toContain("from '../pkg/cdn-health.js'");
  });

  it('外部区块动作与确认组（m3e-btngroup 范式 #179⑤）在册', () => {
    expect(appstore).toContain('data-as-ext-add');
    expect(appstore).toContain('data-as-ext-remove');
    expect(appstore).toContain('data-as-ext-confirm');
    expect(appstore.match(/m3e-btngroup/g) !== null).toBe(true);
    expect(appstore).toContain('addExternalApp');
    expect(appstore).toContain('removeExternalApp');
  });

  it('registry 外部三链 + 启动重挂 + ext- 前缀 SW 探测豁免', () => {
    expect(registry).toContain('export async function addExternalApp');
    expect(registry).toContain('export async function removeExternalApp');
    expect(registry).toContain('attachExternalApp(rec)');
    expect(registry).toContain('EXTERNAL_APP_PREFIX');
    // initInstaller 外部重挂：listExternals 消费
    const initSection = registry.slice(registry.indexOf('export async function initInstaller'));
    expect(initSection.indexOf('listExternals')).toBeGreaterThan(-1);
    // openPkgApp 对 ext- 前缀跳过 waitPkgServing（/pkg/ 探测对 ext- 必 404）
    const openSection = registry.slice(registry.indexOf('export async function openPkgApp'), registry.indexOf('window 桥') > 0 ? registry.indexOf('// ---------- window 桥') : undefined);
    expect(openSection).toContain("indexOf('pkg-') === 0");
  });

  it('store 桥三口 + DB v2 升级守卫在册', () => {
    expect(store).toContain('listExternals()');
    expect(store).toContain('putExternal(record)');
    expect(store).toContain('delExternal(appId)');
    expect(store).toContain('DB_VERSION = 2');
    expect(store).toContain("d.createObjectStore(S_EXTERNALS, { keyPath: 'appId' })");
  });

  it('#179① 裸色抽验：外部图标回落块用 var(--md-*) 令牌', () => {
    const iconSection = registry.slice(registry.indexOf('buildExternalIconHTML'), registry.indexOf('buildExternalAppDef'));
    expect(iconSection).toContain('var(--md-primary-container');
    expect(iconSection).toContain('var(--md-secondary-container');
  });
});

describe('v11.29 #183② 版本锚', () => {
  it('package.json 版本滚至 10.33（标题同步滚动，无陈旧残留）', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
    expect(pkg.version).toBe('11.29.0');
  });
});
