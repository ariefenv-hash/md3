/**
 * res/values/colors.ts — 移植自 AOSP android-17.0.0_r1
 *
 * 来源：
 *  - frameworks/base/core/res/res/values/colors.xml（system_* 默认 Monet 色板，
 *    system_accent1_100_light = #D9E2FF 等，逐值照搬）
 *  - frameworks/base/core/res/res/values-night/colors.xml
 *  - frameworks/base/packages/SystemUI/res/values/colors.xml (+ values-night)
 *  - frameworks/base/packages/SystemUI/src/com/android/systemui/shade/ui/ShadeColors.kt
 *
 * shade_panel_fg_color / customColorSurfaceEffect0 是运行时动态色（壁纸取色），
 * 此处按默认 Monet 种子推导合成，模糊开启时以 backdrop-filter 呈现（对应
 * Flags.notificationShadeBlur() 分支）。
 */

export interface SystemPalette {
  accent1: Record<string, string>;
  accent2: Record<string, string>;
  accent3: Record<string, string>;
  neutral1: Record<string, string>;
  neutral2: Record<string, string>;
}

/** core/res/res/values/colors.xml 中 system_*_light 全套 */
export const SYSTEM_LIGHT: SystemPalette = {
  accent1: {
    '0': '#FFFFFF', '10': '#FEFBFF', '50': '#EEF0FF', '100': '#D9E2FF',
    '200': '#B3C6F9', '300': '#98AADC', '400': '#7E90C0', '500': '#6476A5',
    '600': '#4B5D8B', '700': '#334671', '800': '#1B2F59', '900': '#021943', '1000': '#000000',
  },
  accent2: {
    '0': '#FFFFFF', '10': '#FEFBFF', '50': '#EEF0FF', '100': '#DCE2F9',
    '200': '#C0C6DC', '300': '#A4ABC1', '400': '#8A90A5', '500': '#70778B',
    '600': '#575E71', '700': '#404659', '800': '#2A3042', '900': '#151B2C', '1000': '#000000',
  },
  accent3: {
    '0': '#FFFFFF', '10': '#FFFBFF', '50': '#F9ECFF', '100': '#EFDBFF',
    '200': '#D5BDEC', '300': '#B9A2D0', '400': '#9E88B4', '500': '#836E99',
    '600': '#6A567F', '700': '#513F66', '800': '#3A284E', '900': '#241338', '1000': '#000000',
  },
  neutral1: {
    '0': '#FFFFFF', '10': '#FEFBFF', '50': '#F1F0F6', '100': '#E3E2E7',
    '200': '#C7C6CB', '300': '#ABABB0', '400': '#909095', '500': '#76777C',
    '600': '#5E5E63', '700': '#46464B', '800': '#2F3035', '900': '#1A1B20', '1000': '#000000',
  },
  neutral2: {
    '0': '#FFFFFF', '10': '#FEFBFF', '50': '#EFF0FB', '100': '#E1E2ED',
    '200': '#C5C6D0', '300': '#A9ABB5', '400': '#8E909A', '500': '#757780',
    '600': '#5C5E67', '700': '#44464F', '800': '#2E3038', '900': '#191B23', '1000': '#000000',
  },
};

/** core/res/res/values-night 引用同一色板（tonal 等级不随昼间反转），surface 语义色不同 */
export const SYSTEM_DARK: SystemPalette = SYSTEM_LIGHT;

/** Material3 ColorScheme（SystemUI MaterialTheme 映射，默认种子） */
export function materialScheme(dark: boolean) {
  const p = dark ? SYSTEM_DARK : SYSTEM_LIGHT;
  return {
    primary: dark ? p.accent1['200'] : p.accent1['600'],
    onPrimary: dark ? p.accent1['800'] : p.accent1['100'], // AOSP primary 映射：onPrimary=accent1_100/900 区间
    surface: dark ? p.neutral1['900'] : p.neutral1['50'],
    onSurface: dark ? p.neutral1['100'] : p.neutral1['900'],
    onSurfaceVariant: dark ? p.neutral2['200'] : p.neutral2['700'],
    secondary: dark ? p.accent2['200'] : p.accent2['600'],
    surfaceContainer: dark ? p.neutral1['800'] : p.neutral1['100'],
    surfaceContainerHigh: dark ? p.neutral1['700'] : p.neutral1['100'],
    surfaceContainerHighest: dark ? p.neutral1['700'] : p.neutral1['100'],
    outline: dark ? p.neutral2['500'] : p.neutral2['500'],
  };
}

/**
 * LocalAndroidColorScheme.surfaceEffect1/2（磁贴非激活底色，半透明 surface）
 * 对应 androidx AndroidColorScheme：surfaceEffect = surface 色 + 半透明。
 */
export function surfaceEffects(dark: boolean) {
  return dark
    ? { effect1: 'rgba(255,255,255,0.10)', effect2: 'rgba(255,255,255,0.18)' }
    : { effect1: 'rgba(255,255,255,0.55)', effect2: 'rgba(255,255,255,0.72)' };
}

/**
 * ShadeColors.kt 移植：
 *  - shadePanel = composite(shade_panel_fg, shade_panel_bg)，blur 不支持时用 shade_panel_fallback
 *  - notificationScrim = notification_scrim_base(system_accent1_100) alpha 0.5
 */
export function shadeColors(dark: boolean) {
  const n1 = (dark ? SYSTEM_DARK : SYSTEM_LIGHT).neutral1;
  return {
    // 浮层面板：动态 shade_panel_fg/bg 的默认种子合成（半透明 surface + blur）
    shadePanel: dark ? 'rgba(22,23,28,0.88)' : 'rgba(235,234,242,0.92)',
    // shade_panel_fallback: @android:color/system_accent2_200 (light) / accent2_800 (night)
    shadePanelFallback: dark ? SYSTEM_LIGHT.accent2['800'] : SYSTEM_LIGHT.accent2['200'],
    // notification_scrim_base = system_accent1_100，ShadeColors.notificationScrimStandard alpha=0.5
    notificationScrim: hexA(SYSTEM_LIGHT.accent1['100'], 0.5),
    // shade_scrim_background_dark = system_under_surface_(light|dark) = #000000
    shadeScrimBackground: '#000000',
    // 通知卡片背景：classicShadeNotificationScrimBg → customColorSurfaceEffect0（surface tone）
    notificationSurface: dark ? n1['900'] : '#F5F4FA',
    notificationSurfaceEffect0: dark ? 'rgba(38,39,46,0.97)' : 'rgba(252,251,255,0.98)',
  };
}

/** SystemUI colors.xml */
export const SYSTEMUI = {
  status_bar_clock_color: '#FFFFFFFF',
  qs_tile_disabled_color: '#9E9E9E',
  notification_ripple_untinted_color: '#28000000',
  notification_ripple_tinted_color: '#30ffffff',
  privacy_chip_background: '#3ddc84',
  privacy_chip_location_only_background: '#4e8ff8',
  screenrecord_status_color: '#E94235',
  GM2_grey_100: '#F1F3F4', GM2_grey_200: '#E8EAED', GM2_grey_300: '#DADCE0',
  GM2_grey_500: '#9AA0A6', GM2_grey_600: '#80868B', GM2_grey_700: '#5F6368',
  GM2_grey_800: '#3C4043', GM2_grey_900: '#202124',
};

export function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** 当前主题（dark tile 切换） */
export const Theme = {
  dark: false,
  get colors() {
    return { ...materialScheme(this.dark), ...surfaceEffects(this.dark), ...shadeColors(this.dark) };
  },
};
