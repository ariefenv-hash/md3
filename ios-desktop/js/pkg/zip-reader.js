// ==================== zip-reader.js — 安装包 ZIP 解析器（v7.52 纯逻辑层） ====================
//
// 零依赖 ZIP 读取器：直接解析 Central Directory，解压走浏览器原生的
// DecompressionStream('deflate-raw')（Chrome 103+ / Firefox 113+ / Safari 16.4+），
// 不引入任何第三方库 —— 与本仓库「注意体量、零运行时依赖」的工程约定一致。
//
// 能力与安全边界（与 README「安装包格式规范」一致）：
//   - 支持 method 0（STORE）与 method 8（DEFLATE）；加密包 / ZIP64 / 其他压缩方法明确报错
//   - 每个条目 CRC32 校验（内容损坏立即拒绝）
//   - 路径经 pkg-manifest.safePkgPath 归一（拒绝绝对路径 / .. 穿越 / NUL）
//   - 体量四重钳制：包体 / 条目数 / 单文件解压上限 / 解压总量上限（解压流式计数，炸包先于 OOM 被掐断）
//   - 目录条目自动跳过；同名文件冲突报错
//   - 公共根目录剥离（Windows 右键压缩的「整个套一层文件夹」习惯自动纠正）

import { PKG_LIMITS, safePkgPath } from './pkg-manifest.js';

/** 带错误码的 ZIP 解析异常（UI 层按 code 出提示文案） */
export class PkgZipError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PkgZipError';
    this.code = code;
  }
}

// ---------- CRC32（IEEE 802.3 多项式，ZIP 规范算法） ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

/** CRC32 校验值计算（导出供测试断言与构建侧复用） */
export function crc32(u8, seed = 0) {
  let c = (seed ^ 0xFFFFFFFF) >>> 0;
  for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function u16(u8, p) { return u8[p] | (u8[p + 1] << 8); }
function u32(u8, p) { return (u8[p] | (u8[p + 1] << 8) | (u8[p + 2] << 16) | (u8[p + 3] << 24)) >>> 0; }

const SIG_EOCD = 0x06054b50;
const SIG_CD = 0x02014b50;
const SIG_LOCAL = 0x04034b50;

/**
 * DEFLATE (raw) 解压：DecompressionStream 流式计数，超过 limit 立即中止。
 * @returns {Promise<Uint8Array>}
 */
async function inflateRaw(bytes, limit) {
  if (typeof DecompressionStream === 'undefined') {
    throw new PkgZipError('E_NO_DECOMPRESS', '当前浏览器环境不支持 DecompressionStream，无法解压 deflate 压缩包');
  }
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  // 异步喂入与读取并行；读取侧超过 limit 直接拒绝
  const writeDone = writer.write(bytes).then(() => writer.close()).catch(() => {});
  const reader = ds.readable.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    let r;
    try {
      r = await reader.read();
    } catch (e) {
      throw new PkgZipError('E_CORRUPT', 'deflate 数据流损坏，无法解压');
    }
    if (r.done) break;
    total += r.value.byteLength;
    if (total > limit) {
      try { await reader.cancel(); } catch (e) {}
      throw new PkgZipError('E_TOO_BIG', `单文件解压后超过 ${Math.round(limit / 1024 / 1024)} MB 上限`);
    }
    chunks.push(r.value);
  }
  await writeDone;
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.byteLength; }
  return out;
}

/**
 * 解析 .mdapp / .zip 包。
 * @param {ArrayBuffer|Uint8Array} buffer 压缩包原始字节
 * @param {object} [opts]
 * @param {boolean} [opts.verifyCrc=true]      CRC32 校验（默认开）
 * @param {boolean} [opts.stripCommonRoot=true] 公共根目录剥离（默认开）
 * @param {object} [opts.limits]               覆盖默认体量限制（单测用）
 * @returns {Promise<{files: Array<{path: string, size: number, data: Uint8Array}>, strippedRoot: string|null}>}
 * @throws {PkgZipError} code: E_NOT_ZIP / E_EMPTY / E_ZIP64 / E_ENCRYPTED / E_METHOD /
 *                       E_PATH / E_DUP / E_TOO_BIG / E_CORRUPT / E_NO_DECOMPRESS
 */
export async function readZip(buffer, opts = {}) {
  const { verifyCrc = true, stripCommonRoot = true, limits = {} } = opts;
  const L = { ...PKG_LIMITS, ...limits };

  // 输入归一：ArrayBuffer / TypedArray（含 Node Buffer / 视图偏移）→ 统一 Uint8Array 视图
  const u8 = buffer instanceof Uint8Array
    ? buffer
    : ArrayBuffer.isView(buffer)
      ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
      : new Uint8Array(buffer);
  if (u8.byteLength > L.maxZipSize) {
    throw new PkgZipError('E_TOO_BIG', `压缩包超过 ${Math.round(L.maxZipSize / 1024 / 1024)} MB 上限`);
  }
  if (u8.byteLength < 22) throw new PkgZipError('E_NOT_ZIP', '文件不是有效的 ZIP（过短）');

  // ---- 定位 End Of Central Directory（从尾部向前扫，容忍注释区） ----
  let eocd = -1;
  const scanFrom = u8.byteLength - 22;
  const scanFloor = Math.max(0, scanFrom - 65535);
  for (let i = scanFrom; i >= scanFloor; i--) {
    if (u8[i] === 0x50 && u8[i + 1] === 0x4b && u8[i + 2] === 0x05 && u8[i + 3] === 0x06) { eocd = i; break; }
  }
  if (eocd === -1) throw new PkgZipError('E_NOT_ZIP', '未找到 ZIP 中央目录结尾（EOCD），文件不是有效的 ZIP');

  let entryCount = u16(u8, eocd + 10);
  const cdSize = u32(u8, eocd + 12);
  let cdOffset = u32(u8, eocd + 16);

  if (entryCount === 0xFFFF || cdOffset === 0xFFFFFFFF || cdSize === 0xFFFFFFFF) {
    throw new PkgZipError('E_ZIP64', '不支持 ZIP64 格式压缩包，请用常规 ZIP 重新打包');
  }
  if (!entryCount || !cdSize) throw new PkgZipError('E_EMPTY', '压缩包内没有文件');
  if (entryCount > L.maxEntries) {
    throw new PkgZipError('E_TOO_BIG', `压缩包含 ${entryCount} 个文件，超过 ${L.maxEntries} 上限`);
  }

  const utf8 = new TextDecoder('utf-8');
  const files = [];
  const seen = new Set();
  let totalUncomp = 0;
  let p = cdOffset;

  for (let n = 0; n < entryCount; n++) {
    if (p + 46 > u8.byteLength || u32(u8, p) !== SIG_CD) {
      throw new PkgZipError('E_CORRUPT', '中央目录损坏（条目签名不匹配）');
    }
    const flags = u16(u8, p + 8);
    const method = u16(u8, p + 10);
    const crcExpect = u32(u8, p + 16);
    const compSize = u32(u8, p + 20);
    const uncompSize = u32(u8, p + 24);
    const nameLen = u16(u8, p + 28);
    const extraLen = u16(u8, p + 30);
    const commentLen = u16(u8, p + 32);
    const localOff = u32(u8, p + 42);
    const nameBytes = u8.subarray(p + 46, p + 46 + nameLen);

    if (flags & 0x1) throw new PkgZipError('E_ENCRYPTED', '压缩包已加密，不支持安装加密包');
    if (method !== 0 && method !== 8) {
      throw new PkgZipError('E_METHOD', `不支持的压缩方法（method=${method}），请用「存储」或「Deflate」重新打包`);
    }
    if (compSize === 0xFFFFFFFF || uncompSize === 0xFFFFFFFF || localOff === 0xFFFFFFFF) {
      throw new PkgZipError('E_ZIP64', '不支持 ZIP64 格式压缩包，请用常规 ZIP 重新打包');
    }

    const rawName = utf8.decode(nameBytes);

    // 目录条目：名字以 / 结尾或解压后 0 字节且无数据 → 跳过
    if (rawName.endsWith('/') && uncompSize === 0) {
      p = p + 46 + nameLen + extraLen + commentLen;
      continue;
    }

    const path = safePkgPath(rawName);
    if (!path) throw new PkgZipError('E_PATH', `包内存在不安全的文件路径：${rawName}`);
    if (seen.has(path)) throw new PkgZipError('E_DUP', `包内存在重复文件：${path}`);

    // ---- 定位本地文件头，取数据区（本地头 name/extra 长度可能与中央目录不同，必须重读） ----
    if (localOff + 30 > u8.byteLength || u32(u8, localOff) !== SIG_LOCAL) {
      throw new PkgZipError('E_CORRUPT', `本地文件头损坏：${path}`);
    }
    const lNameLen = u16(u8, localOff + 26);
    const lExtraLen = u16(u8, localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    if (dataStart + compSize > u8.byteLength) {
      throw new PkgZipError('E_CORRUPT', `文件数据越界：${path}`);
    }
    const comp = u8.subarray(dataStart, dataStart + compSize);

    let data;
    if (method === 0) {
      if (compSize !== uncompSize) throw new PkgZipError('E_CORRUPT', `存储条目长度不一致：${path}`);
      data = comp.slice();
    } else {
      data = await inflateRaw(comp, L.maxFileUncompressed);
      if (data.byteLength !== uncompSize) {
        throw new PkgZipError('E_CORRUPT', `解压后长度与声明不符：${path}`);
      }
    }

    if (verifyCrc && uncompSize > 0 && crcExpect !== crc32(data)) {
      throw new PkgZipError('E_CORRUPT', `CRC 校验失败（文件损坏）：${path}`);
    }

    totalUncomp += uncompSize;
    if (totalUncomp > L.maxTotalUncompressed) {
      throw new PkgZipError('E_TOO_BIG', `解压后总大小超过 ${Math.round(L.maxTotalUncompressed / 1024 / 1024)} MB 上限`);
    }

    seen.add(path);
    files.push({ path, size: uncompSize, data });
    p = p + 46 + nameLen + extraLen + commentLen;
  }

  if (!files.length) throw new PkgZipError('E_EMPTY', '压缩包内没有有效文件');

  // ---- 公共根目录剥离：所有条目 depth ≥ 2 且首段相同才剥（保守策略） ----
  let strippedRoot = null;
  if (stripCommonRoot) {
    const firstSegs = new Set(files.map((f) => f.path.split('/')[0]));
    if (firstSegs.size === 1 && files.every((f) => f.path.includes('/'))) {
      const root = files[0].path.split('/')[0];
      for (const f of files) f.path = f.path.slice(root.length + 1);
      strippedRoot = root;
    }
  }

  return { files, strippedRoot };
}
