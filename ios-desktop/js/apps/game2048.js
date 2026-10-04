// ==================== game2048.js — 2048 纸牌接龙 (iframe 嵌入) ====================
//
// v7.29：应用由用户上传的《2048 纸牌接龙 · 莫奈青蓝极速高智版》整体替换原「播客」位。
// 单文件自包含（拖拽出牌 / 连锁合并 / 万能牌与道具 / AI 双层前瞻智脑 / 4 预设主题与
// 自定义壁纸 / 成就战绩 / localStorage 续局）。品牌色系为游戏本体（--sol-* 命名空间，
// 不随宿主题联动），详见 apps/game2048/index.html 头部集成说明。

import { iframeAppContent } from '../iframe-app.js';

export default {
  id: 'game2048',
  name: '2048 接龙',
  pages: [
    {
      title: '2048 纸牌接龙',
      content: iframeAppContent('apps/game2048/index.html'),
    },
  ],
};
