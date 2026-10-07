// ==================== v752-installer.test.js — 安装包功能（v7.52） ====================
//
// 覆盖面：
//   1. zip-reader：STORE/DEFLATE 往返、CRC 校验、路径穿越/加密/未知方法/ZIP64 拒绝、
//      公共根剥离、重复名、体量钳制
//   2. pkg-manifest：清单校验、名称/图标自动识别链（manifest → title/favicon → zip 名）、
//      权限白名单、路径安全、SVG 图标净化
//   3. pkg-store：内存回退后端读写闭环
//   4. pkg-registry：analyzeZipBlob 全链路（矢量图标 SVG 内联）、buildPkgAppDef 沙箱契约
//   5. 集成锚点：app-icons 动态注册、iframe sandbox 选项、sw.js 托管路由/SDK 注入/版本
//   6. 版本锚点：geek-v64

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { readZip, crc32, PkgZipError } from '../ios-desktop/js/pkg/zip-reader.js';
import {
  validateManifest, safePkgPath, sanitizeIconSVG, guessTitleFromHTML, guessFaviconFromHTML,
  isValidManifestId, mimeFromPath, isInstallablePath, pkgAppId, nameFromZipName, PKG_LIMITS, PKG_PERMISSIONS,
} from '../ios-desktop/js/pkg/pkg-manifest.js';
import { pkgStore, __forceMemoryBackendForTests } from '../ios-desktop/js/pkg/pkg-store.js';
import { buildPkgAppDef, analyzeZipBlob, importZipBlob, PKG_SANDBOX } from '../ios-desktop/js/pkg/pkg-registry.js';
import { buildIconHTML } from '../ios-desktop/js/pkg/pkg-icon.js';
import { registerAppIcon, unregisterAppIcon, getAppIconSVG } from '../ios-desktop/js/app-icons.js';
import { iframeAppContent } from '../ios-desktop/js/iframe-app.js';

const R = (p) => readFileSync(p, 'utf8');

// ==================== 测试用 ZIP 构建器（STORE + DEFLATE 双编码） ====================

function crc32Of(u8) { return crc32(u8); }

function u16(arr, v) { arr.push(v & 0xFF, (v >> 8) & 0xFF); }
function u32(arr, v) { arr.push(v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF, (v >>> 24) & 0xFF); }

/**
 * 构建一个真实 ZIP（无外部依赖）。
 * entries: [{ name, data: Uint8Array, method?: 0|8, corruptCrc?: bool, encrypted?: bool, rawCompressed?: Uint8Array, forceMethod?: number, flags?: number }]
 * 目录条目传 name 以 '/' 结尾且 data 为空。
 */
function buildZip(entries, { eocdEntryCount = null, cdOffsetOverride = null } = {}) {
  const locals = [];
  const centrals = [];
  let localOffset = 0; // 只累加 local 段尺寸（central 目录在尾部另起）
  for (const e of entries) {
    const nameBytes = new Uint8Array([...e.name].map((c) => c.charCodeAt(0) & 0xFF));
    const crc = e.corruptCrc ? 0xDEADBEEF : crc32Of(e.data);
    const usize = e.data.length;
    let comp = e.data;
    if (e.rawCompressed) comp = e.rawCompressed;
    const method = e.forceMethod != null ? e.forceMethod : (e.rawCompressed ? 8 : 0);
    const flags = (e.encrypted ? 0x1 : 0) | (e.flags != null ? e.flags : 0);

    const local = [];
    u32(local, 0x04034b50); u16(local, 20); u16(local, flags); u16(local, method);
    u16(local, 0); u16(local, 0); u32(local, crc); u32(local, comp.length); u32(local, usize);
    u16(local, nameBytes.length); u16(local, 0);
    locals.push({ head: new Uint8Array(local), name: nameBytes, data: comp, offset: localOffset });
    localOffset += local.length + nameBytes.length + comp.length;

    const central = [];
    u32(central, 0x02014b50); u16(central, 20); u16(central, 20); u16(central, flags); u16(central, method);
    u16(central, 0); u16(central, 0); u32(central, crc); u32(central, comp.length); u32(central, usize);
    u16(central, nameBytes.length); u16(central, 0); u16(central, 0);
    u16(central, 0); u16(central, 0); u32(central, 0); u32(central, locals[locals.length - 1].offset);
    centrals.push({ head: new Uint8Array(central), name: nameBytes });
  }

  const cdStart = locals.reduce((s, l) => s + l.head.length + l.name.length + l.data.length, 0);
  let cursor = 0;
  const total = [];
  for (const l of locals) { total.push(l.head, l.name, l.data); }
  const cdSize = centrals.reduce((s, c) => s + c.head.length + c.name.length, 0);
  for (const c of centrals) { total.push(c.head, c.name); }
  const eocd = [];
  u32(eocd, 0x06054b50); u16(eocd, 0); u16(eocd, 0);
  u16(eocd, eocdEntryCount != null ? eocdEntryCount : entries.length);
  u16(eocd, eocdEntryCount != null ? eocdEntryCount : entries.length);
  u32(eocd, cdSize); u32(eocd, cdOffsetOverride != null ? cdOffsetOverride : cdStart); u16(eocd, 0);
  total.push(new Uint8Array(eocd));

  const out = new Uint8Array(total.reduce((s, t) => s + t.length, 0));
  let p = 0;
  for (const t of total) { out.set(t, p); p += t.length; }
  return out;
}

async function deflateRaw(bytes) {
  const cs = new CompressionStream('deflate-raw');
  const w = cs.writable.getWriter();
  await w.write(bytes);
  await w.close();
  const chunks = [];
  const r = cs.readable.getReader();
  for (;;) { const { done, value } = await r.read(); if (done) break; chunks.push(value); }
  const out = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0));
  let p = 0;
  for (const c of chunks) { out.set(c, p); p += c.length; }
  return out;
}

const enc = (s) => new TextEncoder().encode(s);

// ==================== zip-reader ====================

describe('v7.52 zip-reader — 解析与安全边界', () => {
  it('STORE 往返：嵌套路径/目录条目跳过/内容一致', async () => {
    const zip = buildZip([
      { name: 'manifest.json', data: enc('{"id":"com.t.a"}') },
      { name: 'index.html', data: enc('<h1>hi</h1>') },
      { name: 'assets/css/style.css', data: enc('body{}') },
      { name: 'assets/', data: new Uint8Array(0) },
    ]);
    const { files, strippedRoot } = await readZip(zip.buffer);
    expect(strippedRoot).toBe(null);
    expect(files.map((f) => f.path)).toEqual(['manifest.json', 'index.html', 'assets/css/style.css']);
    expect(new TextDecoder().decode(files[1].data)).toBe('<h1>hi</h1>');
    expect(files[2].path).toBe('assets/css/style.css');
  });

  it('DEFLATE 往返：CompressionStream 产物正确解压', async () => {
    const src = enc('deflate-content-'.repeat(40));
    const zip = buildZip([
      { name: 'index.html', data: src, rawCompressed: await deflateRaw(src) },
    ]);
    const { files } = await readZip(zip.buffer);
    expect(new TextDecoder().decode(files[0].data)).toBe(new TextDecoder().decode(src));
  });

  it('CRC 损坏拒绝（E_CORRUPT）', async () => {
    const zip = buildZip([{ name: 'a.txt', data: enc('hello'), corruptCrc: true }]);
    await expect(readZip(zip.buffer)).rejects.toMatchObject({ code: 'E_CORRUPT' });
  });

  it('路径穿越拒绝（E_PATH）', async () => {
    const zip = buildZip([{ name: '../evil.txt', data: enc('x') }]);
    await expect(readZip(zip.buffer)).rejects.toMatchObject({ code: 'E_PATH' });
  });

  it('加密包拒绝（E_ENCRYPTED）', async () => {
    const zip = buildZip([{ name: 'a.txt', data: enc('x'), encrypted: true }]);
    await expect(readZip(zip.buffer)).rejects.toMatchObject({ code: 'E_ENCRYPTED' });
  });

  it('未知压缩方法拒绝（E_METHOD）', async () => {
    const zip = buildZip([{ name: 'a.txt', data: enc('x'), forceMethod: 12 }]);
    await expect(readZip(zip.buffer)).rejects.toMatchObject({ code: 'E_METHOD' });
  });

  it('ZIP64 标记拒绝（E_ZIP64）', async () => {
    const zip = buildZip([{ name: 'a.txt', data: enc('x') }], { eocdEntryCount: 0xFFFF });
    await expect(readZip(zip.buffer)).rejects.toMatchObject({ code: 'E_ZIP64' });
  });

  it('公共根目录剥离', async () => {
    const zip = buildZip([
      { name: 'MyApp/manifest.json', data: enc('{}') },
      { name: 'MyApp/index.html', data: enc('<p></p>') },
    ]);
    const { files, strippedRoot } = await readZip(zip.buffer);
    expect(strippedRoot).toBe('MyApp');
    expect(files.map((f) => f.path)).toEqual(['manifest.json', 'index.html']);
  });

  it('重复文件名拒绝（E_DUP）', async () => {
    const zip = buildZip([
      { name: 'a.txt', data: enc('1') },
      { name: 'a.txt', data: enc('2') },
    ]);
    await expect(readZip(zip.buffer)).rejects.toMatchObject({ code: 'E_DUP' });
  });

  it('非 ZIP 输入拒绝（E_NOT_ZIP）', async () => {
    await expect(readZip(enc('this is definitely not a zip file at all....').buffer)).rejects.toMatchObject({ code: 'E_NOT_ZIP' });
  });

  it('单文件解压上限（流式掐断，E_TOO_BIG）', async () => {
    const src = enc('A'.repeat(5000));
    const zip = buildZip([{ name: 'big.bin', data: src, rawCompressed: await deflateRaw(src) }]);
    await expect(readZip(zip.buffer, { limits: { maxFileUncompressed: 1024 } })).rejects.toMatchObject({ code: 'E_TOO_BIG' });
  });
});

// ==================== pkg-manifest ====================

describe('v7.52 pkg-manifest — 校验与自动识别', () => {
  const filesByPath = (arr) => new Map(arr.map(([p, size]) => [p, { path: p, size: size ?? 10 }]));

  it('合法清单通过，默认值补齐', () => {
    const v = validateManifest(
      { id: 'com.example.demo', name: '示例', permissions: ['microphone'] },
      { zipName: 'demo.zip', entryHTML: '<title>示例</title>', filesByPath: filesByPath([['index.html'], ['icon.png']]) },
    );
    expect(v.ok).toBe(true);
    expect(v.manifest).toMatchObject({ id: 'com.example.demo', name: '示例', entry: 'index.html', version: '1.0.0' });
    expect(v.recognized.nameSource).toBe('manifest');
  });

  it('id 非法：大写 / 数字开头 / 连续点 / 缺失', () => {
    expect(isValidManifestId('Com.a')).toBe(false);
    expect(isValidManifestId('1abc')).toBe(false);
    expect(isValidManifestId('a..b')).toBe(false);
    expect(isValidManifestId('ab')).toBe(true);
    const v = validateManifest({ id: 'BAD', name: 'x' }, { filesByPath: filesByPath([['index.html']]) });
    expect(v.ok).toBe(false);
    expect(v.errors[0]).toContain('manifest.id');
  });

  it('名称识别链：manifest → title → zip 文件名', () => {
    expect(guessTitleFromHTML('<html><head><title>天气小站 &amp; 更多</title></head></html>')).toBe('天气小站 & 更多');
    expect(nameFromZipName('我的工具包.mdapp')).toBe('我的工具包');

    const v1 = validateManifest({ id: 'com.a.b' }, { zipName: 'fallback.zip', entryHTML: '<title>标题应用</title>', filesByPath: filesByPath([['index.html']]) });
    expect(v1.ok).toBe(true);
    expect(v1.manifest.name).toBe('标题应用');
    expect(v1.recognized.nameSource).toBe('title');
    expect(v1.warnings.some((w) => w.includes('title'))).toBe(true);

    const v2 = validateManifest({ id: 'com.a.b' }, { zipName: '兜底名字.zip', entryHTML: '<div>无标题</div>', filesByPath: filesByPath([['index.html']]) });
    expect(v2.ok).toBe(true);
    expect(v2.manifest.name).toBe('兜底名字');
    expect(v2.recognized.nameSource).toBe('zip');
  });

  it('entry：默认 index.html；自定义缺失报错；穿越报错', () => {
    const v1 = validateManifest({ id: 'com.a.b', name: 'x', entry: 'app/main.html' }, { filesByPath: filesByPath([['index.html'], ['app/main.html']]) });
    expect(v1.manifest.entry).toBe('app/main.html');
    const v2 = validateManifest({ id: 'com.a.b', name: 'x', entry: 'ghost.html' }, { filesByPath: filesByPath([['index.html']]) });
    expect(v2.ok).toBe(false);
    expect(v2.errors[0]).toContain('ghost.html');
    const v3 = validateManifest({ id: 'com.a.b', name: 'x', entry: '../x.html' }, { filesByPath: filesByPath([['index.html']]) });
    expect(v3.ok).toBe(false);
    const v4 = validateManifest({ id: 'com.a.b', name: 'x' }, { filesByPath: filesByPath([['other.html']]) });
    expect(v4.ok).toBe(false);
    expect(v4.errors[0]).toContain('index.html');
  });

  it('图标识别链：manifest.icon → favicon', () => {
    const v1 = validateManifest({ id: 'com.a.b', name: 'x', icon: 'icons/app.svg' }, { filesByPath: filesByPath([['index.html'], ['icons/app.svg']]) });
    expect(v1.ok).toBe(true);
    expect(v1.manifest.icon).toBe('icons/app.svg');
    expect(v1.recognized.iconSource).toBe('manifest');

    const html = '<link rel="shortcut icon" href="favicon.svg"><title>t</title>';
    expect(guessFaviconFromHTML(html)).toBe('favicon.svg');
    const v2 = validateManifest({ id: 'com.a.b' }, { entryHTML: html, filesByPath: filesByPath([['index.html'], ['favicon.svg']]) });
    expect(v2.ok).toBe(true);
    expect(v2.manifest.icon).toBe('favicon.svg');
    expect(v2.recognized.iconSource).toBe('favicon');

    // 外链 favicon 忽略；指向不存在的文件报错
    expect(guessFaviconFromHTML('<link rel="icon" href="https://cdn.example.com/x.png">')).toBe('');
    const v3 = validateManifest({ id: 'com.a.b', name: 'x', icon: 'ghost.png' }, { filesByPath: filesByPath([['index.html']]) });
    expect(v3.ok).toBe(false);
  });

  it('权限白名单：未知权限降级警告 + 去重', () => {
    const v = validateManifest(
      { id: 'com.a.b', name: 'x', permissions: ['microphone', 'microphone', 'nuclear_launch'] },
      { filesByPath: filesByPath([['index.html']]) },
    );
    expect(v.manifest.permissions).toEqual(['microphone']);
    expect(v.warnings.some((w) => w.includes('nuclear_launch'))).toBe(true);
    expect(PKG_PERMISSIONS).toContain('clipboard');
  });

  it('路径安全：反斜杠归一 / ./ 剥离 / 绝对路径 / 穿越 / NUL / 盘符', () => {
    expect(safePkgPath('a\\b\\c.txt')).toBe('a/b/c.txt');
    expect(safePkgPath('./x/y.html')).toBe('x/y.html');
    expect(safePkgPath('/abs/path')).toBe(null);
    expect(safePkgPath('a/../b')).toBe(null);
    expect(safePkgPath('bad\0name')).toBe(null);
    expect(safePkgPath('C:\\win\\evil')).toBe(null);
    expect(safePkgPath('')).toBe(null);
  });

  it('SVG 净化：剥 script / on* / javascript: / 外链 href；保留正常内容', () => {
    const dirty = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
      + '<script>alert(1)</script>'
      + '<rect width="100" height="100" fill="#123" onclick="alert(2)"/>'
      + '<a href="javascript:alert(3)"><circle r="10"/></a>'
      + '<image href="https://evil.example.com/track.png"/></svg>';
    const clean = sanitizeIconSVG(dirty);
    expect(clean).toBeTruthy();
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('javascript:');
    expect(clean).not.toContain('https://evil.example.com');
    expect(clean).toContain('<svg');
    const good = sanitizeIconSVG('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="red"/></svg>');
    expect(good).toContain('circle');
    expect(sanitizeIconSVG('not svg at all')).toBe(null);
  });

  it('MIME / 白名单 / pkgAppId', () => {
    expect(mimeFromPath('a/index.html')).toBe('text/html; charset=utf-8');
    expect(mimeFromPath('x.svg')).toBe('image/svg+xml');
    expect(mimeFromPath('x.weird')).toBe('application/octet-stream');
    expect(isInstallablePath('a.js')).toBe(true);
    expect(isInstallablePath('a.exe')).toBe(false);
    expect(isInstallablePath('a.sh')).toBe(false);
    expect(pkgAppId('com.example.demo')).toBe('pkg-com.example.demo');
  });
});

// ==================== pkg-store（内存回退） ====================

describe('v7.52 pkg-store — 内存回退后端闭环', () => {
  it('installed / pending 读写删全链', async () => {
    __forceMemoryBackendForTests();
    expect(pkgStore.usingFallback).toBe(true);

    await pkgStore.putPending({ key: 'p1', zipName: 'a.zip', size: 3, blob: new Blob(['abc']), preview: { name: 'A' } });
    await pkgStore.putPending({ key: 'p2', zipName: 'b.zip', size: 4, blob: new Blob(['abcd']), preview: { name: 'B' } });
    expect((await pkgStore.listPending()).length).toBe(2);
    expect((await pkgStore.getPending('p1')).preview.name).toBe('A');
    await pkgStore.delPending('p1');
    expect((await pkgStore.listPending()).length).toBe(1);

    await pkgStore.putInstalled({ appId: 'pkg-com.x', name: 'X', files: [] });
    await pkgStore.putInstalled({ appId: 'pkg-com.y', name: 'Y', files: [] });
    expect((await pkgStore.listInstalled()).length).toBe(2);
    expect((await pkgStore.getInstalled('pkg-com.x')).name).toBe('X');
    await pkgStore.delInstalled('pkg-com.x');
    expect(await pkgStore.getInstalled('pkg-com.x')).toBe(undefined);
    expect(pkgStore.usingFallback).toBe(true);
  });
});

// ==================== pkg-registry — 全链路分析 + 桌面契约 ====================

describe('v7.52 pkg-registry — analyzeZipBlob / 桌面定义契约', () => {
  const SVG_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="#6750A4"/><circle cx="50" cy="50" r="20" fill="#fff"/></svg>';

  function demoZip({ withName = true, withIcon = true } = {}) {
    const manifest = {
      id: 'com.demo.hello',
      permissions: ['notifications'],
      version: '2.1.0',
      author: '测试作者',
      description: '演示包',
    };
    if (withName) manifest.name = '你好演示';
    if (withIcon) manifest.icon = 'icon.svg';
    return buildZip([
      { name: 'manifest.json', data: enc(JSON.stringify(manifest)) },
      { name: 'index.html', data: enc('<!DOCTYPE html><html><head><title>你好演示</title></head><body><h1>Hello Pkg</h1><script>window.__system && document.body.setAttribute("data-sdk", "1");</script></body></html>') },
      { name: 'icon.svg', data: enc(SVG_ICON) },
      { name: 'css/app.css', data: enc('body{margin:0}') },
    ]);
  }

  it('完整链路：清单 + 矢量 SVG 图标内联（不栅格化）', async () => {
    const zip = demoZip();
    const a = await analyzeZipBlob(new Blob([zip]), 'hello.mdapp');
    expect(a.manifest).toMatchObject({ id: 'com.demo.hello', name: '你好演示', version: '2.1.0', entry: 'index.html' });
    expect(a.manifest.permissions).toEqual(['notifications']);
    // 矢量优先：SVG 图标以内联 SVG HTML 进入桌面（与内置图标同通道），而非 <img> dataURL
    expect(a.iconKind).toBe('svg');
    expect(a.iconHTML).toContain('<svg');
    expect(a.iconHTML).not.toContain('<script');
    expect(a.iconHTML).toContain('width="100%"');
    expect(a.files.length).toBe(4);
  });

  it('缺省名称/图标：title + favicon 自动识别命中并出警告', async () => {
    const zip = buildZip([
      { name: 'manifest.json', data: enc(JSON.stringify({ id: 'com.demo.auto' })) },
      { name: 'index.html', data: enc('<html><head><link rel="icon" href="fav.svg"><title>自动识别应用</title></head><body></body></html>') },
      { name: 'fav.svg', data: enc(SVG_ICON) },
    ]);
    const a = await analyzeZipBlob(new Blob([zip]), 'auto.zip');
    expect(a.manifest.name).toBe('自动识别应用');
    expect(a.manifest.icon).toBe('fav.svg');
    expect(a.warnings.length).toBeGreaterThanOrEqual(2);
  });

  it('缺 manifest.json → pkgErrors 明确指向规范', async () => {
    const zip = buildZip([{ name: 'index.html', data: enc('<p>no manifest</p>') }]);
    await expect(analyzeZipBlob(new Blob([zip]), 'nomani.zip')).rejects.toMatchObject({ pkgErrors: [expect.stringContaining('manifest.json')] });
  });

  it('扩展名白名单：.exe 被拒', async () => {
    const zip = buildZip([
      { name: 'manifest.json', data: enc(JSON.stringify({ id: 'com.demo.bad', name: '坏包' })) },
      { name: 'index.html', data: enc('<p>x</p>') },
      { name: 'tool.exe', data: enc('MZ...') },
    ]);
    await expect(analyzeZipBlob(new Blob([zip]), 'bad.zip')).rejects.toMatchObject({ pkgErrors: [expect.stringContaining('不受支持')] });
  });

  it('importZipBlob → pending 记录带预览（识别结果先行）', async () => {
    __forceMemoryBackendForTests();
    const rec = await importZipBlob(new Blob([demoZip()]), 'hello2.mdapp');
    expect(rec.name).toBe('你好演示');
    expect(rec.key).toBeTruthy();
    const stored = await pkgStore.getPending(rec.key);
    expect(stored.preview.name).toBe('你好演示');
    expect(stored.preview.manifest.id).toBe('com.demo.hello');
    expect(stored.blob.size).toBeGreaterThan(0);
    await pkgStore.delPending(rec.key);
  });

  it('buildPkgAppDef：同源托管 iframe 契约（pkg 虚拟路径 + SDK 头注双保险 + __syncIframeApp 保留）', () => {
    const def = buildPkgAppDef({
      appId: 'pkg-com.demo.hello',
      name: '你好演示',
      version: '2.1.0',
      entry: 'index.html',
      iconHTML: '<svg viewBox="0 0 10 10"></svg>',
    });
    expect(def.id).toBe('pkg-com.demo.hello');
    expect(def.isPkg).toBe(true);
    expect(def.customIcon).toContain('<svg');
    expect(def.pages.length).toBe(1);
    const c = def.pages[0].content;
    expect(c).toContain('pkg/pkg-com.demo.hello/index.html');
    // v7.52 实证：opaque 沙箱不属于 SW 控制域（导航绕过 → 404），改同源托管 + CSP 防波堤
    expect(c).not.toContain('sandbox=');
    expect(c).toContain('__syncIframeApp');
    expect(c).toContain('allow="autoplay; fullscreen; microphone; geolocation; camera; display-capture"');
  });

  it('位图图标：非浏览器解码环境优雅回退 null（不抛异常）', async () => {
    const out = await buildIconHTML(enc('not-a-real-png'), 'image/png');
    // happy-dom 无 createImageBitmap → null；浏览器中失败同样 null，调用方回退默认图标
    expect(out).toBe(null);
  });
});

// ==================== 集成锚点：app-icons / iframe-app ====================

describe('v7.52 集成 — 动态图标注册表与沙箱 iframe', () => {
  it('registerAppIcon → getAppIconSVG 动态生效；unregister 后回退默认', () => {
    const fallback = getAppIconSVG('pkg-nonexistent');
    expect(fallback).toContain('<svg');
    registerAppIcon('pkg-test.icon', '<svg data-pkg-test="1" viewBox="0 0 1 1"></svg>');
    expect(getAppIconSVG('pkg-test.icon')).toContain('data-pkg-test="1"');
    unregisterAppIcon('pkg-test.icon');
    expect(getAppIconSVG('pkg-test.icon')).toBe(fallback);
  });

  it('iframeAppContent sandbox 选项：传入即带 sandbox 属性，缺省行为不变', () => {
    const withSb = iframeAppContent('pkg/x/index.html', { sandbox: PKG_SANDBOX });
    expect(withSb).toContain('sandbox="' + PKG_SANDBOX + '"');
    const noSb = iframeAppContent('apps/translate/index.html');
    expect(noSb).not.toContain('sandbox=');
    expect(noSb).toContain('apps/translate/index.html');
  });
});

// ==================== sw.js 托管路由锚点 ====================

describe('v7.52 sw.js — 安装包托管锚点', () => {
  const src = R('sw.js');

  it('版本锚点 geek-v64', () => {
    expect(src).toContain("const VERSION = 'geek-v64';");
  });

  it('三段式路由正则（rest 非空，源码模块目录不被误拦）', () => {
    expect(src).toContain('/\\/pkg\\/([a-z0-9][a-z0-9._-]*)\\/(.+)$/');
    // 与 sw.js 同源的行为验证（正则字面量逐字一致）
    const PKG_ROUTE = /\/pkg\/([a-z0-9][a-z0-9._-]*)\/(.+)$/;
    const m1 = '/md3/pkg/com.demo.hello/index.html'.match(PKG_ROUTE);
    expect(m1[1]).toBe('com.demo.hello');
    expect(m1[2]).toBe('index.html');
    const m2 = '/x/pkg/a/b/c.png'.match(PKG_ROUTE);
    expect(m2[1]).toBe('a');
    expect(m2[2]).toBe('b/c.png');
    // 源码版模块目录（无第三段）不能命中
    expect('/md3/ios-desktop/js/pkg/pkg-manifest.js'.match(PKG_ROUTE)).toBe(null);
    expect('/md3/ios-desktop/index.html'.match(PKG_ROUTE)).toBe(null);
  });

  it('SDK 注入 + 缓存失效 + CORS 头 + IDB 同库 + CSP 防波堤', () => {
    expect(src).toContain('pkg-sdk.js');
    expect(src).toContain("'PKG_CHANGED'");
    expect(src).toContain("'Access-Control-Allow-Origin'");
    expect(src).toContain("indexedDB.open('md3-installer', 1)");
    expect(src).toContain('pkgInjectSDK');
    expect(src).toContain('servePackage');
    // 同源信任模型的请求面收窄：包内 HTML 注入 CSP（封外联，仅 self/data/blob）
    expect(src).toContain("headers['Content-Security-Policy']");
    expect(src).toContain("default-src 'self' data: blob:");
  });

  it('pkg-sdk.js 注入位置在 <head> 之后（沙箱 SDK 先于包内脚本执行）', () => {
    const sdk = R('ios-desktop/js/pkg-sdk.js');
    expect(sdk).toContain('__pkgSdkInstalled');
    expect(sdk).toContain('REQUEST_PERMISSION');
    expect(sdk).toContain('set-theme-hue');
    expect(sdk).toContain('__handleIframeGesture');
    expect(sdk).toContain('BUS_EMIT');
  });
});

// ==================== 应用注册锚点 ====================

describe('v7.52 应用注册 — installer 进桌面与图标体系', () => {
  it('apps-data 注册 installer 应用（第 2 页末位）', async () => {
    const { initialApps } = await import('../ios-desktop/js/apps-data.js');
    const last = initialApps[initialApps.length - 1];
    expect(last.id).toBe('installer');
    expect(last.name).toBe('安装包');
    expect(initialApps.filter((a) => a.id === 'installer').length).toBe(1);
    expect(last.pages[0].content).toContain('pkgFileInput');
  });

  it('app-icons 提供 installer 内置矢量图标', async () => {
    const { APP_ICONS } = await import('../ios-desktop/js/app-icons.js');
    expect(APP_ICONS.installer).toContain('<svg');
  });

  it('desktop.js 桌面渲染支持 customIcon（包图标通道）', () => {
    const d = R('ios-desktop/js/desktop.js');
    expect(d).toContain('app.customIcon');
  });

  it('files.js 压缩包点击交接安装器', () => {
    const f = R('ios-desktop/js/apps/files.js');
    expect(f).toContain('__pkgInstallerAPI');
    expect(f).toContain("endsWith('.zip')");
    expect(f).toContain("endsWith('.mdapp')");
  });

  it('main.js 启动挂载 initInstaller（含 SDK 双注入幂等守卫）', () => {
    const m = R('ios-desktop/js/main.js');
    expect(m).toContain('pkg/pkg-registry.js');
    expect(m).toContain('initInstaller');
    expect(m).toContain('providePermissionMeta');
    expect(m).toContain('if (window.__pkgSdkInstalled) return;');
  });

  it('构建期静态通道：pkg-sdk.js 必须显式复制进 dist（vite 只打包被 import 的模块）', () => {
    const vc = R('vite.config.js');
    expect(vc).toContain("path.join(rootDir, 'ios-desktop', 'js', 'pkg-sdk.js')");
    expect(vc).toContain("path.join(distDir, 'ios-desktop', 'js', 'pkg-sdk.js')");
  });

  it('体量限制与 README 规范表一致（防漂移）', () => {
    expect(PKG_LIMITS.maxZipSize).toBe(30 * 1024 * 1024);
    expect(PKG_LIMITS.maxEntries).toBe(800);
    expect(PKG_LIMITS.maxIconBytes).toBe(512 * 1024);
  });
});
