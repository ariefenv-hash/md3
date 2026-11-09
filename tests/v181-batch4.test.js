// ==================== v181-batch4.test.js — #181 第四批整改：ocr 六条准入 v10.92 ====================
//
// 覆盖（R64 窗加餐同域顺延 #192 规则）：
//   · ocr 192→~310 行六条准入：令牌化收尾（五处裸 rgba → color-mix 语义派生）/ @media 响应式 /
//     760px 平板真分栏（grid 1fr/300px 左流程右结果+历史常驻面板，手机态 wrapper display:contents
//     零变化）/ SDK（VFS /documents/ocr-history.json 最近 20 条镜像 + notify + clipboard.write 优先，
//     #177 ocr 剪贴板缺口顺带补强）/ 形态语言（结果字号怠速柄 .mdslider + chips/btn 整排 pressRipple）
//   · 回归锚：识别主流程（降采样/worker/取消）/ fsCall 桥 / 深链 ocr/open / 状态键零变化
//   · 准入门：ADMITTED_APPS 扩至 9 应用（+ocr）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(join(ROOT, 'ios-desktop/apps/ocr/index.html'), 'utf-8');
const APP = readFileSync(join(ROOT, 'ios-desktop/apps/ocr/app.mjs'), 'utf-8');
const VITE = readFileSync(join(ROOT, 'vite.config.js'), 'utf-8');

describe('v10.92 #181 第四批 ocr：令牌化收尾（裸白黑清零）', () => {
  it('五处裸 rgba 全部 color-mix 语义派生（panel/track/area/hover/scrim）', () => {
    expect(HTML).toMatch(/--oc-panel: color-mix\(in srgb, var\(--md-surface\) 55%, transparent\);/);
    expect(HTML).toMatch(/--oc-track: color-mix\(in srgb, var\(--md-on-surface\) 9%, transparent\);/);
    expect(HTML).toMatch(/--oc-area: color-mix\(in srgb, var\(--md-surface-container-highest, var\(--md-surface\)\) 72%, transparent\);/);
    expect(HTML).toMatch(/--oc-hover: color-mix\(in srgb, var\(--md-on-surface\) 5%, transparent\);/);
    expect(HTML).toMatch(/--oc-scrim: color-mix\(in srgb, var\(--md-scrim, #000\) 45%, transparent\);/);
    // 消费点接线（原 rgba 使用处全换语义变量）
    expect(HTML).toMatch(/\.oc-ptrack \{ flex: 1; height: 8px; border-radius: var\(--md-r-full, 999px\); background: var\(--oc-track\);/); // v10.92 #229 P1 二批五档圆角
    expect(HTML).toMatch(/\.oc-sheet-mask \{ position: absolute; inset: 0; background: var\(--oc-scrim\);/);
    expect(HTML).toMatch(/\.oc-vfs-row:hover \{ background: var\(--oc-hover\); \}/);
  });
});

describe('v10.92 #181 第四批 ocr：响应式 + 760px 平板真分栏', () => {
  it('@media 400px 紧凑 + 760px grid 两列（左主流程右结果+历史）', () => {
    expect(HTML).toMatch(/@media \(max-width: 400px\) \{/);
    expect(HTML).toMatch(/@media \(min-width: 760px\) \{/);
    expect(HTML).toMatch(/\.oc-app \{ display: grid; grid-template-columns: 1fr 300px; grid-template-rows: auto 1fr auto;/);
    expect(HTML).toMatch(/\.oc-main \{ display: flex; flex-direction: column; min-height: 0; grid-row: 1 \/ -1; grid-column: 1; \}/);
    expect(HTML).toMatch(/\.oc-side \{ display: flex; flex-direction: column; min-height: 0; grid-row: 1 \/ -1; grid-column: 2;/);
  });
  it('手机态 wrapper display:contents 零变化（typing 同款先例）+ #ocHistPanel 手机态隐藏平板常驻', () => {
    expect(HTML).toMatch(/\.oc-main, \.oc-side \{ display: contents; \}/);
    expect(HTML).toMatch(/#ocHistPanel \{ display: none; \}/);
    expect(HTML).toMatch(/#ocHistPanel \{ display: flex; flex-direction: column; min-height: 0; flex: 1 1 auto; gap: 4px;/);
  });
  it('结构：oc-main 包住 head/langs/stage/zoombar/progress，oc-side 包住 result + aside#ocHistPanel', () => {
    expect(HTML).toMatch(/<div class="oc-main">/);
    expect(HTML).toMatch(/<div class="oc-side">/);
    expect(HTML).toMatch(/<aside id="ocHistPanel" data-test="oc-hist-panel">/);
    expect(HTML).toMatch(/id="ocHistList" data-test="oc-hist-list"/);
  });
});

describe('v10.92 #181 第四批 ocr：SDK 接入（历史镜像 / notify / clipboard 三通道）', () => {
  it('VFS /documents/ocr-history.json 最近 20 条 + md3-ocr-history 格式 + full 全文镜像上限 5000', () => {
    expect(APP).toMatch(/var HIST_PATH = '\/documents\/ocr-history\.json';/);
    expect(APP).toMatch(/histItems = histItems\.slice\(0, 20\);/);
    expect(APP).toMatch(/JSON\.stringify\(\{ format: 'md3-ocr-history', version: 1, items: histItems \}\)/);
    expect(APP).toMatch(/full: text\.slice\(0, 5000\)/);
  });
  it('识别完成接线：saveHistory(text, lang, conf) + notifyDone（__system.notify 形态，非空文本才入档）', () => {
    expect(APP).toMatch(/if \(text\.replace\(\/\\s\/g, ''\)\.length\) \{\n\s*saveHistory\(text, currentMode\(\)\.label \|\| currentMode\(\)\.langs, conf\);\n\s*notifyDone\(text\.replace\(\/\\s\/g, ''\)\.length\);/);
    expect(APP).toMatch(/sys\.notify\(\{ appId: 'ocr', appName: 'OCR 文字识别', title: '识别完成', desc: '本次共识别 ' \+ chars \+ ' 字，结果已入历史' \}\)/);
    expect(APP).toMatch(/沙盒语义豁免诚实标注/);
  });
  it('copyResult 三级链：__system.clipboard.write 优先 → navigator.clipboard → execCommand（#177 缺口补强）', () => {
    expect(APP).toMatch(/if \(sys && sys\.clipboard && typeof sys\.clipboard\.write === 'function'\) \{/);
    expect(APP).toMatch(/navigator\.clipboard\.writeText\(text\)\.then\(function \(\) \{/);
    expect(APP).toMatch(/document\.execCommand && document\.execCommand\('copy'\)/);
  });
  it('历史回看：oc-hist-row 点击读回 full 入结果区（prev 仅预览）+ loadHistory 启动恢复', () => {
    expect(APP).toMatch(/if \(hit && hit\.full\) \{ resArea\.value = hit\.full; resultBox\.classList\.remove\('hide'\); toast\('已回填历史识别结果'\); \}/);
    expect(APP).toMatch(/loadHistory\(\);/);
  });
  it('fsCall 桥降级零炸：read/write 全走 fsCall（FS_REQUEST 形态不变，直开 {ok:false} 静默）', () => {
    expect(APP).toMatch(/fsCall\('read', \{ path: HIST_PATH \}\)/);
    expect(APP).toMatch(/fsCall\('write', \{ path: HIST_PATH, content:/);
    expect(APP).toMatch(/FS_REQUEST/);
  });
});

describe('v10.92 #181 第四批 ocr：形态语言（怠速柄 + 整排联动）', () => {
  it('结果字号怠速柄：.mdslider 0.85–1.3× → --res-font-scale 乘算 .oc-res-area + --p 同步 + localStorage ocr-res-font-v1', () => {
    expect(HTML).toMatch(/id="ocFontSlider" data-test="oc-font-slider" min="0\.85" max="1\.3" step="0\.05" value="1"/);
    expect(HTML).toMatch(/font-size: calc\(13px \* var\(--res-font-scale, 1\)\);/);
    expect(APP).toMatch(/var KEY = 'ocr-res-font-v1';/);
    expect(APP).toMatch(/fontSlider\.style\.setProperty\('--p', Math\.round\(\(\(f - min\) \/ \(max - min\)\) \* 100\) \+ '%'\);/);
    expect(APP).toMatch(/document\.documentElement\.style\.setProperty\('--res-font-scale', String\(f\)\);/);
  });
  it('.mdslider 怠速柄形态（v10.92 #227 单源化）：视觉规范收编 _shared/idle-slider.css，本地零伪元素', () => {
    expect(HTML).toContain('../_shared/idle-slider.css');
    expect(HTML).toContain('../_shared/idle-slider.js');
    expect(HTML).not.toMatch(/::-webkit-slider-thumb/);
    expect(HTML).not.toMatch(/::-moz-range-thumb/);
  });
  it('pressRipple 整排联动：oc-lang/oc-btn 事件委托 + 胶囊基准 999 圆角递减形变（R62 坑②方向）', () => {
    expect(APP).toMatch(/var RIPPLE_BASE_R = 999;/);
    expect(APP).toMatch(/e\.target\.closest\('\.oc-lang, \.oc-btn'\)/);
    expect(APP).toMatch(/Math\.round\(RIPPLE_BASE_R - 260 \* f\)/);
    expect(APP).toMatch(/\['pointerup', 'pointercancel', 'pointerleave'\]\.forEach\(function \(ev\) \{/);
  });
});

describe('v10.92 #181 第四批 ocr：回归锚（识别主链零变化）', () => {
  it('识别主流程/降采样/worker 取消/fsCall 桥/深链 ocr/open 全部保留', () => {
    expect(APP).toMatch(/function downscaleToDataUrl\(\)/);
    expect(APP).toMatch(/core\.MAX_LONG_EDGE/);
    expect(APP).toMatch(/createWorker\(langs, OEM\.LSTM_ONLY/);
    expect(APP).toMatch(/workerBlobURL: false/);
    expect(APP).toMatch(/function cancelRecognize/);
    expect(APP).toMatch(/'ocr\/open'/);
    expect(APP).toMatch(/core\.loadState\(\)/);
  });
    it('ocr 已由全量扫描自动覆盖（白名单制度在 v10.92 退役）', () => {
    // v10.92 #228 制度性根因修正：ADMITTED_APPS 硬编码白名单已删除（24 应用绕过检查的根因），
    // 改 audit-app-quality.mjs 全量扫描 —— apps/ 落盘即受检，应用 id 不得再硬编码进 vite.config.js
    expect(VITE).not.toContain('ADMITTED_APPS');
    expect(VITE).toContain('audit-app-quality.mjs');
    expect(VITE).toContain('runQualityAudit');
    expect((VITE.match(/'ocr'/g) || []).length).toBe(0); // 全量扫描下零硬编码（旧「清单含 X」断言的语义反转）
  });  it('版本真源 10.92.0（package.json）', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
    expect(pkg.version).toBe('10.92.0');
  });
});
