// ==================== anim-first-freeze.test.js — v11.52 P1 动画先行 + P2 动画期浮层降级 ====================
// P1（设置首开「先卡一下」根治）：openApp 首开 native 巨石的实例构建延后两跳 rAF，
//   巨石模板 innerHTML 解析 + 内联脚本激活移出动画首帧关键路径；延迟期 cold 曲线
//   启动屏掩护、构建完成后 render() 逐帧探针自动翻 warm；快速切换/秒关路径
//   demote/closeApp 入口同步抢建兜底（幂等 ensureAppInstance）。
// P2（开合动画掉帧减负）：动画期 dock/widget 卡/文件夹浮层等毛玻璃逐帧重采样
//   背后内容（Chromium backdrop 链随每次合成重跑）——setAnimFreezeLock 挂
//   html.ios-anim-freeze，CSS 统一摘 backdrop-filter 并以加深底色补偿层离感。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (p) => readFileSync(join(ROOT, p), 'utf-8');

describe('v11.52 P1 动画先行：首开构建延后（app-window × page-stack）', () => {
  const PAGE_STACK = () => read('ios-desktop/js/page-stack.js');
  const WINDOW = () => read('ios-desktop/js/app-window.js');

  it('page-stack 导出面：hasAppInstance + deferAppInstanceBuild 双导出在位', () => {
    const src = PAGE_STACK();
    expect(src).toMatch(/export function hasAppInstance\(appId\)/);
    expect(src).toMatch(/export function deferAppInstanceBuild\(appId\)/);
  });

  it('deferAppInstanceBuild 两跳 rAF 语义：hops < 2 续跳、第二跳 ensureAppInstance', () => {
    const src = PAGE_STACK();
    const body = src.slice(src.indexOf('export function deferAppInstanceBuild'));
    expect(body).toMatch(/if \(\+\+hops < 2\)/);
    expect(body).toMatch(/ensureAppInstance\(appId\)/);
    // 幂等入口：在场即 return（秒关抢建后 defer 步零重复构建）
    expect(body).toMatch(/if \(appInstancesMap\.has\(appId\)\) return;/);
    // 构建完成后仅当应用仍在前台时补 renderPageStack（页位姿/冻结/事件尾部）
    expect(body).toMatch(/state\.currentApp && state\.currentApp\.id === appId\) renderPageStack\(\)/);
  });

  it('defer 可见性收尾豁免纪律：__actorHosted/__miniHosted 托管实例不隐藏（与 renderPageStack 同律）', () => {
    const src = PAGE_STACK();
    const body = src.slice(src.indexOf('export function deferAppInstanceBuild'));
    expect(body).toContain('__actorHosted');
    expect(body).toContain('__miniHosted');
  });

  it('openApp 分流接线：hasAppInstance ? renderPageStack : deferAppInstanceBuild', () => {
    const src = WINDOW();
    expect(src).toMatch(/if \(hasAppInstance\(app\.id\)\) \{\s*renderPageStack\(\);\s*\} else \{\s*deferAppInstanceBuild\(app\.id\);\s*\}/);
    // 冷启动曲线自动成立：分流后紧跟 isAppInstanceWarm 探针（defer 场景 false → cold）
    const idx = src.indexOf('deferAppInstanceBuild(app.id);');
    const after = src.slice(idx, idx + 400);
    expect(after).toMatch(/state\.contentWarm = isAppInstanceWarm\(app\.id\)/);
  });

  it('快速切换兜底：demoteCurrentAppToClosingActor 与 closeApp 入口同步抢建（幂等）', () => {
    const src = WINDOW();
    // demote 段：state.shrinkToCard = false 之后、const prevApp 之前抢建
    const demote = src.slice(src.indexOf('export function demoteCurrentAppToClosingActor'));
    expect(demote.slice(0, 900)).toMatch(/ensureAppInstance\(state\.currentApp\.id\)/);
    // closeApp 段：函数入口守卫后抢建
    const close = src.slice(src.indexOf('export function closeApp'));
    expect(close.slice(0, 700)).toMatch(/ensureAppInstance\(state\.currentApp\.id\)/);
  });

  it('import 面收口：app-window 从 page-stack 引入三件套（单源无复制实现）', () => {
    const src = WINDOW();
    expect(src).toMatch(/import \{ renderPageStack, isAppInstanceWarm, hasAppInstance, deferAppInstanceBuild, ensureAppInstance \} from '\.\/page-stack\.js';/);
  });
});

describe('v11.52 P2 动画期浮层降级：挂类与 CSS 规则', () => {
  const BG = () => read('ios-desktop/js/bg-freeze.js');
  const CSS = () => read('ios-desktop/css/app-window.css');

  it('setAnimFreezeLock 挂 root 类：ios-anim-freeze 随锁同生共死', () => {
    const src = BG();
    const idx = src.indexOf('export function setAnimFreezeLock');
    expect(src.slice(idx, idx + 700)).toMatch(/document\.documentElement\.classList\.toggle\('ios-anim-freeze', animFreezeLock\)/);
    // 幂等早退仍在挂类之前（状态不变零副作用）
    expect(src.slice(idx, idx + 300)).toMatch(/if \(animFreezeLock === !!on\) return;/);
  });

  it('CSS 降级段覆盖动画期在场浮层七面（dock/widget 卡/长按菜单/文件夹两层/夹图标/all-apps scrim/快切卡）', () => {
    const css = CSS();
    const seg = css.slice(css.indexOf('v11.52 P2 开合动画期 backdrop 浮层合成器降级'));
    for (const sel of [
      'html.ios-anim-freeze .dock',
      'html.ios-anim-freeze .widget-card',
      'html.ios-anim-freeze .widget-source-menu',
      'html.ios-anim-freeze .folder-overlay',
      'html.ios-anim-freeze .folder-panel',
      'html.ios-anim-freeze .folder-icon',
      'html.ios-anim-freeze .all-apps-overlay .aa-scrim',
      'html.ios-anim-freeze .quick-switch-hint .qsh-card',
    ]) {
      expect(seg).toContain(sel + ' {');
    }
  });

  it('降级规则形态：backdrop-filter 双前缀置 none（每面）+ 底色补偿同步加深', () => {
    const css = CSS();
    const seg = css.slice(css.indexOf('v11.52 P2 开合动画期 backdrop 浮层合成器降级'));
    // 每个规则块都含 backdrop-filter: none（含 -webkit 前缀）
    const blocks = seg.split('}').filter((b) => b.includes('html.ios-anim-freeze'));
    expect(blocks.length).toBe(8);
    for (const b of blocks) {
      expect(b).toContain('backdrop-filter: none');
      expect(b).toContain('-webkit-backdrop-filter: none');
      expect(b).toContain('background:');
    }
  });

  it('底色补偿值锚：dock 0.42→0.82、widget 卡 0.62→0.88（毛玻璃摘除后层离感保持）', () => {
    const css = CSS();
    const seg = css.slice(css.indexOf('html.ios-anim-freeze .dock'));
    expect(seg.slice(0, 160)).toContain('rgba(30, 32, 38, 0.82)');
    const widget = seg.slice(seg.indexOf('html.ios-anim-freeze .widget-card'));
    expect(widget.slice(0, 160)).toContain('rgba(28, 30, 34, 0.88)');
  });
});
