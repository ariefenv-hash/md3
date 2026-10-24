// ==================== v765-recents-qs-noti.test.js — 后台只模糊背景 / 经典平铺 / QS 圆角+挤压 / 包应用通知图标 ====================
//
// 用户实测四连：
//   ① 前台卡片退后台时被整体模糊进去了 —— 真实 Android 全程不对卡片做模糊，只模糊背景。
//      根因 A：flyAppToCard 只抬窗口自身 z=760，但 .stage（isolation:isolate, z 500）
//      层叠上下文内 z 再高也越不出舞台 → 卡片全程被 .recent-apps-overlay（z 750,
//      backdrop-filter: blur(36px)）采样模糊。根因 B：updateCardsTransform 给
//      absDelta>0.45 的侧卡写 blur。修复：飞行/展开期抬整个舞台 z=760 + 卡片零 blur。
//   ② 设置内新增传统安卓「经典平铺」后台样式（desktop-prefs.recentsStyle）。
//   ③ QS 磁贴开/关某帧突跳直角 —— 旧 border-radius transition 用过冲贝塞尔
//      (0.34,1.45,0.64,1) 插值 9999px→18px，过冲段插值为负半径（CSS 钳 0）；
//      挤压语义=开关打开后磁贴体积膨胀+同排邻贴被压窄（qs-grow/qs-squeeze 持久态）。
//   ④ 安装包应用发通知：状态栏不出图标（hasAppIcon 不查 DYNAMIC_ICONS + img 无尺寸）
//      通知中心图标不是应用内置图标（同根因）。

import { describe, test, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

// ---------- A. 源码锚定 ----------

describe('v7.65 · 后台只模糊背景（recent-apps.js / app-window.js）', () => {
  const js = src('ios-desktop/js/recent-apps.js');
  const aw = src('ios-desktop/js/app-window.js');

  test('卡片零模糊：blur 写入路径移除，历史残留 filter 一次性清空', () => {
    // 旧的量化 blur 桶不再存在
    expect(js).not.toContain("card.style.filter = blurBucket > 0.2");
    expect(js).not.toContain('const blurPx = Math.max(0, (absDelta - 0.45) * 2.5)');
    // 清残留通道：cache.blur !== 0 → 写 none（幂等，首帧后零写入）
    expect(js).toContain("if (cache.blur !== 0) {\n      card.style.filter = 'none';\n      cache.blur = 0;\n    }");
  });

  test('经典平铺：layoutCardTransform classic 分支无 rotateY/translateZ/缩放衰减，全程不透明（v7.67 演进：统一布局引擎）', () => {
    // v7.67：位姿计算收口到 layoutCardTransform 三分支（carousel/classic/tablet 单一真源）
    expect(js).toContain('if (isClassicRecents()) {');
    expect(js).toContain('transform: `translate3d(${x.toFixed(1)}px, 0px, 0px) scale(1)`');
    // carousel 分支保留景深/侧转/衰减（层级感由缩放/透明度承担）
    expect(js).toContain('const scale = Math.max(0.74, 1 - 0.11 * absDelta);');
    expect(js).toContain('opacity: clamp(1 - 0.2 * absDelta, 0.38, 1.0).toFixed(2),');
    // deck 类同步 + 偏好实时切换监听
    expect(js).toContain('applyDeckStyleClass(); // v7.65：经典平铺/3D 轮播 deck 类同步（偏好变更监听兜底）');
    expect(js).toContain("window.addEventListener('desktop-prefs-changed', (e) => {");
    expect(js).toContain("e.detail.key !== 'recentsStyle'") || expect(js).toContain("e.detail.key !== 'recentsStyle';");
  });

  test('flyAppToCard 抬舞台：isolation:isolate 越不出层叠上下文的根修（落地回落 + 接管回落）', () => {
    expect(aw).toContain('state.stageRaisedForFlight = true;');
    expect(aw).toContain("const stageEl = document.getElementById('stage');\n  if (stageEl) stageEl.style.zIndex = '760';");
    // 落地分支回落
    expect(aw).toContain('state.stageRaisedForFlight = false;');
    // startLoop 接管分支回落
    expect(aw).toContain('// v7.65：飞行被渲染循环接管（开窗承接/关闭归巢）→ 同步回落飞行期抬高的舞台 z');
  });

  test('卡片展开全屏同抬舞台：launchAppDirectFromCard 展开期不被 overlay 淡出模糊采样', () => {
    expect(js).toContain("const stageForLaunch = document.getElementById('stage');\n  if (stageForLaunch) stageForLaunch.style.zIndex = '760';");
    // overlay 淡出完成后回落（520ms > 350ms 过渡）
    expect(js).toContain('after(520, () => {');
    expect(js).toContain("const st = document.getElementById('stage');\n      if (st) st.style.zIndex = '';");
  });
});

describe('v7.65 · 后台样式偏好（desktop-prefs.js + settings.js）', () => {
  const prefs = src('ios-desktop/js/desktop-prefs.js');
  const settings = src('ios-desktop/js/apps/settings.js');

  test('recentsStyle 档位：carousel/classic/tablet 白名单 + 默认 carousel + 持久化校验', () => {
    expect(prefs).toContain("export const RECENTS_STYLE_CHOICES = ['carousel', 'classic', 'tablet'];");
    expect(prefs).toContain("recentsStyle: 'carousel',");
    expect(prefs).toContain("if (RECENTS_STYLE_CHOICES.indexOf(p.recentsStyle) !== -1) out.recentsStyle = p.recentsStyle;");
    expect(prefs).toContain("case 'recentsStyle':\n      if (RECENTS_STYLE_CHOICES.indexOf(value) === -1) return false;");
  });

  test('设置页「后台多任务」卡片：布局 chips + 字符串档位不经 parseInt', () => {
    expect(settings).toContain('id="dpRecentsStyleChips"');
    expect(settings).toContain("chipHTML('recentsStyle', 'carousel', p.recentsStyle, '3D 轮播（默认）')");
    expect(settings).toContain("chipHTML('recentsStyle', 'classic', p.recentsStyle, '经典平铺')");
    expect(settings).toContain("if (g === 'recentsStyle') val = v;");
  });
});

describe('v7.65 · QS 圆角修复 + 挤压变形（pull-panels.css / quick-settings.js）', () => {
  const css = src('ios-desktop/css/pull-panels.css');
  const qs = src('ios-desktop/js/quick-settings.js');

  test('v7.82 源码重做：morph/blob 关键帧全退役，圆角/颜色 = 同步 spring（CSS 320ms standard）', () => {
    expect(css).not.toContain('border-radius 0.32s cubic-bezier(0.34, 1.45, 0.64, 1),');
    // 视频 blob 体系全退役（源码 spring(1.0,400) 单调无过冲）
    expect(css).not.toContain('@keyframes qs-tile-squish-on');
    expect(css).not.toContain('@keyframes qs-tile-squish-off');
    expect(css).not.toContain('@keyframes qs-icon-morph-on');
    expect(css).not.toContain('@keyframes qs-icon-morph-off');
    expect(css).not.toContain('45%  { transform: scale(1.09); opacity: 1;');
    // 两态圆角：源码常量 50dp→32px（封顶全胶囊）/24dp→24px，320ms standard 表达 spring
    expect(css).toContain('--tile-r-off: 50px;');
    expect(css).toContain('--tile-r-on: 24px;');
    expect(css).toContain('border-radius 0.32s cubic-bezier(0.2, 0, 0, 1),');
  });

  test('v7.79 grow/squeeze 持久态删除（磁贴溢出截断+归位拥挤的根因），按压改轻收缩', () => {
    expect(css).not.toContain('.qs-tile-pill.qs-grow');
    expect(css).not.toContain('.qs-tile-pill.qs-squeeze');
    // v7.93：scale(0.985) 退役 → Bounceable 容器联动（源码按压无 scale）
    expect(css).not.toContain('.qs-tile-pill:active {\n  transform: scale(0.985);\n}');
    expect(src('ios-desktop/js/tile-bounce.js')).toContain('BOUNCE_SIZE');
  });

  test('v7.82 morph JS 体系退役：playTileMorph/QS_MORPH_MS 全部移除（动画由 CSS transition 承担）', () => {
    expect(qs).not.toContain('syncRowSqueezeClasses');
    expect(qs).not.toContain('playTileMorph');
    expect(qs).not.toContain('QS_MORPH_MS');
  });
});

describe('v7.65 · 包应用通知图标（app-icons.js / notifications.js / pull-panels.css）', () => {
  const icons = src('ios-desktop/js/app-icons.js');
  const noti = src('ios-desktop/js/notifications.js');
  const css = src('ios-desktop/css/pull-panels.css');

  test('hasAppIcon 检查动态图标注册表（pkg-registry 注册通道）', () => {
    expect(icons).toContain('return !!APP_ICONS[appId] || DYNAMIC_ICONS.has(appId);');
  });

  test('isSafeIconSvg 放行安全 dataURL <img> 载荷（pkg-icon 位图管线），仍拒脚本/事件属性/外链', () => {
    expect(noti).toContain("if (svg.indexOf('<img') === 0) {");
    expect(noti).toContain('/src\\s*=\\s*["\']data:image\\//');
    // 外链 src 仍被拒（只允许 data:image/）
    expect(noti).not.toContain("svg.indexOf('http')");
  });

  test('状态栏/通知中心 img 图标尺寸钳制（pkg 位图图标不吃 svg 选择器 → 塔缩不可见）', () => {
    expect(css).toContain('.status-noti-icons img,\n.noti-st-icon img {\n  width: 14px;');
  });
});

// ---------- B. 场景运行时（真实引导） ----------
// 求值顺序守卫：state.js 必须先于 apps-data/quick-settings 完成求值（依赖环）
import '../ios-desktop/js/state.js';

describe('v7.65 · 运行时（bootDesktop）', () => {
  let sleep;

  beforeEach(async () => {
    const helpers = await import('./scenario-helpers.js');
    sleep = helpers.sleep;
    if (!document.body.dataset.__v765Booted) {
      document.body.innerHTML = helpers.buildShellHTML();
      helpers.setScreenSize();
      helpers.installCanvasStub();
      helpers.installFetchStub();
      document.body.dataset.__v765Booted = '1';
      await import('../ios-desktop/js/main.js');
    }
  });

  test('hasAppIcon / getAppIconSVG 覆盖动态注册图标；未注册回退默认', async () => {
    const m = await import('../ios-desktop/js/app-icons.js');
    expect(m.hasAppIcon('msg')).toBe(true); // 内置静态表
    expect(m.hasAppIcon('pkg-nonexistent')).toBe(false);
    m.registerAppIcon('pkg-test-app', '<svg viewBox="0 0 100 100" width="100%" height="100%"><rect width="100" height="100" rx="24" fill="#123"/></svg>');
    expect(m.hasAppIcon('pkg-test-app')).toBe(true);
    expect(m.getAppIconSVG('pkg-test-app')).toContain('<rect width="100" height="100" rx="24" fill="#123"/>');
    m.unregisterAppIcon('pkg-test-app');
    expect(m.hasAppIcon('pkg-test-app')).toBe(false);
  });

  test('resolveNotiIcon 优先包应用本体图标（注册后即使 iconSvg 缺失/不安全也取本体）', async () => {
    const icons = await import('../ios-desktop/js/app-icons.js');
    const noti = await import('../ios-desktop/js/notifications.js');
    const html = '<svg viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="40" fill="#456"/></svg>';
    icons.registerAppIcon('pkg-noti-app', html);
    const item = { appId: 'pkg-noti-app', iconSvg: '' };
    expect(noti.resolveNotiIcon(item)).toBe(html);
    expect(noti.isRealAppIcon(item)).toBe(true);
    icons.unregisterAppIcon('pkg-noti-app');
  });

  test('图标载荷双保险：isSafeIconSvg 放行 dataURL img / 拒 on* 与外链；渲染时拒收不安全载荷', async () => {
    const { isSafeIconSvg, addSystemNotification, getNotifications, resolveNotiIcon } = await import('../ios-desktop/js/notifications.js');
    // 安心位图（pkg-icon 位图管线同构）
    const imgPayload = '<img src="data:image/png;base64,iVBORw0KGgo=" alt="" style="width:100%">';
    expect(isSafeIconSvg(imgPayload)).toBe(true);
    // 事件属性 / 外链 src / script 段全部拒收
    expect(isSafeIconSvg('<img src="data:image/png;base64,AA==" onload="alert(1)">')).toBe(false);
    expect(isSafeIconSvg('<img src="https://evil.example/x.png">')).toBe(false);
    expect(isSafeIconSvg('<svg onload="alert(1)"></svg>')).toBe(false);
    expect(isSafeIconSvg('<svg><script>alert(1)</script></svg>')).toBe(false);
    // 存储不筛（内部 API 信任面），渲染时兜底拒收
    addSystemNotification({ id: 'v765-evil-noti', app: '恶意载荷', appId: '', iconSvg: '<img src="data:image/png;base64,AA==" onload="alert(1)">', title: '注入尝试', desc: 'd', time: '刚刚' });
    const evil = getNotifications().find((n) => n.id === 'v765-evil-noti');
    expect(resolveNotiIcon(evil)).not.toContain('onload');
    expect(resolveNotiIcon(evil).indexOf('<svg')).toBe(0); // 回退通用系统图标
  });

  test('v7.82 两态 spring：真实点击开启磁贴 → .active 挂上（无 morph 类，动画由 CSS 承担）', async () => {
    const container = document.getElementById('qsTilesContainer');
    expect(container).toBeTruthy();
    const torch = container.querySelector('.qs-tile-pill[data-tile-id="torch"]');
    expect(torch).toBeTruthy();
    torch.click();
    await sleep(30);
    expect(torch.classList.contains('active')).toBe(true);
    // v7.82：无 morph 类（blob 体系退役），也无 grow/squeeze 持久类
    expect(torch.classList.contains('morph-on')).toBe(false);
    expect(torch.classList.contains('qs-grow')).toBe(false);
    expect(torch.classList.contains('qs-squeeze')).toBe(false);
    // 关闭 → .active 摘除，同样无持久挤压类（归位 = 回到与初始完全相同的几何）
    torch.click();
    await sleep(30);
    expect(torch.classList.contains('active')).toBe(false);
    expect(torch.classList.contains('morph-off')).toBe(false);
    expect(torch.classList.contains('qs-grow')).toBe(false);
    expect(torch.classList.contains('qs-squeeze')).toBe(false);
  });

  test('recentsStyle 偏好：非法档位拒绝 / 合法档位持久化 + 广播', async () => {
    const P = await import('../ios-desktop/js/desktop-prefs.js');
    expect(P.setDesktopPref('recentsStyle', 'garbage')).toBe(false);
    expect(P.setDesktopPref('recentsStyle', 'classic')).toBe(true);
    expect(P.getDesktopPrefs().recentsStyle).toBe('classic');
    expect(JSON.parse(localStorage.getItem('ios-desktop:desktop-prefs')).recentsStyle).toBe('classic');
    P.setDesktopPref('recentsStyle', 'carousel');
    expect(P.getDesktopPrefs().recentsStyle).toBe('carousel');
  });

  test('经典平铺运行时：classic 档位下卡片 transform 无 rotateY / 无 blur / 不透明', async () => {
    const helpers = await import('./scenario-helpers.js');
    void helpers;
    const P = await import('../ios-desktop/js/desktop-prefs.js');
    const recent = await import('../ios-desktop/js/recent-apps.js');
    P.setDesktopPref('recentsStyle', 'classic', { silent: true });
    window.__openRecentApps();
    await sleep(120);
    const deck = document.getElementById('recentCardsDeck');
    expect(deck.classList.contains('deck-classic')).toBe(true);
    const cards = Array.from(deck.querySelectorAll('.recent-app-card'));
    expect(cards.length).toBeGreaterThan(1);
    const nonFocus = cards[1];
    expect(nonFocus.style.transform).not.toContain('rotateY');
    expect(nonFocus.style.transform).not.toContain('scale(0.7');
    expect(nonFocus.style.opacity).toBe('1');
    expect(nonFocus.style.filter).toBe('none');
    // 焦点卡同样零模糊
    expect(cards[0].style.filter).toBe('none');
    recent.closeRecentApps({ resumeSuspended: false });
    P.setDesktopPref('recentsStyle', 'carousel', { silent: true });
  });

  test('3D 轮播运行时：carousel 档位下焦点卡零 blur、邻卡无 blur 写入（只保留透明度/缩放层级）', async () => {
    const recent = await import('../ios-desktop/js/recent-apps.js');
    window.__openRecentApps();
    await sleep(120);
    const deck = document.getElementById('recentCardsDeck');
    expect(deck.classList.contains('deck-classic')).toBe(false);
    const cards = Array.from(deck.querySelectorAll('.recent-app-card'));
    cards.forEach((c) => expect(c.style.filter).toBe('none'));
    recent.closeRecentApps({ resumeSuspended: false });
  });
});
