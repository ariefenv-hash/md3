// ==================== v248-v249-ui-feedback.test.js — #248/#249 用户真机截图反馈治理 ====================
//
// #248（设置-系统导航）：① material-symbols-outlined 字体连字在字体未加载时把
// ligature 名裸露为文本（真机截图「VOLUME_DOWN」原文可见）→ settings.js 全量替换为
// 内联 SVG（零字体依赖）；② uiv-nav-radio 轻拟物键帽（uiverse.io 缝合）升级 MD3
// segmented button 视觉 —— 类名契约零迁移（settings.js 三处复用零改动）。
//
// #249（天气平板横屏右溢裁切）：grid 项 min-width:auto 使 min-content 沿轨道传播
// （48H 条 15 项撑破 1fr 卡片出屏）→ min-width:0 钳制 + 48H/城市 chips 自带
// overflow-x 滚动兜底 + 文档级 overflow-x 护栏。
//
// 覆盖：A 源码锚（#248 连字清零 + segmented 契约 / #249 溢出护栏三层）。

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

const settingsJs = src('ios-desktop/js/apps/settings.js');
const pixelCss = src('ios-desktop/css/pixel-features.css');
const weatherHtml = src('ios-desktop/apps/weather/index.html');

// ==================== A. 源码锚 ====================
describe('#248 · 设置系统导航形态治理', () => {
  test('settings.js 字体连字图标清零（零 material-symbols-outlined 残留）', () => {
    expect(settingsJs.includes('material-symbols-outlined')).toBe(false);
  });

  test('settings.js 内联 SVG 替换到位（体积语义 aria-hidden + currentColor/主题色填充）', () => {
    expect(settingsJs).toContain('aria-hidden="true"');
    expect(settingsJs).toContain('fill:var(--md-primary');
  });

  test('uiv-nav-radio 类名契约零迁移（settings.js 三处复用零改动）', () => {
    expect(pixelCss).toContain('.uiv-nav-radio-label');
    expect(pixelCss).toContain('.uiv-nav-radio-on');
    expect(pixelCss).toContain('uiv-nav-radio-input');
    // settings.js 三处渲染仍走同一前缀
    const uses = settingsJs.match(/uiv-nav-radio-label/g) || [];
    expect(uses.length).toBeGreaterThanOrEqual(3);
  });

  test('MD3 segmented 视觉锚：全圆角段片 + secondary-container 选中语义', () => {
    expect(pixelCss).toContain('border-radius: 9999px');
    expect(pixelCss).toContain('MD3 segmented 单选组');
    expect(pixelCss).toContain('#248');
  });
});

describe('#249 · 天气横屏溢出护栏', () => {
  test('grid 项 min-width 钳制（min-content 不再沿轨道传播）', () => {
    expect(weatherHtml).toContain('#249');
    expect(weatherHtml).toContain('min-content 沿轨道传播');
    expect(weatherHtml).toMatch(/min-width:\s*0/);
  });

  test('48H 逐小时条与城市 chips 自带横向滚动兜底', () => {
    expect(weatherHtml).toMatch(/<div[^>]*overflow-x-auto[^>]*id="hourlyForecastContainer"/);
    expect(weatherHtml).toMatch(/<div[^>]*overflow-x-auto[^>]*id="cityChipsContainer"/);
  });

  test('容器布局契约保持（max-width 680 居中不受治理影响）', () => {
    expect(weatherHtml).toMatch(/\.weather-app-container \{[^}]*max-width:\s*680px;[^}]*margin:\s*0 auto;/s);
  });
});
