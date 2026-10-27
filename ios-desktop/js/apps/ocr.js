// ==================== ocr.js — OCR 文字识别 (iframe 嵌入, v8.52 #58) ====================
// #12 P1 第三位：Tesseract.js 5 文字识别（中英混合），vendor 全量离线内嵌
// （worker + SIMD/LSTM wasm 双核 + best_int 三语言包），零 CDN 纪律。
// 纯函数在 js/ocr-core.js（vitest 锚），页面侧 apps/ocr/ 只做接线。

import { iframeAppContent } from '../iframe-app.js';

export default {
  id: 'ocr',
  name: 'OCR 文字识别',
  pages: [
    {
      title: 'OCR 文字识别',
      content: iframeAppContent('apps/ocr/index.html'),
    },
  ],
};
