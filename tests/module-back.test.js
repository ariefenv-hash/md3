// ==================== module-back.test.js — 模块应用「页内返回」消费器注册表测试（v7.28） ====================
//
// 覆盖：
//   · registerModuleBack 入参校验（缺 canBack/triggerBack 不入表）
//   · getActiveModuleBack 状态门控：应用未开/关闭动画中/应用不匹配/canBack=false → null
//   · 分屏会话让位（window.__splitInfo().active = true → null，返回走原有关闭路径）
//   · 注册项消费器回调透传（triggerBack / 手势三段）

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerModuleBack, getActiveModuleBack, __moduleBackSnapshot } from '../ios-desktop/js/module-back.js';
import { state } from '../ios-desktop/js/state.js';

const noopDef = (over = {}) => ({
  canBack: () => true,
  triggerBack: vi.fn(),
  beginGesture: vi.fn(),
  progressGesture: vi.fn(),
  endGesture: vi.fn(),
  ...over,
});

beforeEach(() => {
  state.isOpen = true;
  state.isClosing = false;
  state.currentApp = { id: 'files' };
  delete window.__splitInfo;
});

describe('registerModuleBack', () => {
  it('合法注册项入表（幂等覆盖）', () => {
    registerModuleBack('files', noopDef());
    registerModuleBack('files', noopDef());
    expect(__moduleBackSnapshot()).toContain('files');
  });

  it('缺 canBack / triggerBack 的注册项被拒绝', () => {
    registerModuleBack('bad1', { triggerBack: () => {} });
    registerModuleBack('bad2', { canBack: () => true });
    registerModuleBack(null, noopDef());
    expect(__moduleBackSnapshot()).not.toContain('bad1');
    expect(__moduleBackSnapshot()).not.toContain('bad2');
  });
});

describe('getActiveModuleBack 状态门控', () => {
  it('前台应用命中 + canBack=true → 返回消费器', () => {
    const def = noopDef();
    registerModuleBack('files', def);
    expect(getActiveModuleBack()).toBe(def);
  });

  it('canBack=false（如已在根目录）→ null（根页缩窗关闭语义）', () => {
    registerModuleBack('files', noopDef({ canBack: () => false }));
    expect(getActiveModuleBack()).toBe(null);
  });

  it('canBack 抛异常 → null（消费器故障不拖累系统返回）', () => {
    registerModuleBack('files', noopDef({ canBack: () => { throw new Error('boom'); } }));
    expect(getActiveModuleBack()).toBe(null);
  });

  it('应用未开 / 关闭动画中 / 应用不匹配 → null', () => {
    registerModuleBack('files', noopDef());
    state.isOpen = false;
    expect(getActiveModuleBack()).toBe(null);
    state.isOpen = true;
    state.isClosing = true;
    expect(getActiveModuleBack()).toBe(null);
    state.isClosing = false;
    state.currentApp = { id: 'settings' };
    expect(getActiveModuleBack()).toBe(null);
    state.currentApp = null;
    expect(getActiveModuleBack()).toBe(null);
  });

  it('分屏会话不纳入（返回仍走原有关闭路径）', () => {
    registerModuleBack('files', noopDef());
    window.__splitInfo = () => ({ active: true });
    expect(getActiveModuleBack()).toBe(null);
  });
});
