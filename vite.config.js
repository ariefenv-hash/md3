/* ==================== vite.config.js — Vite 构建配置 ====================
 * 目标：
 *  1. 双 HTML 入口：根壳 index.html + 桌面主文档 ios-desktop/index.html
 *     （桌面文档的 10 个 CSS 与 js/main.js 的 ES Module 依赖链会被打包为
 *       dist/assets/ 下带内容哈希的产物，HTML 内引用自动改写）
 *  2. publicDir: false —— 项目没有传统 public 目录，静态资源全部由
 *     自定义插件 copyStaticAndPrecache 在构建收尾阶段手工复制：
 *     - ios-desktop/apps/ 下 20 个 iframe 子应用 HTML：运行时以字符串路径
 *       'apps/xxx/index.html' 动态加载（相对 /ios-desktop/ 解析），Rollup
 *       无法静态分析，必须原样复制到 dist/ios-desktop/apps/
 *     - icons/ 与 manifest.webmanifest：根 index.html 用绝对路径引用，
 *       Vite 不处理，复制到 dist 根即可命中
 *     - sw.js：复制并替换 __BUILD_ID__ 占位符为本次构建 id
 *     - 扫描 dist 全部产物生成 precache-manifest.json，供 SW install 阶段全量预缓存
 *  4. 构建期 HTML 压缩（v7.16 精简）：iframe 子应用 HTML / launch.html /
 *     双入口 HTML 产物在复制与收尾阶段轻量压缩 —— 保守配置（空白只折叠不
 *     删除、保留 SVG 大小写与自闭合斜杠），源码目录保持可读，仅产物瘦身；
 *     压缩失败自动回退原样复制，绝不阻塞构建
 *  5. 除构建期压缩器 html-minifier-terser 外不引入任何第三方 vite 插件，
 *     复制/预缓存逻辑仍为 node:fs/promises + node:path 手写实现
 */
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fsp from 'node:fs/promises';

/** 项目根目录（vite.config.js 所在目录） */
const rootDir = path.dirname(fileURLToPath(import.meta.url));
/** 构建输出目录 */
const distDir = path.join(rootDir, 'dist');
/** 预缓存清单文件名（生成时排除自身，避免把清单也缓存进去造成自引用） */
const PRECACHE_MANIFEST_NAME = 'precache-manifest.json';

/** HTML 压缩配置（保守策略：功能零漂移优先，体积收益次之）
 *  - collapseWhitespace + conservativeCollapse：空白序列折叠为单个空格，
 *    绝不整段删除 —— 行内元素间距 / pre / textarea 语义完整保留
 *  - caseSensitive + keepClosingSlash：SVG 标签大小写（linearGradient 等）
 *    与自闭合斜杠原样保留，渲染零风险
 *  - 不做：属性排序 / 引号删除 / 布尔属性折叠 / 标签内空白删除（高风险项全关）
 */
const HTML_MINIFY_OPTS = {
  collapseWhitespace: true,
  conservativeCollapse: true,
  removeComments: true,
  minifyCSS: true,
  minifyJS: true,
  caseSensitive: true,
  keepClosingSlash: true,
  noNewlinesBeforeTagClosing: true,
  collapseBooleanAttributes: false,
  removeAttributeQuotes: false,
  removeTagWhitespace: false,
  sortAttributes: false,
  sortClassName: false,
  minifyURLs: false,
};

/** 同上，但内联脚本按 ES Module 解析（dice 等 type="module" 子应用的重试通道） */
const HTML_MINIFY_OPTS_MODULE = { ...HTML_MINIFY_OPTS, minifyJS: { module: true } };

/** 递归复制目录（手写实现：mkdir -p + readdir + copyFile） */
async function copyDir(srcDir, destDir) {
  await fsp.mkdir(destDir, { recursive: true });
  const entries = await fsp.readdir(srcDir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const src = path.join(srcDir, entry.name);
      const dest = path.join(destDir, entry.name);
      // 目录递归复制，文件直接逐字节拷贝
      if (entry.isDirectory()) await copyDir(src, dest);
      else await fsp.copyFile(src, dest);
    })
  );
}

/** 递归扫描目录下全部文件，返回绝对路径数组 */
async function walkFiles(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walkFiles(full) : Promise.resolve([full]);
    })
  );
  return nested.flat();
}

/** 把 dist 内文件路径转为相对站点根的 URL（正斜杠、不带前导 /
 *  —— 相对路径在 GitHub Pages 项目子路径（如 /repo/）下同样成立：
 *  SW 内 cache.add(相对路径) 以 sw.js 所在目录为基准解析） */
function toSiteUrl(fileAbs) {
  return path.relative(distDir, fileAbs).split(path.sep).join('/');
}

/** 自定义插件：构建收尾时复制静态资源并生成预缓存清单（手写，零第三方 vite 插件） */
function copyStaticAndPrecache() {
  return {
    name: 'copy-static-and-precache',
    // 仅在 vite build 时生效，dev server 不需要
    apply: 'build',
    async closeBundle() {
      // 本次构建 id（base36 时间戳），同时用于替换 sw.js 的 __BUILD_ID__ 占位符
      const buildId = Date.now().toString(36);
      const log = (msg) => console.log(`[copy-static-and-precache] ${msg}`);

      // 压缩器按需装载（构建期依赖，dev/config 加载零开销）
      const { minify } = await import('html-minifier-terser');
      let lastMinifyErr = null;

      // 单文件 HTML 压缩落盘：先按经典脚本解析，失败（如 type="module"
      // 内联 import）再按 module 重试，仍失败则回退原样复制 —— 绝不阻塞构建
      const minifyHtmlTo = async (srcPath, destPath) => {
        const before = await fsp.readFile(srcPath, 'utf-8');
        for (const opts of [HTML_MINIFY_OPTS, HTML_MINIFY_OPTS_MODULE]) {
          try {
            const after = await minify(before, opts);
            await fsp.writeFile(destPath, after, 'utf-8');
            return { ok: true, before: before.length, after: after.length };
          } catch (e) { lastMinifyErr = e; /* 换下一档或最终回退 */ }
        }
        console.warn(`[copy-static-and-precache] ⚠ ${path.relative(rootDir, srcPath)} 压缩失败（${lastMinifyErr.message}），已回退原样复制`);
        if (srcPath !== destPath) await fsp.copyFile(srcPath, destPath);
        return { ok: false, before: before.length, after: before.length };
      };

      // 1) 复制 20+ 个 iframe 子应用 HTML（构建期压缩：
      //    注释剥离 + 空白折叠 + 内联 JS/CSS 压缩，源码目录不动）：
      //    运行时由 js 以字符串路径动态 iframe 加载，Vite/Rollup 无法静态分析，
      //    原样保持 dist/ios-desktop/apps/<name>/index.html 结构即可命中相对路径
      const appsSrc = path.join(rootDir, 'ios-desktop', 'apps');
      const appsDest = path.join(distDir, 'ios-desktop', 'apps');
      await fsp.mkdir(appsDest, { recursive: true });
      const appFiles = await walkFiles(appsSrc);
      let htmlBytesIn = 0, htmlBytesOut = 0, htmlCount = 0, rawCount = 0, failed = 0;
      for (const src of appFiles) {
        const dest = path.join(appsDest, path.relative(appsSrc, src));
        await fsp.mkdir(path.dirname(dest), { recursive: true });
        if (src.endsWith('.html')) {
          const r = await minifyHtmlTo(src, dest);
          htmlBytesIn += r.before; htmlBytesOut += r.after;
          htmlCount++; if (!r.ok) failed++;
        } else {
          await fsp.copyFile(src, dest);
          rawCount++;
        }
      }
      const pct = htmlBytesIn ? Math.round((1 - htmlBytesOut / htmlBytesIn) * 100) : 0;
      log(`子应用处理完成：${appFiles.length} 个文件（HTML ${htmlCount} 个压缩 ${Math.round(htmlBytesIn / 1024)}KB → ${Math.round(htmlBytesOut / 1024)}KB，省 ${pct}%${failed ? `，回退 ${failed} 个` : ''}；原样复制 ${rawCount} 个）`);

      // 1.5) v7.7-A：Material Symbols 本地图标字体（桌面 + 子应用共用）——
      //      与子应用同机制原样复制，保持相对路径 ../../assets/fonts/ 在两端一致命中
      const assetsSrc = path.join(rootDir, 'ios-desktop', 'assets');
      if (await fsp.stat(assetsSrc).then(() => true).catch(() => false)) {
        await copyDir(assetsSrc, path.join(distDir, 'ios-desktop', 'assets'));
        log('ios-desktop/assets 本地字体复制完成');
      }

      // 1.6) v7.52：安装包沙箱 SDK（js/pkg-sdk.js）—— 非模块经典脚本，不被任何
      //      ESM import 引用 → Rollup 不会打包它，必须显式复制进 dist。
      //      sw.js 供包内容时按 <script src> 注入（相对 registration.scope 解析，
      //      源码版 / 任意子路径部署版均命中）。同时复制 pkg/ 源码目录仅为
      //      调试可见性（运行时走 assets bundle chunk，非依赖路径）。
      const pkgSdkSrc = path.join(rootDir, 'ios-desktop', 'js', 'pkg-sdk.js');
      if (await fsp.stat(pkgSdkSrc).then(() => true).catch(() => false)) {
        await fsp.mkdir(path.join(distDir, 'ios-desktop', 'js'), { recursive: true });
        await fsp.copyFile(pkgSdkSrc, path.join(distDir, 'ios-desktop', 'js', 'pkg-sdk.js'));
        log('ios-desktop/js/pkg-sdk.js 复制完成（安装包 SDK 静态通道）');
      }

      // 2) PWA 图标与清单：落到 dist 根（根 index.html 的绝对引用已改相对路径）
      await copyDir(path.join(rootDir, 'icons'), path.join(distDir, 'icons'));
      await fsp.copyFile(
        path.join(rootDir, 'manifest.webmanifest'),
        path.join(distDir, 'manifest.webmanifest')
      );
      // Uiverse 缝合新增：launch.html（MD3 启动分享页）单文件零构建，压缩后落 dist
      const launchR = await minifyHtmlTo(
        path.join(rootDir, 'launch.html'),
        path.join(distDir, 'launch.html')
      );
      if (launchR.ok) {
        log(`launch.html 压缩完成：${Math.round(launchR.before / 1024)}KB → ${Math.round(launchR.after / 1024)}KB`);
      }
      // .nojekyll：禁止 GitHub Pages 跑 Jekyll 处理（避免下划线/特殊文件被忽略）
      await fsp.writeFile(path.join(distDir, '.nojekyll'), '', 'utf-8');
      log('icons/ manifest.webmanifest .nojekyll 复制完成');

      // 2.5) 修正 Vite 哈希化的 manifest 副本（dist/assets/manifest-*.webmanifest）：
      //      其内部 start_url/scope/icons 若为根绝对路径，在 GitHub Pages 子路径
      //      部署下会指错位置；改为相对该 manifest 自身位置（assets/ 下 → 上一级）
      const assetsDir = path.join(distDir, 'assets');
      try {
        const hashed = (await fsp.readdir(assetsDir)).filter((f) => f.startsWith('manifest-') && f.endsWith('.webmanifest'));
        for (const name of hashed) {
          const p = path.join(assetsDir, name);
          let txt = await fsp.readFile(p, 'utf-8');
          txt = txt.replace(/"start_url"\s*:\s*"\.\/"/g, '"start_url": "../"')
                   .replace(/"scope"\s*:\s*"\.\/"/g, '"scope": "../"')
                   .replace(/"\.\/icons\//g, '"../icons/');
          await fsp.writeFile(p, txt, 'utf-8');
          log(`assets/${name} 子路径路径修正完成`);
        }
      } catch (e) { log('无哈希 manifest 副本或修正跳过：' + e.message); }

      // 3) Service Worker：原样复制并替换 __BUILD_ID__。
      //    每次构建 sw.js 字节内容都会变化 → 浏览器 byte-diff 检测到 SW 更新，
      //    触发重新 install（全量预缓存新哈希产物）→ activate 清理旧缓存
      const swSrc = path.join(rootDir, 'sw.js');
      let swCode = await fsp.readFile(swSrc, 'utf-8');
      swCode = swCode.replaceAll('__BUILD_ID__', buildId);
      await fsp.writeFile(path.join(distDir, 'sw.js'), swCode, 'utf-8');
      log(`sw.js 复制完成，__BUILD_ID__ → ${buildId}`);

      // 3.5) 双入口 HTML 产物收尾压缩：Vite 只处理模块依赖链，不压缩
      //      入口文档内的空白缩进与内联经典脚本 —— 在此统一补上
      //      （路径与产物名不变，precache 清单与 SW 引用不受影响）
      for (const entry of ['index.html', 'ios-desktop/index.html']) {
        const abs = path.join(distDir, entry);
        if (await fsp.stat(abs).then(() => true).catch(() => false)) {
          const r = await minifyHtmlTo(abs, abs);
          if (r.ok) log(`${entry} 入口压缩完成：${Math.round(r.before / 1024)}KB → ${Math.round(r.after / 1024)}KB`);
        }
      }

      // 4) 生成预缓存清单：递归扫描 dist 全部文件（排除清单自身），
      //    供 sw.js install 阶段读取并全量 cache.add
      const manifestAbs = path.join(distDir, PRECACHE_MANIFEST_NAME);
      const allFiles = await walkFiles(distDir);
      const urls = allFiles
        .filter((f) => f !== manifestAbs)
        .map((f) => toSiteUrl(f))
        .sort();
      await fsp.writeFile(
        manifestAbs,
        JSON.stringify({ files: urls }, null, 2),
        'utf-8'
      );
      log(`precache-manifest.json 生成完成：${urls.length} 个 URL`);
    },
  };
}

export default defineConfig({
  // 相对基准：构建产物用相对路径引用资源，部署在域名根路径与 GitHub Pages
  // 项目子路径（https://<user>.github.io/<repo>/）下均可直接运行
  base: './',
  // 无传统 public 目录，静态资源统一由上方插件在构建后手工复制
  publicDir: false,
  build: {
    // 目标语法基线：2020 年起的浏览器（可选链、空值合并等），不引入过重的降级代码
    target: 'es2020',
    rollupOptions: {
      input: {
        // 根壳：iframe 外层文档（内联经典 script，Vite 原样保留）
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        // 桌面主文档：10 CSS + main.js 模块依赖链在此打包
        desktop: fileURLToPath(new URL('./ios-desktop/index.html', import.meta.url)),
      },
    },
  },
  plugins: [copyStaticAndPrecache()],
});
