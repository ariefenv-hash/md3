// ==================== settings-two-pane.js — 设置应用 Android 16 式双栏分屏 ====================
//
// issue #7（v7.51）四项需求一并落地：
//   ① 宽容器（≥620px，横屏 / 平板 / 分屏宽格）自动切双栏：左栏搜索 + 设置列表，
//      右栏为详情面板（对应 Android 16 双栏设置的右窗格；参考 issue 截图1）
//   ② 设置项左侧图标加 Android 16 同款多彩圆形底板 —— 底板为固定色，不随主题/系统配色变化
//   ③ 设置应用主题色调继续走全局 --md-h 动态令牌（theme-engine 注入，跟随系统配色方案），
//      仅多彩底板例外（②），与原生行为一致
//   ④ 默认进入设置时右栏自动选中「动画与动效」（模拟器无网络设置，对应原生默认网络首屏）
//   ⑤ 健壮性：右栏未打开任何设置项时显示「请打开一个设置项以查看」空态引导
//
// 架构关键决策：宽栏「移动而非复制」页面 —— 把 page-stack 的 .app-page 元素物理
// appendChild 到右栏（脚本只执行一次、无 ID 重复、app-page-active 事件照常驱动动态页）；
// 切回窄栏或应用销毁时归还页面并恢复栈隐藏态。分屏窗格（无栈页元素可移动）走
// 内容注入回退路径。窄容器下 DOM 结构与旧版单栏布局视觉完全一致。

import { ICONS } from '../icons.js';
import { reactivateScripts } from '../page-stack.js';
import { dom } from '../dom.js';
import { state } from '../state.js';

// 双栏触发阈值：容器内容宽度 ≥ 620px 视为宽格局（分屏宽格 / 平板 / 横屏均满足）
const WIDE_THRESHOLD = 620;
// ④ 默认首屏：动画与动效（页栈索引 10）
const DEFAULT_PAGE = 10;

// 左栏清单（Android 16 双栏样式：图标多彩底板 + 标题 + 副标题）
// accent 为固定底色，刻意不使用 --md-h 动态令牌（②：底板不换颜色）
// hintId 为既有内联脚本维护的实时提示 span（电池电量 / 动画倍率 / 导航方式等）
const GROUPS = [
  {
    title: '个性化与主题',
    items: [
      { idx: 13, icon: 'image', label: '壁纸与动态壁纸', sub: '壁纸 · 动态效果', accent: '#7e57c2' },
      // v7.54：v7.53 漏挂入口 —— 页面定义（pageIdx 14）已在 settingsApp.pages，但清单无行，
      // 用户在设置里永远点不到「桌面与 Dock」（行列 / Dock 数量 / macOS 神奇效果成了孤岛页）
      { idx: 14, icon: 'home', label: '桌面与 Dock', sub: '图标网格 · Dock 栏 · 神奇效果', accent: '#8d6e63' },
      { idx: 9, icon: 'person', label: '多模式（工作 / 个人）', sub: '资料切换', hintId: 'profileModeHint', accent: '#5c6bc0' },
      { action: 'triggerFontSelect()', icon: 'language', label: '界面排版字体', sub: '系统字体', accent: '#26a69a' },
      { idx: 6, icon: 'storage', label: '应用管理', sub: '卸载 / 恢复', accent: '#66bb6a' },
      { idx: 1, icon: 'bedtime', label: '显示与亮度调节', sub: '亮度 · 深色主题', accent: '#42a5f5' },
      { idx: 10, icon: 'auto_awesome', label: '动画与动效曲线', sub: '动效速度 · 曲线', hintId: 'animPresetHint', accent: '#ec407a' },
    ],
  },
  {
    title: '系统与设备',
    items: [
      { idx: 4, icon: 'volume', label: '声音与震动反馈', sub: '音量 · 触感', accent: '#ff7043' },
      { idx: 5, icon: 'lock', label: '应用权限管理', sub: '相机 · 麦克风等', accent: '#ef5350' },
      { idx: 7, icon: 'memory', label: '存储空间占用', sub: '空间占用统计', accent: '#26c6da' },
      { idx: 2, icon: 'battery_full', label: '电池与电源优化', sub: '电量 · 省电模式', hintId: 'settingsMainBatteryPct', accent: '#ffa726' },
      { idx: 11, icon: 'picture_in_picture', label: '后台与多任务', sub: '冻结策略', hintId: 'bgModeHint', accent: '#78909c' },
      { idx: 12, icon: 'explore', label: '系统导航方式', sub: '手势 · 三键', hintId: 'navModeHint', accent: '#29b6f6' },
      { idx: 8, icon: 'code', label: '开发者选项', sub: '实验特性', accent: '#9575cd' },
    ],
  },
  {
    title: '数据',
    items: [
      { action: 'window.__dataBackup&&window.__dataBackup.exportBackup()', icon: 'download', label: '导出数据到文件', sub: '备份到本地', accent: '#4db6ac' },
      { action: 'window.__dataBackup&&window.__dataBackup.pickImportFile()', icon: 'upload_file', label: '从文件恢复数据', sub: '导入备份', accent: '#ffb74d' },
    ],
  },
];

// ---------- 左栏 HTML 生成（settings.js 页面模板直接内插） ----------
function navRow(item) {
  const hint = item.hintId
    ? `<span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:12px;margin-right:2px;flex:none;" id="${item.hintId}"></span>`
    : '';
  const onclick = item.idx != null ? `__tpNav(this,${item.idx})` : item.action;
  const nav = item.idx != null ? ` data-tp="${item.idx}"` : '';
  return `
            <div class="md3-list-item tp-row"${nav} data-label="${item.label}" onclick="${onclick}" role="button" tabindex="0">
              <div class="tp-plate" style="--plate:${item.accent}">${ICONS[item.icon] || ''}</div>
              <div class="tp-row-text">
                <div class="tp-row-label">${item.label}</div>
                <div class="tp-row-sub">${item.sub || ''}</div>
              </div>
              ${hint}<span class="tp-chev">›</span>
            </div>`;
}

export function renderSettingsListHTML() {
  return GROUPS.map((g) => `
          <div class="tp-group" data-tp-group>${g.title}</div>
          <div class="tp-card" data-tp-card>
            ${g.items.map(navRow).join('<div class="tp-sep"></div>')}
          </div>`).join('');
}

// ---------- 会话状态 ----------
// root -> { root, pageEl, wrapper, wide, hosted, selected, searchQ, ro }
const sessions = new Map();
let sessionId = 0;

function resetStackInlineStyles(el) {
  // 从栈隐藏态升格为右栏现役页：清掉 renderPageStack 写入的隐藏位姿
  ['transform', 'opacity', 'filter', 'borderRadius', 'boxShadow', 'zIndex', 'pointerEvents'].forEach((k) => { el.style[k] = ''; });
}

function parkStackPage(el) {
  // 归还栈页：恢复 renderPageStack 对「非活动页」的标准隐藏位姿（与 else 分支一致）
  el.style.transform = 'translate3d(100%, 0, 0)';
  el.style.opacity = '0';
  el.style.filter = '';
  el.style.borderRadius = '0';
  el.style.boxShadow = '';
  el.style.zIndex = '3';
  el.style.pointerEvents = 'none';
}

function returnHosted(st) {
  if (!st.hosted) return;
  const { el, moved, idx } = st.hosted;
  el.classList.remove('tp-hosted');
  delete el.dataset.tpHosted;
  if (moved) {
    parkStackPage(el);
    if (st.wrapper && st.wrapper.isConnected) st.wrapper.appendChild(el);
  } else {
    el.remove();
  }
  st.hosted = null;
  const right = st.root.querySelector('.tp-right');
  if (right) right.classList.remove('tp-has-page');
  // 标题还原
  try { if (dom.appTitle) dom.appTitle.textContent = '设置'; } catch (e) {}
  void idx;
}

// ---------- 右栏打开指定设置项 ----------
function open(st, pageIdx) {
  const pages = st.pages;
  if (!pages || !pages[pageIdx] || !st.wide) return;
  st.selected = pageIdx;
  // 行高亮
  st.root.querySelectorAll('.tp-row').forEach((r) => {
    r.classList.toggle('tp-sel', r.dataset.tp === String(pageIdx));
  });
  const sel = st.root.querySelector(`.tp-row[data-tp="${pageIdx}"]`);
  if (sel && sel.scrollIntoView) try { sel.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}

  if (st.hosted && st.hosted.idx !== pageIdx) returnHosted(st);
  const right = st.root.querySelector('.tp-right');
  if (!right) return;

  // 优先「移动栈页」路径（全窗实例；零脚本复制、零 ID 冲突）
  const pageEl = document.getElementById(`app-page-settings-${pageIdx}`);
  if (pageEl && st.wrapper && pageEl.closest('.app-instance-wrapper') === st.wrapper) {
    st.hosted = { idx: pageIdx, el: pageEl, moved: true };
    pageEl.classList.add('tp-hosted');
    pageEl.dataset.tpHosted = '1'; // renderPageStack 豁免标记（仍在 wrapper 子树内）
    resetStackInlineStyles(pageEl);
    right.appendChild(pageEl);
  } else {
    // 注入回退路径（分屏窗格等无栈页上下文）
    if (st.hosted && !st.hosted.moved) st.hosted.el.remove();
    const copy = document.createElement('div');
    copy.className = 'app-page tp-hosted tp-host-copy';
    copy.innerHTML = pages[pageIdx].content;
    try { reactivateScripts(copy); } catch (e) {}
    right.appendChild(copy);
    st.hosted = { idx: pageIdx, el: copy, moved: false };
  }
  right.classList.add('tp-has-page');
  // 驱动动态页重建（已移除的应用 / 壁纸懒激活等既有通道）
  document.dispatchEvent(new CustomEvent('app-page-active', { detail: { appId: 'settings', pageIdx } }));
  // 右栏标题跟随（Android 16 双栏右窗格标题）
  try { if (dom.appTitle && pages[pageIdx].title) dom.appTitle.textContent = pages[pageIdx].title; } catch (e) {}
}

// ---------- 搜索（左栏顶部胶囊，Android 16 样式） ----------
function applySearch(st, q) {
  st.searchQ = q;
  const kw = (q || '').trim().toLowerCase();
  st.root.querySelectorAll('.tp-group').forEach((g) => {
    const card = g.nextElementSibling;
    let any = false;
    if (card) {
      card.querySelectorAll('.tp-row').forEach((r) => {
        const hit = !kw || (r.dataset.label || '').toLowerCase().includes(kw);
        r.classList.toggle('tp-hit-none', !hit);
        if (hit) any = true;
      });
      card.classList.toggle('tp-hit-none', !any);
    }
    g.classList.toggle('tp-hit-none', !any);
  });
}

// ---------- 宽窄判定与切换 ----------
function evalWide(st) {
  const box = st.pageEl || st.root;
  if (!box || !box.isConnected) return;
  // 栈上下文守卫：仅当设置是当前应用且页栈在根（无推入子页）时才允许宽栏，
  // 避免双栏右栏与页栈推入动画互相踩踏；栈已推入时先退回窄态，弹回栈根后
  // 由 app-page-active 驱动 reEvalAll 恢复宽态
  if (st.isStackCtx) {
    const atRoot = state.currentApp && state.currentApp.id === 'settings' && state.navHistory.length <= 1;
    if (!atRoot) {
      if (st.wide) {
        st.wide = false;
        st.root.classList.remove('tp-wide');
        if (st.pageEl) st.pageEl.classList.remove('tp-host-page');
        returnHosted(st);
      }
      return;
    }
  }
  const wide = box.clientWidth >= WIDE_THRESHOLD;
  if (wide === st.wide) {
    // 宽栏下首次就绪（实例刚挂载 / 返回栈根）补默认选中
    if (wide && !st.selected && st.pages) open(st, DEFAULT_PAGE);
    return;
  }
  st.wide = wide;
  st.root.classList.toggle('tp-wide', wide);
  if (st.pageEl) st.pageEl.classList.toggle('tp-host-page', wide);
  if (wide) {
    // ④ 进入设置的首屏：右栏默认打开「动画与动效」
    if (!st.selected) open(st, DEFAULT_PAGE);
    else open(st, st.selected); // 恢复上次选择（宽→窄→宽回归）
  } else {
    returnHosted(st);
  }
}

// ---------- 挂载（幂等） ----------
function mount(rootEl) {
  if (!rootEl || rootEl.dataset.tpMounted === '1') {
    if (rootEl) {
      const st = sessions.get(rootEl.dataset.tpSid);
      if (st) evalWide(st);
    }
    return;
  }
  rootEl.dataset.tpMounted = '1';
  const sid = String(++sessionId);
  rootEl.dataset.tpSid = sid;
  const pageEl = rootEl.closest('.app-page');
  const st = {
    sid,
    root: rootEl,
    pageEl,
    // 栈上下文判定：page-stack 的页面元素带 app-page-<appId>-<idx> 形态 id；
    // 分屏窗格的 .split-pane-page 无 id —— 走注入回退路径
    isStackCtx: !!(pageEl && pageEl.id === 'app-page-settings-0'),
    wrapper: rootEl.closest('.app-instance-wrapper'),
    wide: false,
    hosted: null,
    selected: null,
    searchQ: '',
    pages: APP_PAGES,
    ro: null,
  };
  sessions.set(sid, st);

  // 搜索框
  const input = rootEl.querySelector('.tp-search input');
  if (input) {
    input.addEventListener('input', () => applySearch(st, input.value));
    // iOS 上 focus 自动滚动的对抗：保持左栏滚动位置稳定
    input.addEventListener('focus', () => { try { rootEl.querySelector('.tp-left').scrollTop = 0; } catch (e) {} });
  }

  // 宽度监听（实例挂载时元素可能尚未入 DOM，靠 RO 首帧回调补判）
  if (window.ResizeObserver) {
    st.ro = new ResizeObserver(() => evalWide(st));
    st.ro.observe(st.pageEl || rootEl);
  }
  evalWide(st);
}

function reEvalAll() {
  sessions.forEach((st) => {
    if (!st.root.isConnected) {
      if (st.ro) st.ro.disconnect();
      sessions.delete(st.sid);
      return;
    }
    evalWide(st);
  });
}

// ---------- 行点击桥（内联 onclick 入口） ----------
function tpNav(rowEl, pageIdx) {
  const rootEl = rowEl && rowEl.closest ? rowEl.closest('.tp-root') : null;
  const st = rootEl && rootEl.dataset.tpSid ? sessions.get(rootEl.dataset.tpSid) : null;
  if (st && st.wide) {
    open(st, pageIdx);
    return;
  }
  // v7.61：小窗实例上下文 —— 全局页栈只服务 state.currentApp，小窗托管实例里
  // 点行会静默失败（currentApp 非该应用 → pushSubPage 直接 return），表现为
  // 「小窗里设置点不进二级菜单」。路由给小窗自身的轻量页栈（v7.61 miniNav）。
  const miniBody = rowEl.closest ? rowEl.closest('.mini-body') : null;
  if (miniBody) {
    const win = miniBody.closest('.mini-window');
    const appId = win && win.dataset.appId;
    if (appId && typeof window.__miniNav === 'function' && window.__miniNav(appId, pageIdx)) return;
  }
  // 窄格局：走原生页栈推入（弹簧动画路径与旧版完全一致）
  if (typeof window.pushSubPage === 'function') window.pushSubPage(pageIdx);
}

// ---------- 对外注册（settings.js / 内联脚本通过 window 全局桥使用） ----------
if (typeof window !== 'undefined') {
  window.__tpNav = tpNav;
  window.__settingsTwoPaneMount = mount;
  window.__settingsTwoPaneReEval = reEvalAll;
}

// ---------- 由 settings.js 注册页面定义（供右栏注入回退路径取 content） ----------
// 模块求值期注册（早于任何实例挂载）→ 存模块级变量，mount() 时带给新会话
let APP_PAGES = null;
export function setPages(pages) {
  APP_PAGES = pages;
  sessions.forEach((st) => { st.pages = pages; });
}

// 导出内部函数便于测试
export { mount as mountTwoPane, tpNav as twoPaneNav, open as openPane, evalWide as evalPaneWidth, sessions as paneSessions, GROUPS as TP_GROUPS, WIDE_THRESHOLD as TP_WIDE_THRESHOLD, DEFAULT_PAGE as TP_DEFAULT_PAGE };
