// ==================== archive.js — 压缩/解压 (iframe 嵌入, v9.17 #166) ====================
// JSZip v3.10.1 已 vendor（books epub 解包同款，#166「已付费未使用」系列：零新增体积）。
// 能力：多选 VFS 文件压缩为 .zip（DEFLATE L6）→ /archives/；打开 .zip 浏览包内树；
// 解压逐条写回 VFS（mkdirp 语义自动建父目录）；复制包内清单（clipboard SDK）。
// 范围纪律：只做 zip（rar/7z 需 libarchive wasm，#166 明文不承诺）；zip 炸弹防御（条目 500 / 解压 200MB 上限）。

import { iframeAppContent } from '../iframe-app.js';
import { getAppIconSVG } from '../app-icons.js';

export default {
  id: 'archive',
  name: '压缩解压',
  pages: [
    {
      title: 'ARCHIVE',
      content: iframeAppContent('apps/archive/index.html'),
    },
  ],
};
