// ==================== tests/share-registry.test.js — 分享目标注册表（v7.19 应用互联）测试 ====================
//
// 覆盖 share-registry.js 纯数据层：
//   · shareKindsOf 内容类型提取：空载荷 / 纯文本 / 纯图片 / 文本+图片 / 非法 dataURL
//   · isShareable 判定（面板是否拒绝打开）
//   · buildShareTargets 目标过滤：按内容类型匹配 + 发起方剔除 + 注册表顺序保持
//   · findShareTarget 查找与未知 id 回退
//
// 关键业务规则（与 share-sheet.js 执行器一一对应）：
//   - 纯文本 → 信息/备忘录/日历/提醒事项/文件/翻译/剪贴板（无相册）
//   - 纯图片 → 相册/文件/剪贴板（无信息/备忘录/日历/提醒/翻译）
//   - 发起方自身永远不出现在目标列表（如 notes 发起则无「备忘录」目标）
//   - v7.24：removedApps（已卸载应用，字符串或 {id} 对象数组）对应目标被隐藏；
//     clipboard 为系统能力永不受影响；不传参数保持全部目标（向后兼容）

import { describe, it, expect } from 'vitest';
import {
  SHARE_TARGET_DEFS,
  shareKindsOf,
  isShareable,
  buildShareTargets,
  findShareTarget,
} from '../ios-desktop/js/share-registry.js';

const PNG_1PX = 'data:image/png;base64,iVBORw0KGgo=';

describe('分享注册表 · 内容类型提取 shareKindsOf', () => {
  it('空载荷 / 非对象 / 纯空白文本 → 无任何内容', () => {
    expect(shareKindsOf(null)).toEqual([]);
    expect(shareKindsOf(undefined)).toEqual([]);
    expect(shareKindsOf('str')).toEqual([]);
    expect(shareKindsOf({ text: '' })).toEqual([]);
    expect(shareKindsOf({ text: '   \n  ' })).toEqual([]);
    expect(shareKindsOf({})).toEqual([]);
  });

  it('纯文本 → [text]', () => {
    expect(shareKindsOf({ text: '你好，世界' })).toEqual(['text']);
  });

  it('纯图片 → [image]；图片 dataURL 前缀严格校验', () => {
    expect(shareKindsOf({ imageDataUrl: PNG_1PX })).toEqual(['image']);
    // 非 data:image 前缀一律不认（与 clipboard.js 图片校验口径一致）
    expect(shareKindsOf({ imageDataUrl: 'https://example.com/a.png' })).toEqual([]);
    expect(shareKindsOf({ imageDataUrl: 'data:text/plain;base64,AAAA' })).toEqual([]);
    expect(shareKindsOf({ imageDataUrl: 123 })).toEqual([]);
  });

  it('文本 + 图片 → [text, image]', () => {
    expect(shareKindsOf({ text: '说明', imageDataUrl: PNG_1PX })).toEqual(['text', 'image']);
  });
});

describe('分享注册表 · isShareable', () => {
  it('有任一有效内容即可分享；两者皆无则拒绝', () => {
    expect(isShareable({ text: 'hi' })).toBe(true);
    expect(isShareable({ imageDataUrl: PNG_1PX })).toBe(true);
    expect(isShareable({ title: '只有标题没有正文' })).toBe(false);
    expect(isShareable(null)).toBe(false);
  });
});

describe('分享注册表 · buildShareTargets', () => {
  it('纯文本 → 信息/备忘录/日历/提醒事项/文件/翻译/剪贴板，无相册', () => {
    const ids = buildShareTargets({ text: 'hello' }, '').map(t => t.id);
    expect(ids).toEqual(['msg', 'notes', 'cal', 'reminders', 'files', 'translate', 'clipboard']);
  });

  it('纯图片 → 相册/文件/剪贴板，无文本类目标', () => {
    const ids = buildShareTargets({ imageDataUrl: PNG_1PX }, '').map(t => t.id);
    expect(ids).toEqual(['photo', 'files', 'clipboard']);
  });

  it('文本+图片 → 全部八类目标', () => {
    const ids = buildShareTargets({ text: 'a', imageDataUrl: PNG_1PX }, '').map(t => t.id);
    expect(ids).toEqual(['msg', 'notes', 'cal', 'reminders', 'photo', 'files', 'translate', 'clipboard']);
  });

  it('发起方应用自身被剔除（不能分享给自己）', () => {
    const ids = buildShareTargets({ text: 'x' }, 'notes').map(t => t.id);
    expect(ids).not.toContain('notes');
    expect(ids).toEqual(['msg', 'cal', 'reminders', 'files', 'translate', 'clipboard']);
  });

  it('发起方为日历时同时剔除 cal 目标（id 与 appId 双向匹配）', () => {
    const ids = buildShareTargets({ text: 'x' }, 'cal_app').map(t => t.id);
    expect(ids).not.toContain('cal');
    expect(ids).toEqual(['msg', 'notes', 'reminders', 'files', 'translate', 'clipboard']);
  });

  it('空载荷 → 空目标列表（面板层据此拒绝打开）', () => {
    expect(buildShareTargets({}, '')).toEqual([]);
    expect(buildShareTargets(null, 'msg')).toEqual([]);
  });

  it('返回条目携带 appId/label（渲染与分发所需字段完整）', () => {
    const targets = buildShareTargets({ text: 'x' }, '');
    for (const t of targets) {
      expect(typeof t.appId).toBe('string');
      expect(typeof t.label).toBe('string');
      expect(t.appId.length).toBeGreaterThan(0);
    }
  });
});

describe('分享注册表 · findShareTarget', () => {
  it('按 id 精确查找；未知 id 返回 null', () => {
    expect(findShareTarget('msg').appId).toBe('msg');
    expect(findShareTarget('clipboard').label).toBe('拷贝');
    expect(findShareTarget('nonexistent')).toBeNull();
    expect(findShareTarget(null)).toBeNull();
  });

  it('注册表本体保持声明完整（八目标、顺序稳定）', () => {
    expect(SHARE_TARGET_DEFS.map(t => t.id)).toEqual(
      ['msg', 'notes', 'cal', 'reminders', 'photo', 'files', 'translate', 'clipboard']
    );
  });
});

describe('分享注册表 · 动态过滤 removedAppIds（v7.24）', () => {
  it('已卸载应用对应目标被隐藏（字符串 id 形态）', () => {
    const ids = buildShareTargets({ text: 'x' }, '', ['cal_app', 'reminders']).map(t => t.id);
    expect(ids).toEqual(['msg', 'notes', 'files', 'translate', 'clipboard']);
  });

  it('state.removedApps 实际形态（{id,...} 对象数组）同样生效', () => {
    const ids = buildShareTargets({ text: 'x' }, '', [{ id: 'files', name: '文件' }]).map(t => t.id);
    expect(ids).toEqual(['msg', 'notes', 'cal', 'reminders', 'translate', 'clipboard']);
  });

  it('卸载「文件」后图片分享仍可用（files 隐藏，其余不动）', () => {
    const ids = buildShareTargets({ imageDataUrl: PNG_1PX }, '', ['files']).map(t => t.id);
    expect(ids).toEqual(['photo', 'clipboard']);
  });

  it('clipboard 为系统能力，永不被卸载过滤影响', () => {
    const ids = buildShareTargets({ text: 'x' }, '', ['clipboard']).map(t => t.id);
    expect(ids).toContain('clipboard');
  });

  it('不传 / 空数组 / 乱类型 → 保持全部目标（向后兼容）', () => {
    const all = ['msg', 'notes', 'cal', 'reminders', 'files', 'translate', 'clipboard'];
    expect(buildShareTargets({ text: 'x' }, '').map(t => t.id)).toEqual(all);
    expect(buildShareTargets({ text: 'x' }, '', []).map(t => t.id)).toEqual(all);
    expect(buildShareTargets({ text: 'x' }, '', ['不存在应用']).map(t => t.id)).toEqual(all);
    expect(buildShareTargets({ text: 'x' }, '', null).map(t => t.id)).toEqual(all);
  });

  it('卸载过滤与发起方剔除叠加（from + removed 同时作用）', () => {
    const ids = buildShareTargets({ text: 'x' }, 'notes', ['cal_app', 'translate']).map(t => t.id);
    expect(ids).toEqual(['msg', 'reminders', 'files', 'clipboard']);
  });
});
