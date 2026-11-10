// ==================== v10.76 #281：全局错误捕获层（根壳统一错误层 + iframe 汇聚） ====================
//
// #281 交付守护（真实用户会话错误零汇聚 → 统一错误层）：
//   ① 三源汇聚：根壳 error 事件（capture，运行时 + 资源）+ unhandledrejection
//      + iframe 子应用转发 APP_ERROR（main.js 注入段挂转发，根侧 error-hub 唯一接收点）
//   ② app 名标注：根壳错误 'shell'；iframe 转发按 e.source 反查 iframe src（apps/<id>/）
//      推断应用名，转发侧零需知 app id（不碰 __syncIframeApp 签名）
//   ③ 版本标注：sw.js VERSION 常量锚定提取（settings.js fillSysVer 先例同律，
//      fix(v7.45) 免疫注释与策略名；#223 占位符 → 'dev' 映射）
//   ④ 环形缓冲上限 200 + 同指纹合并计数（防长会话内存膨胀与 console 刷屏）
//   ⑤ 零覆盖纪律：只 addEventListener 多播，不赋值 window.onerror，不动应用自挂捕获；
//      零后端零上报（无 XHR/sendBeacon/上报端点）
//
// 测试纪律：indexOf 切片锚点用定义形态；负断言用切片限定防正文误报；
// 纯逻辑经 globalThis.__md3ErrorHubInternals 消费（非公开 API 契约，仅测试锚）。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// 副作用导入：IIFE 挂载 window.__md3ErrorHub（happy-dom 环境 window 在场）
import '../ios-desktop/js/error-hub.js';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');
const hub = () => window.__md3ErrorHub;
const IT = () => globalThis.__md3ErrorHubInternals;

const fireError = (init = {}) => {
  const ev = new ErrorEvent('error', {
    message: init.message || '', filename: init.filename || '',
    lineno: init.lineno || 0, colno: init.colno || 0,
    ...init,
  });
  window.dispatchEvent(ev);
};
const fireRejection = (reason) => {
  const ev = new Event('unhandledrejection');
  Object.defineProperty(ev, 'reason', { value: reason });
  window.dispatchEvent(ev);
};

describe('v11.09 #281 纯逻辑核：app 推断 / 版本提取 / 归一化', () => {
  it('appFromSrc：apps/<id>/index.html → <id>；非 apps 路径 → null', () => {
    const { appFromSrc } = IT();
    expect(appFromSrc('apps/chess/index.html')).toBe('chess');
    expect(appFromSrc('/md3/ios-desktop/apps/music-player/index.html')).toBe('music-player');
    expect(appFromSrc('js/main.js')).toBe(null);
    expect(appFromSrc('')).toBe(null);
    expect(appFromSrc(null)).toBe(null);
  });

  it('extractVersion：锚定 VERSION 常量赋值行（免疫注释与策略名 v7.45 同律）', () => {
    const { extractVersion } = IT();
    const swText = [
      "// 策略名 v10.76-cacheFirst 与注释里的 geek-vN 字样不得误命中",
      "const CACHE_POLICY = 'v10.76-cacheFirst';",
      "const VERSION = 'v10.76';",
      "const BUILD_ID = 'abc1234';",
    ].join('\n');
    expect(extractVersion(swText)).toBe('v10.76');
    // 旧正则误命中形态负锚：策略名行在前也必须取 VERSION 行
    expect(extractVersion(swText)).not.toBe('v10.76-cacheFirst');
  });

  it('extractVersion：__SW_VERSION__ 占位 → dev（#223 同律，不透传化石）', () => {
    const { extractVersion } = IT();
    expect(extractVersion("const VERSION = '__SW_VERSION__';")).toBe('dev');
    expect(extractVersion('')).toBe(null);
    expect(extractVersion(null)).toBe(null);
  });

  it('normalize：kind 缺省 error / message 截断 500 / app 缺省 shell', () => {
    const { normalize } = IT();
    const e = normalize(undefined, 'x'.repeat(600), undefined, undefined, undefined, undefined);
    expect(e.kind).toBe('error');
    expect(e.message.length).toBe(500);
    expect(e.app).toBe('shell');
    expect(normalize('promise', 'p', '', 0, 0, 'chess').kind).toBe('promise');
  });
});

describe('v11.09 #281 根壳三源捕获（happy-dom 实跑）', () => {
  beforeEach(() => { hub().clear(); });
  afterEach(() => { hub().clear(); });

  it('消费 API 五件套在场（list/count/byApp/version/clear）', () => {
    for (const k of ['list', 'count', 'byApp', 'version', 'clear']) {
      expect(typeof hub()[k]).toBe('function');
    }
    expect(hub().version()).toBe('unknown'); // happy-dom fetch sw.js 不可达 → 未知态
  });

  it('① 运行时 error 事件入账：app=shell / kind=error', () => {
    fireError({ message: 'boom at shell', filename: 'js/main.js', lineno: 12 });
    const list = hub().list();
    expect(list.length).toBe(1);
    expect(list[0].app).toBe('shell');
    expect(list[0].kind).toBe('error');
    expect(list[0].message).toBe('boom at shell');
    expect(list[0].source).toBe('js/main.js');
    expect(list[0].line).toBe(12);
  });

  it('① 资源错误（target 带 src 的元素）→ kind=resource', () => {
    const img = document.createElement('img');
    img.src = 'assets/missing.png';
    const ev = new ErrorEvent('error');
    Object.defineProperty(ev, 'target', { value: img });
    window.dispatchEvent(ev);
    const list = hub().list();
    expect(list.length).toBe(1);
    expect(list[0].kind).toBe('resource');
    expect(list[0].message).toContain('assets/missing.png'); // happy-dom src getter → 绝对 URL
  });

  it('② unhandledrejection → kind=promise（reason.message 提取）', () => {
    const err = new Error('async boom');
    fireRejection(err);
    const list = hub().list();
    expect(list.length).toBe(1);
    expect(list[0].kind).toBe('promise');
    expect(list[0].message).toBe('async boom');
    fireRejection('plain string reason');
    expect(hub().list()[1].message).toBe('plain string reason');
  });
});

describe('v11.09 #281 iframe APP_ERROR 汇聚（e.source 反查）', () => {
  let frame;
  beforeEach(() => {
    hub().clear();
    frame = document.createElement('iframe');
    frame.setAttribute('src', 'apps/chess/index.html');
    document.body.appendChild(frame);
  });
  afterEach(() => {
    frame && frame.remove();
    hub().clear();
  });

  it('③ APP_ERROR 汇聚：source 反查 iframe src → app=chess', () => {
    const fakeWin = { stub: true };
    Object.defineProperty(frame, 'contentWindow', { value: fakeWin, configurable: true });
    const ev = new MessageEvent('message', {
      data: { type: 'APP_ERROR', payload: { kind: 'error', message: 'app boom', source: 'js/apps/chess-core.js', line: 42, col: 7 } },
      source: fakeWin,
    });
    window.dispatchEvent(ev);
    const list = hub().list();
    expect(list.length).toBe(1);
    expect(list[0].app).toBe('chess');
    expect(list[0].message).toBe('app boom');
    expect(list[0].line).toBe(42);
    expect(list[0].kind).toBe('error');
  });

  it('③ source 反查失败 → 兜底 app=iframe（不丢条目）', () => {
    const fakeWin = { detached: true };
    const ev = new MessageEvent('message', {
      data: { type: 'APP_ERROR', payload: { kind: 'promise', message: 'orphan' } },
      source: fakeWin,
    });
    window.dispatchEvent(ev);
    expect(hub().list()[0].app).toBe('iframe');
  });

  it('③ 非 APP_ERROR 消息零入账（bus/palette 等既有通道零误收）', () => {
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'BUS_EMIT', event: 'x' } }));
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'set-palette', palette: {} } }));
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'APP_ERROR' } })); // 缺 payload
    expect(hub().count()).toBe(0);
  });
});

describe('v11.09 #281 环形缓冲与指纹去重', () => {
  beforeEach(() => { hub().clear(); });
  afterEach(() => { hub().clear(); });

  it('同指纹合并计数（count 累加、条目不膨胀），不同指纹分立', () => {
    for (let i = 0; i < 5; i++) fireError({ message: 'dup boom', filename: 'a.js' });
    fireError({ message: 'other boom', filename: 'b.js' });
    const list = hub().list();
    expect(list.length).toBe(2);
    expect(list[0].count).toBe(5);
    expect(list[1].count).toBe(1);
  });

  it('环形上限 200：超限丢最旧、总量封顶（pushEntry 直驱免 201 次事件）', () => {
    const { pushEntry, MAX_ENTRIES, normalize } = IT();
    expect(MAX_ENTRIES).toBe(200);
    for (let i = 0; i < MAX_ENTRIES + 30; i++) {
      pushEntry(normalize('error', 'e' + i, 'x.js', i, 0, 'shell'));
    }
    expect(hub().count()).toBe(200);
    const list = hub().list();
    expect(list[0].message).toBe('e30'); // 最旧 30 条被挤掉
    expect(list[199].message).toBe('e229');
  });

  it('byApp 映射与 clear 清空', () => {
    fireError({ message: 's1' });
    const fakeWin = {};
    const frame = document.createElement('iframe');
    frame.setAttribute('src', 'apps/music/index.html');
    document.body.appendChild(frame);
    Object.defineProperty(frame, 'contentWindow', { value: fakeWin, configurable: true });
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'APP_ERROR', payload: { kind: 'error', message: 'm1' } },
      source: fakeWin,
    }));
    frame.remove();
    expect(hub().byApp()).toEqual({ shell: 1, music: 1 });
    hub().clear();
    expect(hub().count()).toBe(0);
  });
});

describe('v11.09 #281 接线真源锚（文本形态）', () => {
  it('index.html：error-hub.js 先于 main.js 引入（head 最早捕获序）+ #281 注记', () => {
    const s = src('ios-desktop/index.html');
    const iHub = s.indexOf('js/error-hub.js');
    const iMain = s.indexOf('js/main.js');
    expect(iHub).toBeGreaterThan(-1);
    expect(iMain).toBeGreaterThan(iHub);
    expect(s).toContain('#281');
  });

  it('error-hub.js：环形 200 / 零覆盖（不赋值 onerror）/ 零上报通道', () => {
    const s = src('ios-desktop/js/error-hub.js');
    expect(s).toContain('MAX_ENTRIES = 200');
    expect(s).not.toMatch(/window\.onerror\s*=/); // 只多播不覆盖
    expect(s).not.toContain('XMLHttpRequest');
    expect(s).not.toContain('sendBeacon');
    expect(s).toContain("type !== 'APP_ERROR'"); // 根侧唯一接收点
  });

  it('main.js 注入段：APP_ERROR 转发 + 幂等守卫 + 500 截断（切片锚）', () => {
    const s = src('ios-desktop/js/main.js');
    const seg = s.slice(s.indexOf("#281 错误转发"), s.indexOf('#281 错误转发') + 2400);
    expect(seg).toContain("type: 'APP_ERROR'");
    expect(seg).toContain('__md3ErrForwardHooked');
    expect(seg).toContain('unhandledrejection');
    expect(seg).toContain('slice(0, 500)');
    // 注入段零覆盖纪律：转发只 addEventListener
    expect(seg).not.toMatch(/window\.onerror\s*=/);
  });

  it('转发/接收两端 kind 枚举一致（error/resource/promise 全链路同契约）', () => {
    const hubS = src('ios-desktop/js/error-hub.js');
    const mainS = src('ios-desktop/js/main.js');
    for (const kind of ["'resource'", "'error'", "'promise'"]) {
      expect(mainS).toContain("__fwdErr(" + kind);
      expect(hubS).toContain(kind === "'error'" ? "kind: kind || 'error'" : 'normalize(' + kind);
    }
  });

  it('vite 构建 1.6b 根壳通道：error-hub.js 纳入 dist 拷贝（e2e 404 治本）+ module 剥离防线', () => {
    const cfg = src('vite.config.js');
    expect(cfg).toContain('1.6b) #281');
    expect(cfg).toContain('SHELL_JS_RE');
    // module 剥离防线：js/main.js 由 Rollup 打 bundle，不得按散文件误拷
    expect(cfg).toContain('type=["\']module["\']');
  });

  it('版本 fetch 路径锚：../sw.js 双态解析（sw.js 真源在仓库根/dist 根，非 ios-desktop/ 子目录）', () => {
    const s = src('ios-desktop/js/error-hub.js');
    // e2e:dist 43/44 FAIL 实证根因：fetch('sw.js') 从根壳 /ios-desktop/ 文档解析
    // → /ios-desktop/sw.js 404（#260 同源资源错误防线抓获）——../sw.js 双态命中
    expect(s).toContain("fetch('../sw.js'");
    expect(s).not.toContain("fetch('sw.js'");
  });
});
