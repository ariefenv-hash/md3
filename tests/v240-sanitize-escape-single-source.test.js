// ==================== v240-sanitize-escape-single-source.test.js — #240 净化单源收敛守护 ====================
// ①单源行为锚：apps/_shared/sanitize.js escapeHtml 五字符全替（& < > " '）+ null/undefined 回落
//   + 双入口同源（window.__mdEscapeHtml === window.__mdSanitize.escapeHtml）
// ②weather 三插值点：搜索用户输入（query）+ 外部地理编码 API 返回值（r.name/r.admin）
//   全部经单源转义，禁止裸 `${}` 直插 innerHTML（议题实锤 XSS 面）
// ③全库收敛负向锚：ios-desktop/** 内本地转义正则链（.replace(/&/g,...) 签名）零残留——
//   豁免仅 sanitize.js 自身与 apps/_shared/vendor/**（第三方生成物）
// ④接入面锚：消费应用 head 引 sanitize.js + 脚手架模板默认引入 + 测试环境预载
// ⑤历史回归兼容：v801/settings 契约的 function escapeHtml(s) 签名仍在（委托体）
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join, extname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const R = (p) => readFileSync(resolve(ROOT, p), 'utf-8');

describe('v10.48 #240 — sanitize.js escapeHtml 单源行为锚', () => {
  it('A1: window.__mdEscapeHtml 已注册且五字符全替（& < > " \'）', () => {
    expect(typeof window.__mdEscapeHtml).toBe('function');
    expect(window.__mdEscapeHtml('<a href="x" data-y=\'z\'>A&B</a>'))
      .toBe('&lt;a href=&quot;x&quot; data-y=&#39;z&#39;&gt;A&amp;B&lt;/a&gt;');
  });

  it('A2: null/undefined 回落空串（对齐历史实现 String(s==null?\'\':s) 语义）', () => {
    expect(window.__mdEscapeHtml(null)).toBe('');
    expect(window.__mdEscapeHtml(undefined)).toBe('');
    expect(window.__mdEscapeHtml('')).toBe('');
    expect(window.__mdEscapeHtml(42)).toBe('42');
  });

  it('A3: 双入口同源——__mdEscapeHtml 即 __mdSanitize.escapeHtml（零第二实现）', () => {
    expect(window.__mdSanitize).toBeTruthy();
    expect(window.__mdSanitize.escapeHtml).toBe(window.__mdEscapeHtml);
  });

  it('A4: 攻击载荷全字符吞没——<img onerror> 注入串输出零裸 < / 零裸引号', () => {
    const out = window.__mdEscapeHtml('<img src=x onerror=alert("1")>');
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
    expect(out).not.toContain('"');
    expect(out).toContain('&lt;img src=x onerror=alert(&quot;1&quot;)&gt;');
  });

  it('A5: 白名单 sanitizeHtml 主闸行为保留（script 移除 / on* 剥除，#165 原语义零回归）', () => {
    const out = window.__mdSanitize('<p onclick="x()">hi</p><script>alert(1)</script>');
    expect(out).toContain('hi');
    expect(out).not.toContain('onclick');
    expect(out.toLowerCase()).not.toContain('<script');
  });
});

describe('v10.48 #240 — weather 三插值点修复（用户输入 + 地理编码 API 双通道）', () => {
  const src = R('ios-desktop/apps/weather/index.html');

  it('B1: weather head 引入 sanitize.js 单源', () => {
    expect(src).toContain('<script src="../_shared/sanitize.js"></script>');
  });

  it('B2: 空结果提示的 query 用户输入经 escapeHtml（原 :1249 裸插）', () => {
    expect(src).toContain('未找到 "${escapeHtml(query)}"');
    expect(src).not.toContain('未找到 "${query}"');
  });

  it('B3: 搜索结果 r.name（外部 API 返回）经 escapeHtml（原 :1261 裸插）', () => {
    expect(src).toContain('<span>${escapeHtml(r.name)}</span>');
    expect(src).not.toContain('<span>${r.name}</span>');
  });

  it('B4: 搜索结果 r.admin（外部 API 返回）经 escapeHtml（原 :1264 裸插）', () => {
    expect(src).toContain('${escapeHtml(r.admin)}</div>');
    expect(src).not.toContain('<div class="text-xs text-gray-400 mt-0.5">${r.admin}');
  });
});

describe('v10.48 #240 — 全库收敛负向锚（本地转义正则链零残留）', () => {
  const EXT = new Set(['.js', '.mjs', '.html']);
  const SIG = /\.replace\(\/&\/g/;
  const hits = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) {
        if (p.includes(`${join('apps', '_shared', 'vendor')}`)) continue; // 第三方生成物豁免
        walk(p);
      } else if (EXT.has(extname(p))) {
        if (p.endsWith(join('apps', '_shared', 'sanitize.js'))) continue; // 单源本体豁免
        if (SIG.test(readFileSync(p, 'utf-8'))) hits.push(p.slice(ROOT.length + 1));
      }
    }
  };
  walk(join(ROOT, 'ios-desktop'));

  it('C1: ios-desktop 全域零本地转义正则链（25 处历史实现已全部委托单源）', () => {
    expect(hits).toEqual([]);
  });

  it('C2: 委托调用面规模守恒——window.__mdEscapeHtml( 引用 ≥ 20（收敛非删除，调用点全保留）', () => {
    let n = 0;
    const walk2 = (dir) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        const st = statSync(p);
        if (st.isDirectory()) {
          if (p.includes(`${join('apps', '_shared', 'vendor')}`)) continue;
          walk2(p);
        } else if (EXT.has(extname(p))) {
          n += (readFileSync(p, 'utf-8').match(/window\.__mdEscapeHtml\(/g) || []).length;
        }
      }
    };
    walk2(join(ROOT, 'ios-desktop'));
    expect(n).toBeGreaterThanOrEqual(20);
  });

  it('C3: recorder.js 历史漏转义 bug 随单源化根治（/\\\\"/g 形态退役——裸引号现可正确转义）', () => {
    const src = R('ios-desktop/js/apps/recorder.js');
    expect(src).toContain('return window.__mdEscapeHtml(s);');
    expect(src).not.toContain("'&quot;'");
    expect(window.__mdEscapeHtml('a"b')).toBe('a&quot;b');
  });
});

describe('v10.48 #240 — 接入面锚（消费方引入 + 模板默认 + 测试预载）', () => {
  it('D1: 收敛应用 head 均引入 sanitize.js（messages/translate/music/pdf/typing/reaction/contacts/clock-app）', () => {
    for (const p of [
      'ios-desktop/apps/messages/index.html',
      'ios-desktop/apps/translate/index.html',
      'ios-desktop/apps/music/index.html',
      'ios-desktop/apps/pdf/index.html',
      'ios-desktop/apps/typing/index.html',
      'ios-desktop/apps/reaction/index.html',
      'ios-desktop/apps/contacts/index.html',
      'ios-desktop/apps/clock-app/index.html',
    ]) {
      expect(R(p).includes('../_shared/sanitize.js'), p).toBe(true);
    }
  });

  it('D2: 既有三元老（calendar/markdown/archive）接入保持 + 本地正则链退役', () => {
    for (const p of [
      'ios-desktop/apps/calendar/index.html',
      'ios-desktop/apps/markdown/index.html',
      'ios-desktop/apps/archive/index.html',
    ]) {
      const src = R(p);
      expect(src.includes('../_shared/sanitize.js'), p).toBe(true);
      expect(src.includes("'&amp;'"), p).toBe(false);
    }
  });

  it('D3: 脚手架模板默认引入 sanitize.js（new-app --multi 生成即达标）', () => {
    expect(R('scripts/app-template-multi/index.html')).toContain('<script src="../_shared/sanitize.js"></script>');
  });

  it('D4: 测试环境预载单源（tests/setup.js import sanitize.js）', () => {
    expect(R('tests/setup.js')).toContain("import '../ios-desktop/apps/_shared/sanitize.js';");
  });

  it('D5: v801 契约兼容——settings.js 保留 function escapeHtml(s) 签名（委托体），调用点零改动', () => {
    const s = R('ios-desktop/js/apps/settings.js');
    expect(s).toContain('function escapeHtml(s)');
    expect(s).toContain('return window.__mdEscapeHtml(s);');
    const notif = s.slice(s.indexOf('const NOTIF_PAGE_SCRIPT'), s.indexOf('</script>', s.indexOf('const NOTIF_PAGE_SCRIPT')));
    expect(notif).toContain("escapeHtml(n.title || '')");
    expect(notif).toContain("escapeHtml(n.app || '')");
  });
});
