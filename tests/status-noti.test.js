// ==================== status-noti.test.js — 状态栏通知图标实时化测试（v7.28） ====================
//
// 覆盖 getStatusBarInnerHtml 的通知图标区派生逻辑（数据源 = 通知中心同一真源）：
//   · ≤4 条通知 → 每条对应图标（有真实应用图标用桌面本体图标）
//   · >4 条 → 前 4 枚图标 + “+N” 溢出计数
//   · 应用名 / 通知 id 属性转义（应用可控文本防注入）
//   · showNotiIcons=false（应用内状态栏）不带通知图标区
//   · 音乐播放指示随容器重建在场（display 由播放态决定）
//
// 通知持久化在 notifications.js 模块求值期读取 → 每场景 vi.resetModules 后按需播种。

import { describe, it, expect, vi } from 'vitest';

const KEY = 'ios-desktop:notifications';

function seedList(n) {
  const apps = ['msg', 'cal_app', 'settings', 'phone', 'notes', 'game2048'];
  const list = [];
  for (let i = 0; i < n; i++) {
    list.push({
      id: 't' + i,
      app: '应用 ' + i,
      appId: apps[i % apps.length],
      title: '标题 ' + i,
      desc: '内容 ' + i,
      time: '刚刚',
      category: 'Silent / 静默与系统通知',
    });
  }
  return list;
}

async function freshStatusBar(seed) {
  localStorage.setItem(KEY, JSON.stringify(seed));
  vi.resetModules();
  // 注意：先以 state.js 为入口重建模块图 —— 项目存在 state↔apps-data（settings.js）
  // 预存循环，若 apps-data 先于 state 求值（如经 status-bar→notifications→apps-data
  // 路径），state.js 顶层 _initialApps.slice 会撞上未完成命名空间。state 先行 =
  // 与 main.js 生产求值序一致，循环安全。
  await import('../ios-desktop/js/state.js');
  return import('../ios-desktop/js/status-bar.js');
}

function parseArea(html) {
  // DOM 化提取（正则非贪婪会被内层 </span> 提前截断）
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const area = tpl.content.querySelector('.status-noti-icons');
  const moreEl = area ? area.querySelector('.noti-st-more') : null;
  return {
    html: area ? area.innerHTML : '',
    iconCount: area ? area.querySelectorAll('.noti-st-icon').length : 0,
    ids: area ? [...area.querySelectorAll('.noti-st-icon')].map((el) => el.dataset.notiId) : [],
    more: moreEl ? moreEl.textContent : null,
    hasMusic: !!(area && area.querySelector('.noti-music-icon')),
  };
}

describe('状态栏通知图标（v7.28 实时化）', () => {
  it('3 条通知 → 3 枚对应图标 + 音乐指示在场', async () => {
    const m = await freshStatusBar(seedList(3));
    const a = parseArea(m.getStatusBarInnerHtml(true));
    expect(a.iconCount).toBe(3);
    expect(a.hasMusic).toBe(true);
    expect(a.more).toBe(null);
    // 与旧版写死单图标的区别：不再恒定渲染 notification_chat 占位
    expect(a.html).not.toContain('noti-msg-icon');
  });

  it('6 条通知 → 4 枚图标 + “+2” 溢出计数', async () => {
    const m = await freshStatusBar(seedList(6));
    const a = parseArea(m.getStatusBarInnerHtml(true));
    expect(a.iconCount).toBe(4);
    expect(a.more).toBe('+2');
  });

  it('15 条通知 → 溢出计数封顶显示 “+9+”', async () => {
    const m = await freshStatusBar(seedList(15));
    const a = parseArea(m.getStatusBarInnerHtml(true));
    expect(a.iconCount).toBe(4);
    expect(a.more).toBe('+9+');
  });

  it('应用名含引号 → title 属性转义（防属性逃逸）', async () => {
    const seed = seedList(1);
    seed[0].app = '应用"x OnClick=alert(1)';
    const m = await freshStatusBar(seed);
    const a = parseArea(m.getStatusBarInnerHtml(true));
    expect(a.html).toContain('&quot;');
    expect(a.html).not.toMatch(/title="[^"]*"[^>]*onclick/i);
  });

  it('showNotiIcons=false（应用内状态栏）→ 无通知图标区', async () => {
    const m = await freshStatusBar(seedList(3));
    const html = m.getStatusBarInnerHtml(false);
    expect(html).not.toContain('status-noti-icons');
  });

  it('通知 id 透传 data-noti-id（供点击路由扩展）', async () => {
    const m = await freshStatusBar(seedList(2));
    const a = parseArea(m.getStatusBarInnerHtml(true));
    expect(a.ids).toEqual(['t0', 't1']);
  });
});
