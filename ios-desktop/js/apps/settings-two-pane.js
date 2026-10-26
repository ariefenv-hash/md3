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
import { reactivateScripts } from '../page-stack.js';
import { dom } from '../dom.js';
import { state } from '../state.js';

// 双栏触发阈值：容器内容宽度 ≥ 620px 视为宽格局（分屏宽格 / 平板 / 横屏均满足）
const WIDE_THRESHOLD = 620;
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
//   ⑥ communal（共用）受 CommunalPreferenceController 可用性门控（手机形态默认隐藏），
//      以 hidden:true 保留门控语义，渲染层跳过；sub 为空串 = 源码无默认摘要，忠实呈现
const STUB_IDX = 16; // 未对齐子页面的过渡占位页（settings.js pages 末尾；v7.99 网络子页转正页 17、v8.00 已连接的设备转正页 18、v8.01 通知转正页 19、v8.02 无障碍转正页 20、v8.26 关于手机转正页 21，剩余 6 项仍占位）

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
  { key: 'modes', icon: 'topModes', plate: 'pink', label: '模式', sub: '', idx: STUB_IDX, kw: '场景 模式切换' },
  { key: 'battery', icon: 'topBattery', plate: 'green', label: '电池', sub: '', hintId: 'settingsMainBatteryPct', idx: 2, kw: '省电 充电 电量 百分比 电池管理' },
  { key: 'storage', icon: 'topStorage', plate: 'yellow', label: '存储空间', sub: '', subId: 'settingsStorageSub', idx: 7, kw: '存储 内存 文件 释放空间 回收站' },
  { key: 'sound', icon: 'topSound', plate: 'pink', label: '提示音和振动', sub: '音量、振动、勿扰', idx: 4, kw: '音量 铃声 静音 勿扰 触摸提示音 闹钟 媒体' },
  { key: 'display', icon: 'topDisplay', plate: 'orange', label: '显示', sub: '亮度、深色主题、自动锁屏', idx: 1, kw: '亮度 深色 dark 夜览 自动锁屏 字体 自动旋转 息屏' },
  { key: 'wallpaper', icon: 'topWallpaper', plate: 'orange', label: '壁纸', sub: '主屏幕、锁定屏幕', idx: 13, kw: '动态壁纸 壁纸样式 实时模糊 选择壁纸' },
  { key: 'accessibility', icon: 'topAccessibility', plate: 'purple', label: '无障碍功能', sub: '显示、互动、音频', idx: 20, kw: '放大 色彩矫正 朗读 字幕 互动' },
  { key: 'safety', icon: 'topSafety', plate: 'red', label: '安全和隐私', sub: '应用安全性、设备锁定、权限', idx: STUB_IDX, kw: '紧急求救 医疗信息 警报' },
  { key: 'security', icon: 'topSecurity', plate: 'cyan', label: '安全', sub: '屏幕锁定、查找我的设备、应用安全性', idx: STUB_IDX, kw: '锁屏 指纹 人脸 解锁 查找设备' },
  { key: 'privacy', icon: 'topPrivacy', plate: 'cyan', label: '隐私', sub: '权限、账号活动、个人数据', idx: 5, kw: '权限管理 个人数据 隐私面板' },
  { key: 'location', icon: 'topLocation', plate: 'cyan', label: '位置信息', sub: '应用位置权限', idx: STUB_IDX, kw: 'gps 定位 位置权限' },
  { key: 'emergency', icon: 'topEmergency', plate: 'red', label: '安全和紧急情况', sub: '紧急求救、医疗信息、警报', idx: STUB_IDX, kw: '求救 医疗 警报 地震' },
  { key: 'accounts', icon: 'topAccounts', plate: 'cyan', label: '密码、通行密钥和账号', sub: '', idx: STUB_IDX, kw: '账号 登录 同步 通行密钥' },
  { key: 'system', icon: 'topSystem', plate: 'grey', label: '系统', sub: '语言、手势、时间、备份', idx: 15, kw: '语言输入 手势 时间 备份 重置 系统更新 开发者选项' },
  { key: 'about', icon: 'topAbout', plate: 'grey', label: '关于手机', sub: '', idx: 21, kw: '版本 设备名称 状态信息 android 版本' },
  { key: 'support', icon: 'topSupport', plate: 'purple', label: '提示和支持', sub: '', idx: STUB_IDX, kw: '帮助 反馈 支持' },
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
// v7.99 修复：移除 GROUPS as TP_GROUPS —— v7.98 清单重建删除了旧分组卡数据 GROUPS，
// 但导出语句残留引用 → 模块链接期 SyntaxError（Export 'GROUPS' is not defined），
// 浏览器整条 settings 模块图瘫痪（vitest 文本断言无法覆盖，e2e 实测抓获）
export { mount as mountTwoPane, tpNav as twoPaneNav, open as openPane, evalWide as evalPaneWidth, sessions as paneSessions, WIDE_THRESHOLD as TP_WIDE_THRESHOLD, DEFAULT_PAGE as TP_DEFAULT_PAGE };
