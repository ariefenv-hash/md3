#!/usr/bin/env node
// ==================== make-demo-pkg.mjs — 生成演示安装包（v7.52） ====================
//
// 产出一个符合 README「第六章 .mdapp 格式规范」的最小可用演示包：
//   manifest.json（矢量 SVG 图标 + notifications 权限声明）
//   index.html   （演示 __system.requestPermission / notify / fs 持久化 / 主题变量）
//   icon.svg     （矢量图标：写 hsl(calc(var(--md-h,215) …)) 即跟随系统主题色）
//
// 用法：node scripts/make-demo-pkg.mjs [输出路径]   （默认 hello-world.mdapp）
// 零依赖：直接以 STORE（不压缩）方式拼装 ZIP 字节。

import { writeFileSync } from 'node:fs';

const MANIFEST = {
  id: 'com.demo.hello',
  name: '你好世界',
  version: '1.0.0',
  author: 'md3 demo',
  description: '安装包功能演示：主题跟随 / 系统通知 / 文件持久化',
  icon: 'icon.svg',
  permissions: ['notifications'],
};

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) + 43.31) 89.53% 66.27%)"/>
  <circle cx="50" cy="50" r="24" fill="#FFFFFF"/>
  <circle cx="50" cy="50" r="11" style="fill:hsl(calc(var(--md-h,215) + 48.5) 67.42% 34.9%)"/>
</svg>`;

const INDEX = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>你好世界</title>
<link rel="icon" href="icon.svg">
<style>
  body { margin:0; font-family:system-ui,-apple-system,'Noto Sans SC',sans-serif;
         background:var(--md-surface,#141418); color:var(--md-on-surface,#e3e3e3);
         display:flex; flex-direction:column; align-items:center; justify-content:center;
         min-height:100vh; gap:14px; padding:24px; box-sizing:border-box; text-align:center; }
  h1 { font-size:26px; margin:0; }
  p { color:var(--md-on-surface-variant,#9a9b9e); font-size:13px; line-height:1.7; margin:0; }
  button { font:inherit; font-weight:600; color:#fff; border:none; border-radius:22px;
           padding:11px 22px; background:hsl(var(--md-h,215) 62% 52%); cursor:pointer; }
  button.ghost { color:hsl(var(--md-h,215) 70% 72%); background:hsl(var(--md-h,215) 60% 50% / .14); }
  .visits { font-size:12px; color:var(--md-on-surface-variant,#9a9b9e); }
</style>
</head>
<body>
  <h1>你好，世界</h1>
  <p>这个应用来自一个 .mdapp 安装包 —— 图标、名称与权限声明全部由包内 manifest 与文件自动识别。<br>
     主题色 / 明暗模式跟随系统实时同步（试试在设置里换主题色）。</p>
  <button id="notifyBtn">发一条系统通知</button>
  <button id="saveBtn" class="ghost">记一次访问（__system.fs 持久化）</button>
  <div class="visits" id="visits">读取中…</div>
<script>
(function () {
  function refreshVisits() {
    if (!window.__system || !window.__system.fs) { return; }
    __system.fs.read('/hello-visits.txt').then(function (data) {
      var n = 0;
      try { n = parseInt((data && data.text) || '0', 10) || 0; } catch (e) {}
      document.getElementById('visits').textContent = '已记录访问 ' + n + ' 次（存放在虚拟文件系统 /hello-visits.txt）';
    });
  }
  document.getElementById('saveBtn').addEventListener('click', function () {
    if (!window.__system || !window.__system.fs) { return; }
    __system.fs.read('/hello-visits.txt').then(function (data) {
      var n = 0;
      try { n = parseInt((data && data.text) || '0', 10) || 0; } catch (e) {}
      return __system.fs.write('/hello-visits.txt', String(n + 1));
    }).then(refreshVisits);
  });
  document.getElementById('notifyBtn').addEventListener('click', function () {
    if (!window.__system || !window.__system.requestPermission) { return; }
    __system.requestPermission('notifications').then(function (granted) {
      if (granted) __system.notify({ title: '你好世界', body: '这是来自安装包应用的系统通知' });
    });
  });
  if (window.__system) { refreshVisits(); } else {
    window.addEventListener('__system-ready', refreshVisits);
  }
})();
</script>
</body>
</html>
`;

// ---------- ZIP（STORE）拼装 ----------
function crc32(u8) {
  let c = ~0;
  for (let i = 0; i < u8.length; i++) {
    c ^= u8[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function buildZip(entries) {
  const enc = new TextEncoder();
  const chunks = [];
  const centrals = [];
  let offset = 0;
  const u16 = (v) => [v & 255, (v >> 8) & 255];
  const u32 = (v) => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];

  for (const e of entries) {
    const name = enc.encode(e.name);
    const data = enc.encode(e.text);
    const crc = crc32(data);
    chunks.push(new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0),
      ...u16(0), ...u16(0), ...u32(crc), ...u32(data.length), ...u32(data.length),
      ...u16(name.length), ...u16(0)]), name, data);
    centrals.push({ name, crc, size: data.length, offset });
    offset += 30 + name.length + data.length;
  }
  const cdStart = offset;
  for (const c of centrals) {
    chunks.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0),
      ...u16(0), ...u16(0), ...u32(c.crc), ...u32(c.size), ...u32(c.size),
      ...u16(c.name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(c.offset)]), c.name);
    offset += 46 + c.name.length;
  }
  chunks.push(new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(centrals.length), ...u16(centrals.length),
    ...u32(offset - cdStart), ...u32(cdStart), ...u16(0)]));
  const out = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0));
  let p = 0;
  for (const c of chunks) { out.set(c, p); p += c.length; }
  return out;
}

const outPath = process.argv[2] || 'hello-world.mdapp';
const zip = buildZip([
  { name: 'manifest.json', text: JSON.stringify(MANIFEST, null, 2) },
  { name: 'index.html', text: INDEX },
  { name: 'icon.svg', text: ICON },
]);
writeFileSync(outPath, zip);
console.log(`已生成演示安装包：${outPath}（${(zip.length / 1024).toFixed(1)} KB）`);
console.log('把它导入桌面的「安装包」应用即可体验：自动识别图标名称 → 权限确认 → 安装上桌。');
