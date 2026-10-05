// ==================== search-service.js — Pixel 10 智能全局搜索与即时计算 ====================

import { initialApps } from './apps-data.js';
import { openApp } from './app-window.js';
import { ICONS } from './icons.js';
import { getAppIconSVG } from './app-icons.js';
import { createDynamicIconHTML } from './dynamic-icons.js';
import { mediaService } from './media-service.js';
import { beginLiveSwipe, moveLiveSwipe, settleLiveSwipe } from './desktop.js';
import { openRecentApps } from './recent-apps.js';
import { state } from './state.js';

let searchIndex = [];
let selectedResultIndex = 0;
let currentResults = [];

/** 初始化全局搜索组件与索引库 */
export function initSearchService() {
  buildSearchIndex();
  createSearchOverlayDOM();
  createDesktopSearchPill();
}

/**
 * 重建索引（卸载/恢复应用后调用）—— 应用索引需随 removedApps 变化增删。
 * 仅重建数据层，不重建 DOM（overlay/pill 均不依赖索引内容）。
 */
export function rebuildSearchIndex() {
  buildSearchIndex();
}

/** 构建全系统多维度搜索索引 */
function buildSearchIndex() {
  searchIndex = [];

  // fix(P2)：索引构建时过滤已卸载应用 —— 旧实现直接遍历 initialApps，
  // 已卸载应用仍可搜出并启动（与 share-sheet/share-registry 的卸载过滤不一致）。
  // 归一化兼容字符串数组与对象数组两种历史形态（同 share-registry.toRemovedSet）。
  const removedSet = new Set();
  const removedList = state.removedApps || [];
  for (const it of removedList) {
    if (typeof it === 'string') removedSet.add(it);
    else if (it && it.id) removedSet.add(it.id);
  }

  // 1. 应用索引
  initialApps.forEach((app, idx) => {
    if (removedSet.has(app.id)) return; // 已卸载应用不入索引
    searchIndex.push({
      type: 'app',
      id: app.id,
      title: app.name,
      sub: '系统应用',
      // 图标渲染走 getAppIconSVG(id) 本地 SVG（见下方渲染端），不再携带 iconUrl 网络图
      iconType: app.type,
      action: (sourceRect) => {
        // 有点按位置（搜索结果图标）→ 应用从点按处起飞；无 → 回退桌面图标
        if (sourceRect && sourceRect.width > 0) {
          openApp(idx, null, sourceRect);
        } else {
          const iconEl = document.querySelector(`[data-id="${app.id}"]`);
          openApp(idx, iconEl);
        }
      },
      keywords: [app.name, app.id]
    });
  });

  // 2. 快捷控制与实用功能
  const actions = [
    {
      title: '手电筒 / Torch',
      sub: '开关屏幕照明',
      iconKey: 'torch',
      action: () => {
        const tile = document.querySelector('[data-tile-id="torch"]');
        if (tile) tile.click();
      },
      keywords: ['手电筒', 'torch', 'light', '照明', '闪光灯']
    },
    {
      title: '深色模式 / Dark theme',
      sub: '切换系统色彩主题',
      iconKey: 'darktheme',
      action: () => {
        const tile = document.querySelector('[data-tile-id="darktheme"]');
        if (tile) tile.click();
      },
      keywords: ['深色模式', '暗黑模式', 'dark', 'theme', '夜间模式']
    },
    {
      title: '壁纸与样式 / Wallpaper',
      sub: '自定义 Material You 配色与壁纸',
      iconKey: 'colour_correction',
      action: () => {
        if (window.openThemePicker) window.openThemePicker();
      },
      keywords: ['壁纸', '主题', '样式', 'wallpaper', 'theme', 'color', '颜色']
    },
    {
      title: '省电模式 / Battery Saver',
      sub: '降低设备功耗',
      iconKey: 'battery_saver',
      action: () => {
        const tile = document.querySelector('[data-tile-id="battery_saver"]');
        if (tile) tile.click();
      },
      keywords: ['省电', '电池', 'battery', 'power']
    },
    {
      title: '播放/暂停电台音乐',
      sub: '全局流媒体播放控制',
      iconKey: 'song_search',
      action: () => mediaService.togglePlay(),
      keywords: ['音乐', '电台', '播放', 'play', 'music', 'radio', 'audio', '暂停']
    },
    {
      title: '屏幕录制 / Screen Record',
      sub: '开始/停止屏幕录制',
      iconKey: 'screen_record',
      action: () => {
        const tile = document.querySelector('[data-tile-id="screen_record"]');
        if (tile) tile.click();
      },
      keywords: ['录屏', '录制', 'screen record', 'video']
    }
  ];

  actions.forEach(act => {
    searchIndex.push({
      type: 'action',
      title: act.title,
      sub: act.sub,
      iconKey: act.iconKey,
      action: act.action,
      keywords: act.keywords
    });
  });
}

/**
 * 搜索胶囊手势直通：Android 的底部手势带与搜索胶囊视觉上同域，
 * 胶囊上的横滑（切页）与上滑（唤出后台）必须转发给桌面手势系统，
 * 否则真机底部 70px 内的手势会被胶囊吞掉。
 * 点击行为不受影响：只有位移超过阈值才判定为手势并抑制后续 click。
 */
function makeZoneSwipeAware(zone) {
  if (!zone || zone.dataset.swipeAware === '1') return;
  zone.dataset.swipeAware = '1';

  let sx = 0, sy = 0, armed = false, live = false, moved = false;

  const reset = () => { armed = false; live = false; moved = false; };

  // 手势化移动后的 click 一律吞掉（防止松手落点误开搜索/相机）
  zone.addEventListener('click', (e) => {
    if (moved) {
      e.stopImmediatePropagation();
      e.preventDefault();
      moved = false;
    }
  }, true);

  // ---------- 鼠标 ----------
  zone.addEventListener('mousedown', (e) => {
    sx = e.clientX; sy = e.clientY;
    armed = true; live = false; moved = false;
  });
  window.addEventListener('mousemove', (e) => {
    if (!armed) return;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) moved = true;
    if (!live && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      live = true;
      beginLiveSwipe(sx);
    }
    if (live) moveLiveSwipe(e.clientX);
  });
  window.addEventListener('mouseup', (e) => {
    if (!armed) return;
    armed = false;
    if (live) {
      live = false;
      settleLiveSwipe();
      return;
    }
    const dy = e.clientY - sy;
    if (sy > window.innerHeight - 90 && dy < -45) {
      moved = true; // 吞掉随后的 click
      openRecentApps();
    }
  });

  // ---------- 触摸 ----------
  zone.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    if (!t) return;
    sx = t.clientX; sy = t.clientY;
    armed = true; live = false; moved = false;
  }, { passive: true });
  zone.addEventListener('touchmove', (e) => {
    if (!armed) return;
    const t = e.touches[0];
    if (!t) return;
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) moved = true;
    if (!live && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      live = true;
      beginLiveSwipe(sx);
    }
    if (live) {
      moveLiveSwipe(t.clientX);
      if (e.cancelable) e.preventDefault();
    }
  }, { passive: false });
  const touchEnd = (e) => {
    if (!armed) return;
    armed = false;
    if (live) {
      live = false;
      settleLiveSwipe();
      return;
    }
    const t = e.changedTouches && e.changedTouches[0];
    const dy = t ? t.clientY - sy : 0;
    if (sy > window.innerHeight - 90 && dy < -45) {
      moved = true;
      openRecentApps();
    }
  };
  zone.addEventListener('touchend', touchEnd, { passive: true });
  zone.addEventListener('touchcancel', () => {
    if (live) { live = false; settleLiveSwipe(); }
    reset();
  }, { passive: true });
}

/** 注入桌面底部的 Pixel 智能搜索胶囊 */
function createDesktopSearchPill() {
  const existing = document.getElementById('desktopSearchWidget');
  if (existing) existing.remove();

  const pill = document.createElement('div');
  pill.id = 'desktopSearchWidget';
  pill.className = 'desktop-search-pill';
  pill.innerHTML = `
    <div class="search-pill-left">
      <span class="search-g-logo">G</span>
      <span class="search-placeholder">搜索应用、联系人、设置、即时计算...</span>
    </div>
    <div class="search-pill-right">
      <button class="search-icon-btn mic-btn" title="语音助手">${ICONS.mic_access}</button>
      <button class="search-icon-btn lens-btn" title="智慧镜头">${ICONS.google_lens || ICONS.camera_access}</button>
    </div>
  `;

  pill.querySelector('.search-pill-left').addEventListener('click', (e) => {
    e.stopPropagation();
    openSearchDialog();
  });

  pill.querySelector('.mic-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openSearchDialog();
    const input = document.getElementById('globalSearchInput');
    if (input) {
      input.placeholder = '正在聆听语音指令...';
      setTimeout(() => {
        if (input.placeholder.includes('聆听')) {
          input.placeholder = '输入应用名称、计算式或功能...';
        }
      }, 3000);
    }
  });

  pill.querySelector('.lens-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const cameraApp = initialApps.find(a => a.id === 'camera');
    if (cameraApp) {
      const idx = initialApps.findIndex(a => a.id === 'camera');
      const iconEl = document.querySelector('[data-id="camera"]');
      openApp(idx, iconEl);
    } else {
      openSearchDialog();
    }
  });

  pill.addEventListener('click', () => {
    openSearchDialog();
  });

  // 底部手势直通：胶囊三个可点区域上的滑动转发给桌面分页/后台系统
  makeZoneSwipeAware(pill.querySelector('.search-pill-left'));
  makeZoneSwipeAware(pill.querySelector('.mic-btn'));
  makeZoneSwipeAware(pill.querySelector('.lens-btn'));

  document.body.appendChild(pill);
}

/** 创建全局搜索弹窗 DOM */
function createSearchOverlayDOM() {
  let overlay = document.getElementById('pixelSearchOverlay');
  if (overlay) return;

  overlay = document.createElement('div');
  overlay.id = 'pixelSearchOverlay';
  overlay.className = 'pixel-search-overlay';
  overlay.innerHTML = `
    <div class="search-modal-card">
      <div class="search-input-box">
        <span class="search-input-icon">${ICONS.search}</span>
        <input type="text" id="globalSearchInput" placeholder="输入应用名称、计算式或功能..." autocomplete="off">
        <button class="search-clear-btn" id="searchClearBtn" style="display:none;">${ICONS.close}</button>
      </div>

      <!-- 快捷标签推荐 -->
      <div class="search-quick-chips" id="searchQuickChips">
        <button class="search-chip" data-query="2048">${ICONS.star} 纸牌接龙</button>
        <button class="search-chip" data-query="信息">${ICONS.chat} 角色消息</button>
        <button class="search-chip" data-query="相机">${ICONS.photo_camera} 拍照录像</button>
        <button class="search-chip" data-query="壁纸">${ICONS.palette} 壁纸样式</button>
        <button class="search-chip" data-query="手电筒">${ICONS.torch} 手电筒</button>
      </div>

      <!-- 搜索结果列表 -->
      <div class="search-results-list" id="searchResultsList"></div>
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSearchDialog();
  });

  document.body.appendChild(overlay);

  const input = document.getElementById('globalSearchInput');
  const clearBtn = document.getElementById('searchClearBtn');

  input.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    clearBtn.style.display = val ? 'flex' : 'none';
    performSearch(val);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.style.display = 'none';
    input.focus();
    performSearch('');
  });

  // 快捷标签点击
  overlay.querySelectorAll('.search-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.dataset.query;
      input.value = q;
      clearBtn.style.display = 'flex';
      performSearch(q);
      input.focus();
    });
  });

  // 键盘导航
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentResults.length > 0) {
        selectedResultIndex = (selectedResultIndex + 1) % currentResults.length;
        updateSelectedResultItem();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentResults.length > 0) {
        selectedResultIndex = (selectedResultIndex - 1 + currentResults.length) % currentResults.length;
        updateSelectedResultItem();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentResults[selectedResultIndex]) {
        // 键盘路径：从当前选中结果项的图标位置起飞
        const items = document.querySelectorAll('.search-result-item');
        const selEl = items[selectedResultIndex];
        const iconRect = selEl ? (selEl.querySelector('.search-item-icon')?.getBoundingClientRect() || null) : null;
        executeResult(currentResults[selectedResultIndex], iconRect);
      }
    }
  });
}

/** 执行即时搜索 */
function performSearch(query) {
  const container = document.getElementById('searchResultsList');
  if (!container) return;

  currentResults = [];
  selectedResultIndex = 0;

  if (!query) {
    // 默认展示推荐应用
    currentResults = searchIndex.slice(0, 6);
    renderResults(currentResults, '为你推荐');
    return;
  }

  // 1. 尝试数学算式直接求值 (如 128*4, 500-24, 3.14*10^2)
  if (/^[\d\s\+\-\*\/\(\)\.\^%]+$/.test(query) && /[\+\-\*\/\^%]/.test(query)) {
    try {
      const sanitized = query.replace(/\^/g, '**');
      const calcResult = Function(`'use strict'; return (${sanitized})`)();
      if (typeof calcResult === 'number' && !isNaN(calcResult)) {
        currentResults.push({
          type: 'calc',
          title: `${query} = ${calcResult}`,
          sub: '即时数学计算结果 (按 Enter 复制)',
          iconText: ICONS.calculator,
          action: () => {
            navigator.clipboard.writeText(String(calcResult));
            if (window.showSystemToast) window.showSystemToast(`已复制计算结果: ${calcResult}`, ICONS.content_copy);
          }
        });
      }
    } catch (err) {}
  }

  // 2. 匹配索引库
  const lowerQ = query.toLowerCase();
  searchIndex.forEach(item => {
    const match = item.keywords.some(k => k.toLowerCase().includes(lowerQ)) || item.title.toLowerCase().includes(lowerQ);
    if (match) {
      currentResults.push(item);
    }
  });

  // 3. 添加 Web 搜索后备选项
  currentResults.push({
    type: 'web',
    title: `在 Google 中搜索 “${query}”`,
    sub: '打开网页搜索',
    iconText: ICONS.language,
    action: () => {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
    }
  });

  renderResults(currentResults, `找到 ${currentResults.length} 个结果`);
}

/** 渲染结果列表 */
function renderResults(results, headerText) {
  const container = document.getElementById('searchResultsList');
  if (!container) return;

  if (results.length === 0) {
    container.innerHTML = `<div class="search-empty">未找到相关结果</div>`;
    return;
  }

  container.innerHTML = `
    <div class="search-section-title">${headerText}</div>
    <div class="search-items-wrap">
      ${results.map((r, idx) => `
        <div class="search-result-item ${idx === selectedResultIndex ? 'selected' : ''}" data-idx="${idx}">
          <div class="search-item-icon">
            ${r.type === 'app' ? (r.iconType ? createDynamicIconHTML(r.iconType, false) : getAppIconSVG(r.id)) : (r.iconKey ? ICONS[r.iconKey] : (r.iconText || ICONS.auto_awesome))}
          </div>
          <div class="search-item-info">
            <div class="search-item-title">${r.title}</div>
            <div class="search-item-sub">${r.sub}</div>
          </div>
          <span class="search-item-enter">${ICONS.corner_down_left}</span>
        </div>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.dataset.idx, 10);
      if (results[idx]) {
        // 捕获点按结果图标位置，供应用打开动画从此处起飞
        const iconRect = item.querySelector('.search-item-icon')?.getBoundingClientRect() || null;
        executeResult(results[idx], iconRect);
      }
    });
  });
}

function updateSelectedResultItem() {
  const items = document.querySelectorAll('.search-result-item');
  items.forEach((it, idx) => {
    it.classList.toggle('selected', idx === selectedResultIndex);
    if (idx === selectedResultIndex) {
      it.scrollIntoView({ block: 'nearest' });
    }
  });
}

function executeResult(item, sourceRect = null) {
  closeSearchDialog();
  if (item && item.action) {
    setTimeout(() => item.action(sourceRect), 50);
  }
}

/** 打开搜索对话框 */
export function openSearchDialog() {
  const overlay = document.getElementById('pixelSearchOverlay');
  const input = document.getElementById('globalSearchInput');
  if (!overlay || !input) return;

  overlay.classList.add('active');
  input.value = '';
  document.getElementById('searchClearBtn').style.display = 'none';
  performSearch('');
  setTimeout(() => input.focus(), 80);
}

/** 关闭搜索对话框 */
export function closeSearchDialog() {
  const overlay = document.getElementById('pixelSearchOverlay');
  if (overlay) overlay.classList.remove('active');
}
