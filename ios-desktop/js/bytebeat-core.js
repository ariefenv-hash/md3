// ==================== bytebeat-core.js — ByteBeat 公式沙箱核心 (v8.42 #30) ====================
// 公式即音乐：公式字符串 → 白名单沙箱编译 → 离屏采样 → 波形/频谱数据。
// 经典脚本 IIFE 挂 window.__bytebeatCore（fx/word/terminal/piano-core 同款模式）；
// 顶层零副作用（除挂载自身外不触碰任何宿主对象），vitest 以 new Function 沙箱直驱。
//
// 安全模型（超越 nightsky 的无限制编译，#30 验收锚）：
//   1. 标识符白名单：仅放行 t 与 Math —— document/window/fetch 等编译即拒绝；
//   2. 字符串/模板/注释先剥离再扫描（字面量内容不误伤、注释不可藏污）；
//   3. 点号属性豁免仅限 Math.<成员>（constructor/__proto__ 永拒），
//      t.<属性> 一律拒绝（堵 t.constructor 类逃逸）；
//   4. 赋值表达式整体拒绝（公式是纯表达式语言）；
//   5. 编译时把 t/Math 作为形参注入（遮蔽外层），公式内对它们的改写只影响局部。
(function () {
  'use strict';

  // ---------- 常量 ----------
  var SR_RATES = [8000, 11025, 22050, 32000, 48000]; // 采样率菜单（#30 验收：8k~48k 可选）
  var MODES = ['byte', 'float'];
  var CHUNK_SECONDS = 6;   // 单块离屏时长：无缝排程 + 主线程单次渲染 <8ms
  var FFT_SIZE = 2048;     // 频谱窗口（2 的幂，radix-2）
  var SHARE_MAGIC = 'b1';  // 分享码版本头

  var ALLOWED = { t: true, Math: true };
  // 点号属性黑名单（即便基址是 Math 也永拒——构造器逃逸通道）
  // 注意：__proto__ 两连坑（首跑真 bug）——对象字面量与 Object.assign 的源字面量
  // 都会触发原型 setter 而非自有属性；唯一正解是无原型空对象 + defineProperty 落键。
  var PROP_DENY = Object.create(null);
  PROP_DENY.constructor = true;
  PROP_DENY.prototype = true;
  PROP_DENY.call = true;
  PROP_DENY.apply = true;
  PROP_DENY.bind = true;
  Object.defineProperty(PROP_DENY, '__proto__', { value: true, enumerable: true, writable: true, configurable: true });

  // ---------- 经典公式库（greggman/html5bytebeat 与 viznut 收集的传世条目） ----------
  var FORMULAS = [
    { name: '开缸神曲',   src: '((t >> 10) & 42) * t' },
    { name: 'viznut 之钟', src: 't * ((t >> 12 | t >> 8) & 63 & t >> 4)' },
    { name: '四十二',     src: 't * (42 & t >> 10)' },
    { name: '双管齐下',   src: 't * ((t >> 9 | t >> 13) & 25 & t >> 6)' },
    { name: '层层深入',   src: '(t * (t >> 5 | t >> 8)) >> (t >> 16)' },
    { name: '五三和鸣',   src: '(t * 5 & t >> 7) | (t * 3 & t >> 10)' },
    { name: '异或星空',   src: '((t * (t >> 8 | t >> 9) & 46 & t >> 8)) ^ (t & t >> 13)' },
    { name: '八音盒',     src: '(t * (0xCA98 >> (t >> 15 & 7) & 15)) | t >> 8' },
    { name: '细雨敲窗',   src: 't * (t >> 11 & t >> 8 & 123 & t >> 3)' },
    { name: '回声长廊',   src: '(t >> 7 | t | t >> 6) * 10 + 4 * (t & t >> 13 | t >> 6)' },
    { name: '正弦哨声',   src: '128 + Math.floor(64 * Math.sin(t / 24) * Math.sin(t / 97))' },
    { name: '阶梯律动',   src: '(t & 64) ? (t >> 4) : -(t >> 6)' }
  ];

  // ---------- 字面量/注释剥离（扫描前处理；字面量占位为 0 保持表达式结构） ----------
  function stripLiterals(src) {
    var out = '';
    var i = 0;
    var n = src.length;
    while (i < n) {
      var c = src.charAt(i);
      if (c === "'" || c === '"' || c === '`') {
        i++;
        while (i < n && src.charAt(i) !== c) {
          if (src.charAt(i) === '\\') i++; // 跳过转义
          i++;
        }
        i++; // 收尾引号
        out += ' 0 ';
      } else if (c === '/' && src.charAt(i + 1) === '/') {
        while (i < n && src.charAt(i) !== '\n') i++;
      } else if (c === '/' && src.charAt(i + 1) === '*') {
        i += 2;
        while (i < n && !(src.charAt(i) === '*' && src.charAt(i + 1) === '/')) i++;
        i += 2;
        out += ' ';
      } else {
        out += c;
        i++;
      }
    }
    return out;
  }

  // ---------- 单个 = 的赋值侦测（==,<=,>=,!= 放行；+=,-= 等复合赋值同拒） ----------
  function hasAssignment(clean) {
    var i = clean.indexOf('=');
    while (i >= 0) {
      var prev = i > 0 ? clean.charAt(i - 1) : '';
      var next = i + 1 < clean.length ? clean.charAt(i + 1) : '';
      var cmp = next === '=' || prev === '<' || prev === '>' || prev === '!' || prev === '=';
      if (!cmp) return true;
      i = clean.indexOf('=', i + 1);
    }
    return false;
  }

  // ---------- 白名单扫描：返回首个非法标识符（null = 通过） ----------
  function findIllegalIdent(src) {
    var clean = stripLiterals(src);
    if (hasAssignment(clean)) return '=（公式为纯表达式，不允许赋值）';
    var re = /[A-Za-z_$][\w$]*/g;
    var m;
    while ((m = re.exec(clean)) !== null) {
      var name = m[0];
      var prevCh = m.index > 0 ? clean.charAt(m.index - 1) : '';
      if (/\d/.test(prevCh)) continue;           // 数字字面量尾巴（0xCA98 / 1e5 / 0b101）非标识符
      var j = m.index - 1;                       // 前一非空白字符
      while (j >= 0 && /\s/.test(clean.charAt(j))) j--;
      var afterDot = j >= 0 && clean.charAt(j) === '.';
      if (afterDot) {
        var k = m.index - 2;                     // 属性基址标识符
        while (k >= 0 && /[\s.]/.test(clean.charAt(k))) k--;
        var baseEnd = k + 1;
        var baseStart = baseEnd;
        while (baseStart > 0 && /[\w$]/.test(clean.charAt(baseStart - 1))) baseStart--;
        var base = clean.slice(baseStart, baseEnd);
        // own-property 严格判定：裸用对象字面量会沿原型链误放行 constructor/toString 等（本轮首跑真 bug）
        if (base === 'Math' && !Object.prototype.hasOwnProperty.call(PROP_DENY, name)) continue;
        return name;
      }
      if (!Object.prototype.hasOwnProperty.call(ALLOWED, name)) return name;
    }
    return null;
  }

  // ---------- 沙箱编译（#30 验收：非法标识符编译即拒绝） ----------
  function compileFormula(src) {
    if (typeof src !== 'string' || !src.trim()) {
      return { ok: false, error: '公式为空 —— 输入一个关于 t 的表达式' };
    }
    var bad = findIllegalIdent(src);
    if (bad) return { ok: false, error: '编译拒绝：标识符 ' + bad + ' 不在白名单（仅放行 t 与 Math）' };
    try {
      // t/Math 作形参注入（遮蔽外层同名，公式内的改写只影响局部作用域）
      var fn = new Function('t', 'Math', '"use strict";\nreturn (\n' + src + '\n);');
      fn(1, Math); // 编译期自检：求值通路冒烟
      return { ok: true, fn: fn };
    } catch (err) {
      return { ok: false, error: '语法错误：' + (err && err.message ? err.message : '无法编译') };
    }
  }

  // ---------- 采样归一（byte：取低 8 位映射 [-1,1]；float：直读并钳制） ----------
  function sampleNorm(v, mode) {
    if (mode === 'float') {
      var x = +v;
      if (!isFinite(x)) return 0;
      return x < -1 ? -1 : x > 1 ? 1 : x;
    }
    return ((v & 255) / 127.5) - 1;
  }

  // ---------- 离屏渲染：纯数据 Float32Array（播放线程只读，#30 零卡顿锚） ----------
  function renderChunk(fn, tStart, sampleRate, seconds, mode) {
    var n = Math.max(1, Math.floor(sampleRate * seconds));
    var data = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var v = 0;
      try { v = fn(tStart + i, Math); } catch (err) { v = 0; }
      data[i] = sampleNorm(v, mode);
    }
    return data;
  }

  // ---------- radix-2 FFT（迭代位反转版，频谱可视化数据源） ----------
  function fftMagnitudes(samples) {
    var n = samples.length;
    if (n < 2 || (n & (n - 1)) !== 0) return null; // 须为 2 的幂
    var re = new Float64Array(n);
    var im = new Float64Array(n);
    var i, j;
    for (i = 0; i < n; i++) re[i] = samples[i];
    for (i = 1, j = 0; i < n; i++) {
      var bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        var tr = re[i]; re[i] = re[j]; re[j] = tr;
        var ti = im[i]; im[i] = im[j]; im[j] = ti;
      }
    }
    for (var len = 2; len <= n; len <<= 1) {
      var ang = -2 * Math.PI / len;
      var wr = Math.cos(ang), wi = Math.sin(ang);
      var half = len >> 1;
      for (i = 0; i < n; i += len) {
        var cr = 1, ci = 0;
        for (var k = 0; k < half; k++) {
          var ar = re[i + k], ai = im[i + k];
          var br = re[i + k + half], bi = im[i + k + half];
          var vr = br * cr - bi * ci;
          var vi = br * ci + bi * cr;
          re[i + k] = ar + vr; im[i + k] = ai + vi;
          re[i + k + half] = ar - vr; im[i + k + half] = ai - vi;
          var ncr = cr * wr - ci * wi;
          ci = cr * wi + ci * wr;
          cr = ncr;
        }
      }
    }
    var mags = new Float64Array(n >> 1);
    for (i = 0; i < (n >> 1); i++) {
      mags[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]) / n;
    }
    return mags;
  }

  function peakBin(mags) {
    var idx = 0;
    for (var i = 1; i < mags.length; i++) if (mags[i] > mags[idx]) idx = i;
    return idx;
  }

  // ---------- Hann 窗（频谱绘制前整形，抑制泄漏） ----------
  function hannWindow(samples) {
    var n = samples.length;
    var out = new Float64Array(n);
    for (var i = 0; i < n; i++) out[i] = samples[i] * 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
    return out;
  }

  // ---------- 分享码：URL-safe base64（自研 utf8 → b64url，零依赖无弃用 API） ----------
  var B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

  function utf8Bytes(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var cp = str.codePointAt(i);
      if (cp > 0xffff) i++; // 代理对整体前进
      if (cp < 0x80) out.push(cp);
      else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
      else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
      else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    }
    return out;
  }

  function bytesToB64url(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i += 3) {
      var b0 = bytes[i];
      var b1 = i + 1 < bytes.length ? bytes[i + 1] : -1;
      var b2 = i + 2 < bytes.length ? bytes[i + 2] : -1;
      out += B64URL[b0 >> 2];
      out += B64URL[((b0 & 3) << 4) | (b1 >= 0 ? b1 >> 4 : 0)];
      if (b1 < 0) break;
      out += B64URL[((b1 & 15) << 2) | (b2 >= 0 ? b2 >> 6 : 0)];
      if (b2 < 0) break;
      out += B64URL[b2 & 63];
    }
    return out;
  }

  function b64urlToBytes(str) {
    var bytes = [];
    var buf = 0, bits = 0;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i);
      if (ch === '=') break; // 兼容带 padding 的旧码
      var v = B64URL.indexOf(ch);
      if (v < 0) return null; // 非法字符
      buf = (buf << 6) | v;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        bytes.push((buf >> bits) & 255);
      }
    }
    return bytes;
  }

  function utf8Decode(bytes) {
    var out = '';
    var i = 0;
    while (i < bytes.length) {
      var b0 = bytes[i];
      var cp, extra;
      if (b0 < 0x80) { cp = b0; extra = 0; }
      else if ((b0 & 0xe0) === 0xc0) { cp = b0 & 31; extra = 1; }
      else if ((b0 & 0xf0) === 0xe0) { cp = b0 & 15; extra = 2; }
      else if ((b0 & 0xf8) === 0xf0) { cp = b0 & 7; extra = 3; }
      else return null; // 非法起始字节
      if (i + extra >= bytes.length + 0 && extra > 0 && i + extra > bytes.length - 1) return null;
      for (var k = 1; k <= extra; k++) {
        var bk = bytes[i + k];
        if (bk === undefined || (bk & 0xc0) !== 0x80) return null;
        cp = (cp << 6) | (bk & 63);
      }
      if ((extra === 1 && cp < 0x80) || (extra === 2 && cp < 0x800) || (extra === 3 && cp < 0x10000)) return null;
      out += String.fromCodePoint(cp);
      i += extra + 1;
    }
    return out;
  }

  // encodeShare({formula,mode,sr}) → 'b1.<mode>.<sr>.<b64url 公式>'
  function encodeShare(payload) {
    if (!payload || typeof payload.formula !== 'string') return null;
    var mode = payload.mode === 'float' ? 'float' : 'byte';
    var sr = SR_RATES.indexOf(+payload.sr) >= 0 ? +payload.sr : 22050;
    return SHARE_MAGIC + '.' + mode + '.' + sr + '.' + bytesToB64url(utf8Bytes(payload.formula));
  }

  // decodeShare(str) → {formula,mode,sr} | null（静默降级：任何异常形态都不抛）
  function decodeShare(str) {
    if (typeof str !== 'string') return null;
    var s = str.replace(/^#/, '');
    var parts = s.split('.');
    if (parts.length !== 4 || parts[0] !== SHARE_MAGIC) return null;
    if (MODES.indexOf(parts[1]) < 0) return null;
    var sr = +parts[2];
    if (SR_RATES.indexOf(sr) < 0) return null;
    var bytes = b64urlToBytes(parts[3]);
    if (!bytes) return null;
    var formula = utf8Decode(bytes);
    if (formula == null || !formula.trim()) return null;
    return { formula: formula, mode: parts[1], sr: sr };
  }

  // ---------- 导出（__bytebeatCore 单一出口） ----------
  window.__bytebeatCore = {
    version: 'v8.42',
    SR_RATES: SR_RATES,
    MODES: MODES,
    CHUNK_SECONDS: CHUNK_SECONDS,
    FFT_SIZE: FFT_SIZE,
    SHARE_MAGIC: SHARE_MAGIC,
    FORMULAS: FORMULAS,
    stripLiterals: stripLiterals,
    findIllegalIdent: findIllegalIdent,
    compileFormula: compileFormula,
    sampleNorm: sampleNorm,
    renderChunk: renderChunk,
    fftMagnitudes: fftMagnitudes,
    peakBin: peakBin,
    hannWindow: hannWindow,
    encodeShare: encodeShare,
    decodeShare: decodeShare,
    utf8Bytes: utf8Bytes,
    bytesToB64url: bytesToB64url,
    b64urlToBytes: b64urlToBytes,
    utf8Decode: utf8Decode
  };
})();
