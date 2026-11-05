// ==================== audio-graph-instance.js — #117 双层音量生产单例接线枢纽 ====================
//
// aosp/audio-graph.js 保持纯逻辑（零 DOM 零 window，ctx/node/storage 注入）；
// 本模块为生产侧唯一单例出口：media-service / volume-dialog / sound-haptics 三消费点
// 共享同一图实例与同一持久化适配器（settings:sound-v1 同键单一真源）。
//
// 事件出口（onChange）：
//   - audio-graph-level-changed  { key, value }   —— 总线级变更（全流）
//   - settings-sound-changed     { key, value }   —— 设置页五通道协议事件（media/call/ring/
//     notification/alarm；与 volume-dialog 既有 ring 派发、settings.js store.set 派发同形，
//     消费端零协议变化）
//
// 首调注入生效（memoized）；测试一律走 createAudioGraph 工厂（本模块不进测试断言面，
// 仅 F 组源码锚）。

import {
  createAudioGraph,
  createSoundStoreAdapter,
  isAudioStreamKey,
} from './aosp/audio-graph.js';

let __instance = null;

/** 生产图单例（storage/document 防御性降级：隐私模式/非 DOM 环境 → 仅内存记账） */
export function getAudioGraph() {
  if (__instance) return __instance;
  const storage = (() => {
    try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
  })();
  const onChange = (key, value) => {
    try {
      document.dispatchEvent(new CustomEvent('audio-graph-level-changed', { detail: { key, value } }));
      if (isAudioStreamKey(key) && key !== 'sfx') {
        document.dispatchEvent(new CustomEvent('settings-sound-changed', { detail: { key, value } }));
      }
    } catch (e) { /* 非 DOM 环境/异常静默 */ }
  };
  __instance = createAudioGraph({
    store: storage ? createSoundStoreAdapter(storage) : null,
    onChange,
    // 静音提示持续窗 2s：与音量面板 3s 存活期 + 500ms 轮询对齐（2s/4 tick 在面板
    // 收起前必有一帧判定机会；纯逻辑层缺省 2500ms 不变，生产值在此对齐 UI 生命周期）
    thresholdMs: 2000,
  });
  return __instance;
}
