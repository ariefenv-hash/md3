// ==================== v783-header-time.test.js — v7.83 QS 头部时间区源码对齐 ====================
//
// Task A 遗留项收尾：时间区（手机大钟）对齐 AOSP 源码。
// 权威源码：ShadeHeader.kt → ExpandedShadeHeader（手机 QS 场景头部）：
//   ① Column(verticalArrangement = spacedBy(16.dp, Alignment.Bottom),
//            defaultMinSize(minHeight = ShadeHeader.Dimensions.ExpandedHeight /* 120.dp */))
//   ② 行①：Clock(scale = 2.57f)（graphicsLayer 左中锚点；基准 TextAppearance.QS.Status
//      = status_bar_shade_header_text_size_sp 14sp → 大钟视觉 ≈ 14 × 2.57 ≈ 36sp）
//      + ShadeCarrierGroup（Modifier.align(CenterEnd).widthIn(max = 180.dp)）
//   ③ 行②：VariableDayDate（14sp body-medium-emphasized，letterSpacing 0.01）左
//      + ShadeHighlightChip（StatusIcons + BatteryInfo）右 —— Row SpaceBetween
//   ④ shouldUseExpandedFormat：QS 过渡进度 ≥ 0.5 时日期/状态图标切展开格式
//
// 覆盖：版本锚点、HTML 结构（双面板）、CSS 源码几何、JS 更新契约、v7.82 回归锚点。

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

const indexHtml = src('ios-desktop/index.html');
const panelsCss = src('ios-desktop/css/pull-panels.css');
const statusBarJs = src('ios-desktop/js/status-bar.js');
const swJs = src('sw.js');

// ==================== A. 版本锚点 ====================
describe('v7.83 · A 版本锚点', () => {
  test('sw.js 升 geek-v100', () => {
    expect(swJs).toContain("const VERSION = 'geek-v100';");
    // 旧版本号清零（正则写法对 sed 锚点同步免疫）
    expect(swJs).not.toMatch(/geek-v(9[0-2])\b/);
  });
});

// ==================== B. HTML 结构（AOSP ExpandedShadeHeader 两行结构） ====================
describe('v7.83 · B 头部两行结构', () => {
  // 每个面板各一份头部（通知中心 + 控制中心），源码结构：时钟行在上、日期行在下
  const panelCount = 1; // v7.84 统一 Shade：大钟头部（ExpandedShadeHeader）仅 QS 场景一份；QQS 场景用 CollapsedShadeHeader 单行小头部

  test('panel-clock-row：大钟 + 运营商组同行（源码 Box: Clock + ShadeCarrierGroup）', () => {
    const rows = indexHtml.match(/<div class="panel-clock-row">[\s\S]*?<\/div>\s*<\/div>/g) || [];
    // 时钟行含大钟与运营商
    const clockRows = indexHtml.match(/class="panel-clock-row"/g) || [];
    expect(clockRows.length).toBe(panelCount);
    // 运营商组从旧 header-right 移入时钟行（每个时钟行内 panel-big-clock 之后出现）
    for (const chunk of indexHtml.split('<div class="panel-clock-row">').slice(1)) {
      const rowScope = chunk.split('<div class="panel-date-row">')[0];
      expect(rowScope).toContain('class="panel-big-clock"');
      expect(rowScope).toContain('class="panel-carrier"');
      // 运营商在大钟之后（源码 align CenterEnd 在 Clock 之后声明）
      expect(rowScope.indexOf('panel-big-clock')).toBeLessThan(rowScope.indexOf('panel-carrier'));
    }
  });

  test('panel-date-row：日期左 + 状态图标/电量右（源码 Row SpaceBetween）', () => {
    const dateRows = indexHtml.match(/class="panel-date-row"/g) || [];
    expect(dateRows.length).toBe(panelCount);
    for (const chunk of indexHtml.split('<div class="panel-date-row">').slice(1)) {
      const rowScope = chunk.split('</div>\n      </div>')[0];
      expect(rowScope).toContain('class="panel-date"');
      expect(rowScope).toContain('class="panel-status-row"');
      expect(rowScope.indexOf('panel-date')).toBeLessThan(rowScope.indexOf('panel-status-row'));
      expect(rowScope).toContain('battery-pill');
    }
  });

  test('旧左右堆叠容器（panel-header-left/right）退役', () => {
    expect(indexHtml).not.toContain('panel-header-left');
    expect(indexHtml).not.toContain('panel-header-right');
  });

  test('JS 更新契约保留：status-bar.js 按 class 刷新大钟/日期（结构重组不破坏运行时）', () => {
    expect(statusBarJs).toContain("querySelectorAll('.panel-big-clock')");
    expect(statusBarJs).toContain("querySelectorAll('.panel-date')");
    // quick-settings.js 运营商图标仍按 class 查询
    const qsJs = src('ios-desktop/js/quick-settings.js');
    expect(qsJs).toContain("querySelectorAll('.panel-carrier-icon')");
  });
});

// ==================== C. CSS 源码几何 ====================
describe('v7.83 · C 头部 CSS 源码几何', () => {
  test('头部：minHeight 120dp + spacedBy(16.dp) + 内容底部对齐', () => {
    const headerBlock = panelsCss.match(/\.panel-header \{[^}]*\}/)[0];
    expect(headerBlock).toContain('flex-direction: column');
    expect(headerBlock).toContain('justify-content: flex-end');
    expect(headerBlock).toContain('gap: 16px');
    expect(headerBlock).toContain('min-height: 120px');
  });

  test('大钟：源码 14sp × 2.57f ≈ 36sp（旧 42px 拟合值退役）', () => {
    const clockBlock = panelsCss.match(/\.panel-big-clock \{[^}]*\}/)[0];
    expect(clockBlock).toContain('font-size: 36px');
    expect(clockBlock).not.toContain('42px');
  });

  test('运营商组：widthIn(max = 180.dp) + 单行省略（源码 max-width 约束）', () => {
    const carrierBlock = panelsCss.match(/\.panel-carrier \{[^}]*\}/)[0];
    expect(carrierBlock).toContain('max-width: 180px');
    expect(carrierBlock).toContain('text-overflow: ellipsis');
  });

  test('日期：14sp + letterSpacing 0.01（源码 TextAppearance.QS.Status），间距改由头部 gap 承担', () => {
    const dateBlock = panelsCss.match(/\.panel-date \{[^}]*\}/)[0];
    expect(dateBlock).toContain('font-size: 14px');
    expect(dateBlock).toContain('letter-spacing: 0.01em');
    expect(dateBlock).not.toContain('margin-top');
  });

  test('时钟行/日期行均为 Row SpaceBetween（源码 horizontalArrangement = SpaceBetween）', () => {
    for (const cls of ['panel-clock-row', 'panel-date-row']) {
      const block = panelsCss.match(new RegExp(`\\.${cls} \\{[^}]*\\}`))[0];
      expect(block).toContain('justify-content: space-between');
      expect(block).toContain('align-items: center');
    }
  });
});

// ==================== D. v7.82 回归锚点（本轮不得破坏） ====================
describe('v7.83 · D v7.82 动画体系回归锚点', () => {
  test('verticalSquish 布局高度压缩仍在（--qs-squish）', () => {
    expect(panelsCss).toContain('var(--qs-squish, 1)');
  });

  test('磁贴两态圆角变量仍在（--tile-r-off / --tile-r-on）', () => {
    expect(panelsCss).toContain('--tile-r-off');
    expect(panelsCss).toContain('--tile-r-on');
  });

  test('滑条源码几何仍在（v7.90 回归 r1 竖柄版：轨 40dp / M3E 竖置 52×254 / 竖柄 52h / 横柄 4dp）', () => {
    expect(panelsCss).toContain('height: 40px');
    expect(panelsCss).toContain('height: 254px');
    expect(panelsCss).toContain('height: 52px');
    expect(panelsCss).toContain('height: 4px');
  });
});
