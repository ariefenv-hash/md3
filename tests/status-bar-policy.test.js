// ==================== status-bar-policy.test.js — #89 状态栏常态图标位策略 ====================
//
// 覆盖（R88 窗主作业，PhoneStatusBarPolicy aosp-mirror main 实源核对）：
//   · SB_SLOT_ORDER 注册序单一真源（12 插槽冻结）
//   · resolveVisibleSlots 判定表（zen 覆盖 ringer 双隐 / cast 录制让位 / 占位槽 false）
//   · applyBlocklist（config_statusBarIconsToExclude 同构）
//   · MOBILE_ICON_GROUPS 分级 + resolveMobileIconGroup（effectiveType 归并链）
//   · 接线锚：status-bar.js 策略容器/徽章/事件出口 + quick-settings 广播四点 +
//     sound-haptics RINGER 广播 + settings.js 状态栏页（插槽表与策略注册表同源）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SB_SLOT_ORDER,
  SB_SLOT_ICONS,
  MOBILE_ICON_GROUPS,
  resolveVisibleSlots,
  applyBlocklist,
  resolveMobileIconGroup,
} from '../ios-desktop/js/aosp/status-bar-policy.js';

const R = (p) => join(dirname(fileURLToPath(import.meta.url)), '..', 'ios-desktop', p);
const STATUS_BAR = readFileSync(R('js/status-bar.js'), 'utf8');
const QS = readFileSync(R('js/quick-settings.js'), 'utf8');
const SOUND = readFileSync(R('js/sound-haptics.js'), 'utf8');
const SETTINGS = readFileSync(R('js/apps/settings.js'), 'utf8');
// #284 批 3（v11.10）：STATUSBAR_PAGE_SCRIPT 常量单源搬迁 settings-pages/statusbar.js ——
// G3 同名测试随迁：H2/H3 抽取源随簇走（脚本正文/blocklist 键/事件名在新文件）；
// H1 页注册面断言仍在 settings.js（title/hub 行/sbIconSlotList content 模板均留宿主）；
// H4 G2 单源桥接锚（settings.js import 消费零双轨，clock-core 互指纪律同款）。
const SBPAGE = readFileSync(R('js/apps/settings-pages/statusbar.js'), 'utf8');

describe('v89-A · SB_SLOT_ORDER 注册序单一真源（PhoneStatusBarPolicy 插槽集）', () => {
  it('A1 十二插槽全量且冻结（Pixel 实测惯例序，注解在模块头）', () => {
    expect(Object.isFrozen(SB_SLOT_ORDER)).toBe(true);
    expect(SB_SLOT_ORDER).toEqual([
      'alarm_clock', 'zen', 'mute', 'vibrate', 'headset', 'bluetooth',
      'hotspot', 'cast', 'vpn', 'location', 'screen_record', 'data_saver',
    ]);
  });

  it('A2 插槽 → icons.js 键映射全表（键名在库实证）', () => {
    expect(SB_SLOT_ICONS.alarm_clock).toBe('alarm');
    expect(SB_SLOT_ICONS.zen).toBe('modes');
    expect(SB_SLOT_ICONS.mute).toBe('volume_mute');
    expect(SB_SLOT_ICONS.vibrate).toBe('ringer_vibrate');
    expect(SB_SLOT_ICONS.headset).toBe('headphones');
    expect(SB_SLOT_ICONS.bluetooth).toBe('bluetooth_connected');
    expect(SB_SLOT_ICONS.hotspot).toBe('hotspot');
    expect(SB_SLOT_ICONS.cast).toBe('cast');
    expect(SB_SLOT_ICONS.vpn).toBe('vpn');
    expect(SB_SLOT_ICONS.location).toBe('location_on');
    expect(SB_SLOT_ICONS.screen_record).toBe('screen_record');
    expect(SB_SLOT_ICONS.data_saver).toBe('data_saver'); // 占位槽 icons.js 无键 → ICONS 兜底空串
  });
});

describe('v89-B · resolveVisibleSlots 判定表（updateXxx 逐条同构）', () => {
  it('B1 空快照零插槽（静默态不渲染任何常态图标）', () => {
    expect(resolveVisibleSlots({})).toEqual([]);
  });

  it('B2 alarm：alarmSet 即可见（updateAlarm: alarm != null && triggerTime > 0 同义）', () => {
    const out = resolveVisibleSlots({ alarmSet: true });
    expect(out).toEqual([{ slot: 'alarm_clock', iconKey: 'alarm' }]);
  });

  it('B3 zen 覆盖 ringer：mute/vibrate 双隐（updateRingerAndAlarmIcons isZenOverridingRinger 语义）', () => {
    const zenSilent = resolveVisibleSlots({ zenActive: true, ringerMode: 'silent' });
    expect(zenSilent.map((s) => s.slot)).toEqual(['zen']);
    const zenVibrate = resolveVisibleSlots({ zenActive: true, ringerMode: 'vibrate' });
    expect(zenVibrate.map((s) => s.slot)).toEqual(['zen']);
  });

  it('B4 ringer 三态：silent→mute / vibrate→vibrate / ring→双隐', () => {
    expect(resolveVisibleSlots({ ringerMode: 'silent' }).map((s) => s.slot)).toEqual(['mute']);
    expect(resolveVisibleSlots({ ringerMode: 'vibrate' }).map((s) => s.slot)).toEqual(['vibrate']);
    expect(resolveVisibleSlots({ ringerMode: 'ring' })).toEqual([]);
  });

  it('B5 bluetooth：连接即可见（updateBluetooth connected 语义）', () => {
    expect(resolveVisibleSlots({ bluetoothConnected: true }).map((s) => s.slot)).toEqual(['bluetooth']);
  });

  it('B6 cast 让位链：录制期 cast 隐 + screen_record 显（updateCast !isRecording 语义）', () => {
    expect(resolveVisibleSlots({ castActive: true, recording: true }).map((s) => s.slot)).toEqual(['screen_record']);
    expect(resolveVisibleSlots({ castActive: true }).map((s) => s.slot)).toEqual(['cast']);
  });

  it('B7 vpn/location/screen_record 独立可见', () => {
    expect(resolveVisibleSlots({ vpnActive: true }).map((s) => s.slot)).toEqual(['vpn']);
    expect(resolveVisibleSlots({ locationActive: true }).map((s) => s.slot)).toEqual(['location']);
    expect(resolveVisibleSlots({ recording: true }).map((s) => s.slot)).toEqual(['screen_record']);
  });

  it('B8 占位槽恒不可见（headset/hotspot/data_saver 无信号源诚实标注）', () => {
    const all = resolveVisibleSlots({
      headsetConnected: false, hotspotOn: false, dataSaverOn: false,
    });
    expect(all).toEqual([]);
  });

  it('B9 组合快照按注册序输出（容器内左→右即此序）', () => {
    const out = resolveVisibleSlots({
      alarmSet: true, zenActive: true, bluetoothConnected: true,
      vpnActive: true, locationActive: true,
    });
    expect(out.map((s) => s.slot)).toEqual(['alarm_clock', 'zen', 'bluetooth', 'vpn', 'location']);
  });
});

describe('v89-C · applyBlocklist（config_statusBarIconsToExclude 同构）', () => {
  it('C1 blocklist 内插槽被排除', () => {
    const slots = resolveVisibleSlots({ zenActive: true, bluetoothConnected: true });
    const out = applyBlocklist(slots, ['bluetooth']);
    expect(out.map((s) => s.slot)).toEqual(['zen']);
  });

  it('C2 空/非数组 blocklist 原样放行（脏存储兜底）', () => {
    const slots = resolveVisibleSlots({ alarmSet: true });
    expect(applyBlocklist(slots, [])).toEqual(slots);
    expect(applyBlocklist(slots, null)).toEqual(slots);
    expect(applyBlocklist(slots, 'bogus')).toEqual(slots);
  });
});

describe('v89-D · MobileIconGroup 分级（ic_5g_mobiledata 族语义）', () => {
  it('D1 注册表七组徽章值', () => {
    expect(MOBILE_ICON_GROUPS.none.badge).toBe('');
    expect(MOBILE_ICON_GROUPS['2g'].badge).toBe('2G');
    expect(MOBILE_ICON_GROUPS['3g'].badge).toBe('3G');
    expect(MOBILE_ICON_GROUPS['4g'].badge).toBe('4G');
    expect(MOBILE_ICON_GROUPS['4g_plus'].badge).toBe('4G+');
    expect(MOBILE_ICON_GROUPS['5g'].badge).toBe('5G');
    expect(MOBILE_ICON_GROUPS['5g_plus'].badge).toBe('5G+');
  });

  it('D2 effectiveType 归并链（slow-2g→2g / 未知→5g 现状真值 / none→隐藏）', () => {
    expect(resolveMobileIconGroup('slow-2g')).toBe('2g');
    expect(resolveMobileIconGroup('2g')).toBe('2g');
    expect(resolveMobileIconGroup('3g')).toBe('3g');
    expect(resolveMobileIconGroup('4g')).toBe('4g');
    expect(resolveMobileIconGroup('none')).toBe('none');
    expect(resolveMobileIconGroup(undefined)).toBe('5g');
    expect(resolveMobileIconGroup('')).toBe('5g');
    expect(resolveMobileIconGroup('bogus')).toBe('5g');
  });
});

describe('v89-E · status-bar.js 接线锚（策略容器 / 徽章 / 事件出口）', () => {
  it('E1 策略模块导入 + blocklist 键 + 治理出口', () => {
    expect(STATUS_BAR).toContain("from './aosp/status-bar-policy.js'");
    expect(STATUS_BAR).toContain("ios-desktop:statusbar-icon-blocklist");
    expect(STATUS_BAR).toContain('export function setStatusbarBlocklist');
    expect(STATUS_BAR).toContain('import { getRingerMode }');
  });

  it('E2 右侧区：策略容器居信号簇左邻 + 5G 纯文本退役', () => {
    // 模板内用法锚（querySelectorAll 同名选择器在前，取 HTML 模板内唯一形态）
    const TEMPLATE_ANCHOR = 'sb-policy-icons">${buildPolicyIconsHtml()}';
    const rightIdx = STATUS_BAR.indexOf('class="status-right"');
    const policyIdx = STATUS_BAR.indexOf(TEMPLATE_ANCHOR);
    const wifiIdx = STATUS_BAR.indexOf('wifi-icon', rightIdx);
    expect(policyIdx).toBeGreaterThan(rightIdx);
    expect(policyIdx).toBeLessThan(wifiIdx);
    // 旧 5G 纯文本 span 退役（font-size:11px 内联样式整段消失）
    expect(STATUS_BAR).not.toContain('>5G</span>');
    // 徽章插槽：mobile-data-badge + SVG text 承载
    expect(STATUS_BAR).toContain('mobile-data-badge');
    expect(STATUS_BAR).toContain('mobileBadgeSvg');
    expect(STATUS_BAR).toContain('<text');
  });

  it('E3 事件驱动四链：qs-tiles-changed / ringer-mode-changed / blocklist / privacy', () => {
    expect(STATUS_BAR).toContain("addEventListener('qs-tiles-changed', refreshPolicySnapshot)");
    expect(STATUS_BAR).toContain("addEventListener('ringer-mode-changed'");
    expect(STATUS_BAR).toContain("addEventListener('statusbar-icon-blocklist-changed', renderPolicyIcons)");
    expect(STATUS_BAR).toContain("addEventListener('privacy-items-changed'");
    // location 插槽与隐私指示器同源（isLocationActive 语义）
    expect(STATUS_BAR).toContain("privacyType === 'location'");
  });

  it('E4 快照重读走动态 import（防 quick-settings ↔ status-bar 静态循环）', () => {
    expect(STATUS_BAR).toContain("import('./quick-settings.js')");
    expect(STATUS_BAR).toContain('getTileActive');
  });
});

describe('v89-F · quick-settings.js 广播锚（四翻转点）', () => {
  it('F1 notifyTilesChanged 出口存在', () => {
    expect(QS).toContain('export function notifyTilesChanged(ids)');
    expect(QS).toContain("new CustomEvent('qs-tiles-changed'");
  });

  it('F2 四消费点全接线：click flip / syncTileState / setDndActive / 蓝牙 sheet', () => {
    expect(QS).toContain('notifyTilesChanged([tile.id])');          // 点击翻转
    expect(QS).toContain('notifyTilesChanged([id])');               // syncTileState 程序化
    expect(QS).toContain("notifyTilesChanged(['modes'])");          // setDndActive
    expect(QS).toContain("notifyTilesChanged(['bluetooth'])");      // 蓝牙 sheet 总开关
  });
});

describe('v89-G · sound-haptics.js ringer 广播锚', () => {
  it('G1 setRingerMode 变更派发 ringer-mode-changed（RINGER_MODE_CHANGED_ACTION 同构）', () => {
    expect(SOUND).toContain("CustomEvent('ringer-mode-changed'");
    // 仅 changed 时派发（broadcastState 同分支）
    const idx = SOUND.indexOf('export function setRingerMode');
    const seg = SOUND.slice(idx, idx + 700);
    expect(seg).toContain('if (changed) {');
  });
});

describe('v89-H · settings.js 状态栏页锚（blocklist 治理出口）', () => {
  it('H1 页 31 注册 + 系统 hub 行', () => {
    expect(SETTINGS).toContain("title: '状态栏'");
    expect(SETTINGS).toContain('sbIconSlotList');
    expect(SETTINGS).toContain('STATUSBAR_PAGE_SCRIPT');
    // hub 行：idx 31 图标 visibility
    expect(SETTINGS).toContain("{ idx: 31, label: '状态栏', sub: '图标显隐', icon: 'visibility' }");
  });

  it('H2 设置页插槽表与策略注册表同源（九可见槽 ⊆ SB_SLOT_ORDER，占位三槽不入表）——抽取源随 #284 批 3 迁至 settings-pages/statusbar.js（G3 同名测试随迁）', () => {
    const m = SBPAGE.match(/var SB_SLOTS = \[([\s\S]*?)\];/);
    expect(m).toBeTruthy();
    const ids = [...m[1].matchAll(/id: '([a-z_]+)'/g)].map((x) => x[1]);
    expect(ids).toEqual([
      'alarm_clock', 'zen', 'mute', 'vibrate', 'bluetooth',
      'cast', 'vpn', 'location', 'screen_record',
    ]);
    ids.forEach((id) => expect(SB_SLOT_ORDER).toContain(id));
    ['headset', 'hotspot', 'data_saver'].forEach((ph) => expect(ids).not.toContain(ph));
  });

  it('H3 blocklist 键与事件一致（store 键单一真源）——抽取源随 #284 批 3 迁至 settings-pages/statusbar.js（G3 同名测试随迁）', () => {
    expect(SBPAGE).toContain("ios-desktop:statusbar-icon-blocklist");
    expect(SBPAGE).toContain("CustomEvent('statusbar-icon-blocklist-changed'");
  });

  it('H4（#284 批 3）G2 单源桥接：settings.js import 消费零双轨（消费面拼接零改动+本体零残留）', () => {
    expect(SETTINGS).toContain("import { STATUSBAR_PAGE_SCRIPT } from './settings-pages/statusbar.js';");
    expect(SETTINGS).toContain('<script>` + STATUSBAR_PAGE_SCRIPT + `</script>');
    expect(SETTINGS).not.toContain('const STATUSBAR_PAGE_SCRIPT = `');
  });
});
