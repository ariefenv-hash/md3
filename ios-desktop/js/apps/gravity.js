// ==================== gravity.js — 重力沙盒 (iframe 嵌入) ====================
//
// v9.03 #123：N 体引力轨道演算小玩具（nightsky simul/G.html 2.3KB 极简版的对标超越）。
// 物理核 js/apps/gravity/core.js 纯函数直驱（两两万有引力 + 固定子步辛欧拉 +
// 动量守恒合并 + 双星/三体 8 字解/太阳系三预设），UI 单文件自包含。

import { iframeAppContent } from '../iframe-app.js';

export default {
  id: 'gravity',
  name: '重力沙盒',
  pages: [
    {
      title: '重力沙盒',
      content: iframeAppContent('apps/gravity/index.html'),
    },
  ],
};
