// ==================== data-backup.js — 全量数据备份与恢复 ====================
//
// 职责：
//   把桌面全部本地数据（localStorage + IndexedDB）导出为单个 JSON 备份文件，
//   或从备份文件一键恢复。用户换设备 / 清浏览器数据时可完整迁移。
//
// 数据范围：
//   - localStorage：全量键值（含 ios-desktop:* 桌面数据，以及便签 / 提醒 / 相册 /
//     翻译 / 游戏等 iframe 子应用的同源共享数据，故不能只取 ios-desktop: 前缀）
//   - IndexedDB：ios-desktop-files 库 kv store 全部条目
//     （视频壁纸 / 壁纸图片 / 自定义字体等大文件以 base64 内嵌进 JSON）
//
// 设计原则：
//   - 模块加载时自注册 window.__dataBackup，供设置页 onclick 直接调用
//   - 全程 try/catch，任何失败都通过系统 Toast 中文提示，绝不抛异常打断桌面
//   - 仅依赖原生 API（FileReader / Blob / atob），不引入任何第三方库
//   - 导入事务化（fix(audit-D)）：先建立回滚暂存，任一步失败用暂存完整恢复原数据，
//     全量成功才提交并如实报条数 —— 杜绝“旧数据已毁新数据未落”的半状态

import { idbGetAllEntries, idbBulkPut, idbClearStore } from './storage.js';
import { ICONS } from './icons.js';

/** 备份文件格式标识与版本号（导入时校验 format，兼容历史两代标识） */
const BACKUP_FORMAT = 'android16-geek-backup';
const LEGACY_BACKUP_FORMATS = ['android16-zeekr-backup', 'ios-desktop-backup']; // 仅用于导入识别，永不写出
const BACKUP_VERSION = 1;

/** IDB 库名 / store 名：仅用于备份 JSON 的结构描述，实际读写都走 storage.js */
const IDB_DB_NAME = 'ios-desktop-files';
const IDB_STORE_NAME = 'kv';

/** 大文件提示阈值：备份体积超过 8MB 时提示含视频/字体等大文件 */
const BIG_BACKUP_MB = 8;

/**
 * fix(audit-D): 导入回滚保险副本键 —— 导入全量成功前在 localStorage 留一份原数据快照。
 * 页面若在导入中途被杀（内存暂存丢失），至少留下可手工恢复的线索；成功/回滚后清除。
 */
const ROLLBACK_LS_KEY = 'ios-desktop:backup-rollback';

// ==================== 通用小工具 ====================

/** 系统 Toast 快捷封装（缺失时静默跳过，绝不抛异常） */
function toast(msg, iconSvg) {
  try {
    if (typeof window !== 'undefined' && window.showSystemToast) window.showSystemToast(msg, iconSvg);
  } catch (e) {}
}

/** 数字补零（文件名时间戳用） */
function pad2(n) { return n < 10 ? '0' + n : '' + n; }

/** 生成 android16-geek-backup-YYYYMMDD-HHmmss.json 形式的文件名 */
function makeBackupFileName() {
  const d = new Date();
  return 'android16-geek-backup-' + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate())
    + '-' + pad2(d.getHours()) + pad2(d.getMinutes()) + pad2(d.getSeconds()) + '.json';
}

/** 判断值是否为 Blob / File（浏览器才有 Blob 构造器） */
function isBlobLike(v) {
  try { return typeof Blob !== 'undefined' && v instanceof Blob; } catch (e) { return false; }
}

// ==================== 值序列化 / 反序列化 ====================

/**
 * 将任意 IDB 值转为可 JSON 序列化的备份结构：
 *   Blob/File → { __backupType:'blob', mime, name, base64 }
 *   其他值    → { __backupType:'json', value }（JSON 不安全时降级为字符串）
 * @returns {Promise<object>}
 */
function serializeIdbValue(value) {
  if (isBlobLike(value)) {
    return new Promise((resolve) => {
      let reader;
      try {
        reader = new FileReader();
      } catch (e) { resolve({ __backupType: 'json', value: null }); return; }
      reader.onload = () => {
        try {
          const result = String(reader.result || '');
          const prefix = ';base64,';
          const idx = result.indexOf(prefix);
          // 去掉 data:...;base64, 前缀，只保留纯 base64 数据
          const base64 = idx >= 0 ? result.slice(idx + prefix.length) : result;
          resolve({ __backupType: 'blob', mime: value.type || '', name: value.name || '', base64 });
        } catch (e) { resolve({ __backupType: 'json', value: null }); }
      };
      reader.onerror = () => resolve({ __backupType: 'json', value: null });
      try { reader.readAsDataURL(value); } catch (e) { resolve({ __backupType: 'json', value: null }); }
    });
  }
  // 非 Blob：JSON 往返探测；失败（循环引用 / 特殊对象等）降级为字符串
  try {
    return Promise.resolve({ __backupType: 'json', value: JSON.parse(JSON.stringify(value)) });
  } catch (e) {
    let s;
    try { s = String(value); } catch (e2) { s = null; }
    return Promise.resolve({ __backupType: 'json', value: s });
  }
}

/** base64 → Blob：atob + Uint8Array 实现，不依赖 fetch(dataURL) */
function base64ToBlob(base64, mime) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime || 'application/octet-stream' });
}

/**
 * 把备份里的值结构还原为可写入 IDB 的原始值。
 * 解码失败的 Blob 条目返回 null（调用方跳过），避免把坏数据写进 store。
 */
function decodeIdbValue(wrapped) {
  if (!wrapped || typeof wrapped !== 'object') return wrapped;
  if (wrapped.__backupType === 'blob' && typeof wrapped.base64 === 'string') {
    try { return base64ToBlob(wrapped.base64, wrapped.mime); } catch (e) { return null; }
  }
  if (wrapped.__backupType === 'json') return wrapped.value;
  return wrapped; // 未知结构原样写回，保持前向兼容
}

// ==================== 导出流程 ====================

/**
 * 全量导出：localStorage + IndexedDB → 单个 JSON 文件下载。
 * @returns {Promise<void>}
 */
export async function exportBackup() {
  try {
    // 1. 收集 localStorage 全量键值（不只 ios-desktop: 前缀，子应用数据一并打包）
    const ls = {};
    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        try { ls[k] = localStorage.getItem(k); } catch (e) { /* 单键读取失败则跳过 */ }
      }
    } catch (e) { /* localStorage 不可用时导出为空对象 */ }

    // 2. 收集 IndexedDB 全部条目（Blob 走 FileReader 转 base64）
    // fix(audit-D): idbGetAllEntries 在 cursor 中途出错时会静默 resolve 已读到的部分条目
    // （storage.js 的防御式设计，调用方拿不到失败信号，且该文件不可改）——
    // 导出侧用「双读一致」防御：连读两次比对键序列，不一致说明读取不稳定，
    // 宁可中止导出也不产出残缺备份当成功。
    // 残留局限：两次都停在同一处的确定性错误无法据此发现，根治需 storage.js 返回失败标记。
    const readA = await idbGetAllEntries();
    const readB = await idbGetAllEntries();
    const seqOf = (arr) => arr.map((it) => (it && it.key != null ? String(it.key) : '')).join('\u0001');
    if (seqOf(readA) !== seqOf(readB)) {
      toast('导出失败：本地数据读取不稳定，请稍后重试');
      return;
    }
    const rawEntries = readA;
    const kv = [];
    for (const item of rawEntries) {
      if (!item || typeof item.key === 'undefined' || item.key === null) continue;
      try {
        const value = await serializeIdbValue(item.value);
        kv.push({ key: item.key, value });
      } catch (e) { /* 单条序列化失败则跳过 */ }
    }

    // 3. 组装备份对象
    let dataVersion = null;
    try { dataVersion = localStorage.getItem('ios-desktop:data-version') || null; } catch (e) {}
    const data = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      dataVersion,
      localStorage: ls,
      indexedDB: { [IDB_DB_NAME]: { [IDB_STORE_NAME]: kv } },
    };

    // 4. 生成 JSON 文件并触发下载
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = makeBackupFileName();
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    try { a.remove(); } catch (e) {}
    // 延迟回收 objectURL，给浏览器留出发起下载的时间
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 3000);

    // 5. 结果提示：条目数 + 近似大小（1 位小数）
    const sizeMB = blob.size / 1024 / 1024;
    const count = Object.keys(ls).length + kv.length;
    let msg = '备份已导出：共 ' + count + ' 条数据（约 ' + sizeMB.toFixed(1) + ' MB）';
    if (sizeMB > BIG_BACKUP_MB) msg += '，含视频/字体等大文件，体积较大';
    toast(msg, ICONS.download);
  } catch (e) {
    toast('导出失败：' + (e && e.message ? e.message : '未知错误'));
  }
}

// ==================== 导入流程 ====================

/** FileReader 读取文本的 Promise 封装 */
function readAsText(file) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    } catch (e) { reject(e); }
  });
}

/** 从备份对象中取出 kv 条目数组（结构不合法时返回 []） */
function extractKv(backup) {
  try {
    const kv = backup && backup.indexedDB
      && backup.indexedDB[IDB_DB_NAME]
      && backup.indexedDB[IDB_DB_NAME][IDB_STORE_NAME];
    return Array.isArray(kv) ? kv : [];
  } catch (e) { return []; }
}

/**
 * fix(audit-D): 读取 localStorage 全量快照（导入回滚暂存用）。
 * 整体不可用时返回 null（调用方据此拒绝导入 —— 没有快照就不能安全覆盖）。
 */
function snapshotLocalStorage() {
  try {
    const snap = {};
    for (const k of Object.keys(localStorage)) {
      try { const v = localStorage.getItem(k); if (typeof v === 'string') snap[k] = v; } catch (e) { /* 单键读失败跳过 */ }
    }
    return snap;
  } catch (e) { return null; }
}

/**
 * fix(audit-D): 用回滚暂存完整恢复原状 —— localStorage 清空后逐键写回；
 * IDB 仅在被本次导入修改过（idbTouched）时才清空 + 按快照批量写回，
 * 避免对未动过的库做不必要的清写。返回 {lsOk, idbOk} 供调用方如实报错。
 */
async function rollbackFromSnapshot(lsBackup, idbBackup, idbTouched) {
  let lsOk = true, idbOk = true;
  try {
    localStorage.clear();
    for (const k of Object.keys(lsBackup)) {
      try { localStorage.setItem(k, lsBackup[k]); } catch (e) { lsOk = false; }
    }
  } catch (e) { lsOk = false; }
  if (idbTouched) {
    try {
      const clearOk = await idbClearStore();
      if (!clearOk) idbOk = false;
      else if (idbBackup && idbBackup.length) idbOk = await idbBulkPut(idbBackup);
    } catch (e) { idbOk = false; }
  }
  try { localStorage.removeItem(ROLLBACK_LS_KEY); } catch (e) {}
  return { lsOk, idbOk };
}

/**
 * 弹出文件选择器，选取备份 JSON 后询问确认并恢复。
 * @returns {void}
 */
export function pickImportFile() {
  try {
    if (typeof document === 'undefined' || !document.body) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    document.body.appendChild(input);

    const cleanup = () => { try { input.remove(); } catch (e) {} };
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      cleanup();
      if (file) handleImportFile(file);
    });
    input.addEventListener('cancel', () => cleanup());
    // 部分浏览器要求 input 已挂载到 DOM 中才能触发文件选择
    input.click();
  } catch (e) {
    toast('无法打开文件选择器：' + (e && e.message ? e.message : '未知错误'));
  }
}

/** 读取 + 校验 + 确认 + 覆盖写入 + 刷新 */
async function handleImportFile(file) {
  // 1. 读取文本并解析 JSON
  let backup = null;
  try {
    backup = JSON.parse(await readAsText(file));
  } catch (e) {
    toast('导入失败：文件不是有效的 JSON 备份');
    return;
  }

  // 2. 校验格式标识（现行 + 历史两代标识均合法，不合法直接中止）
  if (!backup || (backup.format !== BACKUP_FORMAT && !LEGACY_BACKUP_FORMATS.includes(backup.format))) {
    toast('导入失败：不是有效的桌面备份文件');
    return;
  }

  // 3. 汇总摘要，请用户确认覆盖
  const lsData = (backup.localStorage && typeof backup.localStorage === 'object' && !Array.isArray(backup.localStorage))
    ? backup.localStorage : {};
  const kvData = extractKv(backup);
  const lsCount = Object.keys(lsData).length;
  const idbCount = kvData.length;
  const hasBig = kvData.some(it => it && it.value && it.value.__backupType === 'blob');

  const lines = [
    '确认从备份恢复全部数据？当前数据将被覆盖，且无法撤销。',
    '',
    '导出时间：' + (backup.exportedAt || '未知'),
    'localStorage 条目：' + lsCount + ' 条',
    'IndexedDB 条目：' + idbCount + ' 条',
  ];
  if (hasBig) lines.push('提示：备份含视频/字体等大文件，恢复可能需要几秒钟。');
  let confirmed = false;
  try { confirmed = confirm(lines.join('\n')); } catch (e) { confirmed = false; }
  if (!confirmed) return;

  // ==================== fix(audit-D): 导入事务化 ====================
  // 原实现是「先清后写」非事务链（clear → 逐键写 → idbClear → idbBulkPut），
  // 任一步失败旧数据已毁新数据未落（桌面变空砖），且部分失败仍提示「导入成功」。
  // 现改为：先建回滚暂存 → 逐步写入并统计失败 → 全量成功才清除暂存；
  // 任一步失败用暂存完整恢复并如实报错。

  // 4a. 建立回滚暂存：localStorage 全量快照（拿不到就拒绝导入，不能裸奔）
  const lsBackup = snapshotLocalStorage();
  if (lsBackup === null) {
    toast('导入失败：无法读取当前数据（建立回滚快照失败），已取消导入');
    return;
  }
  // 4b. IndexedDB 原始条目快照（Blob 保持引用不做序列化，回滚时直接写回）。
  // 同样用双读一致防御：快照若残缺，回滚反而会丢数据，不一致就拒绝开始导入。
  // （若 IDB 此刻整体不可用，storage.js 的连接 Promise 会缓存失败结果，
  //   后续 clear/bulkPut 也会失败并走回滚，不会误清真实数据。）
  let idbBackup = [];
  {
    let a = [], b = [];
    try { a = await idbGetAllEntries(); b = await idbGetAllEntries(); } catch (e) {}
    const seqOf = (arr) => arr.map((it) => (it && it.key != null ? String(it.key) : '')).join('\u0001');
    if (seqOf(a) !== seqOf(b)) {
      toast('导入失败：无法稳定读取当前数据，已取消导入，请稍后重试');
      return;
    }
    idbBackup = a;
  }
  let idbTouched = false; // IDB 是否已被本次导入修改过（决定回滚时要不要重建 IDB）

  try {
    // 5. 覆盖 localStorage：清空 → 逐键写回（统计失败数；失败 > 0 不得报成功）
    let lsFail = 0;
    let lsBroken = false;
    try {
      localStorage.clear();
    } catch (e) { lsBroken = true; }
    if (!lsBroken) {
      for (const k of Object.keys(lsData)) {
        try { localStorage.setItem(k, String(lsData[k])); } catch (e) { lsFail++; }
      }
    }
    if (lsBroken || lsFail > 0) {
      const rb = await rollbackFromSnapshot(lsBackup, [], false);
      toast(rb.lsOk
        ? '导入失败：' + (lsBroken ? 'localStorage 无法写入' : lsFail + ' 条数据写入被拒绝') + '，已恢复原数据'
        : '导入失败，且自动恢复未完全成功，建议立即重新导出备份');
      return;
    }

    // LS 侧保险副本（可选防御：页面若在导入中途被杀，内存暂存会丢，这里留一条恢复线索）
    try {
      localStorage.setItem(ROLLBACK_LS_KEY, JSON.stringify({
        savedAt: new Date().toISOString(),
        note: '导入进行中的回滚快照（正常情况下导入结束会自动清除，若长期存在说明上次导入被中断）',
        localStorage: lsBackup,
      }));
    } catch (e) { /* 配额不足写不进就算了，内存暂存仍有效 */ }

    // 6. 覆盖 IndexedDB：清空 → 解码 → 批量写回（idbBulkPut 单事务原子，false 即整批未落）
    let clearOk = false;
    try { clearOk = await idbClearStore(); } catch (e) { clearOk = false; }
    if (!clearOk) {
      const rb = await rollbackFromSnapshot(lsBackup, idbBackup, false);
      toast(rb.lsOk && rb.idbOk
        ? '导入失败：无法清空本地 IndexedDB 存储，已恢复原数据'
        : '导入失败，且自动恢复未完全成功，建议立即重新导出备份');
      return;
    }
    idbTouched = true;
    let written = 0, skipped = 0;
    if (idbCount > 0) {
      const entries = [];
      for (const item of kvData) {
        if (!item || typeof item.key === 'undefined' || item.key === null) continue;
        const value = decodeIdbValue(item.value);
        if (value === null) { skipped++; continue; } // Blob 解码失败的条目跳过，不写脏数据
        entries.push({ key: item.key, value });
      }
      if (entries.length === 0) {
        // 备份声称有 IDB 数据但一条都解不出来 —— 视为失败回滚，不能报“成功恢复 0 条”
        const rb = await rollbackFromSnapshot(lsBackup, idbBackup, true);
        toast(rb.lsOk && rb.idbOk
          ? '导入失败：备份中的 IndexedDB 数据全部无法解码，已恢复原数据'
          : '导入失败，且自动恢复未完全成功，建议立即重新导出备份');
        return;
      }
      let putOk = false;
      try { putOk = await idbBulkPut(entries); } catch (e) { putOk = false; }
      if (!putOk) {
        const rb = await rollbackFromSnapshot(lsBackup, idbBackup, idbTouched);
        toast(rb.lsOk && rb.idbOk
          ? '导入失败：IndexedDB 数据写回失败，已恢复原数据'
          : '导入失败，且自动恢复未完全成功，建议立即重新导出备份');
        return;
      }
      written = entries.length;
    }

    // 7. 全量成功：清除暂存与保险副本 → 如实报条数 → 刷新
    try { localStorage.removeItem(ROLLBACK_LS_KEY); } catch (e) {}
    let msg = '数据导入成功：localStorage ' + lsCount + ' 条、IndexedDB ' + written + ' 条，正在刷新…';
    if (skipped > 0) msg += '（跳过无法解码的条目 ' + skipped + ' 条）';
    toast(msg, ICONS.check);
    setTimeout(() => { try { location.reload(); } catch (e) {} }, 800);
  } catch (e) {
    // 意外异常同样走恢复，绝不停在「旧数据已毁新数据未落」的半状态
    const rb = await rollbackFromSnapshot(lsBackup, idbBackup, idbTouched);
    toast(rb.lsOk && rb.idbOk
      ? '导入失败：' + (e && e.message ? e.message : '未知错误') + '，已恢复原数据'
      : '导入失败，且自动恢复未完全成功，建议立即重新导出备份');
  }
}

// ==================== 模块加载即自注册 ====================
// 设置页通过 onclick="window.__dataBackup&&window.__dataBackup.exportBackup()" 调用。
// window 守卫保证在 Node 等无 window 环境下 import 本模块不会报错。
if (typeof window !== 'undefined') {
  try {
    window.__dataBackup = { exportBackup, pickImportFile };
  } catch (e) { /* 某些环境 window 只读时静默失败 */ }
}
