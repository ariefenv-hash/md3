// ==================== v7.60 — 安装包可靠性三连修（用户实证回归） ====================
//
// 用户报告三问题 → 修复锚定：
//   ①「新装应用初次打开 404，多刷新几遍才好」→ 根因层 A（SW 未接管窗口期裸 404）、
//     B（SW 读 IDB 瞬态故障伪装 404）、C（PKG_CHANGED 丢失缓存陈旧）三层自愈体系
//   ②「不刷新的话安装包应用可能直接死掉没反应」→ 全局 boot 守卫改为实例级守卫
//   ③「部分 CDN 链接加载失败，直接打开原网页文件正常」→ PKG_HTML_CSP 放行 https

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => readFileSync(path.join(ROOT, p), 'utf-8');

let swSrc, regSrc, iframeSrc, installerSrc;
beforeAll(() => {
  swSrc = R('sw.js');
  regSrc = R('ios-desktop/js/pkg/pkg-registry.js');
  iframeSrc = R('ios-desktop/js/iframe-app.js');
  installerSrc = R('ios-desktop/js/apps/installer.js');
});

// ==================== ① 首开 404 自愈三件套 ====================

describe('v7.60 ① SW 侧：IDB 瞬态故障不再伪装 404', () => {
  it('pkgIdbGetInstalled 读毕即关 IDB 连接（连接泄漏根治）', () => {
    expect(swSrc).toContain('fix(v7.60)：读毕即关连接');
    // finally 块关闭连接
    expect(swSrc).toMatch(/async function pkgIdbGetInstalled\(appId\) \{[\s\S]*?\} finally \{\s*try \{ d\.close\(\); \} catch \(e\) \{\}\s*\}/);
  });

  it('pkgGetRecord 抛错重试一次而非直接返回 null', () => {
    expect(swSrc).toContain('fix(v7.60)：IDB 瞬态故障重试');
    // 重试循环：attempt>0 才上抛，首错后隔 120ms 重试
    expect(swSrc).toMatch(/for \(let attempt = 0; ; attempt\+\+\)/);
    expect(swSrc).toMatch(/if \(attempt > 0\) throw e;\s*await new Promise\(\(r\) => setTimeout\(r, 120\)\);/);
  });

  it('servePackage 读库异常返回 503（pkg503），404 仅留给真实缺失', () => {
    expect(swSrc).toMatch(/try \{\s*rec = await pkgGetRecord\(appId\);\s*\} catch \(e\) \{\s*[\s\S]*?return pkg503\(appId, path\);/);
    expect(swSrc).toContain("error: 'package service unavailable'");
    expect(swSrc).toContain("status: 503");
    // 真实缺失仍 404
    expect(swSrc).toContain("error: 'package file not found'");
  });

  it('版本锚点：sw.js 为 geek-v77', () => {
    expect(swSrc).toContain("const VERSION = 'geek-v77';");
  });
});

describe('v7.60 ② 页面侧：waitPkgServing 探测门 + iframe 自愈', () => {
  it('installPending 完成前等待 SW 真实供包（非致命）', () => {
    expect(regSrc).toMatch(/await pkgStore\.putInstalled\(record\);[\s\S]*?notifyPkgChanged\(appId\);\s*\/\/ v7\.60[\s\S]*?try \{ await waitPkgServing\(appId, record\.entry, 5000\); \} catch \(e\) \{\}/);
  });

  it('openPkgApp 打开前探测（pkgEntry 缺省 index.html 兜底）', () => {
    expect(regSrc).toMatch(/export async function openPkgApp\(appId\) \{[\s\S]*?await waitPkgServing\(appId, \(def && def\.pkgEntry\) \|\| 'index\.html', 5000\);/);
  });

  it('buildPkgAppDef 携带 pkgEntry + 自愈 onLoadExtra', () => {
    expect(regSrc).toContain('pkgEntry: rec.entry');
    expect(regSrc).toContain("onLoadExtra: 'window.__pkgIframeSelfHeal&&window.__pkgIframeSelfHeal(this)'");
  });

  it('waitPkgServing：404 时补发全量 PKG_CHANGED（缓存陈旧分支自愈）', () => {
    expect(regSrc).toMatch(/const r = await fetch\(url, \{ cache: 'no-store' \}\);\s*if \(r && r\.ok\) return true;\s*\/\/ 受控但 404[\s\S]*?notifyPkgChanged\(''\);/);
    // 退避轮询上限 1200ms，deadline 出口
    expect(regSrc).toMatch(/Math\.min\(250 \* \(n \+ 1\), 1200\)/);
  });

  it('pkgIframeSelfHeal：识别包 404/503 JSON 与服务器 404 页签名，退避重载上限 8 次', () => {
    expect(regSrc).toContain('function pkgIframeSelfHeal(iframe)');
    expect(regSrc).toContain('\'"package file not found"\'');
    expect(regSrc).toContain('\'"package service unavailable"\'');
    expect(regSrc).toMatch(/\/\(\^\|\\s\)404\(\\s\|\$\)\|page not found\/i/);
    expect(regSrc).toMatch(/if \(n >= 8\) return;/);
    expect(regSrc).toMatch(/Math\.min\(500 \* Math\.pow\(2, n\), 8000\)/);
  });

  it('initInstaller 注册全局自愈入口（先于任何包应用可打开）', () => {
    expect(regSrc).toMatch(/export async function initInstaller\(\) \{\s*installPkgSelfHeal\(\);/);
    expect(regSrc).toContain('window.__pkgIframeSelfHeal = pkgIframeSelfHeal');
  });

  it('iframeAppContent 支持 onLoadExtra 追加通道且不传时零行为变化', async () => {
    const { iframeAppContent } = await import('../ios-desktop/js/iframe-app.js');
    const plain = iframeAppContent('apps/notes/index.html');
    expect(plain).toContain("onload=\"this.dataset.loaded='1';window.__syncIframeApp&&window.__syncIframeApp(this)\">");
    expect(plain).not.toContain('__pkgIframeSelfHeal');
    const extra = iframeAppContent('pkg/pkg-x/index.html', { onLoadExtra: 'window.__pkgIframeSelfHeal&&window.__pkgIframeSelfHeal(this)' });
    expect(extra).toContain("window.__syncIframeApp&&window.__syncIframeApp(this);window.__pkgIframeSelfHeal&&window.__pkgIframeSelfHeal(this)\"");
    // src 路径保留（源码布局会被 anchorAppSrc 锚定为站内绝对路径，这里只锚路径本体）
    expect(extra).toContain('pkg/pkg-x/index.html');
  });
});

// ==================== ② 安装器死亡修复 ====================

describe('v7.60 ③ 安装器实例级 boot 守卫', () => {
  it('不再使用 window.__pkgInstallerBooted 全局守卫（死亡根因符号死透）', () => {
    expect(installerSrc).not.toContain('__pkgInstallerBooted');
  });

  it('守卫挂在 root 元素上（新 DOM 必然重跑引导）', () => {
    expect(installerSrc).toMatch(/var root = document\.getElementById\('pkgApp'\);\s*if \(!root\) return;[\s\S]*?if \(root\.__pkgBooted\) return;\s*root\.__pkgBooted = true;/);
  });

  it('refresh 监听经 __addAppCleanup 登记（实例销毁自动退订，防累积）', () => {
    expect(installerSrc).toMatch(/window\.addEventListener\('pkg-installer-refresh', refresh\);[\s\S]*?window\.__addAppCleanup\('installer', function\(\) \{\s*window\.removeEventListener\('pkg-installer-refresh', refresh\);/);
  });

  it('page-stack 的 __addAppCleanup 清理口仍存在（登记契约成立）', () => {
    const ps = R('ios-desktop/js/page-stack.js');
    expect(ps).toContain('window.__addAppCleanup = function (appId, fn)');
    expect(ps).toMatch(/releaseAppListeners\(appId\);/);
  });
});

// ==================== ③ CDN 放行 ====================

describe('v7.60 ④ PKG_HTML_CSP 放行 https CDN', () => {
  it('default/script/style/font/connect 均 https:，img/media/font 兼容 http:', () => {
    expect(swSrc).toContain("\"default-src 'self' https: data: blob:; \"");
    expect(swSrc).toContain("\"script-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; \"");
    expect(swSrc).toContain("\"style-src 'self' 'unsafe-inline' https: data: blob:; \"");
    expect(swSrc).toContain("\"img-src 'self' https: http: data: blob:; \"");
    expect(swSrc).toContain("\"media-src 'self' https: http: data: blob:; \"");
    expect(swSrc).toContain("\"font-src 'self' https: http: data: blob:; \"");
    expect(swSrc).toContain("\"connect-src 'self' https: wss: data: blob:;\"");
  });

  it('内联与 eval 仍放行（网页包常态），SDK 同源注入不受影响', () => {
    expect(swSrc).toContain("'unsafe-inline'");
    expect(swSrc).toContain("'unsafe-eval'");
    expect(swSrc).toContain('pkgInjectSDK');
  });

  it('README 信任模型段落与放行后的 CSP 同步', () => {
    const readme = R('README.md');
    expect(readme).toContain('https CDN 外联');
  });
});

// ==================== 行为级：实例守卫语义（模块导入验证） ====================

describe('v7.60 ⑤ 行为级：安装器模块与注册层可用性', () => {
  it('pkg-registry 可导入且 waitPkgServing 可调用（内存回退环境不抛）', async () => {
    const mod = await import('../ios-desktop/js/pkg/pkg-registry.js');
    expect(typeof mod.waitPkgServing).toBe('function');
    // 无 SW / 无服务环境：探测失败应返回 false 而非抛错（非致命契约）
    const ok = await mod.waitPkgServing('pkg-nonexistent-probe', 'index.html', 1);
    expect(ok).toBe(false);
  });

  it('buildPkgAppDef 产物含自愈 onload 且 pkgEntry 正确', async () => {
    const mod = await import('../ios-desktop/js/pkg/pkg-registry.js');
    const def = mod.buildPkgAppDef({
      appId: 'pkg-com.e2e.demo', name: '演示', version: '1.0.0', entry: 'app/index.html', iconHTML: '',
    });
    expect(def.pkgEntry).toBe('app/index.html');
    expect(def.isPkg).toBe(true);
    expect(def.pages[0].content).toContain('pkg/pkg-com.e2e.demo/app/index.html');
    expect(def.pages[0].content).toContain('__pkgIframeSelfHeal');
  });
});
