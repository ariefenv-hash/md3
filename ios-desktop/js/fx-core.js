// ==================== fx-core.js — 汇率换算纯函数核心（#27，v8.38） ====================
//
// calculator 汇率页签的逻辑宿主：内置离线快照（34 币，每 1 外币兑 CNY）+ 换算/小数位/
// 过滤/分组纯函数。
//
// ⚠ 模块形态：**经典脚本 IIFE（无 export）**——页面 <script src> 同步加载（module 的
// defer 时序会晚于主脚本，__fxCore undefined 崩链），挂 window.__fxCore 供页面消费；
// vitest 侧用 new Function 沙箱提取（v836 内联脚本同款模式）。
//
// 三层汇率架构（#27 执行要点）：
//   ① 内置离线快照（本文件，快照基准日水印）→ ② 打开应用静默刷新（页面 fxEnsureRates，
//   open.er-api.com 免 key）→ ③ 失败回退快照（页面 fallbackSnapshot）。
//   禁止第三方 key 硬编码（nightsky 反例）——本文件与页面零 key 零鉴权头。

(function () {
  'use strict';

  /** 内置快照基准日（离线水印：fx-status 显示「内置快照 YYYY-MM-DD」） */
  var FX_SNAPSHOT_DATE = '2026-10-27';

  /**
   * 内置离线快照：每 1 单位外币兑多少 CNY（CNY=1 基准）。
   * 2026-10 量级近似值——离线估算语义（联网刷新后即被真实汇率覆盖，误差由水印声明）。
   */
  var FX_SNAPSHOT_RATES = {
    CNY: 1, USD: 7.14, EUR: 7.85, JPY: 0.047, GBP: 9.25, KRW: 0.0052,
    HKD: 0.915, TWD: 0.225, SGD: 5.42, CHF: 8.85, CAD: 5.18, AUD: 4.68,
    NZD: 4.25, RUB: 0.078, INR: 0.081, THB: 0.196, MYR: 1.69, VND: 0.00028,
    PHP: 0.123, IDR: 0.00044, BRL: 1.32, MXN: 0.385, ZAR: 0.4, SEK: 0.68,
    NOK: 0.66, DKK: 1.05, PLN: 1.83, CZK: 0.31, HUF: 0.0195, TRY: 0.185,
    AED: 1.94, SAR: 1.9, ILS: 1.93, EGP: 0.147,
  };

  /** 货币中文名（与快照 key 一一对应，搜索过滤的数据源之一） */
  var FX_NAMES = {
    CNY: '人民币', USD: '美元', EUR: '欧元', JPY: '日元', GBP: '英镑',
    KRW: '韩元', HKD: '港币', TWD: '新台币', SGD: '新加坡元', CHF: '瑞士法郎',
    CAD: '加元', AUD: '澳元', NZD: '新西兰元', RUB: '卢布', INR: '印度卢比',
    THB: '泰铢', MYR: '林吉特', VND: '越南盾', PHP: '菲律宾比索', IDR: '印尼盾',
    BRL: '巴西雷亚尔', MXN: '墨西哥比索', ZAR: '南非兰特', SEK: '瑞典克朗',
    NOK: '挪威克朗', DKK: '丹麦克朗', PLN: '兹罗提', CZK: '捷克克朗',
    HUF: '福林', TRY: '土耳其里拉', AED: '阿联酋迪拉姆', SAR: '沙特里亚尔',
    ILS: '以色列谢克尔', EGP: '埃及镑',
  };

  /** 常用货币置顶组（optgroup「常用」，保序） */
  var FX_POPULAR = ['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'HKD'];

  /** 快照币种列表（快照 key 顺序，optgroup「全部」组与搜索的数据源） */
  var FX_CODES = Object.keys(FX_SNAPSHOT_RATES);

  /**
   * ER-API/frankfurter 响应（每 1 CNY 兑 X 外币）→ 页面 units 语义（每 1 外币兑 CNY）：
   * 取倒数归一，非正数/非法值过滤，CNY 恒为 1。fxApply 的核心数学（可测）。
   */
  function perCNYtoPerForeign(rates) {
    var out = {};
    if (!rates || typeof rates !== 'object') return out;
    Object.keys(rates).forEach(function (k) {
      var v = +rates[k];
      if (isFinite(v) && v > 0) out[k] = 1 / v;
    });
    out.CNY = 1;
    return out;
  }

  /** 换算：val 单位 u1（兑 CNY 率 r1）→ 单位 u2（率 r2），经 CNY 中转 val*r1/r2 */
  function fxConvert(val, r1, r2) {
    if (!isFinite(r1) || !isFinite(r2) || r2 === 0) return 0;
    return val * r1 / r2;
  }

  /** 小数位规则（谷歌换算卡手感）：结果绝对值 ≥1000 → 2 位，否则 4 位 */
  function fxDecimals(out) {
    return Math.abs(out) >= 1000 ? 2 : 4;
  }

  /**
   * 货币搜索过滤：code 子串（不区分大小写）或中文名包含。
   * 空 query 返回全量（保序）。返回匹配 code 数组。
   */
  function fxFilter(codes, names, query) {
    var list = Array.isArray(codes) ? codes : [];
    var q = String(query == null ? '' : query).trim().toLowerCase();
    if (!q) return list.slice();
    var raw = String(query).trim();
    return list.filter(function (c) {
      if (String(c).toLowerCase().indexOf(q) !== -1) return true;
      var n = names && names[c];
      return typeof n === 'string' && n.indexOf(raw) !== -1;
    });
  }

  /**
   * 常用置顶分组：popular 在前（按 popular 数组序），其余按 codes 原序（去重，
   * popular 中不存在的 code 忽略）。返回 { popular, rest }。
   */
  function groupCurrencies(codes, popular) {
    var pool = Array.isArray(codes) ? codes.slice() : [];
    var pop = (Array.isArray(popular) ? popular : []).filter(function (c) {
      return pool.indexOf(c) !== -1;
    });
    var rest = pool.filter(function (c) { return pop.indexOf(c) === -1; });
    return { popular: pop, rest: rest };
  }

  var api = {
    FX_SNAPSHOT_DATE: FX_SNAPSHOT_DATE,
    FX_SNAPSHOT_RATES: FX_SNAPSHOT_RATES,
    FX_NAMES: FX_NAMES,
    FX_POPULAR: FX_POPULAR,
    FX_CODES: FX_CODES,
    perCNYtoPerForeign: perCNYtoPerForeign,
    fxConvert: fxConvert,
    fxDecimals: fxDecimals,
    fxFilter: fxFilter,
    groupCurrencies: groupCurrencies,
  };

  // 页面挂载（经典脚本 window）；node 沙箱由 new Function 注入 stub window 提取
  if (typeof window !== 'undefined') window.__fxCore = api;
})();
