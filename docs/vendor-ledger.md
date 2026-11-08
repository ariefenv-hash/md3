<!-- docs/vendor-ledger.md — vendored 供应链台账（#279） -->
<!-- 维护纪律：vendor 顶层文件必须与台账一一对账（check:comments 三期强检）；
     版本/license 仅登记「文件内实证」事实，文件内不可考处如实登记绝不编造（#149 注释=代码纪律）； -->

# vendored 供应链台账

- **范围**：`ios-desktop/apps/_shared/vendor/` 顶层文件（子目录 geometries/ ocr/ phosphor/ 不在台账与门禁范围）；
- **升级策略定档（#279 建议③）**：安全修复跟、大版本不主动追——CVE 对号以本表「版本（文件内实证）」列为准；
- **来源头注释**：每个 vendor 顶层文件头部含 `/* vendor: … */` 单行来源头（version/src/license/ledger 四栏，有据填据、无据填不可考），check:comments 三期强检（缺头/台账未登记即红）；
- **LICENSE 文本归档**：midi-player-bundle（bundled LICENSE.txt）/ three（SPDX 标识）/ marked / highlight / jszip（banner 双许可）/ pdf 两件（Apache-2.0 banner）在案；cannon-es.js / epub.min.js / codemirror-bundle.mjs / github-dark.min.css 文件内零 license 文本——分发许可文本随库入库缺口如实登记，补归档留后续（不搬运二进制、不改 vendor 字面内容）。

| 文件 | 库 | 版本（文件内实证） | license（文件内实证） | src（文件内实证） | 考古注记 |
|---|---|---|---|---|---|
| three.module.js | three.js | r160（REVISION=160） | MIT（SPDX-License-Identifier 实证） | 不可考（文件内零 URL） | Copyright 2010-2023 Three.js Authors banner 在案 |
| jszip.min.js | JSZip | 3.10.1 | MIT 或 GPLv3 双许可（banner 实证 Stuart Knightley） | 不可考 | (c) 2009-2016 banner 在案 |
| marked.min.js | marked | 15.0.12 | MIT（banner 实证 Christopher Jeffrey） | https://github.com/markedjs/marked（banner 实证） | DO NOT EDIT 生成件声明在案 |
| highlight.min.js | highlight.js | 11.9.0 | BSD-3-Clause（banner 实证） | 不可考 | — |
| github-dark.min.css | highlight.js github-dark theme | 不可考（随 highlight.js 发行，Updated 2021-05-15 实证） | 不可考（Author github.com / Maintainer @Hirse 实证） | 不可考 | 主题 css 随 highlight.js 发行 |
| pdf.min.js | pdf.js | 3.11.174 | Apache-2.0（Apache License, Version 2.0 + Copyright 2023 Mozilla Foundation） | 不可考（文件内零 URL） | #295 前即有 Mozilla 2023 字样，版本经本卡考古补证 |
| pdf.worker.min.js | pdf.js worker | 3.11.174 | Apache-2.0（同上 banner 实证） | 不可考（文件内零 URL） | 与主件同版（worker 内版本串实证） |
| cannon-es.js | cannon-es.js | 不可考（文件内零 semver 串） | 不可考（文件内零 license 文本） | 不可考 | 「1.5.8」系 bulletphysics wiki URL 误命中已排除（本卡考古实录） |
| epub.min.js | epub.js | 不可考（EPUBJS_VERSION 经 webpack 间接引用丢失） | 不可考 | 不可考 | 依赖 JSZip（UMD require 实证） |
| codemirror-bundle.mjs | CodeMirror 6 bundle | 不可考（@codemirror/* 多包聚合零单一 semver） | 不可考 | 不可考 | @codemirror/state 引用在案 |
| midi-player-bundle.mjs | html-midi-player | 1.5.0 | BSD-2-Clause（bundled LICENSE.txt 实证） | https://github.com/cifkao/html-midi-player.git（bundled license 块实证） | esbuild Bundled license information 块在案 |

## 考古方法与不可考声明

- 版本/license/src 三栏只认「文件内实证」（banner、REVISION、bundled license 块、UMD require）；
- cannon-es.js 的「1.5.8」命中经上下文核查为 `https://web.archive.org/web/20180426154531/http://bulletphysics.org/mediawiki-1.5.8/…` URL 片段，非库版本——不采信（#149 反面教材实录：数值注释必须可核对）；
- epub.min.js 的 EPUBJS_VERSION=h.b 经 webpack 模块间接引用，bundle 内无内联 semver 串——版本不可考；
- codemirror-bundle.mjs 为多包聚合产物，无单一版本号——按 apps-data.js 既有注释口径登记为 CodeMirror 6 bundle；
- 升级这四件时必须先重建版本锚（换未压缩带版本的 dist 产物或记录下载 tag），否则台账版本栏永远缺位。
