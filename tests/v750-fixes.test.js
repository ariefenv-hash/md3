// ==================== v7.50 修复与拆分锚定测试 ====================
// 用户四项：
//   ① 翻译应用 progress 图标加载失败（'progress' 并非合法 Material Symbols 图标名，
//      本地子集字体无此连字）→ 自绘 SVG 环形进度 spinner
//   ② 二级菜单没铺满整个应用内容窗口（subpageSpring 落定精度内停机，~0.5% 残差
//      永久留在表面 → 二级页边缘 2px 露底缝）→ 落定终值吸附 + 渲染侧铺满吸附
//   ③ 录音应用权限已授予仍无法录音（应用内权限 ≠ 浏览器站点权限；getUserMedia
//      失败仅报 err.name）→ 分层预检 + err.name 中文指引映射
//      + 连带修复 V.list/V.readURL/V.move/V.del 四处死代码（列表/播放/重命名/删除全失效）
//   ④ 录音应用 UI 全面重制（状态芯片/镜像电平条/圆→方录制钮/暂停续录/播放进度条）
// 拆分三项（行为零变化，外部导入路径零改动）：
//   app-window.js → app-window-parallel.js（放射场/Genie/并行 Actor）
//   recent-apps.js → recent-preview.js（卡片预览内容构建）
//   settings.js → settings-battery.js（电池页实时同步副作用）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf-8');

describe('v7.50 → ① 翻译应用自绘环形进度 spinner', () => {
  const src = read('ios-desktop/apps/translate/index.html');

  it('非法图标名 progress 退场（本地子集字体无此连字，渲染失败根因）', () => {
    expect(src).not.toContain("setStatus('progress'");
  });

  it('内联 SVG spinner 落位（零字体依赖）+ is-loading 显隐切换', () => {
    expect(src).toContain('class="status-spinner"');
    expect(src).toContain('.char-count.is-loading .status-spinner { display: inline-block; }');
    expect(src).toContain("setStatus('spinner', '翻译中...', true)");
  });

  it('spinner 动画参数在位（旋转 + 圆弧呼吸），尊重 reduced-motion', () => {
    expect(src).toContain('@keyframes tr-spin');
    expect(src).toContain('@keyframes tr-dash');
    expect(src).toContain('prefers-reduced-motion: reduce');
  });
});

describe('v7.50 → ② 二级菜单铺满（弹簧落定残差根治）', () => {
  const src = read('ios-desktop/js/app-window.js');

  it('渲染侧铺满吸附：距目标 <0.5% 视为完全在场（backProgress 归零）', () => {
    expect(src).toContain('if (1 - subP < 0.005) subP = 1;');
  });

  it('主循环停机前弹簧终值吸附（Spring2D 双轴分支 + 终帧 renderSubPages）', () => {
    expect(src).toContain('[state.posSpring, state.scaleSpring, state.subpageSpring].forEach((s) => {');
    expect(src).toContain('s.x.x = s.x.target; s.x.v = 0;');
    expect(src).toContain('s.y.x = s.y.target; s.y.v = 0;');
    expect(src).toContain('renderSubPages(true);');
  });

  it('拖拽期不吸附不补帧（手势通道不受影响）', () => {
    expect(src).toContain('if (!state.isDragging) {');
  });
});

describe('v7.50 → ③ 录音权限分层诊断 + V() 调用面修复', () => {
  const src = read('ios-desktop/js/apps/recorder.js');

  it('VFS 桥调用面：list/readURL/move/del 全部经 V()（四处死代码复活）', () => {
    expect(src).toContain('V().list(DIR)');
    expect(src).toContain('V().readURL(path)');
    expect(src).toContain('V().move(path, newPath)');
    expect(src).toContain('V().del(path)');
    // 旧的误用形态退场（V 是取桥函数，API 挂在其返回值上）
    expect(src).not.toMatch(/\bV\.(list|readURL|move|del)\(/);
  });

  it('浏览器站点权限预检（Permissions API）+ 状态芯片', () => {
    expect(src).toContain('function queryBrowserMic()');
    expect(src).toContain("navigator.permissions.query({ name: 'microphone' })");
    expect(src).toContain("queryBrowserMic().then(function (state) {");
    expect(src).toContain("if (state === 'denied')");
    expect(src).toContain('id="recMicState"');
    expect(src).toContain('refreshMicState();');
  });

  it('getUserMedia 错误按 err.name 映射为可操作中文指引', () => {
    expect(src).toContain('function explainMicError(err)');
    expect(src).toContain("'NotAllowedError' || name === 'PermissionDeniedError'");
    expect(src).toContain("'NotFoundError' || name === 'DevicesNotFoundError'");
    expect(src).toContain("'NotReadableError' || name === 'TrackStartError'");
    expect(src).toContain('MIC_GUIDE');
  });

  it('不安全上下文/缺 MediaRecorder 提前拦截（HTTPS 引导）', () => {
    expect(src).toContain('!window.isSecureContext');
    expect(src).toContain('录音需要 HTTPS 安全页面');
  });

  it('生命周期契约保持：权限桥 + 会话强制释放 + VFS 订阅退订', () => {
    expect(src).toContain("window.__recorderPerm = function ()");
    expect(src).toContain("window.__recorderMicGate = function ()");
    expect(src).toContain('function releaseRecSession()');
    expect(src).toContain("addCleanup('recorder', releaseRecSession)");
    expect(src).toContain('V().subscribe(DIR, render)');
  });
});

describe('v7.50 → ④ 录音应用 UI 重制要素', () => {
  const src = read('ios-desktop/js/apps/recorder.js');

  it('录制钮圆→圆角方形形变 + 呼吸涟漪环（仅录音中）', () => {
    expect(src).toContain('.rec-shape.recording');
    expect(src).toContain('.rec-main.recording::before');
    expect(src).toContain('@keyframes recRing');
  });

  it('0.1s 精度计时（暂停可续：base + runStart 模型）', () => {
    expect(src).toContain('id="recTenth"');
    expect(src).toContain('function elapsedMs()');
    expect(src).toContain('recElapsedBase + (recRunStart ? (Date.now() - recRunStart) : 0)');
  });

  it('暂停/继续 + 镜像电平条 + 播放进度条 + 列表头总量', () => {
    expect(src).toContain('id="recPauseBtn"');
    expect(src).toContain('rec.pause()');
    expect(src).toContain('rec.resume()');
    expect(src).toContain('align-items:center;justify-content:center;gap:5px;height:52px');
    expect(src).toContain('data-role="progfill"');
    expect(src).toContain("files.length + ' 段 · ' + fmtBytes(total)");
  });
});

describe('v7.50 → 拆分：模块链接完整性（导入名必须与提供方导出严格对齐）', () => {
  // 背景：node --check / vitest transform 均不做 ESM 链接期校验，浏览器会在
  // 链接期整体崩溃（黑屏）。此处以静态解析兜底：new 模块的每个导入名都必须
  // 在提供方源码中存在导出（inline export 或 export {} 块）。
  const parseImports = (src, provider) => {
    const names = [];
    const re = new RegExp(`import\\s*{([^}]*)}\\s*from\\s*'${provider.replace('.', '\\.')}'`, 'g');
    let m;
    while ((m = re.exec(src))) names.push(...m[1].split(',').map((s) => s.trim()).filter(Boolean));
    return names;
  };
  const exportsOf = (src) => {
    const names = new Set();
    for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/g)) names.add(m[1]);
    for (const m of src.matchAll(/export\s+(?:const|let|var|class)\s+([A-Za-z0-9_$]+)/g)) names.add(m[1]);
    for (const m of src.matchAll(/export\s*{([^}]*)}/g)) {
      m[1].split(',').map((s) => s.trim()).filter(Boolean).forEach((n) => names.add(n.split(/\s+as\s+/)[0]));
    }
    for (const m of src.matchAll(/export\s*{([^}]*)}\s*from/g)) {
      m[1].split(',').map((s) => s.trim()).filter(Boolean).forEach((n) => names.add(n.split(/\s+as\s+/)[0]));
    }
    return names;
  };
  const expectLinks = (importerPath, providerPath) => {
    const importer = read(importerPath);
    // provider 以 importer 所在目录为基准解析（'./x.js' 与 importer 同目录）
    const provider = readFileSync(join(root, importerPath, '..', providerPath), 'utf-8');
    const provided = exportsOf(provider);
    const missing = parseImports(importer, providerPath).filter((n) => !provided.has(n));
    expect(`${importerPath} -> ${providerPath} 缺失导出: ${missing.join(',')}`).toBe(
      missing.length === 0 ? `${importerPath} -> ${providerPath} 缺失导出: ` : 'never'
    );
  };

  it('app-window.js ⇆ app-window-parallel.js 全量符号对齐', () => {
    expectLinks('ios-desktop/js/app-window.js', './app-window-parallel.js');
    // re-export 桥同样不能指向不存在的导出
    const parallelExports = exportsOf(read('ios-desktop/js/app-window-parallel.js'));
    for (const n of ['retargetRadialField', 'syncRadialFieldToProgress', 'isParallelAnimationActive']) {
      expect(parallelExports.has(n)).toBe(true);
    }
  });

  it('recent-apps.js ← recent-preview.js / settings.js ← settings-battery.js 对齐', () => {
    expectLinks('ios-desktop/js/recent-apps.js', './recent-preview.js');
    expectLinks('ios-desktop/js/apps/settings.js', './settings-battery.js');
  });
});

describe('v7.50 → 拆分：app-window-parallel.js（放射场/Genie/并行 Actor）', () => {
  const parallel = read('ios-desktop/js/app-window-parallel.js');
  const appWindow = read('ios-desktop/js/app-window.js');

  it('子系统完整迁出并导出', () => {
    expect(parallel).toContain('function genieFunnelMatrix(');
    expect(parallel).toContain('export function isParallelAnimationActive()');
    expect(parallel).toContain('function renderClosingActor(');
    expect(parallel).toContain('function popHomeIcon(');
    expect(parallel).toContain('export {');
    expect(parallel).toContain('radialField,');
  });

  it('app-window.js 反向导入且无环（parallel 不 import app-window）', () => {
    expect(appWindow).toContain("} from './app-window-parallel.js';");
    expect(parallel).not.toContain("from './app-window.js'");
    // 主渲染与循环留在原位
    expect(appWindow).toContain('export function render(progress, cx, cy)');
    expect(appWindow).toContain('export function startLoop(params)');
    expect(appWindow).toContain('export function renderSubPages(force = false)');
  });

  it('对外导入路径零改动（gestures.js 等 re-export 桥在位）', () => {
    expect(appWindow).toContain(
      "export { retargetRadialField, syncRadialFieldToProgress, isParallelAnimationActive } from './app-window-parallel.js';"
    );
    expect(read('ios-desktop/js/gestures.js')).toContain(
      "import { startLoop, openApp, closeApp, isParallelAnimationActive, retargetRadialField, scheduleGestureRender, flushGestureRender, clearPendingSwitchRebound } from './app-window.js';"
    );
  });
});

describe('v7.50 → 拆分：recent-preview.js（卡片预览内容构建）', () => {
  const preview = read('ios-desktop/js/recent-preview.js');
  const recent = read('ios-desktop/js/recent-apps.js');

  it('两个构建器迁出并导出，依赖仅叶子模块', () => {
    expect(preview).toContain('export function buildColdTaskHTML(');
    expect(preview).toContain('export function getAppPreviewContentHTML(');
    expect(preview).toContain("from './app-icons.js'");
    expect(preview).toContain("from './dynamic-icons.js'");
    expect(preview).not.toContain("from './recent-apps.js'");
  });

  it('recent-apps.js 改为导入（构建点不变）+ 既有测试锚点保持', () => {
    expect(recent).toContain("import { buildColdTaskHTML, getAppPreviewContentHTML } from './recent-preview.js';");
    expect(recent).toContain('getAppPreviewContentHTML(app, M.baseW, M.baseH)');
    expect(recent).not.toContain('function buildColdTaskHTML(');
    // issue6-followup.test.js 锚定的导入行原样保留
    expect(recent).toContain("import { restoreDesktopAfterBatchClear } from './app-window.js'");
  });
});

describe('v7.50 → 拆分：settings-battery.js（电池页实时同步）', () => {
  const battery = read('ios-desktop/js/apps/settings-battery.js');
  const settings = read('ios-desktop/js/apps/settings.js');

  it('电池同步副作用整体迁出（订阅/省电开关/模拟充电器）', () => {
    expect(battery).toContain('subscribeBattery(renderSettingsBatteryPage)');
    expect(battery).toContain("from '../battery-service.js'");
    expect(battery).toContain('battery-saver-changed');
    expect(battery).toContain('settingsSimChargerSwitch');
  });

  it('settings.js 以副作用方式导入（注册顺序与拆分前一致）', () => {
    expect(settings).toContain("import './settings-battery.js';");
    expect(settings).not.toContain('subscribeBattery(renderSettingsBatteryPage)');
    // 页面模板仍由 settings.js 产出（既有测试锚点）
    expect(settings).toContain('settingsBatterySaverSwitch');
    expect(settings).toContain('ICONS.battery_saver');
  });
});
