// ==================== drawcircle.js — 画圆挑战 (iframe 嵌入, v9.05 #124) ====================
// 手绘圆精度评分：圆度（径向方差 CV）/ 闭合（角覆盖）/ 重合（起止点距）三指标加权
// + 最高分 localStorage 留存（nightsky simul/drawcircle.html 对标超越，零依赖纯 Canvas）

import { iframeAppContent } from '../iframe-app.js';
import { getAppIconSVG } from '../app-icons.js';

export default {
  id: 'drawcircle',
  name: '画圆挑战',
  pages: [
    {
      title: 'DRAW CIRCLE',
      content: iframeAppContent('apps/drawcircle/index.html'),
    },
  ],
};
