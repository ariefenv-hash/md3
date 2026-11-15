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
  // #325：壳层 html 同步写 data-theme-mode（与 theme-engine.js:723 对 iframe 的写法同惯例）。
  // 缺此属性时 apps/_shared/md3-tokens.css 的 `@media(prefers-color-scheme:light)
  // :root:not([data-theme-mode])` 块会在「OS=light + 用户选暗」混合极性下把浅色
  // :root 令牌（surface-container-highest 87% 等）倒灌进已选暗的壳层，开关轨面/outline
  // 全被顶成浅色值（无头实测：暗球 #938F99 对被顶浅轨仅 2.30:1）。属性就位后该块被
  // :not() 排除，壳层极性与 body.light-theme 单源同步；浅色态与 tokens
  // [data-theme-mode="light"] 公式逐字一致（tokens 头注契约），渲染零变化。
  document.documentElement.dataset.themeMode = light ? 'light' : 'dark';
  // 状态栏/磁贴等依赖 body 类渲染的模块下一次渲染自然生效
  if (typeof window.__onThemeModeChanged === 'function') window.__onThemeModeChanged(light);
  // v8.11 #70：真源变化广播（battery-saver-changed 同款单一真源模式）——
  // settings.js DISPLAY 页 syncDark 绑定的 settings-theme-changed 此前全库零派发
  //（死链），设置打开期间经控制中心深色磁贴/主题面板/__settingsTheme.set 改主题
  // 时开关真值无处刷新；广播后既有 bindDoc 监听直接接管，零新增消费点
  try {
    document.dispatchEvent(new CustomEvent('settings-theme-changed', { detail: { light } }));
  } catch (e) {}
}

/** 设置外观偏好（'auto' | 'light' | 'dark'），持久化并立即生效 */
export function setThemeMode(mode) {
  if (!['auto', 'light', 'dark'].includes(mode)) return;
  pref = mode;
  try { localStorage.setItem(MODE_KEY, mode); } catch (e) {}
  apply();
  // v9.94 #33：Monet 覆盖层随深浅双轨重擀（零 import 防循环——theme-engine 初始化时注册，
  // 与 window.showSystemToast 同惯例；未初始化时无操作）
  if (typeof window !== 'undefined' && window.__monetReroll) window.__monetReroll();
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
