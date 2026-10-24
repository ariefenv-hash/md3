/**
 * shade/ShadeOverlayPanel.ts — 浮动 shade 面板
 * 视觉来源：shade_dimens.xml
 *   overlay_shade_panel_shape_radius=46dp, shade_panel_width=600dp
 * 面板材质：ShadeColors.shadePanel()（动态 fg/bg 合成）+ Flags.notificationShadeBlur() → backdrop blur
 */
import { div } from '../util/SysUI';
import { OVERLAY_SHADE_PANEL_SHAPE_RADIUS } from '../../res/values/dimens';
import { Theme } from '../../res/values/colors';

export type PanelSide = 'notifications' | 'qs';

/** 面板内容钩子（updateExpansion/setQsPhase 的转发目标） */
export interface PanelContentHooks {
  onPanelExpansion?: (e: number) => void;
  onQsPhase?: (phase: number) => void;
}

export class ShadeOverlayPanel {
  readonly root: HTMLDivElement;
  private content!: HTMLElement;
  private hooks: PanelContentHooks | null = null;
  private side: PanelSide;

  constructor(side: PanelSide) {
    this.side = side;
    this.root = div(`shade_panel panel-${side}`);
    this.root.style.borderRadius = `${OVERLAY_SHADE_PANEL_SHAPE_RADIUS}px`;
    this.root.style.top = '52px'; // 状态栏(48dp)下方，避免与 status bar 重叠
    this.applyTheme();
  }

  setContent(el: HTMLElement, hooks?: PanelContentHooks) {
    this.content?.remove();
    this.content = el;
    this.hooks = hooks ?? null;
    this.root.append(el);
  }

  /** 主题变更（ConfigurationController → recreate views） */
  refreshTheme() {
    this.applyTheme();
  }

  private applyTheme() {
    const c = Theme.colors;
    this.root.style.background = c.shadePanel;
    // Flags.notificationShadeBlur() → shade panel transparency effect
    this.root.style.backdropFilter = 'blur(48px) saturate(1.35)';
    this.root.style.setProperty('-webkit-backdrop-filter', 'blur(48px) saturate(1.35)');
    this.root.style.boxShadow = '0 8px 40px rgba(0,0,0,0.28)';
  }

  naturalHeight(): number {
    // 面板自然高度 = min(内容高度, 视口 - 状态栏 - 边距)
    const contentH = this.content?.scrollHeight ?? 600;
    return Math.min(contentH, window.innerHeight - 72);
  }

  /** 展开回调（内容可据此切换 QQS/全网格、驱动 squishiness 等） */
  updateExpansion(e: number) {
    this.hooks?.onPanelExpansion?.(e);
  }

  /** Single 模式手风琴：phase 0=通知阶段 1=QS 阶段 */
  setQsPhase(phase: number) {
    this.hooks?.onQsPhase?.(phase);
  }
}
