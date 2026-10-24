/**
 * main.ts — SystemUIApplication 装配（等价 SystemUI dagger graph 的 demo 子集）
 */
import './style/systemui.css';
import { Theme, SYSTEM_LIGHT, materialScheme, surfaceEffects, shadeColors } from './res/values/colors';
import { ShadeModeState, type ShadeMode } from './res/values/config';
import { ShadeWindowRootView } from './systemui/shade/ShadeWindowRootView';
import { ShadeHeader } from './systemui/shade/ShadeHeader';
import { NotificationsContent } from './systemui/notifications/NotificationStackScroller';
import { QuickSettingsContent } from './systemui/qs/QuickSettingsContent';
import { TilesState } from './systemui/qs/TilesState';
import { MediaCarousel } from './systemui/media/MediaCarousel';
import { sampleNotifications } from './demo/DemoData';
import { div } from './systemui/util/SysUI';
import { RippleHost } from './systemui/anim/RippleHost';

/** 把主题写进 CSS 变量（动态配色等价） */
function applyThemeVars() {
  const c = { ...materialScheme(Theme.dark), ...surfaceEffects(Theme.dark), ...shadeColors(Theme.dark) };
  const r = document.documentElement.style;
  r.setProperty('--c-primary', c.primary);
  r.setProperty('--c-on-primary', c.onPrimary);
  r.setProperty('--c-on-surface', c.onSurface);
  r.setProperty('--c-on-surface-variant', c.onSurfaceVariant);
  r.setProperty('--c-surface', c.surface);
  r.setProperty('--c-surface-container', c.surfaceContainer);
  r.setProperty('--c-surface-container-high', c.surfaceContainerHigh);
  r.setProperty('--c-surface-container-highest', c.surfaceContainerHighest);
  r.setProperty('--c-primary-container', Theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(217,226,255,0.9)');
  void SYSTEM_LIGHT;
}

import { TileGrid } from './systemui/qs/TileGrid';

function main() {
  applyThemeVars();
  // 表达性涟漪宿主（WebGL 预热，pointerdown 捕获接线）
  RippleHost.get();

  const tiles = new TilesState();
  const media = new MediaCarousel();

  // 状态栏
  const status = {
    time: '',
    batteryLevel: 72,
    charging: false,
    wifi: true,
    cell: true,
    airplane: false,
    dnd: false,
    screenRecord: false,
    mic: false,
    camera: false,
    dark: true, // demo 壁纸为深色 → 状态栏白色图标（LightBarController 行为）
  };

  // 头部与 QQS 行（Single 模式手风琴第一段的顶部磁贴行）
  const header = new ShadeHeader();
  const qqsGrid = TileGrid.quickRow(tiles);
  qqsGrid.root.classList.add('qs_quick_row_inner');

  // 通知面板内容
  const models = sampleNotifications();
  const notifContent = new NotificationsContent(models, header.root, qqsGrid.root);
  // 头部 QQS 行 squish 与 QS 网格同源（QuickQuickSettings）
  notifContent.onQuickRowSquish = (sv) => qqsGrid.setSquishiness(sv);

  // QS 面板内容
  const qsContent = new QuickSettingsContent(tiles, media, {
    onDark: () => void 0,
  });

  const window_ = new ShadeWindowRootView(notifContent, qsContent, status);
  // 无头端到端测试句柄（ShadeExpansionStateManager 的等价调试入口）
  (window as unknown as { __shadeWindow: ShadeWindowRootView }).__shadeWindow = window_;
  // 涟漪会话探针（RippleHost.debug：supported/sessions/down）
  (window as unknown as { __rippleDebug: () => unknown }).__rippleDebug = () => RippleHost.debug();

  // darkmode 磁贴 → 主题切换
  tiles.events.add((ev, active) => {
    if (ev === 'darkmode') {
      Theme.dark = active;
      status.dark = active;
      applyThemeVars();
      window_.render();
      // ConfigurationController 等价：重建通知行 + 刷新面板/QS 配色
      window_.refreshTheme();
      window_.qsRefresh();
      notifContent.rebuild();
    }
    if (ev === 'dnd') {
      status.dnd = active;
      window_.statusBar.setState({ dnd: active });
    }
  });

  // 时钟
  const tick = () => {
    const now = new Date();
    const t = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
    status.time = t;
    header.setNow();
    window_.statusBar.setState({ time: t });
  };
  tick();
  window.setInterval(tick, 10_000);

  // demo 控件（非 AOSP）
  const controls = div('demo_controls');
  const hint = div('demo_hint');
  const setHint = () => {
    hint.textContent =
      ShadeModeState.current === 'Dual'
        ? '双栏分栏（Dual Shade）：左侧 75% 下滑 = 通知 · 右侧 25% 下滑 = 控制中心'
        : '二合一（Single Shade）：顶部下滑 = 通知，面板内继续下拉展开控制中心';
  };
  const mkBtn = (label: string, fn: () => void) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.addEventListener('click', fn);
    controls.append(b);
    return b;
  };
  const dualBtn = mkBtn('双栏分栏', () => {
    ShadeModeState.current = 'Dual';
    window_.applyMode();
    refresh();
  });
  const singleBtn = mkBtn('二合一', () => {
    ShadeModeState.current = 'Single';
    window_.applyMode();
    refresh();
  });
  const addBtn = mkBtn('恢复通知', () => {
    notifContent.rebuild();
  });
  function refresh() {
    dualBtn.classList.toggle('active', ShadeModeState.current === 'Dual');
    singleBtn.classList.toggle('active', ShadeModeState.current === 'Single');
    setHint();
  }
  refresh();
  document.body.append(window_.root, controls, hint);
}

main();
