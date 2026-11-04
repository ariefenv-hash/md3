// ==================== v98-screen-pinning.test.js — #98 屏幕固定（AOSP ScreenPinning 同构） ====================
// A：常量与文案族（ScreenPinningNotify L33 / ViewConfiguration.getLongPressTimeout / strings 15 条）
// B：变体解析真跑（escape 三分支 / description 五分支 / bullets 三条）
// C：notify 节流状态机真跑（1s 节流 + start/exit 直通，now 注入）
// D：状态机真跑（prompt→pinned→intercept 矩阵→exitAttempt；凭据门控双路；forceUnpin）
// E：接线锚（recent-apps 四面 / nav-bar 三面 / gestures 冻结 / app-window 守卫 + 避环 / 桥零 DOM）
// F：快照锚（pinning 快照双文件 + README 权威链）
// G：CSS 锚（面板 z 域 / 96dp / 1000ms+300ms / 令牌零裸色 / reduced-motion）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SHOW_TOAST_MINIMUM_INTERVAL,
  PIN_BACK_LONGPRESS_MS,
  PINNING_STRINGS,
  ESCAPE_TOAST_VARIANTS,
  DESCRIPTION_VARIANTS,
  resolveEscapeToastVariant,
  resolveDescriptionVariant,
  buildPromptBullets,
  createScreenPinningNotify,
  createScreenPinningState,
} from '../ios-desktop/js/aosp/screen-pinning.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

describe('A. 常量与文案族（AOSP 逐字锚）', () => {
  it('A1 SHOW_TOAST_MINIMUM_INTERVAL = 1000（ScreenPinningNotify.java L33）', () => {
    expect(SHOW_TOAST_MINIMUM_INTERVAL).toBe(1000);
  });
  it('A2 PIN_BACK_LONGPRESS_MS = 400（ViewConfiguration.getLongPressTimeout() 框架默认映射）', () => {
    expect(PIN_BACK_LONGPRESS_MS).toBe(400);
  });
  it('A3 PINNING_STRINGS 15 键全族（键名与 AOSP R.string 资源名同名）', () => {
    const keys = Object.keys(PINNING_STRINGS);
    expect(keys.length).toBe(15);
    [
      'screen_pinning_title', 'screen_pinning_description', 'screen_pinning_description_recents_invisible',
      'screen_pinning_description_gestural', 'screen_pinning_description_accessible',
      'screen_pinning_description_recents_invisible_accessible', 'screen_pinning_exposes_personal_data',
      'screen_pinning_can_open_other_apps', 'screen_pinning_toast', 'screen_pinning_toast_recents_invisible',
      'screen_pinning_toast_gesture_nav', 'screen_pinning_positive', 'screen_pinning_negative',
      'screen_pinning_start', 'screen_pinning_exit',
    ].forEach((k) => expect(keys).toContain(k));
  });
  it('A4 变体域：escape 三变体 / description 五变体', () => {
    expect(ESCAPE_TOAST_VARIANTS.length).toBe(3);
    expect(DESCRIPTION_VARIANTS.length).toBe(5);
  });
});

describe('B. 变体解析真跑（ScreenPinningNotify L63-67 / Request L307-323 同构）', () => {
  it('B1 escape 三分支：gesture 优先 / recents 可见 / recents 不可见', () => {
    expect(resolveEscapeToastVariant(true, true)).toBe('screen_pinning_toast_gesture_nav');
    expect(resolveEscapeToastVariant(true, false)).toBe('screen_pinning_toast_gesture_nav');
    expect(resolveEscapeToastVariant(false, true)).toBe('screen_pinning_toast');
    expect(resolveEscapeToastVariant(false, false)).toBe('screen_pinning_toast_recents_invisible');
  });
  it('B2 description 五分支（gestural 优先 / overview×触控探索 2×2）', () => {
    expect(resolveDescriptionVariant({ isGestural: true })).toBe('screen_pinning_description_gestural');
    expect(resolveDescriptionVariant({})).toBe('screen_pinning_description');
    expect(resolveDescriptionVariant({ touchExploration: true })).toBe('screen_pinning_description_accessible');
    expect(resolveDescriptionVariant({ overviewEnabled: false })).toBe('screen_pinning_description_recents_invisible');
    expect(resolveDescriptionVariant({ overviewEnabled: false, touchExploration: true }))
      .toBe('screen_pinning_description_recents_invisible_accessible');
  });
  it('B3 bullets 三条（描述变体 + 个人数据 + 可开其他应用）', () => {
    const b = buildPromptBullets('screen_pinning_description');
    expect(b).toEqual([
      'screen_pinning_description',
      'screen_pinning_exposes_personal_data',
      'screen_pinning_can_open_other_apps',
    ]);
  });
});

describe('C. notify 节流状态机（now 注入真跑）', () => {
  it('C1 escape 1s 内重复忽略返回 null，越线恢复', () => {
    let t = 10000;
    const n = createScreenPinningNotify({ now: () => t });
    expect(n.showEscapeToast(false, true)).toBe('screen_pinning_toast');   // 首示
    t += 500;
    expect(n.showEscapeToast(false, true)).toBe(null);                     // 1s 内忽略（L56-59）
    t += 501;                                                              // 累计 1001ms
    expect(n.showEscapeToast(false, true)).toBe('screen_pinning_toast');   // 恢复
  });
  it('C2 start/exit toast 直通无节流', () => {
    let t = 0;
    const n = createScreenPinningNotify({ now: () => t });
    expect(n.showStartToast()).toBe('screen_pinning_start');
    expect(n.showExitToast()).toBe('screen_pinning_exit');
    expect(n.showStartToast()).toBe('screen_pinning_start');   // 连发不节流（AOSP 直通语义）
  });
});

describe('D. 状态机真跑（ScreenPinningRequest/showPrompt→startSystemLockTaskMode→stop 语义位）', () => {
  it('D1 全生命周期：prompt→pinned→intercept 矩阵→exitAttempt→unpinned', () => {
    const ctl = createScreenPinningState();
    expect(ctl.intercept('home')).toBe('pass');            // 非 pinned 恒 pass
    expect(ctl.requestPrompt('msg', true)).toEqual({ taskId: 'msg', allowCancel: true });
    expect(ctl.phase()).toBe('prompting');
    // prompting 态 intercept 仍 pass（守卫只对 pinned 生效——面板期系统动作未被锁）
    expect(ctl.intercept('home')).toBe('pass');
    expect(ctl.confirmPrompt('msg')).toEqual({ pinned: true, taskId: 'msg' });
    expect(ctl.isPinned()).toBe(true);
    // intercept 矩阵（AOSP pinned 语义）
    expect(ctl.intercept('home')).toBe('blocked');
    expect(ctl.intercept('recents')).toBe('blocked');
    expect(ctl.intercept('gesture')).toBe('blocked');
    expect(ctl.intercept('open-app', 'msg')).toBe('pass');      // 同应用 resume 放行
    expect(ctl.intercept('open-app', 'notes')).toBe('blocked'); // 换应用拦截
    expect(ctl.intercept('back-internal')).toBe('pass');        // 应用内页返回放行
    expect(ctl.intercept('back-root')).toBe('blocked');         // 根页关闭被拦
    expect(ctl.intercept('exit')).toBe('pass');                 // 长按退出通道
    // 退出（无凭据直退 = stopLockTaskMode 语义位）
    expect(ctl.exitAttempt()).toEqual({ exited: true, taskId: 'msg' });
    expect(ctl.isPinned()).toBe(false);
    expect(ctl.intercept('home')).toBe('pass');
  });
  it('D2 已 pinned 重复 requestPrompt 拒绝 / 非 prompting confirm/cancel 拒绝', () => {
    const ctl = createScreenPinningState();
    ctl.requestPrompt('msg');
    ctl.confirmPrompt('msg');
    expect(ctl.requestPrompt('notes')).toBe(null);   // pinned 期重复请求拒绝
    expect(ctl.confirmPrompt('notes')).toBe(null);   // 非 prompting confirm 拒绝
    expect(ctl.cancelPrompt()).toBe(false);          // 非 prompting cancel 拒绝
  });
  it('D3 cancelPrompt 复位 prompting→unpinned', () => {
    const ctl = createScreenPinningState();
    ctl.requestPrompt('msg');
    expect(ctl.cancelPrompt()).toBe(true);
    expect(ctl.phase()).toBe('unpinned');
  });
  it('D4 凭据门控：verify 拒绝保持 pinned + credentialDenied，通过则退出', () => {
    let allow = false;
    const ctl = createScreenPinningState({ verifyCredential: () => allow });
    ctl.requestPrompt('msg');
    ctl.confirmPrompt('msg');
    const denied = ctl.exitAttempt();
    expect(denied).toEqual({ exited: false, credentialDenied: true });
    expect(ctl.isPinned()).toBe(true);
    allow = true;
    expect(ctl.exitAttempt()).toEqual({ exited: true, taskId: 'msg' });
  });
  it('D5 verifyCredential 抛错按拒绝处置（防凭据实现异常绕过门控）', () => {
    const ctl = createScreenPinningState({ verifyCredential: () => { throw new Error('boom'); } });
    ctl.requestPrompt('msg');
    ctl.confirmPrompt('msg');
    expect(ctl.exitAttempt()).toEqual({ exited: false, credentialDenied: true });
  });
  it('D6 forceUnpin 收场（锁屏/系统收场路径）', () => {
    const ctl = createScreenPinningState();
    ctl.requestPrompt('msg');
    ctl.confirmPrompt('msg');
    expect(ctl.forceUnpin()).toBe(true);
    expect(ctl.phase()).toBe('unpinned');
    expect(ctl.forceUnpin()).toBe(false);   // 未 pinned 时幂等
  });
});

describe('E. 接线锚（源码文本）', () => {
  const ra = read('ios-desktop/js/recent-apps.js');
  const nb = read('ios-desktop/js/nav-bar.js');
  const ge = read('ios-desktop/js/gestures.js');
  const aw = read('ios-desktop/js/app-window.js');
  const bridge = read('ios-desktop/js/screen-pinning.js');

  it('E1 recent-apps：固定入口 + 确认面板 + 退出导出 + recents 守卫', () => {
    expect(ra).toContain("id=\"recentPinBtn\"");
    expect(ra).toContain('function showPinningPrompt()');
    expect(ra).toContain('export function exitScreenPinning()');
    expect(ra).toContain('export function escapeToastOnce()');
    expect(ra).toContain("pinCtl.intercept('recents') === 'blocked'");
    expect(ra).toContain('pinCtl.confirmPrompt(taskId)');
    expect(ra).toContain('document.body.dataset.pinned = taskId');
  });
  it('E2 recent-apps：AOSP 点背景 = 确认语义在录', () => {
    expect(ra).toContain('点背景（mRequestWindow 本体）= 确认');
  });
  it('E3 nav-bar：home 拦截 / back-root 拦截 / 长按退出 400ms', () => {
    expect(nb).toContain("pinCtl.intercept('home') === 'blocked'");
    expect(nb).toContain("pinCtl.intercept('back-root') === 'blocked'");
    expect(nb).toContain('backLongPressTimer = setTimeout(() => {');
    expect(nb).toContain('BACK_LONGPRESS_MS');
    expect(nb).toContain('exitScreenPinning()');
  });
  it('E3b nav-bar 坑修复锚：home 键 capture 重定向 → lastDownBtn 委托回落（e2e 实测既有 bug 顺手修复）', () => {
    expect(nb).toContain('lastDownBtn');
    expect(nb).toMatch(/e\.target\.closest\('\.nvb-btn'\)\s*\|\|\s*\(fusion\.lastDownBtn && barEl\.contains\(fusion\.lastDownBtn\)/);
    expect(nb).toContain('fusion.suppressClick = true;   // 长按已消费本次按压');
  });
  it('E4 gestures：pinned 态手势引擎整体冻结（onDown 早退）', () => {
    expect(ge).toContain('if (pinCtl.isPinned()) return;');
  });
  it('E5 app-window：open-app 守卫 + 同应用 resume 放行 + 动态 import 避环注释', () => {
    expect(aw).toContain("pinCtl.intercept('open-app', app.id) === 'blocked'");
    expect(aw).toContain("import { pinCtl, pinNotify, PINNING_STRINGS } from './screen-pinning.js';");
    expect(aw).toMatch(/动态 import/);
  });
  it('E6 桥模块零 DOM 零 window（纯单例装配）', () => {
    expect(bridge).not.toMatch(/\bdocument\./);
    expect(bridge).not.toMatch(/window\./);
    expect(bridge).toContain('export const pinCtl');
    expect(bridge).toContain('export const pinNotify');
  });
  it('E7 确认面板消费描述变体与 bullets（aosp 纯函数）', () => {
    expect(ra).toContain('resolveDescriptionVariant({ isGestural: false, overviewEnabled: true, touchExploration: false })');
    expect(ra).toContain('buildPromptBullets(descKey)');
  });
});

describe('F. 快照锚（docs/reference 权威链）', () => {
  it('F1 双文件快照在库（77 行 Notify / 429 行 Request）', () => {
    const notify = read('docs/reference/frameworks-base/systemui/pinning/ScreenPinningNotify.java');
    const request = read('docs/reference/frameworks-base/systemui/pinning/ScreenPinningRequest.java');
    expect(notify).toContain('SHOW_TOAST_MINIMUM_INTERVAL = 1000');
    expect(notify).toContain('showEscapeToast(boolean isGestureNavEnabled, boolean isRecentsButtonVisible)');
    expect(request).toContain('public void showPrompt(int taskId, boolean allowCancel)');
    expect(request).toContain('startSystemLockTaskMode(taskId)');
    expect(request).toContain('OFFSET_DP = 96');
    expect(request.split('\n').length).toBeGreaterThan(420);
  });
  it('F2 README 权威链在录（实拉日期 + 文案真源 + 三裁决）', () => {
    const readme = read('docs/reference/frameworks-base/systemui/pinning/README.md');
    expect(readme).toContain('2026-11-04');
    expect(readme).toContain('screen_pinning_exposes_personal_data');
    expect(readme).toContain('ViewConfiguration.getLongPressTimeout()');
  });
});

describe('G. CSS 锚（#179 准入 + AOSP 动画参数）', () => {
  const css = read('ios-desktop/css/pixel-features.css');
  it('G1 面板 z 域 8000（recents 750 之上）+ 背景渐入 1s + 面板 300ms', () => {
    expect(css).toMatch(/\.sp-prompt-overlay\s*\{[^}]*z-index:\s*8000/);
    expect(css).toMatch(/spOverlayIn 1s ease/);
    expect(css).toMatch(/spPanelIn 0\.3s cubic-bezier\(0, 0, 0\.2, 1\)/);   // DecelerateInterpolator
    expect(css).toContain('translateY(96px)');                              // AOSP OFFSET_DP=96
  });
  it('G2 全 --md-* 令牌零裸色（hex 仅允许 fallback 位）', () => {
    let seg = css.slice(css.indexOf('.sp-prompt-overlay'));
    seg = seg.replace(/\/\*[\s\S]*?\*\//g, '');   // 先剥块注释（段头含 #98/#179 字面，非色值）
    seg.split('\n').forEach((line) => {
      if (line.trim().startsWith('//')) return;
      if (!line.includes('#')) return;
      // 每个裸 hex 必须出现在 var(..., fallback) 的 fallback 位
      const stripped = line.replace(/var\([^)]*#[0-9a-fA-F]{3,8}[^)]*\)/g, '');
      expect(stripped.includes('#')).toBe(false);
    });
  });
  it('G3 reduced-motion 免动画 + 600px 断点（#179 准入②）', () => {
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*?\.sp-prompt-overlay \{ animation: none; \}/);
    expect(css).toMatch(/@media \(max-width: 600px\)[\s\S]*?\.sp-prompt \{ padding: 20px 20px 12px; \}/);
  });
});
