// ==================== v240-shell-convergence.test.js — #240 壳层收编守护（v10.76 R123 窗） ====================
//
// 承接 v10.76 #240 交付帖留点：「壳层 js/ 八处 esc 属主文档车道——需先为壳
// index.html 引入 sanitize.js 并评估场景测试链装载时序，不在本窗」。
//
// 本窗收编面（v10.76，实例 F 增量留档 backup-f-v10.48-240 移植，命名对齐
// v10.76 单源 __mdEscape）：
//   · 壳层 js/ 14 文件本地 charmap 退役改薄委托：notifications / app-bus /
//     share-sheet / permissions / status-bar(escAttr 属性面超集) / iframe-app(_extEsc) /
//     lock-screen / lock-quotes / terminal-core / files / recorder / settings(5 处)
//     / settings-appnotif / settings-wellbeing —— 18 个调用点
//   · clock-app 收编（v10.76 九应用清单外余量：app.mjs esc 委托 + head 引入行）
//   · 壳层 ios-desktop/index.html head 先载 sanitize.js（经典脚本先于 main.js
//     ESM 图谱求值——装载时序评估结论：经典脚本位置即零缺省，dist-smoke 实证）
//   · recorder.js 历史漏转义 bug 随单源化根治（原 /\\"/g 匹配「反斜杠+引号」
//     序列、裸引号不转义——潜伏属性注入面）
//   · lock-screen 注释两则治理（-34px 陈旧声明 / 67ms 常量名引用 + allowlist 复核）
//
// 断言面（与 v240-sanitize-adoption.test.js 互补不重叠——该文件管 apps/ 面，
// 本文件管壳层面）：
//  A. 委托调用面锚（14 文件全量消费 + 规模守恒 ≥19）
//  B. 壳层全域负向锚（ios-desktop/js/** 零本地转义正则链）
//  C. recorder.js 真 bug 根治锚
//  D. 壳层装载锚（index.html 引入行 + setup 预载）
//  E. v801 契约兼容锚（settings escapeHtml 签名保留）
//  F. clock-app 收编锚
//  G. escAttr 属性面超集锚（status-bar）

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join, extname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const R = (p) => readFileSync(resolve(ROOT, p), 'utf-8');

// 壳层收编清单（14 文件，委托调用点合计 18：settings.js 独占 5）
const SHELL_FILES = [
  'ios-desktop/js/notifications.js',
  'ios-desktop/js/app-bus.js',
  'ios-desktop/js/share-sheet.js',
  'ios-desktop/js/permissions.js',
  'ios-desktop/js/status-bar.js',
  'ios-desktop/js/iframe-app.js',
  'ios-desktop/js/lock-screen.js',
  'ios-desktop/js/lock-quotes.js',
  'ios-desktop/js/terminal-core.js',
  'ios-desktop/js/apps/files.js',
  'ios-desktop/js/apps/recorder.js',
  'ios-desktop/js/apps/settings.js',
  'ios-desktop/js/apps/settings-appnotif.js',
  'ios-desktop/js/apps/settings-wellbeing.js',
];

describe('v240 壳层收编 A：委托调用面（14 文件全量消费单源）', () => {
  it('A1 逐文件消费 window.__mdEscape（零缺勤）', () => {
    for (const p of SHELL_FILES) {
      expect(R(p).includes('window.__mdEscape('), `${p} 已接入单源`).toBe(true);
    }
  });

  it('A2 规模守恒：壳层 + clock-app 委托调用点 ≥ 19（收敛非删除，调用点全保留）', () => {
    let n = 0;
    for (const p of SHELL_FILES) {
      n += (R(p).match(/window\.__mdEscape\(/g) || []).length;
    }
    n += (R('ios-desktop/apps/clock-app/app.mjs').match(/window\.__mdEscape\(/g) || []).length;
    expect(n).toBeGreaterThanOrEqual(19);
  });

  it('A3 只增不减锚：壳层本地 charmap 退役后委托面不得回退（对比 v10.76 壳层零消费基线）', () => {
    // v10.76 壳层基线 = 0 消费；本窗 18。任何回退即红。
    let shell = 0;
    for (const p of SHELL_FILES) {
      shell += (R(p).match(/window\.__mdEscape\(/g) || []).length;
    }
    expect(shell).toBeGreaterThanOrEqual(18);
  });
});

describe('v240 壳层收编 B：壳层全域负向锚（本地转义正则链零残留）', () => {
  const EXT = new Set(['.js', '.mjs', '.html']);
  // 与 v240-sanitize-adoption C1 同签名口径：逃逸方向链 replace(/&/g（pkg-manifest.js
  // 的反向 unescape 链 replace(/&amp;/g 不匹配本签名，非转义实现不误报）
  const SIG = /\.replace\(\/&\/g/;
  const hits = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) {
        if (p.includes(`${join('apps', '_shared', 'vendor')}`)) continue; // 第三方生成物豁免
        if (p.split(/[\\/]/).includes('dist')) continue; // 构建产物豁免（check:dist 另闸）
        walk(p);
      } else if (EXT.has(extname(p))) {
        if (p.endsWith(join('apps', '_shared', 'sanitize.js'))) continue; // 单源本体豁免
        if (SIG.test(readFileSync(p, 'utf-8'))) hits.push(p.slice(ROOT.length + 1));
      }
    }
  };
  walk(join(ROOT, 'ios-desktop'));

  it('B1 ios-desktop 全域零本地转义正则链（壳层 14 + clock-app 收编后全库闭环）', () => {
    expect(hits).toEqual([]);
  });
});

describe('v240 壳层收编 C：recorder.js 真 bug 根治', () => {
  it('C1 历史漏转义形态退役：/\\"/g 序列匹配不再存在，裸引号经单源正确转义', () => {
    const src = R('ios-desktop/js/apps/recorder.js');
    expect(src).toContain('return window.__mdEscape(s);');
    expect(src).not.toContain("'&quot;'"); // 本地映射字面量退役
    expect(src.includes('/\\\\"/g')).toBe(false);
    // 行为锚：裸引号必须转义（历史实现 a"b → a"b 原样放行 = 潜伏属性注入面）
    expect(window.__mdEscape('a"b')).toBe('a&quot;b');
  });
});

describe('v240 壳层收编 D：装载时序锚（壳 head 先载 + 测试环境预载）', () => {
  it('D1 壳层 index.html head 引入 sanitize.js（经典脚本先于 main.js ESM 求值）', () => {
    const shell = R('ios-desktop/index.html');
    expect(shell).toContain('<script src="apps/_shared/sanitize.js"></script>');
    // 先于模块图谱：引入行位置在 main.js module script 之前
    expect(shell.indexOf('apps/_shared/sanitize.js')).toBeLessThan(shell.indexOf('type="module"'));
  });

  it('D2 测试环境全环境预载（tests/setup.js import sanitize.js）', () => {
    expect(R('tests/setup.js')).toContain("import '../ios-desktop/apps/_shared/sanitize.js';");
  });

  it('D3 happy-dom 真跑：壳层委托链路端到端零缺省（模拟 shell 调用面）', () => {
    // setup.js 已预载单源；壳层委托在测试环境应直接可用（dist-smoke pageerror=0 的镜像锚）
    expect(typeof window.__mdEscape).toBe('function');
    expect(window.__mdEscape('<b>壳层</b>')).toBe('&lt;b&gt;壳层&lt;/b&gt;');
  });
});

describe('v240 壳层收编 E：v801 契约兼容（settings escapeHtml 签名保留）', () => {
  it('E1 function escapeHtml(s) 签名在（委托体），NOTIF_PAGE_SCRIPT 调用点零改动', () => {
    const s = R('ios-desktop/js/apps/settings.js');
    expect(s).toContain('function escapeHtml(s)');
    expect(s).toContain('return window.__mdEscape(s);');
    const notif = s.slice(s.indexOf('const NOTIF_PAGE_SCRIPT'), s.indexOf('</script>', s.indexOf('const NOTIF_PAGE_SCRIPT')));
    expect(notif).toContain("escapeHtml(n.title || '')");
    expect(notif).toContain("escapeHtml(n.app || '')");
  });
});

describe('v240 壳层收编 F：clock-app 收编（v10.76 九应用清单外余量）', () => {
  it('F1 app.mjs esc 委托 + head 引入行在位', () => {
    const mjs = R('ios-desktop/apps/clock-app/app.mjs');
    expect(mjs).toContain('window.__mdEscape(');
    expect(R('ios-desktop/apps/clock-app/index.html')).toContain('../_shared/sanitize.js');
  });
});

describe('v240 壳层收编 G：escAttr 属性面超集锚（status-bar）', () => {
  it('G1 escAttr 委托单源（五字符超集，属性值转义安全：历史实现缺 \' 转义收编后补齐）', () => {
    const s = R('ios-desktop/js/status-bar.js');
    expect(s).toContain('return window.__mdEscape(v);');
    // 历史 escAttr 只转 & " < >（缺 '）；单源超集补齐 —— 行为锚
    expect(window.__mdEscape("it's")).toBe('it&#39;s');
  });
});
