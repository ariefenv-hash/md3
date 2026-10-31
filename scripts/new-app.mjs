#!/usr/bin/env node
// ==================== new-app.mjs — 子应用脚手架 CLI（批次五） ====================
//
// 用法：npm run new-app <name> [中文标题] [--multi]
//   npm run new-app weather-widget 天气小件
//   npm run new-app clock-v2 时钟 --multi     # v9.05 #152：多文件形态
//
// 行为：
//   1. 校验名称（kebab-case：小写字母/数字/连字符）
//   2. 单文件模式：以 scripts/app-template.html 生成 ios-desktop/apps/<name>/index.html
//      多文件模式（--multi）：以 scripts/app-template-multi/ 生成
//      index.html + style.css + app.mjs 三件套
//      （占位符 {{APP_ID}} / {{APP_TITLE}} 替换）
//   3. 打印接入指引（如何从桌面打开 / 如何接总线事件）
//
// 设计原则：只新增文件，不自动改任何既有源码（注册与否由开发者决定，
// 避免 CLI 静默改坏 apps-data.js 等手工维护的模块）。

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const TEMPLATE = join(__dirname, 'app-template.html');
const TEMPLATE_MULTI_DIR = join(__dirname, 'app-template-multi');
const APPS_DIR = join(ROOT, 'ios-desktop', 'apps');

const argv = process.argv.slice(2);
const multi = argv.includes('--multi');
const [rawName, ...titleParts] = argv.filter((a) => a !== '--multi');

if (!rawName) {
  console.error('用法: npm run new-app <name> [中文标题] [--multi]');
  console.error('示例: npm run new-app weather-widget 天气小件');
  console.error('      npm run new-app clock-v2 时钟 --multi');
  process.exit(1);
}

const appId = rawName.toLowerCase();
if (!/^[a-z][a-z0-9-]*$/.test(appId)) {
  console.error(`✗ 无效名称 "${rawName}"：需为 kebab-case（小写字母开头，仅含小写字母/数字/连字符）`);
  process.exit(1);
}

const appTitle = titleParts.join(' ') || appId;
const appDir = join(APPS_DIR, appId);
const outFile = join(appDir, 'index.html');

if (existsSync(outFile)) {
  console.error(`✗ 应用已存在：${outFile}`);
  process.exit(1);
}

// 与模块型桌面应用（js/apps/<id>.js）撞名会造成概念混淆，直接拒绝
const moduleAppFile = join(ROOT, 'ios-desktop', 'js', 'apps', `${appId}.js`);
if (existsSync(moduleAppFile)) {
  console.error(`✗ "${appId}" 已是模块型桌面应用（js/apps/${appId}.js），请换一个名称`);
  process.exit(1);
}

if (!multi) {
  if (!existsSync(TEMPLATE)) {
    console.error(`✗ 找不到模板：${TEMPLATE}`);
    process.exit(1);
  }
  const tpl = readFileSync(TEMPLATE, 'utf8');
  const html = tpl.replaceAll('{{APP_ID}}', appId).replaceAll('{{APP_TITLE}}', appTitle);
  mkdirSync(appDir, { recursive: true });
  writeFileSync(outFile, html, 'utf8');
} else {
  // v9.05 #152：多文件形态 —— 整目录模板逐文件渲染
  if (!existsSync(TEMPLATE_MULTI_DIR)) {
    console.error(`✗ 找不到多文件模板目录：${TEMPLATE_MULTI_DIR}`);
    process.exit(1);
  }
  mkdirSync(appDir, { recursive: true });
  for (const f of readdirSync(TEMPLATE_MULTI_DIR).filter((x) => !x.startsWith('.'))) {
    const rendered = readFileSync(join(TEMPLATE_MULTI_DIR, f), 'utf8')
      .replaceAll('{{APP_ID}}', appId)
      .replaceAll('{{APP_TITLE}}', appTitle);
    writeFileSync(join(appDir, f), rendered, 'utf8');
  }
}

const shape = multi ? '多文件' : '单文件';
console.log(`✓ 子应用已生成（${shape}）: ios-desktop/apps/${appId}/（标题「${appTitle}」）`);
if (multi) {
  console.log('  · index.html   视图骨架（外链 ./style.css 与 ./app.mjs）');
  console.log('  · style.css    样式（构建期 esbuild 压缩）');
  console.log('  · app.mjs      ESM 主入口（构建期 esbuild 压缩）');
  console.log('  · 继续按模块拆分：新建 ./<feature>.mjs 并以相对路径 import 即可');
}
console.log('');
console.log('下一步（按需选用）:');
console.log(`  · 本地预览: npx vite dev 后访问 /ios-desktop/apps/${appId}/index.html`);
console.log('  · 从桌面打开: page-stack 打开 iframe 应用 url = `apps/' + appId + '/index.html`');
console.log(`  · 总线事件: 页面内 window.__system.emit('${appId}/xxx', payload)`);
console.log('  · 参与打包: vite 构建时 ios-desktop/apps/ 整目录自动复制进 dist，无需登记');
console.log('  · 兄弟引用: 相对路径引用的 ./xxx 会被构建期断言，缺失直接 fail 构建');
console.log('');
console.log('提示: 若需要桌面图标/应用列表注册（模块型应用），请参考 js/apps/ 下任一模块与');
console.log('      js/apps-data.js 的注册方式 —— CLI 不会自动改写这些文件。');
