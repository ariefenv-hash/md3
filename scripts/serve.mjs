#!/usr/bin/env node
// ==================== serve.mjs — md3 本地静态服务器（npm start） ====================
//
// 为什么需要它：
//   本项目是纯静态站点 + 原生 ES Module，直接双击 index.html（file:// 协议）会被
//   浏览器 CORS 策略拦截，必须经由 HTTP 服务。本脚本提供零依赖、开箱即用的一键起服：
//     1. 零依赖：只用 Node 内置模块，npm install 后无需任何第三方包；
//     2. 自动选端口：优先 8080，被占用则依次向后尝试至 8089，全部占用则随机空闲端口；
//     3. 自动开浏览器：Win/macOS/Linux 自动拉起默认浏览器（--no-open 可关闭）；
//     4. no-store 防缓存：开发期所有响应禁用 HTTP 缓存，改完代码刷新即生效
//        （注意：Service Worker 的缓存是另一层，见 README FAQ「改了代码还是旧版」）；
//     5. 友好 404：常见「站点根不对」场景给出中文指引（白底板问题第一根因）。
//
// 用法：
//   npm start                # 起服 + 自动开浏览器
//   node scripts/serve.mjs   # 等价
//   npm start -- --no-open   # 只起服不开浏览器（脚本/CI 场景）
//   npm start -- --port 3000 # 指定首选端口

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import os from 'node:os';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const noOpen = args.includes('--no-open');
const portArgIdx = args.indexOf('--port');
const preferredPort = portArgIdx !== -1 ? Number(args[portArgIdx + 1]) : 8080;

// ---------- MIME ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

// ---------- 404 页 ----------
function notFoundPage(urlPath) {
  return `<!doctype html><meta charset="utf-8"><title>404</title>
<body style="font-family:system-ui,-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;background:#0d1117;color:#e6edf3;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
<div style="max-width:640px;padding:0 24px">
  <h1 style="font-size:22px">404 · 没找到 ${escapeHtml(urlPath)}</h1>
  <p style="line-height:1.8;color:#9aa4b2">这个地址在仓库里不存在。如果你是在<strong>打开某个应用时</strong>看到本页，
  几乎可以肯定是<strong>站点根目录不对</strong>：必须以仓库根目录（含 index.html、ios-desktop/、apps 的那一层，
  即本项目的 md3 目录）作为服务器根目录启动，而不能把 ios-desktop/ 或其子目录当作根。</p>
  <p style="line-height:1.8;color:#9aa4b2">正确做法：回到仓库根目录执行 <code style="background:#161b22;padding:2px 6px;border-radius:4px">npm start</code>，
  然后访问打印出的地址（根路径 <code style="background:#161b22;padding:2px 6px;border-radius:4px">/</code> 即可进入桌面）。</p>
</div></body>`;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- 静态服务 ----------
async function serveFile(res, filePath) {
  const data = await readFile(filePath);
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store, max-age=0',
  });
  res.end(data);
}

async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let urlPath = decodeURIComponent(url.pathname);
  if (urlPath.endsWith('/')) urlPath += 'index.html';
  // 防目录穿越：解析后必须仍在 ROOT 内
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end('403 Forbidden');
  }
  try {
    const st = await stat(filePath);
    if (st.isDirectory()) {
      return serveFile(res, path.join(filePath, 'index.html'));
    }
    return await serveFile(res, filePath);
  } catch {
    // SPA 兜底：未知路径且非文件请求 → 根壳（保持根路径体验一致）
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(notFoundPage(urlPath));
  }
}

// ---------- 端口探测 ----------
function tryListen(port) {
  return new Promise((resolve) => {
    const srv = http.createServer(handler);
    srv.once('error', () => resolve(null));
    srv.listen(port, '127.0.0.1', () => resolve(srv));
  });
}

async function pickPort() {
  const candidates = [];
  if (Number.isInteger(preferredPort) && preferredPort > 0 && preferredPort < 65536) {
    candidates.push(preferredPort);
  }
  for (let p = 8080; p <= 8089; p++) if (!candidates.includes(p)) candidates.push(p);
  for (const p of candidates) {
    const srv = await tryListen(p);
    if (srv) return srv;
  }
  return tryListen(0); // 随机空闲端口
}

// ---------- 开浏览器 ----------
function openBrowser(urlStr) {
  try {
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', urlStr], { detached: true, stdio: 'ignore' }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [urlStr], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [urlStr], { detached: true, stdio: 'ignore' }).on('error', () => {}).unref();
    }
  } catch { /* 打不开就算了，地址已在终端打印 */ }
}

// ---------- 启动 ----------
const srv = await pickPort();
if (!srv) {
  console.error('未能找到可用端口，请用 --port 指定一个。');
  process.exit(1);
}
const port = srv.address().port;
const lanIps = Object.values(os.networkInterfaces()).flat()
  .filter((n) => n && n.family === 'IPv4' && !n.internal)
  .map((n) => n.address);

const line = '─'.repeat(56);
console.log(`
\x1b[32m${line}
  安卓16极客 · 本地服务器已启动
${line}\x1b[0m
  ➜  地址        \x1b[1mhttp://localhost:${port}/\x1b[0m
  ➜  跳过锁屏    http://localhost:${port}/?nolock=1
  ➜  站点根      ${ROOT}
     （必须是仓库根目录，含 ios-desktop/ 的那一层）
  ➜  手机真机    ${lanIps.length ? `http://${lanIps[0]}:${port}/  （需与电脑同一 Wi-Fi）` : '与电脑同一 Wi-Fi 后用电脑局域网 IP 访问'}
  ➜  停止        Ctrl + C

  提示：本服务已禁用 HTTP 缓存，改完代码刷新即生效；
  若仍见旧版，是 Service Worker 缓存层，见 README FAQ。
${line}
`);
if (!noOpen) openBrowser(`http://localhost:${port}/`);
