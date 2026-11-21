// ==================== qs-zen.js — #284 批21（v11.50）：ZenDeviceEffects overlay + ScheduleCalendar 规则 eval + 电池节省 单源 ====================
// 簇体自 quick-settings.js 逐字节迁出（boundary-map §3.5 表第五行 · 121 行），
// 唯一语义差异 = applyZenDeviceEffects / zenEvalRulesTick 加 export 前缀（宿主回接）。
// 宿主共享态/函数桥：ESM 循环 import 活绑定（qs-sheets 批20 同律）——本模块顶层零绑定消费
// 无 TDZ，全部引用发生在调用期（initQuickSettings 调用 / __zenDebug 闭包 / message 回调 /
// 磁贴动作分发）。DND 状态机段（setDndActive/setDndExternalSource/applyDndEffective）留宿主
// （表第四行 qs-actions 车道待单独考证），本模块经宿主桥接面活绑定消费。
// aosp/zen-mode.js 纯逻辑单例（zenStore/isZenActive/deviceEffectsOverlayStyle/ZEN_DEVICE_EFFECT）
// 直接 import（AOSP ScheduleConditionProvider / ZenDeviceEffects 13 位语义锚随簇在录）。
import { zenStore, isZenActive, deviceEffectsOverlayStyle, ZEN_DEVICE_EFFECT } from './aosp/zen-mode.js';
import { ICONS } from './icons.js';
import { activeTiles, renderQuickSettingsGrid, showSystemToast, setDndActive, setDndExternalSource, applyDndEffective } from './quick-settings.js';
// ==================== v9.94 #198 ZenDeviceEffects overlay + ScheduleCalendar 规则 eval ====================

/** 全屏效果 overlay：fixed inset0 pointer-events:none，样式由 aosp/zen-mode.js 纯函数合成
 *  （grayscale → backdrop-filter；夜灯/夜间模式/压暗 → 罩面色；零布局侵入不破坏 fixed 定位上下文） */
export function applyZenDeviceEffects() {
  let overlay = document.getElementById('zen-device-effects');
  // v11.50 #209：生效位 = 用户配置位（持久化）∪ 激活外部来源位并集（session-only，bedtime 灰度等）
  const style = deviceEffectsOverlayStyle((zenStore.getState().deviceEffects | 0) | zenStore.externalEffects());
  if (!style) {
    if (overlay) overlay.remove(); // 效果位清零 → 挂卸复原（#198 验收「退出即复原」）
    return;
  }
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'zen-device-effects';
    document.body.appendChild(overlay);
  }
  overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483000;'
    + (style.backdropFilter ? `backdrop-filter:${style.backdropFilter};-webkit-backdrop-filter:${style.backdropFilter};` : '')
    + (style.background ? `background:${style.background};` : '')
    + 'pointer-events:none;';
}

/** ScheduleCalendar 规则每分钟 eval（AOSP ScheduleConditionProvider 同语义）：
 *  到点激活 / 过期自动关断（仅 ruleDriven 态，手动开启不被抢关——zen-mode evalRules 状态机） */
export function zenEvalRulesTick() {
  const now = new Date();
  const res = zenStore.evalRules({
    day: now.getDay() + 1, // java.util.Calendar：SUNDAY=1 ↔ JS getDay() 0-6
    minuteOfDay: now.getHours() * 60 + now.getMinutes(),
  });
  // v11.50 #209：evalRules 已在 store 内完成真源变更（manualActive/ruleDriven），
  // 此处仅需生效面重应用（原 setDndActive(manualActive) 的 setManual 同值写入无行为差，
  // 改用 applyDndEffective 免误触外部登记清洗）
  if (res.changed) applyDndEffective({ silent: true });
}

// 只读测试/e2e 观测桥（__headsUpDebug / __desktopPrefsInternal 同款风格：零行为面）
if (typeof window !== 'undefined') {
  window.__zenDebug = {
    state: () => zenStore.getState(),
    isActive: () => isZenActive(),
    evalRules: (day, minuteOfDay) => zenStore.evalRules({ day, minuteOfDay }),
    setDeviceEffects: (mask) => { zenStore.setDeviceEffects(mask); applyZenDeviceEffects(); },
    upsertRule: (r) => zenStore.upsertRule(r),
    hasOverlay: () => !!document.getElementById('zen-device-effects'),
    // v11.50 #209：外部来源观测面 + 直注入口（e2e/单测零行为面风格，__alarmStateProbe 同款）
    externalSources: () => zenStore.getState().externalSources,
    setExternal: (id, on, effects) => setDndExternalSource(id, on, { effects: effects | 0 }),
    // v11.50 #209：手动路径直注（QS 磁贴 click 分发同款真源入口；e2e 互不覆盖断言用）
    setDnd: (on) => setDndActive(!!on, { silent: true }),
  };
}

// v11.50 #209：iframe → 宿主 DND 桥消息面（__system.dnd set/get 的宿主半边；
// notifications.js NOTIFY / app-bus.js BUS_EMIT 同款 per-module message listener 范式）
if (typeof window !== 'undefined') {
  window.addEventListener('message', (e) => {
    const d = e && e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'DND_SET') {
      // effects 入参双形态：{ grayscale:true } 语义别名（iframe 侧无 zen 常量）或数字位掩码
      const fx = d.effects && typeof d.effects === 'object'
        ? (d.effects.grayscale ? ZEN_DEVICE_EFFECT.GRAYSCALE : 0)
        : (Number(d.effects) | 0 || 0);
      setDndExternalSource(d.source, d.active, { effects: fx });
    } else if (d.type === 'DND_GET' && d.requestId) {
      try {
        e.source && e.source.postMessage({
          type: 'DND_RESULT',
          requestId: d.requestId,
          active: isZenActive(),
          sources: Object.keys(zenStore.getState().externalSources),
        }, '*');
      } catch (err) { /* 上下文已销毁 */ }
    }
  });
}

/** 省电模式持久化键（设置电池页开关与快速设置磁贴共享同一真源） */
const BATTERY_SAVER_KEY = 'ios-desktop:battery-saver';

/**
 * 程序化设置省电模式：body 类 + 磁贴同步 + 持久化 + 广播（快速设置磁贴 / 设置电池页开关共用单一真源）
 * @param {boolean} active
 * @param {{ silent?: boolean }} [opts]
 */
export function setBatterySaverActive(active, { silent = false } = {}) {
  const tile = activeTiles.find((t) => t.id === 'battery_saver');
  const prev = tile ? !!tile.active : false;
  const next = !!active;
  if (tile) tile.active = next;
  document.body.classList.toggle('battery-saver-mode', next);
  try { localStorage.setItem(BATTERY_SAVER_KEY, next ? '1' : '0'); } catch (e) { /* 隐私模式等场景忽略 */ }
  renderQuickSettingsGrid();
  /* v7.85 加号脉冲：AOSP qs_battery_saver_icon_on/off 的 pathData morph（200ms ease_out）
     折中为图标整体 pop（scale 1→1.14→1），方向随开/关一致 */
  if (prev !== next) {
    const pill = document.querySelector('.qs-tile-pill[data-tile-id="battery_saver"] svg');
    if (pill) {
      pill.classList.remove('bs-pop');
      void pill.getBoundingClientRect();
      pill.classList.add('bs-pop');
    }
  }
  if (!silent && prev !== next) {
    showSystemToast(next ? '省电模式已启动 (降低背景功耗)' : '已退出省电模式', next ? ICONS.battery_saver : ICONS.bolt);
  }
  if (prev !== next) {
    document.dispatchEvent(new CustomEvent('battery-saver-changed', { detail: { active: next } }));
  }
}

/** 启动时恢复上次会话的省电模式状态（静默，无 Toast） */
export function restoreBatterySaverState() {
  let on = false;
  try { on = localStorage.getItem(BATTERY_SAVER_KEY) === '1'; } catch (e) { /* 忽略 */ }
  const tile = activeTiles.find((t) => t.id === 'battery_saver');
  if (tile) tile.active = on;
  document.body.classList.toggle('battery-saver-mode', on);
}
