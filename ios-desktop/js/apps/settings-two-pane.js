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
// v7.98 #10：AOSP 一级菜单图标（vector drawable 逐 path 转换，真源码）
import { AOSP_ICONS } from '../icons-aosp.js';
// v8.28 #53：popSubPage（右栏横滑返回提交收敛）+ startLoop（手势跟手期渲染驱动）
import { reactivateScripts, popSubPage } from '../page-stack.js';
import { startLoop } from '../app-window.js';
import { dom } from '../dom.js';
import { state } from '../state.js';

// ==================== v8.28 #53：two-pane 触发阈值 AOSP 权威化 ====================
// 考证链（aosp-mirror main 实拉）：A17 大屏 two-pane 非自研 Fragment 管理，而是
// ActivityEmbedding 双 Activity 嵌入（SettingsHomepageActivity.mIsTwoPane =
// ActivityEmbeddingUtils.isAlreadyEmbedded；ActivityEmbeddingRulesController
// .registerTwoPanePairRule → SplitPairRule）。阈值权威值（res/values/integers.xml）：
//   config_activity_embed_split_min_sw_dp  = 600（最小宽度维，任意旋转）
//   config_activity_embed_split_min_cur_dp = 720（当前窗口宽）
// androidx SplitPairRule minWidthDp OR minSmallestWidthDp 满足其一即嵌入 →
// Web 映射：clientWidth ≥ 720 || min(clientWidth, clientHeight) ≥ 600。
// 旧值 620 单阈值与两权威值均不符（如 700×500 窗口旧判宽、原生为窄），本版修正。
const TP_MIN_CUR_DP = 720;
const TP_MIN_SW_DP = 600;
// 兼容旧锚点名（v751 测试契约）：语义升级为 AOSP cur_dp 权威值
const WIDE_THRESHOLD = TP_MIN_CUR_DP;
function isWideEnough(w, h) {
  return w >= TP_MIN_CUR_DP || Math.min(w, h) >= TP_MIN_SW_DP;
}
// ④ 默认首屏：动画与动效（页栈索引 10）
const DEFAULT_PAGE = 10;

// v7.98 #10 设置大升级：一级清单重建为 AOSP 真源码权威形态（aosp-mirror main）
// 考证链（全部源码实证，复刻版仅对照）：
//   ① 清单 = res/xml/top_level_settings.xml：21 项 HomepagePreference 扁平列表（非分组卡片），
//      顺序 = android:order（network -150 → communal -145 → … → about_device 20 → support 100）
//   ② 文案 = res/values-zh-rCN/strings.xml 权威值（「提示音和振动」≠复刻版「声音和振动」、
//      「壁纸」≠「壁纸和样式」、「无障碍功能」、「密码、通行密钥和账号」等重大差异逐项纠正）
//   ③ 排版 = res/layout/homepage_preference_v2.xml（Flags.homepageRevamp）：行 minHeight 72dp、
//      图标 40dp（icon_frame paddingStart 16dp / marginEnd -8dp）、文本区 16dp 纵向留白、
//      无 chevron（布局无该元素）、行间无分隔线（首页裸列表）
//   ④ 图标 = res/drawable/*.xml vector 逐 path 转 SVG（icons-aosp.js）；色彩考证
//      TopLevelSettings.onCreatePreferences：homepageRevamp 开启时跳过统一 tint，
//      vector 内建 fillColor="?android:attr/colorPrimary" 生效 → 单色 colorPrimary；
//      复刻版彩虹磁贴 / v7.51 多彩底板均为旧形态，源码不支持 → 移除底板
//      【v8.24 #47 勘正】以上为非 Expressive 路径（homepage_preference.xml + _filled 图标）；
//      A17 Expressive 路径（SettingsThemeHelper.isExpressiveTheme → homepage_preference_expressive
//      布局 + top_level_settings_expressive.xml）全部 ic_homepage_* 为 layer-list：
//      AdaptiveIconShapeDrawable 40dp 彩色圆底（@color/homepage_X_background）+ glyph 24dp
//      （TintDrawable 包 ic_settings_*_filled 同 path，tint=@color/homepage_X_foreground），
//      用户 A16+ 实机观察与此一致 —— 彩色圆底回潮，逐项色板见 TP_PLATE
//   ⑤ 摘要：源码 summary_placeholder 项由各 TopLevel*Controller 运行时动态注入。
//      v7.99 二期考证（aosp-mirror main 实源）：
//        - network = TopLevelNetworkEntryPreferenceController.getSummary() → 静态串
//          network_dashboard_summary_mobile（有 SIM）/ no_mobile（无 SIM）——并非 Wi-Fi 状态；
//          本移植为手机形态（状态栏含蜂窝信号）→ 取 mobile 变体「移动网络、WLAN、热点」
//        - battery = TopLevelBatteryPreferenceController 动态仪表盘标签（电量%+状态），
//          本移植以行尾 hintId=settingsMainBatteryPct 承接（v751 测试锚定契约），
//          settings-battery.js 同步升级为「67% - 正在充电」仪表盘标签语义
//        - storage = TopLevelStoragePreferenceController → storage_summary
//          「已使用 X - 还剩 Y」，X=使用率百分比、Y=剩余空间（动态异步），
//          由页 0 内联脚本经 window.__storageStats 单一真源刷新（v7.99 落地）
//        - connected = XML 默认摘要 connected_devices_dashboard_default_summary
//          「蓝牙、配对」（controller 仅做可用性门控，无动态摘要）——保持默认即忠实
//   ⑥ communal（共用）受 CommunalPreferenceController 可用性门控：
//      isAvailable() = config_show_communal_settings && canCurrentUserDream ——
//      v8.98 #137 补出厂默认实证：AOSP Settings res/values/config.xml L716
//      config_show_communal_settings=false（blob 95f8eba8 实拉）→ AND 短路恒 false
//      → UNSUPPORTED_ON_DEVICE，隐藏非「硬件门控未验证」而是出厂默认实证；
//      以 hidden:true 保留门控语义，渲染层跳过；sub 为空串 = 源码无默认摘要，忠实呈现
//   ⑦ v8.31 #22⑤⑥：safety/security 形态门控实证（TopLevelSecurityEntryPreferenceController
//      + TopLevelSafetyCenterEntryPreferenceController 实拉）——SafetyCenter 启用时
//      top_level_safety_center「安全和隐私」AVAILABLE、top_level_security「安全」
//      CONDITIONALLY_UNAVAILABLE（二者取其一，A17 手机默认 = SafetyCenter 启用）→
//      safety 转正页 28，security hidden:true 保留门控语义（communal ⑥ 同律）
//   ⑧ v8.98 #137：RestrictedHomepagePreference 裁决——top_level_settings.xml 21 项中
//      唯二为 RestrictedHomepagePreference（modes top_level_priority_modes / wallpaper
//      top_level_wallpaper）：设备管理（admin）受限语义，useAdminDisabledSummary=true
//      （被策略禁用时显示「由管理员停用」类摘要）；md3 无 admin/设备策略概念，
//      受限态无从触发 → 裁决「受限态不移植」，行本体保留普通渲染（两行其余语义
//      与 HomepagePreference 等同，仅多 admin 分支）。wallpaper 另有形态差异：
//      top_level_wallpaper 无 android:fragment 属性 = 非 Fragment 承载，由
//      TopLevelWallpaperPreferenceController 起 intent 跳壁纸选择器（#137 与
//      #85-F1 互证）——v8.96 已落地「壁纸和样式」复合入口，行内滚动直达取色区
//      承接跳转语义（Web 内嵌等价，铁律#2 合法超越）。emergency 可见性依据同轮补：
//      XML settings:isPreferenceVisible="@bool/config_show_emergency_settings"
//      且 config.xml L574 实证 true → idx 29 默认可见成立（非自创可见）
const STUB_IDX = 16; // 未对齐子页面的过渡占位页（settings.js pages 末尾；v7.99 网络子页转正页 17、v8.00 已连接的设备转正页 18、v8.01 通知转正页 19、v8.02 无障碍转正页 20、v8.26 关于手机转正页 21、v8.29 位置信息转正页 24、v8.30 模式转正页 27、v8.31 安全和隐私转正页 28、v8.32 安全和紧急情况转正页 29、v8.33 密码通行密钥和账号转正页 30，剩余 0 项——v8.34 #22⑪ support 实证 UNSUPPORTED_ON_DEVICE 门控隐藏，#22 十一项全处置完毕；常量保留供历史测试锚定，无引用点）

// ---------- v8.24 #47：A17 expressive 一级图标彩色圆底色板 ----------
// 权威考证链（LineageOS lineage-24.0 = A17 基线，api.github raw media type 实拉）：
//   ① 形制：top_level_settings_expressive.xml 全部 ic_homepage_* = layer-list：
//      背景 = AdaptiveIconShapeDrawable @dimen/dashboard_tile_image_size=40dp（adaptive 圆形）；
//      前景 = glyph @dimen/dashboard_tile_foreground_image_size=24dp、
//      inset dashboard_tile_foreground_image_inset=8dp（恰 40 居中）；
//      glyph = TintDrawable(ic_settings_*_filled, tint=homepage_X_foreground)
//      —— 与 v7.98 已转 SVG 的 _filled 同 path，直接复用 icons-aosp.js。
//   ② 逐项色：res/values/colors.xml homepage_*_background/foreground →
//      m3_ref_palette_{family}90（日）/80（夜，values-night 仅覆盖 bg）/30（fg 恒定）；
//      hex 源 = material-components-android extended_palette_tokens.xml（Google 权威，字节级一致）。
//   ③ 色族映射（item key → family；privacy/emergency 随 drawable 实引 security/safety 底色）：
//      network/connected→blueVariant；apps→blue；notifications/sound/modes→pink；
//      communal/display/wallpaper→orange；storage→yellow；battery→green；
//      system/about→grey；security/privacy/location/accounts→cyan；
//      safety/emergency→red；accessibility/support→purple
//   ④ 夜模式载体：外壳默认暗色，浅色 = body.light-theme（theme-mode.css 同律）；
//      CSS 变量 --tpc-{family}(bg)/--tpc-{family}-fg 定义在 settings-two-pane.css
const TP_PLATE = {
  blueVariant: { bgDark: '#67D4FF', bgLight: '#BDE9FF', fg: '#004D68' },
  blue:        { bgDark: '#A1C9FF', bgLight: '#D0E4FF', fg: '#04409F' },
  pink:        { bgDark: '#FFAEE4', bgLight: '#FFD8EF', fg: '#8D0053' },
  orange:      { bgDark: '#FFB683', bgLight: '#FFDCC3', fg: '#753403' },
  yellow:      { bgDark: '#FCBD00', bgLight: '#FFE07C', fg: '#6D3A01' },
  green:       { bgDark: '#80DA88', bgLight: '#BEEFBB', fg: '#00522C' },
  grey:        { bgDark: '#C7C7C7', bgLight: '#E3E3E3', fg: '#474747' },
  cyan:        { bgDark: '#60D5F3', bgLight: '#ACEDFF', fg: '#004E5D' },
  red:         { bgDark: '#FFB3AE', bgLight: '#FFDADC', fg: '#8A1A16' },
  purple:      { bgDark: '#D9BAFD', bgLight: '#EEDCFE', fg: '#5629A4' },
};

const AOSP_TOP_LEVEL = [
  // v8.12 #71：kw = 搜索别名表（含二级项常见词）——左栏搜索胶囊此前完全失效
  //（applySearch 遍历的 .tp-group 全库零生成，重构 renderSettingsListHTML 后未同步改造），
  // 修复后 data-label + data-keywords 联合匹配，让「深色」「省电」「WLAN」这类
  // 二级项别名也能命中对应一级入口（Android 原生搜索为全库文本索引，此为 Web 内建等价最小集）
  { key: 'network', icon: 'topWireless', plate: 'blueVariant', label: '网络和互联网', sub: '移动网络、WLAN、热点', idx: 17, kw: 'wlan wifi wi-fi 移动数据 流量 热点 飞行模式 互联网 上网' },
  { key: 'communal', icon: 'topCommunal', plate: 'orange', label: '共用', sub: '', hidden: true },
  { key: 'connected', icon: 'topDevices', plate: 'blueVariant', label: '已连接的设备', sub: '蓝牙、配对', idx: 18, kw: '蓝牙 配对 投屏 设备连接' },
  { key: 'apps', icon: 'topApps', plate: 'blue', label: '应用', sub: '最近使用的应用、默认应用', idx: 6, kw: '应用管理 默认应用 卸载 闲置 最近打开' },
  { key: 'notifications', icon: 'topNotifications', plate: 'pink', label: '通知', sub: '历史通知、对话', idx: 19, kw: '通知历史 对话 气泡 通知权限' },
  { key: 'modes', icon: 'topModes', plate: 'pink', label: '模式', sub: '', idx: 27, kw: '场景 模式切换' },
  { key: 'battery', icon: 'topBattery', plate: 'green', label: '电池', sub: '', hintId: 'settingsMainBatteryPct', idx: 2, kw: '省电 充电 电量 百分比 电池管理' },
  { key: 'storage', icon: 'topStorage', plate: 'yellow', label: '存储空间', sub: '', subId: 'settingsStorageSub', idx: 7, kw: '存储 内存 文件 释放空间 回收站' },
  { key: 'sound', icon: 'topSound', plate: 'pink', label: '提示音和振动', sub: '音量、振动、勿扰', idx: 4, kw: '音量 铃声 静音 勿扰 触摸提示音 闹钟 媒体' },
  { key: 'display', icon: 'topDisplay', plate: 'orange', label: '显示', sub: '深色主题、字体大小、亮度', idx: 1, kw: '亮度 深色 dark 夜览 自动锁屏 字体 自动旋转 息屏' },
  // v8.96（#85-F1）：复合入口升级 —— 一级「壁纸」→「壁纸和样式」（AOSP @string/
  // wallpaper_and_style "Wallpaper & style"，A13+ WallpaperAndStyleActivity 复合页：
  // 壁纸 + 颜色/Monet 取色合一；zh-rCN 权威值「壁纸和样式」与 theme-engine 来源行
  // 文案同源）。取色单源 = 显示页 --md-h，复合语义由页 13 顶部「主题色」复合块
  // __tpNav 跳转承接（v8.96 同 commit）。kw 补搜索别名。
  { key: 'wallpaper', icon: 'topWallpaper', plate: 'orange', label: '壁纸和样式', sub: '主屏幕、锁定屏幕、主题色', idx: 13, kw: '动态壁纸 壁纸样式 实时模糊 选择壁纸 主题色 取色 壁纸和样式' },
  { key: 'accessibility', icon: 'topAccessibility', plate: 'purple', label: '无障碍功能', sub: '显示、互动、音频', idx: 20, kw: '放大 色彩矫正 朗读 字幕 互动' },
  { key: 'safety', icon: 'topSafety', plate: 'red', label: '安全和隐私', sub: '应用安全性、设备锁定、权限', idx: 28, kw: '安全 隐私 应用安全 设备锁定 权限 扫描' },
  // v8.31 #22⑥ 门控隐藏：TopLevelSecurityEntryPreferenceController.getAvailabilityStatus()
  // 实拉 —— SafetyCenter.isEnabled → CONDITIONALLY_UNAVAILABLE（与 top_level_safety_center
  // 二者取其一，A17 手机默认 SafetyCenter 启用 → 本项隐藏）；SafetyCenter 关闭时才显示
  // 传统 SecuritySettings（security_dashboard_settings.xml，页面骨架已在页 28 合流呈现）
  { key: 'security', icon: 'topSecurity', plate: 'cyan', label: '安全', sub: '屏幕锁定、查找我的设备、应用安全性', hidden: true, kw: '锁屏 指纹 人脸 解锁 查找设备' },
  { key: 'privacy', icon: 'topPrivacy', plate: 'cyan', label: '隐私', sub: '权限、账号活动、个人数据', idx: 5, kw: '权限管理 个人数据 隐私面板' },
  { key: 'location', icon: 'topLocation', plate: 'cyan', label: '位置信息', sub: '应用位置权限', idx: 24, kw: 'gps 定位 位置权限' },
  { key: 'emergency', icon: 'topEmergency', plate: 'red', label: '安全和紧急情况', sub: '紧急求救、医疗信息、警报', idx: 29, kw: '求救 医疗 警报 地震' },
  // v8.33 #22⑨ 转正：AccountDashboardFragment.getPreferenceLayoutResId 实拉——
  //   CredentialManager.isServiceEnabled → CredmanService.isServiceEnabled →
  //   DeviceConfig.getBoolean(NAMESPACE_CREDENTIAL, "enable_credential_manager", true)
  //   出厂默认 true → A17 纯净态走 accounts_dashboard_settings_credman.xml（凭据管理器形态）
  //   → 页 30（credman 1:1；传统形态 passwords_category 二选一落选留注记）
  { key: 'accounts', icon: 'topAccounts', plate: 'cyan', label: '密码、通行密钥和账号', sub: '', idx: 30, kw: '账号 登录 同步 通行密钥' },
  { key: 'system', icon: 'topSystem', plate: 'grey', label: '系统', sub: '语言、手势、时间、备份', idx: 15, kw: '语言输入 手势 时间 备份 重置 系统更新 开发者选项' },
  { key: 'about', icon: 'topAbout', plate: 'grey', label: '关于手机', sub: '', idx: 21, kw: '版本 设备名称 状态信息 android 版本' },
  // v8.34 #22⑪ 收官裁决：SupportPreferenceController.getAvailabilityStatus() 实拉（support
  //   包 1938B 全文）——mSupportFeatureProvider == null ? UNSUPPORTED_ON_DEVICE : AVAILABLE；
  //   provider 接线实拉：FeatureFactory.kt 接口默认 `open val supportFeatureProvider:
  //   SupportFeatureProvider? = null`，AOSP 纯净 FeatureFactoryImpl.kt 全文零 support 覆盖
  //   → UNSUPPORTED_ON_DEVICE → 一级菜单「提示和支持」行隐藏（一级行 XML =
  //   top_level_settings.xml HomepagePreference key=top_level_support order=100
  //   title=page_tab_title_support summary=support_summary icon=ic_help；startSupport =
  //   Tips & Support 独立应用外部 intent，v8.31 security 门控隐藏同律；
  //   AOSP 无独立 XML，#22⑪ 注记「考证后决定」→ 裁决为不转正独立页）
  { key: 'support', icon: 'topSupport', plate: 'purple', label: '提示和支持', sub: '', hidden: true, kw: '帮助 反馈 支持' },
];

// ---------- 左栏 HTML 生成（settings.js 页面模板直接内插） ----------
// v7.98：homepage_preference_v2 权威行形态——72dp 行高、40dp 图标、
// 标题 16px + 摘要 14px(onSurfaceVariant)、无 chevron、行间无分隔线。
// v8.24 #47：A17 expressive 彩色圆底回潮——40dp 圆容器（border-radius 50%，
// adaptive 圆形）+ 24dp glyph 居中（inset 8dp 恰居中）；底色/字色逐项 TP_PLATE
// → CSS 变量 --tpc-{family}(-fg)（settings-two-pane.css 定义，body.light-theme 切日间）。
// 保留 tp-row/data-tp 类名与 __tpNav 桥（既有双栏挂载/导航链路不变）。
function navRow(item) {
  const hint = item.hintId
    ? `<span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:12px;margin-right:16px;flex:none;" id="${item.hintId}"></span>`
    : '';
  // v7.99 #10：subId —— 摘要行需被动态刷新时挂元素 ID（如存储行 storage_summary 异步真值）
  const subId = item.subId ? ` id="${item.subId}"` : '';
  const onclick = item.idx != null ? `__tpNav(this,${item.idx})` : item.action;
  const nav = item.idx != null ? ` data-tp="${item.idx}"` : '';
  // v8.12 #71：搜索别名表随行落 DOM（applySearch 联合匹配 data-label）
  const kwAttr = item.kw ? ` data-keywords="${item.kw}"` : '';
  // v8.24 #47：彩色圆底逐项色（缺省回退 blue 族 = homepage_generic 同族兑底语义）
  const plate = item.plate || 'blue';
  return `
            <div class="md3-list-item tp-row tp-home-row"${nav}${kwAttr} data-label="${item.label}" data-tp-key="${item.key}" onclick="${onclick}" role="button" tabindex="0"
              style="min-height:72px;display:flex;align-items:center;border-radius:0;">
              <span class="tp-home-icon" style="width:40px;height:40px;flex:none;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:var(--tpc-${plate},var(--tpc-blue));color:var(--tpc-${plate}-fg,var(--tpc-blue-fg));margin-left:16px;margin-right:8px;">${AOSP_ICONS[item.icon] || ''}</span>
              <span style="flex:1;min-width:0;padding-block:16px;">
                <span class="tp-row-label" style="display:block;font-size:16px;">${item.label}</span>
                <span class="tp-row-sub"${subId} style="display:block;font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);">${item.sub || ''}</span>
              </span>
              ${hint}
            </div>`;
}

export function renderSettingsListHTML() {
  // AOSP 首页为扁平裸列表：无分组标题、无卡片容器、无分隔线（homepageRevamp v2）
  return AOSP_TOP_LEVEL.filter((i) => !i.hidden).map(navRow).join('');
}

export function aospTopLevelList() { return AOSP_TOP_LEVEL; }

// ---------- 会话状态 ----------
// root -> { root, pageEl, wrapper, wide, hosted, selected, searchQ, ro }
const sessions = new Map();
let sessionId = 0;

function resetStackInlineStyles(el) {
  // 从栈隐藏态升格为右栏现役页：清掉 renderPageStack 写入的隐藏位姿
  ['transform', 'opacity', 'filter', 'borderRadius', 'boxShadow', 'zIndex', 'pointerEvents'].forEach((k) => { el.style[k] = ''; });
}

// ---------- v8.28 #53：双栏容器页（页 0）的栈渲染豁免 ----------
// 页 0 内嵌 .tp-root 双栏布局，是 wide 态的常驻可视容器——renderPageStack 会把
// 非栈顶页 park（translate3d(100%) + pointer-events:none），renderSubPages 动画帧
// 又只恢复 transform/opacity 不恢复 pointer-events → 容器点击全被吞（真实指针
// hit-testing 失效，evaluate 的 .click() 直派发掩盖了该缺陷）。wide 态下给页 0
// 打 tpHosted 常驻豁免标记 + 清 park 残留位姿；退窄时解除归还栈渲染。
function markContainerExempt(st) {
  if (!st.pageEl || st.pageEl.dataset.tpHosted === '1') return;
  st.pageEl.dataset.tpHosted = '1';
  resetStackInlineStyles(st.pageEl); // 清 park 残留（transform/opacity/filter/pe）
}
function unmarkContainerExempt(st) {
  if (!st.pageEl || st.pageEl.dataset.tpHosted !== '1') return;
  delete st.pageEl.dataset.tpHosted;
  parkStackPage(st.pageEl); // 交还栈渲染的标准隐藏位姿（窄态页 0 非栈顶时正确隐藏）
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
    // v8.28 #53：归还 pageStack 原生容器（与 returnBorrowed 同律——wrapper 直下
    // 脱离定位父级，后续 renderSubPages 位姿写入会闪现）
    const stackEl = document.getElementById('pageStack');
    if (stackEl && stackEl.isConnected) stackEl.appendChild(el);
    else if (st.wrapper && st.wrapper.isConnected) st.wrapper.appendChild(el);
  } else {
    el.remove();
  }
  st.hosted = null;
  returnBorrowed(st); // v8.28 #53：手势借入的 prev 页随托管归还一并退场（防泄漏驻留）
  const right = st.root.querySelector('.tp-right');
  if (right) right.classList.remove('tp-has-page');
  // 标题还原
  try { if (dom.appTitle) dom.appTitle.textContent = '设置'; } catch (e) {}
  void idx;
}

// ---------- v8.28 #53：右栏横滑返回手势（Launcher3 PagedView 判定基准） ----------
// 考证链（LineageOS lineage-24.0 = A17 基线实拉）：PagedView.java 桌面横滑判定参数——
//   · 触发 slop：mPageSlop = ViewConfiguration.getScaledPagingTouchSlop()
//     （frameworks/base ViewConfiguration：PAGING_TOUCH_SLOP = TOUCH_SLOP*2 = 16dp）
//   · fling 阈值：mFlingThresholdVelocity = R.dimen.fling_threshold_velocity = 500dp/s
//     （easy_fling 400dp/s 为 quickswitch 专用，本场景不引入）；fling 优先于大幅位移
//   · 显著位移：isSignificantMove = |Δ| > 页宽 × SIGNIFICANT_MOVE_THRESHOLD(0.4f)
//   · 反向回原页：RETURN_TO_ORIGINAL_PAGE_THRESHOLD(0.33f) —— 朝返回方向拖拽中
//     反向 fling（≥500px/s）时不提交（回原页）
//   · mMinSnapVelocity(1500dp/s) 与 sin 调制 snap 时长为 Scroller 域动画参数；
//     md3 收敛曲线统一走既有 popSubPage 弹簧通道（v7.41 手势物理同源），
//     速度换算同窄栏边缘手势（springV = -v/W，进度单位/秒）
// 作用域：宽栏托管态 + 栈深>1（三级页）——二级直展（栈根）无返回页可滑，clamp 回弹；
// 跟手渲染复用 app-window renderSubPages 弹簧通道（subpageSpring.x 1:1 驱动，
// prev 页借入右栏补齐下层视觉——A17 右窗格页滑出露出前级的栈语义）。
const TP_PAGED_SLOP = 16;        // ViewConfiguration PAGING_TOUCH_SLOP = 16dp（TOUCH_SLOP 8dp×2）
const TP_FLING_THRESHOLD = 500;  // Launcher3 fling_threshold_velocity = 500dp/s
const TP_SIGNIFICANT_RATIO = 0.4;   // PagedView SIGNIFICANT_MOVE_THRESHOLD = 0.4f
const TP_RETURN_ORIG_RATIO = 0.33;  // PagedView RETURN_TO_ORIGINAL_PAGE_THRESHOLD = 0.33f

function returnBorrowed(st) {
  const b = st.borrowed;
  if (!b) return;
  st.borrowed = null;
  if (b.el && b.el.isConnected) {
    b.el.classList.remove('tp-hosted', 'tp-borrowed');
    delete b.el.dataset.tpHosted; // 解除 renderPageStack 豁免（归还后回归栈渲染）
    parkStackPage(b.el);
    // v8.28 #53：归还 pageStack 原生容器（renderSubPages 动画期位姿写入需在
    // pageStack 上下文内；wrapper 直下会脱离定位父级产生闪现）
    const stackEl = document.getElementById('pageStack');
    if (stackEl && stackEl.isConnected) stackEl.appendChild(b.el);
    else if (st.wrapper && st.wrapper.isConnected) st.wrapper.appendChild(b.el);
  }
}

// 借入「视觉下层页」进右栏（插在托管页之前 = 视觉下层），返回借用记录或 null。
// v8.28 #53 栈语义：二级页不压栈（托管直展），navHistory 深度 ≠ 视觉层级——
//   · depth>2（四级+，栈 [0,22,23]）：视觉下层 = 栈内前页 navHistory[depth-2]
//   · depth==2（三级，栈 [0,22]）：视觉下层 = 左栏高亮行对应二级页（栈中无 21）
//   不可借入守卫：目标为托管页自身 / 包含右栏的容器页（页 0）/ 不存在。
function borrowPrevPage(st) {
  if (st.borrowed || !st.hosted) return null;
  const depth = state.navHistory.length;
  let prevIdx;
  if (depth > 2) {
    prevIdx = state.navHistory[depth - 2];
  } else {
    const selRow = st.root.querySelector('.tp-row.tp-sel[data-tp]');
    prevIdx = selRow ? parseInt(selRow.dataset.tp, 10) : null;
  }
  if (prevIdx == null) return null;
  const prevEl = document.getElementById(`app-page-settings-${prevIdx}`);
  const right = st.root.querySelector('.tp-right');
  if (!prevEl || !right || prevEl === st.hosted.el) return null;
  if (prevEl.contains(right) || prevEl.contains(st.hosted.el)) return null; // 容器页（页 0）不可借入
  // prev 页可能正处于栈隐藏位姿；渲染通道（renderSubPages prevPage 分支）在跟手
  // 首帧即重写位姿，此处仅入位不预清。tpHosted 标记防 renderPageStack 对借入页
  // 写 park 位姿（弹栈收敛/renderPageStack 与动画帧竞争）。
  prevEl.classList.add('tp-hosted', 'tp-borrowed'); // tp-borrowed：区分托管页的查询标记（回弹期 right 双 tp-hosted 并存）
  prevEl.dataset.tpHosted = '1';
  right.insertBefore(prevEl, st.hosted.el);
  st.borrowed = { idx: prevIdx, el: prevEl, moved: true };
  return st.borrowed;
}

// 手势接管后吞掉 up 合成 click（防误触发行导航；capture 一次性，超时自摘）
function swallowClickOnce(rootEl) {
  const h = (e) => {
    e.stopPropagation();
    if (e.cancelable !== false) e.preventDefault();
    rootEl.removeEventListener('click', h, true);
  };
  rootEl.addEventListener('click', h, true);
  setTimeout(() => rootEl.removeEventListener('click', h, true), 350);
}

function installSwipeBack(st) {
  if (!st.isStackCtx) return;
  const rootEl = st.root;
  const g = { active: false, id: null, x0: 0, y0: 0, samples: [], confirmed: false };

  rootEl.addEventListener('pointerdown', (e) => {
    if (g.active || g.id !== null) return;
    if (!st.wide || !st.hosted) return;                                  // 非托管态不接管
    if (!(state.currentApp && state.currentApp.id === 'settings')) return;
    if (state.navHistory.length <= 1) return;                            // 二级直展无返回页
    if (state.popInProgress || state.isDragging) return;                 // 弹栈/全局手势进行中让位
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
    const t = e.target;
    if (t && t.closest && t.closest('input,textarea,select,button,a,[role="slider"],.md3-slider,.slider-seek,.tp-search,canvas,iframe')) return;
    g.id = e.pointerId;
    g.x0 = e.clientX; g.y0 = e.clientY;
    g.confirmed = false;
    g.samples = [{ x: e.clientX, t: performance.now() }];
  }, { passive: true });

  rootEl.addEventListener('pointermove', (e) => {
    if (g.id !== e.pointerId) return;
    const now = performance.now();
    g.samples.push({ x: e.clientX, t: now });
    if (g.samples.length > 24) g.samples.shift();
    const dx = e.clientX - g.x0;
    const dy = e.clientY - g.y0;
    if (!g.confirmed) {
      if (Math.abs(dx) < TP_PAGED_SLOP || Math.abs(dx) <= Math.abs(dy)) return; // 横向主导才接管
      g.confirmed = true;
      g.active = true;
      borrowPrevPage(st);
      state.subpageBackDir = 1;   // LTR 右滑 = 朝返回方向（renderSubPages dir 投影）
      state.subpageBackTy = 0;
      if (typeof window.__tpSwipeBackActive === 'function') window.__tpSwipeBackActive(true);
    }
    if (!g.active) return;
    // 1:1 跟手：右滑（dx>0）揭示下层 → spring 进度 = 1 - dx/右栏宽，钳 [0,1]
    const right = st.root.querySelector('.tp-right');
    const w = right ? right.clientWidth : 1;
    state.subpageSpring.x = Math.max(0, Math.min(1, 1 - dx / w));
    state.subpageSpring.v = 0;
    startLoop();
  }, { passive: true });

  const finish = (e, cancelled) => {
    if (g.id !== e.pointerId) return;
    const wasActive = g.active;
    g.id = null;
    if (wasActive) {
      g.active = false;
      if (typeof window.__tpSwipeBackActive === 'function') window.__tpSwipeBackActive(false);
      swallowClickOnce(rootEl);
      const right = st.root.querySelector('.tp-right');
      const w = right ? right.clientWidth : 1;
      const last = g.samples[g.samples.length - 1];
      // Launcher3 速度窗口：约 100ms 内位移外推（VelocityTracker semantics）
      let first = g.samples[0];
      for (const s of g.samples) { if (last.t - s.t <= 100) { first = s; break; } }
      const vx = cancelled || g.samples.length < 2 ? 0
        : ((last.x - first.x) / Math.max(1, last.t - first.t)) * 1000; // px/s，+x 右滑
      const dx = last.x - g.x0;
      // PagedView 判定：fling 优先于显著位移；反向 fling（左甩）强制回原页
      //（RETURN_TO_ORIGINAL_PAGE_THRESHOLD 语义：朝返回方向拖拽中反向甩 = 不提交）
      const flingBack = vx >= TP_FLING_THRESHOLD;
      const flingForward = vx <= -TP_FLING_THRESHOLD;
      const significant = dx > w * TP_SIGNIFICANT_RATIO;
      const commit = !cancelled && !flingForward && (flingBack || significant);
      // 速度换算同窄栏边缘手势：springV = -v/W（右滑弹出 → 进度降，钳 ±4）
      const springV = Math.max(-4, Math.min(4, -vx / w));
      if (commit) {
        popSubPage(springV, { fromGesture: true });
      } else {
        state.subpageSpring.setTarget(1, springV); // 回弹（速度接力，PagedView snapToDestination 等价）
        startLoop();
      }
    }
    g.samples = [];
  };
  rootEl.addEventListener('pointerup', (e) => finish(e, false), { passive: true });
  rootEl.addEventListener('pointercancel', (e) => finish(e, true), { passive: true });
}

// ---------- 右栏打开指定设置项 ----------
// opts.sync（v8.28 #53）：页栈⇆托管同步路径 —— 不写 st.selected（三级托管不得污染
// 左栏一级选择语义）、不动行高亮（左栏 tp-sel 保留在用户所择二级行上，对齐原生
// 左栏选中态不随右窗格层级推进变化）；托管管理/标题/激活事件照常。
function open(st, pageIdx, opts) {
  const fromSync = !!(opts && opts.sync);
  const pages = st.pages;
  if (!pages || !pages[pageIdx] || !st.wide) return;
  if (st.hosted && st.hosted.idx === pageIdx) return; // v8.29：sync 桥高频调用幂等早退
  if (!fromSync) st.selected = pageIdx;
  // v8.28 #53：借入页处理——目标即借入页（弹栈收敛晋升，免移出闪现）则原地收编；
  // 其余情况归还借入页（防下层驻留）
  if (st.borrowed && st.borrowed.idx === pageIdx) {
    st.borrowed = null; // 元素已在右栏，走下方 hosted 装载路径原地收编
    st.root.querySelectorAll('.tp-borrowed').forEach((el) => el.classList.remove('tp-borrowed'));
  } else {
    returnBorrowed(st);
  }
  if (!fromSync) {
    // 行高亮
    st.root.querySelectorAll('.tp-row').forEach((r) => {
      r.classList.toggle('tp-sel', r.dataset.tp === String(pageIdx));
    });
    const sel = st.root.querySelector(`.tp-row[data-tp="${pageIdx}"]`);
    if (sel && sel.scrollIntoView) try { sel.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
  }

  if (st.hosted && st.hosted.idx !== pageIdx) returnHosted(st);
  const right = st.root.querySelector('.tp-right');
  if (!right) return;

  // 优先「移动栈页」路径（零脚本复制、零 ID 冲突）
  // v8.28 #53 勘正：单例主窗口形态无 .app-instance-wrapper 层（appWindow 直挂
  // stage），v7.51 的 wrapper 判定恒 null → 「移动而非复制」从未在主窗口生效，
  // 一直走 copy 注入兜底（内联脚本随 sync 高频重跑）。现改锚 .page-stack 容器：
  // 栈页在 pageStack 内即可移（分屏窗格无 pageStack 上下文仍走注入回退）。
  const pageEl = document.getElementById(`app-page-settings-${pageIdx}`);
  if (pageEl && pageEl.isConnected && pageEl.closest('.page-stack')) {
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
// v8.12 #71 修复：旧实现遍历 .tp-group（分组标题）——全库从未生成过该元素
//（早期分组结构被 renderSettingsListHTML() 扁平裸列表取代后 applySearch 未同步改造），
// forEach 空转 → 搜索完全失效。现直接遍历行：
//   · 命中域 = data-label（一级标题）+ data-keywords（二级项别名表，#71 可选增强）
//   · 空态：有关键字且零命中 → 「没有匹配的设置项」提示（DoD：不留空白）
//   · 清空/无关键字 → 全部恢复（tp-hit-none 全摘）
export function applySearch(st, q) {
  st.searchQ = q;
  const kw = (q || '').trim().toLowerCase();
  let any = false;
  st.root.querySelectorAll('.tp-row').forEach((r) => {
    const hay = ((r.dataset.label || '') + ' ' + (r.dataset.keywords || '')).toLowerCase();
    const hit = !kw || hay.includes(kw);
    r.classList.toggle('tp-hit-none', !hit);
    if (hit) any = true;
  });
  let empty = st.root.querySelector('.tp-search-empty');
  if (!empty) {
    empty = document.createElement('div');
    empty.className = 'tp-search-empty';
    empty.textContent = '没有匹配的设置项';
    empty.style.cssText =
      'display:none;padding:28px 20px;text-align:center;font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);';
    const left = st.root.querySelector('.tp-left');
    (left || st.root).appendChild(empty);
  }
  empty.style.display = (kw && !any) ? 'block' : 'none';
}

// ---------- 宽窄判定与切换 ----------
// v8.28 #53：栈上下文语义重做（A17 ActivityEmbedding 嵌入模式对齐）。
// 考证链（aosp-mirror main 实拉）——原「栈已推入即退窄」与原生大屏行为相反：
//   ① A17 设置大屏 = 双 Activity 嵌入（SettingsHomepageActivity 主页 + SubSettings
//      二级 Activity 右窗格），二级点入三级 = 右窗格 Activity 栈推进，**双栏保持**；
//   ② up（返回）按钮层级规则（SettingsActivity.setActionBarStatus →
//      SettingsLib shouldHideNavigateUpButton(activity, isSecondLayerPage)）：
//      非二层页（三级+）恒显 up；二层页仅嵌入时隐藏；非嵌入恒显。
//      → Web 映射：宽栏三级托管态 backBtn 显示（栈深>1 判定既有规则，page-stack
//      renderPageStack/updateNavHeader 已实现）；二级直展托管（栈根）隐藏 ✓ 自洽。
//   ③ SubSettings.onNavigateUp() = finish()——up 点击 = 右窗格弹出一级 =
//      Web 侧 popSubPage 弹栈 + 右栏重托管二级（本版新增 syncWithStack 通道）。
function evalWide(st) {
  const box = st.pageEl || st.root;
  if (!box || !box.isConnected) return;
  const inSettings = st.isStackCtx && state.currentApp && state.currentApp.id === 'settings';
  const depth = inSettings ? state.navHistory.length : 1;
  const wide = isWideEnough(box.clientWidth, box.clientHeight);
  if (inSettings && depth > 1 && wide) {
    // A17 嵌入语义：三级+ 保持双栏——右栏托管栈顶页（backBtn 由栈深判定显示）。
    // 仅当容器物理变窄才退窄（窄容器渲染页栈推入是既有正确路径）。
    if (!st.wide) {
      st.wide = true;
      st.root.classList.add('tp-wide');
      if (st.pageEl) st.pageEl.classList.add('tp-host-page');
      markContainerExempt(st);
    }
    syncWithStack(st);
    return;
  }
  if (inSettings && depth > 1 && !wide) {
    // 物理窄容器 + 栈已推入：退窄交页栈渲染（弹回栈根后 app-page-active → reEval 恢复）
    if (st.wide) {
      st.wide = false;
      st.root.classList.remove('tp-wide');
      if (st.pageEl) { st.pageEl.classList.remove('tp-host-page'); unmarkContainerExempt(st); }
      returnHosted(st);
    }
    return;
  }
  if (wide === st.wide) {
    // 宽栏下首次就绪（实例刚挂载 / 返回栈根）补默认选中；
    // 栈根且托管缺失（弹栈收敛后）由 syncWithStack 补托管
    if (wide) { markContainerExempt(st); syncWithStack(st); }
    if (wide && !st.selected && st.pages) open(st, DEFAULT_PAGE);
    return;
  }
  st.wide = wide;
  st.root.classList.toggle('tp-wide', wide);
  if (st.pageEl) {
    st.pageEl.classList.toggle('tp-host-page', wide);
    if (wide) markContainerExempt(st);
    else unmarkContainerExempt(st);
  }
  if (wide) {
    // ④ 进入设置的首屏：右栏默认打开「动画与动效」
    if (!st.selected) open(st, DEFAULT_PAGE);
    else open(st, st.selected); // 恢复上次选择（宽→窄→宽回归）
  } else {
    returnHosted(st);
  }
}

// ---------- v8.28 #53：页栈 ⇆ 宽栏托管 同步（syncWithStack） ----------
// 挂点：page-stack.js renderPageStack 末尾（push 推入 / pop 弹栈收敛 / 应用激活
// 统一入口）→ window.__settingsTwoPaneSync。职责：宽栏会话的 hosted 指向与
// navHistory 栈顶保持一致——
//   · 栈深>1（三级+）：托管栈顶页（二级页内 pushSubPage 推入 → 右栏切三级页，
//     与 A17 右窗格 Activity 栈推进同构）
//   · 栈根（二级直展）：重托管左栏高亮行对应页（用户所择二级页真源；
//     popSubPage 弹栈收敛后右栏回二级，SubSettings.onNavigateUp=finish 的 Web 等价）
function syncWithStack(st) {
  if (!st.wide || !st.isStackCtx || !st.pages) return;
  if (!(state.currentApp && state.currentApp.id === 'settings')) return;
  const depth = state.navHistory.length;
  if (depth > 1) {
    const topIdx = state.navHistory[depth - 1];
    if (!st.hosted || st.hosted.idx !== topIdx) open(st, topIdx, { sync: true });
  } else {
    // 栈根：托管目标 = 左栏高亮行（用户所择二级页真源）——
    // sync 路径不写 selected（防三级污染），故不能拿 selected 与 hosted 比对
    const selRow = st.root.querySelector('.tp-row.tp-sel[data-tp]');
    const wantIdx = selRow ? parseInt(selRow.dataset.tp, 10) : st.selected;
    if (wantIdx != null && (!st.hosted || st.hosted.idx !== wantIdx)) {
      open(st, wantIdx, { sync: true });
    }
  }
}

function syncAllSessions() {
  sessions.forEach((st) => { syncWithStack(st); });
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
    borrowed: null, // v8.28 #53：横滑手势借入的 prev 页（右栏下层视觉）
    selected: null,
    searchQ: '',
    pages: APP_PAGES,
    ro: null,
  };
  sessions.set(sid, st);
  installSwipeBack(st); // v8.28 #53：右栏横滑返回手势（PagedView 判定基准）

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
  // v8.28 #53：页栈 ⇆ 宽栏托管同步桥（page-stack renderPageStack 末尾调用）
  window.__settingsTwoPaneSync = syncAllSessions;
  // v8.28 #53：宽栏托管态的「视觉下层页」探测（app-window renderSubPages 返回动画
  // 用——二级页不压栈，栈深度≠视觉层级；返回 null = 不接管走原栈语义）
  window.__tpVisualPrevIdx = function () {
    let cur = null;
    sessions.forEach((st) => { if (st.wide && st.isStackCtx) cur = st; });
    if (!cur || !cur.hosted) return null;
    if (!(state.currentApp && state.currentApp.id === 'settings')) return null;
    const depth = state.navHistory.length;
    if (depth <= 1) return null; // 栈根无返回动画
    if (cur.borrowed) return cur.borrowed.idx; // 手势期：借入页即视觉下层
    if (depth > 2) return state.navHistory[depth - 2];
    const selRow = cur.root.querySelector('.tp-row.tp-sel[data-tp]');
    return selRow ? parseInt(selRow.dataset.tp, 10) : null;
  };
}

// ---------- 由 settings.js 注册页面定义（供右栏注入回退路径取 content） ----------
// 模块求值期注册（早于任何实例挂载）→ 存模块级变量，mount() 时带给新会话
let APP_PAGES = null;
export function setPages(pages) {
  APP_PAGES = pages;
  sessions.forEach((st) => { st.pages = pages; });
}

// 导出内部函数便于测试
// v7.99 修复：移除 GROUPS as TP_GROUPS —— v7.98 清单重建删除了旧分组卡数据 GROUPS，
// 但导出语句残留引用 → 模块链接期 SyntaxError（Export 'GROUPS' is not defined），
// 浏览器整条 settings 模块图瘫痪（vitest 文本断言无法覆盖，e2e 实测抓获）
export { mount as mountTwoPane, tpNav as twoPaneNav, open as openPane, evalWide as evalPaneWidth, sessions as paneSessions, WIDE_THRESHOLD as TP_WIDE_THRESHOLD, DEFAULT_PAGE as TP_DEFAULT_PAGE };
