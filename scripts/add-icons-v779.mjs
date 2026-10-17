#!/usr/bin/env node
// v7.79：提取 5 个 Material Symbols Rounded 官方图标（竖柄滑条/蓝牙连接/音量静音/媒体卡），
// 与 v7.78 fix-icons.mjs 同源同规格（viewBox 0 -960 960 960，fill 版优先）。
import { readFileSync, writeFileSync } from 'fs';

const PKG = '/home/z/my-project/md3-repo/node_modules/@material-symbols/svg-400/rounded';
const ICONS_PATH = '/home/z/my-project/md3-repo/ios-desktop/js/icons.js';

const WANTED = [
  ['bluetooth_connected', 'bluetooth_connected-fill.svg', 'bluetooth_connected.svg'],
  ['settings_brightness', 'settings_brightness-fill.svg', 'settings_brightness.svg'],
  ['volume_off', 'volume_off-fill.svg', 'volume_off.svg'],
  ['music_note', 'music_note-fill.svg', 'music_note.svg'],
  ['headphones', 'headphones-fill.svg', 'headphones.svg'],
];

let src = readFileSync(ICONS_PATH, 'utf8');

const extractPath = (file) => {
  const svg = readFileSync(`${PKG}/${file}`, 'utf8');
  const m = svg.match(/<path d="([^"]+)"/);
  if (!m) throw new Error(`no path in ${file}`);
  return m[1];
};

let added = 0;
for (const [key, fillFile, plainFile] of WANTED) {
  const re = new RegExp(`\\n  ${key}: \`<svg[^>]*>.*?</svg>\`,`);
  if (re.test(src)) { console.log(`${key}: 已存在，跳过`); continue; }
  let d;
  try { d = extractPath(fillFile); }
  catch { d = extractPath(plainFile); }
  const entry = `\n  ${key}: \`<svg viewBox="0 -960 960 960" width="22" height="22" fill="currentColor"><path d="${d}"/></svg>\`,`;
  // 锚定插入：bluetooth_off 之后插 bluetooth_connected；volume_mute 后插 volume_off；
  // 其余插在 brightness 之后（与滑条相关聚合）
  const anchors = {
    bluetooth_connected: 'bluetooth_off',
    settings_brightness: 'brightness',
    volume_off: 'volume_mute',
    music_note: 'skip_next',
    headphones: 'music_note',
  };
  const anchor = anchors[key];
  const anchorRe = new RegExp(`(\\n  ${anchor}: \`<svg[^>]*>.*?</svg>\`,)`);
  if (!anchorRe.test(src)) throw new Error(`anchor ${anchor} not found for ${key}`);
  src = src.replace(anchorRe, `$1${entry}`);
  added++;
  console.log(`${key}: 已插入（anchor=${anchor}）`);
}

writeFileSync(ICONS_PATH, src);
console.log(`DONE +${added}`);
