// ==================== v10.48 #183 一期：应用市场真数据化（appstore 外壳 + pkg-catalog 纯核） ====================
//
// 议题 #183（用户裁决 2026-11-01：开工在线目录 静态 JSON + CDN 零自建服务）一期交付守护：
//   ① pkg-catalog.js 纯逻辑核（#147 判据同款零依赖零环）：字段归一 / 垃圾兜底 / 降级判定
//   ② appstore.js 静态展示壳退役（假应用/假价格/__demoAction 移除）→ 真数据市场：
//      已装列表（__pkgInstallerAPI.listInstalled 桥）+ 详情/卸载全链 + 在线目录（catalog.json
//      fetch → 归一）+ 获取安装（importBlob → installPending 直链全链）+ 降级硬要求
//   ③ catalog.json 同源账（demo/hello-world.mdapp 真实可装，size 与包字节双源一致）
//   ④ 响应式同步（pkg-installer-refresh 四触发点）+ #179 准入（零裸色/@media/平板双栏/m3e-btngroup）
//   ⑤ pkg-registry 桥增补 importBlob（桥章程：内联脚本消费 pkg 体系唯一通道）
//
// 测试纪律：indexOf 切片锚点用定义形态；负断言用 not.toMatch 正则防注释误报。

import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  normalizeCatalogEntry,
  normalizeCatalog,
  isUsableCatalog,
  CATALOG_URL,
  CATALOG_MAX_ENTRIES,
  PERMS_MAX,
} from '../ios-desktop/js/pkg/pkg-catalog.js';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');

describe('v10.48 #183① pkg-catalog 纯核 · 常量与零环判据', () => {
  it('目录地址与上限常量在册', () => {
    expect(CATALOG_URL).toBe('catalog.json');
    expect(CATALOG_MAX_ENTRIES).toBe(200);
    expect(PERMS_MAX).toBe(32);
  });

  it('#147 判据同款零环：零 import 零 require 零 DOM 触碰', () => {
    const s = src('ios-desktop/js/pkg/pkg-catalog.js');
    expect(s).not.toMatch(/(^|[^.\w])import\s/);
    expect(s).not.toMatch(/require\(/);
    expect(s).not.toMatch(/document\.|window\./);
  });
});

describe('v10.48 #183① normalizeCatalogEntry 字段归一', () => {
  const VALID = {
    id: 'com.demo.hello', name: '你好世界', version: '1.0.0',
    downloadUrl: 'demo/hello-world.mdapp', size: 3763,
    permissions: ['notifications'], description: '演示包',
  };

  it('完整条目透传 + 缺省收敛（packageId=id / icon="" / size 数字化）', () => {
    const r = normalizeCatalogEntry(VALID);
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
    expect(r.entry.packageId).toBe('com.demo.hello');
    expect(r.entry.icon).toBe('');
    expect(r.entry.size).toBe(3763);
  });

  it('size 字符串数字宽容收敛；负数与垃圾回落 0', () => {
    expect(normalizeCatalogEntry({ ...VALID, size: '2048' }).entry.size).toBe(2048);
    expect(normalizeCatalogEntry({ ...VALID, size: -5 }).entry.size).toBe(0);
    expect(normalizeCatalogEntry({ ...VALID, size: 'abc' }).entry.size).toBe(0);
  });

  it('id 缺失 / 非法形态 / name 缺失 → 整条拒绝', () => {
    expect(normalizeCatalogEntry({ name: 'x' }).ok).toBe(false);
    expect(normalizeCatalogEntry({ id: '1 bad id', name: 'x' }).ok).toBe(false);
    expect(normalizeCatalogEntry({ id: 'com.ok', name: '' }).ok).toBe(false);
    expect(normalizeCatalogEntry('string').ok).toBe(false);
    expect(normalizeCatalogEntry(null).ok).toBe(false);
  });

  it('downloadUrl 危险 scheme / 协议相对地址拒绝；http(s) 与同源相对放行', () => {
    expect(normalizeCatalogEntry({ ...VALID, downloadUrl: 'javascript:alert(1)' }).entry.downloadUrl).toBe('');
    expect(normalizeCatalogEntry({ ...VALID, downloadUrl: '//evil.example/x.mdapp' }).entry.downloadUrl).toBe('');
    expect(normalizeCatalogEntry({ ...VALID, downloadUrl: 'file:///etc/passwd' }).entry.downloadUrl).toBe('');
    expect(normalizeCatalogEntry({ ...VALID, downloadUrl: 'https://cdn.example/a.mdapp' }).entry.downloadUrl).toBe('https://cdn.example/a.mdapp');
    expect(normalizeCatalogEntry({ ...VALID, downloadUrl: 'demo/hello-world.mdapp' }).entry.downloadUrl).toBe('demo/hello-world.mdapp');
  });

  it('icon 仅放行 http(s)/data:image；permissions 去空去重保序截断', () => {
    expect(normalizeCatalogEntry({ ...VALID, icon: 'javascript:x' }).entry.icon).toBe('');
    expect(normalizeCatalogEntry({ ...VALID, icon: 'data:image/svg+xml;base64,xx' }).entry.icon).toContain('data:image/');
    const r = normalizeCatalogEntry({ ...VALID, permissions: ['a', 'a', '', 'b', 3, 'c', 'd'] });
    expect(r.entry.permissions).toEqual(['a', 'b', 'c', 'd']);
    expect(r.entry.permissions.length).toBeLessThanOrEqual(PERMS_MAX);
  });

  it('version / description 非串降级为空串不拖垮条目', () => {
    const r = normalizeCatalogEntry({ ...VALID, version: 42, description: { x: 1 } });
    expect(r.ok).toBe(true);
    expect(r.entry.version).toBe('');
    expect(r.entry.description).toBe('');
    expect(r.issues.length).toBeGreaterThanOrEqual(2);
  });
});

describe('v10.48 #183① normalizeCatalog 整册归一与降级判定', () => {
  it('对象形态与数组形态双入口；垃圾载荷 degraded', () => {
    const a = normalizeCatalog({ apps: [{ id: 'a.b', name: 'A' }] });
    expect(a.ok).toBe(true);
    expect(a.apps.length).toBe(1);
    const b = normalizeCatalog([{ id: 'a.b', name: 'A' }]);
    expect(b.ok).toBe(true);
    expect(b.apps.length).toBe(1);
    expect(normalizeCatalog('garbage').degraded).toBe(true);
    expect(normalizeCatalog(42).degraded).toBe(true);
    expect(normalizeCatalog({ note: 'no apps key' }).degraded).toBe(true);
    expect(normalizeCatalog(null).degraded).toBe(true);
  });

  it('坏条目跳过记 issue（带序号）、id 重复首见保留、上限截断', () => {
    const r = normalizeCatalog({ apps: [{ name: '无id' }, { id: 'x.y', name: '好' }, { id: 'x.y', name: '重' }] });
    expect(r.ok).toBe(true);
    expect(r.apps.map((e) => e.name)).toEqual(['好']);
    expect(r.issues.some((s) => s.startsWith('[0]'))).toBe(true);
    expect(r.issues.some((s) => s.includes('重复'))).toBe(true);

    const many = [];
    for (let i = 0; i < CATALOG_MAX_ENTRIES + 2; i++) many.push({ id: 'com.a' + i, name: 'A' + i });
    const capped = normalizeCatalog({ apps: many });
    expect(capped.apps.length).toBe(CATALOG_MAX_ENTRIES);
    expect(capped.issues.some((s) => s.includes('截断'))).toBe(true);
  });

  it('isUsableCatalog：ok+非空才算可用（空目录=降级语义）', () => {
    expect(isUsableCatalog({ ok: true, apps: [{ id: 'a', name: 'A' }] })).toBe(true);
    expect(isUsableCatalog({ ok: true, apps: [] })).toBe(false);
    expect(isUsableCatalog({ ok: false, apps: [] })).toBe(false);
    expect(isUsableCatalog(null)).toBe(false);
  });
});

describe('v10.48 #183③ catalog.json 同源账与 demo 包双源一致', () => {
  const catPath = resolve(ROOT, 'ios-desktop/catalog.json');
  const pkgPath = resolve(ROOT, 'ios-desktop/demo/hello-world.mdapp');

  it('目录文件存在、归一通过、裁决字段九件齐', () => {
    const raw = JSON.parse(readFileSync(catPath, 'utf8'));
    const res = normalizeCatalog(raw);
    expect(res.ok).toBe(true);
    expect(isUsableCatalog(res)).toBe(true);
    expect(res.issues).toEqual([]);
    const e = res.apps[0];
    for (const k of ['id', 'name', 'version', 'packageId', 'icon', 'downloadUrl', 'size', 'permissions', 'description']) {
      expect(k in e).toBe(true);
    }
    expect(e.id).toBe('com.demo.hello');
    expect(e.downloadUrl).toBe('demo/hello-world.mdapp');
    expect(e.permissions).toContain('notifications');
  });

  it('demo 包真实在库且字节数与目录 size 双源一致', () => {
    const bytes = statSync(pkgPath).size;
    const e = normalizeCatalog(JSON.parse(readFileSync(catPath, 'utf8'))).apps[0];
    expect(bytes).toBeGreaterThan(0);
    expect(e.size).toBe(bytes);
  });
});

describe('v10.48 #183②④ appstore.js 真数据市场接线锚', () => {
  const s = src('ios-desktop/js/apps/appstore.js');

  it('静态展示壳退役：假应用/假价格/未定义 __demoAction 全数移除', () => {
    expect(s).not.toMatch(/Things 3|Darkroom|Forest/);
    expect(s).not.toContain('__demoAction');
    expect(s).not.toMatch(/¥\d/);
  });

  it('pkg 桥消费面：已装列表 / 卸载全链 / 直链获取 / 导入跳转', () => {
    expect(s).toContain('__pkgInstallerAPI.listInstalled');
    expect(s).toContain('uninstallPackage');
    expect(s).toContain('installPending');
    expect(s).toContain('importBlob');
    expect(s).toContain('__shareSheet.openAppById');
    expect(s).toContain("openAppById('installer')");
  });

  it('目录核消费 + 响应式同步 + 降级硬要求文案', () => {
    expect(s).toContain('__asCatalogCore');
    expect(s).toContain('pkg-installer-refresh');
    expect(s).toContain('目录暂不可达');
    expect(s).toContain('isUsableCatalog');
  });

  it('#179 准入：@media 平板双栏 / m3e-btngroup 融合圆角钮组 / 零裸色（var 全程）', () => {
    expect(s).toContain('@media (min-width: 768px)');
    expect(s).toContain('grid-template-columns: minmax(0, 5fr) minmax(0, 4fr)');
    expect(s).toContain('m3e-btngroup');
    // 裸色准入①：颜色值仅允许出现在 var() fallback 内 —— 抽验危险形态
    expect(s).not.toMatch(/(?<!var\(--md-[a-z-]+,\s?)#[0-9a-fA-F]{3,6}\s*;|(?<!var\(--md-[a-z-]+,\s?)#[0-9a-fA-F]{3,6}\s*}/);
  });

  it('纯核 window 桥五件套在册（v10.48 二期重锚：+catalogFetchChain/+compareVersions）', () => {
    expect(s).toContain('__asCatalogCore = { normalizeCatalog, isUsableCatalog, CATALOG_URL, catalogFetchChain, compareVersions }');
  });
});

describe('v10.48 #183⑤ pkg-registry 桥增补与版本锚', () => {
  it('importBlob 直传口在册（与 importFiles 同一校验链）', () => {
    const s = src('ios-desktop/js/pkg/pkg-registry.js');
    expect(s).toContain('importBlob: (blob, zipName) => importZipBlob(blob, zipName)');
  });

  it('版本锚：pkg 与 README 同步 10.48.0', () => {
    const pkg = JSON.parse(src('package.json'));
    expect(pkg.version).toBe('10.48.0');
    expect(src('README.md')).toMatch(/10\.48/);
  });
});
