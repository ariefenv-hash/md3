// ==================== v10.82 #301：dist 与源码资产对账门禁（源→dist 方向常驻化） ====================
//
// #301 交付守护（P2 构建：catalog.json 缺失实证 + demo/docs 排除意图未裁决）：
//   ① 四通道对账：A 全量拷贝通道（apps/**+assets/** 逐文件存在性）/ B 运行时 fetch
//      拼路径白名单（catalog.json = #298 实证族）/ C 入口三件 / D 排除意图表
//   ② 排除意图文档化：demo/、docs/ 有意不进 dist——EXEMPT_INTENT 表登记即审计基准
//      （唯一真源落脚本；vite.config 内联注释因 #223 活跃租约车道在途延后，认领帖已披露）
//   ③ 打包类（css/js 入 assets bundle）不参与裸对账——防 258 误报实证（裸 walk 源↔dist
//      差集全为 vite 打包产物，见 #301 认领帖预勘）
//   ④ 阴性验证在册：临时源文件必红（门禁非空洞绿）
//
// 与既有防线互补：构建内 1.05/1.6/1.65（引用驱动）+ verify-dist（dist 自身自洽）+
// e2e:dist #299 网络层/关键资源（运行时实证）——本门禁补齐「未被引用资产」的源→dist 方向。

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');

describe('v10.82 #301 对账脚本四通道结构', () => {
  const s = () => src('scripts/check-dist-parity.mjs');

  it('通道 A：apps+assets 全量拷贝通道逐文件对账（存在性+非空，压缩类不做字节比对）', () => {
    expect(s()).toContain("for (const dir of ['apps', 'assets'])");
    expect(s()).toContain('dist 缺失');
    expect(s()).toContain('dist 空体');
  });

  it('通道 B：运行时 fetch 白名单在册，catalog.json 为 #298 实证族首项', () => {
    expect(s()).toContain("'ios-desktop/catalog.json', // #298：市场目录");
  });

  it('通道 C：入口三件（根 index.html / 壳 / launch.html 第二入口）', () => {
    expect(s()).toContain("const ENTRIES = ['index.html', 'ios-desktop/index.html', 'launch.html'];");
  });

  it('通道 D：EXEMPT_INTENT 排除意图表 demo/docs 双登记（#301 建议②文档化）', () => {
    expect(s()).toContain("prefix: 'ios-desktop/demo/'");
    expect(s()).toContain("prefix: 'ios-desktop/docs/'");
    expect(s()).toContain('有意不进 dist');
    // vite.config 延后披露在册（#223 租约车道纪律）
    expect(s()).toContain('#223 活跃租约车道');
  });
});

describe('v10.82 #301 源码侧实物对账（真实对账非仅字符串锚）', () => {
  it('入口三件源码在场 + catalog.json 源码在场', () => {
    expect(existsSync(resolve(ROOT, 'index.html'))).toBe(true);
    expect(existsSync(resolve(ROOT, 'ios-desktop/index.html'))).toBe(true);
    expect(existsSync(resolve(ROOT, 'launch.html'))).toBe(true);
    expect(existsSync(resolve(ROOT, 'ios-desktop/catalog.json'))).toBe(true);
  });

  it('排除意图登记项源码实存在场（demo/ 或 docs/ 至少其一，防表腐化）', () => {
    const demo = existsSync(resolve(ROOT, 'ios-desktop/demo'));
    const docs = existsSync(resolve(ROOT, 'ios-desktop/docs'));
    expect(demo || docs).toBe(true);
  });
});

describe('v10.82 #301 门禁接线', () => {
  it('npm run check:dist-parity 已登记', () => {
    expect(src('package.json')).toContain('"check:dist-parity": "node scripts/check-dist-parity.mjs"');
  });

  it('与互补防线并提（verify-dist #139 / e2e:dist #299），口径不越位', () => {
    const s = src('scripts/check-dist-parity.mjs');
    expect(s).toContain('verify-dist');
    expect(s).toContain('#299');
    expect(s).toContain('#297');
    expect(s).toContain('#298');
  });
});
