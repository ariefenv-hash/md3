/**
 * res/values/dimens.ts — 移植自 AOSP android-17.0.0_r1
 *
 * 来源文件：
 *  - frameworks/base/packages/SystemUI/res/values/shade_dimens.xml
 *  - frameworks/base/packages/SystemUI/res/values/dimens.xml
 *  - frameworks/base/core/res/res/values/dimens.xml (notification_2025_*)
 *  - frameworks/base/packages/SystemUI/res/values/config.xml (integers)
 *
 * 1dp 在本移植中等于 1px（浏览器 CSS px），便于逐值对照。
 */

// ===== shade_dimens.xml（C 2025，M3E overlay shade）=====
/** <dimen name="shade_panel_width">600dp</dimen> — shade 浮层面板最大宽度 */
export const SHADE_PANEL_WIDTH = 600;
/** <dimen name="shade_panel_margin_horizontal">0dp</dimen> — 仅 Compact(<600dp) 为 0 */
export const SHADE_PANEL_MARGIN_HORIZONTAL = 0;
/** <dimen name="overlay_shade_panel_shape_radius">46dp</dimen> — 浮层面板圆角 */
export const OVERLAY_SHADE_PANEL_SHAPE_RADIUS = 46;

// QS shade overlay common tiles
export const COMMON_TILE_ACTIVE_ICON_CORNER_RADIUS = 16; // common_tile_default_active_icon_corner_radius
export const COMMON_TILE_ACTIVE_TILE_CORNER_RADIUS = 24; // common_tile_default_active_tile_corner_radius
export const COMMON_TILE_DUAL_TARGET_END_PADDING = 8;    // common_tile_default_dual_target_end_padding
export const COMMON_TILE_ICON_SIZE = 32;                 // common_tile_default_icon_size (small tile icon)
export const COMMON_TILE_INACTIVE_ICON_CORNER_RADIUS = 50; // common_tile_default_inactive_icon_corner_radius（全圆）
export const COMMON_TILE_INACTIVE_TILE_CORNER_RADIUS = 50; // = inactive_icon_corner_radius
export const COMMON_TILE_LARGE_TILE_ICON_SIZE = 28;      // common_tile_default_large_tile_icon_size
export const COMMON_TILE_START_PADDING = 8;              // common_tile_default_start_padding
export const COMMON_TILE_TILE_HEIGHT = 72;               // common_tile_default_tile_height
export const COMMON_TILE_TOGGLE_TARGET_SIZE = 56;        // common_tile_default_toggle_target_size

// CommonTileDefaults（CommonTile.kt 内硬编码）
export const TILE_END_PADDING = 12;        // CommonTileDefaults.TileEndPadding
export const TILE_ARRANGEMENT_PADDING = 6; // CommonTileDefaults.TileArrangementPadding
export const TILE_LABEL_BLUR_WIDTH = 32;   // CommonTileDefaults.TileLabelBlurWidth
export const SIDE_ICON_WIDTH = 32;         // CommonTileDefaults.SideIconWidth
export const SIDE_ICON_HEIGHT = 20;        // CommonTileDefaults.SideIconHeight

// QS shade overlay brightness bar（BrightnessSliderDimensions.Default 同源）
export const OVERLAY_QS_BRIGHTNESS_ICON_SIZE = 28;      // overlay_qs_layout_brightness_icon_size
export const OVERLAY_QS_BRIGHTNESS_THUMB_HEIGHT = 52;   // overlay_qs_layout_brightness_thumb_height
export const OVERLAY_QS_BRIGHTNESS_THUMB_WIDTH = 4;     // overlay_qs_layout_brightness_thumb_width
export const OVERLAY_QS_BRIGHTNESS_TRACK_HEIGHT = 40;   // overlay_qs_layout_brightness_track_height
export const OVERLAY_QS_BRIGHTNESS_VERTICAL_PADDING = 6;// overlay_qs_layout_brightness_vertical_padding
export const OVERLAY_QS_BRIGHTNESS_CORNER = 24;         // overlay_qs_layout_brightness_rounded_corner
export const OVERLAY_QS_BRIGHTNESS_FRAME_WIDTH = 10;    // overlay_qs_layout_brightness_frame_width
export const OVERLAY_QS_BRIGHTNESS_FRAME_HEIGHT = 6;    // overlay_qs_layout_brightness_frame_height
export const OVERLAY_QS_TOOLBAR_HEIGHT = 48;            // overlay_qs_layout_toolbar_height
export const OVERLAY_QS_LAYOUT_HORIZONTAL_PADDING = 16; // overlay_qs_layout_horizontal_padding
export const OVERLAY_QS_LAYOUT_VERTICAL_PADDING = 16;   // overlay_qs_layout_vertical_padding

// 亮度滑条内部尺寸（BrightnessSlider.kt InternalDimensions）
export const SLIDER_TRACK_ROUNDED_CORNER = 12; // SliderTrackRoundedCorner
export const SLIDER_ICON_PADDING = 6;          // IconPadding
export const SLIDER_THUMB_TRACK_GAP = 6;       // ThumbTrackGapSize

// toolbar（shade_dimens.xml QS shade overlay toolbar）
export const TOOLBAR_BOTTOM_PADDING = 8;          // toolbar_bottom_padding
export const TOOLBAR_BUTTON_COLORED_BG_SIZE = 36; // toolbar_button_colored_background_size
export const TOOLBAR_BUTTON_ICON_SIZE = 24;       // toolbar_button_icon_size
export const TOOLBAR_BUTTON_SIZE = 48;            // toolbar_button_size

// ===== QS 网格列数（config.xml integers）=====
export const QUICK_SETTINGS_INFINITE_GRID_NUM_COLUMNS = 4; // quick_settings_infinite_grid_num_columns
export const QUICK_SETTINGS_DUAL_SHADE_NUM_COLUMNS = 4;    // quick_settings_dual_shade_num_columns
export const QUICK_SETTINGS_MIN_NUM_TILES = 6;             // quick_settings_min_num_tiles
/** 大磁贴跨列数：largeSpan（4 列网格中占 2 列 → 手机一排 2 个大磁贴） */
export const LARGE_TILE_SPAN = 2;

// ===== status bar / notifications（dimens.xml）=====
export const STATUS_BAR_HEIGHT = 48; // R.dimen.status_bar_height（17 默认，含挖孔区）
export const NOTIFICATION_PANEL_MARGIN_TOP = 8;     // notification_panel_margin_top
export const NOTIFICATION_PANEL_MARGIN_BOTTOM = 0;  // notification_panel_margin_bottom

// ===== core/res notification_2025_* =====
export const NOTIF_2025_CONTENT_MARGIN_START = 72;   // notification_2025_content_margin_start
export const NOTIF_2025_CONTENT_MARGIN_END = 60;     // notification_2025_content_margin_end
export const NOTIF_2025_MARGIN = 16;                 // notification_2025_margin
export const NOTIF_2025_REDUCED_MARGIN = 12;         // notification_2025_reduced_margin
export const NOTIF_2025_ADDITIONAL_MARGIN = 4;       // notification_2025_additional_margin
export const NOTIF_2025_MIN_HEIGHT = 72;             // notification_2025_min_height
export const NOTIF_2025_CONTENT_MIN_HEIGHT = 40;     // notification_2025_content_min_height
export const NOTIF_2025_ICON_CIRCLE_SIZE = 40;       // notification_2025_icon_circle_size
export const NOTIF_2025_ICON_CIRCLE_PADDING = 8;     // notification_2025_icon_circle_padding
export const NOTIF_2025_HEADERLESS_LINE_HEIGHT = 24; // notification_headerless_line_height
export const NOTIF_2025_HEADER_SEPARATING_MARGIN = 2;// notification_header_separating_margin
export const NOTIF_2025_ACTIONS_MARGIN_START = 56;   // notification_2025_actions_margin_start
export const NOTIF_2025_ACTION_LIST_HEIGHT = 48;     // notification_2025_action_list_height
export const NOTIF_2025_ACTION_LIST_MARGIN_BOTTOM = 6;
export const NOTIF_2025_RIGHT_ICON_MARGIN_END = 42;  // notification_2025_right_icon_margin_end
export const NOTIF_2025_RIGHT_ICON_VERTICAL_MARGIN = 12;
export const NOTIF_2025_EXPAND_BUTTON_PILL_HEIGHT = 18;
export const NOTIF_2025_EXPAND_BUTTON_PILL_WIDTH = 26;
export const NOTIF_2025_EXPAND_BUTTON_ICON_SIZE = 16;
export const NOTIF_2025_MESSAGING_SPACING = 14;      // notification_2025_messaging_spacing
export const NOTIF_2025_TEXT_MARGIN_TOP = 8;         // notification_2025_text_margin_top
export const NOTIF_2025_FACE_PILE_AVATAR_SIZE = 24;  // notification_2025_face_pile_avatar_size
export const NOTIF_CLOSE_BUTTON_SIZE = 16;           // notification_close_button_size

// 展开通知的进度条/媒体区等
export const NOTIF_MEDIA_ACTION_ICON = 48; // notification_2025_actions_icon_size
