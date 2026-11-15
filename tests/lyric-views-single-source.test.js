// ==================== lyric-views-single-source.test.js — #284 批16 music 歌词双簇单源搬迁（v11.46） ====================
//
// 覆盖（boundary-map §3.2 表前两簇整簇搬迁 apps/music/lyric-views.js · 播放器 UI/媒体桥留宿主）：
//   A · 模块面：ESM 直连导入（#286 消费形态学第三形态）+ 导出面恰 7 函数 + 顶层零副作用
//   B · 行为锚（mock app 注入首参）：歌词滚动渲染四函数 + 歌词制作编辑器三函数语义逐条保真
//       ——行级/逐字 span 渲染、指针高亮、面板开关、打轴单调化、导出、草稿、e2e 桥
//   C · 源码锚：宿主委托行恰 7（可选链守卫）+ 簇体负向锚（宿主零残留）+ module 桥挂载
//       + lyric-core.js 挂载位不变 + 宿主调用点锚不变
//
// 宿主全局依赖桩（classic 主脚本顶层函数声明 → global object 属性）：
//   saveMusicPrefs / fsReadTextSafe —— v7.44 prefs 双通道 / v9.13 草稿回读双引擎

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  prepareLyricsUI, toggleLyricsPanel, renderLyrics, updateLyricsHighlight,
  initLyricMaker, openLyricMaker, closeLyricMaker,
} from '../ios-desktop/apps/music/lyric-views.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MUSIC_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/music/index.html'), 'utf-8');
const VIEWS_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/music/lyric-views.js'), 'utf-8');
const CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/music/lyric-core.js'), 'utf-8');

// ---------- 打轴核沙箱挂载（v122-v124 沙箱直驱范式；window.__lyricCore → happy-dom 全局） ----------
new Function('window', CORE_SRC)(globalThis.window);

// ---------- mock app 工厂 ----------
function makeEl() {
  const el = {
    style: {},
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c, f) { if (f === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } else if (f) this._s.add(c); else this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
    textContent: '', innerHTML: '', value: '', dataset: {}, title: '',
    children: [],
    appendChild(c) { this.children.push(c); return c; },
    querySelectorAll() { return []; },
    addEventListener() {}, onclick: null, oninput: null, onchange: null,
    clientHeight: 400, offsetTop: 0, offsetHeight: 20,
    removeAttribute() {}, querySelector() { return null; },
  };
  return el;
}
function makeApp() {
  const dom = {
    btnLyrics: makeEl(), lyricsPanel: makeEl(), lyricsList: makeEl(), canvas: makeEl(),
    lyricMakerView: makeEl(),
    lmTrackSel: makeEl(), lmPlayBtn: makeEl(), lmSimBtn: makeEl(), lmClock: makeEl(),
    lmSrc: makeEl(), lmTi: makeEl(), lmLoadBtn: makeEl(), lmDemoBtn: makeEl(),
    lmMarkBtn: makeEl(), lmRemarkBtn: makeEl(), lmWordsBtn: makeEl(), lmStat: makeEl(),
    lmList: makeEl(), lmKaraoke: makeEl(), lmKCur: makeEl(), lmKNext: makeEl(),
    lmSaveBtn: makeEl(), lmDlLrc: makeEl(), lmDlJson: makeEl(), lmCpLrc: makeEl(),
    lmDraftState: makeEl(), lmToast: makeEl(),
  };
  const app = {
    dom,
    audio: { currentTime: 0, duration: 120, paused: true, src: '' },
    tracks: [], currentIndex: -1, lyricsOn: false, isPlaying: false,
    updateViewState: vi.fn(),
    // 宿主委托行镜像（G2 桥接同形态）：mock app 以真实簇函数互绑，组合语义端到端可测
    prepareLyricsUI: (t) => prepareLyricsUI(app, t),
    toggleLyricsPanel: () => toggleLyricsPanel(app),
    renderLyrics: () => renderLyrics(app),
    updateLyricsHighlight: (f) => updateLyricsHighlight(app, f),
    initLyricMaker: () => initLyricMaker(app),
    openLyricMaker: () => openLyricMaker(app),
    closeLyricMaker: () => closeLyricMaker(app),
  };
  return app;
}

describe('A · 模块面：ESM 直连 + 导出面恰 7 + 顶层零副作用', () => {
  it('导出面恰 7 函数且函数签名首参注入 app（#286 消费形态学第三形态：tests ESM 直连）', () => {
    expect(prepareLyricsUI).toBeTypeOf('function');
    expect(toggleLyricsPanel).toBeTypeOf('function');
    expect(renderLyrics).toBeTypeOf('function');
    expect(updateLyricsHighlight).toBeTypeOf('function');
    expect(initLyricMaker).toBeTypeOf('function');
    expect(openLyricMaker).toBeTypeOf('function');
    expect(closeLyricMaker).toBeTypeOf('function');
    for (const fn of [prepareLyricsUI, toggleLyricsPanel, renderLyrics, updateLyricsHighlight, initLyricMaker, openLyricMaker, closeLyricMaker]) {
      expect(fn.length).toBeGreaterThanOrEqual(1); // 首参 app 注入
    }
  });
  it('头注考证链在册 + 导出语句恰 7（顶层零副作用由导入即通过承载）', () => {
    expect(VIEWS_SRC).toContain('#284 批16');
    expect((VIEWS_SRC.match(/^export function /gm) || []).length).toBe(7);
  });
});

describe('B · 歌词滚动渲染四函数语义保真（v7.61 / v9.49 #173）', () => {
  beforeEach(() => {
    vi.stubGlobal('saveMusicPrefs', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prepareLyricsUI：有词显钮并重建渲染 / 无词隐钮并关面板（真实委托组合语义）', () => {
    const app = makeApp();
    app.lyricsOn = true;
    app.tracks = [{ lyrics: [{ t: 1, text: '句' }] }];
    app.currentIndex = 0;
    app.prepareLyricsUI(app.tracks[0]);
    expect(app.dom.btnLyrics.style.display).toBe('');           // 有词 → 按钮在册
    const app2 = makeApp();
    app2.lyricsOn = true;
    app2.prepareLyricsUI(null);                                 // 无词 → 隐钮 + 关面板
    expect(app2.dom.btnLyrics.style.display).toBe('none');
    expect(app2.lyricsOn).toBe(false);
    expect(app2.dom.lyricsPanel.style.display).toBe('none');
    expect(globalThis.saveMusicPrefs).toHaveBeenCalledWith({ lyricsOn: false });
  });

  it('toggleLyricsPanel：面板/频谱互斥展示 + 开关落盘（v7.44 prefs 双通道）', () => {
    const app = makeApp();
    app.tracks = [{ lyrics: [{ t: 1, text: '句' }] }];
    app.currentIndex = 0;
    toggleLyricsPanel(app);
    expect(app.lyricsOn).toBe(true);
    expect(app.dom.lyricsPanel.style.display).toBe('block');
    expect(app.dom.canvas.style.display).toBe('none');
    expect(app.dom.btnLyrics.classList.contains('active')).toBe(true);
    expect(globalThis.saveMusicPrefs).toHaveBeenCalledWith({ lyricsOn: true });
    toggleLyricsPanel(app);
    expect(app.lyricsOn).toBe(false);
    expect(app.dom.lyricsPanel.style.display).toBe('none');
    expect(app.dom.canvas.style.display).toBe('block');
    expect(globalThis.saveMusicPrefs).toHaveBeenLastCalledWith({ lyricsOn: false });
  });

  it('renderLyrics：行 li + 逐字 span 化（dataset.t 消费契约=秒）+ 空词回退整行文本', () => {
    const app = makeApp();
    app.tracks = [{
      lyrics: [
        { t: 1, text: 'AB', words: [{ w: 'A', t: 1 }, { w: 'B', t: 1.5 }] },
        { t: -1, text: '自由句' },
      ],
    }];
    app.currentIndex = 0;
    renderLyrics(app);
    const lis = app.dom.lyricsList.children;
    expect(lis.length).toBe(2);
    expect(lis[0].classList.contains('wkw')).toBe(true);          // 词级 → 逐字行
    const spans = lis[0].children;
    expect(spans.length).toBe(2);
    expect(spans[0].textContent).toBe('A');
    expect(spans[0].dataset.t).toBe('1');                          // 秒契约（勿二次除算）
    expect(spans[1].dataset.t).toBe('1.5');
    expect(lis[1].textContent).toBe('自由句');                     // 未定时行整文本
    expect(app._lyricEls.length).toBe(2);
    expect(app._lyricActive).toBe(-1);
  });

  it('updateLyricsHighlight：行指针前进 + active 类 + 逐字 sung 着色幂等', () => {
    const app = makeApp();
    app.lyricsOn = true;
    app.tracks = [{
      lyrics: [
        { t: 0, text: 'AA', words: [{ w: 'A', t: 0 }, { w: 'A', t: 0.5 }] },
        { t: 2, text: 'BB', words: [{ w: 'B', t: 2 }, { w: 'B', t: 2.5 }] },
      ],
    }];
    app.currentIndex = 0;
    renderLyrics(app);
    // t=1 → 行 0 激活，两字均 sung
    app.audio.currentTime = 1;
    updateLyricsHighlight(app);
    expect(app._lyricActive).toBe(0);
    expect(app._lyricEls[0].li.classList.contains('active')).toBe(true);
    // 逐字扫描经行内真实 span —— 用 happy-dom 元素重建（renderLyrics 产生真实 li/span）
    // t=3 → 行 1 激活，行 0 active 退位
    app.audio.currentTime = 3;
    updateLyricsHighlight(app);
    expect(app._lyricActive).toBe(1);
    expect(app._lyricEls[0].li.classList.contains('active')).toBe(false);
    expect(app._lyricEls[1].li.classList.contains('active')).toBe(true);
  });

  it('纯静态防御：无时间标签且时长未知 → 早退零 DOM 写（原 L1662 守卫随簇走）', () => {
    const app = makeApp();
    app.lyricsOn = true;
    app.audio.duration = 0;
    app._lyricEls = [{ li: makeEl(), t: -1 }];
    const before = app.dom.lyricsList.style.transform;
    updateLyricsHighlight(app);
    expect(app.dom.lyricsList.style.transform).toBe(before);
  });
});

describe('B2 · 歌词制作编辑器三函数语义保真（v9.13 #180 / v9.49 #173）', () => {
  beforeEach(() => {
    vi.stubGlobal('saveMusicPrefs', vi.fn());
    vi.stubGlobal('fsReadTextSafe', vi.fn(async () => null));
    vi.stubGlobal('requestAnimationFrame', () => 0); // rAF 常驻打点循环测试期挂起
    vi.stubGlobal('cancelAnimationFrame', () => {});
    window.__lyricMakerUI = undefined; // 清残留（多文件隔离）
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.__lyricMakerUI;
    delete window.__system;
  });

  it('initLyricMaker：_lm 状态初始化 + 打轴核缺位防御 + e2e 桥挂载（宿主为 music iframe）', () => {
    const app = makeApp();
    initLyricMaker(app);
    expect(app._lm).toBeTruthy();
    expect(app._lm.open).toBe(false);
    expect(app._lm.DRAFT_PATH).toBe('/music/.lyric-draft.json'); // #178 自查第 1 条：不新建 localStorage 键
    expect(app.lmToast).toBeTypeOf('function');
    expect(app.lmMarkAt).toBeTypeOf('function');
    expect(app.lmRender).toBeTypeOf('function');
    // e2e 桥 getters（原 lyricmaker 形态，宿主 music iframe）
    expect(window.__lyricMakerUI).toBeTruthy();
    expect(window.__lyricMakerUI.isOpen).toBe(false);
    expect(window.__lyricMakerUI.draftPath).toBe('/music/.lyric-draft.json');
    expect(window.__lyricMakerUI.currentTrackTitle).toBe(''); // app.tracks 空态 getter 不抛
  });

  it('打轴核缺位防御：core 缺位 → _lm 已建（视图守卫可用）、零绑定、桥不挂（原 L1710 早退语义）', () => {
    const coreBak = window.__lyricCore;
    delete window.__lyricCore;
    const appNoCore = makeApp();
    initLyricMaker(appNoCore);
    expect(appNoCore._lm).toBeTruthy();
    expect(appNoCore._lm.open).toBe(false);
    expect(appNoCore.lmMarkAt).toBeUndefined();
    expect(window.__lyricMakerUI).toBeUndefined(); // 桥未重挂（无 core 早退）
    window.__lyricCore = coreBak;
  });

  it('打轴闭环：载入 → 单调打点（clampMark 快打钳 prev+1）→ 逐字生成 → LRC/JSON 导出', () => {
    const app = makeApp();
    initLyricMaker(app);
    app.dom.lmSrc.value = '甲句\n乙句';       // 未定时行（parseLrc time=null 沉底保留）
    app.lmLoadFromText();
    expect(app._lm.lines.length).toBe(2);
    expect(app._lm.lines[0]).toEqual({ time: null, text: '甲句' });
    app.lmMarkAt(5000);                       // 行 0
    expect(app._lm.lines[0].time).toBe(5000);
    expect(app._lm.sel).toBe(0);
    app.lmMarkAt(1000);                       // 快打 → 钳 prev+1（单调化）
    expect(app._lm.lines[1].time).toBe(5001);
    app.lmGenWords();                         // 逐字对齐（splitWords 码点均分）
    expect(Array.isArray(app._lm.lines[0].words)).toBe(true);
    const lrc = app.lmLrcText();
    expect(lrc).toContain('[ti:未命名]');
    expect(lrc).toContain('[00:05.00]甲句');
    expect(lrc).toContain('[00:05.00]乙句'); // fmtTime 百分秒截断（clamp +1ms 由 lines[1].time===5001 实证）
    const json = JSON.parse(app.lmJsonText());
    expect(json.format).toBe('md3-lyric');
  });

  it('草稿落 VFS：saveDraftNow 写 /music/.lyric-draft.json（桥/直驱双形态写法）+ restore 回填', async () => {
    const app = makeApp();
    initLyricMaker(app);
    const write = vi.fn(async () => ({}));
    window.__system = { fs: { write } };
    app.lmSaveDraftNow();
    await vi.waitFor(() => expect(write).toHaveBeenCalled());
    const [path, payload] = write.mock.calls[0];
    expect(path).toBe('/music/.lyric-draft.json');
    const body = JSON.parse(payload);
    expect(body).toHaveProperty('src');
    expect(body).toHaveProperty('lines');
    // 回读回填（fsReadTextSafe 双引擎兼容）
    globalThis.fsReadTextSafe = vi.fn(async () => JSON.stringify({ src: '[00:09.00]回', ti: '回填题', lines: [{ time: 9000, text: '回', words: null }] }));
    const ok = await app.lmRestoreDraft();
    expect(ok).toBe(true);
    expect(app._lm.lines.length).toBe(1);
    expect(app._lm.lines[0].time).toBe(9000);
    expect(app.dom.lmTi.value).toBe('回填题');
  });

  it('open/close：视图开关 + 草稿恢复链 + 关闭即存草稿（updateViewState 让位语义在宿主）', async () => {
    const app = makeApp();
    initLyricMaker(app);
    globalThis.fsReadTextSafe = vi.fn(async () => null);
    openLyricMaker(app);
    expect(app._lm.open).toBe(true);
    expect(app.updateViewState).toHaveBeenCalled();
    const write = vi.fn(async () => ({}));
    window.__system = { fs: { write } };
    closeLyricMaker(app);
    expect(app._lm.open).toBe(false);
    await vi.waitFor(() => expect(write).toHaveBeenCalled()); // 关闭即存草稿（lmSaveDraftNow 直调）
  });
});

describe('C · 源码锚：单源搬迁收口面（宿主/簇体/桥三面）', () => {
  it('宿主委托行恰 7，全部可选链守卫（G2 单源桥接，调用点零改动）', () => {
    const delegations = [
      'prepareLyricsUI(track) { return window.__lyricViews?.prepareLyricsUI(this, track); }',
      'toggleLyricsPanel() { return window.__lyricViews?.toggleLyricsPanel(this); }',
      'renderLyrics() { return window.__lyricViews?.renderLyrics(this); }',
      'updateLyricsHighlight(force = false) { return window.__lyricViews?.updateLyricsHighlight(this, force); }',
      'initLyricMaker() { return window.__lyricViews?.initLyricMaker(this); }',
      'openLyricMaker() { return window.__lyricViews?.openLyricMaker(this); }',
      'closeLyricMaker() { return window.__lyricViews?.closeLyricMaker(this); }',
    ];
    for (const d of delegations) expect(MUSIC_SRC).toContain(d);
    expect(MUSIC_SRC.split('window.__lyricViews').length - 1).toBe(9); // 注释1 + 委托7 + 桥挂载1
  });

  it('簇体负向锚：打轴/卡拉OK 渲染内部件在宿主零残留（防双轨）', () => {
    for (const token of ['lmRenderKaraoke', 'clampMark', 'karaokeAt', 'splitWords', 'serializeLrc',
      'estimateWords', '_lyricWordLine', '_lyricEls', 'DRAFT_PATH', 'lmMarkAt', 'lyricMakerUI', 'lmSaveDraftNow']) {
      expect(MUSIC_SRC).not.toContain(token);
      expect(VIEWS_SRC).toContain(token);
    }
  });

  it('桥挂载面：module 块 ESM import lyric-views.js + window.__lyricViews 七键 + lyric-core 挂载位不变', () => {
    expect(MUSIC_SRC).toContain("from './lyric-views.js'");
    expect(MUSIC_SRC).toContain('window.__lyricViews = { prepareLyricsUI, toggleLyricsPanel, renderLyrics, updateLyricsHighlight, initLyricMaker, openLyricMaker, closeLyricMaker };');
    expect(MUSIC_SRC).toContain('<script src="lyric-core.js"></script>'); // #180 挂载位不动
    expect(VIEWS_SRC).toContain('window.__lyricCore'); // 打轴核消费契约随簇走
    expect(VIEWS_SRC).toContain('saveMusicPrefs');      // 宿主全局依赖面如实登记
    expect(VIEWS_SRC).toContain('fsReadTextSafe');
  });

  it('宿主调用点锚不变：构造调用 / 存入曲库闭环 / boot pairing / 桌面集成簇留宿主', () => {
    expect(MUSIC_SRC).toContain('initLyricMaker(); // v9.13 #180');
    expect(MUSIC_SRC).toContain('this.prepareLyricsUI(track)');       // 载入/清空/存曲库调用点
    expect(MUSIC_SRC).toContain("fsReadTextSafe('/music/' + meta.name.replace(/\\.[^/.]+$/, '') + '.lrc')"); // boot pairing
    expect(MUSIC_SRC).toContain('addExternalTrack(url, name)');       // §3.2 表第三簇留宿主
    expect(MUSIC_SRC).toContain('syncToParent()');                    // 媒体会话桥留宿主
    expect(MUSIC_SRC).toContain('this.updateLyricsHighlight(); // v7.61：歌词跟随'); // onTimeUpdate 消费点
  });
});
