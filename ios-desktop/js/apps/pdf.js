// ==================== pdf.js — PDF 阅读 (iframe 嵌入, v9.18 #164) ====================
// pdf.js v3.11.174 已 vendor（books 内部在用，#164「已付费未使用」系列首发：零新增体积）。
// 能力：VFS 打开 .pdf（fs.read blob → getDocument）、翻页/缩放/目录跳转（getOutline）/文本选择
//      （renderTextLayer 文本层）/全文搜索（逐页文本缓存 + 当页高亮）/复制本页文本（clipboard SDK）。
// SW 预缓存（#164 ⚠️ 响应）：复用 _shared/vendor 同一 URL，SW 按 URL 缓存一次，多应用复用不重复缓存。
// 范围纪律：批注（涂鸦引擎）不做（#164 明文单列——另一套坐标体系）。

import { iframeAppContent } from '../iframe-app.js';
import { getAppIconSVG } from '../app-icons.js';

export default {
  id: 'pdf',
  name: 'PDF 阅读',
  pages: [
    {
      title: 'PDF',
      content: iframeAppContent('apps/pdf/index.html'),
    },
  ],
};
