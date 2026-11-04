// ==================== clock-font-loader.js — 时钟字体宿主加载器（v9.80 · #20） ====================
// #188 时钟字体族（v9.29 vendor 化）此前仅 clock-app iframe 内消费（app.mjs 自带
// loadClockFontFontFace）。#20 表盘系统令锁屏（宿主文档）/ AOD / 设置字体卡三处消费
// 同一字体族——按 app.mjs L96「一处实现两处引用」预留声明升格为本加载器：
//   - 数据源：aosp/clock-faces.js CLOCK_FONT_SOURCES（纯数据，本文件做 DOM 侧加载）
//   - vendor 三字体：fetch → FontFace → document.fonts.add（同源零 CORS，6s 超时
//     静默回落——clock-app loadClockFontFontFace 同参纪律）
//   - gsflex：<link> 注入 fonts.googleapis.com（跨域样式表免 FontFace CORS；
//     clock-app applyClockFont css 分支同路），失败静默（离线回落 RobotoFlex）
//   - user：零加载（--custom-user-font 变量由 #187 wallpaper.js 管）
// 加载成功表幂等缓存；失败也缓存（本会话不重试——离线场景避免每次刷新时钟都打网络）
import { CLOCK_FONT_SOURCES, clockFontStack } from './aosp/clock-faces.js';

const loadedOk = new Set();
const failed = new Set();
const pending = new Map();

function loadVendorFont(src) {
  return new Promise((resolve) => {
    const done = (ok) => { ok ? loadedOk.add(src.id) : failed.add(src.id); pending.delete(src.id); resolve(ok); };
    const tmr = setTimeout(() => done(false), 6000);
    try {
      fetch(src.url).then((r) => {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.arrayBuffer();
      }).then((buf) => {
        const ff = new FontFace(src.family, buf);
        return ff.load();
      }).then((loaded) => {
        document.fonts.add(loaded);
        clearTimeout(tmr);
        done(true);
      }).catch(() => { clearTimeout(tmr); done(false); });
    } catch (e) { clearTimeout(tmr); done(false); }
  });
}

function loadCssFont(src) {
  return new Promise((resolve) => {
    try {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      // onerror 先挂后赋 href（v9.31 #188 建议③防缓存命中瞬间漏接同构）
      l.onerror = () => { failed.add(src.id); pending.delete(src.id); resolve(false); };
      l.onload = () => { loadedOk.add(src.id); pending.delete(src.id); resolve(true); };
      l.href = src.url;
      document.head.appendChild(l);
      // CDN 假活兜底：5s 仍无 fonts.check 命中按失败计（在线慢网不阻塞——字体加载
      // 与字体栈解耦，失败仅回落族链，不阻塞任何渲染路径）
      setTimeout(() => {
        if (pending.has(src.id) && !(document.fonts && document.fonts.check(`16px '${src.family}'`))) {
          pending.delete(src.id);
          resolve(false);
        }
      }, 5000);
    } catch (e) { failed.add(src.id); pending.delete(src.id); resolve(false); }
  });
}

/**
 * 确保时钟字体就绪（幂等；重复调用同一 id 返回缓存结果）。
 * @returns {Promise<boolean>} true = 字体可用（或无需加载），false = 失败（调用方回落）
 */
export function ensureClockFontLoaded(id) {
  const src = CLOCK_FONT_SOURCES.find((x) => x.id === id);
  if (!src) return Promise.resolve(false);
  if (!src.family) return Promise.resolve(true); // system / user 零加载
  if (loadedOk.has(id)) return Promise.resolve(true);
  if (failed.has(id)) return Promise.resolve(false);
  if (pending.has(id)) return pending.get(id);
  const p = src.css ? loadCssFont(src) : loadVendorFont(src);
  pending.set(id, p);
  return p;
}

/**
 * 当前生效字体栈：读存储（缺载/损坏回落 system）→ clockFontStack 合成。
 * system → null（调用方保留脸默认栈）；失败字体仍返回族链（CSS 回落机制接管视觉，
 * 不因加载失败改变语义栈——与 clock-app setClockDigitVar 失败仍写 var 同向）。
 */
export function getActiveClockFontStack(storage = localStorage) {
  let id = 'system';
  try { id = JSON.parse(storage.getItem('ios-desktop:clock-font-v1') || '{"id":"system"}').id || 'system'; } catch (e) {}
  return clockFontStack(CLOCK_FONT_SOURCES.some((s) => s.id === id) ? id : 'system');
}

/** 观测面（e2e/vitest）：加载器状态只读 */
export function clockFontLoaderDebug() {
  return { ok: [...loadedOk], failed: [...failed], pending: [...pending.keys()] };
}
