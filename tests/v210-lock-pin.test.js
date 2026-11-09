// ==================== v210-lock-pin.test.js — #210 锁屏 PIN 体系（v10.93 · R111 窗主作业） ====================
//
// #185 消费面第一站（立题规格 §3）：lock-pin.js 纯逻辑核 + 存储单例 + lock-screen.js
// bouncer 接线 + settings.js 页 28「屏幕锁定」行转正。
//
// 覆盖：
//   · 常量冻结：PIN_MIN/MAX_LENGTH / FAILED_ATTEMPTS_BEFORE_TIMEOUT=5 /
//     FAILED_ATTEMPT_TIMEOUT_MS=30000（AOSP LockPatternUtils 经验常量标注在录）/
//     PIN_STATE_FIELDS
//   · validatePinCandidate：4 位下界/3 位拒绝/纯数字域/16 位上界/空串
//   · shouldThrottle 判定链：5 次阈值边界（4 不节流/5 节流）/30s 窗界（到期不节流）/
//     垃圾输入兜底（NaN→0）
//   · normalizePinState / parse·serialize codec：垃圾档回落 / hex64 防御 / 迭代数钳制 /
//     往返一致 / 损坏 JSON 档
//   · createLockPinStore 注入工厂：setPin/has/clearPin/recordFail 递增+lastFailAt/
//     recordSuccess 清零/throttleInfo 观测零副作用/快照副本防外部 mutation
//   · 接线锚（源码字符串）：lock-screen bouncer 五面（手势分支/import/DOM 键盘/
//     快捷沿复位/测试钩子）+ settings 页 28 转正四面（openPinSetup/警告不阻断/
//     摘要动态化/清除验证链）+ 桥安装
//   · 回归锚：未设 PIN 零变化（手势分支 has() 门）/ instantUnlock 钩子零 PIN 拦截 /
//     #185 核零触碰（文件不被本议题改写）/ 页 28 更多安全设置 toast 保留
//   · 版本锚：pkg 10.93.0 + 版本串

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PIN_MIN_LENGTH, PIN_MAX_LENGTH, FAILED_ATTEMPTS_BEFORE_TIMEOUT, FAILED_ATTEMPT_TIMEOUT_MS,
  PIN_STATE_FIELDS, validatePinCandidate, shouldThrottle,
  normalizePinState, parsePinState, serializePinState, createLockPinStore,
} from '../ios-desktop/js/aosp/lock-pin.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(ROOT, 'ios-desktop/js/aosp/lock-pin.js'), 'utf-8');
const LOCK_SRC = readFileSync(join(ROOT, 'ios-desktop/js/lock-screen.js'), 'utf-8');
const SETTINGS_SRC = readFileSync(join(ROOT, 'ios-desktop/js/apps/settings.js'), 'utf-8');
const CSS_SRC = readFileSync(join(ROOT, 'ios-desktop/css/lock-screen.css'), 'utf-8');
const HEURISTIC_SRC = readFileSync(join(ROOT, 'ios-desktop/js/aosp/weak-password-heuristics.js'), 'utf-8');
const PKG = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));

const memStore = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};

describe('v10.93 #210 常量面（AOSP 经验常量标注在录）', () => {
  it('PIN 长度域 + 节流常量冻结', () => {
    expect(PIN_MIN_LENGTH).toBe(4);
    expect(PIN_MAX_LENGTH).toBe(16);
    expect(FAILED_ATTEMPTS_BEFORE_TIMEOUT).toBe(5);
    expect(FAILED_ATTEMPT_TIMEOUT_MS).toBe(30000);
  });
  it('PIN_STATE_FIELDS 五字段冻结（存档形态稳定契约）', () => {
    expect(PIN_STATE_FIELDS).toEqual(['hashHex', 'saltHex', 'iterations', 'failedAttempts', 'lastFailAt']);
  });
  it('经验常量来源标注（keyguard 源 404 不可达 → #170 查不到标注纪律）', () => {
    expect(SRC).toContain('标注经验值非本轮实拉');
  });
});

describe('v10.93 #210 validatePinCandidate', () => {
  it('4 位下界通过 / 3 位拒绝 / 12 位通过', () => {
    expect(validatePinCandidate('1234').ok).toBe(true);
    expect(validatePinCandidate('123').ok).toBe(false);
    expect(validatePinCandidate('123456789012').ok).toBe(true);
  });
  it('纯数字域：字母/混合/负号拒绝 + 空串拒绝', () => {
    expect(validatePinCandidate('abcd').ok).toBe(false);
    expect(validatePinCandidate('12a4').ok).toBe(false);
    expect(validatePinCandidate('').ok).toBe(false);
    expect(validatePinCandidate(null).ok).toBe(false);
  });
  it('17 位越上界拒绝（PIN_MAX_LENGTH 工程钳制）', () => {
    expect(validatePinCandidate('1234567890123456').ok).toBe(true);
    expect(validatePinCandidate('12345678901234567').ok).toBe(false);
  });
});

describe('v10.93 #210 shouldThrottle 判定链（Gatekeeper Web 近似）', () => {
  const T0 = 1000000;
  it('阈值边界：4 次不节流 / 5 次节流', () => {
    expect(shouldThrottle(4, T0, T0 + 1000).throttled).toBe(false);
    expect(shouldThrottle(5, T0, T0 + 1000).throttled).toBe(true);
    expect(shouldThrottle(5, T0, T0 + 1000).remainingMs).toBe(29000);
  });
  it('30s 窗界：到期不节流 / 恰到期边界', () => {
    expect(shouldThrottle(5, T0, T0 + 30000).throttled).toBe(false);
    expect(shouldThrottle(5, T0, T0 + 29999).throttled).toBe(true);
  });
  it('冷却到期后计数保留语义在录（下次失败即刻再触发）', () => {
    expect(SRC).toContain('冷却到期后计数保留');
  });
  it('垃圾输入兜底：NaN 按 0 处理不抛错', () => {
    expect(shouldThrottle(NaN, NaN, NaN).throttled).toBe(false);
    expect(shouldThrottle(undefined, undefined, Date.now()).throttled).toBe(false);
  });
});

describe('v10.93 #210 normalize / codec', () => {
  it('垃圾档全量回落：null/数组/非对象 → 未设 PIN 默认态', () => {
    for (const junk of [null, undefined, 'x', 42, [], {}]) {
      const n = normalizePinState(junk);
      expect(n.hashHex).toBe('');
      expect(n.saltHex).toBe('');
      expect(n.failedAttempts).toBe(0);
      expect(n.lastFailAt).toBe(0);
    }
  });
  it('hex64 防御：垃圾 hashHex/saltHex 回落空串（未设态）', () => {
    expect(normalizePinState({ hashHex: 'xyz' }).hashHex).toBe('');
    expect(normalizePinState({ hashHex: 'a'.repeat(63) }).hashHex).toBe('');
    expect(normalizePinState({ hashHex: 'A'.repeat(64) }).hashHex).toBe(''); // 大写 hex 不收（存档形态小写）
    expect(normalizePinState({ hashHex: 'a'.repeat(64) }).hashHex).toBe('a'.repeat(64));
  });
  it('iterations 钳制（1000–10000000 域）+ failedAttempts 9999 钳制', () => {
    expect(normalizePinState({ iterations: 0 }).iterations).toBe(100000);
    expect(normalizePinState({ iterations: 100 }).iterations).toBe(1000);
    expect(normalizePinState({ iterations: 99999999 }).iterations).toBe(10000000);
    expect(normalizePinState({ failedAttempts: 99999 }).failedAttempts).toBe(9999);
  });
  it('hex 域分域：hashHex=64 hex / saltHex=32 hex（16B 盐域，#185 generateSalt 形态）；跨域互拒', () => {
    expect(normalizePinState({ hashHex: 'a'.repeat(64), saltHex: 'c'.repeat(32) })).toMatchObject({ hashHex: 'a'.repeat(64), saltHex: 'c'.repeat(32) });
    expect(normalizePinState({ saltHex: 'c'.repeat(64) }).saltHex).toBe(''); // 64 位盐不收（hashHex 域混淆防化——R111 实录坑回舂锚）
    expect(normalizePinState({ hashHex: 'a'.repeat(32) }).hashHex).toBe('');
  });
  it('codec 往返一致 + 损坏 JSON 档回落', () => {
    const st = { hashHex: 'b'.repeat(64), saltHex: 'c'.repeat(32), iterations: 100000, failedAttempts: 3, lastFailAt: 12345 };
    const round = parsePinState(serializePinState(st));
    expect(round).toEqual(st);
    expect(parsePinState('{broken json').hashHex).toBe('');
    expect(parsePinState(null).failedAttempts).toBe(0);
  });
});

describe('v10.93 #210 createLockPinStore 注入工厂', () => {
  it('未设态 has=false → setPin 入库 has=true（snapshot 深拷贝防外部 mutation）', () => {
    const store = createLockPinStore(memStore());
    expect(store.has()).toBe(false);
    store.setPin('a'.repeat(64), 'b'.repeat(32), 100000);
    expect(store.has()).toBe(true);
    expect(store.snapshot().saltHex).toBe('b'.repeat(32)); // 盐 32 hex 域入库（R111 实录坑回舂锚）
    const snap = store.snapshot();
    snap.hashHex = 'hacked';
    expect(store.snapshot().hashHex).toBe('a'.repeat(64));
  });
  it('recordFail 递增 + lastFailAt 刷新 + 第 5 次沿 throttled=true', () => {
    const store = createLockPinStore(memStore());
    store.setPin('a'.repeat(64), 'b'.repeat(32), 100000);
    let last;
    for (let i = 1; i <= 5; i++) last = store.recordFail(1000 * i);
    expect(last.failedAttempts).toBe(5);
    expect(last.throttled).toBe(true);
    expect(last.remainingMs).toBe(30000);
    expect(store.throttleInfo(1000 * 5 + 15000).throttled).toBe(true);
    expect(store.throttleInfo(1000 * 5 + 30001).throttled).toBe(false);
  });
  it('recordSuccess 清零 + 改 PIN 不洗计数（setPin 保留 failedAttempts）', () => {
    const store = createLockPinStore(memStore());
    store.setPin('a'.repeat(64), 'b'.repeat(32), 100000);
    store.recordFail(1); store.recordFail(2); store.recordFail(3);
    store.setPin('d'.repeat(64), 'e'.repeat(32), 100000); // 改 PIN
    expect(store.snapshot().failedAttempts).toBe(3);
    store.recordSuccess();
    expect(store.snapshot().failedAttempts).toBe(0);
    expect(store.snapshot().lastFailAt).toBe(0);
  });
  it('clearPin 全字段复位 + 持久化往返（新 store 实例读同一 storage）', () => {
    const storage = memStore();
    const s1 = createLockPinStore(storage);
    s1.setPin('a'.repeat(64), 'b'.repeat(32), 100000);
    s1.recordFail(1);
    const s2 = createLockPinStore(storage); // 重启语义
    expect(s2.has()).toBe(true);
    expect(s2.snapshot().failedAttempts).toBe(1);
    s2.clearPin();
    const s3 = createLockPinStore(storage);
    expect(s3.has()).toBe(false);
    expect(s3.snapshot().failedAttempts).toBe(0);
  });
  it('真源键冻结：ios-desktop:lock-pin-v1', () => {
    expect(SRC).toContain("KEY = 'ios-desktop:lock-pin-v1'");
  });
});

describe('v10.93 #210 lock-screen bouncer 接线锚', () => {
  it('import 五面：store/桥/长度常量/节流常量/#185 verifyPassword', () => {
    expect(LOCK_SRC).toContain("from './aosp/lock-pin.js'");
    expect(LOCK_SRC).toContain('installLockPinBridge');
    expect(LOCK_SRC).toContain('PIN_MIN_LENGTH');
    expect(LOCK_SRC).toContain('FAILED_ATTEMPTS_BEFORE_TIMEOUT');
    expect(LOCK_SRC).toContain("import { verifyPassword } from './aosp/weak-password-heuristics.js'");
  });
  it('手势分支锚：has() 门 + 回弹 + openBouncer（未设 PIN 零变化承诺）', () => {
    expect(LOCK_SRC).toContain('if (shouldCommit && lockPinStore().has()) {');
    expect(LOCK_SRC).toContain('startUnlockSpring(false, dy, Math.max(velocity, 0.6));');
    expect(LOCK_SRC).toContain('openBouncer();');
  });
  it('bouncer DOM 键盘锚：3×4（1-9/0）+ del + ok + dots/msg/hint 五元素', () => {
    expect(LOCK_SRC).toContain('class="lock-bouncer" hidden');
    for (const d of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']) {
      expect(LOCK_SRC).toContain(`data-digit="${d}"`);
    }
    expect(LOCK_SRC).toContain('data-action="del"');
    expect(LOCK_SRC).toContain('data-action="ok"');
    expect(LOCK_SRC).toContain('lock-bouncer-dots');
    expect(LOCK_SRC).toContain('lock-bouncer-msg');
  });
  it('校验链锚：verifyPassword → 成功 recordSuccess+completeUnlock / 失败 recordFail+shake', () => {
    expect(LOCK_SRC).toContain('store.recordSuccess();');
    expect(LOCK_SRC).toContain('store.recordFail(Date.now());');
    expect(LOCK_SRC).toContain('closeBouncer();');
    expect(LOCK_SRC).toContain('completeUnlock();');
    expect(LOCK_SRC).toContain('startBouncerCooldownCountdown();');
  });
  it('回锁/快捷沿/测试钩子三复位锚（确定性纪律）', () => {
    expect(LOCK_SRC).toContain('closeBouncer(); // v10.93 #210：回锁 bouncer 复位');
    expect(LOCK_SRC).toContain('closeBouncer(); // v10.93 #210：快捷沿 bouncer 复位');
    expect(LOCK_SRC).toContain('closeBouncer(); // v10.93 #210：测试钩子 bouncer 复位');
  });
  it('bouncer 在场吞手势锚 + 密钥事件委托锚', () => {
    expect(LOCK_SRC).toContain('if (bouncerOpen) return; // v10.93 #210');
    expect(LOCK_SRC).toContain("e.target.closest('.lock-bouncer-key')");
  });
  it('__lockTest.pin 观测面 + 直调五钩（无头回归面）', () => {
    expect(LOCK_SRC).toContain('bouncerKey:');
    expect(LOCK_SRC).toContain('bouncerDel:');
    expect(LOCK_SRC).toContain('bouncerSubmit:');
    expect(LOCK_SRC).toContain('pin: () => {');
  });
});

describe('v10.93 #210 settings 页 28 转正接线锚', () => {
  it('行接转正四面：openPinSetup 调用/摘要 span/PIN 卡五元素/警告行', () => {
    expect(SETTINGS_SRC).toContain('window.__settingsSafetyV831.openPinSetup()');
    expect(SETTINGS_SRC).toContain('id="lockMethodSummary"');
    expect(SETTINGS_SRC).toContain('id="lockPinCard"');
    expect(SETTINGS_SRC).toContain('id="lockPinWarning"');
    expect(SETTINGS_SRC).toContain('id="lockPinInput"');
    expect(SETTINGS_SRC).toContain('id="lockPinConfirm"');
    expect(SETTINGS_SRC).toContain('id="lockPinSaveBtn"');
    expect(SETTINGS_SRC).toContain('id="lockPinClearBtn"');
  });
  it('弱密码警告不阻断锚（#185 assessPassword + NightSky 措辞「不改也行」承袭）', () => {
    expect(SETTINGS_SRC).toContain('api.assessPassword(a)');
    expect(SETTINGS_SRC).toContain('建议更改（不改也行）');
    expect(SETTINGS_SRC).toContain('api.hashPassword(a)');
  });
  it('清除验证链锚：verifyPassword 当前 PIN → clearPin', () => {
    expect(SETTINGS_SRC).toContain('api.verifyPassword(a, { hashHex: snap.hashHex');
    expect(SETTINGS_SRC).toContain('api.store.clearPin()');
  });
  it('摘要动态化锚：无/PIN 两态 + 导出面扩展（幂等守卫形态保持）', () => {
    expect(SETTINGS_SRC).toContain("has ? 'PIN' : '无'");
    expect(SETTINGS_SRC).toContain('window.__settingsSafetyV831 = { rescan: rescan, toastAdvanced: toastAdvanced, openPinSetup: openPinSetup');
    expect(SETTINGS_SRC).toContain('if (window.__settingsSafetyV831) return;');
  });
  it('存续回归锚：更多安全设置 toast 保留 + topSecurity 图标行保留', () => {
    expect(SETTINGS_SRC).toContain('更多安全设置页后续版本转正');
    expect(SETTINGS_SRC).toContain('AOSP_ICONS.topSecurity');
  });
});

describe('v10.93 #210 CSS 接线锚（准入①②⑤）', () => {
  it('令牌零裸新色锚：--md-* var() 形态 + 胶囊键 28px', () => {
    expect(CSS_SRC).toContain('.lock-bouncer {');
    expect(CSS_SRC).toMatch(/\.lock-bouncer-key\s*\{[^}]*border-radius: 28px;/);
    expect(CSS_SRC).toMatch(/\.lock-bouncer-dot\s*\{[^}]*var\(--md-primary/);
    expect(CSS_SRC).toMatch(/\.lock-bouncer-msg\s*\{[^}]*var\(--md-error/);
  });
  it('平板断点锚（准入②@768）+ 按压形变锚（准入⑤）+ reduced-motion 降档', () => {
    expect(CSS_SRC).toContain('.lock-bouncer-shake { animation: lockBouncerShake');
    expect(CSS_SRC).toContain('@keyframes lockBouncerShake');
    expect(CSS_SRC).toMatch(/@media \(min-width: 768px\)[\s\S]*?\.lock-bouncer \{/);
    expect(CSS_SRC).toContain('@media (prefers-reduced-motion: reduce)');
  });
});

describe('v10.93 #210 回归锚（零波及承诺）', () => {
  it('未设 PIN 零变化：手势原路提交分支原句保留', () => {
    expect(LOCK_SRC).toContain('pendingCommit = shouldCommit;');
    expect(LOCK_SRC).toContain('startUnlockSpring(shouldCommit, dy, shouldCommit ? Math.max(velocity, 0.6) : velocity);');
  });
  it('COMMIT 阈值三常量零触碰（v8.96 #85-F3 工程调优值原句）', () => {
    expect(LOCK_SRC).toContain('const COMMIT_DIST_RATIO = 0.25;');
    expect(LOCK_SRC).toContain('const COMMIT_VELOCITY = 0.55;');
    expect(LOCK_SRC).toContain('const FLING_MIN_DIST_RATIO = 0.10;');
  });
  it('#185 核零触碰（纯核文件不含 #210 接线痕迹）', () => {
    expect(HEURISTIC_SRC).not.toContain('lockPinStore');
    expect(HEURISTIC_SRC).not.toContain('bouncer');
  });
  it('usageStore 解锁沿计账保留（v10.93 #96 二期锚）+ 解锁音沿保留', () => {
    expect(LOCK_SRC).toContain("usageStore.deviceEvent('unlock')");
    expect(LOCK_SRC).toContain("playSfx('unlock')");
    expect(LOCK_SRC).toContain("playSfx('lock')");
  });
});

describe('v10.93 #210 纪律锚 + 版本锚', () => {
  it('安全纪律注记在录：禁裸 MD5 承袭 + 非真安全边界 + 快捷沿直通诚实标注', () => {
    expect(SRC).toContain('防随手翻看」非真安全边界');
    expect(LOCK_SRC).toContain('PIN 门仅管上滑主解锁沿');
    expect(SETTINGS_SRC).toContain('存储为加盐哈希，非真安全边界');
  });
  it('window 桥幂等守卫（重复安装零覆盖）', () => {
    expect(SRC).toContain('if (!w || w.__lockPin) return');
  });
  it('pkg 10.93.0 + 版本串在录', () => {
    expect(PKG.version).toBe('10.93.0');
    expect(SRC).toContain('v10.93 #210');
    expect(LOCK_SRC).toContain('v10.93 #210');
  });
});
