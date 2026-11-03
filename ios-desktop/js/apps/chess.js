// ==================== chess.js — 国际象棋 (iframe 嵌入, v9.71 #132) ====================
// #132（daedalOS Chess 借鉴）：完整规则（易位/过路兵/升变/将死/逼和/三次重复/五十步）+ AI 三档
// （minimax α-β 深度 1/2/3）+ SAN 棋谱。纯逻辑核 js/chess-core.js（perft 金标验证）。
// 准入六条对齐（#179）：MD3 令牌全量 / @media 断点 / 平板棋盘·棋谱分栏 / VFS+sysNotify SDK 接入 /
// 工具栏整排按压联动（tile-bounce 范式）。超越项：AOSP 无棋类应用，零依赖零网络离线可用。

import { iframeAppContent } from '../iframe-app.js';

export default {
  id: 'chess',
  name: 'Chess',
  pages: [
    {
      title: 'CHESS',
      content: iframeAppContent('apps/chess/index.html'),
    },
  ],
};
