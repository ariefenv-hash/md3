// ==================== v206-redaction.test.js — #206 锁屏通知脱敏纯逻辑核 + 接线锚（v10.74 · R107） ====================
//
// 覆盖：
//   · aosp/notification-redaction.js 纯逻辑真跑：VISIBILITY 三常量（Notification.java 1/0/-1 实证）/
//     clampVisibility 归一（默认 PRIVATE 语义）/resolveLockMode 双键→三态/readLockMode 同源直读
//     （缺档/损坏/缺字段兜底）/lockscreenGate 总闸/needsRedaction 3×3 矩阵全格/redactedView
//     （publicVersion 优先 + fallback 形态 + 零携带原 title/desc）/normalizeRedactionFields 投递侧归一
//   · 接线锚：lock-screen.js 判定链四锚（import/gate+mode/逐条矩阵/脱敏卡类名）/
//     notifications.js 归一前置锚（zen 闸之前）+ __redactDebug 观测面/
//     settings.js 默认值互锚（LOCK_MODE_DEFAULTS 同源同值）
//   · 回归锚：zen NOTIFICATION_LIST 抑制通路保持（gate 与 zen 闸并列零触碰）/
//     Feed 恒明文边界（notifications.js 数据层零脱敏分支）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  VISIBILITY, REDACT_FALLBACK_TEXT, REDACTED_CARD_CLASS, NOTIF_SETTINGS_KEY, LOCK_MODE_DEFAULTS,
  clampVisibility, resolveLockMode, readLockMode, lockscreenGate,
  needsRedaction, redactedView, normalizeRedactionFields,
} from '../ios-desktop/js/aosp/notification-redaction.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LS = readFileSync(join(ROOT, 'ios-desktop/js/lock-screen.js'), 'utf-8');
const NOTI = readFileSync(join(ROOT, 'ios-desktop/js/notifications.js'), 'utf-8');
const SET = readFileSync(join(ROOT, 'ios-desktop/js/apps/settings.js'), 'utf-8');
const CSS = readFileSync(join(ROOT, 'ios-desktop/css/lock-screen.css'), 'utf-8');
const PKG = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));

function memStorage(init) {
  const m = new Map(init ? Object.entries(init) : []);
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

describe('v10.74 #206 VISIBILITY 三常量（Notification.java 实证 1/0/-1）', () => {
  it('PUBLIC 1 / PRIVATE 0 / SECRET -1 逐项 1:1（Object.freeze）', () => {
    expect(VISIBILITY).toEqual({ SECRET: -1, PRIVATE: 0, PUBLIC: 1 });
    expect(Object.isFrozen(VISIBILITY)).toBe(true);
  });
  it('fallback 文案「内容已隐藏」+ 脱敏卡类名 + 设置真源键（settings.js STORE_KEY 同值）', () => {
    expect(REDACT_FALLBACK_TEXT).toBe('内容已隐藏');
    expect(REDACTED_CARD_CLASS).toBe('lock-noti-card--redacted');
    expect(NOTIF_SETTINGS_KEY).toBe('settings:notifications-v1');
    expect(SET).toContain("'settings:notifications-v1'");
  });
  it('LOCK_MODE_DEFAULTS = { lockScreenShow: 1, allowPrivate: false }（议题规格默认「隐藏敏感内容」）', () => {
    expect(LOCK_MODE_DEFAULTS).toEqual({ lockScreenShow: 1, allowPrivate: false });
    expect(SET).toContain('{ lockScreenShow: 1, allowPrivate: false, silentIcons: false, snooze: false, badging: true, assistant: true }');
  });
});

describe('v10.74 #206 clampVisibility 归一', () => {
  it('合法三值（含数字字符串形态）原样保留', () => {
    expect(clampVisibility(1)).toBe(VISIBILITY.PUBLIC);
    expect(clampVisibility(0)).toBe(VISIBILITY.PRIVATE);
    expect(clampVisibility(-1)).toBe(VISIBILITY.SECRET);
    expect(clampVisibility('1')).toBe(VISIBILITY.PUBLIC);
    expect(clampVisibility('-1')).toBe(VISIBILITY.SECRET);
  });
  it('非法/缺省一律落 PRIVATE（Notification.java visibility 字段默认值语义）', () => {
    expect(clampVisibility(undefined)).toBe(VISIBILITY.PRIVATE);
    expect(clampVisibility(null)).toBe(VISIBILITY.PRIVATE);
    expect(clampVisibility('junk')).toBe(VISIBILITY.PRIVATE);
    expect(clampVisibility(3)).toBe(VISIBILITY.PRIVATE);
    expect(clampVisibility(-2)).toBe(VISIBILITY.PRIVATE);
    expect(clampVisibility(NaN)).toBe(VISIBILITY.PRIVATE);
    expect(clampVisibility(true)).toBe(VISIBILITY.PRIVATE); // boolean 防御（Number(true)=1 不得漂移为 PUBLIC）
    expect(clampVisibility(false)).toBe(VISIBILITY.PRIVATE);
  });
});

describe('v10.74 #206 resolveLockMode 双键→三态（settings.js lockSummary 同构）', () => {
  it('!lockScreenShow → disable（优先于 allowPrivate 全部）', () => {
    expect(resolveLockMode({ lockScreenShow: 0, allowPrivate: true })).toBe('disable');
    expect(resolveLockMode({ lockScreenShow: 0, allowPrivate: false })).toBe('disable');
    expect(resolveLockMode({ lockScreenShow: false, allowPrivate: true })).toBe('disable');
  });
  it('allowPrivate → show；else → hide；空入参 → hide（默认收敛）', () => {
    expect(resolveLockMode({ lockScreenShow: 1, allowPrivate: true })).toBe('show');
    expect(resolveLockMode({ lockScreenShow: 1, allowPrivate: false })).toBe('hide');
    expect(resolveLockMode({})).toBe('hide');
    expect(resolveLockMode(null)).toBe('hide');
  });
});

describe('v10.74 #206 readLockMode 同源直读（storage 注入隔离）', () => {
  it('健全存档三态逐读', () => {
    expect(readLockMode(memStorage({ 'settings:notifications-v1': JSON.stringify({ lockScreenShow: 1, allowPrivate: true }) }))).toBe('show');
    expect(readLockMode(memStorage({ 'settings:notifications-v1': JSON.stringify({ lockScreenShow: 1, allowPrivate: false }) }))).toBe('hide');
    expect(readLockMode(memStorage({ 'settings:notifications-v1': JSON.stringify({ lockScreenShow: 0 }) }))).toBe('disable');
  });
  it('缺档/损坏 JSON/非对象/数组 → LOCK_MODE_DEFAULTS 语义（hide）', () => {
    expect(readLockMode(memStorage())).toBe('hide');
    expect(readLockMode(memStorage({ 'settings:notifications-v1': '{broken' }))).toBe('hide');
    expect(readLockMode(memStorage({ 'settings:notifications-v1': JSON.stringify('junk') }))).toBe('hide');
    expect(readLockMode(memStorage({ 'settings:notifications-v1': JSON.stringify([1, 2]) }))).toBe('hide');
  });
  it('存档缺字段逐项补默认（settings.js load() 同构）', () => {
    expect(readLockMode(memStorage({ 'settings:notifications-v1': JSON.stringify({ lockScreenShow: 1 }) }))).toBe('hide'); // 缺 allowPrivate → false
    expect(readLockMode(memStorage({ 'settings:notifications-v1': JSON.stringify({ allowPrivate: true }) }))).toBe('show'); // 缺 lockScreenShow → 1
  });
});

describe('v10.74 #206 lockscreenGate 总闸', () => {
  it('disable → renderList:false（整列不渲染，优先于逐条全部）；show/hide → true', () => {
    expect(lockscreenGate('disable')).toEqual({ renderList: false });
    expect(lockscreenGate('show')).toEqual({ renderList: true });
    expect(lockscreenGate('hide')).toEqual({ renderList: true });
  });
});

describe('v10.74 #206 needsRedaction 3×3 矩阵全格真跑', () => {
  const M = {
    PUBLIC: VISIBILITY.PUBLIC, PRIVATE: VISIBILITY.PRIVATE, SECRET: VISIBILITY.SECRET,
  };
  it('PUBLIC：show=F / hide=F（disable=T 为整列防御值不参与渲染）', () => {
    expect(needsRedaction(M.PUBLIC, 'show')).toBe(false);
    expect(needsRedaction(M.PUBLIC, 'hide')).toBe(false);
    expect(needsRedaction(M.PUBLIC, 'disable')).toBe(true);
  });
  it('PRIVATE：show=F（显示全部明文）/ hide=T（隐藏敏感脱敏）/ disable=T', () => {
    expect(needsRedaction(M.PRIVATE, 'show')).toBe(false);
    expect(needsRedaction(M.PRIVATE, 'hide')).toBe(true);
    expect(needsRedaction(M.PRIVATE, 'disable')).toBe(true);
  });
  it('SECRET：show=T / hide=T / disable=T（议题规格①：一律脱敏卡，AOSP 整条隐藏差异在录）', () => {
    expect(needsRedaction(M.SECRET, 'show')).toBe(true);
    expect(needsRedaction(M.SECRET, 'hide')).toBe(true);
    expect(needsRedaction(M.SECRET, 'disable')).toBe(true);
  });
  it('非法 mode 收敛 hide；非法 visibility 内部 clamp 兜底', () => {
    expect(needsRedaction(M.PUBLIC, 'junk')).toBe(false); // junk→hide：PUBLIC 明文（hide 态仅非 PUBLIC 脱敏）
    expect(needsRedaction(undefined, 'hide')).toBe(true); // undefined→clamp PRIVATE→hide=T
    expect(needsRedaction(undefined, 'show')).toBe(false); // clamp PRIVATE→show=F
    expect(needsRedaction('junk', 'show')).toBe(false); // 'junk'→NaN→clamp PRIVATE→show=F
  });
});

describe('v10.74 #206 redactedView（publicVersion 优先 + fallback + 信息面裁剪）', () => {
  const base = { app: '信息', time: '09:41', title: '原始标题', desc: '原始正文', appId: 'msg' };
  it('publicVersion 独立 Notification 体优先（AOSP PublicInflationCallback 语义）', () => {
    const v = redactedView({ ...base, publicVersion: { title: '概要标题', desc: '概要正文' } });
    expect(v).toEqual({ app: '信息', time: '09:41', title: '概要标题', desc: '概要正文', fromPublicVersion: true });
  });
  it('publicVersion.text 别名归并入 desc（Notification.text 同源）', () => {
    const v = redactedView({ ...base, publicVersion: { text: '仅 text 概要' } });
    expect(v.title).toBe(REDACT_FALLBACK_TEXT);
    expect(v.desc).toBe('仅 text 概要');
    expect(v.fromPublicVersion).toBe(true);
  });
  it('无 publicVersion → fallback 形态：应用名 +「内容已隐藏」+ 空正文（零原始内容泄露）', () => {
    const v = redactedView(base);
    expect(v).toEqual({ app: '信息', time: '09:41', title: '内容已隐藏', desc: '', fromPublicVersion: false });
    expect(v.title).not.toContain('原始标题');
    expect(v.desc).not.toContain('原始正文');
    expect(JSON.stringify(v)).not.toContain('原始标题');
    expect(JSON.stringify(v)).not.toContain('原始正文');
  });
  it('junk publicVersion（数组/空对象/全空字段）→ fallback', () => {
    expect(redactedView({ ...base, publicVersion: [1] }).fromPublicVersion).toBe(false);
    expect(redactedView({ ...base, publicVersion: {} }).fromPublicVersion).toBe(false);
    expect(redactedView({ ...base, publicVersion: { title: '', desc: '' } }).title).toBe(REDACT_FALLBACK_TEXT);
    expect(redactedView({ ...base, publicVersion: 'junk' }).fromPublicVersion).toBe(false);
  });
  it('超长裁剪（title 64 / desc 128 / app 64 / time 24）', () => {
    const v = redactedView({ app: 'A'.repeat(100), time: 't'.repeat(40), publicVersion: { title: 'T'.repeat(100), desc: 'D'.repeat(200) } });
    expect(v.title.length).toBe(64);
    expect(v.desc.length).toBe(128);
    expect(v.app.length).toBe(64);
    expect(v.time.length).toBe(24);
  });
  it('null/非对象入参零抛（防御形态）', () => {
    expect(redactedView(null)).toEqual({ app: '', time: '', title: REDACT_FALLBACK_TEXT, desc: '', fromPublicVersion: false });
  });
});

describe('v10.74 #206 normalizeRedactionFields（投递侧归一）', () => {
  it('visibility 钳制 PRIVATE + 合法值保留', () => {
    expect(normalizeRedactionFields({ visibility: 9 }).visibility).toBe(VISIBILITY.PRIVATE);
    expect(normalizeRedactionFields({ visibility: -1 }).visibility).toBe(VISIBILITY.SECRET);
    expect(normalizeRedactionFields({}).visibility).toBe(VISIBILITY.PRIVATE); // 缺省补齐
  });
  it('publicVersion 合法定型 {title,desc}（text 归并）；junk 剔除', () => {
    expect(normalizeRedactionFields({ publicVersion: { title: 'T', text: 'X' } }).publicVersion).toEqual({ title: 'T', desc: 'X' });
    expect(normalizeRedactionFields({ publicVersion: { desc: 'D' } }).publicVersion).toEqual({ title: '', desc: 'D' });
    const junk = normalizeRedactionFields({ publicVersion: 'junk' });
    expect('publicVersion' in junk).toBe(false);
    expect('publicVersion' in normalizeRedactionFields({ publicVersion: {} })).toBe(false);
    expect('publicVersion' in normalizeRedactionFields({ publicVersion: { title: '', desc: '', text: '' } })).toBe(false);
  });
  it('null/非对象入参零抛原样返回', () => {
    expect(normalizeRedactionFields(null)).toBe(null);
    expect(normalizeRedactionFields('str')).toBe('str');
  });
});

describe('v10.74 #206 接线锚（lock-screen.js 判定链 + notifications.js 归一前置）', () => {
  it('lock-screen.js：import 锚 + gate/readLockMode 消费锚 + 逐条矩阵锚 + 脱敏卡类名/aria 锚', () => {
    expect(LS).toContain("from './aosp/notification-redaction.js'");
    expect(LS).toContain('const lockMode = readLockMode();');
    expect(LS).toContain('const gate = lockscreenGate(lockMode);');
    expect(LS).toContain('needsRedaction(item.visibility, lockMode)');
    expect(LS).toContain('redactedView(item)');
    expect(LS).toContain('REDACTED_CARD_CLASS');
    expect(LS).toContain("card.setAttribute('aria-label'");
  });
  it('lock-screen.js：fallback 脱敏卡点击零操作守卫（publicVersion 卡照常直达）', () => {
    expect(LS).toContain('if (redact && !view.fromPublicVersion) return;');
  });
  it('notifications.js：normalizeRedactionFields 在 zen 闸之前（闸前归一，闸序零触碰）', () => {
    const iNorm = NOTI.indexOf('item = normalizeRedactionFields(item);');
    const iZen = NOTI.indexOf('const zenOn = isZenActive();');
    expect(iNorm).toBeGreaterThan(-1);
    expect(iZen).toBeGreaterThan(iNorm);
  });
  it('notifications.js：__redactDebug 观测面（mode/view 双出口）', () => {
    expect(NOTI).toContain('window.__redactDebug');
    expect(NOTI).toContain('mode: () => readLockMode()');
  });
  it('css：脱敏卡降档样式（--md-* 令牌零裸色）', () => {
    expect(CSS).toContain('.lock-noti-card--redacted .lock-noti-title');
    expect(CSS).toContain('var(--md-on-surface-variant');
  });
});

describe('v10.74 #206 回归锚（既有通路零触碰）', () => {
  it('zen NOTIFICATION_LIST 抑制通路保持（gate 与 zen 闸并列：gate.renderList && !isVisualSuppressed）', () => {
    expect(LS).toContain('gate.renderList && !isVisualSuppressed(currentSuppressedVisuals(), SUPPRESSED_EFFECT.NOTIFICATION_LIST)');
  });
  it('Feed 恒明文边界：addSystemNotification 函数体内零脱敏分支（数据层恒明文，渲染面在 lock-screen.js）', () => {
    const fnStart = NOTI.indexOf('export function addSystemNotification');
    const fnEnd = NOTI.indexOf('showHeadsUpBanner(item);', fnStart);
    const body = NOTI.slice(fnStart, fnEnd);
    expect(body).not.toContain('needsRedaction');
    expect(body).not.toContain('redactedView');
    expect(NOTI).toContain('export function addSystemNotification');
  });
  it('#207 渠道闸零触碰（deliveryGate 两处仍在后）', () => {
    expect(NOTI).toContain('if (!deliveryGate(channelImp).enqueue) return;');
    expect(NOTI).toContain('if (!deliveryGate(channelImp).peek) return;');
  });
});

describe('v10.74 #206 版本锚', () => {
  it('pkg 10.74.0', () => {
    expect(PKG.version).toBe('10.74.0');
  });
});
