// ==================== v761-media-nav.test.js — v7.61 四线修复回归 ====================
//
// 覆盖：
//   ① scroll-fx touch 兜底管线（无法持续拉伸根修）—— pointercancel 后同手势
//      滚到顶继续外拉可 engage、拉伸保持、松手回弹；pointer 流活着时不介入
//   ② media-meta 纯逻辑层 —— ID3v2.3（TIT2/TPE1/APIC/USLT）/ FLAC / MP4 / LRC /
//      zip 分类（含 __MACOSX 过滤与同目录封面）/ tar
//   ③ 小窗子页导航（miniNav）+ 设置行点击路由 —— 源码锚定
//   ④ M3E 涟漪统一覆盖面 —— RIPPLE_SELECTOR 源码锚定

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// ==================== ① touch 兜底管线 ====================

import { state } from '../ios-desktop/js/state.js';
import {
  enhanceScrollContainer,
  getScrollFxInstances,
} from '../ios-desktop/js/scroll-fx.js';

function makeContainer({ scrollHeight = 8000, clientHeight = 800, clientWidth = 400 } = {}) {
  const el = document.createElement('div');
  el.className = 'app-page';
  document.body.appendChild(el);
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: clientHeight });
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: clientWidth });
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scrollHeight });
  Object.defineProperty(el, 'scrollTop', { configurable: true, value: 0, writable: true });
  el.getBoundingClientRect = () => ({
    left: 0, top: 0, right: clientWidth, bottom: clientHeight,
    width: clientWidth, height: clientHeight, x: 0, y: 0,
  });
  return el;
}

/** happy-dom 无 Touch 构造器：普通 Event 附加 touch 通道属性（passive 监听器只读） */
function touchEvt(type, identifier, clientY, clientX = 100) {
  const e = new Event(type, { bubbles: true });
  Object.defineProperties(e, {
    changedTouches: { value: [{ identifier, clientY, clientX }] },
    touches: { value: [{ identifier, clientY, clientX }] },
  });
  return e;
}

function pointerEvt(type, opts = {}) {
  return new PointerEvent(type, {
    pointerId: 1, pointerType: 'touch', button: 0, bubbles: true,
    clientX: 100, clientY: 400, ...opts,
  });
}

describe('v7.61 scroll-fx touch 兜底管线', () => {
  let rafQ;
  beforeEach(() => {
    rafQ = [];
    vi.stubGlobal('requestAnimationFrame', (cb) => { rafQ.push(cb); return rafQ.length; });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} });
    vi.useFakeTimers({ toFake: ['performance', 'setTimeout', 'clearTimeout'] });
    state.isDragging = false;
    state.popInProgress = false;
    document.body.innerHTML = '';
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function pump(n = 3) { for (let i = 0; i < n; i++) { const q = rafQ.splice(0); q.forEach((cb) => cb()); } }

  it('原生滚动夺走 pointer 流后（pointercancel），同手势触顶外拉 engage 拉伸', () => {
    const el = makeContainer();
    const fx = enhanceScrollContainer(el);
    // 模拟真实时序：按下 → 移动（浏览器开始滚动）→ pointercancel
    el.dispatchEvent(pointerEvt('pointerdown', { clientY: 600 }));
    el.dispatchEvent(pointerEvt('pointermove', { clientY: 500 }));
    el.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, pointerType: 'touch', bubbles: true }));
    expect(fx._pointerId).toBe(null); // pointer 流已断
    // touch 通道：从滚动中段开始（anchor 未建）
    el.dispatchEvent(touchEvt('touchstart', 7, 500));
    el.scrollTop = 300;
    el.dispatchEvent(touchEvt('touchmove', 7, 460));   // 仍在滚动中：不 engage
    expect(fx._tEngaged).toBe(false);
    el.scrollTop = 0;                                   // 滚到顶
    el.dispatchEvent(touchEvt('touchmove', 7, 450));    // 触顶锚点建立
    el.dispatchEvent(touchEvt('touchmove', 7, 452));    // 微动：死区内
    expect(fx._tEngaged).toBe(false);
    el.dispatchEvent(touchEvt('touchmove', 7, 470));    // 净外拉 20px > slop → engage
    expect(fx._tEngaged).toBe(true);
    expect(el.classList.contains('md-fx-pulling')).toBe(true);
    el.dispatchEvent(touchEvt('touchmove', 7, 620));     // 继续外拉 +150px（增量喂入）
    expect(fx.edgeTop.getDistance()).toBeGreaterThan(0); // EdgeEffect 已收到拉距（STATE_PULL）
    pump();
    expect(el.style.transform).toContain('scale(1,');    // 拉伸已上屏
  });

  it('engage 后持续外拉增量喂入 → 拉伸保持并增长（STATE_PULL 恒保持语义）', () => {
    const el = makeContainer();
    const fx = enhanceScrollContainer(el);
    el.dispatchEvent(pointerEvt('pointerdown', { clientY: 600 }));
    el.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, pointerType: 'touch', bubbles: true }));
    el.dispatchEvent(touchEvt('touchstart', 7, 500));
    el.dispatchEvent(touchEvt('touchmove', 7, 500)); // 锚点
    el.dispatchEvent(touchEvt('touchmove', 7, 520)); // engage
    pump();
    const s1 = parseFloat((el.style.transform.match(/scale\(1, ([\d.]+)\)/) || [])[1] || '1');
    el.dispatchEvent(touchEvt('touchmove', 7, 560)); // 继续外拉 +40px
    pump();
    const s2 = parseFloat((el.style.transform.match(/scale\(1, ([\d.]+)\)/) || [])[1] || '1');
    // 停住不动也不回弹（拉住保持）——多发同位置 move 不衰减
    for (let i = 0; i < 5; i++) el.dispatchEvent(touchEvt('touchmove', 7, 560));
    pump();
    const s3 = parseFloat((el.style.transform.match(/scale\(1, ([\d.]+)\)/) || [])[1] || '1');
    expect(s2).toBeGreaterThan(s1);
    expect(s3).toBe(s2); // STATE_PULL：停住恒保持，绝不自行回落
  });

  it('松手（touchend）→ onRelease → 弹簧回弹清理', () => {
    const el = makeContainer();
    const fx = enhanceScrollContainer(el);
    el.dispatchEvent(pointerEvt('pointerdown', { clientY: 600 }));
    el.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, pointerType: 'touch', bubbles: true }));
    el.dispatchEvent(touchEvt('touchstart', 7, 500));
    el.dispatchEvent(touchEvt('touchmove', 7, 500));
    el.dispatchEvent(touchEvt('touchmove', 7, 540));
    expect(fx._tEngaged).toBe(true);
    el.dispatchEvent(touchEvt('touchend', 7, 540));
    expect(fx._tEngaged).toBe(false);
    expect(el.classList.contains('md-fx-pulling')).toBe(false);
    pump();
    vi.advanceTimersByTime(2000); // 弹簧收敛
    pump();
    expect(el.style.transform).toBe(''); // 回弹后清场
  });

  it('pointer 流活着时 touch 管线不介入（防双通道同帧双喂）', () => {
    const el = makeContainer();
    const fx = enhanceScrollContainer(el);
    el.dispatchEvent(pointerEvt('pointerdown', { clientY: 600 }));
    el.dispatchEvent(touchEvt('touchstart', 7, 500));
    el.scrollTop = 0;
    el.dispatchEvent(touchEvt('touchmove', 7, 560)); // 即便净外拉超死区
    expect(fx._tEngaged).toBe(false);                // pointer 管线在管，touch 不抢
  });

  it('增强容器同步声明 overscroll-behavior-y:contain（阻断浏览器自身 overscroll）', () => {
    const el = makeContainer();
    enhanceScrollContainer(el);
    expect(el.style.overscrollBehaviorY).toBe('contain');
  });
});

// ==================== ② media-meta 纯逻辑层 ====================

import {
  parseLrc, parseId3, parseFlac, parseMp4, parseAudioMeta,
  classifyZipEntries, coverForAudio, parseTar, basenameNoExt,
} from '../ios-desktop/js/media-meta.js';

const enc = new TextEncoder();
const u8 = (...bytes) => new Uint8Array(bytes);
const cat = (...arrs) => {
  const len = arrs.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
};
const u32leBuf = (n) => u8(n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff);
const u32beBuf = (n) => u8((n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff);

function id3Frame(id, body) {
  const head = u8(...enc.encode(id), (body.length >>> 24) & 0xff, (body.length >>> 16) & 0xff, (body.length >>> 8) & 0xff, body.length & 0xff, 0, 0);
  return cat(head, body);
}

describe('v7.61 media-meta — parseLrc', () => {
  it('单行多时间标签 / 2~3 位毫秒 / 升序排序', () => {
    const lrc = parseLrc('[00:12.5][01:02.30]副歌一句\n[00:03.100]开头\n');
    expect(lrc).toHaveLength(3);
    expect(lrc[0].t).toBeCloseTo(3.1, 2);
    expect(lrc[0].text).toBe('开头');
    expect(lrc[1].t).toBeCloseTo(12.5, 2);
    expect(lrc[2].t).toBeCloseTo(62.3, 2);
  });

  it('[offset:±ms] 全局偏移与元数据行跳过', () => {
    const lrc = parseLrc('[ti:歌名]\n[offset:+500]\n[00:10.00]A\n');
    expect(lrc).toHaveLength(1);
    expect(lrc[0].t).toBeCloseTo(9.5, 2); // 10s - 0.5s
  });
});

describe('v7.61 media-meta — ID3v2.3', () => {
  function buildId3(frames) {
    const body = cat(...frames);
    const size = body.length;
    const header = u8(0x49, 0x44, 0x33, 3, 0, 0,
      (size >>> 21) & 0x7f, (size >>> 14) & 0x7f, (size >>> 7) & 0x7f, size & 0x7f);
    return cat(header, body);
  }

  it('TIT2/TPE1 文本帧与 APIC 封面（front cover 优先）/ USLT 同步歌词', () => {
    const png = cat(u8(0x89, 0x50, 0x4e, 0x47), u8(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36));
    const apicBody = cat(u8(3), enc.encode('image/png'), u8(0), u8(3), enc.encode(''), u8(0), png);
    const usltBody = cat(u8(3), enc.encode('eng'), u8(0), enc.encode('[00:01.00]你好\n[00:05.00]世界'));
    const tag = buildId3([
      id3Frame('TIT2', cat(u8(3), enc.encode('真实标题'))),
      id3Frame('TPE1', cat(u8(3), enc.encode('真实歌手'))),
      id3Frame('APIC', apicBody),
      id3Frame('USLT', usltBody),
    ]);
    const meta = parseId3(tag);
    expect(meta.title).toBe('真实标题');
    expect(meta.artist).toBe('真实歌手');
    expect(meta.cover).toBeTruthy();
    expect(meta.cover.mime).toBe('image/png');
    expect(meta.lyricsSynced).toBe(true);
    expect(meta.lyrics).toContain('你好');
  });

  it('parseAudioMeta 容器识别（ID3 头自动路由）', () => {
    const tag = buildId3([id3Frame('TIT2', cat(u8(3), enc.encode('X')))]);
    expect(parseAudioMeta(cat(tag, u8(0, 0, 0, 0))).title).toBe('X');
  });
});

describe('v7.61 media-meta — FLAC / MP4', () => {
  it('FLAC VORBIS_COMMENT 标签 + PICTURE block', () => {
    const kv = (s) => { const b = enc.encode(s); return cat(u32leBuf(b.length), b); };
    const vcBody = cat(
      u32leBuf(4), enc.encode('ref '),
      u32leBuf(2),
      kv('TITLE=范特西'),
      kv('LYRICS=[00:01.00]快使用双截棍')
    );
    const picData = u8(0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32);
    const picBody = cat(
      u32beBuf(3), u32beBuf(10), enc.encode('image/jpeg'),
      u32beBuf(0), u32beBuf(100), u32beBuf(100), u32beBuf(24), u32beBuf(0),
      u32beBuf(picData.length), picData
    );
    const flac = cat(
      enc.encode('fLaC'),
      u8(0x04), u8((vcBody.length >>> 16) & 0xff, (vcBody.length >>> 8) & 0xff, vcBody.length & 0xff), vcBody,
      u8(0x86), u8((picBody.length >>> 16) & 0xff, (picBody.length >>> 8) & 0xff, picBody.length & 0xff), picBody
    );
    const meta = parseFlac(flac);
    expect(meta.title).toBe('范特西');
    expect(meta.lyricsSynced).toBe(true);
    expect(meta.cover.mime).toBe('image/jpeg');
    expect(meta.cover.data[0]).toBe(0xff);
  });

  it('MP4 ilst covr / ©nam / ©lyr', () => {
    const png = u8(0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33);
    const box = (type, body) => cat(u32beBuf(body.length + 8), enc.encode(type), body);
    // MP4 atom type 是原始四字节（© = 单字节 0xA9，非 UTF-8 双字节）
    const rawBox = (typeBytes, body) => cat(u32beBuf(body.length + 8), typeBytes, body);
    const dataAtom = (flags, payload) => rawBox(u8(0x64, 0x61, 0x74, 0x61), cat(u8(0, (flags >>> 16) & 0xff, (flags >>> 8) & 0xff, flags & 0xff), u8(0, 0, 0, 0), payload));
    const covr = rawBox(u8(0x63, 0x6f, 0x76, 0x72), dataAtom(14, png));
    const nam = rawBox(u8(0xA9, 0x6e, 0x61, 0x6d), dataAtom(1, enc.encode('以父之名')));
    const lyr = rawBox(u8(0xA9, 0x6c, 0x79, 0x72), dataAtom(1, enc.encode('[00:09.00]低着头 期待白昼')));
    const ilst = box('ilst', cat(covr, nam, lyr));
    const metaAtom = cat(u8(0, 0, 0, 0), ilst);
    const udta = box('udta', box('meta', metaAtom));
    const moov = box('moov', udta);
    const ftyp = cat(u32beBuf(16), enc.encode('ftyp'), enc.encode('M4A '), u8(0, 0, 0, 0));
    const meta = parseMp4(cat(ftyp, moov));
    expect(meta.title).toBe('以父之名');
    expect(meta.lyricsSynced).toBe(true);
    expect(meta.cover.mime).toBe('image/png');
  });
});

describe('v7.61 media-meta — 压缩包分类', () => {
  it('音频/歌词/封面分类 + __MACOSX 过滤 + basename 配对键', () => {
    const cls = classifyZipEntries([
      { path: '专辑/01 - 夜曲.mp3', data: u8(1, 2, 3, 4, 5, 6, 7, 8) },
      { path: '专辑/02 - 菊花台.flac', data: u8(1, 2, 3, 4, 5, 6, 7, 8) },
      { path: '专辑/01 - 夜曲.lrc', data: enc.encode('[00:01.00]一群嗜血的蚂蚁') },
      { path: '专辑/cover.jpg', data: u8(0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16) },
      { path: '__MACOSX/专辑/._01 - 夜曲.mp3', data: u8(1, 2, 3) },
      { path: '说明.txt', data: enc.encode('没有时间戳的纯文本') },
    ]);
    expect(cls.audio).toHaveLength(2);
    expect(cls.audio[0].name).toBe('01 - 夜曲.mp3');
    expect(cls.lyrics.has('01 - 夜曲')).toBe(true);
    expect(cls.covers).toHaveLength(1);
    expect(cls.covers[0].mime).toBe('image/jpeg');
    expect(cls.lyrics.get(basenameNoExt('专辑/01 - 夜曲.lrc'))).toContain('蚂蚁');
  });

  it('coverForAudio 同目录优先于全局', () => {
    const covers = [
      { path: 'root.jpg', mime: 'image/jpeg', data: u8(1), dir: '', score: -1 },
      { path: '专辑/folder.png', mime: 'image/png', data: u8(1), dir: '专辑/', score: -1 },
    ];
    const pick = coverForAudio(covers, '专辑/01.mp3');
    expect(pick.mime).toBe('image/png');
  });

  it('parseTar 解析 512 字节头（含数据对齐）', () => {
    const mkHead = (name, size) => {
      const h = new Uint8Array(512);
      h.set(enc.encode(name).subarray(0, 99), 0);
      h.set(enc.encode('0000644\u0000'), 100);
      h.set(enc.encode(size.toString(8).padStart(11, '0') + '\u0000'), 124);
      h[156] = 0x30;
      h.set(enc.encode('ustar'), 257);
      return h;
    };
    const payload = u8(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
    const padded = cat(payload, new Uint8Array(512 - payload.length));
    const tar = cat(mkHead('专辑/夜曲.mp3', payload.length), padded, new Uint8Array(1024));
    const files = parseTar(tar);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('专辑/夜曲.mp3');
    expect(files[0].data).toHaveLength(10);
  });
});

// ==================== ③ 小窗子页导航 / ④ 涟漪统一（源码锚定） ====================

describe('v7.61 小窗子页导航（miniNav）源码锚定', () => {
  const src = read('ios-desktop/js/mini-window.js');
  it('header 返回键 + navStack + 位姿三态（活动/压暗/右侧隐藏）', () => {
    expect(src).toContain('data-act="back"');
    expect(src).toContain('navStack: [0]');
    expect(src).toContain('function miniNavPage(m, pageIdx)');
    expect(src).toContain('function miniNavPop(m)');
    expect(src).toContain('ensureMiniPagePoses');
    expect(src).toContain("filter = 'brightness(0.65)'");
    expect(src).toContain("translate3d(100%, 0, 0)");
  });
  it('__miniNav 桥注册 + 设置行小窗路由', () => {
    expect(src).toContain('window.__miniNav = (appId, pageIdx)');
    const tp = read('ios-desktop/js/apps/settings-two-pane.js');
    expect(tp).toContain("rowEl.closest('.mini-body')");
    expect(tp).toContain('window.__miniNav(appId, pageIdx)');
  });
});

describe('v7.61 M3E 涟漪统一覆盖面', () => {
  it('RIPPLE_SELECTOR 纳入宿主全部可点反馈组件', () => {
    const src = read('ios-desktop/js/ripple-fx.js');
    for (const sel of ['.tp-row', '.noti-card', '.noti-footer-btn', '.qs-action-btn',
      '.panel-tab-pill-btn', '.power-action-tile', '.back-btn', '.mini-btn', "'button'"]) {
      expect(src).toContain(sel);
    }
  });
});
