// ==================== a11y-apply.js — 无障碍设置运行时应用层（#105 v11.08 一期） ====================
//
// 职责（接线层，DOM 语义在此不在纯逻辑）：
//   1. 开机应用：applyA11yPersisted() 读 localStorage settings:accessibility-v1 →
//      全量应用（v8.02 RBC 既有缺口修复——此前仅在打开设置页 20 时应用）
//   2. 单一写点：html 层 filter（RBC × 色彩校正 × 颜色反转合成）只经本模块
//      applyA11yRuntime() 写入（v8.02 applyRbc 直写 html.style.filter 的散写点收口；
//      body 层 QS 亮度滑条分层不动——乘法合成互不冲突）
//   3. 滤镜 defs 幂等注入：url(#a11y-daltonizer-*) 引用必须先于 filter 应用存在
//      （缺失引用在部分引擎会令整条 filter 链失效——boot 与页脚本双入口都过 ensure）
//   4. window 桥：window.__a11yApplyRuntime 供 settings 页内联脚本（非 ESM 主文档
//      全局作用域执行）调运——与 __setSwitchChecked 同款桥惯例（#70 先例）
//
// 应用面（AOSP 语义 → Web 通道，诚实标注详见 aosp/a11y-settings.js 头注）：
//   removeAnimations → html[data-a11y-reduce-motion] 属性 + REDUCE_MOTION_EVENT 事件
//   boldText         → html[data-a11y-bold-text] 属性
//   highContrastText → html[data-a11y-high-contrast] 属性
//   rbc/daltonizer*/colorInversion → html.style.filter 合成链
//   fontScale        → html 根字号（rem 通道；px 文本不随动，后续阶段评估）
//   displayScale     → html --a11y-display-scale 变量（.app-body zoom 消费）

import {
  REDUCE_MOTION_ATTR,
  REDUCE_MOTION_EVENT,
  A11Y_STORE_DEFAULTS,
  A11Y_STORE_KEY,
  resolveHtmlFilter,
  clampFontScale,
  clampDisplayScale,
  buildDaltonizerDefsSvg,
} from './aosp/a11y-settings.js';

/** store 读取（缺键补默认；解析异常回落全默认 = AOSP 出厂态） */
export function loadA11yStore() {
  let stored = {};
  try {
    const v = JSON.parse(localStorage.getItem(A11Y_STORE_KEY));
    if (v && typeof v === 'object') stored = v;
  } catch (e) { /* 损坏 JSON → 出厂态 */ }
  const out = {};
  for (const k of Object.keys(A11Y_STORE_DEFAULTS)) {
    out[k] = (k in stored && typeof stored[k] !== 'undefined') ? stored[k] : A11Y_STORE_DEFAULTS[k];
  }
  return out;
}

/** 色彩校正滤镜 defs 幂等注入（url(#) 引用先于 filter 链存在的硬保证） */
export function ensureDaltonizerDefs(doc = document) {
  if (doc.getElementById('a11yDaltonizerDefs')) return;
  const holder = doc.createElement('div');
  holder.innerHTML = buildDaltonizerDefsSvg();
  doc.body ? doc.body.appendChild(holder.firstChild) : doc.documentElement.appendChild(holder.firstChild);
}

/**
 * 全量应用（幂等；值差分：属性与事件只在变更态触碰）。
 * @param {object} s — store 全键对象（loadA11yStore 形态）
 * @param {Document} [doc]
 * @returns {{attrChanged: boolean, filter: string}} 应用账（e2e/单测观测面）
 */
export function applyA11yRuntime(s, doc = document) {
  const el = doc.documentElement;
  ensureDaltonizerDefs(doc);

  // 属性通道（三键：移除动画 / 粗体 / 高对比度）
  const setAttr = (name, on) => {
    const had = el.hasAttribute(name);
    if (on && !had) el.setAttribute(name, '');
    else if (!on && had) el.removeAttribute(name);
    return had !== !!on;
  };
  const attrChanged =
    setAttr(REDUCE_MOTION_ATTR, !!s.removeAnimations) |
    setAttr('data-a11y-bold-text', !!s.boldText) |
    setAttr('data-a11y-high-contrast', !!s.highContrastText);

  // html 层 filter 合成（单写点：RBC × daltonizer × inversion）
  const filter = resolveHtmlFilter({
    rbc: !!s.rbc,
    daltonizerEnabled: !!s.daltonizerEnabled,
    daltonizerMode: s.daltonizerMode,
    daltonizerSaturation: s.daltonizerSaturation,
    colorInversion: !!s.colorInversion,
  });
  if (el.style.filter !== filter) el.style.filter = filter;

  // 字体大小（根字号通道；100% 清 inline 恢复 UA 默认）
  const fs = clampFontScale(s.fontScale);
  if (fs === 100) el.style.removeProperty('font-size');
  else el.style.fontSize = `${(fs / 100) * 16}px`;

  // 显示大小（应用内容层 zoom 变量；100% 清变量回退 CSS 默认 1）
  const ds = clampDisplayScale(s.displayScale);
  if (ds === 100) el.style.removeProperty('--a11y-display-scale');
  else el.style.setProperty('--a11y-display-scale', String(ds / 100));

  // 属性通道变更广播（缓存型消费点 watchReduceMotion 订阅面）
  if (attrChanged && typeof doc.dispatchEvent === 'function') {
    try {
      doc.dispatchEvent(new CustomEvent(REDUCE_MOTION_EVENT, { detail: { active: !!s.removeAnimations } }));
    } catch (e) { /* 测试桩无 CustomEvent */ }
  }
  return { attrChanged: !!attrChanged, filter };
}

/** 开机应用（main.js 启动序调用；幂等可重复） */
export function applyA11yPersisted(doc = document) {
  return applyA11yRuntime(loadA11yStore(), doc);
}

// window 桥（settings 页内联脚本消费；同名只注册一次，多入口 import 幂等）
if (typeof window !== 'undefined' && !window.__a11yApplyRuntime) {
  window.__a11yApplyRuntime = (s, doc) => applyA11yRuntime(s, doc || document);
  window.__a11yLoadStore = () => loadA11yStore();
}
