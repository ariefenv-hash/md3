// ==================== v838-fx-convert.test.js — #27 汇率换算页签守护 ====================
//
// #27 执行要点逐条落锚：
//   三层：内置离线快照（30+ 货币+快照日期标注）→ 打开应用时静默刷新 → 失败回退快照
//   换算方向一键互换；常用货币置顶；搜索过滤；输入实时联动
//   禁止第三方 key 硬编码（nightsky 反例——负断言守护）
//   验收：断网可用（快照+日期水印）；vitest 锚：换算精度（小数位规则）、快照回退分支
//
// 测试口径：
//   ① 纯函数直驱——import ios-desktop/js/fx-core.js（顶层零副作用 node 安全）：
//      快照纪律 / perCNYtoPerForeign 倒数归一 / fxDecimals 小数位规则 / fxConvert 精度 /
//      fxFilter 搜索 / groupCurrencies 置顶分组
//   ② 源码锚定——页面 script 引入 + unitsData.currency 接线 + optgroup 渲染 + 搜索绑定 +
//      fallback 快照水印 + 打开即刷新 + 双源无 key

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = readFileSync(join(root, 'ios-desktop/apps/calculator/index.html'), 'utf8');
const fxCoreSrc = readFileSync(join(root, 'ios-desktop/js/fx-core.js'), 'utf8');

// ---------- 沙箱：经典脚本 IIFE 无 export——new Function 注入 stub window 提取 api ----------
// （v836 内联脚本求值同款模式；页面 <script src> 经典同步加载挂 window.__fxCore）
function loadFxCore() {
  const sandboxWindow = {};
  const fn = new Function('window', 'module', `${fxCoreSrc}\n;return window.__fxCore;`);
  return fn(sandboxWindow, undefined);
}

const {
  FX_SNAPSHOT_DATE, FX_SNAPSHOT_RATES, FX_NAMES, FX_POPULAR, FX_CODES,
  perCNYtoPerForeign, fxConvert, fxDecimals, fxFilter, groupCurrencies,
} = loadFxCore();

// ==================== ① 纯函数直驱 ====================

describe('#27 内置快照：库量与字段纪律（vitest 锚：快照回退分支数据源）', () => {
  it('快照 ≥ 30 种货币（议题「30+ 货币」验收）', () => {
    expect(FX_CODES.length).toBeGreaterThanOrEqual(30);
  });

  it('每币值正有限、CNY=1 基准、无重复 code；names/popular 与快照对齐', () => {
    const keys = Object.keys(FX_SNAPSHOT_RATES);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) {
      const v = FX_SNAPSHOT_RATES[k];
      expect(typeof v, k).toBe('number');
      expect(isFinite(v) && v > 0, `${k}=${v}`).toBe(true);
      expect(typeof FX_NAMES[k], `${k} 中文名`).toBe('string');
      expect(FX_NAMES[k].length, k).toBeGreaterThan(0);
    }
    expect(FX_SNAPSHOT_RATES.CNY).toBe(1);
    expect(Object.keys(FX_NAMES).sort()).toEqual(keys.slice().sort());
    for (const p of FX_POPULAR) expect(keys.includes(p), `${p} 在快照内`).toBe(true);
  });

  it('快照基准日 YYYY-MM-DD 格式（离线水印数据源）', () => {
    expect(FX_SNAPSHOT_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(isFinite(Date.parse(FX_SNAPSHOT_DATE))).toBe(true);
  });
});

describe('#27 倒数归一（ER-API per-CNY → 页面 per-foreign，vitest 锚：换算精度）', () => {
  it('1/v 归一 + 非正/非法值过滤 + CNY 恒 1', () => {
    const out = perCNYtoPerForeign({ CNY: 1, USD: 0.14, JPY: 21.28, BAD: 0, NEG: -5, STR: 'abc' });
    expect(out.CNY).toBe(1);
    expect(out.USD).toBeCloseTo(1 / 0.14, 12);
    expect(out.JPY).toBeCloseTo(1 / 21.28, 12);
    expect('BAD' in out).toBe(false);
    expect('NEG' in out).toBe(false);
    expect('STR' in out).toBe(false);
  });

  it('null/非对象输入 → 空对象（不抛错）', () => {
    expect(perCNYtoPerForeign(null)).toEqual({});
    expect(perCNYtoPerForeign(undefined)).toEqual({});
    expect(perCNYtoPerForeign('garbage')).toEqual({});
  });

  it('双倒数往返恒等（精度无损：fxApply 重复归一不漂移）', () => {
    const snap = { CNY: 1, USD: 7.14, KRW: 0.0052 };
    const round = perCNYtoPerForeign(perCNYtoPerForeign(snap));
    for (const k of Object.keys(snap)) expect(round[k]).toBeCloseTo(snap[k], 12);
  });
});

describe('#27 小数位规则（vitest 锚：换算精度——谷歌换算卡手感）', () => {
  it('绝对值 ≥1000 → 2 位；<1000 → 4 位（边界逐点）', () => {
    expect(fxDecimals(1000)).toBe(2);
    expect(fxDecimals(999.9999)).toBe(4);
    expect(fxDecimals(1000.0001)).toBe(2);
    expect(fxDecimals(0.5)).toBe(4);
    expect(fxDecimals(-1500.25)).toBe(2);   // 负数按绝对值判
    expect(fxDecimals(0)).toBe(4);
  });

  it('fxConvert 经 CNY 中转对称可逆（1 CNY→USD→CNY 恢复原值）', () => {
    const usd = FX_SNAPSHOT_RATES.USD;
    const out = fxConvert(100, 1, usd);          // 100 CNY → USD（r1=CNY 率, r2=USD 率）
    expect(out).toBeCloseTo(100 / usd, 10);
    const back = fxConvert(out, usd, 1);          // USD → CNY
    expect(back).toBeCloseTo(100, 10);
  });

  it('fxConvert 除零/非法率 → 0（不产生 NaN 渲染）', () => {
    expect(fxConvert(5, 1, 0)).toBe(0);
    expect(fxConvert(5, NaN, 2)).toBe(0);
    expect(fxConvert(5, 1, Infinity)).toBe(0);
  });
});

describe('#27 搜索过滤与常用置顶', () => {
  const codes = ['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'HKD', 'KRW'];

  it('空 query → 全量保序', () => {
    expect(fxFilter(codes, FX_NAMES, '')).toEqual(codes);
    expect(fxFilter(codes, FX_NAMES, '   ')).toEqual(codes);
  });

  it('code 子串匹配不区分大小写（US/us 同果）', () => {
    expect(fxFilter(codes, FX_NAMES, 'us')).toEqual(['USD']);
    expect(fxFilter(codes, FX_NAMES, 'US')).toEqual(['USD']);
    expect(fxFilter(codes, FX_NAMES, 'kr')).toEqual(['KRW']);
  });

  it('中文名包含匹配（「日」→ JPY；「元」→ 美元/欧元/日元/韩元保序）', () => {
    expect(fxFilter(codes, FX_NAMES, '日')).toEqual(['JPY']);
    // 港币（HKD）不含「元」——中文名精确匹配语义
    expect(fxFilter(codes, FX_NAMES, '元')).toEqual(['USD', 'EUR', 'JPY', 'KRW']);
    expect(fxFilter(codes, FX_NAMES, '港币')).toEqual(['HKD']);
  });

  it('无匹配 → 空数组；null query 防御', () => {
    expect(fxFilter(codes, FX_NAMES, '不存在的货币')).toEqual([]);
    expect(fxFilter(codes, FX_NAMES, null)).toEqual(codes);
  });

  it('groupCurrencies：popular 保序置顶、rest 保序、popular 忽略池外 code', () => {
    const g = groupCurrencies(codes, FX_POPULAR);
    expect(g.popular).toEqual(['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'HKD']);
    expect(g.rest).toEqual(['KRW']);
    expect(groupCurrencies(codes, ['CNY', 'XXX'])).toEqual({ popular: ['CNY'], rest: codes.slice(1) });
    expect(groupCurrencies(null, FX_POPULAR)).toEqual({ popular: [], rest: [] });
  });
});

// ==================== ② 源码锚定 ====================

describe('#27 页面接线与三层架构锚定', () => {
  it('fx-core.js 引入 + window.__fxCore 挂载（经典脚本 IIFE；apps/ 相对基准两级上行）', () => {
    expect(page).toContain('<script src="../../js/fx-core.js"></script>');
    expect(fxCoreSrc).toContain('window.__fxCore = api');
    expect(fxCoreSrc).not.toMatch(/^\s*export\s/m); // 经典脚本零 export（module defer 时序崩链反例）
  });

  it('unitsData.currency 接快照 + 基准日 _ts + 离线水印字段', () => {
    expect(page).toContain('units: Object.assign({}, window.__fxCore.FX_SNAPSHOT_RATES)');
    expect(page).toContain('names: Object.assign({}, window.__fxCore.FX_NAMES)');
    expect(page).toContain('_ts: Date.parse(window.__fxCore.FX_SNAPSHOT_DATE)');
    expect(page).toContain("_src: '内置快照'");
  });

  it('optgroup 常用置顶渲染 + 默认 CNY→USD', () => {
    expect(page).toMatch(/optgroup label="常用"/);
    expect(page).toMatch(/optgroup label="全部货币"/);
    expect(page).toContain("groupCurrencies(codes, window.__fxCore.FX_POPULAR)");
    expect(page).toContain("$('conv-unit-1').value = 'CNY'; $('conv-unit-2').value = 'USD';");
  });

  it('搜索过滤绑定（两个 select 同步 + optgroup 收起）', () => {
    expect(page).toContain("$('fx-search').oninput");
    expect(page).toContain('window.__fxCore.fxFilter(Object.keys(unitsData.currency.units)');
    expect(page).toContain("o.hidden = !!q && !match.has(o.value)");
  });

  it('失败回退快照 + 基准日水印（三层第③层）', () => {
    expect(page).toMatch(/const fallbackSnapshot = \(\) => \{/);
    expect(page).toContain("fxSetStatus('离线估算汇率 · 内置快照 ' + window.__fxCore.FX_SNAPSHOT_DATE, true)");
  });

  it('打开应用即静默刷新（不等切分类）', () => {
    expect(page).toMatch(/initConverterUI\(\);\s*\n\s*\/\/ #27 v8\.38：打开应用即静默刷新[\s\S]{0,80}?fxEnsureRates\(\);/);
  });

  it('小数位规则走 __fxCore.fxDecimals（精度规则单一真源）', () => {
    expect(page).toContain('window.__fxCore.fxConvert(val, cur[u1], cur[u2])');
    expect(page).toContain('out.toFixed(window.__fxCore.fxDecimals(out))');
  });

  it('负断言：页面与 fx-core 零第三方 key（nightsky 反例守护）', () => {
    const keyPattern = /(apiKey|api_key|apikey|app_id|appid|Authorization|access_key|token\s*[:=])\s*[:=]/i;
    expect(keyPattern.test(page)).toBe(false);
    expect(keyPattern.test(fxCoreSrc)).toBe(false);
    // 免费源声明在案（无 key 方案）
    expect(page).toContain('open.er-api.com');
    expect(page).toContain('api.frankfurter.app');
  });
});
