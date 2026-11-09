// ==================== v240 测试 — 净化基建采用率收敛（v10.98 #240 R122 窗） ====================
//
// #240：_shared/sanitize.js 已建却无人用（审计采用率 3/43）——weather 搜索框
// 用户输入与外部地理编码 API 字段裸插 innerHTML（同源 iframe 无 sandbox，
// XSS 即打穿壳层 __system）；同一职责 charmap 转义在应用层重复实现成灾。
//
// 本窗收敛面（apps/ 全量零本地 charmap）：
//   weather 三插值点接 __mdEscape（用户 query / 外部 r.name / r.admin / r.source）
//   archive/calendar/contacts/messages/pdf/reaction/typing/translate/music 本地
//   charmap 全退役（music escapeHTML 方法薄委托，调位点零扰动）
//   markdown 兜底分支改 textContent 通道（天然免转义，v165 C2 同步重锚）
//   app-template.html / app-template-multi 默认引入 sanitize.js（#240 建议②）
//
// 壳层 js/ 剩余 esc 实现属主文档车道（需先为主壳引入 sanitize.js），#240
// 交付帖内显式留点，不在本文件断言面内。—— v10.98 已收编：见
// tests/v240-shell-convergence.test.js（壳层 14 文件 + clock-app + 壳 head 引入行）。
//
// 断言面：
//  A. __mdEscape 行为锚（happy-dom 真跑 sanitize.js：五字符逐项 / null 归空 /
//     数字归一 / __mdSanitize 双门共存回归）
//  B. weather 三插值点修复锚（裸插值负向 + 转义调用正向 + 引入行）
//  C. apps/ 全量收敛锚（charmap 签名负向 + 消费正向 + 引入行）
//  D. 模板默认引入锚
//  E. markdown 兜底 textContent 重锚（承接 v165 C2）

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf-8');

const SAN_SRC = read('ios-desktop/apps/_shared/sanitize.js');
const WEATHER = read('ios-desktop/apps/weather/index.html');
const MARKDOWN = read('ios-desktop/apps/markdown/index.html');

// #240 收敛清单（charmap 退役面全量）
const RETIRED_APPS = [
  'archive', 'calendar', 'contacts', 'markdown', 'messages',
  'music', 'pdf', 'reaction', 'translate', 'typing', 'weather',
];
// 其中实际消费 __mdEscape 的子集（markdown 兜底已改 textContent，仅消费 __mdSanitize）
const MD_ESCAPE_CONSUMERS = RETIRED_APPS.filter((a) => a !== 'markdown');

// ---------- A. __mdEscape 行为锚（happy-dom 真跑 sanitize.js） ----------
describe('v240 A：__mdEscape 行为锚', () => {
  // 与 v165 同范式：IIFE 挂 window，双导出一并就位
  new Function('window', SAN_SRC)(window);

  it('A1 五字符逐项转义（& < > " \'）', () => {
    expect(window.__mdEscape('&')).toBe('&amp;');
    expect(window.__mdEscape('<')).toBe('&lt;');
    expect(window.__mdEscape('>')).toBe('&gt;');
    expect(window.__mdEscape('"')).toBe('&quot;');
    expect(window.__mdEscape("'")).toBe('&#39;');
    expect(window.__mdEscape('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('A2 连续恶意载荷无活标签残留（weather 搜索框同型输入）', () => {
    const out = window.__mdEscape('"><script>alert(1)</script>');
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
    expect(out).not.toContain('"');
    expect(out).toBe('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('A3 null/undefined 归空串，数字/布尔经 String 归一（薄委托零扰动前提）', () => {
    expect(window.__mdEscape(null)).toBe('');
    expect(window.__mdEscape(undefined)).toBe('');
    expect(window.__mdEscape(0)).toBe('0');
    expect(window.__mdEscape(12345)).toBe('12345');
    expect(window.__mdEscape(true)).toBe('true');
    expect(window.__mdEscape('')).toBe('');
  });

  it('A4 双门共存回归：__mdSanitize 白名单闸行为不回退', () => {
    expect(typeof window.__mdSanitize).toBe('function');
    const s = window.__mdSanitize('<p onclick="x()">段</p><script>alert(1)</script>');
    expect(s).not.toContain('onclick');
    expect(s).not.toContain('script');
    expect(s).toContain('段');
  });
});

// ---------- B. weather 三插值点修复锚 ----------
describe('v240 B：weather 插值面净化', () => {
  it('B1 负向锚：用户 query 裸插值清零（回归即红）', () => {
    expect(WEATHER).not.toContain('未找到 "${query}"');
  });

  it('B2 正向锚：搜索下拉点全部过 __mdEscape（query/name/admin/source）', () => {
    expect(WEATHER).toContain('${window.__mdEscape(query)}');
    expect(WEATHER).toContain('${window.__mdEscape(r.name)}');
    expect(WEATHER).toContain('${window.__mdEscape(r.admin)}');
    expect(WEATHER).toContain('${window.__mdEscape(r.source)}');
  });

  it('B3 sanitize.js 引入行在位（先于应用内联脚本加载）', () => {
    expect(WEATHER).toContain('<script src="../_shared/sanitize.js"></script>');
  });
});

// ---------- C. apps/ 全量收敛锚 ----------
describe('v240 C：apps/ 本地 charmap 全退役', () => {
  const sources = Object.fromEntries(
    RETIRED_APPS.map((a) => [a, read(`ios-desktop/apps/${a}/index.html`)]),
  );

  it('C1 负向锚：charmap 两种实现签名清零（映射字面量与 replace 链）', () => {
    for (const [name, src] of Object.entries(sources)) {
      expect(src.includes("'&amp;'"), `${name} 不再持有映射字面量`).toBe(false);
      expect(src.includes("replace(/&"), `${name} 不再持有 replace 链签名一`).toBe(false);
      expect(src.includes("replace(/[&<"), `${name} 不再持有 replace 链签名二`).toBe(false);
    }
  });

  it('C2 正向锚：有转义需求的应用全量消费 window.__mdEscape', () => {
    for (const name of MD_ESCAPE_CONSUMERS) {
      expect(sources[name].includes('window.__mdEscape'), `${name} 已接入共享源`).toBe(true);
    }
    // markdown 特例：仅消费 __mdSanitize 重闸，轻闸需求已被 textContent 通道消除
    expect(sources.markdown.includes('window.__mdSanitize')).toBe(true);
  });

  it('C3 引入行锚：全清单应用加载 ../_shared/sanitize.js', () => {
    for (const [name, src] of Object.entries(sources)) {
      expect(src.includes('<script src="../_shared/sanitize.js"'), `${name} 引入行`).toBe(true);
    }
  });

  it('C4 单一真源结构锚：__mdEscape 与 __mdSanitize 双导出同文件', () => {
    expect(SAN_SRC).toContain('window.__mdEscape = escapeHtml');
    expect(SAN_SRC).toContain('window.__mdSanitize = sanitizeHtml');
    expect(existsSync(join(ROOT, 'ios-desktop/apps/_shared/sanitize.js'))).toBe(true);
  });

  it('C5 采用率锚：sanitize.js 引用面不再低于审计基线（11 应用在册）', () => {
    let consumers = 0;
    for (const a of RETIRED_APPS) {
      if (read(`ios-desktop/apps/${a}/index.html`).includes('_shared/sanitize.js')) consumers += 1;
    }
    expect(consumers).toBeGreaterThanOrEqual(11); // #240 审计口径 3 → 本窗 11，只增不减
  });
});

// ---------- D. 模板默认引入锚 ----------
describe('v240 D：脚手架模板默认引入', () => {
  it('D1 app-template.html 与 app-template-multi 均含 sanitize.js 引入（#240 建议②）', () => {
    expect(read('scripts/app-template.html')).toContain('<script src="../_shared/sanitize.js"></script>');
    expect(read('scripts/app-template-multi/index.html')).toContain('<script src="../_shared/sanitize.js"></script>');
  });
});

// ---------- E. markdown 兜底 textContent 重锚（承接 v165 C2） ----------
describe('v240 E：markdown 兜底通道升级', () => {
  it('E1 库缺失兜底走 textContent（天然免转义），零本地 charmap', () => {
    expect(MARKDOWN).toContain('preview.textContent = text;');
    expect(MARKDOWN).not.toContain('esc(text)');
    expect(MARKDOWN.includes("'&amp;'")).toBe(false);
  });
});
