// tests/v285-apps-doc.test.js — #285 应用清单真源（APPS.md 生成 + 对账）锚
//
// 覆盖面：
//   A 生成器结构锚：scripts/gen-apps-doc.mjs 头注立契（#285 + 单真源禁手改 + 「用途：」切分点 + #267 分工声明）；
//   B 生成件对账：docs/APPS.md / docs/apps-inventory.json 存在且 --check 逐字节可重现（check:docs-index 同律）；
//   C 三源对账：52 = 41 iframe + 11 native（与 #267 countAppDefinitions / countIframeApps 真源交叉核对）；
//   D 用途契约：52 条用途非空且两两唯一（#296 联动），且与 apps-data.js 尾注逐条一致（同源消费）；
//   E 入口实存：52 行入口路径逐一 fs 实存（iframe=apps/<dir>/index.html、native=js/apps/<f>.js）——
//     真源级验证：清单不是纸面表，每行都能在仓里摸到文件；id 唯一 + form 字段合法；
//   F 安装面口径：外部站点 11 家 URL 全 https + 与 catalog.json 一致；演示包 1 家 downloadUrl 实存；
//   G 阴性钩子（MD3_APPSDATA_PATH，仅测试用）：用途缺失 / 用途重复 → 生成器红（exit≠0）且盘上生成件零污染；
//   H docs-index 联动：docs/index.md 已收录 APPS.md 与 apps-inventory.json（check:docs-index 生成面）。
//
// 车道边界：本文件只锚 #285 交付面（生成器 + 两生成件 + package.json check:apps-doc 闸）；不改应用源码。

import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MD_PATH = join(ROOT, 'docs/APPS.md');
const JSON_PATH = join(ROOT, 'docs/apps-inventory.json');

const inv = () => JSON.parse(readFileSync(JSON_PATH, 'utf8'));

describe('v285 · A 生成器结构锚', () => {
  it('scripts/gen-apps-doc.mjs 存在且头注立契 #285（单真源 + 用途切分点 + #267 分工）', () => {
    const p = join(ROOT, 'scripts/gen-apps-doc.mjs');
    expect(existsSync(p)).toBe(true);
    const head = readFileSync(p, 'utf8').slice(0, 2200);
    expect(head).toContain('#285');
    expect(head).toContain('单真源');
    expect(head).toContain('用途：'); // #296 尾注 = 同源消费切分点
    expect(head).toContain('#267'); // README 数字对账分工声明
  });

  it('package.json 已挂 check:apps-doc 闸（--check 模式）', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts['check:apps-doc']).toBe('node scripts/gen-apps-doc.mjs --check');
  });
});

describe('v285 · B 生成件对账', () => {
  it('docs/APPS.md / docs/apps-inventory.json 存在且 --check 逐字节可重现', () => {
    expect(existsSync(MD_PATH)).toBe(true);
    expect(existsSync(JSON_PATH)).toBe(true);
    execSync('node scripts/gen-apps-doc.mjs --check', { cwd: ROOT, stdio: 'pipe' });
  });

  it('APPS.md 头部含单真源禁手改声明 + 汇总对账段', () => {
    const md = readFileSync(MD_PATH, 'utf8');
    expect(md).toContain('禁手改');
    expect(md).toContain('## 汇总对账');
    expect(md).toContain('三源对账');
  });
});

describe('v285 · C 三源对账', () => {
  it('52 应用 = 41 iframe + 11 native（生成器 stats）', () => {
    const s = inv().stats;
    expect(s.appsTotal).toBe(52);
    expect(s.appsIframe).toBe(41);
    expect(s.appsNative).toBe(11);
  });

  it('与 #267 真源计数交叉对账（countAppDefinitions / countIframeApps）', async () => {
    const { countAppDefinitions, countIframeApps } = await import('../scripts/check-readme-counts.mjs');
    const s = inv().stats;
    expect(countAppDefinitions()).toBe(s.appsTotal);
    expect(countIframeApps()).toBe(s.appsIframe);
  });

  it('apps 数组 52 行与 md 表格 52 数据行一致', () => {
    const md = readFileSync(MD_PATH, 'utf8');
    const rows = md.split('\n').filter((l) => /^\| \d+ \|/.test(l));
    expect(inv().apps.length).toBe(52);
    expect(rows.length).toBeGreaterThanOrEqual(52); // 52 应用行 + 外部站点/演示包表行
  });
});

describe('v285 · D 用途契约（#296 联动）', () => {
  it('52 条用途非空', () => {
    for (const a of inv().apps) {
      expect(a.purpose.length, `${a.varName} 用途为空`).toBeGreaterThan(0);
    }
  });

  it('52 条用途两两唯一（#296 两两唯一口径）', () => {
    const set = new Set(inv().apps.map((a) => a.purpose));
    expect(set.size).toBe(52);
  });

  it('用途与 apps-data.js 行尾注逐条一致（同源消费切分点）', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/apps-data.js'), 'utf8');
    for (const a of inv().apps) {
      const line = src.split('\n').find((l) => l.includes(`from './apps/${a.defFile.replace('js/apps/', '')}'`));
      expect(line, `${a.defFile} import 行缺失`).toBeTruthy();
      const cut = line.indexOf('用途：');
      expect(cut, `${a.varName} 行无「用途：」段`).toBeGreaterThan(-1);
      expect(line.slice(cut + 3).trim()).toBe(a.purpose);
    }
  });
});

describe('v285 · E 入口实存（真源级验证）', () => {
  it('52 行入口路径逐一 fs 实存', () => {
    for (const a of inv().apps) {
      expect(existsSync(join(ROOT, 'ios-desktop', a.entry)), `${a.id} 入口不存在: ${a.entry}`).toBe(true);
    }
  });

  it('id 非空且两两唯一；form ∈ {iframe, native}；form 与 entry 形态互证', () => {
    const ids = new Set();
    for (const a of inv().apps) {
      expect(a.id.length, `${a.varName} id 为空`).toBeGreaterThan(0);
      expect(ids.has(a.id), `id 重复: ${a.id}`).toBe(false);
      ids.add(a.id);
      expect(['iframe', 'native']).toContain(a.form);
      if (a.form === 'iframe') {
        expect(a.entry).toMatch(/^apps\/[^/]+\/index\.html$/);
      } else {
        expect(a.entry).toMatch(/^js\/apps\/[^/]+\.js$/);
      }
    }
  });
});

describe('v285 · F 安装面口径（catalog.json，两口径分开列不混计）', () => {
  const catalog = () => JSON.parse(readFileSync(join(ROOT, 'ios-desktop/catalog.json'), 'utf8'));

  it('外部站点 11 家：生成件与 catalog.json 一致且 URL 全 https', () => {
    const s = inv().stats;
    expect(s.externals).toBe(11);
    expect(inv().externals.length).toBe(catalog().externals.length);
    for (const e of inv().externals) {
      expect(e.url.startsWith('https://'), `${e.id} 非 https`).toBe(true);
    }
  });

  it('演示安装包 1 家：downloadUrl 实存且登记一致', () => {
    const s = inv().stats;
    expect(s.catalogApps).toBe(1);
    const pkg = inv().catalogApps[0];
    expect(existsSync(join(ROOT, 'ios-desktop', pkg.downloadUrl))).toBe(true);
    expect(pkg.id).toBe(catalog().apps[0].id);
  });

  it('APPS.md 含外部站点段与演示包段（口径分列不混计声明）', () => {
    const md = readFileSync(MD_PATH, 'utf8');
    expect(md).toContain('## 外部站点');
    expect(md).toContain('## 演示安装包');
    expect(md).toContain('两口径分开列不混计');
  });
});

describe('v285 · G 阴性钩子（MD3_APPSDATA_PATH）', () => {
  // 生成器 gate 模式在 build 阶段 fail（write 之前），但为防意外通过污染盘上生成件，
  // 每例先备份盘上两件、跑完恢复（零污染铁律）。
  const BACKUP_MD = readFileSync(MD_PATH, 'utf8');
  const BACKUP_JSON = readFileSync(JSON_PATH, 'utf8');

  function runWithCopy(mutate) {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/apps-data.js'), 'utf8');
    const tmp = join(tmpdir(), `md3-v285-${Date.now()}-${Math.floor(Math.random() * 1e6)}.js`);
    writeFileSync(tmp, mutate(src));
    try {
      const r = spawnSync('node', ['scripts/gen-apps-doc.mjs'], {
        cwd: ROOT,
        env: { ...process.env, MD3_APPSDATA_PATH: tmp },
        encoding: 'utf8',
      });
      return r;
    } finally {
      try { unlinkSync(tmp); } catch { /* noop */ }
      writeFileSync(MD_PATH, BACKUP_MD);
      writeFileSync(JSON_PATH, BACKUP_JSON);
    }
  }

  it('用途缺失（去「用途：」段）→ 生成器红且盘上生成件未被改写', () => {
    const r = runWithCopy((s) => s.replace(
      /^import mail       from '\.\/apps\/mail\.js'; \/\/ 用途：邮件——收件箱浏览与信件阅读$/m,
      "import mail       from './apps/mail.js'; // 无用途段",
    ));
    expect(r.status, `应 exit≠0，stdout=${r.stdout} stderr=${r.stderr}`).not.toBe(0);
    expect(r.stderr).toContain('用途契约缺口');
    expect(readFileSync(MD_PATH, 'utf8')).toBe(BACKUP_MD);
    expect(readFileSync(JSON_PATH, 'utf8')).toBe(BACKUP_JSON);
  });

  it('用途重复（复制粘贴）→ 生成器红（#296 两两唯一在生成面强检）', () => {
    const r = runWithCopy((s) => s.replace(
      /^import mail       from '\.\/apps\/mail\.js'; \/\/ 用途：邮件——收件箱浏览与信件阅读$/m,
      "import mail       from './apps/mail.js'; // 用途：即时信息会话——消息收发/表情与回执",
    ));
    expect(r.status, `应 exit≠0，stdout=${r.stdout} stderr=${r.stderr}`).not.toBe(0);
    expect(r.stderr).toContain('用途尾注重复');
  });
});

describe('v285 · H docs-index 联动', () => {
  it('docs/index.md 已收录 APPS.md 与 apps-inventory.json', () => {
    const idx = readFileSync(join(ROOT, 'docs/index.md'), 'utf8');
    expect(idx).toContain('APPS.md');
    expect(idx).toContain('apps-inventory.json');
  });
});
