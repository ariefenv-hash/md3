// ==================== share-registry.js — 分享目标注册表（纯数据层，无 DOM 依赖） ====================
//
// v7.19 应用互联批次的核心数据声明：系统分享面板展示哪些目标、
// 每个目标接受什么内容类型。与 UI 层（share-sheet.js）解耦，
// 便于单元测试（tests/share-registry.test.js）与未来扩展第三方目标。
//
// v7.24 第二批：新增「日历 / 提醒事项」两个文本目标（任何文本分享可转当日笔记/待办任务），
// 并支持按应用安装状态动态过滤（removedApps —— 用户卸载的应用不再出现在目标列表）。
//
// 内容类型（kinds）：
//   'text'  — payload.text 为非空文本
//   'image' — payload.imageDataUrl 为 data:image/* 图片
//
// 约定：
//   - 发起分享的应用自身（from）不出现在目标列表里（不能分享给自己）
//   - 无有效内容（文本与图片均缺）时目标列表为空，UI 层应拒绝打开面板
//   - clipboard 目标代表系统能力而非桌面应用，永不受卸载过滤影响

/** 系统分享目标定义（顺序即面板展示顺序） */
export const SHARE_TARGET_DEFS = [
  { id: 'msg',       appId: 'msg',       label: '信息',     kinds: ['text'] },
  { id: 'notes',     appId: 'notes',     label: '备忘录',   kinds: ['text'] },
  { id: 'cal',       appId: 'cal_app',   label: '日历',     kinds: ['text'] },
  { id: 'reminders', appId: 'reminders', label: '提醒事项', kinds: ['text'] },
  { id: 'photo',     appId: 'photo',     label: '存入相册', kinds: ['image'] },
  { id: 'files',     appId: 'files',     label: '存储到文件', kinds: ['text', 'image'] },
  { id: 'translate', appId: 'translate', label: '翻译',     kinds: ['text'] },
  { id: 'clipboard', appId: 'clipboard', label: '拷贝',     kinds: ['text', 'image'], system: true },
];

/** 图片 dataURL 前缀校验（与 clipboard.js 的图片校验口径一致） */
function isImagePayload(dataUrl) {
  return typeof dataUrl === 'string' && dataUrl.startsWith('data:image');
}

/** 提取分享载荷的内容类型列表：['text'] / ['image'] / ['text','image'] / [] */
export function shareKindsOf(payload) {
  const kinds = [];
  if (!payload || typeof payload !== 'object') return kinds;
  const text = payload.text == null ? '' : String(payload.text);
  if (text.trim()) kinds.push('text');
  if (isImagePayload(payload.imageDataUrl)) kinds.push('image');
  return kinds;
}

/** 载荷是否具备可分享内容 */
export function isShareable(payload) {
  return shareKindsOf(payload).length > 0;
}

/** 归一化卸载应用 id 集合：兼容字符串数组与 {id,...} 对象数组（state.removedApps 实际形态） */
function toRemovedSet(removedAppIds) {
  const set = new Set();
  if (!Array.isArray(removedAppIds)) return set;
  for (const it of removedAppIds) {
    if (typeof it === 'string') set.add(it);
    else if (it && typeof it === 'object' && typeof it.id === 'string') set.add(it.id);
  }
  return set;
}

/**
 * 计算分享面板可用目标列表。
 * @param {object} payload 分享载荷 { title?, text?, imageDataUrl?, name? }
 * @param {string} fromAppId 发起方应用 id（从目标中剔除）
 * @param {Array<string|{id:string}>} [removedAppIds] 已卸载应用（id 或含 id 的对象；v7.24）
 *   —— 目标对应的桌面应用被卸载时不再展示（clipboard 为系统能力，不受影响）
 * @returns {Array<{id,appId,label}>} 可用目标（保持注册表顺序）
 */
export function buildShareTargets(payload, fromAppId, removedAppIds) {
  const kinds = shareKindsOf(payload);
  if (!kinds.length) return [];
  const kindSet = new Set(kinds);
  const removed = toRemovedSet(removedAppIds);
  return SHARE_TARGET_DEFS
    .filter((t) => t.id !== fromAppId && t.appId !== fromAppId) // 不分享给自己
    // v7.24：卸载即隐目标；system:true 的目标（如剪贴板）代表系统能力而非桌面应用，永不过滤
    .filter((t) => t.system || (!removed.has(t.appId) && !removed.has(t.id)))
    .filter((t) => t.kinds.some((k) => kindSet.has(k)));
}

/** 按目标 id 查注册表定义（面板点击分发用） */
export function findShareTarget(id) {
  return SHARE_TARGET_DEFS.find((t) => t.id === id) || null;
}
