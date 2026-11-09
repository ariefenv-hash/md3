// ==================== global-actions.test.js — #113 电源菜单 GlobalActionsDialog A17 形态对齐 ====================
//
// 覆盖（R87 窗主作业，GlobalActionsDialog / GlobalActionsColumnLayout 对标）：
//   · aosp/global-actions.js 纯逻辑：GA_ACTIONS 动作注册表（config_globalActionsList 语义）、
//     resolveVisibleActions 可见性判定（keyguard showing 分支：lockdown 锁屏态隐藏 /
//     emergency 常显 / screenshot 部分配置占位）、createConfirmMachine 二次确认状态机
//     （ShutDownConfirm 语义）、createShutdownStage 关机/重启阶段机（fade→off / fade→rebooting）
//   · quick-settings.js 接线锚：GA_ITEM_DEFS 五项装配、确认卡渲染、关机态页
//     （旧 body.innerHTML 直换退役——议题重点修③）、lockdown → lockNow、haptic 两档
//   · HTML/CSS 锚：.ga-col 竖列 / .ga-item 图标左文案右（global_actions_item 同构）/
//     .ga-confirm 确认卡 / .md-shutdown-screen 关机态页
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GA_ACTION_IDS,
  GA_ACTIONS,
  GA_CONFIRM_TEXT,
  GA_HAPTIC_MS,
  resolveVisibleActions,
  createConfirmMachine,
  createShutdownStage,
} from '../ios-desktop/js/aosp/global-actions.js';

const R = (p) => join(dirname(fileURLToPath(import.meta.url)), '..', 'ios-desktop', p);
const QS = readFileSync(R('js/quick-settings.js'), 'utf8');
const HTML = readFileSync(R('index.html'), 'utf8');
const CSS = readFileSync(R('css/pull-panels.css'), 'utf8');
const RIPPLE = readFileSync(R('js/ripple-fx.js'), 'utf8');
/** 剥注释扫描（R77 同款：防注释字面误伤） */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('v113-A · GA_ACTIONS 动作注册表（config_globalActionsList 语义）', () => {
  it('A1 五项动作在表：关机/重启/锁定/紧急求救/截图，id 字面量 AOSP 同源', () => {
    expect(GA_ACTION_IDS).toEqual({
      POWER_OFF: 'power',
      RESTART: 'restart',
      LOCKDOWN: 'lockdown',
      EMERGENCY: 'emergency',
      SCREENSHOT: 'screenshot',
    });
    expect(GA_ACTIONS.map((a) => a.id)).toEqual(['power', 'restart', 'lockdown', 'emergency', 'screenshot']);
  });

  it('A2 关机/重启过确认卡（议题 #113 要求②），其余单击直执行', () => {
    const byId = Object.fromEntries(GA_ACTIONS.map((a) => [a.id, a]));
    expect(byId.power.confirm).toBe(true);
    expect(byId.restart.confirm).toBe(true);
    expect(byId.lockdown.confirm).toBe(false);
    expect(byId.emergency.confirm).toBe(false);
    expect(byId.power.danger).toBe(true);
  });

  it('A3 确认卡文案：关机/重启双份（ShutDownConfirm 语义）', () => {
    expect(GA_CONFIRM_TEXT.power.title).toBe('关机确认');
    expect(GA_CONFIRM_TEXT.restart.title).toBe('重启确认');
    expect(GA_CONFIRM_TEXT.power.confirmLabel).toBe('关机');
    expect(GA_CONFIRM_TEXT.restart.confirmLabel).toBe('重启');
  });
});

describe('v113-B · resolveVisibleActions 可见性判定（mKeyguardShowing 分支同构）', () => {
  it('B1 解锁态：五动作中 lockdown 在列、screenshot 缺省隐藏（#94 未落地占位）', () => {
    const ids = resolveVisibleActions({ locked: false, screenshotAvailable: false }).map((a) => a.id);
    expect(ids).toContain('power');
    expect(ids).toContain('restart');
    expect(ids).toContain('lockdown');
    expect(ids).toContain('emergency');
    expect(ids).not.toContain('screenshot');
  });

  it('B2 锁屏态：lockdown 隐藏（语义冗余——已在锁屏），emergency 常显（EmergencyAction 不受锁定限制）', () => {
    const ids = resolveVisibleActions({ locked: true }).map((a) => a.id);
    expect(ids).not.toContain('lockdown');
    expect(ids).toContain('emergency');
    expect(ids).toContain('power');
    expect(ids).toContain('restart');
  });

  it('B3 screenshotAvailable=true 时截图入列（部分配置语义）', () => {
    const ids = resolveVisibleActions({ locked: false, screenshotAvailable: true }).map((a) => a.id);
    expect(ids).toContain('screenshot');
  });

  it('B4 判定不重排：输出保持注册表顺序', () => {
    const seq = resolveVisibleActions({ locked: false, screenshotAvailable: true }).map((a) => a.id);
    expect(seq).toEqual(['power', 'restart', 'lockdown', 'emergency', 'screenshot']);
  });
});

describe('v113-C · createConfirmMachine 二次确认状态机（ShutDownConfirm 同构）', () => {
  it('C1 request → pending + 文案；confirm → 消费 actionId 回 idle', () => {
    const m = createConfirmMachine();
    expect(m.__state().phase).toBe('idle');
    const r = m.request('restart');
    expect(r.ok).toBe(true);
    expect(r.text.title).toBe('重启确认');
    expect(m.__state().phase).toBe('pending');
    const c = m.confirm();
    expect(c).toEqual({ ok: true, actionId: 'restart' });
    expect(m.__state().phase).toBe('idle');
  });

  it('C2 cancel → 回 idle 零执行', () => {
    const m = createConfirmMachine();
    m.request('power');
    expect(m.cancel().ok).toBe(true);
    expect(m.confirm().ok).toBe(false); // 已取消，确认无效
    expect(m.__state().phase).toBe('idle');
  });

  it('C3 未 request 直接 confirm/cancel → not_pending 拒绝', () => {
    const m = createConfirmMachine();
    expect(m.confirm()).toEqual({ ok: false, reason: 'not_pending' });
    expect(m.cancel()).toEqual({ ok: false, reason: 'not_pending' });
  });

  it('C4 未知动作 request → no_confirm_text 拒绝（emergency/lockdown 无确认卡）', () => {
    const m = createConfirmMachine();
    expect(m.request('emergency').ok).toBe(false);
    expect(m.request('lockdown').ok).toBe(false);
  });

  it('C5 pendingText 直读（UI 渲染契约）', () => {
    const m = createConfirmMachine();
    expect(m.pendingText()).toBeNull();
    m.request('power');
    expect(m.pendingText().body).toContain('关机');
  });
});

describe('v113-D · createShutdownStage 关机/重启阶段机（ShutdownThread 起始段同构）', () => {
  it('D1 shutdown：fading（fadeMs 窗）→ off 终态（关机态页停留）', async () => {
    const fired = [];
    const s = createShutdownStage({ fadeMs: 50, setTimeoutFn: (fn, ms) => fired.push([fn, ms]) });
    expect(s.phase).toBe('idle');
    const p = s.advance('shutdown');
    expect(s.phase).toBe('fading');
    // 手动触发注册的两个定时（fade 窗；shutdown 无 reboot hold）
    expect(fired.length).toBe(1);
    expect(fired[0][1]).toBe(50);
    fired[0][0]();
    const r = await p;
    expect(r.phase).toBe('off');
    expect(s.phase).toBe('off');
  });

  it('D2 restart：fading → rebooting（rebootHoldMs 黑屏停留）→ 消费方 reload', async () => {
    const fired = [];
    const s = createShutdownStage({ fadeMs: 30, rebootHoldMs: 70, setTimeoutFn: (fn, ms) => fired.push([fn, ms]) });
    const p = s.advance('restart');
    expect(s.phase).toBe('fading');
    expect(fired.length).toBe(1); // 第一个定时 = fade
    fired[0][0]();
    await new Promise((r) => setTimeout(r, 0)); // 让微任务推进至 rebooting 段
    expect(s.phase).toBe('rebooting');
    expect(fired.length).toBe(2); // 第二个定时 = reboot hold
    expect(fired[1][1]).toBe(70);
    fired[1][0]();
    await p;
    expect(s.phase).toBe('rebooting'); // 终态停留，消费方负责 reload
  });

  it('D3 终态幂等：off 后再 advance 不重播（防二次点击重复动画）', async () => {
    const fired = [];
    const s = createShutdownStage({ fadeMs: 10, setTimeoutFn: (fn) => fired.push(fn) });
    const p1 = s.advance('shutdown');
    fired[0]();
    await p1;
    const r2 = await s.advance('restart');
    expect(r2.phase).toBe('off'); // 直接返回当前终态
    expect(fired.length).toBe(1); // 零新定时
  });
});

describe('v113-E · quick-settings.js 接线锚（防回退）', () => {
  it('E1 纯逻辑层 import 在位 + 旧 body.innerHTML 直换退役（议题重点修③）', () => {
    const src = stripComments(QS);
    expect(src).toContain("from './aosp/global-actions.js'");
    // 旧实现字面量退役：不再有「已关机 (点击屏幕重启)」直换 body 的实现
    expect(src).not.toContain('已关机 (点击屏幕重启)');
    expect(src).not.toContain("document.body.innerHTML = '<div");
  });

  it('E2 关机态页走 .md-shutdown-screen + 点击开机 reload', () => {
    const src = stripComments(QS);
    expect(src).toContain("gaShowShutdownScreen('已关机 · 点击屏幕开机')");
    expect(src).toContain("screen.addEventListener('click', () => location.reload()");
    expect(src).toContain("stage.advance('shutdown')");
    expect(src).toContain("stage.advance('restart').then(() => location.reload())");
  });

  it('E3 lockdown → lockNow + toast（AOSP Lockdown 等价语义，#185 裁剪在注）', () => {
    const src = stripComments(QS);
    expect(src).toContain("id: 'lockdown'");
    expect(src).toContain("actionId === 'lockdown'");
    expect(src).toContain('lockNow()');
  });

  it('E4 动作路由分道：confirm 类过 showConfirm，其余 executeAction 直执行', () => {
    const src = stripComments(QS);
    expect(src).toContain('if (meta && meta.confirm) showConfirm(actionId);');
    expect(src).toContain('else executeAction(actionId);');
  });

  it('E5 haptic 两档在位（唤出 10 / 确认 20，GA_HAPTIC_MS 消费）', () => {
    expect(GA_HAPTIC_MS).toEqual({ open: 10, confirm: 20 });
    const src = stripComments(QS);
    expect(src).toContain('gaHaptic(GA_HAPTIC_MS.open)');
    expect(src).toContain('gaHaptic(GA_HAPTIC_MS.confirm)');
  });

  it('E6 打开面板复位确认卡视图（openPowerDialog 内 col/confirm 复位）', () => {
    const src = stripComments(QS);
    const openIdx = src.indexOf('export function openPowerDialog');
    const openBody = src.slice(openIdx, src.indexOf('overlay.classList.add', openIdx));
    expect(openBody).toContain('col.hidden = false');
    expect(openBody).toContain('confirmEl.hidden = true');
  });
});

describe('v113-F · HTML/CSS 形态锚（GlobalActionsColumnLayout 同构）', () => {
  it('F1 HTML：.ga-col 竖列 + 五动作 data-ga 属性 + 确认卡骨架', () => {
    expect(HTML).toContain('id="powerDialogOverlay"');
    expect(HTML).toContain('<div class="ga-col" id="gaCol">');
    expect(HTML).toContain('data-ga="power"');
    expect(HTML).toContain('data-ga="restart"');
    expect(HTML).toContain('data-ga="aod"');
    expect(HTML).toContain('data-ga="lockdown"');
    expect(HTML).toContain('data-ga="emergency"');
    expect(HTML).toContain('id="gaConfirm"');
    expect(HTML).toContain('id="gaConfirmOk"');
    expect(HTML).toContain('id="gaConfirmCancel"');
  });

  it('F2 CSS：侧边竖列（right:16px 贴缘）+ 竖向 flex + .ga-item 圆角 24dp 卡', () => {
    expect(CSS).toMatch(/\.power-dialog-card\s*\{[^}]*position:\s*fixed/);
    expect(CSS).toMatch(/\.power-dialog-card\s*\{[^}]*right:\s*16px/);
    expect(CSS).toMatch(/\.ga-col\s*\{[^}]*flex-direction:\s*column/);
    expect(CSS).toMatch(/\.ga-item\s*\{[^}]*border-radius:\s*24px/);
  });

  it('F3 CSS：确认卡 hidden 切换 + 关机态页样式在位', () => {
    expect(CSS).toMatch(/\.ga-confirm\[hidden\]\s*\{[^}]*display:\s*none/);
    expect(CSS).toMatch(/\.md-shutdown-screen\s*\{[^}]*background:\s*#000/);
  });

  it('F4 ripple 选择器跟随重构（.ga-item 接班 .power-action-tile）', () => {
    expect(stripComments(RIPPLE)).toContain("'.ga-item'");
    expect(stripComments(RIPPLE)).not.toContain("'.power-action-tile'");
  });
});
