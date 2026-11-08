// ==================== v10.76 #299：e2e:dist 网络层防线（404/403 部署回归零拦截盲区治理） ====================
//
// #299 交付守护（P2 实测：e2e:dist 只断言 pageerror 不断言网络失败）：
//   #297（alarm-ringtone.js 404）与 #298（catalog.json 404/403）两例部署级缺件事故
//   在深测中现形，而现行 e2e:dist 全绿——网络层失败完全在断言面之外。本文件锚定
//   scripts/e2e-dist-smoke.mjs 的四件防线补强：
//   ① 同源 response.status>=400 收集通道（404 缺件 / 403 拒绝 / 5xx 服务异常）
//   ② 同源 requestfailed 收集通道（网络层异常 errorText；外域 abort 断网纪律域外）
//   ③ NET_EXEMPT 豁免表机制（数据驱动防误报，每项必附理由；空表零豁免起步）
//   ④ dist 关键资源存在性清单（部署级缺件双保险，#298/#297 两事故文件永久回归锚）
//
// 测试纪律：indexOf 切片锚点用定义形态；负断言防既有防线被稀释。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');
const runner = () => src('scripts/e2e-dist-smoke.mjs');

describe('v10.76 #299 网络层双通道收集', () => {
  it('① 同源 response.status>=400 收集通道在册（定义形态锚）', () => {
    const s = runner();
    expect(s).toContain("pg.on('response', (r) => {");
    expect(s).toContain('if (r.status() < 400) return;');
    expect(s).toContain('`HTTP ${r.status()} ${u.slice(SAME_ORIGIN.length)}`');
  });

  it('② 同源 requestfailed 收集通道在册（errorText 入册）', () => {
    const s = runner();
    expect(s).toContain("pg.on('requestfailed', (r) => {");
    expect(s).toContain('requestfailed ${r.failure()?.errorText');
  });

  it('两通道同源判据一致（外域断网纪律域外，各通道独立判定）', () => {
    const s = runner();
    expect(s).toContain('const SAME_ORIGIN = `http://127.0.0.1:${PORT}`;');
    // startsWith(SAME_ORIGIN) 判定在 response 与 requestfailed 两通道均在册
    expect(s.match(/u\.startsWith\(SAME_ORIGIN\)/g)?.length).toBeGreaterThanOrEqual(2);
  });
});

describe('v10.76 #299 豁免表机制（数据驱动防误报）', () => {
  it('NET_EXEMPT 空表零豁免起步 + netExemptOf 在两通道应用', () => {
    const s = runner();
    expect(s).toContain('const NET_EXEMPT = [];');
    expect(s).toContain('const netExemptOf = (u) => NET_EXEMPT.find((e) => e.test(u));');
    // 豁免判定在两通道均在册（response + requestfailed）
    expect(s.match(/if \(netExemptOf\(u\)\) return;/g)?.length).toBeGreaterThanOrEqual(2);
    // 每项必附理由的纪律注释在册
    expect(s).toContain('每项必附理由');
  });
});

describe('v10.76 #299 逐应用断言接线', () => {
  it('netFails 随轮清零 + 逐应用断言行（#299 防线）在册', () => {
    const s = runner();
    expect(s).toContain('netFails.length = 0; // v10.76 #299：同源网络失败随轮清零');
    expect(s).toContain('（#299 防线）`');
    expect(s).toContain('const netErrs = netFails.slice();');
  });

  it('page 崩溃重建兜底同步重挂网络层防线（初始挂载 + heal 重建两处）', () => {
    const s = runner();
    expect(s.match(/attachNetGuard\(page\)/g)?.length).toBeGreaterThanOrEqual(2);
  });
});

describe('v10.76 #299 dist 关键资源存在性清单（双保险）', () => {
  it('KEY_RESOURCES 八项在册，#298/#297 两事故文件为永久回归锚', () => {
    const s = runner();
    expect(s).toContain("'index.html',");
    expect(s).toContain("'ios-desktop/index.html',");
    expect(s).toContain("'launch.html',");
    expect(s).toContain("'manifest.webmanifest',");
    expect(s).toContain("'precache-manifest.json',");
    expect(s).toContain("'sw.js',");
    expect(s).toContain("'ios-desktop/catalog.json',"); // #298 实证缺件
    expect(s).toContain("'ios-desktop/js/aosp/alarm-ringtone.js',"); // #297 实证缺件
  });

  it('关键资源断言在册：逐项 HTTP 200 非空 + dist 无实物先行判定', () => {
    const s = runner();
    expect(s).toContain('关键资源 ${KEY_RESOURCES.length} 项全部 200 非空（#299 双保险）');
    expect(s).toContain('dist 无实物');
    expect(s).toContain('if (!res.ok) { keyResOk = false; keyResBad.push(`${kr} → HTTP ${res.status}`); }');
    expect(s).toContain('else if (!buf || buf.byteLength === 0) { keyResOk = false; keyResBad.push(`${kr} → 空体`); }');
  });

  it('header 文档在册（③ 网络层防线 + ④ 关键资源清单）', () => {
    const s = runner();
    expect(s).toContain('③ 网络层防线（v10.76 #299）');
    expect(s).toContain('④（#299）dist 关键资源存在性清单');
  });
});

describe('v10.76 #299 既有防线不被稀释（负向保护）', () => {
  it('#260 console 资源错误防线 / pageerror 监听 / precache 自校验全部原样在册', () => {
    const s = runner();
    expect(s).toContain("page.on('pageerror', (e) => errors.push(`[pageerror] ${String(e)}`))");
    expect(s).toContain('const attachConsoleGuard = (pg) => {');
    expect(s).toContain('precache-manifest.json 逐 URL HTTP 自校验（非 200 / 空体即 fail）');
    expect(s).toContain('if (!/Failed to load resource/.test(t)) return;');
  });

  it('累计口径行已并入同源网络失败（结果行升级锚）', () => {
    const s = runner();
    expect(s).toContain('pageerror + 同源资源错误 + 同源网络失败累计 ${frameErrTotal}');
  });
});
