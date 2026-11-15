// ==================== qs-sheets.js — v7.62 磁贴底部面板簇（#284 批20 单源 · boundary-map §3.5 表第七行） ====================
//
// 自 quick-settings.js「v7.62 磁贴底部面板（内联面板：设备/网络/模式清单）」簇逐字节搬迁
//（唯一语义差异 = openNetworkSheet/openBluetoothSheet/openModesSheet 加 export 前缀——
//  宿主 TILE_LONG_CLICK_SHEET 三目的地与 handleTileAction 三分发经 import 引用，调用点文本零变化）。
// 语义锚：Android 16 QPR1 Internet 磁贴点击永远弹内联面板（无直接开关）；蓝牙/Modes 宽磁贴
// 右侧子仓开启对应清单；飞行模式开启时移动数据开关禁用（禁用态手柄 X 标记）。
// openQsSheet/quantizeCounterScale/closeQsSheet 维持既有 export 面（宿主转出口零变化）。
// 宿主共享态/函数桥（G2 单源桥接 · ESM 循环 import 活绑定语义——本模块顶层零绑定消费，
// 全部引用发生在函数调用期，宿主态单源仍在 quick-settings.js）：
// activeTiles（面板 aeroplane 联动读态）/ TILE_LONG_CLICK_SHEET（长按目的地复用）
// / refreshTilePill（开关回刷）/ handleTileAction / notifyTilesChanged / setDndActive / showSystemToast。
import {
  activeTiles, TILE_LONG_CLICK_SHEET, refreshTilePill, handleTileAction,
  notifyTilesChanged, setDndActive, showSystemToast,
} from './quick-settings.js';

import { isReduceMotionActive } from './aosp/a11y-settings.js';
import { dom } from './dom.js';
import { ICONS } from './icons.js';
import { setSwitchChecked } from './m3-controls.js';
import { setWifiStatus } from './status-bar.js';
import { PathInterpolatorCubic } from './aosp/expressive-ripple.js';

// ==================== v7.62 磁贴底部面板（内联面板：设备/网络/模式清单） ====================
// Android 16 QPR1 语义：Internet 磁贴点击永远弹内联面板（无直接开关）；
// 蓝牙/Modes 宽磁贴右侧子仓开启对应清单；飞行模式开启时移动数据开关禁用（禁用态手柄 X 标记）。

function ensureSheetDom() {
  let overlay = document.getElementById('qsSheetOverlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'qsSheetOverlay';
  overlay.className = 'qs-sheet-overlay';
  // v7.78：内容包一层 .qs-sheet-body —— 容器变换期间以反向缩放对冲面板缩放，内容 1:1 不变形
  overlay.innerHTML = '<div class="qs-sheet" role="dialog" aria-modal="true"><div class="qs-sheet-body"><div class="qs-sheet-title"></div><div class="qs-sheet-rows"></div></div></div>';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeQsSheet();
  });
  document.body.appendChild(overlay);
  return overlay;
}

/**
 * v7.78 容器变换面板（AOSP 16/17 语义：面板从源磁贴矩形原地扩张，关闭时收缩回磁贴；
 * 替代旧「自底部整体上滑」底部菜单）。sourceEl 为触发磁贴/子仓元素，
 * JS 将源→终态的位移+缩放写入 CSS 变量 --qs-tf-src，open 后由 CSS 过渡到 none；
 * 内容层 .qs-sheet-body 同步反向缩放对冲（见 pull-panels.css）。
 * @param {string} title
 * @param {Array} rows
 * @param {HTMLElement} [sourceEl] 触发面板的磁贴元素（FLIP 依据）
 */
export function openQsSheet(title, rows, sourceEl) {
  const overlay = ensureSheetDom();
  const titleEl = overlay.querySelector('.qs-sheet-title');
  const rowsEl = overlay.querySelector('.qs-sheet-rows');
  if (titleEl) titleEl.textContent = title || '';
  if (rowsEl) {
    rowsEl.innerHTML = '';
    (rows || []).forEach((row) => {
      const el = document.createElement('div');
      el.className = 'qs-sheet-row' + (row.dividerAbove ? ' divider-above' : '');
      const iconWrap = document.createElement('div');
      iconWrap.className = 'qs-sheet-row-icon';
      iconWrap.innerHTML = row.icon || '';
      el.appendChild(iconWrap);
      const text = document.createElement('div');
      text.className = 'qs-sheet-row-text';
      const t = document.createElement('span');
      t.className = 'qs-sheet-row-title';
      t.textContent = row.title || ''; // 动态文本走 textContent，杜绝注入
      text.appendChild(t);
      if (row.sub) {
        const s = document.createElement('span');
        s.className = 'qs-sheet-row-sub';
        s.textContent = row.sub;
        text.appendChild(s);
      }
      el.appendChild(text);
      if (row.trailing === 'check') {
        const c = document.createElement('span');
        c.className = 'qs-sheet-row-check';
        c.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5.2 5.2L20 6.8"/></svg>';
        el.appendChild(c);
      } else if (row.trailing === 'switch') {
        const label = document.createElement('label');
        label.className = 'md3-switch';
        const input = document.createElement('input');
        input.type = 'checkbox';
        setSwitchChecked(input, !!row.checked); // #70（创建时初始化同走统一入口，绑定时序前派发零副作用）
        input.disabled = !!row.disabled; // 禁用态 → CSS 灰化 + 手柄 X 标记（Android 16 Beta 3）
        input.addEventListener('change', () => {
          if (row.onChange) row.onChange(input.checked);
        });
        const slider = document.createElement('span');
        slider.className = 'slider';
        const thumb = document.createElement('span');
        thumb.className = 'thumb';
        slider.appendChild(thumb);
        label.appendChild(input);
        label.appendChild(slider);
        el.appendChild(label);
      }
      if (row.onClick) {
        el.classList.add('clickable');
        el.addEventListener('click', (e) => {
          if (e.target.closest('.md3-switch')) return; // 开关行不触发行点击
          if (navigator.vibrate) navigator.vibrate(12);
          row.onClick();
        });
      }
      rowsEl.appendChild(el);
    });
  }
  // v7.78 容器变换：内容建完后再测量终态矩形（overlay 处于关闭态、无 transform），
  // 由源磁贴矩形反解初始 transform；无源（程序化）或零矩形（happy-dom 等无布局环境）退化为纯淡入。
  const sheet = overlay.querySelector('.qs-sheet');
  const body = overlay.querySelector('.qs-sheet-body');
  const src = sourceEl && typeof sourceEl.getBoundingClientRect === 'function' ? sourceEl.getBoundingClientRect() : null;
  overlay.classList.remove('open');
  let playedTransform = false;
  if (sheet && src && src.width > 0 && src.height > 0) {
    // fix(v8.14, #39)：测量前中和上次开合残留的 --qs-tf-src —— closeQsSheet 刻意保留
    // 该变量（收缩目标复用），二次 open 时 sheet 仍带旧源变换 → getBoundingClientRect
    // 拿到的是旧变换后的矩形（≈源磁贴大小）→ 新 sx = src/dst ≈ 1 → 容器变换退化成
    // 纯淡入（用户实测「快速连点丢打开动画」主根因：首次开正常、二次开必坏）。
    // transition:none + 强制 reflow 确保测量拿到未变换的终态布局几何。
    sheet.style.transition = 'none';
    sheet.style.setProperty('--qs-tf-src', 'none');
    if (body) {
      body.style.transition = 'none';
      body.style.setProperty('--qs-tf-body-src', 'none');
    }
    void sheet.offsetWidth;
    const dst = sheet.getBoundingClientRect();
    if (dst.width > 0 && dst.height > 0) {
      const sx = Math.max(src.width / dst.width, 0.05);
      const sy = Math.max(src.height / dst.height, 0.03);
      const dx = src.left + src.width / 2 - (dst.left + dst.width / 2);
      const dy = src.top + src.height / 2 - (dst.top + dst.height / 2);
      const tf = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
      sheet.style.setProperty('--qs-tf-src', tf);
      if (body) body.style.setProperty('--qs-tf-body-src', `scale(${(1 / sx).toFixed(4)}, ${(1 / sy).toFixed(4)})`);
      // v7.80 容器变换改走 WAAPI（确定性播放）；v8.14 对齐 #39 补充评论的 U+ 权威时序：
      // open duration 200ms（原 360）/ overlay fade 83ms（原 260）。
      const reduced = isReduceMotionActive();
      if (!reduced && typeof sheet.animate === 'function') {
        overlay.classList.add('open');
        const EASE = 'cubic-bezier(0.2, 0, 0, 1)';
        sheet.animate([{ transform: tf }, { transform: 'none' }], { duration: 200, easing: EASE });
        // fix(v8.14, #39)：body 对冲改「预采样关键帧 + linear」——原实现 sheet/body 两轨
        // 各自插值，乘积不恒 1：sheet=lerp(sx,1,e)、body=lerp(1/sx,1,e) 中间帧乘积达
        // 2.31 倍（sx=0.14, e=0.5）→ 文字先爆大再回落 =「字体进出场怪异」数学根因。
        // 按 eased progress 逐点取 sheet 当帧 scale 的精确倒数烘进关键帧（13 点采样，
        // bezier 平滑点间误差 <0.5%），sheet×body 乘积每采样点恒 1，内容全程 1:1。
        if (body) body.animate(quantizeCounterScale(sx, sy), { duration: 200, easing: 'linear' });
        playedTransform = true;
      }
    }
    // 过渡恢复（测量期临时禁用）
    sheet.style.removeProperty('transition');
    if (body) body.style.removeProperty('transition');
  }
  if (!playedTransform) {
    if (sheet) sheet.style.removeProperty('--qs-tf-src');
    if (body) body.style.removeProperty('--qs-tf-body-src');
    requestAnimationFrame(() => overlay.classList.add('open'));
  }
}

/**
 * v8.14 (#39)：body 反向对冲关键帧预采样——cubic-bezier(0.2,0,0,1)（Material
 * standard，U+ 容器变换曲线）解析求解 eased progress，逐点取 sheet 当帧 scale
 * 的精确倒数。关键帧 easing 用 linear（easing 已烘进 offsets 分布）。
 * @param {number} sx sheet 起始 scale x（= src.width/dst.width）
 * @param {number} sy sheet 起始 scale y
 * @returns {Keyframe[]} 13 点关键帧（offset 0→1）
 */
export function quantizeCounterScale(sx, sy) {
  const bezier = new PathInterpolatorCubic(0.2, 0, 0, 1);
  const frames = [];
  const STEPS = 12;
  for (let i = 0; i <= STEPS; i++) {
    const e = bezier.getInterpolation(i / STEPS);
    const kx = sx + (1 - sx) * e;
    const ky = sy + (1 - sy) * e;
    frames.push({
      transform: `scale(${(1 / kx).toFixed(4)}, ${(1 / ky).toFixed(4)})`,
      offset: i / STEPS,
    });
  }
  return frames;
}

export function closeQsSheet() {
  const overlay = document.getElementById('qsSheetOverlay');
  if (!overlay) return;
  const sheet = overlay.querySelector('.qs-sheet');
  const body = overlay.querySelector('.qs-sheet-body');
  // v7.80 收缩回磁贴同样走 WAAPI（与展开对称；CSS transition 同样存在同帧吞过渡风险）
  const tf = sheet ? sheet.style.getPropertyValue('--qs-tf-src') : '';
  const tfBody = body ? body.style.getPropertyValue('--qs-tf-body-src') : '';
  const reduced = isReduceMotionActive();
  if (tf && !reduced && sheet && typeof sheet.animate === 'function' && overlay.classList.contains('open')) {
    const EASE = 'cubic-bezier(0.2, 0, 0, 1)';
    // v8.14 (#39)：U+ close duration 233ms（原 280）；body 收缩对冲同改预采样关键帧
    //（与展开侧同款乘积恒 1 修正，文字退场不再先爆大/爆缩）
    const m = tf.match(/scale\(([\d.]+), ([\d.]+)\)/);
    if (m && body) {
      body.animate(quantizeCounterScale(parseFloat(m[1]), parseFloat(m[2])),
        { duration: 233, easing: 'linear' });
    }
    sheet.animate([{ transform: 'none' }, { transform: tf }], { duration: 233, easing: EASE });
  }
  overlay.classList.remove('open');
}

/** 网络内联面板：Wi-Fi 总开关（同磁贴旧逻辑单一真源 setWifiStatus）+ 可选网络 + 移动数据（飞行模式禁用） */
export function openNetworkSheet(sourceEl) {
  const internetTile = activeTiles.find((t) => t.id === 'internet');
  const aeroplaneTile = activeTiles.find((t) => t.id === 'aeroplane');
  const wifiOn = internetTile ? !!internetTile.active : false;
  openQsSheet('网络与互联网', [
    {
      icon: ICONS.wifi, title: 'Wi-Fi', sub: wifiOn ? '已开启 · 中国移动 5G Wi-Fi' : '已关闭',
      trailing: 'switch', checked: wifiOn,
      onChange: (on) => {
        if (internetTile) internetTile.active = on;
        setWifiStatus(on);
        showSystemToast(on ? '已连接至中国移动 5G Wi-Fi' : '网络已断开连接', on ? ICONS.wifi : ICONS.wifi_off);
        refreshTilePill(internetTile || { id: 'internet' });
      },
    },
    { icon: ICONS.wifi, title: '中国移动 5G Wi-Fi', sub: wifiOn ? '已连接' : '范围内', trailing: wifiOn ? 'check' : null, onClick: () => { closeQsSheet(); showSystemToast('已连接至中国移动 5G Wi-Fi', ICONS.wifi); } },
    { icon: ICONS.wifi, title: 'CoffeeShop_Free', sub: '开放网络', onClick: () => showSystemToast('正在加入 CoffeeShop_Free …', ICONS.wifi) },
    { icon: ICONS.wifi, title: 'AndroidAP_5G', sub: '已保存（需验证）', onClick: () => showSystemToast('AndroidAP_5G 需要验证', ICONS.wifi), dividerAbove: true },
    {
      icon: ICONS.cellular, title: '移动数据', sub: (aeroplaneTile && aeroplaneTile.active) ? '飞行模式已开启，不可用' : '中国移动 5G',
      trailing: 'switch', checked: !(aeroplaneTile && aeroplaneTile.active), disabled: !!(aeroplaneTile && aeroplaneTile.active),
      onChange: (on) => showSystemToast(on ? '移动数据已开启' : '移动数据已关闭', ICONS.cellular),
    },
  ], sourceEl);
}

/** 已配对设备清单（v7.79：顶部带蓝牙总开关 —— 磁贴点击即面板后开关功能迁入面板） */
export function openBluetoothSheet(sourceEl) {
  const btTile = activeTiles.find((t) => t.id === 'bluetooth');
  const btOn = btTile ? !!btTile.active : false;
  openQsSheet('已配对设备', [
    {
      icon: ICONS.bluetooth, title: '蓝牙', sub: btOn ? '已开启' : '已关闭',
      trailing: 'switch', checked: btOn,
      onChange: (on) => {
        if (btTile) btTile.active = on;
        refreshTilePill(btTile || { id: 'bluetooth' });
        // v9.95 #89：蓝牙 sheet 总开关广播（updateBluetooth 连接态可见性真源）
        notifyTilesChanged(['bluetooth']);
        showSystemToast(on ? '蓝牙已开启，已连接 Pixel Buds Pro' : '蓝牙已关闭', on ? ICONS.bluetooth_connected || ICONS.headphones : ICONS.block);
      },
    },
    { icon: ICONS.headphones, title: 'Pixel Buds Pro', sub: '已连接 · 电量 78%', trailing: 'check', onClick: () => showSystemToast('Pixel Buds Pro 已连接', ICONS.headphones) },
    { icon: ICONS.headphones, title: 'Pixel Buds A-Series', sub: '上次连接 · 昨天', onClick: () => showSystemToast('正在连接 Pixel Buds A-Series …', ICONS.headphones) },
    { icon: ICONS.watch || ICONS.person, title: 'Pixel Watch 4', sub: '可用', onClick: () => showSystemToast('正在配对 Pixel Watch 4 …', ICONS.watch || ICONS.person) },
    { icon: ICONS.bluetooth, title: '配对新设备', sub: '在设置中管理', onClick: () => showSystemToast('在「设置 → 已配对设备」中配对新设备', ICONS.bluetooth), dividerAbove: true },
  ], sourceEl);
}

/** 模式清单：勿扰开关 + 场景模式 */
export function openModesSheet(sourceEl) {
  const dndTile = activeTiles.find((t) => t.id === 'modes');
  openQsSheet('模式', [
    {
      icon: ICONS.modes, title: '勿扰', sub: dndTile && dndTile.active ? '已开启' : '已关闭',
      trailing: 'switch', checked: !!(dndTile && dndTile.active),
      onChange: (on) => setDndActive(on),
    },
    { icon: ICONS.driving || ICONS.cast, title: '驾驶模式', sub: '连接车载蓝牙时自动开启', onClick: () => showSystemToast('驾驶模式：已保存偏好', ICONS.cast) },
    { icon: ICONS.bedtime, title: '睡前模式', sub: '日落至日出静音', onClick: () => showSystemToast('睡前模式：已保存偏好', ICONS.bedtime) },
    { icon: ICONS.work || ICONS.person, title: '工作模式', sub: '仅显示工作应用与通知', onClick: () => showSystemToast('工作模式：已保存偏好', ICONS.person) },
  ], sourceEl);
}
