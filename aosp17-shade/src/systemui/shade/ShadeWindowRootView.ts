/**
 * shade/ShadeWindowRootView.ts — 移植自
 *  frameworks/base/packages/SystemUI/src/com/android/systemui/scene/ui/view/SceneWindowRootView.kt
 *  frameworks/base/packages/SystemUI/src/com/android/systemui/shade/NotificationPanelViewController.java（展开物理）
 *  frameworks/base/packages/SystemUI/res/layout/super_notification_shade.xml
 *
 * 窗口层叠（super_notification_shade.xml）：
 *   NotificationShadeWindowView
 *     ├─ wallpaper（demo 背景层）
 *     ├─ ScrimController 层（shade_scrim_background_dark + notification_scrim）
 *     ├─ status_bar（PhoneStatusBarView）
 *     └─ shade 容器：Dual = NotificationsShadeOverlay + QuickSettingsShadeOverlay
 *                    Single = Shade 场景（单一面板）
 */
import { div, clamp } from '../util/SysUI';
import { ShadeModeState, CONFIG_INVOCATION_GESTURE_SPLIT_RATIO } from '../../res/values/config';
import { PhoneStatusBarView, StatusBarState } from '../statusbar/PhoneStatusBarView';
import { ShadeOverlayPanel, PanelSide, PanelContentHooks } from './ShadeOverlayPanel';
import { NotificationsContent } from '../notifications/NotificationStackScroller';
import { QuickSettingsContent } from '../qs/QuickSettingsContent';
import { Theme } from '../../res/values/colors';

export class ShadeWindowRootView {
  readonly root: HTMLDivElement;
  readonly statusBar: PhoneStatusBarView;
  private scrim: HTMLDivElement;
  private panelsLayer: HTMLDivElement;
  private notifPanel!: ShadeOverlayPanel;
  private qsPanel!: ShadeOverlayPanel;
  private notifContent: NotificationsContent;
  private qsContent: QuickSettingsContent;

  /** 每面板展开度 0..1（ShadeExpansionStateManager） */
  expansion = { notifications: 0, qs: 0 } as Record<PanelSide, number>;

  constructor(notifContent: NotificationsContent, qsContent: QuickSettingsContent, status: StatusBarState) {
    this.notifContent = notifContent;
    this.qsContent = qsContent;
    this.root = div('shade_window');
    this.root.append(div('wallpaper'));
    this.scrim = div('shade_scrim');
    this.statusBar = new PhoneStatusBarView(status);
    this.panelsLayer = div('panels_layer');
    this.root.append(this.scrim, this.statusBar.root, this.panelsLayer);

    this.buildPanels();
    this.bindGestures();
    this.applyMode();
    this.render();
    // 配置变化（ConfigurationController → onDensityChange/onRotation）→ 重建约束：
    // 视口尺寸变化时重新解析 w600dp/w720dp/sw1200dp 档位几何
    window.addEventListener('resize', () => this.render());
  }

  private buildPanels() {
    this.notifPanel = new ShadeOverlayPanel('notifications');
    this.qsPanel = new ShadeOverlayPanel('qs');
    // 钩子直传内容对象（onPanelExpansion/onQsPhase 由内容层实现）
    this.notifPanel.setContent(
      this.notifContent.root,
      this.notifContent as unknown as PanelContentHooks,
    );
    this.qsPanel.setContent(this.qsContent.root, this.qsContent as unknown as PanelContentHooks);
    this.panelsLayer.append(this.notifPanel.root, this.qsPanel.root);
    // 单模式二段面板需覆盖在通知面板之上
    this.qsPanel.root.style.zIndex = '2';
    this.notifPanel.root.style.zIndex = '1';
  }

  /** shadeMode 变化 → 重建约束（NotificationsQSContainerController.updateConstraints 的等价） */
  applyMode() {
    const dual = ShadeModeState.current === 'Dual';
    document.body.classList.toggle('mode-dual', dual);
    document.body.classList.toggle('mode-single', !dual);
    // Dual: 两块面板（通知在 start 侧，QS 在 end 侧 — config_notificationShadeOnTopEnd=false）
    this.notifPanel.root.classList.toggle('panel-start', dual);
    this.qsPanel.root.classList.toggle('panel-end', dual);
    // 重置展开度与手风琴阶段
    this.qsPhase = 0;
    this.expansion = { notifications: 0, qs: 0 };
    this.notifContent.setQuickRowVisible(!dual);
    this.render();
  }

  /** 顶部下滑手势路由：Dual 按 config_invocationGestureSplitRatio 分界。
   *  监听 window 级 pointer 事件，仅从顶部 64dp 内起始的触摸才进入手势，
   *  不阻挡面板内点击（等价 SystemUI 的 ShadeWindow 手势层） */
  private bindGestures() {
    let active: PanelSide | 'phase2' | null = null;
    let startY = 0;
    let startExpansion = 0;
    let lastY = 0;
    let lastT = 0;
    let velocity = 0;
    let tracking = false;

    window.addEventListener('pointerdown', (e) => {
      if (e.clientY > 64) return; // 只允许顶部触发（等价 shade 手势区）
      const w = window.innerWidth;
      if (ShadeModeState.current === 'Dual') {
        const boundary = w * CONFIG_INVOCATION_GESTURE_SPLIT_RATIO;
        active = e.clientX <= boundary ? 'notifications' : 'qs';
      } else if (this.expansion.notifications > 0.9) {
        // Single 模式：面板已全开 → 二段下拉展开 QS（手风琴）
        active = 'phase2';
      } else {
        active = 'notifications';
      }
      tracking = true;
      startY = lastY = e.clientY;
      lastT = performance.now();
      startExpansion = active === 'phase2' ? this.qsPhase : this.expansion[active];
      velocity = 0;
    });
    window.addEventListener('pointermove', (e) => {
      if (!tracking || !active) return;
      const dy = e.clientY - startY;
      const t = performance.now();
      const dt = Math.max(1, t - lastT);
      velocity = 0.8 * velocity + 0.2 * ((e.clientY - lastY) / dt);
      lastY = e.clientY;
      lastT = t;
      if (active === 'phase2') {
        this.qsPhase = clamp(startExpansion + dy / 280, 0, 1);
      } else {
        const tracked = this.trackExpansion(active, startExpansion + dy / this.trackRange(active));
        this.expansion[active] = tracked;
      }
      this.render();
    });
    const finish = () => {
      if (!tracking || !active) return;
      tracking = false;
      if (active === 'phase2') {
        const open = velocity > 0.6 || (Math.abs(velocity) < 0.6 && this.qsPhase > 0.5);
        const from = this.qsPhase;
        const target = open ? 1 : 0;
        const t0 = performance.now();
        const step = (t: number) => {
          const p = clamp((t - t0) / 300, 0, 1);
          this.qsPhase = from + (target - from) * (1 - Math.pow(1 - p, 3));
          this.render();
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      } else {
        // fling 判定（FlingAnimationUtils）：速度阈值 + 展开度阈值
        const open = velocity > 0.6 || (Math.abs(velocity) < 0.6 && this.expansion[active] > 0.5);
        this.flingTo(active, open ? 1 : 0);
      }
      active = null;
    };
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  }

  private trackRange(side: PanelSide): number {
    // 等价 NotificationPanelViewController 的全展开高度：面板内容高度的一半作为拖拽行程
    return side === 'qs' ? 420 : 520;
  }

  /** 越界阻尼（rubber band，OverScroller 边缘效果） */
  private trackExpansion(side: PanelSide, v: number): number {
    if (v < 0) return 0 - (1 - 1 / (1 + Math.abs(v) * 3)) * 0.35;
    if (v > 1) return 1 + (1 - 1 / (1 + (v - 1) * 3)) * 0.12;
    return clamp(v, -0.5, 1.6);
  }

  private flingAnim: number | null = null;
  flingTo(side: PanelSide, target: number) {
    if (side === 'notifications' && target === 0) this.qsPhase = 0;
    if (this.flingAnim) cancelAnimationFrame(this.flingAnim);
    const from = this.expansion[side];
    const t0 = performance.now();
    const dur = 320 + Math.abs(target - from) * 180;
    const step = (t: number) => {
      const p = clamp((t - t0) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3); // 近似 PathInterpolator(0.05, 0.7, 0.1, 1)（QSExpansionPathInterpolator）
      this.expansion[side] = from + (target - from) * eased;
      this.render();
      if (p < 1) this.flingAnim = requestAnimationFrame(step);
    };
    this.flingAnim = requestAnimationFrame(step);
  }

  /** Dual 模式下也允许面板内部点击遮罩关闭 */
  collapseAll() {
    this.flingTo('notifications', 0);
    this.flingTo('qs', 0);
  }

  /** 渲染帧：把 expansion 写入面板样式（等价 setExpandedHeightInternal） */
  render() {
    const c = Theme.colors;
    this.scrim.style.background = c.shadeScrimBackground;
    this.scrim.style.opacity = String(
      clamp(Math.max(this.expansion.notifications, this.expansion.qs, 0) * 0.5, 0, 0.5),
    );
    const dual = ShadeModeState.current === 'Dual';

    // Single 模式：QS 面板作为手风琴第二阶段叠加在通知面板上
    if (!dual) {
      this.expansion.qs = this.qsPhase * this.expansion.notifications;
    }

    const g = ShadeWindowRootView.resolveGeometry(dual);
    const applyPanel = (p: ShadeOverlayPanel, side: PanelSide) => {
      const e = this.expansion[side];
      const visible = e > 0.001;
      p.root.style.opacity = String(clamp(e * 1.6, 0, 1));
      p.root.style.visibility = visible ? 'visible' : 'hidden';
      p.root.style.pointerEvents = visible ? 'auto' : 'none';
      const h = e * p.naturalHeight();
      p.root.style.height = `${Math.max(0, h)}px`;

      if (!dual) {
        // Single Shade：面板始终居中
        //   （ShadeModeInteractor.notificationStackHorizontalAlignment：
        //     Single → Alignment.CenterHorizontally）
        //   宽度：compact(<w600dp) 全宽 margin=0（shade_panel_margin_horizontal 注释
        //   "zero only on Compact screens"）；floating = shade_panel_width 档位
        p.root.style.width = `${g.panelWidth}px`;
        p.root.style.left = `${g.notifX}px`;
        p.root.style.right = 'auto';
      } else {
        // Dual Shade：
        //   floating 布局（config_isFullWidthShade=false @ values-w600dp）：
        //     通知 = Start（values-sw1200dp config_notificationShadeOnTopEnd=true → End），
        //     QS 占对侧；各面板 ≤ 半屏（shade_config.xml floating 布局注释）
        //   全宽布局（compact）：通知/QS 各自全宽、margin=0
        p.root.style.width = `${g.panelWidth}px`;
        p.root.style.left = `${side === 'notifications' ? g.notifX : g.qsX}px`;
        p.root.style.right = 'auto';
      }
      p.updateExpansion(e);
    };

    applyPanel(this.notifPanel, 'notifications');
    applyPanel(this.qsPanel, 'qs');

    if (!dual) {
      this.notifPanel.setQsPhase(this.qsPhase);
    }
  }

  /**
   * 大屏几何档位解析 — 等价 AOSP 资源限定符系统（res/values*）：
   *
   * | 视口宽度(w)      | 布局来源                     | 面板宽                | 边距  |
   * |------------------|------------------------------|-----------------------|-------|
   * | < 600px          | values/（默认档）            | 全宽                  | 0     |
   * | 600–719px        | values-w600dp                | 412dp                 | 24dp  |
   * | ≥ 720px          | values-w720dp（最优匹配）    | 474dp                 | 24dp  |
   *
   * - values-w600dp/shade_config.xml：config_isFullWidthShade=false → floating 布局，
   *   "notifications and quick settings each take up only up to half the screen width"
   *   → 面板宽再钳制 ≤ 视口/2
   * - values-sw1200dp/shade_config.xml：config_notificationShadeOnTopEnd=true
   *   （sw = 最小边 ≥ 1200dp 的大平板/桌面屏：通知靠 End，QS 靠 Start）
   * - shade_panel_margin_horizontal：compact 为 0dp，floating 档为 24dp
   * - desktop_sizing feature flag 档（values-sw600dp 376dp）默认关闭，不实现
   */
  private static resolveGeometry(dual: boolean): {
    panelWidth: number;
    notifX: number;
    qsX: number;
  } {
    const vw = window.innerWidth;
    const sw = Math.min(window.innerWidth, window.innerHeight); // smallestWidth 限定符
    const floating = vw >= 600; // values-w600dp/shade_config.xml：isFullWidthShade=false
    // shade_panel_width 档位：w600dp=412dp → w720dp=474dp（默认档 600dp 仅在
    // w600dp~w719dp 之外不参与最优匹配，被 412/474 覆盖）
    const ladder = vw >= 720 ? 474 : 412;
    const MARGIN = floating ? 24 : 0; // shade_panel_margin_horizontal
    // floating："each take up only up to half the screen width"
    const panelWidth = floating ? Math.min(ladder, vw / 2) : vw;
    // values-sw1200dp：config_notificationShadeOnTopEnd=true → 通知在 End
    const notifOnEnd = sw >= 1200;

    if (!floating || !dual) {
      // compact 双栏 / Single 模式：面板占 panelWidth，居中（compact=全宽即居中）
      return { panelWidth, notifX: (vw - panelWidth) / 2, qsX: (vw - panelWidth) / 2 };
    }
    if (notifOnEnd) {
      // 通知 End / QS Start
      return { panelWidth, notifX: vw - panelWidth - MARGIN, qsX: MARGIN };
    }
    // 通知 Start / QS End
    return { panelWidth, notifX: MARGIN, qsX: vw - panelWidth - MARGIN };
  }

  /** Single 模式 QS 二段展开度（下拉两次/或展开状态下继续下拉） */
  private qsPhase = 0;
  qsExpansionPhase(): number {
    return this.qsPhase;
  }
  setQsPhase(v: number) {
    this.qsPhase = clamp(v, 0, 1);
  }

  /** 主题变更 → 重绘面板与内容 */
  refreshTheme() {
    this.notifPanel.refreshTheme();
    this.qsPanel.refreshTheme();
  }

  /** QS 内容层主题刷新（footer/网格/亮度） */
  qsRefresh() {
    if (this.qsContent && 'refreshTheme' in this.qsContent) {
      (this.qsContent as unknown as { refreshTheme: () => void }).refreshTheme();
    }
  }

  /** 供 demo 调用 */
  openPanel(side: PanelSide, open = true) {
    this.flingTo(side, open ? 1 : 0);
  }
}
