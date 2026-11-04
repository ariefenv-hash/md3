// ==================== screen-pinning.js — 屏幕固定单例桥（#98） ====================
// 纯逻辑核 js/aosp/screen-pinning.js（AOSP ScreenPinningNotify/ScreenPinningRequest
// 1:1 移植）的会话级单例。本模块零 DOM 零 window，仅供四面接线方 import
// （recent-apps 确认面板与固定入口 / nav-bar 按键拦截与长按退出 / gestures 手势冻结 /
// app-window openApp 守卫）——独立小模块避免向任一既有消费方回流造成 import 环。
// verifyCredential 本期不注入（md3 锁屏无凭据实体，裁决见 aosp 模块头注②）；
// 凭据系统落地后单点补注入即启用退出凭据门控。

import {
  createScreenPinningNotify,
  createScreenPinningState,
  PIN_BACK_LONGPRESS_MS,
  PINNING_STRINGS,
} from './aosp/screen-pinning.js';

/** 会话级单例：状态机（unpinned/prompting/pinned + intercept 守卫矩阵） */
export const pinCtl = createScreenPinningState({ verifyCredential: null });

/** 会话级单例：提示 toast 状态机（start/exit 直通 + escape 1s 节流） */
export const pinNotify = createScreenPinningNotify({ now: () => Date.now() });

/** 退出长按判定时长（ViewConfiguration.getLongPressTimeout() 框架默认值映射） */
export const BACK_LONGPRESS_MS = PIN_BACK_LONGPRESS_MS;

/** 文案表（消费方取键渲染，键名与 AOSP R.string 资源名同名） */
export { PINNING_STRINGS };
