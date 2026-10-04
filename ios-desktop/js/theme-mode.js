// ==================== theme-mode.js — 外观模式（跟随系统 / 浅色 / 深色） ====================
//
// 三档偏好：auto（跟随系统，默认）/ light / dark，持久化到 localStorage。
// auto 档监听系统 prefers-color-scheme 变化实时切换。
// 实现载体：body.light-theme 类（theme-mode.css 中集中覆盖全部表层变量）。
// 快捷设置「深色模式」磁贴与主题面板「外观」分段控件均走此处，单一真源。

const MODE_KEY = 'ios-desktop:theme-mode'; // 'auto' | 'light' | 'dark'

let pref = 'auto';
let mql = null;

try { mql = window.matchMedia('(prefers-color-scheme: dark)'); } catch (e) {}

function loadPref() {
  try {
    const v = localStorage.getItem(MODE_KEY);
    if (v === 'light' || v === 'dark' || v === 'auto') pref = v;
  } catch (e) {}
}

/** 解析后的实际模式（auto 时取系统） */
export function getResolvedTheme() {
  if (pref === 'auto') {
    try { return mql && mql.matches ? 'dark' : 'light'; } catch (e) { return 'dark'; }
  }
  return pref;
}

export function getThemeModePref() { return pref; }

function apply() {
  const light = getResolvedTheme() === 'light';
  document.body.classList.toggle('light-theme', light);
  // 状态栏/磁贴等依赖 body 类渲染的模块下一次渲染自然生效
  if (typeof window.__onThemeModeChanged === 'function') window.__onThemeModeChanged(light);
}

/** 设置外观偏好（'auto' | 'light' | 'dark'），持久化并立即生效 */
export function setThemeMode(mode) {
  if (!['auto', 'light', 'dark'].includes(mode)) return;
  pref = mode;
  try { localStorage.setItem(MODE_KEY, mode); } catch (e) {}
  apply();
}

export function initThemeMode() {
  loadPref();
  apply();
  if (mql && mql.addEventListener) {
    mql.addEventListener('change', () => { if (pref === 'auto') apply(); });
  }
  // 测试钩子
  window.__themeModeTest = {
    pref: () => pref,
    resolved: () => getResolvedTheme(),
    set: (m) => setThemeMode(m),
  };
}
