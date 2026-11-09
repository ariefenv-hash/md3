// ==================== v10.92 #298：市场目录同源治本（dist 拷贝 + fetch 链序翻转） ====================
//
// #298 交付守护（P1 实测复现：appstore 生产环境目录双通道全挂）：
//   ① 治本：ios-desktop/catalog.json 纳入 vite 构建 dist 拷贝（precache 为 dist 全产物
//      扫描自动纳入 → 生产/离线市场目录均可用；verify-dist 双向自洽门禁自动守护）
//   ② 链序翻转：catalogFetchChain() 同源首选 → CDN 兜底（jsdelivr 对本仓 gh 代理全局
//      403 实测复现——仓库体积超限，#298/#302；CDN 首选位恒死只会拖慢失败路径）
//   ③ 命中位判据：appstore isCdn 由位置判据（i===1）改为 CDN 常量同串判据（对链序不敏感）
//   ④ import 完整性：appstore 页面脚本 import 列表含 CDN_CATALOG_URL（桥注出必需，
//      缺失即 ReferenceError —— 页面脚本整图瘫痪教训 v7.99 同族）
//   ⑤ 降级语义不变：全失仍走「目录暂不可达 · 离线模式」可见错误态（#183 裁决纪律）
//
// 测试纪律：indexOf 切片锚点用定义形态；负断言用 not.toMatch 正则防注释误报。

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  catalogFetchChain,
  CATALOG_URL,
  CDN_CATALOG_URL,
} from '../ios-desktop/js/pkg/pkg-catalog.js';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');

describe('v10.92 #298 catalogFetchChain 链序翻转（同源首选）', () => {
  it('同源相对地址在首位，CDN 降兜底位', () => {
    const chain = catalogFetchChain();
    expect(chain[0]).toBe(CATALOG_URL);
    expect(chain[0]).toBe('catalog.json');
    expect(chain.indexOf(CDN_CATALOG_URL)).toBeGreaterThan(0);
  });

  it('pkg-catalog 源码链体定义形态：同源构造在前', () => {
    const s = src('ios-desktop/js/pkg/pkg-catalog.js');
    expect(s).toContain('const chain = [CATALOG_URL];');
    expect(s).toContain('chain.indexOf(CDN_CATALOG_URL) === -1) chain.push(CDN_CATALOG_URL)');
    // 旧形态负断言：CDN 构造在前的旧链体不得残留
    expect(s).not.toContain('const chain = [CDN_CATALOG_URL];');
    // 翻转依据在册（诚实标注纪律）
    expect(s).toContain('#298');
    expect(s).toContain('403');
  });
});

describe('v10.92 #298 构建侧：catalog.json 纳入 dist 拷贝', () => {
  it('vite.config copyStaticAndPrecache 含 catalog.json 治本拷贝（定义形态锚）', () => {
    const cfg = src('vite.config.js');
    expect(cfg).toContain("path.join(rootDir, 'ios-desktop', 'catalog.json')");
    expect(cfg).toContain("path.join(distDir, 'ios-desktop', 'catalog.json')");
    // 复制日志行在册（构建可观测性锚）
    expect(cfg).toContain('catalog.json(#298)');
  });

  it('源码数据源在场且为合法 JSON（防空壳数据源）', () => {
    const p = resolve(ROOT, 'ios-desktop/catalog.json');
    expect(existsSync(p)).toBe(true);
    const raw = JSON.parse(readFileSync(p, 'utf8'));
    expect(raw && typeof raw === 'object').toBe(true);
  });
});

describe('v10.92 #298 消费面：appstore 桥与命中位判据', () => {
  const appstore = src('ios-desktop/js/apps/appstore.js');

  it('import 列表含 CDN_CATALOG_URL（缺失即 ReferenceError 防线）', () => {
    const importBlock = appstore.slice(appstore.indexOf('import {'), appstore.indexOf("} from '../pkg/pkg-catalog.js'"));
    expect(importBlock).toContain('CDN_CATALOG_URL');
  });

  it('isCdn 同串判据在册（位置判据 i === 1 旧形态不残留）', () => {
    expect(appstore).toContain('coreCdn && url === coreCdn');
    expect(appstore).not.toMatch(/isCdn:\s*i\s*===\s*1/);
  });

  it('降级可见错误态语义维持（#183 裁决纪律不被翻转稀释）', () => {
    expect(appstore).toContain('目录暂不可达 · 离线模式（已装应用不受影响）');
    expect(appstore).toContain('as-empty');
  });
});
