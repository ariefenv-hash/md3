// ==================== text-bridge.test.js — #177 数据孤岛[文本] stt/translate/ocr 互通 ====================
//
// 覆盖（三应用内联 JS 源码锚 + 纯桥接语义）：
//   1. stt：会话级历史三通道（localStorage sttHistory / VFS /documents/stt-history.json 镜像 /
//      notify 低频一次）+ stop() 收尾调用点 + 历史 chips 回填
//   2. translate：addToHistory 挂 VFS 镜像 + 空态恢复 + notify 一次 + ocr/translate 深链接收
//   3. ocr：翻译按钮 + BUS_EMIT ocr/translate + 空结果拒绝
//   4. 通道语义：FS 桥同款（FS_REQUEST/FS_RESULT）+ app-bus 定向投递排队可达性
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const read = (p) => readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', p), 'utf8');

describe('A — stt：会话级历史三通道（v11.02 #177）', () => {
  const src = read('ios-desktop/apps/stt/index.html');

  it('历史引擎在库：ST_HIST_KEY=sttHistory + VFS 镜像路径 + fsCall 桥（FS_REQUEST/FS_RESULT 同款）', () => {
    expect(src).toContain("var ST_HIST_KEY = 'sttHistory'");
    expect(src).toContain("var ST_HIST_PATH = '/documents/stt-history.json'");
    expect(src).toContain("type: 'FS_REQUEST'");
    expect(src).toContain("'FS_RESULT'");
    expect(src).toContain("format: 'md3-stt-history'");
  });

  it('会话收尾落库：stop() 调 settleHistory（空会话不落）+ notify 低频一次（stNotified 门）', () => {
    expect(src).toMatch(/setState\(core\.STATES\.IDLE\);\s*\n\s*\/\/ v9\.94 #177：会话收尾 → 历史落库[\s\S]*?settleHistory\(\);/);
    expect(src).toMatch(/if \(!text\.replace\(\/\\s\/g, ''\)\.length\) return;/);
    expect(src).toContain('if (!stNotified)');
    expect(src).toMatch(/sys\.notify\(\{ appId: 'stt', appName: '语音转文字', title: '听写完成'/);
  });

  it('历史 chips UI：stHistRow/stHist 宿主 + 点击回填分段卡（appendSegment + persist）+ 上限 30/镜像 20', () => {
    expect(src).toContain('id="stHistRow"');
    expect(src).toContain('id="stHist"');
    expect(src).toMatch(/segments = core\.appendSegment\(\[\], \{ text: it\.full \|\| it\.prev \|\| ''/);
    expect(src).toContain('stHistItems = stHistItems.slice(0, 30)');
    expect(src).toContain('items: stHistItems.slice(0, 20)');
    expect(src).toMatch(/\.st-hist-chip/);
  });

  it('恢复并集：VFS read 回读按 at 去重并集 + 排序 + renderSttHist', () => {
    expect(src).toMatch(/seen\[x\.at\] = 1;/);
    expect(src).toMatch(/stHistItems\.sort\(function \(a, b\) \{ return b\.at - a\.at; \}\)/);
    expect(src).toContain('loadSttHistory();');
  });
});

describe('B — translate：VFS 镜像 + notify + 深链接收（v11.02 #177）', () => {
  const src = read('ios-desktop/apps/translate/index.html');

  it('addToHistory 挂双钩：mirrorHistoryToVfs() + notifyTranslatedOnce(item)（既有 localStorage/UI 零触碰）', () => {
    expect(src).toMatch(/renderHistory\(\);\s*\n\s*\/\/ v9\.94 #177：VFS 镜像[\s\S]*?mirrorHistoryToVfs\(\);\s*\n\s*notifyTranslatedOnce\(item\);/);
    expect(src).toContain("localStorage.setItem('translationHistory'"); // 既有存储保持
  });

  it('VFS 镜像：/documents/translate-history.json + format md3-translate-history + 20 条截断', () => {
    expect(src).toContain("'/documents/translate-history.json'");
    expect(src).toContain("format: 'md3-translate-history'");
    expect(src).toMatch(/history\.slice\(0, 20\)\.map/);
  });

  it('空态恢复：restoreFromVfs 仅在本地历史空时找回（不覆盖既有）+ renderHistory 回灌', () => {
    expect(src).toMatch(/if \(history\.length\) return;/);
    expect(src).toContain('restoreFromVfs();');
  });

  it('OCR→翻译串联接收：BUS_DELIVER ocr/translate → 预填 sourceText + 自动 doTranslate', () => {
    expect(src).toMatch(/d\.event !== 'ocr\/translate'/);
    expect(src).toMatch(/st\.value = text\.slice\(0, 5000\);/);
    expect(src).toMatch(/typeof doTranslate === 'function'\) doTranslate\(\)/);
    expect(src).toContain("new Event('input', { bubbles: true })");
  });

  it('notify 低频门（notifiedOnce）+ 沙盒语义豁免诚实标注', () => {
    expect(src).toContain('if (notifiedOnce) return;');
    expect(src).toMatch(/sys\.notify\(\{ appId: 'translate', appName: '翻译', title: '翻译完成'/);
    expect(src).toContain('沙盒语义豁免诚实标注');
  });
});

describe('C — ocr：结果发送到翻译（v11.02 #177）', () => {
  const html = read('ios-desktop/apps/ocr/index.html');
  const src = read('ios-desktop/apps/ocr/app.mjs');

  it('翻译按钮在场（ocTranslateBtn）+ BUS_EMIT ocr/translate 定向事件（target=translate 触发排队补投）', () => {
    expect(html).toContain('id="ocTranslateBtn"');
    expect(src).toContain("{ type: 'BUS_EMIT', event: 'ocr/translate', payload: { text: text.slice(0, 5000), from: 'ocr' }, target: 'translate' }");
  });

  it('空结果拒绝（toast）+ 发送成功 toast', () => {
    expect(src).toMatch(/if \(!text\) \{ toast\('暂无识别结果'\); return; \}/);
    expect(src).toContain("toast('已发送到翻译')");
  });
});

describe('D — 通道语义回归（桥与总线的既有契约不被破坏）', () => {
  it('app-bus 定向投递排队在库（translate 未开时信封挂起打开补投——串联可达性基础）', () => {
    const bus = read('ios-desktop/js/app-bus.js');
    expect(bus).toContain('pendingDeliveries');
    expect(bus).toMatch(/type: 'BUS_DELIVER', event: entry\.event/);
  });

  it('vfs.js FS_REQUEST 宿主路由在库（stt/translate fsCall 桥的对端）', () => {
    const vfs = read('ios-desktop/js/vfs.js');
    expect(vfs).toMatch(/d\.type !== 'FS_REQUEST'/);
  });

  it('ocr 既有历史/notify 零触碰（v9.50 范本原样）', () => {
    const src = read('ios-desktop/apps/ocr/app.mjs');
    expect(src).toContain("'/documents/ocr-history.json'");
    expect(src).toMatch(/sys\.notify\(\{ appId: 'ocr', appName: 'OCR 文字识别', title: '识别完成'/);
    expect(src).toContain('copyBtn.addEventListener');
  });
});
