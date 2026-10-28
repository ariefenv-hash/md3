// ==================== driving.js — 驾考题库 (iframe 嵌入, v8.55 #62) ====================
// #12 P2 首位：科目一/科目四本地刷题（精编 200 题内嵌，零外发零网络）。
// 四模式（顺序/随机/模拟考/错题本）+ 模拟考墙钟计时（后台回前台不漂移）+
// 错题本艾宾浩斯复习队列（#28 同构）。纯函数在 js/driving-core.js（vitest 锚），
// 页面侧 apps/driving/ 只做接线。

import { iframeAppContent } from '../iframe-app.js';

export default {
  id: 'driving',
  name: '驾考题库',
  pages: [
    {
      title: '驾考题库',
      content: iframeAppContent('apps/driving/index.html'),
    },
  ],
};
