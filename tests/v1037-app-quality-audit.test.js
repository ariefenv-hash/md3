// ==================== v1037-app-quality-audit.test.js — #228/#227/#230 三合一制度改造 ====================
//
// 覆盖：
//   · #228 要求①：删 ADMITTED_APPS 白名单 → audit-app-quality.mjs 全量扫描（apps/ 落盘即受检，
//     「已检查 N」恒等于实际目录数；新建应用自动纳入，零硬编码清单）
//   · #228 要求②/#230 §三：检查项从「计数」升级为「语义」（760px 块内须有实质布局差异 /
//     SDK 剔除注释后判真实调用 / range 逐个命中统一组件）
//   · #230 §二：8 项评分卡 A–H 判定与分档（≥7 达标 / 4–6 偏薄 / ≤3 严重）
//   · #230 §四：分期策略（阶段 1 warn 不阻断 / 阶段 2 严重档 fail / 阶段 3 全 fail）
//   · #227 要求④ + #230 验收用例 4：D 滑块单源硬门禁（自定义 ::-webkit-slider-thumb → fail，
//     任何阶段不豁免）
//   · #228 要求⑤/#230 §三4：基线回退门禁（曾经达标项掉线 → 硬 fail，白名单门禁强度不变弱）
//   · #230 验收用例 1-4 全覆盖（假应用 / 计数 / 空 760 媒体查询 / 双套 thumb）
//   · #227 要求①②：_shared/idle-slider.css 组件单一真源 + 全库 15 个 range 应用接入 +
//     零本地滑块伪元素；#227 要求③：组件不含波形进度条（播放条归 #170 波浪形态，不混用）
//   · 模板双件达标（#228 要求③）：app-template-multi app.mjs 真实 --md-* 引用 +
//     app-template.html 补 760px 真分栏

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import {
  checkA, checkB, checkC, checkD, checkDGate, checkE, checkF, checkG, checkH,
  auditApp, auditTemplates, findRegressions, extract760Blocks, extractRangeClasses,
} from '../scripts/audit-app-quality.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VITE_CFG = readFileSync(join(ROOT, 'vite.config.js'), 'utf-8');
const COMPONENT_CSS = readFileSync(join(ROOT, 'ios-desktop/apps/_shared/idle-slider.css'), 'utf-8');
const COMPONENT_JS = readFileSync(join(ROOT, 'ios-desktop/apps/_shared/idle-slider.js'), 'utf-8');
const AUDIT_SRC = readFileSync(join(ROOT, 'scripts/audit-app-quality.mjs'), 'utf-8');

// ---------- 临时夹具工厂（#230 验收用例的可穷举最小应用） ----------
function fixture(id, html) {
  const dir = join(tmpdir(), `md3-audit-fx-${id}-${process.pid}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  return dir;
}
const FX = {
  good: fixture('good', `<!DOCTYPE html><html><head><style>
    .a { color: var(--md-primary, #6750a4); border: 1px solid var(--md-outline-variant, #ccc); background: var(--md-surface, #fff); }
    .b { color: var(--md-on-surface, #111); background: var(--md-surface-container, #eee); }
    .c { color: var(--md-primary); }
    .d { color: var(--md-on-primary, #fff); background: var(--md-primary-container, #eee); border-color: var(--md-outline, #ddd); }
    .e { color: var(--md-on-surface-variant, #444); background: var(--md-surface-container-high, #f5f5f5); }
    .f { color: var(--md-secondary, #222); background: var(--md-surface-container-highest, #fafafa); }
    .g { color: var(--md-tertiary, #333); }
    .h { color: var(--md-error, #b00); background: var(--md-surface-dim, #ddd); }
    .card { transition: transform .2s, opacity .2s; animation: fade .3s; }
    @keyframes fade { from { opacity: 0; } }
    .row { display: flex; }
    @media (min-width: 760px) { .row { grid-template-columns: 1fr 1fr; display: grid; } }
    input:disabled { opacity: .4; }
    </style></head><body>
    <input type="range" class="mdslider" aria-label="参数">
    <button role="button" tabindex="0">x</button>
    <script>window.__system.fs.write('x', 1); localStorage.setItem('k','v');</script>
    </body></html>`),
  zeroToken: fixture('zerotoken', `<html><body><p>plain</p></body></html>`),
  rogueSlider: fixture('rogue', `<html><head><style>
    .a { color: var(--md-primary); background: var(--md-surface); border-color: var(--md-outline); }
    .s::-webkit-slider-thumb { width: 15px; height: 15px; border-radius: 50%; }
    @media (min-width: 760px) { .row { grid-template-columns: 1fr 1fr; } }
    .r { display: flex; transition: opacity .2s, transform .2s; animation: f .2s; } @keyframes f { to { opacity: .5; } }
    </style></head><body><input type="range" class="s" aria-label="s"></body></html>`),
  empty760: fixture('empty760', `<html><head><style>
    .a { color: var(--md-primary); background: var(--md-surface); border-color: var(--md-outline); }
    .b { color: var(--md-on-surface); }
    @media (min-width: 760px) { .a { color: red; } }
    .r { transition: opacity .2s, transform .2s; animation: f .2s; } @keyframes f { to {} }
    .row { display: flex; }
    </style></head><body><div class="r" role="status" aria-live="polite"></div></body></html>`),
  commentSdk: fixture('commentsdk', `<html><head><style>
    .a { color: var(--md-primary); background: var(--md-surface); border-color: var(--md-outline); }
    .b { color: var(--md-on-surface); }
    .r { display: flex; transition: opacity .2s, transform .2s; animation: f .2s; } @keyframes f { to {} }
    </style></head><body>
    <!-- window.__system.notify(...) 文档示例，非真实调用 -->
    <div class="r" role="status" aria-live="polite"></div></body></html>`),
};
afterAll(() => { for (const d of Object.values(FX)) rmSync(d, { recursive: true, force: true }); });

const TESTS_TEXT = 'apps/music/ apps/terminal/'; // H 门槛夹具用

describe('#230 评分卡 · 8 项门槛语义判定', () => {
  it('A：令牌 ≥15 且密度 ≥4/100 行；两者缺一即不达标', () => {
    const many = Array(16).fill('var(--md-primary)').join(' ');
    expect(checkA(many).pass).toBe(true);
    expect(checkA(Array(14).fill('var(--md-primary)').join(' ')).pass).toBe(false); // 数量不足
    expect(checkA(Array(16).fill('var(--md-primary)').join(' ') + '\n'.repeat(500)).pass).toBe(false); // 密度不足（≥4/100 行）
  });
  it('B（#230 验收用例 3）：760px 块内必须有实质布局差异，改色不算', () => {
    expect(checkB('@media (min-width: 760px) { .row { grid-template-columns: 1fr 1fr; } }').pass).toBe(true);
    expect(checkB('@media (min-width: 760px) { .row { flex-direction: column; } }').pass).toBe(true);
    expect(checkB('@media (min-width: 760px) { .a { color: red; } }').pass).toBe(false); // 空媒体查询（仅换色）
    expect(checkB('.row { grid-template-columns: 1fr 1fr; }').pass).toBe(false); // 无 760 锚
    expect(extract760Blocks('@media (min-width: 760px) { .a { color: red; } }').length).toBe(1);
  });
  it('C：剔除注释后判真实调用（#230 语义化 —— 注释命中不算；window.__system 别名形态计入）', () => {
    expect(checkC('window.__system.notify({})').pass).toBe(true);
    expect(checkC('const sdk = window.__system || null; sdk.notify({})').pass).toBe(true);
    expect(checkC('<!-- window.__system.notify(...) 示例 -->').pass).toBe(false);
    expect(checkC('// __system.fs.write 文档').pass).toBe(false);
  });
  it('D 硬门禁（#230 验收用例 4）：range 未挂 mdslider 或存在自定义 thumb/track 伪元素即 fail；无 range 天然通过', () => {
    expect(checkDGate('<input type="range" class="mdslider x">').pass).toBe(true);
    expect(checkDGate('<input type="range" class="rd-vol">').pass).toBe(false);
    expect(checkDGate('<input type="range">').pass).toBe(false);
    expect(checkDGate('<input type="range" class="mdslider"> <style>.s::-webkit-slider-thumb{width:9px}</style>').pass).toBe(false);
    expect(checkDGate('<style>.s::-moz-range-track{height:4px}</style>').pass).toBe(false);
    expect(checkDGate('<p>no slider</p>').pass).toBe(true); // 无 range 应用天然通过
    expect(checkDGate('<!-- 禁止 ::-webkit-slider-thumb 字样属注释，不是定义 -->').pass).toBe(true);
    expect(extractRangeClasses('<input type="range" class="mdslider a"><input type="range">').length).toBe(2);
  });
  it('D 评分卡（#230 门槛 D 全文）：单源之外还须形态锚至少其一（无 range 应用）', () => {
    expect(checkD('<div class="pressRipple-row"></div>').pass).toBe(true);
    expect(checkD('<div class="nothing"></div>').pass).toBe(false);
    expect(checkD('<input type="range" class="mdslider">').pass).toBe(true); // 组件类本身即锚
  });
  it('E/F/G/H 阈值', () => {
    expect(checkE('aria-label="a" role="button" tabindex="0"').pass).toBe(true);
    expect(checkE('aria-label="a"').pass).toBe(false);
    expect(checkF('transition: opacity .2s; animation: f .2s; @keyframes f {}').pass).toBe(true);
    expect(checkF('transition: opacity .2s;').pass).toBe(false);
    expect(checkG('localStorage.setItem').pass).toBe(true);
    expect(checkG('__system.fs.write').pass).toBe(true);
    expect(checkG('sessionStorage').pass).toBe(false);
    expect(checkH('tests 正文引用 apps/music/ 与 apps/terminal/', 'music').pass).toBe(true);
    expect(checkH('apps/musical/ 近似前缀不算', 'music').pass).toBe(false);
  });
});

describe('#230 评分卡 · 分档与全量扫描（#228 要求①⑤）', () => {
  it('auditApp 分档：≥7 达标 / 4–6 偏薄 / ≤3 严重', () => {
    const files = [{ rel: 'index.html', text: readFileSync(join(FX.good, 'index.html'), 'utf-8') }];
    const r = auditApp('good', files, TESTS_TEXT);
    expect(r.tier).toBe('达标');
    const z = auditApp('zeroToken', [{ rel: 'index.html', text: '<html><body><p>plain</p></body></html>' }], '');
    expect(z.score).toBeLessThanOrEqual(3);
    expect(z.tier).toBe('严重');
  });
  it('AUDIT_SRC 零硬编码应用清单（#228 制度性根因：白名单必须死透）', () => {
    expect(AUDIT_SRC).not.toContain('ADMITTED_APPS');
    expect(AUDIT_SRC).toMatch(/readdir\(appsRoot/);
    expect(AUDIT_SRC).toMatch(/e\.name !== '_shared'/);
  });
  it('VITE_CFG 接线：全量扫描 + 阶段 1 + 硬门禁 throw + N=0 拒绝带病构建', () => {
    expect(VITE_CFG).not.toContain('ADMITTED_APPS');
    expect(VITE_CFG).toMatch(/runQualityAudit\(rootDir, \{ phase: 1, log \}\)/);
    expect(VITE_CFG).toMatch(/audit\.hardFailures\.length/);
    expect(VITE_CFG).toMatch(/评分卡扫描到 0 个应用/);
  });
});

describe('#227 滑块单源化 · 组件真源与全库接入', () => {
  it('组件规范值（#227 要求①）：常态 6×22/3px、active 24/11px、轨道 6px、focus/disabled/RTL/-moz 全套', () => {
    expect(COMPONENT_CSS).toMatch(/width:\s*6px;\s*\n\s*height:\s*22px;\s*\n\s*border-radius:\s*3px/);
    expect(COMPONENT_CSS).toMatch(/\.mdslider:hover::-webkit-slider-thumb,\s*\.mdslider:active::-webkit-slider-thumb \{\s*width: 24px;\s*border-radius: 11px;/);
    expect(COMPONENT_CSS).toContain(':focus-visible');
    expect(COMPONENT_CSS).toContain(':disabled');
    expect(COMPONENT_CSS).toContain("dir='rtl']");
    expect(COMPONENT_CSS).toContain('::-moz-range-progress');
  });
  it('组件 JS 三通道（载入全量 / input 委托 / sync 手动）+ 经典脚本零框架依赖', () => {
    expect(COMPONENT_JS).toContain('syncAll');
    expect(COMPONENT_JS).toMatch(/document\.addEventListener\('input'/);
    expect(COMPONENT_JS).toContain('window.__idleSlider');
    expect(COMPONENT_JS).not.toMatch(/\bimport\b|\bexport\b/);
  });
  it('全库 15 个 range 应用全部接入组件且零本地滑块伪元素（#227 要求②：六套异形清零）', () => {
    const APPS = ['bytebeat', 'calculator', 'contacts', 'dice', 'flow11', 'gravity', 'markdown',
      'music', 'ocr', 'pdf', 'photos', 'radio', 'threes', 'typing', 'weather'];
    for (const app of APPS) {
      const src = readFileSync(join(ROOT, `ios-desktop/apps/${app}/index.html`), 'utf-8');
      expect(src, app).toContain('../_shared/idle-slider.css');
      // v10.99 #286 续五批：markdown 导出页模板真身上移 apps/markdown/core.js（buildExportPage），
      // idle-slider.js 引用随真身走 core.js 单一真源；index.html 经 window.__markdownCore.buildExportPage
      // 消费同一份（R142 v175/v181 内联实现锚上移先例同律）。演进前内联锚存档：
      // markdown/index.html contains '<scr' + 'ipt src="../_shared/idle-slider.js">'
      if (app === 'markdown') {
        const coreSrc = readFileSync(join(ROOT, `ios-desktop/apps/${app}/core.js`), 'utf-8');
        expect(coreSrc, app).toContain('../_shared/idle-slider.js');
        expect(src, app).toContain('window.__markdownCore.buildExportPage');
      } else {
        expect(src, app).toContain('../_shared/idle-slider.js');
      }
      expect(src, app).not.toMatch(/::-webkit-slider-thumb|::-moz-range-thumb|::-webkit-slider-runnable-track|::-moz-range-track/);
      if (/<input[^>]*type="range"/.test(src)) {
        for (const cls of extractRangeClasses(src)) expect(cls, `${app} range class`).toContain('mdslider');
      }
    }
  });
  it('组件不含播放条/波形形态（#227 要求③：播放条归 #170 波浪，与怠速柄不混用）', () => {
    expect(COMPONENT_CSS).not.toMatch(/wave|波形|progress-bar/);
  });
});

describe('#228 要求③ · 模板双件达标（模板同审，不占 N 计数）', () => {
  it('multi 模板：app.mjs 自身消费 --md-*（破「令牌全塞 style.css、模块零引用」旧范式）+ 组件接入', () => {
    const mjs = readFileSync(join(ROOT, 'scripts/app-template-multi/app.mjs'), 'utf-8');
    expect((mjs.match(/var\(--md-/g) || []).length).toBeGreaterThanOrEqual(3);
    const html = readFileSync(join(ROOT, 'scripts/app-template-multi/index.html'), 'utf-8');
    expect(html).toContain('../_shared/idle-slider.css');
    expect(html).toContain('../_shared/idle-slider.js');
  });
  it('单文件模板：760px 真分栏（grid 布局差异）+ 组件接入 + 持久化骨架', async () => {
    const html = readFileSync(join(ROOT, 'scripts/app-template.html'), 'utf-8');
    expect(html).toMatch(/@media \(min-width: 760px\)[^}]*\{[^}]*grid-template-columns/);
    expect(html).toContain('../_shared/idle-slider.css');
    expect(html).toContain('class="mdslider"');
    expect(html).toContain('localStorage');
    const tpls = await auditTemplates(ROOT, '');
    for (const t of tpls) {
      expect(t.items.D.pass, `${t.appId} D`).toBe(true);
      expect(t.items.B.pass, `${t.appId} B`).toBe(true);
    }
  });
});

describe('#230 §四 分期 + 基线回退门禁（runQualityAudit 行为）', () => {
  it('基线回退：曾经达标项掉线 → 硬 fail；全量项照旧 → 零回退', () => {
    const base = { good: { A: true, B: true, C: false } };
    const results = [auditApp('good', [{ rel: 'index.html', text: '<p>tokens gone</p>' }], '')];
    const regs = findRegressions(results, base);
    expect(regs.length).toBe(1);
    expect(regs[0].appId).toBe('good');
    expect(regs[0].dropped).toContain('A');
    expect(regs[0].dropped).toContain('B');
    expect(regs[0].dropped).not.toContain('C'); // 基线本就不达标项不算回退
  });
  it('quality-baseline.json 在库且覆盖 41 应用 + 双模板（开卡时刻快照）', () => {
    const base = JSON.parse(readFileSync(join(ROOT, 'scripts/quality-baseline.json'), 'utf-8'));
    expect(Object.keys(base).length).toBe(43);
    expect(base['terminal']).toBeDefined();
    expect(base['app-template-multi']).toBeDefined();
  });
  it('阶段 1 warn / 阶段 2 严重 fail / 阶段 3 全 fail（模块级行为，构建侧由 VITE_CFG 接线锚背书）', async () => {
    const { runQualityAudit } = await import('../scripts/audit-app-quality.mjs');
    const log = () => {};
    const p1 = await runQualityAudit(ROOT, { phase: 1, log });
    expect(p1.checked).toBe(41);
    expect(p1.hardFailures.length).toBe(0); // 本批单源化完成后阶段 1 零硬失败
    const p3 = await runQualityAudit(ROOT, { phase: 3, log });
    expect(p3.hardFailures.length).toBeGreaterThan(0); // 偏薄存量在阶段 3 会 fail（分期推进中）
  }, 120_000);
});
