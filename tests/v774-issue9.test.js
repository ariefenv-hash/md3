// ==================== v7.74 — issue #9 实施锚定测试 ====================
// 覆盖：① 设置「检查更新」图标语义升级 + 图标库尺寸兜底归一
//       ② QS 磁贴图标真挤压（轴向 squash&stretch 替代均匀 pop）
//       ③ 天气静默重定位（手动选城锁定 + GPS 超时放宽 + 双 IP 通道）
//       ④ M3E LoadingIndicator 对齐官方常数（650ms/4666ms/spring）
//       ⑤ 充电涟漪（SystemUI 1:1 移植 → battery-service 充电沿触发）
//       ⑥ 信息应用 MQTT 联机房间（vendor 库 + 房间码 + 离线队列 + 加载组件融合）
//       ⑦ 小窗两处验收遗留修复（幽灵实例兜底 + z 域归一化）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(root, p), 'utf-8');

describe('v7.74 · A 设置更新图标（issue #9 矢量图修复）', () => {
  const iconsJs = read('ios-desktop/js/icons.js');
  const settingsJs = read('ios-desktop/js/apps/settings.js');

  it('新增 system_update 语义图标（托盘+上箭头，Material 官方路径）', () => {
    expect(iconsJs).toContain('system_update:');
    expect(iconsJs).toContain('M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z');
  });

  it('sync 图标回归官方规范路径（内弧端点 4,12 + l-1.46-1.46 内凹箭槽）', () => {
    expect(iconsJs).toContain('.7-2.8l-1.46-1.46C4.46 8.97 4 10.43 4 12');
    // 旧手工变体（端点 4,10 + 错误箭槽）必须退役
    expect(iconsJs).not.toContain('L5.24 5.74C4.46 6.97 4 8.43 4 10');
  });

  it('「检查更新」行改用 system_update 图标', () => {
    const idxSystem = settingsJs.indexOf('id="devCheckUpdateBtn"');
    expect(idxSystem).toBeGreaterThan(-1);
    const seg = settingsJs.slice(idxSystem, idxSystem + 200);
    expect(seg).toContain('ICONS.system_update');
    expect(seg).not.toContain('ICONS.sync');
  });

  it('图标库尺寸兜底归一：缺 width/height 的 SVG 注入 24×24 内在默认值', () => {
    expect(iconsJs).toContain('normalizeIconSize');
    expect(iconsJs).toContain("svg.replace('<svg', '<svg width=\"24\" height=\"24\"')");
  });
});

describe('v7.74 · B QS 磁贴图标动效（v7.79 演进：轴向 squash → 圆↔方圆角 morph）', () => {
  const css = read('ios-desktop/css/pull-panels.css');

  it('v7.82 源码重做：旧轴向/blob morph 关键帧全退役（两态 = spring 体系）', () => {
    expect(css).not.toContain('@keyframes qs-icon-squish-on {');
    expect(css).not.toContain('@keyframes qs-icon-squish-off {');
    expect(css).not.toContain('@keyframes qs-icon-morph-on {');
    expect(css).not.toContain('@keyframes qs-icon-morph-off {');
    expect(css).not.toContain('45%  { transform: scale(1.09); opacity: 1;');
    expect(css).not.toContain('72%  { transform: scale(0.985);');
  });

  it('磁贴本体 squish 关键帧退役（v7.80→v7.82 演进：blob 双通道 → 两态 spring）', () => {
    expect(css).not.toContain('38%  { transform: scale(1.07, 0.9);');
    expect(css).not.toContain('animation: qs-tile-squish-on 380ms both;');
    expect(css).not.toContain('animation: qs-tile-squish-off 300ms both;');
    expect(css).not.toContain('.qs-tile-pill.morph-on[data-tile-id="bluetooth"] .qs-tile-icon-wrap,');
    expect(css).not.toContain('.qs-tile-pill.morph-on:not([data-tile-id="bluetooth"]):not([data-tile-id="modes"]) { animation: qs-body-morph-on 320ms both; }');
  });

  it('均匀放大版 pop 已退役', () => {
    expect(css).not.toContain('@keyframes qs-icon-pop-on {');
    expect(css).not.toContain('scale(1.16)');
  });
});

describe('v7.74 · C 天气定位即时性修复', () => {
  const weatherHtml = read('ios-desktop/apps/weather/index.html');

  it('GPS 超时 3s→8s 并带 maximumAge（冷启动首修不再半途而废）', () => {
    expect(weatherHtml).toContain("reject(new Error('GPS Timeout')), 8000)");
    expect(weatherHtml).toContain('maximumAge: 60000');
    expect(weatherHtml).not.toContain("reject(new Error('GPS Timeout')), 3000)");
  });

  it('静默重定位：silent 模式 + 手动选城锁定（src 标记）', () => {
    expect(weatherHtml).toContain('detectPreciseLocation({ silent: true })');
    expect(weatherHtml).toContain("currentLoc.src === 'manual'");
    expect(weatherHtml).toContain("saveLoc('manual')");
    expect(weatherHtml).toContain("currentLoc = { name: c.name, lat: c.lat, lon: c.lon, src: 'manual' }");
  });

  it('IP 双通道降级（ipapi.co → ipwho.is）', () => {
    expect(weatherHtml).toContain("fetch('https://ipapi.co/json/')");
    expect(weatherHtml).toContain("fetch('https://ipwho.is/')");
  });

  it('APP_CLOSE 清理静默重定位调度（超时器 + 周期器）', () => {
    expect(weatherHtml).toContain('clearTimeout(__relocTimeout)');
    expect(weatherHtml).toContain('clearInterval(__relocPeriodic)');
  });
});

describe('v7.74 · D M3E LoadingIndicator 对齐官方常数', () => {
  it('宿主引擎：650ms MorphInterval + 4666ms 全局旋转 + spring(0.6,200)', async () => {
    const m3e = await import('../ios-desktop/js/m3e.js');
    expect(m3e.M3E_LOADER_SEGMENT_MS).toBe(650);
    expect(m3e.M3E_GLOBAL_ROTATION_MS).toBe(4666);
    expect(m3e.M3E_LOADER_SHAPES).toHaveLength(7);
    // spring 解析解：tau=0 → 0；远超 t_hold → 1；中段大幅推进
    //（阻尼比 0.6 为欠阻尼 —— 中段允许过冲 >1，官方同款行为，插值外推即果冻感）
    expect(m3e.m3eSpringProgress(0)).toBe(0);
    expect(m3e.m3eSpringProgress(10)).toBe(1);
    const mid = m3e.m3eSpringProgress(0.2);
    expect(mid).toBeGreaterThan(0.5);
  });

  it('官方旋转公式逐字落地（prog×90° + 段序累计 90° + 全局线性）', () => {
    const m3eJs = read('ios-desktop/js/m3e.js');
    expect(m3eJs).toContain('const rotDeg = mt * 90');
    expect(m3eJs).toContain("(dt / M3E_GLOBAL_ROTATION_MS * 360) % 360");
    // 同步首帧 + rAF 看门狗（参考件 2.html 特性）
    expect(m3eJs).toContain('drawFrame(t0)');
    expect(m3eJs).toContain('now - lastRender > 250');
  });

  it('iframe 内嵌引擎与宿主保持几何管线同构（v7.75 忠实源文件版：常数/顶点表/看门狗同步演进）', () => {
    const mini = read('ios-desktop/apps/translate/m3e-mini.js');
    // 官方常数（源文件逐字命名）
    expect(mini).toContain('var MorphIntervalMillis = 650;');
    expect(mini).toContain('var GlobalRotationDurationMillis = 4666;');
    expect(mini).toContain('var SpringStiffness = 200, SpringDamping = 0.6;');
    // 弧长重采样 M=256 + 全局旋转 360° 线性
    expect(mini).toContain('var M = 256;');
    expect(mini).toContain('FullRotation = 360');
    // 同步首帧 + rAF 看门狗（参考件 2.html 特性，100ms 巡检 / 250ms 停滞补帧）
    expect(mini).toContain('now - lastRender > 250');
  });
});

describe('v7.74 · E 充电涟漪（SystemUI 1:1 移植集成）', () => {
  const ripple = read('ios-desktop/js/charging-ripple.js');
  const battery = read('ios-desktop/js/battery-service.js');
  const mainJs = read('ios-desktop/js/main.js');

  it('官方常数落地：1750ms / alpha 115/255 / STANDARD(0.2,0,0,1) / 涟漪起点随横竖屏解析（v7.80 升级）', () => {
    expect(ripple).toContain('const DURATION = 1750;');
    expect(ripple).toContain('const RIPPLE_ALPHA = 115 / 255;');
    expect(ripple).toContain('const CX1 = 0.2, CY1 = 0, CX2 = 0, CY2 = 1;');
    // v7.80：起点硬编码底部中央 → resolveOrigin 配置化（竖屏 bc/br/cc，横屏 lc/rc）
    expect(ripple).toContain('resolveOrigin(cfg, canvas.width, canvas.height)');
    expect(ripple).toContain('bc: [0.5, 1.0], br: [0.82, 1.0], cc: [0.5, 0.5]');
    expect(ripple).toContain('lc: [0.0, 0.5], rc: [1.0, 0.5]');
  });

  it('GLSL ES 3.00 着色器逐字移植（RippleShader CIRCLE）', () => {
    expect(ripple).toContain('#version 300 es');
    expect(ripple).toContain('float triangleNoise(vec2 n)');
    expect(ripple).toContain('in_distort_radial');
    expect(ripple).toContain('gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)');
  });

  it('纪律：reduced-motion 不播 / 隐藏不播 / 防抖退避 2s×2^level（v7.80 升级） / 播放完自回收', () => {
    expect(ripple).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
    expect(ripple).toContain('document.hidden');
    expect(ripple).toContain('const interval = 2000 * Math.pow(2, Math.min(debounceLevel, 3));');
    expect(ripple).toContain('canvas.remove()');
  });

  it('battery-service 充电沿事件（赋值前采样旧值 + 真实/模拟共用漏斗）', () => {
    expect(battery).toContain('const chargingJustStarted = nextCharging && !batteryState.charging;');
    expect(battery).toContain("document.dispatchEvent(new CustomEvent('battery-charging-started'");
  });

  it('main.js 装配充电涟漪模块', () => {
    expect(mainJs).toContain("import { initChargingRipple } from './charging-ripple.js'");
    expect(mainJs).toContain('initChargingRipple();');
  });
});

describe('v7.74 · F 信息应用 MQTT 联机房间', () => {
  const appHtml = read('ios-desktop/apps/messages/index.html');

  it('vendor 库本地化（零 CDN）+ m3e-mini 加载组件就位', () => {
    expect(appHtml).toContain('<script src="mqtt.min.js"></script>');
    expect(appHtml).toContain('<script src="m3e-mini.js"></script>');
    const mqtt = read('ios-desktop/apps/messages/mqtt.min.js');
    expect(mqtt.length).toBeGreaterThan(200000); // mqtt 5.x 完整浏览器包
    expect(read('ios-desktop/apps/messages/m3e-mini.js')).toContain('__m3eMini');
  });

  it('房间码 = SHA-256 派生 12 位十六进制（口令不落盘）', () => {
    expect(appHtml).toContain("crypto.subtle.digest('SHA-256'");
    expect(appHtml).toContain("slice(0, 12)");
  });

  it('MQTT 连接管理：公共代理 + 自动重连 + 离线队列补发', () => {
    expect(appHtml).toContain("mqtt.connect(MQTT_BROKER, {");
    expect(appHtml).toContain('reconnectPeriod: 3000');
    expect(appHtml).toContain('offlineQueue.push({ hash, packet })');
    expect(appHtml).toContain('function flushOfflineQueue()');
  });

  it('加载组件融合：连接/重连期间挂载 m3e 七形指示器', () => {
    expect(appHtml).toContain("window.__m3eMini.mount(slot, { size: 16 })");
    expect(appHtml).toContain("window.__m3eMini.stop(slot.__m3eInst)");
  });

  it('路由守卫：room: 前缀分流发送/清空/删除，本地树洞零破坏', () => {
    expect(appHtml).toContain("currentChatId.startsWith('room:')) { sendRoomMessage(); return; }");
    expect(appHtml).toContain("const hash = currentChatId.slice(5);");
  });

  it('APP_CLOSE 断开 MQTT + 摘除加载器（iframe 生命周期纪律）', () => {
    expect(appHtml).toContain('mqttClient.end(true)');
  });

  it('XSS 纪律：房间列表与房间消息全部经 escapeHtml 渲染', () => {
    expect(appHtml).toContain('${escapeHtml(r.name)}');
    expect(appHtml).toContain('${escapeHtml(msg.text)}');
    expect(appHtml).toContain('${escapeHtml(msg.sender.name)}');
  });
});

describe('v7.74 · G 小窗验收遗留修复（issue #8 收尾）', () => {
  const mini = read('ios-desktop/js/mini-window.js');

  it('接管等待期关闭：撤销 pendingTakeovers + 解除 __miniHosted 托管', () => {
    expect(mini).toContain('if (pendingTakeovers.has(m.appId)) {');
    expect(mini).toContain("document.getElementById(`app-instance-${m.appId}`)");
    expect(mini).toContain('orphan.__miniHosted = false;');
  });

  it('destroy 分支覆盖 wrapper 为 null 的场景（幽灵实例不再滞留）', () => {
    expect(mini).toMatch(/if \(destroy\) \{\s*\n\s*if \(m\.wrapper\) \{/);
  });

  it('z 域归一化：阈值 830 触发重排，杜绝越过导航条/下拉面板', () => {
    expect(mini).toContain('const Z_NORM_THRESHOLD = 830;');
    expect(mini).toContain('if (miniTopZ >= Z_NORM_THRESHOLD) normalizeMiniZ();');
    expect(mini).toContain('function normalizeMiniZ()');
  });
});

describe('v7.74 · 版本与构建锚点', () => {
  it('sw.js 升 geek-v93', () => {
    expect(read('sw.js')).toContain("const VERSION = 'geek-v93';");
  });

  it('main.js 引入 charging-ripple 且 m3e.js 依旧在依赖链', () => {
    const mainJs = read('ios-desktop/js/main.js');
    expect(mainJs).toContain('./m3e.js');
    expect(mainJs).toContain('./charging-ripple.js');
  });
});
