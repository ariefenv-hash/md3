// ==================== v181-batch11.test.js — #181 第十一批整改：camera 六条准入 ====================
//
// 覆盖（渐进累计 12/13）：
//   · camera 令牌化收尾（--cam-scrim-40/60/65/75/85 五档从 --md-scrim color-mix 派生：
//     倒计时遮罩/顶底渐变/预览 Modal 顶底栏/Toast/相册缩略图投影七处消费；
//     对焦框黄晕从 --yellow 派生、录像红晕从 --error 派生；白玻璃系 15 处按
//     v7.26 裁决「相机功能色」豁免保留——头注声明在录）
//   · 响应式：@media 400px 手机紧凑 + 760px 平板真分栏（body flex → grid 1fr/300px，
//     滤镜抽屉升格右列常驻面板纵排铺开，取景器右缘 300px 缩进只铺左列，手机态零变化）
//   · SDK：notify（录像完成里程碑低频）+ VFS /documents/camera-history.json
//     最近 20 条镜像（拍摄写入/启动恢复双落点 + sysAvail/fsAvail 双守卫降级零炸）
//   · 形态语言：pressRipple 两排事件委托（mode-selector/filter-drawer 欧氏距离衰减
//     240px/0.08 三释放）
//   · 回归锚：photoVfsName 非法字符防御/VFS /photos/ 直写/photo-captured 总线/
//     快门倒计时链/flash-ratio-grid-timer 循环切换 零变化
//   · 准入门：ADMITTED_APPS 扩至 16 应用（+camera）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(join(ROOT, 'ios-desktop/apps/camera/index.html'), 'utf-8');
const VITE = readFileSync(join(ROOT, 'vite.config.js'), 'utf-8');

describe('#181 第十一批 camera：令牌化收尾', () => {
  it('五档 --cam-scrim 派生 + 七处消费 + 黄/红晕 color-mix 派生 + 白玻璃系豁免头注', () => {
    // 五档派生定义（--md-scrim color-mix，fallback 兜底不算裸写）
    expect(HTML).toContain('--cam-scrim-40: color-mix(in srgb, var(--md-scrim, #000) 40%, transparent);');
    expect(HTML).toContain('--cam-scrim-60: color-mix(in srgb, var(--md-scrim, #000) 60%, transparent);');
    expect(HTML).toContain('--cam-scrim-65: color-mix(in srgb, var(--md-scrim, #000) 65%, transparent);');
    expect(HTML).toContain('--cam-scrim-75: color-mix(in srgb, var(--md-scrim, #000) 75%, transparent);');
    expect(HTML).toContain('--cam-scrim-85: color-mix(in srgb, var(--md-scrim, #000) 85%, transparent);');
    // 七处消费：倒计时遮罩 40 + 相册投影 40 + Modal 顶/底 60×2 + 顶栏渐变 65 + 底栏渐变 75 + Toast 85
    expect((HTML.match(/var\(--cam-scrim-40\)/g) || []).length).toBe(2);
    expect((HTML.match(/var\(--cam-scrim-60\)/g) || []).length).toBe(2);
    expect((HTML.match(/var\(--cam-scrim-65\)/g) || []).length).toBe(1);
    expect((HTML.match(/var\(--cam-scrim-75\)/g) || []).length).toBe(1);
    expect((HTML.match(/var\(--cam-scrim-85\)/g) || []).length).toBe(1);
    // 黄晕从 --yellow 派生、录像红晕从 --error 派生（裸 rgba 退役）
    expect(HTML).toContain('box-shadow: 0 0 10px color-mix(in srgb, var(--yellow) 40%, transparent);');
    expect(HTML).toContain('box-shadow: 0 0 16px color-mix(in srgb, var(--error) 50%, transparent);');
    // 黑 scrim 裸写归零：rgba(0, 0, 0 仅剩 color-mix fallback 内 #000（无裸 rgba(0, 0, 0, 面）
    expect(HTML).not.toMatch(/rgba\(0, 0, 0, 0\.\d/);
    // 白玻璃系豁免头注声明在录（v7.26 裁决 + #181 ②口径）
    expect(HTML).toContain('预览覆盖层白/黄/红均为相机功能色，保持常量。');
    expect(HTML).toContain('按 v7.26 裁决豁免保留：取景器叠加层在任意画面上必须恒白，不随主题翻转');
  });
});

describe('#181 第十一批 camera：响应式 + 760px 平板真分栏', () => {
  it('@media 400px 紧凑 + 760px grid 两列（滤镜抽屉升格右列常驻，手机 flex 零变化）', () => {
    expect(HTML).toMatch(/@media \(max-width:400px\) \{/);
    expect(HTML).toMatch(/@media \(min-width:760px\) \{/);
    // 手机紧凑锚：快门 70px/inner 54px/翻转钮 44px/倒计时 72px
    expect(HTML).toContain('.shutter-btn-wrapper { width: 70px; height: 70px; }');
    expect(HTML).toContain('.shutter-inner-fill { width: 54px; height: 54px; }');
    expect(HTML).toContain('.switch-cam-btn { width: 44px; height: 44px; font-size: 20px; }');
    expect(HTML).toContain('.timer-countdown-overlay { font-size: 72px; }');
    // 平板分栏：body flex → grid 1fr/300px；取景器右缘 300px 缩进只铺左列
    expect(HTML).toContain('body { display: grid; grid-template-columns: 1fr 300px; grid-template-rows: 1fr; }');
    expect(HTML).toContain('.viewfinder-wrapper { inset: 0 300px 0 0; }');
    expect(HTML).toContain('.top-bar { grid-column: 1; grid-row: 1; align-self: start; }');
    expect(HTML).toContain('.bottom-dock { grid-column: 1; grid-row: 1; align-self: end; }');
    // 滤镜抽屉升格右列常驻面板（基础态+open 态双选择器全覆盖）
    expect(HTML).toMatch(/\.filter-drawer,\n    \.filter-drawer\.open \{/);
    expect(HTML).toContain('grid-column: 2;');
    expect(HTML).toContain('flex-direction: column;');
    expect(HTML).toContain('.filter-drawer .filter-item { flex-shrink: 0; }');
    // 手机态零变化锚：基础 body 保持 flex column（grid 仅 760px 内生效）
    expect(HTML).toContain('justify-content: space-between;\n    position: relative;\n  }');
  });
});

describe('#181 第十一批 camera：SDK 双通道（notify + VFS 历史镜像）', () => {
  it('sysAvail/fsAvail 双守卫 + 录像完成低频 notify + VFS 最近 20 条双落点', () => {
    expect(HTML).toContain('const sysAvail = !!(window.__system && window.__system.notify);');
    expect(HTML).toContain('const fsAvail = !!(window.__system && window.__system.fs);');
    expect(HTML).toContain("try { window.__system.notify({ title: title, body: body }); } catch (err) { /* 静默降级 */ }");
    expect(HTML).toContain("notifySaved('相机', '视频已保存 · 时长 ' + dm + ':' + ds);");
    expect(HTML).toContain("'/documents/camera-history.json'");
    expect(HTML).toContain('CAM_HISTORY_CAP = 20');
    expect(HTML).toContain("window.__system.fs.write(CAM_HISTORY_PATH, JSON.stringify({ app: 'camera', records: histRecords })).catch(function () {})");
    // 双落点：拍摄写入 + 启动恢复
    expect(HTML).toMatch(/pushHistory\(item\);\s*\n\s*\n\s*\/\/ v9\.14 #175/);
    expect(HTML).toContain('restoreHistory();     // #181 准入④落点二：启动恢复镜像（宿主在库时异步回填）');
    // 恢复链经 /photos/ 回读 dataUrl（相册单一真源复用，不重复存大对象）
    expect(HTML).toContain("window.__system.fs.read('/photos/' + r.name)");
  });
});

describe('#181 第十一批 camera：形态语言（pressRipple 整排联动）', () => {
  it('两排事件委托 + 三释放 + 欧氏距离衰减（240px 步进 0.08）', () => {
    expect(HTML).toContain("var REACH = 240, STEP = 0.08, SEL = '.mode-selector, .filter-drawer';");
    expect(HTML).toContain("'pointerup', 'pointercancel', 'pointerleave'");
    expect(HTML).toContain('Math.hypot(e.clientX - (r.x + r.width / 2), e.clientY - (r.y + r.height / 2)) / REACH');
    expect(HTML).toContain("el.style.transform = 'scale(' + (1 - STEP * k).toFixed(3) + ')';");
    expect(HTML).toContain('setupPressRipple();');
    expect(HTML).toContain('// 初始化运行（SDK 块后：fsAvail 已赋值——R68 坑①同源纪律）');
  });
});

describe('#181 第十一批 camera：回归锚（拍摄/相册核心零变化）', () => {
  it('photoVfsName 防御/VFS 直写/总线联动/倒计时链/模式循环 零变化', () => {
    // 照片 VFS 文件名单一真源 + 非法字符防御（v9.14 #175 既有）
    expect(HTML).toContain("return (item.name || ('IMG_' + item.id + '.jpg')).replace(/[\\\\/:*?\"<>|]/g, '_');");
    // 拍摄照片直写 VFS /photos/（相册单一真源）
    expect(HTML).toContain("window.__system.fs.write('/photos/' + photoVfsName(item), item.dataUrl).catch(() => null);");
    // 应用总线 photo/captured → 相册联动（camera → photo）
    expect(HTML).toContain("window.__system.emit('photo/captured', {");
    // 快门倒计时链（timerMode 3/10 → 逐秒 pop → takePhoto）
    expect(HTML).toContain('timerOverlay.classList.add(\'active\');');
    expect(HTML).toContain('takePhoto();');
    // 顶栏四循环切换锚（flash auto/on/off、ratio 四档、grid 开关、timer 0/3/10）
    expect(HTML).toContain("const flashIcons = { auto: 'flash_auto', on: 'flash_on', off: 'flash_off' };");
    expect(HTML).toContain("const ratioLabels = { '4-3': '4:3', '16-9': '16:9', '1-1': '1:1', 'full': '全屏' };");
    expect(HTML).toContain("const timerIcons = { 0: 'timer_off', 3: 'timer_3', 10: 'timer_10' };");
    // 相册主存键不变（localStorage pixel_camera_gallery 快照仅 10 张 image）
    expect(HTML).toContain("localStorage.setItem('pixel_camera_gallery', JSON.stringify(serializable.slice(0, 10)))");
    // 统一权限前置（桌面权限对话框）不变
    expect(HTML).toContain('window.__system.requestPermission(name).then(done).catch(() => done(true));');
  });
});

describe('v10.71 #228 准入覆盖（全量扫描取代清单制）', () => {
  it('camera 已由全量扫描自动覆盖（白名单制度在 v10.71 退役）', () => {
    // v10.71 #228 制度性根因修正：ADMITTED_APPS 硬编码白名单已删除（24 应用绕过检查的根因），
    // 改 audit-app-quality.mjs 全量扫描 —— apps/ 落盘即受检，应用 id 不得再硬编码进 vite.config.js
    expect(VITE).not.toContain('ADMITTED_APPS');
    expect(VITE).toContain('audit-app-quality.mjs');
    expect(VITE).toContain('runQualityAudit');
    expect((VITE.match(/'camera'/g) || []).length).toBe(0); // 全量扫描下零硬编码（旧「清单含 X」断言的语义反转）
  });
});