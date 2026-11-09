// ==================== v264 测试 — #243 V 清单存量补课批 1：photos 五缺补齐（V3/V4/V5/V7/V8，v10.99 R128 续窗 Job 2933040） ====================
//
// 背景：#243 已由对侧 Job 2932311 v10.63=cf5f4d76 交付关单（准入清单 A–I 九项制面），
// 本方 v10.64=855242b 增量合流落地 V 清单 8 项检测段+水位开卡（快照 scripts/visual-baseline.json，
// 开卡数字 13/22/6）。存量补课在 #229（closed）之后无开放议题承载 → 按 #256 立卡即实施先例
// 新立卡消费本方 V 水位基建的 Top 缺口面。批 1 = photos（3/8 严重档 → 8/8 达标档）。
//
// 施工等值派生（v10.57/v10.58 先例同律，零视觉漂移）：
//   V3 形状：border-radius 硬值 → var(--md-r-md, 16px)/var(--md-r-lg, 20px)/var(--md-r-sm, 12px)
//   （fallback 原值 = 令牌缺位时逐位保原视觉）
//   V4 状态层：icon-btn/md-btn-filled/filter-item 挂 var(--md-state-pressed, rgba(255,255,255,0.12))
//   （:active 态新增，悬停/静态视觉零变化；:not(:disabled) 不需要——photos 交互面无 disabled 态）
//   V5 按压反馈：:active 锚 ×5（md-card scale 0.985 / media-item 0.97 / filter-item 0.95 /
//   icon-btn 0.9 / md-btn-filled state-pressed）—— gravity .chip:active 先例同款形态
//   V7 空状态：.empty-state 类（原有 id=emptyState 块补配套 CSS 规则，纯标记 → 真样式）
//   V8 深窄屏：表面令牌既有 ✓ + 新增 @media (max-width: 759px) 小屏降级块
//
// ⚠️ 引擎既有盲区披露（本卡实录）：stripCssJsComments 块注释正则 /*...*/ 会把
//    accept="image/*,video/*"（MIME 通配符，383 行）误判为注释开启，非贪婪吞至下一个 */
//    （591 行）——383~591 区间文本不进 V 面判定。photos 修复 = .empty-state CSS 规则前置
//    （383 行之前）；引擎级修复（strip 前转义 accept 属性）留后续窗，不在本卡车道。
//
// 关联：#243（V 清单基建本方侧）/ #229（closed 后立卡理由）/ #256（立卡即实施先例）/
//       #18 §5/§9/§7.5/§7.6/§7.7

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditVisual } from '../scripts/audit-app-quality.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const photosHtml = readFileSync(
  join(__dirname, '..', 'ios-desktop', 'apps', 'photos', 'index.html'),
  'utf-8'
);

describe('v264 · photos V 清单五缺补齐（#243 存量补课批 1）', () => {
  it('A1 · 端到端：photos V 面八项全达标（原 3/8 严重档 → 8/8）', () => {
    const v = auditVisual('photos', photosHtml);
    const passed = Object.values(v.items).filter((r) => r.pass).length;
    expect(passed).toBe(8);
  });

  it('A2 · V3 形状令牌 ≥2：--md-r-* 消费 ×5（md/md-lg/sm 分级）', () => {
    const v = auditVisual('photos', photosHtml);
    expect(v.items.V3.pass).toBe(true);
    expect(photosHtml.match(/var\(--md-r-/g).length).toBeGreaterThanOrEqual(5);
  });

  it('A3 · V4 状态层令牌 ≥1：state-pressed 挂 icon-btn/md-btn-filled/filter-item 三交互面', () => {
    const v = auditVisual('photos', photosHtml);
    expect(v.items.V4.pass).toBe(true);
    expect(
      (photosHtml.match(/var\(--md-state-pressed[^)]*\)/g) || []).length
    ).toBeGreaterThanOrEqual(3);
  });

  it('A4 · V5 按压反馈 ≥1：:active 锚 ×5（gravity .chip:active 先例同款数学）', () => {
    const v = auditVisual('photos', photosHtml);
    expect(v.items.V5.pass).toBe(true);
    expect((photosHtml.match(/:active/g) || []).length).toBeGreaterThanOrEqual(5);
    // 按压缩放数学与先例同构：filter-item 0.95 / icon-btn 0.9（stt/gravity 顶栏同款）
    expect(photosHtml).toContain('.filter-item:active { transform: scale(0.95);');
    expect(photosHtml).toContain('.icon-btn:active');
  });

  it('A5 · V7 空状态：.empty-state 类 + 配套 CSS 规则（原有 id=emptyState 块零文案改动）', () => {
    const v = auditVisual('photos', photosHtml);
    expect(v.items.V7.pass).toBe(true);
    expect(photosHtml).toContain('class="text-center py-16 empty-state"');
    expect(photosHtml).toMatch(/\.empty-state\s*\{[\s\S]*?display:\s*flex/);
    // 原文案零变化（「还没有添加内容」保持，M3 空态=图标+主文案+辅助文案三件套原样）
    expect(photosHtml).toContain('还没有添加内容');
  });

  it('A6 · V8 深窄屏：表面令牌既有 + max-width 759 媒体块（小屏降级零布局重排）', () => {
    const v = auditVisual('photos', photosHtml);
    expect(v.items.V8.pass).toBe(true);
    expect(photosHtml).toContain('@media (max-width: 759px)');
  });

  it('B1 · 等值派生零视觉漂移：--md-r 令牌 fallback 均为原 border-radius 值', () => {
    // --md-r-md=16px / --md-r-lg=20px / --md-r-sm=12px（md3-tokens.css）与原硬值精确等值
    expect(photosHtml).toContain('var(--md-r-md, 16px)');
    expect(photosHtml).toContain('var(--md-r-lg, 20px)');
    expect(photosHtml).toContain('var(--md-r-sm, 12px)');
    // state-pressed fallback = 令牌缺位时逐位保底
    expect(photosHtml).toContain('var(--md-state-pressed, rgba(255,255,255,0.12))');
  });

  it('C1 · 引擎盲区前置实录：.empty-state 规则位于真实 file input（multiple accept="image/*"）之前（吞噬区之外）', () => {
    const stylePos = photosHtml.indexOf('.empty-state {');
    // 锚真实 file input（multiple 前缀排除本测试注释与 CSS 注释中的字样）
    const acceptPos = photosHtml.indexOf('multiple accept="image/*');
    expect(stylePos).toBeGreaterThan(-1);
    expect(acceptPos).toBeGreaterThan(-1);
    expect(stylePos).toBeLessThan(acceptPos); // 前置 = 判定可见性保证
  });

  it('D1 · 纪律负向锚：零 JS 业务逻辑改动（accept 属性/事件绑定/存储键零变化）', () => {
    // photos JS 面（vfs 相册/灯箱/筛选）零触碰——只动 <style> 区与空态块 class
    expect(photosHtml).toContain('accept="image/*,video/*"'); // 原属性原样
    expect(photosHtml).toContain("classList.toggle('hidden', has)"); // 原空态切换逻辑原样
  });
});
