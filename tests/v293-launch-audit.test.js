// ==================== v11.13 #293：launch.html 定位盘点（分享落地页文档化 + 版本字样反漂移治本） ====================
// @snapshot · 交付时点快照（#291 §1 裁决）：钉扎对象=launch 审计面时点账；允许随快照失义退役（docs/test-naming-evergreen.md §4 登记制）——R149 改名机械批注入
//
// #293 交付守护（第二 HTML 入口长期不同步 → 行为漂移成"半坏页面"无人发现）：
//   ① 定位裁决 = 「明确定位 + 纳入门禁」（三选一之一）：launch.html 是 MD3 启动分享
//      落地页（og:/twitter: 卡片 + 免安装一键进入主壳），与 index.html 职责互补非重复；
//      代码层面零引用方（纯 URL 直达入口）——不删（分享链接死链）不并（职责不同）。
//   ② 版本字样反漂移治本：launch.html 在仓库根、不在 roll-version.py 扫描集
//      （tests+ios-desktop/**）→ 硬编码版本号必然漂移（实证：badge 落后 41 版
//      无人发现）——badge 改 fetch('sw.js') 动态填充（settings.js fillSysVer 提取链
//      同律；本文件在仓库根 → 源码态 serve 根 / dist 态 dist 根双态命中）；
//      og:/description 爬虫态静态文案零版本语义（爬虫不执行 JS，不绑动态面）。
//   ③ 应用数真源对齐：四处「31 个应用」→「41 个应用」（#267 README 真源口径：
//      apps/ 含 index.html 的 iframe 子应用 41；52 应用定义为 js/apps/ import 面，
//      分享文案取用户可见面口径）。
//   ④ 冒烟接线维持：e2e:dist 关键资源清单 launch.html 首锚（#299）+ vite 构建
//      拷贝压缩通道（dist 落地面）双在册。
//
// 测试纪律：launch.html 不在 roll-version 扫描集 → 本套件全部锚点为无版本号
// 断言（不含 vX.YZ 字样），滚版零重锚。

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');
const launch = () => src('launch.html');

describe('v11.13 #293 定位与职责文档化', () => {
  it('① #293 定位头注在册（分享落地页职责 + 与 index 互补 + 零引用方声明）', () => {
    const s = launch();
    expect(s).toContain('#293 定位');
    expect(s).toContain('MD3 启动分享落地页');
    expect(s).toContain('与 index.html 职责互补');
    expect(s).toContain('代码层面零引用方');
  });

  it('② og:/twitter: 分享卡片在册（落地页核心职责面零稀释）', () => {
    const s = launch();
    expect(s).toContain('og:title');
    expect(s).toContain('og:image');
    expect(s).toContain('og:url');
    expect(s).toContain('twitter:card');
    expect(s).toContain('进入桌面');
  });

  it('③ launch.html 实物在场且零同源本地资源依赖（单文件零构建形态，冒烟面恒定）', () => {
    expect(existsSync(resolve(ROOT, 'launch.html'))).toBe(true);
    const s = launch();
    // src= 引用零本地路径（og:image 为绝对外链、favicon 为 data:svg）——
    // 同源资源依赖为零 → e2e 关键资源清单 HTTP 200 单锚即完备，无需扩资源面
    const localSrc = [...s.matchAll(/src=["']([^"']+)["']/g)]
      .map((m) => m[1])
      .filter((u) => !u.startsWith('http') && !u.startsWith('data:') && !u.startsWith('#'));
    expect(localSrc).toEqual([]);
  });
});

describe('v11.13 #293 版本字样反漂移治本', () => {
  it('④ badge 动态填充链在册：fetch(sw.js) + VERSION 常量锚定 + 占位符映射（fillSysVer 同律）', () => {
    const s = launch();
    expect(s).toContain("fetch('sw.js', { cache: 'no-cache' })");
    expect(s).toContain("match(/const VERSION = '([^']+)'/)");
    expect(s).toContain("v.indexOf('__') !== 0"); // 源码态占位符 → 维持初始值
    expect(s).toContain('launchVer'); // 填充目标 id
  });

  it('⑤ 硬编码版本字样零残留（负断言：陈旧 badge 形态不复发）', () => {
    const s = launch();
    expect(s).not.toMatch(/class="v">v\d+\.\d+/); // badge 静态版本字样禁形态
    expect(s).not.toContain('全新 v7'); // 旧 description 版本绑定形态（前缀锚防误伤）
    expect(s).not.toMatch(/aria-label="v\d/); // aria 版本绑定形态
  });

  it('⑥ og:/description 爬虫态静态文案零版本语义（爬虫不执行 JS，动态填充不覆盖 meta）', () => {
    const s = launch();
    const metas = s.slice(0, s.indexOf('</head>'));
    expect(metas).not.toMatch(/content="[^"]*v\d+\.\d+/); // head 区 meta 无版本字样
  });
});

describe('v11.13 #293 应用数真源对齐（#267 README 口径）', () => {
  it('⑦ 四处应用数 = 41（meta description / og:description / tagline / 特色卡）且 31 零残留', () => {
    const s = launch();
    expect((s.match(/41 个应用/g) || []).length).toBe(4);
    expect(s).not.toContain('31 个应用');
  });
});

describe('v11.13 #293 门禁接线（冒烟面 + 构建面双在册）', () => {
  it('⑧ e2e:dist 关键资源清单含 launch.html（#299 首锚维持，部署回归面不断链）', () => {
    const s = src('scripts/e2e-dist-smoke.mjs');
    expect(s).toContain('launch.html');
  });

  it('⑨ vite 构建拷贝+压缩通道在册（dist 落地面）+ 头注不在扫描集的维护纪律入册', () => {
    const cfg = src('vite.config.js');
    expect(cfg).toContain("path.join(rootDir, 'launch.html')");
    expect(cfg).toContain("path.join(distDir, 'launch.html')");
    const s = launch();
    expect(s).toContain('roll-version.py 扫描集');
  });
});
