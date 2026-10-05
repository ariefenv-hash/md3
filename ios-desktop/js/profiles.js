// ==================== profiles.js — 多模式（工作 / 个人）一键切换 ====================
//
// 批次二「系统级体验」：为整套个性化配置建立命名快照，一键切换并全程伴随连贯动画：
//   壁纸交叉淡入 → 主题色相渐变过渡（MD3 令牌整体变色）→ 图标逐格弹簧重排。
//
// 快照范围（每个模式独立记忆）：
//   hue（MD3 色相）/ themeMode（浅色/深色/跟随系统）/ 壁纸（程序化动态/预设 URL/自定义保留）
//   / 桌面图标排列 pagesApps / 已移除应用 removedApps —— 工作模式可以只留办公应用。
//
// 数据设计：配置本体继续落在既有"单一真源"键上（theme-hue / theme-mode /
// pages-apps / removed-apps / procedural-wallpaper / ios-desktop:wallpaper），
// profiles 只保存快照副本 —— 启动恢复链路零改动；切换 = 写回快照 + 动画应用。
//
// 自定义上传壁纸（Blob）与视频壁纸不逐模式复制存储（避免成倍占用 IndexedDB），
// 快照记为 kind:'custom'，切换时保持当前壁纸不动，仅切换主题与图标布局。

import { state, savePagesApps } from './state.js';
import { renderDesktopPages } from './desktop.js';
import { applyThemeHue } from './theme-engine.js';
import { setThemeMode, getThemeModePref } from './theme-mode.js';
import { getHue, getWallpaperURL, clearCustomWallpaper, DEFAULT_WALLPAPER_URL } from './wallpaper.js';
import {
  PROCEDURAL_STORAGE_KEY, applyProceduralWallpaper,
  clearProceduralWallpaper, getActiveProceduralId,
} from './procedural-wallpaper.js';
import { clearVideoWallpaper } from './video-wallpaper.js';
import { showSystemToast, setDndActive } from './quick-settings.js';
import { playSfx } from './sound-haptics.js';

const PROFILES_KEY = 'ios-desktop:profiles';
const ACTIVE_KEY = 'ios-desktop:active-profile';

/** 动画过渡期标记：防止连点导致动画栈互相踩踏 */
let switching = false;

// ==================== 快照 ====================

/** 探测当前壁纸形态（优先级与 restoreWallpaper 一致：视频/程序化 → IDB 自定义 → 预设 URL） */
function detectCurrentWallpaper() {
  const procId = getActiveProceduralId();
  if (procId) return { kind: 'procedural', id: procId };
  const url = getWallpaperURL();
  if (!url) {
    // restoreWallpaper 的默认分支只铺 CSS 背景不记 URL —— 归为「默认预设」，
    // 保证模式切换回来时默认壁纸能被正确还原（而非误判为自定义保留现状）。
    // 视频壁纸同理落入此分支：切回时以默认静态壁纸呈现（Blob 不逐模式复制）。
    return { kind: 'preset', url: DEFAULT_WALLPAPER_URL };
  }
  if (url.startsWith('blob:') || url.startsWith('data:')) return { kind: 'custom' };
  return { kind: 'preset', url };
}

/** 把当前生效的个性化状态打包成一份快照 */
function snapshotCurrent() {
  const clone = (v) => JSON.parse(JSON.stringify(v || []));
  return {
    hue: getHue() || 215,
    themeMode: getThemeModePref() || 'dark',
    wallpaper: detectCurrentWallpaper(),
    pagesApps: clone(state.pagesApps),
    removedApps: clone(state.removedApps),
    dnd: document.body.classList.contains('dnd-mode-active'), // 批次四：勿扰跟随场景快照
  };
}

// ==================== 持久化 ====================

function loadProfiles() {
  try {
    const saved = localStorage.getItem(PROFILES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.personal && parsed.work) return parsed;
    }
  } catch (e) {}
  return null;
}

function saveProfiles(profiles) {
  try { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); } catch (e) {}
}

function loadActiveId() {
  try { return localStorage.getItem(ACTIVE_KEY) || 'personal'; } catch (e) { return 'personal'; }
}

function saveActiveId(id) {
  try { localStorage.setItem(ACTIVE_KEY, id); } catch (e) {}
}

/** 首次使用：以当前外观播种「个人」，派生一套区分度明显的「工作」预设 */
function seedProfiles() {
  const personal = { id: 'personal', name: '个人', ...snapshotCurrent() };
  const work = {
    id: 'work',
    name: '工作',
    ...snapshotCurrent(),
    // 工作模式出厂预置：沉稳绿色相 + 抽象几何预设壁纸，与个人模式拉开视觉区分度
    hue: 155,
    themeMode: 'dark',
    wallpaper: { kind: 'preset', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80' },
  };
  const profiles = { personal, work };
  saveProfiles(profiles);
  saveActiveId('personal');
  return profiles;
}

// ==================== 壁纸应用（与主题面板的持久化写法保持一致） ====================

function applyProfileWallpaper(wp) {
  if (!wp || wp.kind === 'custom') return; // 自定义壁纸：保持现状

  if (wp.kind === 'procedural' && wp.id) {
    // 与 theme-engine 动态卡片点击逻辑一致：互斥清理 → 应用程序化壁纸
    clearCustomWallpaper();
    clearVideoWallpaper();
    try { localStorage.removeItem('ios-desktop:wallpaper'); sessionStorage.removeItem('ios-desktop:wallpaper'); } catch (e) {}
    applyProceduralWallpaper(wp.id, { persist: true, showToast: false });
    return;
  }

  if (wp.kind === 'preset' && wp.url) {
    // fix(P2)：默认壁纸标记（url === DEFAULT_WALLPAPER_URL）还原为程序化「极光流体」——
    // 与 restoreWallpaper 默认分支（v7.6 起程序化优先）保持一致；旧实现把标记 URL
    // 当真实远程图直铺，模式切换会把零网络依赖的动态默认壁纸换成跨源远程图（离线必丢）
    if (wp.url === DEFAULT_WALLPAPER_URL) {
      clearCustomWallpaper();
      clearProceduralWallpaper();
      clearVideoWallpaper();
      try { localStorage.removeItem('ios-desktop:wallpaper'); sessionStorage.removeItem('ios-desktop:wallpaper'); } catch (e) {}
      applyProceduralWallpaper('aurora', { persist: true, showToast: false });
      return;
    }
    // 与 theme-engine 预设卡片点击逻辑一致：清自定义/动态/视频记录 → 直铺 URL → 持久化
    clearCustomWallpaper();
    clearProceduralWallpaper();
    clearVideoWallpaper();
    try { localStorage.setItem('ios-desktop:wallpaper', wp.url); } catch (e) {}
    document.getElementById('desktop').style.backgroundImage = `url('${wp.url}')`;
    document.querySelectorAll('iframe').forEach((iframe) => {
      try { iframe.contentWindow.postMessage({ type: 'set-wallpaper', url: wp.url }, '*'); } catch (e) {}
    });
  }
}

// ==================== 切换动画 ====================

const ANIM_STYLE_ID = 'profile-anim-style';

function ensureAnimStyle() {
  if (document.getElementById(ANIM_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = ANIM_STYLE_ID;
  style.textContent = `
    /* 壁纸交叉淡入层：置于桌面底层，铺新壁纸后淡入，与旧壁纸形成交叉溶解 */
    #profileWpFader {
      position: absolute; inset: 0; z-index: 0; pointer-events: none;
      background-size: cover; background-position: center;
      opacity: 0; transition: opacity 0.55s ease;
    }
    /* 主题色相渐变：过渡期内对颜色类属性做全局补间（不影响 transform 弹簧动画） */
    body.theme-morphing *, body.theme-morphing *::before, body.theme-morphing *::after {
      transition: background-color .5s ease, color .5s ease, border-color .5s ease, fill .5s ease, stroke .5s ease !important;
    }
    /* 图标弹簧重排：逐格错峰入场（delay 由 JS 按 slot 内序号写入） */
    @keyframes profileIconIn {
      from { opacity: 0; transform: scale(.55) translateY(16px); }
      to   { opacity: 1; transform: none; }
    }
    .profile-relayout .app-icon, .profile-relayout .app-folder {
      animation: profileIconIn .42s cubic-bezier(.2, .9, .25, 1.25) both;
    }
  `;
  document.head.appendChild(style);
}

/** 壁纸交叉淡入：返回收尾函数（淡入完成后移除覆盖层） */
function crossfadeWallpaper(targetUrl) {
  const desktop = document.getElementById('desktop');
  if (!desktop || !targetUrl) return () => {};
  ensureAnimStyle();
  const fader = document.createElement('div');
  fader.id = 'profileWpFader';
  fader.style.backgroundImage = `url('${targetUrl}')`;
  desktop.insertBefore(fader, desktop.firstChild);
  // 双 rAF 确保首帧以 opacity:0 参与合成，再触发过渡
  requestAnimationFrame(() => requestAnimationFrame(() => { fader.style.opacity = '1'; }));
  return () => setTimeout(() => fader.remove(), 650);
}

/** 图标逐格弹簧重排：渲染后为每个图标按页内序号写入错峰 delay */
function staggerIcons() {
  const slider = document.getElementById('desktopSlider') || document.querySelector('.desktop-slider');
  if (!slider) return;
  slider.classList.add('profile-relayout');
  slider.querySelectorAll('.app-icon, .app-folder').forEach((el, i) => {
    el.style.animationDelay = `${(i % 24) * 16}ms`;
  });
  setTimeout(() => {
    slider.classList.remove('profile-relayout');
    slider.querySelectorAll('.app-icon, .app-folder').forEach((el) => { el.style.animationDelay = ''; });
  }, 1100);
}

// ==================== 主流程 ====================

let profiles = null;
let activeId = 'personal';

export function initProfiles() {
  profiles = loadProfiles() || seedProfiles();
  activeId = loadActiveId();
  if (!profiles[activeId]) activeId = 'personal';
  ensureAnimStyle();

  window.__profiles = {
    toggle: () => switchTo(activeId === 'personal' ? 'work' : 'personal'),
    switchTo: (id) => switchTo(id),
    current: () => activeId,
    isSwitching: () => switching,
    /** 供设置页渲染：[{id,name,active,hue}] */
    list: () => Object.values(profiles).map((p) => ({
      id: p.id, name: p.name, hue: p.hue, active: p.id === activeId,
    })),
  };
}

/**
 * 切换到指定模式：保存当前外观快照 → 动画应用目标快照。
 * 全程约 600ms，期间忽略重复触发。
 */
export function switchTo(id) {
  if (switching || !profiles || !profiles[id] || id === activeId) return;
  switching = true;

  // 1) 离场快照：当前外观写入即将离开的模式（下次切回原样恢复）
  profiles[activeId] = { ...profiles[activeId], ...snapshotCurrent() };
  saveProfiles(profiles);

  const target = profiles[id];
  activeId = id;
  saveActiveId(id);

  // 2) 壁纸交叉淡入（自定义壁纸保持现状，无淡入层）
  const wpUrl = target.wallpaper && target.wallpaper.kind === 'preset' ? target.wallpaper.url : '';
  const finishFade = wpUrl ? crossfadeWallpaper(wpUrl) : null;

  // 3) 主题色相 + 外观模式（theme-morphing 全局颜色补间由 ensureAnimStyle 提供）
  document.body.classList.add('theme-morphing');
  applyProfileWallpaper(target.wallpaper);
  applyThemeHue(target.hue || 215, false);
  setThemeMode(target.themeMode || 'dark');
  // 3.5) 勿扰跟随场景（快照记忆，切回恢复；silent 避免与模式切换 Toast 重叠）
  setDndActive(!!target.dnd, { silent: true });

  // 4) 桌面图标布局逐格弹簧重排（pagesApps / removedApps 写回单一真源键）
  try {
    state.pagesApps = JSON.parse(JSON.stringify(target.pagesApps || state.pagesApps));
    state.removedApps = JSON.parse(JSON.stringify(target.removedApps || []));
    localStorage.setItem('ios-desktop:removed-apps', JSON.stringify(state.removedApps));
    savePagesApps();
    renderDesktopPages();
    staggerIcons();
  } catch (e) {}

  // 5) 收尾：淡出过渡类 + 广播子应用 + 轻提示
  setTimeout(() => {
    document.body.classList.remove('theme-morphing');
    if (finishFade) finishFade();
    document.querySelectorAll('iframe').forEach((iframe) => {
      try { iframe.contentWindow.postMessage({ type: 'system-profile-changed', profile: id }, '*'); } catch (e) {}
    });
    playSfx('profile');
    showSystemToast(`已切换到「${target.name}」模式`);
    switching = false;
  }, 560);
}
