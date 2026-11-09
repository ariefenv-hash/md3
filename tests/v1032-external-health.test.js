// ==================== v10.97 #172 余项：外部失联探活纯核 + 失联占位面 + 七站点账 ====================
//
// 议题 #172 余项交付守护（R115 窗并行实例 B 认领帖 6703203051）：
//   ① 探活纯核：githubPagesRepoFromUrl / externalHealthEndpoint / appendRetryParam /
//      classifyExternalHealth 判定表（pkg-catalog.js 三期段，#147 判据同款零依赖零环）
//   ② 失联占位面：iframeAppContent externalShell 选项（data-ext-guard + 占位层结构 +
//      __extShellLoad onload 链）+ external-shell.js 守卫接线层（探活执行/看门狗/占位切换）
//   ③ 挂载点锚：pkg-registry buildExternalAppDef 传 externalShell + page-stack 两注入点 +
//      split-screen 分屏再注入点（initExternalShellGuards 幂等）
//   ④ catalog.json externals 账扩至 11 站点（R115 窗全量 Pages 巡查 HTTP 200 实测入库；
//      Aetheria 实证资产 404 排除——巡查帖诚实记录）
//
// 测试纪律：判定表全分支覆盖；源码锚点用定义形态 indexOf；占位面不出真定时器
// （守卫激活路径只做 null 安全与非匹配容器负样本，真 iframe 激活链由 e2e 覆盖）。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  normalizeCatalog,
  isUsableCatalog,
  githubPagesRepoFromUrl,
  externalHealthEndpoint,
  appendRetryParam,
  classifyExternalHealth,
  EXTERNAL_PROBE_TIMEOUT_MS,
  EXTERNAL_RETRY_PARAM,
} from '../ios-desktop/js/pkg/pkg-catalog.js';

import { iframeAppContent } from '../ios-desktop/js/iframe-app.js';
import { initExternalShellGuards } from '../ios-desktop/js/external-shell.js';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');

describe('v10.97 #172 探活纯核常量', () => {
  it('看门狗时限与重试参数名在册', () => {
    expect(EXTERNAL_PROBE_TIMEOUT_MS).toBe(12000);
    expect(EXTERNAL_RETRY_PARAM).toBe('md3_retry');
  });
});

describe('v10.97 #172 githubPagesRepoFromUrl 解析', () => {
  it('项目页 / 带参数 / 深路径 / http 均解析出 owner+repo', () => {
    expect(githubPagesRepoFromUrl('https://ariefenv-hash.github.io/stickman-ink-roguelike/'))
      .toEqual({ owner: 'ariefenv-hash', repo: 'stickman-ink-roguelike' });
    expect(githubPagesRepoFromUrl('https://ariefenv-hash.github.io/moyugang/?embed=1&perf=low'))
      .toEqual({ owner: 'ariefenv-hash', repo: 'moyugang' });
    expect(githubPagesRepoFromUrl('https://ariefenv-hash.github.io/3d/assets/index.js'))
      .toEqual({ owner: 'ariefenv-hash', repo: '3d' });
    expect(githubPagesRepoFromUrl('http://user.github.io/repo/'))
      .toEqual({ owner: 'user', repo: 'repo' });
  });

  it('用户根域无 repo 段 / 非 github.io / 非 URL / 非串 → 全 null', () => {
    expect(githubPagesRepoFromUrl('https://owner.github.io/')).toBe(null);
    expect(githubPagesRepoFromUrl('https://example.com/repo/')).toBe(null);
    expect(githubPagesRepoFromUrl('not a url')).toBe(null);
    expect(githubPagesRepoFromUrl('')).toBe(null);
    expect(githubPagesRepoFromUrl(null)).toBe(null);
    expect(githubPagesRepoFromUrl(42)).toBe(null);
  });
});

describe('v10.97 #172 externalHealthEndpoint 探活端点推导', () => {
  it('github.io → GitHub REST 仓库端点（查询参数不透传）；其余 → null', () => {
    expect(externalHealthEndpoint('https://ariefenv-hash.github.io/moyugang/?embed=1&perf=low'))
      .toBe('https://api.github.com/repos/ariefenv-hash/moyugang');
    expect(externalHealthEndpoint('https://ariefenv-hash.github.io/3d/'))
      .toBe('https://api.github.com/repos/ariefenv-hash/3d');
    expect(externalHealthEndpoint('https://example.com/app/')).toBe(null);
    expect(externalHealthEndpoint('https://owner.github.io/')).toBe(null);
  });
});

describe('v10.97 #172 appendRetryParam 重试参数拼接', () => {
  it('追加 / 覆盖 / 保留既有参数（#189 规格参数不受损）', () => {
    expect(appendRetryParam('https://a.github.io/x/', 1)).toBe('https://a.github.io/x/?md3_retry=1');
    expect(appendRetryParam('https://a.github.io/x/', 3)).toBe('https://a.github.io/x/?md3_retry=3');
    expect(appendRetryParam('https://a.github.io/x/?md3_retry=9', 2)).toBe('https://a.github.io/x/?md3_retry=2');
    const kept = appendRetryParam('https://ariefenv-hash.github.io/moyugang/?embed=1&perf=low', 1);
    expect(kept).toContain('md3_retry=1');
    expect(kept).toContain('embed=1');
    expect(kept).toContain('perf=low');
  });

  it('非法序号按 1；坏 URL 原样返回', () => {
    expect(appendRetryParam('https://a.github.io/x/', 0)).toBe('https://a.github.io/x/?md3_retry=1');
    expect(appendRetryParam('https://a.github.io/x/', -5)).toBe('https://a.github.io/x/?md3_retry=1');
    expect(appendRetryParam('https://a.github.io/x/', NaN)).toBe('https://a.github.io/x/?md3_retry=1');
    expect(appendRetryParam('not a url', 1)).toBe('not a url');
    expect(appendRetryParam('', 1)).toBe('');
  });
});

describe('v10.97 #172 classifyExternalHealth 判定表（全分支，权威信号压制弱信号）', () => {
  it('规则 1：API 404 权威失联——即使 load 已发生（load 的可能是 404 错误页）', () => {
    expect(classifyExternalHealth({ probeStatus: 404, loadFired: true })).toBe('unreachable');
    expect(classifyExternalHealth({ probeStatus: 404 })).toBe('unreachable');
  });

  it('规则 2：no-cors 直连网络级被拒 → 失联——即使 load 已发生', () => {
    expect(classifyExternalHealth({ reachable: false, loadFired: true })).toBe('unreachable');
    expect(classifyExternalHealth({ reachable: false })).toBe('unreachable');
  });

  it('规则 3/4：仓库在册（200）或直连可达 → ok——慢载不占位', () => {
    expect(classifyExternalHealth({ probeStatus: 200, loadTimedOut: true, loadFired: false })).toBe('ok');
    expect(classifyExternalHealth({ probeStatus: 200 })).toBe('ok');
    expect(classifyExternalHealth({ reachable: true, loadTimedOut: true, loadFired: false })).toBe('ok');
    expect(classifyExternalHealth({ reachable: true })).toBe('ok');
  });

  it('规则 5：看门狗超时且零 load 信号 → 失联（探活歧义态不豁免看门狗）', () => {
    expect(classifyExternalHealth({ loadTimedOut: true, loadFired: false, probeStatus: null, reachable: null })).toBe('unreachable');
    expect(classifyExternalHealth({ loadTimedOut: true })).toBe('unreachable');
  });

  it('规则 6：load 已发生（无更强信号）→ ok（网络级到达；深度可用性同源策略不可测）', () => {
    expect(classifyExternalHealth({ loadFired: true })).toBe('ok');
  });

  it('规则 7：全歧义（探活进行中 / API 整域失败无直连结论）→ unknown 不降级', () => {
    expect(classifyExternalHealth({})).toBe('unknown');
    expect(classifyExternalHealth(null)).toBe('unknown');
    expect(classifyExternalHealth({ probeStatus: null, reachable: null })).toBe('unknown');
    expect(classifyExternalHealth({ probeStatus: 403, reachable: null })).toBe('unknown'); // API 限流等非 200/404 态
    expect(classifyExternalHealth({ probeStatus: 500 })).toBe('unknown');
  });

  it('loadFired 与 loadTimedOut 并存（超时后 load 才到）→ ok（迟到好过失联）', () => {
    expect(classifyExternalHealth({ loadTimedOut: true, loadFired: true })).toBe('ok');
  });
});

describe('v10.97 #172 iframeAppContent externalShell 占位面', () => {
  const URL = 'https://ariefenv-hash.github.io/stickman-ink-roguelike/';

  it('externalShell 选项 → data-ext-guard 标记 + 占位层（hidden 起步）+ onload 报告链', () => {
    const html = iframeAppContent(URL, { externalShell: { name: '墨痕武道' } });
    expect(html).toContain('data-ext-guard="1"');
    expect(html).toContain('data-ext-placeholder');
    expect(html).toContain('hidden');
    expect(html).toContain('data-test="ext-placeholder"');
    expect(html).toContain('data-test="ext-retry"');
    expect(html).toContain('__extShellLoad');
    expect(html).toContain('墨痕武道');
    expect(html).toContain('外部站点暂不可达');
    expect(html).toContain('@media (min-width:768px)');
    // src 原样放行（http(s) 绝对地址过 anchorAppSrc 不改写）
    expect(html).toContain(`src="${URL}"`);
  });

  it('timeoutMs 覆写 → data-ext-timeout 属性；默认不出该属性', () => {
    const withTo = iframeAppContent(URL, { externalShell: { name: 'x', timeoutMs: 1500 } });
    expect(withTo).toContain('data-ext-timeout="1500"');
    const noTo = iframeAppContent(URL, { externalShell: { name: 'x' } });
    expect(noTo).not.toContain('data-ext-timeout');
  });

  it('name 特殊字符转义（防注入：引号 / 尖括号 / &）', () => {
    const html = iframeAppContent(URL, { externalShell: { name: '<img src=x onerror=alert(1)> "q" & \'a\'' } });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
    expect(html).toContain('&quot;q&quot;');
    expect(html).toContain('&amp;');
    expect(html).toContain('&#39;a&#39;');
  });

  it('无 externalShell（内置/包应用路径）零占位面零守卫标记 —— 旧路径不变式', () => {
    const plain = iframeAppContent('apps/messages/index.html');
    expect(plain).not.toContain('data-ext-guard');
    expect(plain).not.toContain('data-ext-placeholder');
    expect(plain).not.toContain('__extShellLoad');
    // anchorAppSrc 锚定行为不变（测试环境命中源码版布局 → 绝对路径；相对尾部路径仍在）
    expect(plain).toContain('apps/messages/index.html"');
    const sandboxed = iframeAppContent('pkg/com.demo.hello/index.html', { sandbox: 'allow-scripts' });
    expect(sandboxed).toContain('sandbox="allow-scripts"');
    expect(sandboxed).not.toContain('data-ext-guard');
  });
});

describe('v10.97 #172 external-shell.js 接线层（null 安全与守卫幂等负样本）', () => {
  it('initExternalShellGuards 对 null / 空 root / 无守卫 iframe 容器零操作零异常', () => {
    expect(() => initExternalShellGuards(null)).not.toThrow();
    expect(() => initExternalShellGuards(undefined)).not.toThrow();
    const bare = document.createElement('div');
    bare.innerHTML = '<iframe src="https://a.github.io/x/"></iframe>'; // 无 data-ext-guard → 不挂
    expect(() => initExternalShellGuards(bare)).not.toThrow();
    expect(bare.querySelector('iframe').dataset.extGuardBound).toBe(undefined);
  });

  it('守卫激活依赖占位面在场：有守卫标记无占位面 → 不挂（防呆）', () => {
    const c = document.createElement('div');
    c.innerHTML = '<iframe src="https://a.github.io/x/" data-ext-guard="1"></iframe>';
    expect(() => initExternalShellGuards(c)).not.toThrow();
    expect(c.querySelector('iframe').dataset.extGuardBound).toBe(undefined);
  });
});

describe('v10.97 #172 挂载点接线锚（源码形态）', () => {
  it('pkg-registry buildExternalAppDef 传 externalShell（name 透传）', () => {
    const s = src('ios-desktop/js/pkg/pkg-registry.js');
    expect(s.indexOf("iframeAppContent(rec.url, { externalShell: { name: rec.name } })")).toBeGreaterThan(-1);
  });

  it('page-stack 两注入点 + split-screen 分屏注入点均挂 initExternalShellGuards', () => {
    const ps = src('ios-desktop/js/page-stack.js');
    expect(ps.indexOf("import { initExternalShellGuards } from './external-shell.js';")).toBeGreaterThan(-1);
    expect(ps.indexOf('initExternalShellGuards(wrapper);')).toBeGreaterThan(-1);
    expect(ps.indexOf('initExternalShellGuards(appWrapper);')).toBeGreaterThan(-1);
    const ss = src('ios-desktop/js/split-screen.js');
    expect(ss.indexOf("import { initExternalShellGuards } from './external-shell.js';")).toBeGreaterThan(-1);
    expect(ss.indexOf('initExternalShellGuards(paneEl);')).toBeGreaterThan(-1);
  });

  it('external-shell 判定消费全走纯核（不重复实现判定逻辑）', () => {
    const s = src('ios-desktop/js/external-shell.js');
    expect(s.indexOf("from './pkg/pkg-catalog.js'")).toBeGreaterThan(-1);
    expect(s.indexOf('classifyExternalHealth')).toBeGreaterThan(-1);
    expect(s.indexOf('externalHealthEndpoint')).toBeGreaterThan(-1);
    expect(s.indexOf('appendRetryParam')).toBeGreaterThan(-1);
    // 判定表单源纪律：接线层不直接 return 判定值（verdict 唯一出口 = classifyExternalHealth；
    // reasonOf 的 probeStatus 文案选择是展示逻辑，不构成第二判定源 —— 故锚 return 形态而非 === 形态）
    expect(s).not.toMatch(/return\s+'unreachable'/);
    expect(s).not.toMatch(/return\s+'ok'/);
    expect(s).not.toMatch(/return\s+'unknown'/);
  });
});

describe('v10.97 #172 catalog.json externals 账（R115 巡查扩至 11 站点）', () => {
  const raw = JSON.parse(readFileSync(resolve(ROOT, 'ios-desktop/catalog.json'), 'utf8'));
  const res = normalizeCatalog(raw);
  const EXPECTED_IDS = [
    'retro-player', 'prism-tower', 'geometric-traverse', 'moyugang',
    'ink-martial', 'karaoke-lab', 'paper-tangram', 'gravity-matrix-3d',
    'draft-loop', 'around-world', 'clock-pwa',
  ];

  it('归一通过、零 issue、11 站点账与白名单域对齐（R114 四站 + R115 七站合法增长）', () => {
    expect(res.ok).toBe(true);
    expect(isUsableCatalog(res)).toBe(true);
    expect(res.issues).toEqual([]);
    expect(res.apps.length).toBe(1); // 一期 demo 包账不变
    expect(res.externals.length).toBe(11);
    for (const e of res.externals) {
      expect(e.url.startsWith('https://ariefenv-hash.github.io/')).toBe(true);
      expect(e.kind).toBe('external');
      expect(e.description.length).toBeGreaterThan(0);
    }
  });

  it('id 账序与唯一性（11 条，R114 账序不变、R115 七站顺延追加）', () => {
    expect(res.externals.map((e) => e.id)).toEqual(EXPECTED_IDS);
    expect(new Set(res.externals.map((e) => e.id)).size).toBe(11);
  });

  it('#189 规格保留：moyugang 默认携 embed/perf；新账 URL 与实证仓库一一对应', () => {
    const mo = res.externals.find((e) => e.id === 'moyugang');
    expect(mo.url).toContain('embed=1');
    expect(mo.url).toContain('perf=low');
    const urlOf = (id) => res.externals.find((e) => e.id === id).url;
    expect(urlOf('ink-martial')).toBe('https://ariefenv-hash.github.io/stickman-ink-roguelike/');
    expect(urlOf('karaoke-lab')).toBe('https://ariefenv-hash.github.io/Enjoy-music/');
    expect(urlOf('paper-tangram')).toBe('https://ariefenv-hash.github.io/zhishangshenghua/');
    expect(urlOf('gravity-matrix-3d')).toBe('https://ariefenv-hash.github.io/3d/');
    expect(urlOf('draft-loop')).toBe('https://ariefenv-hash.github.io/caogaolunhui/');
    expect(urlOf('around-world')).toBe('https://ariefenv-hash.github.io/kimi-mobile/');
    expect(urlOf('clock-pwa')).toBe('https://ariefenv-hash.github.io/clock-app/');
  });

  it('Aetheria（Next.js 静态导出资产 404 实证）不在账 —— 巡查裁决诚实落库', () => {
    const ids = res.externals.map((e) => e.id);
    expect(ids).not.toContain('aetheria');
    expect(JSON.stringify(raw.externals)).not.toContain('Aetheria-Terraforge');
  });
});
