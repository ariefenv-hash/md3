// v8.15 #37 媒体卡片单源投影守护测试
// 议题：https://github.com/ariefenv-hash/md3/issues/37（P0 双显：通知栏与控制中心同时出现两张音乐卡）
// AOSP 语义：MediaCarouselController 单实例 reparent——同一展开视图媒体控件只出现一处。
// 双显路径实锤：①classic split（≥600px 双列常显：通知列 pixelMediaCard + QS 列 qsMediaCard）
//              ②dual 分家（双浮动面板独立开合：notiPanelScroll 整体迁入通知面板 +
//                qsPanelScroll 整体迁入 QS 面板，两卡各自常挂常显）
// 修复范式：宿主裁决纯函数 resolveMediaHost + body[data-media-host] + CSS 结构性压制
//           （display:none，不与会话门控 media-hidden 互写）。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { resolveMediaHost, applyMediaHostPolicy } from '../ios-desktop/js/media-host.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_HOST = readFileSync(join(root, 'ios-desktop/js/media-host.js'), 'utf8');
const SRC_MAIN = readFileSync(join(root, 'ios-desktop/js/main.js'), 'utf8');
const SRC_CSS = readFileSync(join(root, 'ios-desktop/css/pull-panels.css'), 'utf8');
const SRC_GESTURE = readFileSync(join(root, 'ios-desktop/js/pull-down-gesture.js'), 'utf8');
const SRC_QS = readFileSync(join(root, 'ios-desktop/js/quick-settings.js'), 'utf8');
const SRC_NOTIF = readFileSync(join(root, 'ios-desktop/js/notifications.js'), 'utf8');
const SRC_HTML = readFileSync(join(root, 'ios-desktop/index.html'), 'utf8');

describe('v8.15 resolveMediaHost 宿主裁决纯函数（行为级）', () => {
  it('dual 分家 → 单源 QS（AOSP 17 OverlayShade：通知浮动面板无媒体槽）', () => {
    expect(resolveMediaHost({ shadeMode: 'dual', viewportWidth: 420 })).toBe('qs');
    expect(resolveMediaHost({ shadeMode: 'dual', viewportWidth: 1280 })).toBe('qs');
  });

  it('classic split（≥600px）→ 单源 QS（SplitShade.kt：媒体卡只在 QS 列）', () => {
    expect(resolveMediaHost({ shadeMode: 'classic', viewportWidth: 600 })).toBe('qs');
    expect(resolveMediaHost({ shadeMode: 'classic', viewportWidth: 1280 })).toBe('qs');
  });

  it('classic 窄屏场景轨 → both（两场景各一卡由场景轨互斥渲染，无需压制）', () => {
    expect(resolveMediaHost({ shadeMode: 'classic', viewportWidth: 599 })).toBe('both');
    expect(resolveMediaHost({ shadeMode: 'classic', viewportWidth: 420 })).toBe('both');
  });

  it('非法/缺失输入防御：非 dual 归一 classic、非数宽度按 0 处理', () => {
    expect(resolveMediaHost({ shadeMode: 'kiosk', viewportWidth: 420 })).toBe('both');
    expect(resolveMediaHost({ shadeMode: '', viewportWidth: 700 })).toBe('qs');
    expect(resolveMediaHost({ shadeMode: 'classic', viewportWidth: NaN })).toBe('both');
    expect(resolveMediaHost({ shadeMode: 'classic', viewportWidth: undefined })).toBe('both');
  });

  it('happy-dom 落地：applyMediaHostPolicy 按视口写 body[data-media-host]', () => {
    document.body.dataset.shadeMode = 'classic';
    const orig = window.innerWidth;
    try {
      window.innerWidth = 1280;
      applyMediaHostPolicy();
      expect(document.body.dataset.mediaHost).toBe('qs');
      window.innerWidth = 420;
      applyMediaHostPolicy();
      expect(document.body.dataset.mediaHost).toBe('both');
      document.body.dataset.shadeMode = 'dual';
      window.innerWidth = 420;
      applyMediaHostPolicy();
      expect(document.body.dataset.mediaHost).toBe('qs');
    } finally {
      window.innerWidth = orig;
      delete document.body.dataset.mediaHost;
      delete document.body.dataset.shadeMode;
    }
  });
});

describe('v8.15 源码锚定：单源投影链路在场', () => {
  it('CSS 结构性压制规则在场（body[data-media-host="qs"] 命中通知侧卡）', () => {
    expect(SRC_CSS).toContain('body[data-media-host="qs"] .noti-media-card');
    // display:none 形态（结构性压制，非折叠动画复写）
    expect(SRC_CSS).toMatch(/body\[data-media-host="qs"\] \.noti-media-card \{ display: none !important; \}/);
  });

  it('media-host.js：断点常量 600 与 pull-down-gesture splitShade 判定同源', () => {
    expect(SRC_HOST).toContain('SPLIT_SHADE_MIN_WIDTH = 600');
    expect(SRC_GESTURE).toContain("'(min-width: 600px)'");
  });

  it('media-host.js：MQL change + resize 双保险 + 模式切换广播监听在场', () => {
    expect(SRC_HOST).toContain("window.addEventListener('resize', applyMediaHostPolicy)");
    expect(SRC_HOST).toContain("document.addEventListener('md3-shade-mode-changed', applyMediaHostPolicy)");
    expect(SRC_HOST).toMatch(/mql\.addEventListener\('change', applyMediaHostPolicy\)/);
    expect(SRC_HOST).toMatch(/mql\.addListener\(applyMediaHostPolicy\)/); // 老内核降级
  });

  it('main.js：initMediaHost 接线在 initDualShade 之后（依赖 data-shade-mode 就位）', () => {
    expect(SRC_MAIN).toContain("import { initMediaHost } from './media-host.js'");
    const iDual = SRC_MAIN.indexOf('initDualShade();');
    const iHost = SRC_MAIN.indexOf('initMediaHost();');
    expect(iDual).toBeGreaterThan(-1);
    expect(iHost).toBeGreaterThan(iDual);
  });

  it('既有会话门控不被碰：两卡 media-hidden 判定保持原形态（宿主裁决与之正交）', () => {
    expect(SRC_QS).toMatch(/card\.classList\.toggle\('media-hidden', !state\.isPlaying && state\.progress <= 0\)/);
    expect(SRC_NOTIF).toMatch(/mediaCard\.classList\.toggle\('media-hidden', !hasSession\)/);
  });

  it('两卡 DOM 仍在 index.html（单源投影是压制不是删除）', () => {
    expect(SRC_HTML).toContain('id="pixelMediaCard"');
    expect(SRC_HTML).toContain('id="qsMediaCard"');
  });

  it('压制选择器只命中通知侧卡（QS 侧权威卡不受 data-media-host 影响）', () => {
    // 全库唯一压制规则，且选择器不含 qs-media-card
    const hits = SRC_CSS.match(/body\[data-media-host[^\n]*\n/g) || [];
    expect(hits.length).toBe(1);
    expect(hits[0]).toContain('.noti-media-card');
    expect(hits[0]).not.toContain('qs-media-card');
  });
});
