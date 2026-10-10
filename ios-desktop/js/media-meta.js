// ==================== media-meta.js — 音频元数据 / 歌词 / 压缩包分类（v7.61） ====================
//
// 音乐应用（apps/music/index.html）升级的可测试纯逻辑层，无 DOM 依赖（vitest 直测）：
//   · parseAudioMeta(u8)  内置封面 / 标签 / 歌词解析 —— MP3(ID3v2.2/2.3/2.4 APIC/USLT/
//     TIT2/TPE1/TALB)、FLAC(PICTURE block / VORBIS_COMMENT)、MP4/M4A(ilst covr/©nam/©ART/©lyr)
//   · parseLrc(text)      LRC 歌词（单行多时间标签 / [offset:] 全局偏移 / 2-3 位毫秒）
//   · classifyZipEntries  音乐压缩包分类（音频 / 歌词文本 / 尖面图），zip-reader 解包后喂入
//   · parseTar / gunzipBytes  tar / tar.gz 兜底支持（zip 走 pkg/zip-reader.js）
//
// 解析纪律：只读传入的 Uint8Array 视图，绝不触碰 File / 网络；全部防御式解析，
// 任何帧/块损坏都跳过而不是抛出（音乐文件头部的脏数据极其常见）。

/* ==================== 基础工具 ==================== */

function u16be(u8, p) { return (u8[p] << 8) | u8[p + 1]; }
function u24be(u8, p) { return (u8[p] << 16) | (u8[p + 1] << 8) | u8[p + 2]; }
function u32be(u8, p) { return ((u8[p] << 24) | (u8[p + 1] << 16) | (u8[p + 2] << 8) | u8[p + 3]) >>> 0; }
function u32le(u8, p) { return (u8[p] | (u8[p + 1] << 8) | (u8[p + 2] << 16) | (u8[p + 3] << 24)) >>> 0; }

/** ID3 synchsafe 整数（每字节仅低 7 位有效） */
function syncsafe(u8, p) {
  return ((u8[p] & 0x7f) << 21) | ((u8[p + 1] & 0x7f) << 14) | ((u8[p + 2] & 0x7f) << 7) | (u8[p + 3] & 0x7f);
}

let tdUtf8, tdUtf16le, tdUtf16be, tdLatin;
function decoders() {
  if (!tdUtf8) {
    tdUtf8 = new TextDecoder('utf-8');
    tdUtf16le = new TextDecoder('utf-16le');
    tdUtf16be = new TextDecoder('utf-16be');
    tdLatin = new TextDecoder('windows-1252');
  }
  return { tdUtf8, tdUtf16le, tdUtf16be, tdLatin };
}
// 模块加载即初始化（parseFlac / parseMp4 / parseTar 等入口直接引用模块级
// 变量，若首次调用不是 ID3 路径则 decoders() 尚未执行 —— 预热保证非空）
decoders();

/** ID3 文本按编码字节解码（0 latin1 / 1 utf16-bom / 2 utf16be / 3 utf8） */
function decodeTextBytes(u8, start, end, enc) {
  const { tdUtf8, tdUtf16le, tdUtf16be, tdLatin } = decoders();
  const view = u8.subarray(start, end);
  try {
    if (enc === 1) {
      // BOM 决定字节序；无 BOM 视为 LE
      if (view.length >= 2 && view[0] === 0xfe && view[1] === 0xff) return tdUtf16be.decode(view.subarray(2));
      if (view.length >= 2 && view[0] === 0xff && view[1] === 0xfe) return tdUtf16le.decode(view.subarray(2));
      return tdUtf16le.decode(view);
    }
    if (enc === 2) return tdUtf16be.decode(view);
    if (enc === 3) return tdUtf8.decode(view);
    return tdLatin.decode(view);
  } catch (e) { return ''; }
}

/** ID3 反同步：FF 00 → FF（v2.3 全局 tag 级 / v2.4 帧级共用） */
function unsyncBytes(u8) {
  const out = new Uint8Array(u8.length);
  let n = 0;
  for (let i = 0; i < u8.length; i++) {
    out[n++] = u8[i];
    if (u8[i] === 0xff && i + 1 < u8.length && u8[i + 1] === 0x00) i++; // 跳过填充 00
  }
  return out.subarray(0, n);
}

/** 以编码感知的方式跳过 null 终止符，返回内容结束下标（终止单/双字节按编码） */
function skipNullTerminated(u8, p, end, enc) {
  if (enc === 1 || enc === 2) {
    while (p + 1 < end) {
      if (u8[p] === 0x00 && u8[p + 1] === 0x00) return p + 2;
      p += 2;
    }
    return end;
  }
  while (p < end) {
    if (u8[p] === 0x00) return p + 1;
    p++;
  }
  return end;
}

function cleanTag(s) {
  // 去除 null 填充与首尾空白（ID3 文本帧常以 \0 填充）
  return String(s || '').replace(/\u0000+$/g, '').replace(/^\u0000+/g, '').trim();
}

/* ==================== ID3v2（MP3 主通道） ==================== */

/**
 * 解析 ID3v2 标签（v2.2 / v2.3 / v2.4）。
 * @param {Uint8Array} u8 文件头部缓冲（≥10 字节；截断的帧安全跳过）
 * @returns {{ title?: string, artist?: string, album?: string, cover?: {mime: string, data: Uint8Array}|null, lyrics?: string|null, lyricsSynced?: boolean }}
 */
export function parseId3(u8) {
  if (u8.length < 10 || u8[0] !== 0x49 || u8[1] !== 0x44 || u8[2] !== 0x33) return {};
  const verMajor = u8[3];            // 2 / 3 / 4
  const flags = u8[5];
  const tagSize = syncsafe(u8, 6);   // 不含 10 字节头
  const tagEnd = Math.min(u8.length, 10 + tagSize);
  let body = u8.subarray(10, tagEnd);
  if (flags & 0x80 && verMajor === 3) body = unsyncBytes(body); // v2.3 全局反同步
  const out = {};

  let p = 0;
  // 扩展头跳过（v2.3：size 不含自身 4 字节；v2.4：synchsafe 且含自身）
  if (flags & 0x40) {
    if (verMajor === 4) {
      const extSize = syncsafe(body, 0);
      p += Math.max(4, extSize);
    } else {
      const extSize = u32be(body, 0);
      p += 4 + extSize;
    }
  }

  const idLen = verMajor === 2 ? 3 : 4;
  const headerLen = verMajor === 2 ? 6 : 10;

  while (p + headerLen <= body.length) {
    let id = '';
    for (let i = 0; i < idLen; i++) id += String.fromCharCode(body[p + i]);
    if (!/^[A-Z0-9]+$/.test(id)) break; // 帧区结束（padding）

    let frameSize, fflags = 0;
    if (verMajor === 2) {
      frameSize = (body[p + 3] << 16) | (body[p + 4] << 8) | body[p + 5];
    } else if (verMajor === 4) {
      frameSize = syncsafe(body, p + 4);
      fflags = u16be(body, p + 8);
    } else {
      frameSize = u32be(body, p + 4);
      fflags = u16be(body, p + 8);
    }
    p += headerLen;
    if (frameSize <= 0 || p + frameSize > body.length) break; // 截断/损坏 → 收工

    let fbody = body.subarray(p, p + frameSize);
    p += frameSize;

    if (verMajor === 4 && (fflags & 0x02)) fbody = unsyncBytes(fbody);  // v2.4 帧级反同步
    if ((verMajor === 4 && (fflags & 0x01))) fbody = fbody.subarray(4); // data length indicator
    if (fflags & 0x0080 || (verMajor === 4 && (fflags & 0x08))) continue; // 压缩/加密帧跳过

    const enc = fbody.length ? fbody[0] : 0;

    try {
      if (id === 'APIC' || id === 'PIC') {
        let q = 1;
        let mime = '';
        if (verMajor === 2) {
          mime = String.fromCharCode(fbody[1], fbody[2], fbody[3]).toLowerCase();
          mime = mime === 'jpg' ? 'image/jpeg' : mime === 'png' ? 'image/png' : 'image/jpeg';
          q = 4;
        } else {
          const mimeEnd = skipNullTerminated(fbody, q, fbody.length, 0);
          mime = tdLatin.decode(fbody.subarray(q, mimeEnd - 1)).trim().toLowerCase() || 'image/jpeg';
          q = mimeEnd;
        }
        const picType = fbody[q]; q += 1;
        const descEnd = skipNullTerminated(fbody, q, fbody.length, enc);
        q = descEnd;
        const data = fbody.subarray(q);
        if (data.length > 32) {
          // 优先 Front cover(3)；已有封面时仅在前类型缺失时补位
          const better = picType === 3 || !out.cover;
          if (better) out.cover = { mime, data };
        }
      } else if (id === 'USLT' || id === 'ULT') {
        // encoding(1) lang(3) descriptor(\0) text
        let q = 4;
        const descEnd = skipNullTerminated(fbody, q, fbody.length, enc);
        const text = cleanTag(decodeTextBytes(fbody, descEnd, fbody.length, enc));
        if (text && !out.lyrics) {
          out.lyrics = text;
          out.lyricsSynced = /\[\d{1,3}:\d{1,2}/.test(text);
        }
      } else if (id === 'TIT2' || id === 'TT2') {
        const t = cleanTag(decodeTextBytes(fbody, 1, fbody.length, enc));
        if (t && !out.title) out.title = t;
      } else if (id === 'TPE1' || id === 'TP1') {
        const t = cleanTag(decodeTextBytes(fbody, 1, fbody.length, enc));
        if (t && !out.artist) out.artist = t;
      } else if (id === 'TALB' || id === 'TAL') {
        const t = cleanTag(decodeTextBytes(fbody, 1, fbody.length, enc));
        if (t && !out.album) out.album = t;
      }
    } catch (e) { /* 单帧损坏不影响整体 */ }
  }
  return out;
}

/* ==================== FLAC ==================== */

export function parseFlac(u8) {
  if (u8.length < 8) return {};
  const magic = String.fromCharCode(u8[0], u8[1], u8[2], u8[3]);
  if (magic !== 'fLaC') return {};
  const out = {};
  let p = 4;
  while (p + 4 <= u8.length) {
    const last = u8[p] & 0x80;
    const type = u8[p] & 0x7f;
    const size = u24be(u8, p + 1);
    const body = u8.subarray(p + 4, Math.min(u8.length, p + 4 + size));
    if (body.length < size && type !== 4 && type !== 6) break; // 需要的块被截断
    try {
      if (type === 4) {
        // VORBIS_COMMENT（全部小端）
        let q = 0;
        const vlen = u32le(body, q); q += 4 + vlen;
        const count = u32le(body, q); q += 4;
        for (let i = 0; i < count && q + 4 <= body.length; i++) {
          const clen = u32le(body, q); q += 4;
          const line = tdUtf8.decode(body.subarray(q, q + clen)); q += clen;
          const eq = line.indexOf('=');
          if (eq <= 0) continue;
          const key = line.slice(0, eq).toUpperCase();
          const val = line.slice(eq + 1).trim();
          if (!val) continue;
          if (key === 'TITLE' && !out.title) out.title = val;
          else if (key === 'ARTIST' && !out.artist) out.artist = val;
          else if (key === 'ALBUM' && !out.album) out.album = val;
          else if ((key === 'LYRICS' || key === 'UNSYNCEDLYRICS' || key === 'SYNCEDLYRICS') && !out.lyrics) {
            out.lyrics = val;
            out.lyricsSynced = /\[\d{1,3}:\d{1,2}/.test(val);
          }
        }
      } else if (type === 6 && !out.cover) {
        // PICTURE（大端）
        let q = 4; // skip picture type
        const mimeLen = u32be(body, q); q += 4;
        const mime = tdLatin.decode(body.subarray(q, q + mimeLen)); q += mimeLen;
        const descLen = u32be(body, q); q += 4 + descLen;
        q += 16; // w/h/depth/colors
        const dataLen = u32be(body, q); q += 4;
        const data = body.subarray(q, q + dataLen);
        if (data.length > 32) out.cover = { mime: mime || 'image/jpeg', data };
      }
    } catch (e) { /* 块损坏跳过 */ }
    p += 4 + size;
    if (last) break;
  }
  return out;
}

/* ==================== MP4 / M4A ==================== */

const MP4_TEXT_ATOMS = { '©nam': 'title', '©ART': 'artist', '©alb': 'album', '©lyr': 'lyrics' };

function mp4FindAtom(u8, start, end, type) {
  let p = start;
  while (p + 8 <= end) {
    let size = u32be(u8, p);
    const t = String.fromCharCode(u8[p + 4], u8[p + 5], u8[p + 6], u8[p + 7]);
    if (size === 1) {
      // 64 位长度（高 32 位足够）
      size = u32be(u8, p + 12);
      if (t === type) return { start: p + 16, end: Math.min(end, p + size) };
      p += size;
    } else if (size === 0) {
      size = end - p;
      if (t === type) return { start: p + 8, end };
      p = end;
    } else {
      if (size < 8) break;
      if (t === type) return { start: p + 8, end: Math.min(end, p + size) };
      p += size;
    }
  }
  return null;
}

export function parseMp4(u8) {
  if (u8.length < 12) return {};
  // brand 检测放宽：ftyp 在前即可（M4A/M4B/MP4 同容器）
  if (String.fromCharCode(u8[4], u8[5], u8[6], u8[7]) !== 'ftyp') return {};
  const out = {};
  const moov = mp4FindAtom(u8, 0, u8.length, 'moov');
  if (!moov) return out;
  const udta = mp4FindAtom(u8, moov.start, moov.end, 'udta');
  if (!udta) return out;
  let meta = mp4FindAtom(u8, udta.start, udta.end, 'meta');
  if (!meta) return out;
  meta = { start: meta.start + 4, end: meta.end }; // meta 头 4 字节 version/flags
  const ilst = mp4FindAtom(u8, meta.start, meta.end, 'ilst');
  if (!ilst) return out;

  let p = ilst.start;
  while (p + 8 <= ilst.end) {
    const size = u32be(u8, p);
    if (size < 8) break;
    const type = String.fromCharCode(u8[p + 4], u8[p + 5], u8[p + 6], u8[p + 7]);
    const body = { start: p + 8, end: Math.min(ilst.end, p + size) };
    const dataAtom = mp4FindAtom(u8, body.start, body.end, 'data');
    if (dataAtom && dataAtom.end - dataAtom.start >= 8) {
      const flags = u24be(u8, dataAtom.start + 1); // 1 字节 version + 3 字节 flags
      const payload = u8.subarray(dataAtom.start + 8, dataAtom.end);
      try {
        if (type === 'covr') {
          const mime = flags === 14 ? 'image/png' : 'image/jpeg';
          if (payload.length > 32 && !out.cover) out.cover = { mime, data: payload };
        } else if (MP4_TEXT_ATOMS[type]) {
          const val = cleanTag(tdUtf8.decode(payload));
          if (val && !out[MP4_TEXT_ATOMS[type]]) {
            out[MP4_TEXT_ATOMS[type]] = val;
            if (MP4_TEXT_ATOMS[type] === 'lyrics') out.lyricsSynced = /\[\d{1,3}:\d{1,2}/.test(val);
          }
        }
      } catch (e) { /* 跳过 */ }
    }
    p += size;
  }
  return out;
}

/* ==================== 统一入口 ==================== */

/**
 * 容器自动识别的元数据解析入口。
 * @param {Uint8Array} u8 文件头部缓冲（建议 ≥3MB，MP4 moov 靠前时可命中；靠后则尽力）
 */
export function parseAudioMeta(u8) {
  if (!u8 || u8.length < 12) return {};
  try {
    if (u8[0] === 0x49 && u8[1] === 0x44 && u8[2] === 0x33) return parseId3(u8);
    if (u8[0] === 0x66 && u8[1] === 0x4c && u8[2] === 0x61 && u8[3] === 0x43) return parseFlac(u8);
    if (String.fromCharCode(u8[4], u8[5], u8[6], u8[7]) === 'ftyp') return parseMp4(u8);
  } catch (e) { /* 防御 */ }
  return {};
}

/* ==================== LRC 歌词 ==================== */

const LRC_TIME_RE = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

/**
 * LRC 文本 → [{t(秒), text}] 升序。支持单行多时间标签、[offset:±ms] 全局偏移、
 * 2~3 位毫秒；无时间戳的元数据行（[ti:]/[ar:]）与纯空行跳过。
 * @returns {Array<{t: number, text: string}>}
 */
export function parseLrc(text) {
  if (!text) return [];
  const lines = String(text).split(/\r\n|\n|\r/);
  const out = [];
  let offsetMs = 0;
  for (const raw of lines) {
    const meta = raw.match(/^\s*\[offset:\s*([+-]?\d+)\s*\]\s*$/i);
    if (meta) { offsetMs = parseInt(meta[1], 10) || 0; continue; }
    LRC_TIME_RE.lastIndex = 0;
    const tags = [];
    let m;
    while ((m = LRC_TIME_RE.exec(raw))) {
      const fracRaw = m[3] || '0';
      const frac = parseInt(fracRaw.padEnd(3, '0').slice(0, 3), 10);
      tags.push((+m[1]) * 60 + (+m[2]) + frac / 1000);
    }
    if (!tags.length) continue;
    const content = raw.replace(LRC_TIME_RE, '').replace(/<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/g, '').trim();
    if (!content) continue;
    for (const t of tags) out.push({ t: Math.max(0, t - offsetMs / 1000), text: content });
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}

/* ==================== 音乐压缩包分类 ==================== */

const AUDIO_EXT_RE = /\.(mp3|wav|flac|m4a|m4b|aac|ogg|oga|opus|wma)$/i;
const LYRIC_EXT_RE = /\.(lrc|txt)$/i;
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|bmp|gif)$/i;
const COVER_NAME_RE = /(cover|front|album|folder|thumb|poster)/i;

export function basenameNoExt(p) {
  const base = String(p || '').split('/').pop();
  const dot = base.lastIndexOf('.');
  return (dot > 0 ? base.slice(0, dot) : base).toLowerCase();
}

export function extOf(p) { return (String(p || '').match(/\.([a-z0-9]+)$/i) || [])[1] || ''; }

/**
 * zip/tar 解包后的条目分类（音频 / 歌词文本 / 封面候选）。
 * @param {Array<{path: string, data: Uint8Array}>} entries
 * @returns {{ audio: Array<{path: string, name: string, data: Uint8Array}>,
 *             lyrics: Map<string, string>,    // basename(无扩展,小写) → LRC/Vorbis 歌词文本
 *             covers: Array<{path: string, mime: string, data: Uint8Array, dir: string, score: number}> }}
 */
export function classifyZipEntries(entries) {
  const audio = [];
  const lyrics = new Map();
  const covers = [];
  for (const ent of entries || []) {
    const path = ent.path || '';
    const lower = path.toLowerCase();
    if (lower.split('/').some((seg) => seg === '__macosx' || seg.startsWith('.'))) continue; // 垃圾条目
    if (AUDIO_EXT_RE.test(lower)) {
      audio.push({ path, name: path.split('/').pop(), data: ent.data });
    } else if (LYRIC_EXT_RE.test(lower)) {
      let text = '';
      try { text = tdUtf8.decode(ent.data); } catch (e) { continue; }
      // .txt 只有像 LRC 才收（纯文本说明文件拒绝）
      if (!/\[\d{1,3}:\d{1,2}/.test(text)) continue;
      const key = basenameNoExt(path);
      if (!lyrics.has(key)) lyrics.set(key, text);
    } else if (IMAGE_EXT_RE.test(lower)) {
      const ext = extOf(lower);
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'bmp' ? 'image/bmp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
      const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : '';
      const depth = path.split('/').length;
      // 越浅越优（整包根封面），名含 cover/front/album 加权
      const score = (COVER_NAME_RE.test(path) ? 100 : 0) - depth;
      covers.push({ path, mime, data: ent.data, dir, score });
    }
  }
  covers.sort((a, b) => b.score - a.score);
  return { audio, lyrics, covers };
}

/** 为压缩包内音频挑选封面：同目录优先，其次父目录，最后全局最优 */
export function coverForAudio(covers, audioPath) {
  if (!covers || !covers.length) return null;
  const dir = audioPath.includes('/') ? audioPath.slice(0, audioPath.lastIndexOf('/') + 1) : '';
  let best = null, bestScore = -Infinity;
  for (const c of covers) {
    let s = c.score;
    if (c.dir === dir) s += 50;
    else if (dir.startsWith(c.dir)) s += 20; // 父目录（专辑根封面）
    if (s > bestScore) { bestScore = s; best = c; }
  }
  return best;
}

/* ==================== tar / tar.gz 兜底 ==================== */

/** 解析未压缩 tar（512 字节头 + 数据按 512 对齐；仅取普通文件，条目数/体量防御上限） */
export function parseTar(u8, limits = {}) {
  const maxEntries = limits.maxEntries || 4096;
  const maxFile = limits.maxFileUncompressed || 256 * 1024 * 1024;
  const files = [];
  let p = 0;
  while (p + 512 <= u8.length) {
    // tar 名字无编码声明，现代打包器（GNU/bsdtar/7-Zip）一律 UTF-8；
    // TextDecoder 非 fatal 模式对坏字节替换而不抛（latin1 会把中文打成乱码）
    const name = tdUtf8.decode(u8.subarray(p, p + 100)).replace(/\u0000.*$/, '').trim();
    if (!name) { p += 512; continue; }             // 结束块/空洞
    const sizeStr = tdLatin.decode(u8.subarray(p + 124, p + 136)).replace(/\u0000.*$/, '').trim();
    const size = parseInt(sizeStr, 8) || 0;
    const typeflag = String.fromCharCode(u8[p + 156] || 0x30);
    // 长名扩展（GNU 'L'）：真实名在数据区，跳过头取数据作名字
    if (typeflag === 'L' && p + 512 + size <= u8.length) {
      const realName = tdUtf8.decode(u8.subarray(p + 512, p + 512 + size)).replace(/\u0000.*$/, '').trim();
      p += 512 + Math.ceil(size / 512) * 512;
      // 下一个头应为真实文件
      if (p + 512 <= u8.length) {
        const sz2 = parseInt(tdLatin.decode(u8.subarray(p + 124, p + 136)).replace(/\u0000.*$/, '').trim(), 8) || 0;
        if (p + 512 + sz2 <= u8.length && sz2 <= maxFile && files.length < maxEntries) {
          files.push({ path: realName, data: u8.slice(p + 512, p + 512 + sz2) });
        }
        p += 512 + Math.ceil(sz2 / 512) * 512;
      }
      continue;
    }
    const isFile = typeflag === '0' || typeflag === '\0';
    if (isFile && size > 0) {
      if (size > maxFile || files.length >= maxEntries) { p += 512 + Math.ceil(size / 512) * 512; continue; }
      if (p + 512 + size > u8.length) break; // 截断
      files.push({ path: name, data: u8.slice(p + 512, p + 512 + size) });
    }
    p += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

/** gzip 解压（浏览器原生 DecompressionStream；不可用时抛 E_NO_GZIP） */
export async function gunzipBytes(u8) {
  if (typeof DecompressionStream !== 'function') {
    const err = new Error('当前浏览器不支持 gzip 解压');
    err.code = 'E_NO_GZIP';
    throw err;
  }
  const ds = new DecompressionStream('gzip');
  const stream = new Blob([u8]).stream().pipeThrough(ds);
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}
