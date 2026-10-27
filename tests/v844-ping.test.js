// ==================== v844-ping.test.js — v8.44 #60 PING 网络诊断（#12 P1·fetch 计时） ====================
//
// 验收映射（议题 #60 原文）：
//   · fetch HEAD no-cors 计时（+cache-bust）·明示「HTTP TTFB 模拟」口径 → buildPingUrl + 页面接线锚
//   · 统计 min/avg/max/jitter/丢包率 + 迷你时序图 60 点 → computeStats（vitest 锚）+ MAX_SAMPLES 60
//   · 目标历史 localStorage 最近 8 个 + 正在 ping 可停 → normalize/appendHistory + 状态机三清理
//   · 连续 20 次 ping 无内存增长（计时器全回收）→ 封顶 shift + LOG_MAX + AbortController 生命周期
//   · UI 明示限制（不可达/超时/CORS 拒绝两态口径）→ OUTCOME 三态 + note 常驻说明
//
// 模式沿袭 v838~v843 六代：经典脚本 IIFE 挂 window.__pingCore，new Function 沙箱直驱；
// 顶层零副作用（不碰 document/localStorage），node 直接 import 安全。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/js/ping-core.js'), 'utf8');
const PAGE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/ping/index.html'), 'utf8');

// ---------- 沙箱提取（经典脚本 IIFE → window.__pingCore） ----------
const ctx = { window: {} };
new Function('window', CORE_SRC)(ctx.window);
const core = ctx.window.__pingCore;

describe('v8.44 #60 core：常量与结果三态', () => {
  it('存储键与常量：ping_history_v1 / 最近 8 个 / 时序图 60 点 / 1s 间隔 / 5s 超时', () => {
    expect(core.HISTORY_KEY).toBe('ping_history_v1');
    expect(core.MAX_HISTORY).toBe(8);
    expect(core.MAX_SAMPLES).toBe(60);
    expect(core.PING_INTERVAL_MS).toBe(1000);
    expect(core.TIMEOUT_MS).toBe(5000);
  });

  it('OUTCOME 三态：ok / timeout / unreachable（不可达含 CORS 拒绝口径）', () => {
    expect(core.OUTCOME).toEqual({ OK: 'ok', TIMEOUT: 'timeout', UNREACHABLE: 'unreachable' });
  });
});

describe('v8.44 #60 core：normalizeTarget 输入校验', () => {
  it('无协议补 https://；URL 合法形态保留 path/query、剥离 hash', () => {
    expect(core.normalizeTarget('example.com')).toEqual({ url: 'https://example.com/', host: 'example.com' });
    expect(core.normalizeTarget('  example.com  ')).toEqual({ url: 'https://example.com/', host: 'example.com' });
    expect(core.normalizeTarget('http://example.com/a?b=1#frag')).toEqual({ url: 'http://example.com/a?b=1', host: 'example.com' });
    expect(core.normalizeTarget('https://api.example.com:8443/x')).toEqual({ url: 'https://api.example.com:8443/x', host: 'api.example.com' });
  });

  it('非法输入全拒：空/空白/非字符串/ftp 协议/无主机/URL 构造失败 → null', () => {
    expect(core.normalizeTarget('')).toBeNull();
    expect(core.normalizeTarget('   ')).toBeNull();
    expect(core.normalizeTarget(null)).toBeNull();
    expect(core.normalizeTarget(undefined)).toBeNull();
    expect(core.normalizeTarget(123)).toBeNull();
    expect(core.normalizeTarget('ftp://example.com')).toBeNull();
    expect(core.normalizeTarget('javascript:alert(1)')).toBeNull();
    expect(core.normalizeTarget('https://')).toBeNull();
    expect(core.normalizeTarget('ht!tp://x')).toBeNull();
  });
});

describe('v8.44 #60 core：buildPingUrl cache-bust', () => {
  it('保留原 query，追加 _ping=now-seq；seq 参数化；now 参数化（测试确定性）', () => {
    expect(core.buildPingUrl('https://a.com/', 3, 1000)).toBe('https://a.com/?_ping=1000-3');
    expect(core.buildPingUrl('https://a.com/p?x=1', 4, 2000)).toBe('https://a.com/p?x=1&_ping=2000-4');
    expect(core.buildPingUrl('https://a.com/?_ping=old', 5, 3000)).toBe('https://a.com/?_ping=3000-5'); // 覆写旧值
    expect(core.buildPingUrl('https://a.com/', 0, 500)).toBe('https://a.com/?_ping=500-0');
  });

  it('URL 构造失败原样返回（防御）', () => {
    expect(core.buildPingUrl('not a url', 1, 100)).toBe('not a url');
  });
});

describe('v8.44 #60 core：computeStats 统计纯函数（#60 验收 vitest 锚）', () => {
  it('空/纯非法 → 全 0 防御', () => {
    for (const empty of [[], null, undefined, 'x', {}]) {
      const st = core.computeStats(empty);
      expect(st).toEqual({ sent: 0, ok: 0, lost: 0, lossRate: 0, min: 0, avg: 0, max: 0, jitter: 0, lastMs: 0 });
    }
  });

  it('ok 合法但 ms 缺失/非法 → 计入 sent+lost（发过但未采到样本）', () => {
    const st = core.computeStats([{ ok: true }]);
    expect(st.sent).toBe(1);
    expect(st.lost).toBe(1);
    expect(st.min).toBe(0);
  });

  it('纯成功序列：min/avg/max/lastMs 精确；jitter=相邻差绝对值平均（RFC 3550 简化）', () => {
    const st = core.computeStats([
      { ok: true, ms: 10 }, { ok: true, ms: 20 }, { ok: true, ms: 30 },
    ]);
    expect(st.sent).toBe(3);
    expect(st.ok).toBe(3);
    expect(st.lost).toBe(0);
    expect(st.lossRate).toBe(0);
    expect(st.min).toBe(10);
    expect(st.avg).toBe(20);
    expect(st.max).toBe(30);
    expect(st.lastMs).toBe(30);
    expect(st.jitter).toBe(10); // (|20-10|+|30-20|)/2
  });

  it('成功样本 <2 时 jitter=0（单样本无相邻差）', () => {
    const st = core.computeStats([{ ok: true, ms: 42 }]);
    expect(st.jitter).toBe(0);
    expect(st.lastMs).toBe(42);
  });

  it('丢包率：2 成功 1 失败 → 1/3；min/avg/max 只统计成功样本', () => {
    const st = core.computeStats([
      { ok: true, ms: 100 }, { ok: false, ms: 0, reason: 'timeout' }, { ok: true, ms: 40 },
    ]);
    expect(st.sent).toBe(3);
    expect(st.ok).toBe(2);
    expect(st.lost).toBe(1);
    expect(Math.abs(st.lossRate - 1 / 3) < 1e-12).toBe(true);
    expect(st.min).toBe(40);
    expect(st.max).toBe(100);
    expect(st.avg).toBe(70);
    expect(st.lastMs).toBe(40);
  });

  it('非法样本（非对象/ok 非布尔）跳过不计 sent；负数/非有限 ms 不入成功集合', () => {
    const st = core.computeStats([
      null,
      { ok: true, ms: 10 },
      { ok: 'yes', ms: 99 },           // ok 非布尔 → 整条跳过
      { ok: true, ms: NaN },           // ms 非法 → 不入成功集合但仍计 sent+lost
      { ok: true, ms: -5 },            // 负 ms 同上
    ]);
    expect(st.sent).toBe(3);           // null 与 ok:'yes' 整条跳过；10/NaN/-5 三条计 sent
    expect(st.ok).toBe(1);
    expect(st.lost).toBe(2);           // sent 3 - ok 1
    expect(st.min).toBe(10);
  });
});

describe('v8.44 #60 core：roundMs 展示格式化', () => {
  it('<1 → "<1"；四舍五入；非法 → "?"', () => {
    expect(core.roundMs(0.4)).toBe('<1');
    expect(core.roundMs(0)).toBe('<1');
    expect(core.roundMs(10.4)).toBe('10');
    expect(core.roundMs(10.5)).toBe('11');
    expect(core.roundMs(-1)).toBe('?');
    expect(core.roundMs(NaN)).toBe('?');
    expect(core.roundMs(Infinity)).toBe('?');
    expect(core.roundMs('x')).toBe('?');
  });
});

describe('v8.44 #60 core：normalizeHistory 损坏降级', () => {
  it('非数组 / null → []；非法元素跳过；ts 修正；cap 截尾（默认 8）', () => {
    expect(core.normalizeHistory(null)).toEqual([]);
    expect(core.normalizeHistory('x')).toEqual([]);
    expect(core.normalizeHistory([null, 3, { url: '', ts: 1 }, { url: 'https://a.com/', ts: 5 }]))
      .toEqual([{ url: 'https://a.com/', ts: 5 }]);
    const nine = [];
    for (let i = 0; i < 9; i++) nine.push({ url: 'https://' + i + '.com/', ts: i });
    const out = core.normalizeHistory(nine);
    expect(out).toHaveLength(8);
    expect(out[0].url).toBe('https://0.com/');
    expect(core.normalizeHistory(nine, 3)).toHaveLength(3);
  });
});

describe('v8.44 #60 core：appendHistory 同码全位置清理头插（python-core 同款语义）', () => {
  it('新目标头插；不 mutate 入参', () => {
    const list = [{ url: 'https://a.com/', ts: 1 }];
    const out = core.appendHistory(list, 'https://b.com/', 2);
    expect(out[0].url).toBe('https://b.com/');
    expect(out[1].url).toBe('https://a.com/');
    expect(list).toHaveLength(1); // 原数组不动
  });

  it('同码无论位置全清理后头插（v8.43 首跑真缺口根治同款）', () => {
    const list = [
      { url: 'https://a.com/', ts: 1 },
      { url: 'https://b.com/', ts: 2 },
      { url: 'https://a.com/', ts: 3 }, // 尾部同码
    ];
    const out = core.appendHistory(list, 'https://a.com/', 9);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ url: 'https://a.com/', ts: 9 });
    expect(out[1].url).toBe('https://b.com/');
  });

  it('cap 截尾：超出 MAX_HISTORY 挤出末位', () => {
    const list = [];
    for (let i = 0; i < 8; i++) list.push({ url: 'https://' + i + '.com/', ts: i });
    const out = core.appendHistory(list, 'https://new.com/', 99);
    expect(out).toHaveLength(8);
    expect(out[0].url).toBe('https://new.com/');
    expect(out[7].url).toBe('https://6.com/'); // 0.com 被挤出
  });
});

describe('v8.44 #60 core：IIFE 纯度（顶层零副作用）', () => {
  it('行首无 export（经典 <script> 直驱；ESM export 会整文件 SyntaxError）', () => {
    const lines = CORE_SRC.split('\n').filter((l) => /^\s*export\s/.test(l));
    expect(lines).toEqual([]);
  });

  it('调用级负断言：全部导出函数不触 document/localStorage/window 写', () => {
    let touched = null;
    const guard = (name) => ({
      get() { touched = name; return undefined; },
      set(v) { touched = name + '=' + JSON.stringify(v); },
    });
    const w = {};
    Object.defineProperty(w, 'document', guard('document'));
    const ls = {};
    Object.defineProperty(w, 'localStorage', guard('localStorage'));
    new Function('window', CORE_SRC)(w); // 执行期只允许挂 __pingCore
    const c = w.__pingCore;
    // 调用所有纯函数（含边界输入），期间访问 document/localStorage 即失败
    c.normalizeTarget('example.com'); c.normalizeTarget('');
    c.buildPingUrl('https://a.com/', 1, 1); c.buildPingUrl('bad', 1, 1);
    c.computeStats([{ ok: true, ms: 1 }]); c.computeStats(null);
    c.roundMs(1.4); c.roundMs(NaN);
    c.normalizeHistory([{ url: 'https://a.com/', ts: 1 }]); c.normalizeHistory(null);
    c.appendHistory([], 'https://a.com/', 1); c.appendHistory(null, 'x', 1);
    expect(touched).toBeNull();
  });
});

// ---------- 页面源码锚（接线语义，运行时验证交给 e2e） ----------
describe('v8.44 #60 页面源码锚：TTFB 计时与状态机', () => {
  it('md3-tokens 共享层挂载 + ping-core 引入 + 缺载守卫绝不白屏', () => {
    expect(PAGE_SRC.indexOf('../_shared/md3-tokens.css')).toBeGreaterThan(-1);
    expect(PAGE_SRC).toContain('../../js/ping-core.js');
    expect(PAGE_SRC).toMatch(/if\s*\(!core\)\s*return/);
  });

  it('fetch HEAD no-cors + cache no-store + AbortController signal（#60 方案原文锚）', () => {
    expect(PAGE_SRC).toContain("method: 'HEAD'");
    expect(PAGE_SRC).toContain("mode: 'no-cors'");
    expect(PAGE_SRC).toContain("cache: 'no-store'");
    expect(PAGE_SRC).toContain('new AbortController()');
    expect(PAGE_SRC).toContain('signal: controller.signal');
  });

  it('5s 超时 → abort + timedOut 标志；超时/停止/不可达三路判定分离', () => {
    expect(PAGE_SRC).toContain('timedOut = true');
    expect(PAGE_SRC).toMatch(/if\s*\(timedOut\)\s*resolve\(\{\s*ok:\s*false/);
    expect(PAGE_SRC).toMatch(/else if\s*\(!running\)\s*resolve\(null\)/); // 用户停止静默丢弃
    expect(PAGE_SRC).toContain('core.OUTCOME.UNREACHABLE');
    expect(PAGE_SRC).toContain('core.OUTCOME.TIMEOUT');
  });

  it('停止立即生效三清理：loopTimer + curTimeoutTimer + curController.abort（#60 验收锚）', () => {
    expect(PAGE_SRC).toMatch(/if\s*\(loopTimer\)\s*\{\s*clearTimeout\(loopTimer\)/);
    expect(PAGE_SRC).toMatch(/if\s*\(curTimeoutTimer\)\s*\{\s*clearTimeout\(curTimeoutTimer\)/);
    expect(PAGE_SRC).toMatch(/curController\.abort\(\)/);
  });

  it('防重入：start 仅 IDLE 放行；进行中点击转停止', () => {
    expect(PAGE_SRC).toMatch(/function start\(\)\s*\{\s*\n?\s*if\s*\(running\)\s*return/);
    expect(PAGE_SRC).toMatch(/running \? stop\(\) : start\(\)/);
  });

  it('内存全回收防线：samples 封顶 60 shift + 日志 LOG_MAX 封顶摘头', () => {
    expect(PAGE_SRC).toMatch(/if\s*\(samples\.length\s*>\s*core\.MAX_SAMPLES\)\s*samples\.shift\(\)/);
    expect(PAGE_SRC).toMatch(/while\s*\(outEl\.children\.length\s*>\s*LOG_MAX\)\s*outEl\.removeChild\(outEl\.firstChild\)/);
  });

  it('中途关闭页面正确中止：beforeunload + pagehide 双挂 stopAll', () => {
    expect(PAGE_SRC).toContain("window.addEventListener('beforeunload', stopAll)");
    expect(PAGE_SRC).toContain("window.addEventListener('pagehide', stopAll)");
  });

  it('深链 BUS_DELIVER ping/run {target}（打开即测）', () => {
    expect(PAGE_SRC).toContain("d.event !== 'ping/run'");
    expect(PAGE_SRC).toContain('(d.payload || {}).target');
  });

  it('在线目标不可信面：动态输出全 textContent，全页零 innerHTML', () => {
    expect(PAGE_SRC).not.toMatch(/\.innerHTML\s*=/);
    expect(PAGE_SRC).toMatch(/row\.textContent = text/);
    expect(PAGE_SRC).toMatch(/toastEl\.textContent = msg/);
    expect(PAGE_SRC).toMatch(/b\.textContent = norm \? norm\.host : e\.url/);
  });

  it('TTFB 口径明示（#60 原文「HTTP TTFB 模拟」非真 RTT）', () => {
    expect(PAGE_SRC).toContain('HTTP TTFB 模拟');
    expect(PAGE_SRC).toContain('浏览器无 ICMP');
    expect(PAGE_SRC).toContain('非真 ICMP RTT');
  });

  it('目标历史 chips：最近 8 个 + 点击回填 + 进行中拒绝换目标', () => {
    expect(PAGE_SRC).toMatch(/core\.appendHistory\(hist, t\.url, Date\.now\(\), core\.MAX_HISTORY\)/);
    expect(PAGE_SRC).toMatch(/targetEl\.value = e\.url/);
    expect(PAGE_SRC).toMatch(/if\s*\(running\)\s*\{\s*toast\('探测进行中/);
  });

  it('打开应用绝不自动发请求：init 仅读历史/渲染（懒探测）', () => {
    const initBlock = PAGE_SRC.slice(PAGE_SRC.indexOf('function init()'), PAGE_SRC.indexOf('goEl.addEventListener'));
    expect(initBlock).not.toContain('fetch(');
    expect(initBlock).not.toContain('start()');
  });
});

// ---------- 注册链四件套 + 联动锚 ----------
describe('v8.44 #60 注册链四件套 + 联动锚', () => {
  it('apps-data.js：import ping + initialApps 末位（40 应用）', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/apps-data.js'), 'utf8');
    expect(src).toContain("import ping       from './apps/ping.js'; // v8.44 #60");
    expect(src).toMatch(/reaction, word, terminal, piano, bytebeat, python, ping, codeEditor, midiPlayer,\s*\n\];/);
  });

  it('apps/ping.js wrapper：id=ping · name=PING · iframeAppContent', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/apps/ping.js'), 'utf8');
    expect(src).toContain("id: 'ping'");
    expect(src).toContain("name: 'PING'");
    expect(src).toContain("iframeAppContent('apps/ping/index.html')");
  });

  it('app-icons.js 100×100 ping 图标 + icons.js 24px glyph（outline+filled 双映射）', () => {
    const big = readFileSync(join(ROOT, 'ios-desktop/js/app-icons.js'), 'utf8');
    expect(big).toMatch(/ping: `<svg viewBox="0 0 100 100"/);
    expect(big).toContain('雷达双弧');
    const glyph = readFileSync(join(ROOT, 'ios-desktop/js/icons.js'), 'utf8');
    expect(glyph).toMatch(/ping: `<svg viewBox="0 0 24 24" class="ic" fill="none"/);
    expect(glyph).toMatch(/ping: `<svg viewBox="0 0 24 24" class="ic" fill="currentColor"/);
  });

  it('storage-stats.js：ping_history_v1 归属登记', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/storage-stats.js'), 'utf8');
    expect(src).toContain("['ping_history_v1', 'ping']");
  });

  it('terminal-core.js：APPS 表入列 ping（41 应用）+ resolveTarget 别名（网络/网络诊断）', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/terminal-core.js'), 'utf8');
    expect(src).toContain("['ping', 'PING', 'ping', '网络诊断', '网络']");
    const c2 = { window: {} };
    new Function('window', src)(c2.window);
    const tc = c2.window.__terminalCore;
    expect(tc.APPS.length).toBe(41);
    expect(tc.resolveTarget('ping')).toEqual({ id: 'ping', name: 'PING' });
    expect(tc.resolveTarget('网络')).toEqual({ id: 'ping', name: 'PING' });
    expect(tc.resolveTarget('网络诊断')).toEqual({ id: 'ping', name: 'PING' });
  });

  it('icon fixture：ping 7 处动态色 · 全库总数 215（v8.43 208 + 7）', () => {
    const fixture = JSON.parse(readFileSync(join(ROOT, 'tests/icon-dynamic-colors.generated.json'), 'utf-8'));
    expect(fixture.icons.ping.dynamic).toBe(7);
    expect(fixture.icons.ping.colors).toHaveLength(7);
    const total = Object.values(fixture.icons).reduce((s, v) => s + (v.colors || []).length, 0);
    expect(total).toBe(225);
  });

  it('md3-tokens 共享层挂载（iframe 应用第 28 个）', () => {
    expect(PAGE_SRC.indexOf('../_shared/md3-tokens.css')).toBeGreaterThan(-1);
  });
});
